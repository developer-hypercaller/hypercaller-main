const { dynamoClient } = require("../dynamodb");
const { GetCommand, PutCommand, UpdateCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { normalizeUsername, normalizePhoneNumber } = require("../server-utils");
const { logDebug } = require("../debug-logger");

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
  // #region agent log
  const { logDebug } = require("../debug-logger");
  logDebug('lib/db/users.js:54', 'getUserById entry', {userId}, 'A');
  // #endregion
  try {
    // #region agent log
    logDebug('lib/db/users.js:57', 'Before DynamoDB GetCommand', {tableName:TABLE_NAME,userId}, 'A');
    // #endregion
    const result = await dynamoClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { userId },
      })
    );

    // #region agent log
    logDebug('lib/db/users.js:64', 'After DynamoDB GetCommand', {hasItem:!!result.Item,userId}, 'A');
    // #endregion

    return result.Item || null;
  } catch (error) {
    // #region agent log
    const errorInfo = error instanceof Error ? {
      errorMessage: error.message,
      errorName: error.name,
      errorCode: error.code
    } : { errorMessage: String(error) };
    logDebug('lib/db/users.js:69', 'getUserById error', errorInfo, 'A');
    // #endregion
    throw error;
  }
}

/**
 * Get user by username
 */
async function getUserByUsername(username) {
  // #region agent log
  logDebug('lib/db/users.js:67', 'getUserByUsername entry', {username,normalizedUsername:normalizeUsername(username)}, 'A');
  // #endregion
  const normalizedUsername = normalizeUsername(username);

  // #region agent log
  logDebug('lib/db/users.js:70', 'Before DynamoDB query', {tableName:TABLE_NAME,indexName:'username-index'}, 'A');
  // #endregion

  try {
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

    // #region agent log
    logDebug('lib/db/users.js:84', 'After DynamoDB query', {itemCount:result.Items?.length||0,hasItems:!!result.Items}, 'A');
    // #endregion

    return result.Items && result.Items.length > 0 ? result.Items[0] : null;
  } catch (error) {
    // #region agent log
    logDebug('lib/db/users.js:89', 'DynamoDB query error', {errorMessage:error.message,errorName:error.name,errorCode:error.code}, 'A');
    // #endregion
    throw error;
  }
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

/**
 * Update user profile (including location)
 * Automatically updates locationLastUpdated when location fields change
 */
async function updateUserProfile(userId, updateData) {
  const now = require("../server-utils").getCurrentTimestamp();
  
  // Build SET and REMOVE expressions separately (DynamoDB requirement)
  const setExpressions = ["updatedAt = :timestamp"];
  const removeExpressions = [];
  const expressionAttributeValues = { ":timestamp": now };
  const expressionAttributeNames = {};

  // Track if location is being updated or cleared
  let locationUpdated = false;
  let locationCleared = false;

  // Handle address updates
  if (updateData.address !== undefined) {
    if (updateData.address === null) {
      removeExpressions.push("#address");
      expressionAttributeNames["#address"] = "address";
      locationCleared = true;
    } else {
      setExpressions.push("#address = :address");
      expressionAttributeNames["#address"] = "address";
      expressionAttributeValues[":address"] = updateData.address;
      locationUpdated = true;
    }
  }

  // Handle latitude updates
  if (updateData.latitude !== undefined) {
    if (updateData.latitude === null) {
      removeExpressions.push("latitude");
      locationCleared = true;
    } else {
      setExpressions.push("latitude = :latitude");
      expressionAttributeValues[":latitude"] = updateData.latitude;
      locationUpdated = true;
    }
  }

  // Handle longitude updates
  if (updateData.longitude !== undefined) {
    if (updateData.longitude === null) {
      removeExpressions.push("longitude");
      locationCleared = true;
    } else {
      setExpressions.push("longitude = :longitude");
      expressionAttributeValues[":longitude"] = updateData.longitude;
      locationUpdated = true;
    }
  }

  // Set locationLastUpdated based on location changes
  if (locationCleared) {
    // Location was cleared - set timestamp to null
    setExpressions.push("locationLastUpdated = :null");
    expressionAttributeValues[":null"] = null;
  } else if (locationUpdated) {
    // Location was updated - set timestamp to current time
    setExpressions.push("locationLastUpdated = :timestamp");
  }

  // Handle other profile fields
  if (updateData.firstName !== undefined) {
    setExpressions.push("firstName = :firstName");
    expressionAttributeValues[":firstName"] = updateData.firstName;
  }

  if (updateData.lastName !== undefined) {
    setExpressions.push("lastName = :lastName");
    expressionAttributeValues[":lastName"] = updateData.lastName;
  }

  if (updateData.avatar !== undefined) {
    setExpressions.push("avatar = :avatar");
    expressionAttributeValues[":avatar"] = updateData.avatar;
  }

  // Build UpdateExpression with SET and REMOVE clauses
  const updateExpressionParts = [];
  if (setExpressions.length > 0) {
    updateExpressionParts.push(`SET ${setExpressions.join(", ")}`);
  }
  if (removeExpressions.length > 0) {
    updateExpressionParts.push(`REMOVE ${removeExpressions.join(", ")}`);
  }

  // If no updates, return early
  if (updateExpressionParts.length === 0) {
    return await getUserById(userId);
  }

  const updateParams = {
    TableName: TABLE_NAME,
    Key: { userId },
    UpdateExpression: updateExpressionParts.join(" "),
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "ALL_NEW",
  };

  if (Object.keys(expressionAttributeNames).length > 0) {
    updateParams.ExpressionAttributeNames = expressionAttributeNames;
  }

  const result = await dynamoClient.send(new UpdateCommand(updateParams));
  return result.Attributes;
}

module.exports = {
  createUser,
  getUserById,
  getUserByUsername,
  getUserByPhoneNumber,
  usernameExists,
  phoneNumberExists,
  updateLastLogin,
  updateUserProfile,
};

