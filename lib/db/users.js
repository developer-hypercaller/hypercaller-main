const { dynamoClient } = require("../dynamodb");
const { GetCommand, PutCommand, UpdateCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { normalizeUsername, normalizePhoneNumber } = require("../server-utils");

const TABLE_NAME = "Users";

/**
 * Create a new user
 */
async function createUser(userData) {
  const {
    firstName,
    lastName,
    username,
    phoneNumber,
    passwordHash,
    role,
    avatar,
  } = userData;

  const userId = require("../server-utils").generateUserId();
  const now = require("../server-utils").getCurrentTimestamp();

  const user = {
    userId,
    username: normalizeUsername(username),
    firstName,
    lastName,
    phoneNumber: normalizePhoneNumber(phoneNumber),
    phoneVerified: true,
    passwordHash,
    role: role || "user",
    avatar,
    accountStatus: "active",
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  };

  await dynamoClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: user,
    })
  );

  return user;
}

/**
 * Get user by userId
 */
async function getUserById(userId) {
  const result = await dynamoClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { userId },
    })
  );

  return result.Item || null;
}

/**
 * Get user by username
 */
async function getUserByUsername(username) {
  const normalizedUsername = normalizeUsername(username);

  const result = await dynamoClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "username-index",
      KeyConditionExpression: "username = :username",
      ExpressionAttributeValues: {
        ":username": normalizedUsername,
      },
      Limit: 1,
    })
  );

  return result.Items && result.Items.length > 0 ? result.Items[0] : null;
}

/**
 * Get user by phone number
 */
async function getUserByPhoneNumber(phoneNumber) {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  const result = await dynamoClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "phoneNumber-index",
      KeyConditionExpression: "phoneNumber = :phoneNumber",
      ExpressionAttributeValues: {
        ":phoneNumber": normalizedPhone,
      },
      Limit: 1,
    })
  );

  return result.Items && result.Items.length > 0 ? result.Items[0] : null;
}

/**
 * Check if username exists
 */
async function usernameExists(username) {
  const user = await getUserByUsername(username);
  return user !== null;
}

/**
 * Check if phone number exists and is verified
 */
async function phoneNumberExists(phoneNumber) {
  const user = await getUserByPhoneNumber(phoneNumber);
  if (!user) return { exists: false, verified: false };
  return { exists: true, verified: user.phoneVerified || false };
}

/**
 * Update user's last login time
 */
async function updateLastLogin(userId) {
  const now = require("../server-utils").getCurrentTimestamp();

  await dynamoClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { userId },
      UpdateExpression: "SET lastLoginAt = :timestamp, updatedAt = :timestamp",
      ExpressionAttributeValues: {
        ":timestamp": now,
      },
    })
  );
}

module.exports = {
  createUser,
  getUserById,
  getUserByUsername,
  getUserByPhoneNumber,
  usernameExists,
  phoneNumberExists,
  updateLastLogin,
};

