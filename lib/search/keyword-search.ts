/**
 * Keyword search module
 * Provides functions for searching businesses by name and category
 */

import { ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

// Import DynamoDB client (CommonJS)
const { dynamoClient } = require("../dynamodb");

// Import normalizers
import { normalizeBusinessName } from "../normalization/name-normalizer";
import { normalizeCategory } from "../normalization/category-normalizer";
import { normalizeCity } from "../normalization/location-normalizer";

// Import category mapper for enhanced search
import { extractCategoriesFromQuery, getAllRelatedCategories } from "./category-mapper";

// Import validators
import { validateBusinessName } from "../validation/name-validator";
import { validateCategory } from "../validation/category-validator";
import { isWithinIndiaBounds } from "../data/india-bounds";

// Import location utilities
import { calculateDistance } from "../utils/location";

// Import geocoding (CommonJS)
const { reverseGeocode } = require("../geocoding");

const TABLE_NAME = "Businesses";

/**
 * Search result interface
 */
export interface SearchResult {
  items: any[];
  total: number;
  limit: number;
  offset: number;
  hasMore?: boolean;
}

/**
 * Business with distance (for location-based search)
 */
export interface BusinessWithDistance {
  business: any;
  distance: number; // Distance in meters
}

/**
 * Search filters interface
 */
export interface SearchFilters {
  category?: string;
  location?: {
    lat: number;
    lng: number;
    radius?: number; // Radius in meters
    city?: string; // City name for explicit city searches
  };
  minRating?: number;
  priceRange?: string;
  limit?: number;
  offset?: number;
}

/**
 * Search businesses by category only (without city filter)
 * Scans all businesses with matching category
 * 
 * @param category - Category ID to search for
 * @param limit - Maximum number of results to return
 * @param offset - Number of results to skip
 * @returns Search results with items, total, limit, and offset
 */
async function searchBusinessesByCategoryOnly(
  category: string,
  limit: number = 100,
  offset: number = 0
): Promise<SearchResult> {
  try {
    // Normalize category ID
    const normalizedCategory = normalizeCategory(category);

    if (!normalizedCategory) {
      throw new Error(`Invalid category: ${category}`);
    }

    // Validate category exists
    const categoryValidation = validateCategory(normalizedCategory);
    if (!categoryValidation.valid) {
      throw new Error(categoryValidation.error || `Category not found: ${category}`);
    }

    // Use Scan with category filter
    const scanParams = {
      TableName: TABLE_NAME,
      FilterExpression: "#category = :category AND #status = :active",
      ExpressionAttributeNames: {
        "#category": "category",
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":category": normalizedCategory,
        ":active": "active",
      },
      Limit: limit + offset,
    };

    const result = await dynamoClient.send(new ScanCommand(scanParams));
    const items = result.Items || [];

    // Filter out inactive businesses (additional safety check)
    const activeItems = items.filter((item: any) => item.status === "active");

    // Apply offset
    const paginatedItems = activeItems.slice(offset, offset + limit);

    return {
      items: paginatedItems,
      total: activeItems.length,
      limit,
      offset,
      hasMore: result.LastEvaluatedKey !== undefined || activeItems.length > offset + limit,
    };
  } catch (error: any) {
    throw new Error(
      `Failed to search businesses by category: ${error.message || String(error)}`
    );
  }
}

/**
 * Search businesses by name
 * 
 * Enhanced version that also searches by category when the query matches category terms.
 * For example, searching "restaurant" will find all businesses with category "food",
 * not just those with "restaurant" in their name.
 * 
 * Normalizes business name and queries Businesses table using normalizedName field.
 * Uses case-insensitive matching (DynamoDB contains).
 * Filters by status: "active".
 * Applies limit and offset for pagination.
 * 
 * @param name - Business name or category-related term to search for
 * @param limit - Maximum number of results to return
 * @param offset - Number of results to skip
 * @returns Search results with items, total, limit, and offset
 */
export async function searchBusinessesByName(
  name: string,
  limit: number = 100,
  offset: number = 0,
  isSearchQuery: boolean = true // Flag to indicate if this is a search query vs actual business name
): Promise<SearchResult> {
  try {
    // Normalize input name
    const normalizedName = normalizeBusinessName(name);

    if (!normalizedName) {
      throw new Error(`Invalid business name: ${name}`);
    }

    // Only validate business name format if it's NOT a search query
    // Search queries can contain question marks, special characters, etc.
    if (!isSearchQuery) {
      const nameValidation = validateBusinessName(name);
      if (!nameValidation.valid) {
        throw new Error(nameValidation.error || "Invalid business name");
      }
    }

    // Check if the query matches any category terms
    const matchedCategories = extractCategoriesFromQuery(name);
    const allRelatedCategories = getAllRelatedCategories(name);

    // Use a Map to deduplicate results by businessId
    const resultMap = new Map<string, any>();
    
    // 1. Perform name search (original functionality)
    const normalizedQuery = normalizedName.toLowerCase();
    const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 0);
    
    let filterExpression = "#status = :active";
    const expressionAttributeValues: any = {
      ":active": "active",
    };
    
    const wordFilters: string[] = [];
    const expressionAttributeNames: any = {
      "#status": "status",
    };
    
    if (queryWords.length > 0) {
      expressionAttributeNames["#desc"] = "description";
    }
    
    queryWords.forEach((word, index) => {
      const valueKey = `:word${index}`;
      expressionAttributeValues[valueKey] = word;
      wordFilters.push(`contains(normalizedName, ${valueKey}) OR contains(#desc, ${valueKey}) OR contains(category, ${valueKey})`);
    });
    
    if (wordFilters.length > 0) {
      filterExpression += ` AND (${wordFilters.join(" OR ")})`;
    } else {
      expressionAttributeValues[":name"] = normalizedQuery;
      filterExpression += ` AND contains(normalizedName, :name)`;
    }
    
    const scanParams = {
      TableName: TABLE_NAME,
      FilterExpression: filterExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: (limit + offset) * 2, // Fetch more to account for category search results
    };

    const nameSearchResult = await dynamoClient.send(new ScanCommand(scanParams));
    const nameSearchItems = nameSearchResult.Items || [];
    const activeNameItems = nameSearchItems.filter((item: any) => item.status === "active");
    
    // Add name search results to map
    for (const item of activeNameItems) {
      if (item.businessId) {
        resultMap.set(item.businessId, item);
      }
    }

    // 2. Perform category search if query matches category terms
    // Search each matched category and merge results
    for (const categoryId of allRelatedCategories) {
      try {
        const categoryResults = await searchBusinessesByCategoryOnly(
          categoryId,
          limit * 2, // Get more results from category search
          0
        );
        
        // Add category search results to map (will deduplicate automatically)
        for (const item of categoryResults.items) {
          if (item.businessId) {
            // Only add if not already in map (name search takes priority for relevance)
            if (!resultMap.has(item.businessId)) {
              resultMap.set(item.businessId, item);
            }
          }
        }
      } catch (error: any) {
        // Continue if category search fails for one category
        console.warn(`Category search failed for ${categoryId}:`, error.message);
      }
    }

    // Convert map to array
    const allItems = Array.from(resultMap.values());

    // Apply offset and limit
    const paginatedItems = allItems.slice(offset, offset + limit);

    return {
      items: paginatedItems,
      total: allItems.length,
      limit,
      offset,
      hasMore: allItems.length > offset + limit,
    };
  } catch (error: any) {
    throw new Error(`Failed to search businesses by name: ${error.message || String(error)}`);
  }
}

