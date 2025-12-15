const { dynamoClient } = require("../dynamodb");
const {
  PutCommand,
  QueryCommand,
  GetCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const TABLE_NAME = "UserSearchHistory";

/**
 * Get current Unix timestamp
 */
function getCurrentTimestamp() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Record search history entry
 */
async function recordSearchHistory(userId, searchData) {
  const createdAt = getCurrentTimestamp();

  const historyEntry = {
    userId,
    createdAt, // Using createdAt as sort key (matches actual table schema)
    query: searchData.query || "",
    clickedResults: searchData.clickedResults || [],
    filters: searchData.filters || {},
    location: searchData.location || {},
    resultPosition: searchData.resultPosition || null,
    resultCount: typeof searchData.resultCount === "number" ? searchData.resultCount : undefined,
  };

  await dynamoClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: historyEntry,
    })
  );

  return historyEntry;
}

/**
 * Get user search history
 */
async function getUserSearchHistory(userId, options = {}) {
  const { limit = 50, startTimestamp, endTimestamp, cursor } = options;

  const queryParams = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: {
      ":userId": userId,
    },
    Limit: limit,
    ScanIndexForward: false, // Sort by createdAt descending
  };

  // Add timestamp filters if provided (using createdAt as sort key)
  if (startTimestamp || endTimestamp) {
    let condition = "";
    if (startTimestamp && endTimestamp) {
      condition = "createdAt BETWEEN :start AND :end";
      queryParams.ExpressionAttributeValues[":start"] = startTimestamp;
      queryParams.ExpressionAttributeValues[":end"] = endTimestamp;
    } else if (startTimestamp) {
      condition = "createdAt >= :start";
      queryParams.ExpressionAttributeValues[":start"] = startTimestamp;
    } else if (endTimestamp) {
      condition = "createdAt <= :end";
      queryParams.ExpressionAttributeValues[":end"] = endTimestamp;
    }

    if (condition) {
      queryParams.KeyConditionExpression += ` AND ${condition}`;
    }
  }

  if (cursor !== undefined) {
    queryParams.ExclusiveStartKey = {
      userId,
      createdAt: Number(cursor),
    };
  }

  const result = await dynamoClient.send(new QueryCommand(queryParams));
  return {
    items: result.Items || [],
    nextCursor: result.LastEvaluatedKey ? result.LastEvaluatedKey.createdAt : undefined,
  };
}

/**
 * Get recent search queries for a user
 */
async function getRecentSearchQueries(userId, limit = 10) {
  const { items } = await getUserSearchHistory(userId, { limit });
  return items.map((entry) => entry.query);
}

/**
 * Get search analytics for a user
 */
async function getUserSearchAnalytics(userId, options = {}) {
  const { days = 30 } = options;
  const endTimestamp = getCurrentTimestamp();
  const startTimestamp = endTimestamp - days * 24 * 60 * 60;

  const history = await getUserSearchHistory(userId, {
    startTimestamp,
    endTimestamp,
    limit: 1000,
  });

  // Calculate analytics
  const totalSearches = history.length;
  const uniqueQueries = new Set(history.map((h) => h.query)).size;
  const categories = {};
  const locations = {};

  history.forEach((entry) => {
    if (entry.filters?.categories) {
      entry.filters.categories.forEach((cat) => {
        categories[cat] = (categories[cat] || 0) + 1;
      });
    }

    if (entry.location?.city) {
      const city = entry.location.city;
      locations[city] = (locations[city] || 0) + 1;
    }
  });

  return {
    totalSearches,
    uniqueQueries,
    topCategories: Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([category, count]) => ({ category, count })),
    topLocations: Object.entries(locations)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([location, count]) => ({ location, count })),
  };
}

module.exports = {
  recordSearchHistory,
  getUserSearchHistory,
  getRecentSearchQueries,
  getUserSearchAnalytics,
};

