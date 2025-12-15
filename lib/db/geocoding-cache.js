const { dynamoClient } = require("../dynamodb");
const { GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");

const TABLE_NAME = "GeocodingCache";

/**
 * Get current Unix timestamp
 */
function getCurrentTimestamp() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Generate location hash for cache key
 */
function generateLocationHash(locationString) {
  return crypto.createHash("sha256").update(locationString.toLowerCase().trim()).digest("hex");
}

/**
 * Get cached geocoding result
 */
async function getCachedGeocoding(locationString) {
  const addressKey = generateLocationHash(locationString);

  const result = await dynamoClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { addressKey },
    })
  );

  if (!result.Item) {
    return null;
  }

  // Check if cache is still valid (optional TTL check)
  // DynamoDB TTL will handle expiration automatically
  return {
    address: result.Item.address,
    latitude: result.Item.latitude,
    longitude: result.Item.longitude,
    cachedAt: result.Item.cachedAt,
    provider: result.Item.provider,
  };
}

/**
 * Cache geocoding result
 */
async function cacheGeocoding(locationString, geocodingResult) {
  const addressKey = generateLocationHash(locationString);
  const now = getCurrentTimestamp();

  const cacheEntry = {
    addressKey,
    locationString: locationString.toLowerCase().trim(),
    address: geocodingResult.address || locationString,
    latitude: geocodingResult.latitude,
    longitude: geocodingResult.longitude,
    cachedAt: now,
    provider: geocodingResult.provider || "unknown",
  };

  await dynamoClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: cacheEntry,
    })
  );

  return cacheEntry;
}

/**
 * Get or cache geocoding result
 */
async function getOrCacheGeocoding(locationString, geocodingFn) {
  // Try to get from cache first
  const cached = await getCachedGeocoding(locationString);
  if (cached) {
    return cached;
  }

  // If not cached, call geocoding function
  const result = await geocodingFn(locationString);

  // Cache the result
  await cacheGeocoding(locationString, result);

  return result;
}

module.exports = {
  getCachedGeocoding,
  cacheGeocoding,
  getOrCacheGeocoding,
  generateLocationHash,
};