/**
 * Search businesses by category
 * 
 * Normalizes category ID and validates category exists.
 * Normalizes city name.
 * Queries using category-location-index:
 * - Partition key: normalized category
 * - Sort key: normalized city
 * Filters by status: "active".
 * 
 * @param category - Category to search for
 * @param city - City to search in
 * @param limit - Maximum number of results to return
 * @param offset - Number of results to skip
 * @returns Search results with items, total, limit, and offset
 */
export async function searchBusinessesByCategory(
  category: string,
  city: string,
  limit: number = 100,
  offset: number = 0
): Promise<SearchResult> {
  try {
    // Normalize category ID
    const normalizedCategory = normalizeCategory(category);

    if (!normalizedCategory) {
      throw new Error(`Invalid category: ${category}`);
    }

    // Validate category exists
    const categoryValidation = validateCategory(normalizedCategory);
    if (!categoryValidation.valid) {
      throw new Error(categoryValidation.error || `Category not found: ${category}`);
    }

    // Normalize city name
    const normalizedCity = normalizeCity(city) || city;

    if (!normalizedCity) {
      throw new Error(`Invalid city: ${city}`);
    }

    // Query using category-location-index
    const queryParams = {
      TableName: TABLE_NAME,
      IndexName: "category-location-index",
      KeyConditionExpression: "#category = :category AND #city = :city",
      FilterExpression: "#status = :active",
      ExpressionAttributeNames: {
        "#category": "category",
        "#city": "city",
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":category": normalizedCategory,
        ":city": normalizedCity,
        ":active": "active",
      },
      Limit: limit + offset, // Fetch more to handle offset
      ScanIndexForward: false, // Sort by createdAt descending (newest first)
    };

    const result = await dynamoClient.send(new QueryCommand(queryParams));
    const items = result.Items || [];

    // Filter out inactive businesses (additional safety check)
    const activeItems = items.filter((item: any) => item.status === "active");

    // Apply offset
    const paginatedItems = activeItems.slice(offset, offset + limit);

    return {
      items: paginatedItems,
      total: activeItems.length,
      limit,
      offset,
      hasMore: result.LastEvaluatedKey !== undefined || activeItems.length > offset + limit,
    };
  } catch (error: any) {
    throw new Error(
      `Failed to search businesses by category: ${error.message || String(error)}`
    );
  }
}

