const { dynamoClient } = require("../dynamodb");
const {
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

// Import normalization functions
const { normalizeCategory } = require("../normalization/category-normalizer");
const { normalizeBusinessName } = require("../normalization/name-normalizer");
const { normalizeCity, normalizeState } = require("../normalization/location-normalizer");
const { normalizePriceRange } = require("../normalization/price-range-normalizer");
const { normalizePhoneNumber } = require("../normalization/phone-normalizer");
const { normalizeAmenityInput } = require("../normalization/amenity-normalizer");

// Import validation functions
const { validateBusiness } = require("../validation/business-validator");
const { validateCategory } = require("../validation/category-validator");
const { validateBusinessName } = require("../validation/name-validator");
const { validateLocation } = require("../validation/location-validator");
const { validatePriceRange } = require("../validation/price-range-validator");
const { validatePhoneNumber } = require("../validation/phone-validator");

// Import monitoring functions
const { logError, logInfo, trackMetric } = require("../utils/monitoring");
const { DatabaseError, ValidationError } = require("../utils/error-handler");

const TABLE_NAME = "Businesses";

/**
 * Generate business ID
 */
function generateBusinessId() {
  return `biz_${uuidv4()}`;
}

/**
 * Get current Unix timestamp
 */
function getCurrentTimestamp() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Normalize business data before storing
 */
function normalizeBusinessData(businessData) {
  const normalized = { ...businessData };

  // Normalize name
  if (normalized.name) {
    normalized.normalizedName = normalizeBusinessName(normalized.name);
  }

  // Normalize category
  if (normalized.category) {
    normalized.category = normalizeCategory(normalized.category) || normalized.category;
  }

  // Normalize location
  // Handle both object and string formats
  let locationObj = null;
  if (normalized.location) {
    // If location is already a string, parse it or use it as-is
    if (typeof normalized.location === 'string') {
      // If it's a string like "city, state", try to parse it
      const parts = normalized.location.split(',').map(s => s.trim());
      locationObj = {
        city: parts[0] || '',
        state: parts[1] || '',
        address: normalized.location,
      };
    } else if (typeof normalized.location === 'object' && !Array.isArray(normalized.location)) {
      // If it's an object, use it directly
      locationObj = { ...normalized.location };
    }
  }
  
  if (locationObj) {
    if (locationObj.city) {
      locationObj.city = normalizeCity(locationObj.city) || locationObj.city;
      // Flatten city for GSI (category-location-index and location-index)
      normalized.city = locationObj.city;
    }
    if (locationObj.state) {
      locationObj.state = normalizeState(locationObj.state) || locationObj.state;
      // Flatten state for GSI (location-index)
      normalized.state = locationObj.state;
    }
    if (locationObj.country) {
      locationObj.country = normalizeState(locationObj.country) || locationObj.country;
    }
    
    // Store full location object in locationDetails for detailed access
    normalized.locationDetails = locationObj;
    
    // Create location string for location-index GSI (MUST be a string, not an object)
    // Format: "city, state" or just "city" if state is not available
    if (locationObj.city) {
      if (locationObj.state) {
        normalized.location = `${locationObj.city}, ${locationObj.state}`;
      } else {
        normalized.location = locationObj.city;
      }
    } else {
      // If no city, use address or empty string
      normalized.location = locationObj.address || '';
    }
  } else {
    // If no location provided, ensure location is an empty string (not undefined or object)
    normalized.location = '';
    normalized.city = '';
    normalized.state = '';
  }
  
  // CRITICAL: Ensure location is always a string, never an object
  // This prevents the GSI type mismatch error
  if (typeof normalized.location !== 'string') {
    console.warn('Location was not a string, converting:', normalized.location);
    normalized.location = normalized.location?.toString() || '';
  }

  // Normalize price range
  if (normalized.priceRange) {
    normalized.priceRange = normalizePriceRange(normalized.priceRange) || normalized.priceRange;
  }

  // Normalize phone number
  if (normalized.contact && normalized.contact.phone) {
    normalized.contact.phone = normalizePhoneNumber(normalized.contact.phone) || normalized.contact.phone;
  }

  // Normalize amenities
  if (normalized.amenities && Array.isArray(normalized.amenities)) {
    normalized.amenities = normalized.amenities
      .map((amenity) => normalizeAmenityInput(amenity))
      .filter((amenity) => amenity !== null);
  }

  return normalized;
}

/**
 * Create a new business with validation and normalization
 */
async function createBusiness(businessData) {
  let businessId = null;
  try {
    // Validate business data
    const validationResult = validateBusiness(businessData);
    if (!validationResult.valid) {
      throw new ValidationError(`Validation failed: ${validationResult.error || validationResult.errors?.join(", ")}`);
    }

    // Normalize business data
    const normalizedData = normalizeBusinessData(businessData);

    businessId = generateBusinessId();
    const now = getCurrentTimestamp();

    const business = {
      businessId,
      ...normalizedData,
      createdAt: now,
      updatedAt: now,
      status: normalizedData.status || "pending",
      isVerified: normalizedData.isVerified || false,
    };

    await dynamoClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: business,
      })
    );

    logInfo("Business created successfully", { businessId });
    trackMetric("business.created", 1, "count", { category: business.category });

    // Queue embedding generation (non-blocking)
    try {
      const { queueEmbeddingGeneration } = require("../queue/embedding-queue");
      const { saveEmbeddingStatus } = require("../db/embedding-status");
      
      // Save initial status
      await saveEmbeddingStatus(businessId, {
        status: "pending",
        hasEmbedding: false,
      });

      // Queue embedding generation
      await queueEmbeddingGeneration(businessId, {
        priority: 1, // Normal priority for new businesses
      });
    } catch (error) {
      // Embedding queue errors shouldn't break business creation
      console.warn(`[Businesses] Failed to queue embedding generation: ${error.message}`);
    }

    return business;
  } catch (error) {
    // Handle errors gracefully
    logError("Failed to create business", { businessId: businessId || "unknown" }, error);
    // Re-throw ValidationError as-is
    if (error instanceof ValidationError || (error.message && error.message.includes("Validation failed"))) {
      throw error;
    }
    throw new DatabaseError(`Failed to create business: ${error.message || String(error)}`, undefined, { originalError: error.message });
  }
}

