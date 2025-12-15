const { dynamoClient } = require("../dynamodb");
const { BatchWriteCommand, QueryCommand, DeleteCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const TABLE_NAME = "UserPreferredCategories";

/**
 * Fetch preferred categories for a user (returns array of categoryId strings)
 */
async function getUserPreferredCategories(userId) {
  const result = await dynamoClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
    })
  );

  return (result.Items || []).map((item) => item.categoryId);
}

/**
 * Replace preferred categories for a user with the provided list
 * Uses batch writes (delete existing, then put new)
 */
async function replaceUserPreferredCategories(userId, categoryIds, source = "manual") {
  // 1) delete existing
  const existing = await getUserPreferredCategories(userId);
  if (existing.length > 0) {
    const deleteRequests = existing.map((categoryId) => ({
      DeleteRequest: {
        Key: { userId, categoryId },
      },
    }));
    await dynamoClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: deleteRequests,
        },
      })
    );
  }

  // 2) insert new
  if (categoryIds.length === 0) return;

  const now = Date.now();
  const putRequests = categoryIds.map((categoryId) => ({
    PutRequest: {
      Item: {
        userId,
        categoryId,
        source,
        createdAt: now,
      },
    },
  }));

  // DynamoDB batch write limit is 25; chunk if needed
  for (let i = 0; i < putRequests.length; i += 25) {
    const chunk = putRequests.slice(i, i + 25);
    await dynamoClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: chunk,
        },
      })
    );
  }
}

/**
 * Remove a single preferred category
 */
async function removeUserPreferredCategory(userId, categoryId) {
  await dynamoClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { userId, categoryId },
    })
  );
}

/**
 * Add a single preferred category (idempotent)
 */
async function addUserPreferredCategory(userId, categoryId, source = "manual") {
  await dynamoClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        userId,
        categoryId,
        source,
        createdAt: Date.now(),
      },
      ConditionExpression: "attribute_not_exists(categoryId)",
    })
  );
}

module.exports = {
  getUserPreferredCategories,
  replaceUserPreferredCategories,
  removeUserPreferredCategory,
  addUserPreferredCategory,
};