/**
 * Search businesses by name and location
 * Combines name search with location filtering
 * 
 * @param name - Business name to search for
 * @param city - City to filter by (optional)
 * @param limit - Maximum number of results to return
 * @param offset - Number of results to skip
 * @returns Search results
 */
export async function searchBusinessesByNameAndLocation(
  name: string,
  city?: string,
  limit: number = 100,
  offset: number = 0
): Promise<SearchResult> {
  try {
    // Normalize inputs
    const normalizedName = normalizeBusinessName(name);
    const normalizedCity = city ? normalizeCity(city) : undefined;

    if (!normalizedName) {
      throw new Error(`Invalid business name: ${name}`);
    }

    // Build filter expression
    let filterExpression = "contains(normalizedName, :name) AND #status = :active";
    const expressionAttributeNames: Record<string, string> = {
      "#status": "status",
    };
    const expressionAttributeValues: Record<string, any> = {
      ":name": normalizedName.toLowerCase(),
      ":active": "active",
    };

    // Add city filter if provided
    if (normalizedCity) {
      filterExpression += " AND #city = :city";
      expressionAttributeNames["#city"] = "city";
      expressionAttributeValues[":city"] = normalizedCity;
    }

    const scanParams = {
      TableName: TABLE_NAME,
      FilterExpression: filterExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit + offset,
    };

    const result = await dynamoClient.send(new ScanCommand(scanParams));
    const items = result.Items || [];

    // Filter out inactive businesses
    const activeItems = items.filter((item: any) => item.status === "active");

    // Apply offset
    const paginatedItems = activeItems.slice(offset, offset + limit);

    return {
      items: paginatedItems,
      total: activeItems.length,
      limit,
      offset,
      hasMore: result.LastEvaluatedKey !== undefined || activeItems.length > offset + limit,
    };
  } catch (error: any) {
    throw new Error(
      `Failed to search businesses by name and location: ${error.message || String(error)}`
    );
  }
}