/**
 * Normalize business data when reading from database
 * Reconstructs location object from locationDetails if needed
 */
function normalizeBusinessForRead(business) {
  if (!business) return null;
  
  // If locationDetails exists, use it as location object
  if (business.locationDetails && typeof business.location === 'string') {
    business.location = business.locationDetails;
    // Optionally remove locationDetails to avoid duplication
    // delete business.locationDetails;
  }
  
  return business;
}

/**
 * Get business by ID
 */
async function getBusinessById(businessId) {
  const result = await dynamoClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { businessId },
    })
  );

  return normalizeBusinessForRead(result.Item) || null;
}

/**
 * Update business with validation
 */
async function updateBusiness(businessId, updateData) {
  try {
    // Get existing business to merge with update data
    const existingBusiness = await getBusinessById(businessId);
    if (!existingBusiness) {
      throw new Error(`Business not found: ${businessId}`);
    }

    // Merge existing data with update data
    const mergedData = { ...existingBusiness, ...updateData };

    // Validate merged business data
    const validationResult = validateBusiness(mergedData);
    if (!validationResult.valid) {
      throw new ValidationError(`Validation failed: ${validationResult.error || validationResult.errors?.join(", ")}`);
    }

    // Normalize update data
    const normalizedData = normalizeBusinessData(updateData);

    const now = getCurrentTimestamp();

    // Build update expression dynamically
    const updateExpressions = ["updatedAt = :timestamp"];
    const expressionAttributeValues = { ":timestamp": now };
    const expressionAttributeNames = {};

    Object.keys(normalizedData).forEach((key) => {
      if (normalizedData[key] !== undefined) {
        // Handle nested attributes
        if (key.includes(".")) {
          const parts = key.split(".");
          const attrName = `#${parts[0]}`;
          const nestedAttr = parts[1];

          if (!expressionAttributeNames[attrName]) {
            expressionAttributeNames[attrName] = parts[0];
          }

          updateExpressions.push(`${attrName}.${nestedAttr} = :${key.replace(/\./g, "_")}`);
          expressionAttributeValues[`:${key.replace(/\./g, "_")}`] = normalizedData[key];
        } else {
          updateExpressions.push(`${key} = :${key}`);
          expressionAttributeValues[`:${key}`] = normalizedData[key];
        }
      }
    });

    // Update normalizedName if name is being updated
    if (normalizedData.name) {
      updateExpressions.push("normalizedName = :normalizedName");
      expressionAttributeValues[":normalizedName"] = normalizeBusinessName(normalizedData.name);
    }

    const updateParams = {
      TableName: TABLE_NAME,
      Key: { businessId },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    };

    if (Object.keys(expressionAttributeNames).length > 0) {
      updateParams.ExpressionAttributeNames = expressionAttributeNames;
    }

    const result = await dynamoClient.send(new UpdateCommand(updateParams));
    logInfo("Business updated successfully", { businessId });
    trackMetric("business.updated", 1, "count");

    // Check if name, description, or category changed (these affect embeddings)
    const embeddingFields = ["name", "description", "category"];
    const fieldsChanged = embeddingFields.some((field) => normalizedData[field] !== undefined);
    
    if (fieldsChanged) {
      // Queue embedding regeneration (non-blocking)
      try {
        const { queueEmbeddingGeneration } = require("../queue/embedding-queue");
        const { saveEmbeddingStatus } = require("../db/embedding-status");
        
        // Update status to pending
        await saveEmbeddingStatus(businessId, {
          status: "pending",
          hasEmbedding: false, // Will be updated when embedding is generated
        });

        // Queue embedding regeneration with higher priority
        await queueEmbeddingGeneration(businessId, {
          priority: 2, // Higher priority for updates
          force: true, // Force regeneration even if embedding exists
        });
      } catch (error) {
        // Embedding queue errors shouldn't break business update
        console.warn(`[Businesses] Failed to queue embedding regeneration: ${error.message}`);
      }
    }

    return result.Attributes;
  } catch (error) {
    // Handle errors gracefully
    logError("Failed to update business", { businessId }, error);
    if (error.message && (error.message.includes("Validation failed") || error.message.includes("not found"))) {
      throw error;
    }
    throw new DatabaseError(`Failed to update business: ${error.message || String(error)}`, undefined, { businessId, originalError: error.message });
  }
}

