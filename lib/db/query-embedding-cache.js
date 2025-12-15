/**
 * Query Embedding Cache database module
 * Handles caching of query embeddings in DynamoDB
 */

const { dynamoClient } = require("../dynamodb");
const { GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");

const TABLE_NAME = "QueryEmbeddingCache";
const CACHE_TTL_DAYS = 30; // 30 days

/**
 * Get current Unix timestamp in seconds
 */
function getCurrentTimestamp() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Calculate TTL timestamp (30 days from now)
 */
function calculateTTL() {
  return getCurrentTimestamp() + CACHE_TTL_DAYS * 24 * 60 * 60;
}

/**
 * Generate hash for query (for DynamoDB key)
 * Uses SHA-256 hash of normalized query
 */
function hashQuery(normalizedQuery) {
  return crypto.createHash("sha256").update(normalizedQuery).digest("hex");
}

/**
 * Get cached query embedding
 * @param {string} normalizedQuery - Normalized query string
 * @returns {Promise<{embedding: number[], createdAt: number, modelId: string} | null>}
 */
async function getCachedEmbedding(normalizedQuery) {
  try {
    if (!normalizedQuery || typeof normalizedQuery !== "string") {
      return null;
    }

    const queryHash = hashQuery(normalizedQuery);

    const result = await dynamoClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          queryHash: queryHash,
        },
      })
    );

    if (!result.Item) {
      return null;
    }

    // Check if expired (TTL check)
    const now = getCurrentTimestamp();
    if (result.Item.ttl && result.Item.ttl < now) {
      // Item expired, return null
      return null;
    }

    return {
      embedding: result.Item.embedding,
      createdAt: result.Item.createdAt,
      modelId: result.Item.modelId,
    };
  } catch (error) {
    console.error(`[QueryEmbeddingCache] Error getting cached embedding: ${error.message}`);
    return null;
  }
}

/**
 * Save query embedding to cache
 * @param {string} normalizedQuery - Normalized query string
 * @param {number[]} embedding - Embedding vector
 * @param {string} modelId - Model ID used for embedding
 * @returns {Promise<void>}
 */
async function saveCachedEmbedding(normalizedQuery, embedding, modelId) {
  try {
    if (!normalizedQuery || typeof normalizedQuery !== "string") {
      throw new Error("normalizedQuery is required");
    }

    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error("embedding must be a non-empty array");
    }

    if (!modelId || typeof modelId !== "string") {
      throw new Error("modelId is required");
    }

    const queryHash = hashQuery(normalizedQuery);
    const now = getCurrentTimestamp();
    const ttl = calculateTTL();

    const cacheItem = {
      queryHash: queryHash, // Partition key
      normalizedQuery: normalizedQuery, // Store original query for reference
      embedding,
      modelId,
      createdAt: now,
      ttl, // DynamoDB TTL (Unix timestamp in seconds)
    };

    await dynamoClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: cacheItem,
      })
    );

    return cacheItem;
  } catch (error) {
    throw new Error(`Failed to save cached embedding: ${error.message || String(error)}`);
  }
}

/**
 * Check if query embedding is cached
 * @param {string} normalizedQuery - Normalized query string
 * @returns {Promise<boolean>}
 */
async function isCached(normalizedQuery) {
  const cached = await getCachedEmbedding(normalizedQuery);
  return cached !== null;
}

module.exports = {
  getCachedEmbedding,
  saveCachedEmbedding,
  isCached,
};