/**
 * Search businesses by location
 * 
 * Validates coordinates are in India bounds.
 * Queries using location-index (pre-filters by city for performance).
 * Calculates distance for each result using Haversine formula.
 * Filters by radius.
 * Sorts by distance.
 * Returns results with distance.
 * 
 * @param lat - Latitude
 * @param lng - Longitude
 * @param radius - Search radius in meters
 * @param limit - Maximum number of results to return
 * @param offset - Number of results to skip
 * @returns Search results with items (including distance) and pagination info
 */
export async function searchBusinessesByLocation(
  lat: number,
  lng: number,
  radius: number,
  limit: number = 100,
  offset: number = 0
): Promise<SearchResult & { items: BusinessWithDistance[] }> {
  try {
    // Validate coordinates are in India bounds
    if (!isWithinIndiaBounds(lat, lng)) {
      throw new Error("Coordinates are outside India bounds");
    }

    // Validate coordinate ranges
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error("Invalid coordinates");
    }

    // Validate radius
    if (radius <= 0) {
      throw new Error("Radius must be greater than 0");
    }

    // Try to get city from coordinates for pre-filtering
    // This helps performance by reducing the number of items to check
    let cityFilter: string | undefined;
    try {
      const geocoded = await reverseGeocode(lat, lng);
      // Extract city from address if possible
      // For now, we'll use scan but could optimize with city filter if available
    } catch (error) {
      // Continue without city filter
    }

    // For performance, we'll use a scan with filter
    // In production, consider using a geospatial index or querying by nearby cities
    // If city is known, we could query location-index GSI by city first
    // Check for both location and locationDetails since location might be stored as string
    const scanParams = {
      TableName: TABLE_NAME,
      FilterExpression: "#status = :active AND (attribute_exists(locationDetails) OR attribute_exists(#location))",
      ExpressionAttributeNames: {
        "#location": "location", // "location" is a reserved keyword, must escape
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":active": "active",
      },
    };

    const result = await dynamoClient.send(new ScanCommand(scanParams));
    const items = result.Items || [];

    // Normalize businesses to reconstruct location objects from locationDetails
    // If locationDetails exists and location is a string, use locationDetails as location
    const normalizedItems = items.map((item: any) => {
      if (item.locationDetails && typeof item.location === 'string') {
        item.location = item.locationDetails;
      }
      return item;
    });

    // Calculate distance for each business and filter by radius
    const businessesWithDistance: BusinessWithDistance[] = normalizedItems
      .filter((item: any) => {
        // Check if business has valid location (could be in location or locationDetails)
        const location = item.location || item.locationDetails;
        if (
          !location ||
          typeof location.latitude !== "number" ||
          typeof location.longitude !== "number"
        ) {
          return false;
        }

        // Check if business is active
        if (item.status !== "active") {
          return false;
        }

        // Calculate distance in meters (location already defined above)
        const distance = calculateDistance(
          { latitude: lat, longitude: lng },
          {
            latitude: location.latitude,
            longitude: location.longitude,
          }
        );

        // Filter by radius
        return distance <= radius;
      })
      .map((item: any) => {
        const location = item.location || item.locationDetails;
        return {
        business: item,
        distance: calculateDistance(
          { latitude: lat, longitude: lng },
          {
              latitude: location.latitude,
              longitude: location.longitude,
          }
        ),
        };
      })
      .sort((a: BusinessWithDistance, b: BusinessWithDistance) => a.distance - b.distance); // Sort by distance (closest first)

    // Apply offset and limit
    const paginatedItems = businessesWithDistance.slice(offset, offset + limit);

    return {
      items: paginatedItems,
      total: businessesWithDistance.length,
      limit,
      offset,
      hasMore: businessesWithDistance.length > offset + limit,
    };
  } catch (error: any) {
    throw new Error(
      `Failed to search businesses by location: ${error.message || String(error)}`
    );
  }
}