/**
 * Search businesses by category
 */
async function searchBusinessesByCategory(category, city, limit = 100, offset = 0) {
  try {
    // Normalize inputs
    const normalizedCategory = normalizeCategory(category);
    const normalizedCity = normalizeCity(city) || city;

    if (!normalizedCategory) {
      throw new Error(`Invalid category: ${category}`);
    }

    // Validate category
    const categoryValidation = validateCategory(normalizedCategory);
    if (!categoryValidation.valid) {
      throw new Error(categoryValidation.error);
    }

    const queryParams = {
      TableName: TABLE_NAME,
      IndexName: "category-location-index",
      KeyConditionExpression: "category = :category AND city = :city",
      ExpressionAttributeValues: {
        ":category": normalizedCategory,
        ":city": normalizedCity,
      },
      Limit: limit + offset, // Fetch more to handle offset
      ScanIndexForward: false, // Sort by createdAt descending
    };

    const result = await dynamoClient.send(new QueryCommand(queryParams));
    const items = result.Items || [];

    // Apply offset
    const paginatedItems = items.slice(offset);

    logInfo("Businesses searched by category", { category: normalizedCategory, city: normalizedCity, count: paginatedItems.length });
    // Normalize items for reading (reconstruct location objects)
    const normalizedItems = paginatedItems.map(item => normalizeBusinessForRead(item));
    
    trackMetric("business.search.by_category", normalizedItems.length, "count", { category: normalizedCategory });
    return {
      items: normalizedItems,
      total: items.length,
      limit,
      offset,
      lastEvaluatedKey: result.LastEvaluatedKey,
    };
  } catch (error) {
    logError("Failed to search businesses by category", { category, city }, error);
    throw new DatabaseError(`Failed to search businesses by category: ${error.message || String(error)}`, undefined, { category, city });
  }
}

