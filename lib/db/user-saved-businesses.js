const { dynamoClient } = require("../dynamodb");
const { PutCommand, QueryCommand, DeleteCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

const TABLE_NAME = "UserSavedBusinesses";

/**
 * Get current Unix timestamp in milliseconds
 */
function getCurrentTimestamp() {
  return Date.now();
}

/**
 * Save a business for a user
 */
async function saveBusiness(userId, businessData) {
  const createdAt = getCurrentTimestamp();
  const { businessId, note, tags, source = "manual" } = businessData;

  if (!businessId) {
    throw new Error("businessId is required");
  }

  const item = {
    userId,
    createdAt,
    businessId,
    note: note || null,
    tags: tags || [],
    source,
    status: "active",
    // Store full business data for quick access
    business: businessData.business || null,
  };

  try {
    console.log("[DB] Saving business to database:", { userId, businessId, tableName: TABLE_NAME });
    await dynamoClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
        // Note: We check for duplicates via API before calling this function
        // Using a simpler condition to avoid conflicts
      })
    );
    console.log("[DB] Successfully saved business to database");
  } catch (error) {
    console.error("[DB] Error saving business to database:", {
      name: error.name,
      message: error.message,
      code: error.code,
      tableName: TABLE_NAME,
      userId,
      businessId,
    });
    // Handle ConditionalCheckFailedException if it occurs
    if (error.name === "ConditionalCheckFailedException" || error.name === "ResourceNotFoundException") {
      throw new Error("Business already saved");
    }
    // Re-throw with more context
    throw new Error(`Database error: ${error.message || error.name || String(error)}`);
  }

  return item;
}

/**
 * Remove a saved business
 */
async function removeSavedBusiness(userId, businessId) {
  // First, find the item using GSI
  const gsiResult = await dynamoClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "business-index",
      KeyConditionExpression: "userId = :userId AND businessId = :businessId",
      ExpressionAttributeValues: {
        ":userId": userId,
        ":businessId": businessId,
      },
      Limit: 1,
    })
  );

  if (!gsiResult.Items || gsiResult.Items.length === 0) {
    return null; // Not found
  }

  const item = gsiResult.Items[0];

  // Delete using primary key
  await dynamoClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        userId: item.userId,
        createdAt: item.createdAt,
      },
    })
  );

  return item;
}

/**
 * Get saved businesses for a user (paginated)
 */
async function getSavedBusinesses(userId, options = {}) {
  const { limit = 25, cursor } = options;

  const queryParams = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: {
      ":userId": userId,
    },
    Limit: limit,
    ScanIndexForward: false, // Sort by createdAt descending (newest first)
  };

  // Add cursor for pagination
  if (cursor) {
    try {
      const cursorData = JSON.parse(Buffer.from(cursor, "base64").toString());
      queryParams.ExclusiveStartKey = {
        userId: cursorData.userId,
        createdAt: cursorData.createdAt,
      };
    } catch (err) {
      console.error("Invalid cursor:", err);
    }
  }

  const result = await dynamoClient.send(new QueryCommand(queryParams));

  // Build next cursor
  let nextCursor = null;
  if (result.LastEvaluatedKey) {
    nextCursor = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64");
  }

  return {
    items: result.Items || [],
    nextCursor,
    hasMore: !!result.LastEvaluatedKey,
  };
}

/**
 * Check if a business is saved by a user
 */
async function isBusinessSaved(userId, businessId) {
  const result = await dynamoClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "business-index",
      KeyConditionExpression: "userId = :userId AND businessId = :businessId",
      ExpressionAttributeValues: {
        ":userId": userId,
        ":businessId": businessId,
      },
      Limit: 1,
    })
  );

  return (result.Items || []).length > 0;
}

/**
 * Get count of saved businesses for a user
 */
async function getSavedBusinessCount(userId) {
  const result = await dynamoClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
      Select: "COUNT",
    })
  );

  return result.Count || 0;
}

module.exports = {
  saveBusiness,
  removeSavedBusiness,
  getSavedBusinesses,
  isBusinessSaved,
  getSavedBusinessCount,
};

