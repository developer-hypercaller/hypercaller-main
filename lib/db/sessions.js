const { dynamoClient } = require("../dynamodb");
const { PutCommand, GetCommand, UpdateCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const TABLE_NAME = "Sessions";
const SESSION_SHORT_HOURS = 24; // 1 day
const SESSION_LONG_DAYS = 30; // 30 days

/**
 * Create a new session
 */
async function createSession(userData, ipAddress, userAgent, rememberMe = false) {
  const { userId, username, role } = userData;
  const sessionId = uuidv4();
  const now = Date.now();
  
  // Calculate expiration based on rememberMe
  const expiresAt = rememberMe
    ? now + SESSION_LONG_DAYS * 24 * 60 * 60 * 1000 // 30 days
    : now + SESSION_SHORT_HOURS * 60 * 60 * 1000; // 1 day

  const session = {
    sessionId,
    userId,
    username,
    role,
    ipAddress,
    userAgent,
    rememberMe,
    createdAt: Math.floor(now / 1000), // Unix timestamp in seconds
    expiresAt: Math.floor(expiresAt / 1000), // Unix timestamp in seconds
    lastActivityAt: Math.floor(now / 1000),
    isActive: true,
    ttl: Math.floor(expiresAt / 1000), // DynamoDB TTL
  };

  await dynamoClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: session,
    })
  );

  return { sessionId, expiresAt: expiresAt / 1000 }; // Return expiresAt in seconds
}

/**
 * Get session by sessionId
 */
async function getSession(sessionId) {
  const result = await dynamoClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { sessionId },
    })
  );

  return result.Item || null;
}

/**
 * Validate session
 */
async function validateSession(sessionId) {
  const session = await getSession(sessionId);
  const now = Math.floor(Date.now() / 1000);

  if (!session) {
    return { valid: false, error: "Session not found" };
  }

  if (!session.isActive) {
    return { valid: false, error: "Session is inactive" };
  }

  if (session.expiresAt < now) {
    return { valid: false, error: "Session has expired" };
  }

  return { valid: true, session };
}

/**
 * Update session last activity
 */
async function updateSessionActivity(sessionId) {
  const now = Math.floor(Date.now() / 1000);

  await dynamoClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { sessionId },
      UpdateExpression: "SET lastActivityAt = :timestamp",
      ExpressionAttributeValues: {
        ":timestamp": now,
      },
    })
  );
}

/**
 * Invalidate session (logout)
 */
async function invalidateSession(sessionId) {
  await dynamoClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { sessionId },
      UpdateExpression: "SET isActive = :false",
      ExpressionAttributeValues: {
        ":false": false,
      },
    })
  );
}

/**
 * Get all active sessions for a user
 */
async function getUserSessions(userId) {
  const result = await dynamoClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "userId-index",
      KeyConditionExpression: "userId = :userId",
      FilterExpression: "isActive = :true",
      ExpressionAttributeValues: {
        ":userId": userId,
        ":true": true,
      },
      ScanIndexForward: false, // Sort by createdAt descending
    })
  );

  return result.Items || [];
}

module.exports = {
  createSession,
  getSession,
  validateSession,
  updateSessionActivity,
  invalidateSession,
  getUserSessions,
};