/**
 * Query businesses by category and city (using GSI)
 */
async function queryBusinessesByCategoryAndCity(category, city, options = {}) {
  const {
    limit = 100,
    exclusiveStartKey,
    filterExpression,
    expressionAttributeValues = {},
    expressionAttributeNames = {},
  } = options;

  // Normalize inputs
  const normalizedCategory = normalizeCategory(category) || category;
  const normalizedCity = normalizeCity(city) || city;

  const queryParams = {
    TableName: TABLE_NAME,
    IndexName: "category-location-index",
    KeyConditionExpression: "category = :category AND city = :city",
    ExpressionAttributeValues: {
      ":category": normalizedCategory,
      ":city": normalizedCity,
      ...expressionAttributeValues,
    },
    Limit: limit,
  };

  if (Object.keys(expressionAttributeNames).length > 0) {
    queryParams.ExpressionAttributeNames = expressionAttributeNames;
  }

  if (filterExpression) {
    queryParams.FilterExpression = filterExpression;
  }

  if (exclusiveStartKey) {
    queryParams.ExclusiveStartKey = exclusiveStartKey;
  }

  const result = await dynamoClient.send(new QueryCommand(queryParams));
  const items = (result.Items || []).map(item => normalizeBusinessForRead(item));
  return {
    items,
    lastEvaluatedKey: result.LastEvaluatedKey,
  };
}

/**
 * Query businesses by city (using GSI)
 */
async function queryBusinessesByCity(city, options = {}) {
  const {
    limit = 100,
    exclusiveStartKey,
    filterExpression,
    expressionAttributeValues = {},
    expressionAttributeNames = {},
  } = options;

  const queryParams = {
    TableName: TABLE_NAME,
    IndexName: "location-index",
    KeyConditionExpression: "city = :city",
    ExpressionAttributeValues: {
      ":city": city,
      ...expressionAttributeValues,
    },
    Limit: limit,
  };

  if (Object.keys(expressionAttributeNames).length > 0) {
    queryParams.ExpressionAttributeNames = expressionAttributeNames;
  }

  if (filterExpression) {
    queryParams.FilterExpression = filterExpression;
  }

  if (exclusiveStartKey) {
    queryParams.ExclusiveStartKey = exclusiveStartKey;
  }

  const result = await dynamoClient.send(new QueryCommand(queryParams));
  const items = (result.Items || []).map(item => normalizeBusinessForRead(item));
  return {
    items,
    lastEvaluatedKey: result.LastEvaluatedKey,
  };
}

/**
 * Query businesses by category and rating (using GSI)
 */
async function queryBusinessesByCategoryAndRating(category, minRating, options = {}) {
  const {
    limit = 100,
    exclusiveStartKey,
    filterExpression,
    expressionAttributeValues = {},
    expressionAttributeNames = {},
  } = options;

  const queryParams = {
    TableName: TABLE_NAME,
    IndexName: "rating-index",
    KeyConditionExpression: "category = :category AND rating >= :minRating",
    ExpressionAttributeValues: {
      ":category": category,
      ":minRating": minRating,
      ...expressionAttributeValues,
    },
    Limit: limit,
    ScanIndexForward: false, // Sort by rating descending
  };

  if (Object.keys(expressionAttributeNames).length > 0) {
    queryParams.ExpressionAttributeNames = expressionAttributeNames;
  }

  if (filterExpression) {
    queryParams.FilterExpression = filterExpression;
  }

  if (exclusiveStartKey) {
    queryParams.ExclusiveStartKey = exclusiveStartKey;
  }

  const result = await dynamoClient.send(new QueryCommand(queryParams));
  const items = (result.Items || []).map(item => normalizeBusinessForRead(item));
  return {
    items,
    lastEvaluatedKey: result.LastEvaluatedKey,
  };
}

