const { dynamoClient } = require("../dynamodb");
const { PutCommand, QueryCommand, UpdateCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { normalizePhoneNumber, generateOTP, getCurrentTimestamp } = require("../server-utils");

const TABLE_NAME = "OTPVerifications";
const OTP_EXPIRY_MINUTES = 10;

/**
 * Invalidate all active OTPs for a phone number
 */
async function invalidateActiveOTPs(phoneNumber) {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  // Query all active OTPs
  const result = await dynamoClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "phoneNumber = :phoneNumber",
      FilterExpression: "isActive = :true",
      ExpressionAttributeValues: {
        ":phoneNumber": normalizedPhone,
        ":true": true,
      },
    })
  );

  // Update all found OTPs to inactive
  if (result.Items && result.Items.length > 0) {
    const updatePromises = result.Items.map((item) =>
      dynamoClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            phoneNumber: normalizedPhone,
            createdAt: item.createdAt,
          },
          UpdateExpression: "SET isActive = :false",
          ExpressionAttributeValues: {
            ":false": false,
          },
        })
      )
    );
    await Promise.all(updatePromises);
  }
}

/**
 * Create and store a new OTP
 */
async function createOTP(phoneNumber, purpose = "registration", userId = null) {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  
  // Invalidate old active OTPs
  await invalidateActiveOTPs(normalizedPhone);

  const otpCode = generateOTP();
  const now = getCurrentTimestamp();
  const expiresAt = now + OTP_EXPIRY_MINUTES * 60;

  const otpRecord = {
    phoneNumber: normalizedPhone,
    createdAt: now,
    otpCode,
    userId: userId || null,
    purpose,
    verified: false,
    isActive: true,
    expiresAt,
    ttl: expiresAt, // DynamoDB TTL
  };

  await dynamoClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: otpRecord,
    })
  );

  return otpCode;
}

/**
 * Get latest active OTP for a phone number
 */
async function getLatestActiveOTP(phoneNumber) {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  const result = await dynamoClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "phoneNumber = :phoneNumber",
      FilterExpression: "isActive = :true AND verified = :false",
      ExpressionAttributeValues: {
        ":phoneNumber": normalizedPhone,
        ":true": true,
        ":false": false,
      },
      ScanIndexForward: false, // Sort descending (latest first)
      Limit: 1,
    })
  );

  return result.Items && result.Items.length > 0 ? result.Items[0] : null;
}

/**
 * Verify OTP
 */
async function verifyOTP(phoneNumber, otpCode) {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  const now = getCurrentTimestamp();

  const otpRecord = await getLatestActiveOTP(normalizedPhone);

  if (!otpRecord) {
    return { success: false, error: "No active OTP found" };
  }

  // Check if expired
  if (otpRecord.expiresAt < now) {
    return { success: false, error: "OTP has expired" };
  }

  // Check if OTP code matches
  if (otpRecord.otpCode !== otpCode) {
    return { success: false, error: "Invalid OTP code" };
  }

  // Mark as verified and inactive
  await dynamoClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        phoneNumber: normalizedPhone,
        createdAt: otpRecord.createdAt,
      },
      UpdateExpression: "SET verified = :true, isActive = :false",
      ExpressionAttributeValues: {
        ":true": true,
        ":false": false,
      },
    })
  );

  return { success: true, otpRecord };
}

/**
 * Delete OTP record (optional cleanup after registration)
 */
async function deleteOTP(phoneNumber, createdAt) {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  await dynamoClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        phoneNumber: normalizedPhone,
        createdAt,
      },
    })
  );
}

module.exports = {
  createOTP,
  getLatestActiveOTP,
  verifyOTP,
  deleteOTP,
  invalidateActiveOTPs,
};