/**
 * Match text against query
 * 
 * Implements basic text matching:
 * - Case-insensitive
 * - Word boundary matching
 * - Partial word matching
 * 
 * @param text - Text to search in
 * @param query - Query string to match
 * @returns Relevance score (0-1)
 */
export function matchText(text: string, query: string): number {
  if (!text || !query) {
    return 0;
  }

  const textLower = text.toLowerCase().trim();
  const queryLower = query.toLowerCase().trim();

  if (!textLower || !queryLower) {
    return 0;
  }

  // Exact match (highest score)
  if (textLower === queryLower) {
    return 1.0;
  }

  // Text starts with query
  if (textLower.startsWith(queryLower)) {
    return 0.9;
  }

  // Query starts with text
  if (queryLower.startsWith(textLower)) {
    return 0.8;
  }

  // Word boundary matching - check if query matches whole words
  const words = textLower.split(/\s+/);
  const queryWords = queryLower.split(/\s+/);

  // Check if all query words are found as whole words
  let wholeWordMatches = 0;
  for (const queryWord of queryWords) {
    if (words.includes(queryWord)) {
      wholeWordMatches++;
    }
  }

  if (wholeWordMatches === queryWords.length && queryWords.length > 0) {
    return 0.7;
  }

  // Partial word matching - check if query words are contained in text words
  let partialMatches = 0;
  for (const queryWord of queryWords) {
    for (const word of words) {
      if (word.includes(queryWord) || queryWord.includes(word)) {
        partialMatches++;
        break;
      }
    }
  }

  if (partialMatches === queryWords.length && queryWords.length > 0) {
    return 0.5;
  }

  // Simple contains check
  if (textLower.includes(queryLower)) {
    return 0.3;
  }

  // Check if any word contains query
  for (const word of words) {
    if (word.includes(queryLower)) {
      return 0.2;
    }
  }

  // No match
  return 0;
}

/**
 * Combined search function
 * 
 * Combines all search methods:
 * - Name search
 * - Category search
 * - Location-based search
 * Merges and deduplicates results.
 * Applies additional filters (rating, price range, etc.).
 * 
 * @param query - Search query string
 * @param filters - Search filters
 * @returns Combined search results
 */