/**
 * Query businesses by owner ID (using GSI)
 */
async function queryBusinessesByOwner(ownerId, options = {}) {
  const { limit = 100, exclusiveStartKey } = options;

  const queryParams = {
    TableName: TABLE_NAME,
    IndexName: "ownerId-index",
    KeyConditionExpression: "ownerId = :ownerId",
    ExpressionAttributeValues: {
      ":ownerId": ownerId,
    },
    Limit: limit,
    ScanIndexForward: false, // Sort by createdAt descending
  };

  if (exclusiveStartKey) {
    queryParams.ExclusiveStartKey = exclusiveStartKey;
  }

  const result = await dynamoClient.send(new QueryCommand(queryParams));
  const items = (result.Items || []).map(item => normalizeBusinessForRead(item));
  return {
    items,
    lastEvaluatedKey: result.LastEvaluatedKey,
  };
}

/**
 * Query businesses by status (using GSI)
 */
async function queryBusinessesByStatus(status, options = {}) {
  const { limit = 100, exclusiveStartKey } = options;

  const queryParams = {
    TableName: TABLE_NAME,
    IndexName: "status-index",
    KeyConditionExpression: "status = :status",
    ExpressionAttributeValues: {
      ":status": status,
    },
    Limit: limit,
    ScanIndexForward: false, // Sort by updatedAt descending
  };

  if (exclusiveStartKey) {
    queryParams.ExclusiveStartKey = exclusiveStartKey;
  }

  const result = await dynamoClient.send(new QueryCommand(queryParams));
  const items = (result.Items || []).map(item => normalizeBusinessForRead(item));
  return {
    items,
    lastEvaluatedKey: result.LastEvaluatedKey,
  };
}

/**
 * Delete business
 */
async function deleteBusiness(businessId) {
  await dynamoClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { businessId },
      UpdateExpression: "SET status = :status, updatedAt = :timestamp",
      ExpressionAttributeValues: {
        ":status": "inactive",
        ":timestamp": getCurrentTimestamp(),
      },
    })
  );
}

/**
 * Search businesses by location (latitude/longitude with radius)
 */
