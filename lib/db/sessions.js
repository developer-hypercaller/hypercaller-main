const { dynamoClient } = require("../dynamodb");
const { PutCommand, GetCommand, UpdateCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { logDebug } = require("../debug-logger");

const TABLE_NAME = "Sessions";
const SESSION_SHORT_HOURS = 24; // 1 day
const SESSION_LONG_DAYS = 30; // 30 days

/**
 * Create a new session
 */
async function createSession(userData, ipAddress, userAgent, rememberMe = false) {
  // #region agent log
  logDebug('lib/db/sessions.js:13', 'createSession entry', {userId:userData?.userId,hasIpAddress:!!ipAddress,rememberMe}, 'A');
  // #endregion
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

  // #region agent log
  logDebug('lib/db/sessions.js:35', 'Before DynamoDB PutCommand', {sessionId,tableName:TABLE_NAME}, 'A');
  // #endregion
  try {
    await dynamoClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: session,
      })
    );
    // #region agent log
    logDebug('lib/db/sessions.js:42', 'After DynamoDB PutCommand success', {sessionId}, 'A');
    // #endregion
  } catch (error) {
    // #region agent log
    const errorInfo = error instanceof Error ? {
      errorMessage: error.message,
      errorName: error.name,
      errorCode: error.code
    } : { errorMessage: String(error) };
    logDebug('lib/db/sessions.js:45', 'createSession DynamoDB error', errorInfo, 'A');
    // #endregion
    throw error;
  }

  return { sessionId, expiresAt: expiresAt / 1000 }; // Return expiresAt in seconds
}

/**
 * Get session by sessionId
 */
async function getSession(sessionId) {
  // #region agent log
  logDebug('lib/db/sessions.js:51', 'getSession entry', {sessionId}, 'A');
  // #endregion
  try {
    // #region agent log
    logDebug('lib/db/sessions.js:54', 'Before DynamoDB GetCommand', {sessionId,tableName:TABLE_NAME}, 'A');
    // #endregion
    const result = await dynamoClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { sessionId },
      })
    );
    // #region agent log
    logDebug('lib/db/sessions.js:60', 'After DynamoDB GetCommand', {hasItem:!!result.Item,sessionId}, 'A');
    // #endregion
    return result.Item || null;
  } catch (error) {
    // #region agent log
    const errorInfo = error instanceof Error ? {
      errorMessage: error.message,
      errorName: error.name,
      errorCode: error.code
    } : { errorMessage: String(error) };
    logDebug('lib/db/sessions.js:66', 'getSession DynamoDB error', errorInfo, 'A');
    // #endregion
    throw error;
  }
}

/**
 * Validate session
 */
async function validateSession(sessionId) {
  // #region agent log
  logDebug('lib/db/sessions.js:64', 'validateSession entry', {sessionId}, 'C');
  // #endregion
  try {
    const session = await getSession(sessionId);
    const now = Math.floor(Date.now() / 1000);

    // #region agent log
    logDebug('lib/db/sessions.js:68', 'After getSession', {hasSession:!!session,isActive:session?.isActive,expiresAt:session?.expiresAt,now}, 'C');
    // #endregion

    if (!session) {
      // #region agent log
      logDebug('lib/db/sessions.js:71', 'Session not found branch', {}, 'C');
      // #endregion
      return { valid: false, error: "Session not found" };
    }

    if (!session.isActive) {
      // #region agent log
      logDebug('lib/db/sessions.js:75', 'Session inactive branch', {}, 'C');
      // #endregion
      return { valid: false, error: "Session is inactive" };
    }

    if (session.expiresAt < now) {
      // #region agent log
      logDebug('lib/db/sessions.js:79', 'Session expired branch', {expiresAt:session.expiresAt,now}, 'C');
      // #endregion
      return { valid: false, error: "Session has expired" };
    }

    // #region agent log
    logDebug('lib/db/sessions.js:83', 'Session valid', {}, 'C');
    // #endregion
    return { valid: true, session };
  } catch (error) {
    // #region agent log
    const errorInfo = error instanceof Error ? {
      errorMessage: error.message,
      errorName: error.name
    } : { errorMessage: String(error) };
    logDebug('lib/db/sessions.js:86', 'validateSession error', errorInfo, 'C');
    // #endregion
    throw error;
  }
}

/**
 * Update session last activity
 */
async function updateSessionActivity(sessionId) {
  // #region agent log
  logDebug('lib/db/sessions.js:117', 'updateSessionActivity entry', {sessionId}, 'B');
  // #endregion
  const now = Math.floor(Date.now() / 1000);

  try {
    // #region agent log
    logDebug('lib/db/sessions.js:121', 'Before DynamoDB UpdateCommand', {sessionId,tableName:TABLE_NAME}, 'B');
    // #endregion
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
    // #region agent log
    logDebug('lib/db/sessions.js:130', 'After DynamoDB UpdateCommand success', {sessionId}, 'B');
    // #endregion
  } catch (error) {
    // #region agent log
    const errorInfo = error instanceof Error ? {
      errorMessage: error.message,
      errorName: error.name,
      errorCode: error.code
    } : { errorMessage: String(error) };
    logDebug('lib/db/sessions.js:133', 'updateSessionActivity DynamoDB error', errorInfo, 'B');
    // #endregion
    throw error;
  }
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

