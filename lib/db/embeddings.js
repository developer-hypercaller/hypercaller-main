const { dynamoClient } = require("../dynamodb");
const { GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const TABLE_NAME = "BusinessEmbeddings";

/**
 * Get current Unix timestamp
 */
function getCurrentTimestamp() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Save embedding for a business
 */
async function saveEmbedding(businessId, embedding, version = "titan-v1", textContent = null) {
  try {
    if (!businessId || !embedding) {
      throw new Error("businessId and embedding are required");
    }

    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error("embedding must be a non-empty array");
    }

    const now = getCurrentTimestamp();

    const embeddingData = {
      businessId,
      embeddingVersion: version,
      embedding,
      lastUpdated: now,
    };

    // Store text content for regeneration if provided
    if (textContent && typeof textContent === "string") {
      embeddingData.textContent = textContent;
    }

    await dynamoClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: embeddingData,
      })
    );

    return embeddingData;
  } catch (error) {
    throw new Error(`Failed to save embedding: ${error.message || String(error)}`);
  }
}

/**
 * Get embedding for a business
 * Gets the latest version if version not specified
 */
async function getEmbedding(businessId, version = "titan-v1") {
  try {
    if (!businessId) {
      throw new Error("businessId is required");
    }

    const result = await dynamoClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          businessId,
          embeddingVersion: version,
        },
      })
    );

    return result.Item || null;
  } catch (error) {
    throw new Error(`Failed to get embedding: ${error.message || String(error)}`);
  }
}

/**
 * Get multiple business embeddings
 */
async function getBusinessEmbeddings(businessIds) {
  if (!Array.isArray(businessIds) || businessIds.length === 0) {
    return [];
  }

  // DynamoDB BatchGetItem has a limit of 100 items
  const batches = [];
  for (let i = 0; i < businessIds.length; i += 100) {
    batches.push(businessIds.slice(i, i + 100));
  }

  const results = [];
  for (const batch of batches) {
    // Note: Table has composite key, so we need to query or use specific version
    // For now, we'll query for each businessId to get embeddings
    const batchResults = await Promise.all(
      batch.map((businessId) =>
        getBusinessEmbedding(businessId) // Gets latest version
      )
    );

    batchResults.forEach((result) => {
      if (result.Item) {
        results.push(result.Item);
      }
    });
  }

  return results;
}

/**
 * Update embedding for a business
 */
async function updateEmbedding(businessId, embedding, version = "titan-v1") {
  try {
    if (!businessId || !embedding) {
      throw new Error("businessId and embedding are required");
    }

    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error("embedding must be a non-empty array");
    }

    const now = getCurrentTimestamp();

    const result = await dynamoClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          businessId,
          embeddingVersion: version,
        },
        UpdateExpression: "SET embedding = :embedding, lastUpdated = :timestamp",
        ExpressionAttributeValues: {
          ":embedding": embedding,
          ":timestamp": now,
        },
        ReturnValues: "ALL_NEW",
      })
    );

    return result.Attributes;
  } catch (error) {
    throw new Error(`Failed to update embedding: ${error.message || String(error)}`);
  }
}

/**
 * Get all embeddings for a specific version
 */
async function getEmbeddingsByVersion(version) {
  try {
    if (!version) {
      throw new Error("version is required");
    }

    // Note: This requires a GSI on embeddingVersion
    // If GSI doesn't exist, we'll need to scan (less efficient)
    const queryParams = {
      TableName: TABLE_NAME,
      IndexName: "embeddingVersion-index", // Assumes GSI exists
      KeyConditionExpression: "embeddingVersion = :version",
      ExpressionAttributeValues: {
        ":version": version,
      },
    };

    try {
      const result = await dynamoClient.send(new QueryCommand(queryParams));
      return result.Items || [];
    } catch (error) {
      // If GSI doesn't exist, fall back to scan (less efficient)
      if (error.name === "ResourceNotFoundException" || error.message?.includes("index")) {
        const scanParams = {
          TableName: TABLE_NAME,
          FilterExpression: "embeddingVersion = :version",
          ExpressionAttributeValues: {
            ":version": version,
          },
        };

        const scanResult = await dynamoClient.send(new ScanCommand(scanParams));
        return scanResult.Items || [];
      }
      throw error;
    }
  } catch (error) {
    throw new Error(`Failed to get embeddings by version: ${error.message || String(error)}`);
  }
}

/**
 * Delete business embedding
 */
async function deleteBusinessEmbedding(businessId) {
  await dynamoClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { businessId },
      // Soft delete by removing embedding
      UpdateExpression: "REMOVE embedding",
    })
  );
}

/**
 * Check if a business has an embedding
 * @param {string} businessId - Business ID to check
 * @param {string} version - Version to check (defaults to "titan-v1")
 * @returns {Promise<boolean>} True if embedding exists
 */
async function hasEmbedding(businessId, version = "titan-v1") {
  try {
    const embedding = await getEmbedding(businessId, version);
    return embedding !== null && embedding !== undefined;
  } catch (error) {
    return false;
  }
}

/**
 * Get all business IDs that don't have embeddings
 * @param {string[]} businessIds - Array of business IDs to check
 * @param {string} version - Version to check (defaults to "titan-v1")
 * @returns {Promise<string[]>} Array of business IDs without embeddings
 */
async function getBusinessesWithoutEmbeddings(businessIds, version = "titan-v1") {
  if (!Array.isArray(businessIds) || businessIds.length === 0) {
    return [];
  }

  const withoutEmbeddings = [];
  const batchSize = 50;

  // Check in batches
  for (let i = 0; i < businessIds.length; i += batchSize) {
    const batch = businessIds.slice(i, i + batchSize);
    const checks = await Promise.all(
      batch.map(async (businessId) => {
        const has = await hasEmbedding(businessId, version);
        return { businessId, has };
      })
    );

    checks.forEach(({ businessId, has }) => {
      if (!has) {
        withoutEmbeddings.push(businessId);
      }
    });
  }

  return withoutEmbeddings;
}

module.exports = {
  saveEmbedding,
  getEmbedding,
  updateEmbedding,
  getEmbeddingsByVersion,
  hasEmbedding,
  getBusinessesWithoutEmbeddings,
  // Backward compatibility
  upsertBusinessEmbedding: saveEmbedding,
  getBusinessEmbedding: getEmbedding,
  getBusinessEmbeddings,
  deleteBusinessEmbedding,
};