async function searchBusinessesByLocation(lat, lng, radius, limit = 100, offset = 0) {
  try {
    // Validate coordinates
    if (typeof lat !== "number" || typeof lng !== "number") {
      throw new Error("Latitude and longitude must be numbers");
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error("Invalid coordinates");
    }

    // For DynamoDB, we'll need to use a scan with filter or query by city
    // This is a simplified version - in production, you'd use a geospatial index
    // For now, we'll query by nearby cities or use a scan with distance calculation
    const queryParams = {
      TableName: TABLE_NAME,
      FilterExpression: "attribute_exists(location)",
      Limit: limit + offset,
    };

    const result = await dynamoClient.send(new ScanCommand(queryParams));
    const items = (result.Items || []).map(item => normalizeBusinessForRead(item));

    // Filter by distance (Haversine formula)
    const filteredItems = items
      .filter((item) => {
        if (!item.location || typeof item.location.latitude !== "number" || typeof item.location.longitude !== "number") {
          return false;
        }

        // Calculate distance in kilometers
        const distance = calculateDistance(lat, lng, item.location.latitude, item.location.longitude);
        return distance <= radius; // radius in kilometers
      })
      .sort((a, b) => {
        // Sort by distance
        const distA = calculateDistance(lat, lng, a.location.latitude, a.location.longitude);
        const distB = calculateDistance(lat, lng, b.location.latitude, b.location.longitude);
        return distA - distB;
      });

    // Apply offset
    const paginatedItems = filteredItems.slice(offset, offset + limit);

    return {
      items: paginatedItems,
      total: filteredItems.length,
      limit,
      offset,
    };
  } catch (error) {
    throw new Error(`Failed to search businesses by location: ${error.message || String(error)}`);
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Search businesses by name
 */
async function searchBusinessesByName(name, limit = 100, offset = 0) {
  try {
    // Normalize name
    const normalizedName = normalizeBusinessName(name);

    if (!normalizedName) {
      throw new Error(`Invalid business name: ${name}`);
    }

    // Validate name
    const nameValidation = validateBusinessName(name);
    if (!nameValidation.valid) {
      throw new Error(nameValidation.error);
    }

    // Use scan with filter (in production, use a search index like OpenSearch)
    const queryParams = {
      TableName: TABLE_NAME,
      FilterExpression: "contains(normalizedName, :name)",
      ExpressionAttributeValues: {
        ":name": normalizedName,
      },
      Limit: limit + offset,
    };

    const result = await dynamoClient.send(new ScanCommand(queryParams));
    const items = (result.Items || []).map(item => normalizeBusinessForRead(item));

    // Apply offset
    const paginatedItems = items.slice(offset, offset + limit);

    return {
      items: paginatedItems,
      total: items.length,
      limit,
      offset,
    };
  } catch (error) {
    throw new Error(`Failed to search businesses by name: ${error.message || String(error)}`);
  }
}

/**
 * Get all businesses (scan)
 * Use with caution - can be expensive for large tables
 * 
 * @param options - Options for scanning
 * @returns Array of all businesses
 */
async function getAllBusinesses(options = {}) {
  const { limit, exclusiveStartKey, filterExpression, expressionAttributeValues, expressionAttributeNames } = options;

  const scanParams = {
    TableName: TABLE_NAME,
  };

  if (limit) {
    scanParams.Limit = limit;
  }

  if (exclusiveStartKey) {
    scanParams.ExclusiveStartKey = exclusiveStartKey;
  }

  if (filterExpression) {
    scanParams.FilterExpression = filterExpression;
  }

  if (expressionAttributeValues) {
    scanParams.ExpressionAttributeValues = expressionAttributeValues;
  }

  if (expressionAttributeNames) {
    scanParams.ExpressionAttributeNames = expressionAttributeNames;
  }

  const allItems = [];
  let lastEvaluatedKey = exclusiveStartKey;

  do {
    if (lastEvaluatedKey) {
      scanParams.ExclusiveStartKey = lastEvaluatedKey;
    }

    const result = await dynamoClient.send(new ScanCommand(scanParams));
    const items = (result.Items || []).map(item => normalizeBusinessForRead(item));
    allItems.push(...items);
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return allItems;
}

/**
 * Get all business IDs (more efficient than getAllBusinesses)
 * 
 * @param options - Options for scanning
 * @returns Array of business IDs
 */
async function getAllBusinessIds(options = {}) {
  const { limit, exclusiveStartKey } = options;

  const scanParams = {
    TableName: TABLE_NAME,
    ProjectionExpression: "businessId",
  };

  if (limit) {
    scanParams.Limit = limit;
  }

  if (exclusiveStartKey) {
    scanParams.ExclusiveStartKey = exclusiveStartKey;
  }

  const allIds = [];
  let lastEvaluatedKey = exclusiveStartKey;

  do {
    if (lastEvaluatedKey) {
      scanParams.ExclusiveStartKey = lastEvaluatedKey;
    }

    const result = await dynamoClient.send(new ScanCommand(scanParams));
    const ids = (result.Items || []).map(item => item.businessId).filter(Boolean);
    allIds.push(...ids);
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return allIds;
}

module.exports = {
  createBusiness,
  getBusinessById,
  updateBusiness,
  deleteBusiness,
  searchBusinessesByCategory,
  searchBusinessesByLocation,
  searchBusinessesByName,
  queryBusinessesByCategoryAndCity,
  queryBusinessesByCity,
  queryBusinessesByCategoryAndRating,
  queryBusinessesByOwner,
  queryBusinessesByStatus,
  getAllBusinesses,
  getAllBusinessIds,
};