export async function searchBusinesses(
  query: string,
  filters: SearchFilters = {}
): Promise<any[]> {
  try {
    const {
      category,
      location,
      minRating,
      priceRange,
      limit = 100,
      offset = 0,
    } = filters;

    const results: Map<string, any> = new Map(); // Use Map to deduplicate by businessId
    const seenNames = new Set<string>(); // Additional deduplication by name+city as fallback

    // Helper function to get a unique key for deduplication
    const getDedupKey = (item: any): string => {
      // Primary: use businessId if available
      if (item.businessId) {
        return item.businessId;
      }
      // Fallback: use name + city combination
      const name = (item.name || '').toLowerCase().trim();
      const city = (item.location?.city || item.city || '').toLowerCase().trim();
      return `name:${name}:city:${city}`;
    };

    // Try name search if query is provided
    if (query && query.trim().length > 0) {
      try {
        const nameResults = await searchBusinessesByName(query, limit * 2, 0, true);
        for (const item of nameResults.items) {
          const key = getDedupKey(item);
          // Ensure businessId exists
          if (!item.businessId && item.businessId !== null) {
            // Generate a temporary ID if missing (shouldn't happen, but safety check)
            item.businessId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          }
          if (!results.has(key) && !seenNames.has(key)) {
            results.set(key, item);
            seenNames.add(key);
          }
        }
      } catch (error) {
        // Continue if name search fails
        console.warn("Name search failed:", error);
      }
    }

    // Try category search if category filter is provided
    if (category) {
      try {
        // If location is provided with city name, use it directly (for explicit city searches)
        // Otherwise, try to get city from coordinates
        let city: string | undefined;
        if (location && (location as any).city) {
          // Use city name directly if available (from explicit city search)
          city = (location as any).city;
        } else if (location && location.lat && location.lng) {
          // Try to get city from coordinates
          city = await getCityFromCoordinates(location.lat, location.lng);
        }

        if (city) {
          const categoryResults = await searchBusinessesByCategory(
            category,
            city,
            limit * 2,
            0
          );
          for (const item of categoryResults.items) {
            const key = getDedupKey(item);
            // Ensure businessId exists
            if (!item.businessId && item.businessId !== null) {
              item.businessId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            if (!results.has(key) && !seenNames.has(key)) {
              results.set(key, item);
              seenNames.add(key);
            }
          }
        } else {
          // If no city filter, search across all cities
          const categoryResults = await searchBusinessesByCategoryOnly(
            category,
            limit * 2,
            0
          );
          for (const item of categoryResults.items) {
            const key = getDedupKey(item);
            // Ensure businessId exists
            if (!item.businessId && item.businessId !== null) {
              item.businessId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            if (!results.has(key) && !seenNames.has(key)) {
              results.set(key, item);
              seenNames.add(key);
            }
          }
        }
      } catch (error) {
        // Continue if category search fails
        console.warn("Category search failed:", error);
      }
    }

    // Try location-based search if location filter is provided
    if (location && location.lat && location.lng) {
      try {
        const radius = location.radius || 10000; // Default 10km
        const locationResults = await searchBusinessesByLocation(
          location.lat,
          location.lng,
          radius,
          limit * 2,
          0
        );

        for (const itemWithDistance of locationResults.items) {
          const item = itemWithDistance.business;
          const key = getDedupKey(item);
          // Ensure businessId exists
          if (!item.businessId && item.businessId !== null) {
            item.businessId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          }
          if (!results.has(key) && !seenNames.has(key)) {
            // Add distance to business object
            item.distance = itemWithDistance.distance;
            results.set(key, item);
            seenNames.add(key);
          } else {
            // Update distance if already exists
            const existing = results.get(key);
            if (existing) {
              existing.distance = itemWithDistance.distance;
            }
          }
        }
      } catch (error) {
        // Continue if location search fails
        console.warn("Location search failed:", error);
      }
    }

    // Convert Map to array and ensure businessId is present
    let combinedResults = Array.from(results.values()).map((item: any) => {
      // Ensure businessId is always present
      if (!item.businessId) {
        item.businessId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      return item;
    });

    // Apply additional filters
    if (minRating !== undefined) {
      combinedResults = combinedResults.filter(
        (item: any) => item.rating >= minRating
      );
    }

    if (priceRange) {
      combinedResults = combinedResults.filter(
        (item: any) => item.priceRange === priceRange
      );
    }

    // Sort by relevance (if distance exists, sort by distance; otherwise by rating or name)
    combinedResults.sort((a: any, b: any) => {
      // If both have distance, sort by distance
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      // If only one has distance, prioritize it
      if (a.distance !== undefined) return -1;
      if (b.distance !== undefined) return 1;
      // Otherwise sort by rating (descending)
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      if (ratingB !== ratingA) {
        return ratingB - ratingA;
      }
      // Finally sort by name
      return (a.name || "").localeCompare(b.name || "");
    });

    // Apply limit and offset
    const paginatedResults = combinedResults.slice(offset, offset + limit);

    return paginatedResults;
  } catch (error: any) {
    throw new Error(
      `Failed to search businesses: ${error.message || String(error)}`
    );
  }
}

/**
 * Get city from coordinates (reverse geocoding helper)
 * Uses reverse geocoding to get city name from coordinates
 */
async function getCityFromCoordinates(
  lat: number,
  lng: number
): Promise<string | undefined> {
  try {
    const geocoded = await reverseGeocode(lat, lng);
    if (geocoded && geocoded.address) {
      // Extract city from address (simplified - in production, parse address properly)
      // For now, return undefined to let search work without city filter
      return undefined;
    }
    return undefined;
  } catch (error) {
    // If reverse geocoding fails, return undefined
    return undefined;
  }
}
