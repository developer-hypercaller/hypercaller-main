const { dynamoClient } = require("../dynamodb");
const { PutCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const TABLE_NAME = "SearchQueries";

/**
 * Get current Unix timestamp
 */
function getCurrentTimestamp() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Calculate TTL (90 days from now)
 */
function calculateTTL() {
  return getCurrentTimestamp() + 90 * 24 * 60 * 60; // 90 days
}

/**
 * Record search query for analytics
 */
async function recordSearchQuery(searchData) {
  const queryId = uuidv4();
  const timestamp = getCurrentTimestamp();
  const ttl = calculateTTL();

  const query = {
    queryId,
    query: searchData.query || "",
    normalizedQuery: searchData.normalizedQuery || "",
    userId: searchData.userId || null,
    sessionId: searchData.sessionId || null,
    intent: searchData.intent || "find",
    category: searchData.category || null,
    location: searchData.location || {},
    resultsCount: searchData.resultsCount || 0,
    timestamp,
    responseTime: searchData.responseTime || 0,
    isAuthenticated: !!searchData.userId,
    ttl,
  };

  await dynamoClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: query,
    })
  );

  return query;
}

/**
 * Get search queries by timestamp range (for analytics)
 */
async function getSearchQueriesByTimeRange(startTimestamp, endTimestamp, options = {}) {
  const { limit = 100, exclusiveStartKey } = options;

  // Note: This would use the timestamp-index GSI
  // For simplicity, using scan with filter (not recommended for production)
  // In production, use the GSI for better performance
  const queryParams = {
    TableName: TABLE_NAME,
    IndexName: "timestamp-index",
    KeyConditionExpression: "timestamp BETWEEN :start AND :end",
    ExpressionAttributeValues: {
      ":start": startTimestamp,
      ":end": endTimestamp,
    },
    Limit: limit,
    ScanIndexForward: false, // Sort descending
  };

  if (exclusiveStartKey) {
    queryParams.ExclusiveStartKey = exclusiveStartKey;
  }

  const result = await dynamoClient.send(new QueryCommand(queryParams));
  return {
    items: result.Items || [],
    lastEvaluatedKey: result.LastEvaluatedKey,
  };
}

module.exports = {
  recordSearchQuery,
  getSearchQueriesByTimeRange,
};

