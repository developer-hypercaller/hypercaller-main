const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

/**
 * Normalize phone number to E.164 format
 */
function normalizePhoneNumber(phone) {
  if (!phone) return null;
  // Remove all non-digit characters except +
  let normalized = phone.replace(/[^\d+]/g, "");
  // If doesn't start with +, assume it needs country code
  if (!normalized.startsWith("+")) {
    // You might want to add logic to detect country code
    // For now, assuming US numbers without +1
    if (normalized.length === 10) {
      normalized = "+1" + normalized;
    }
  }
  return normalized;
}

/**
 * Normalize username to lowercase
 */
function normalizeUsername(username) {
  if (!username) return null;
  return username.toLowerCase().trim();
}

/**
 * Hash password using bcrypt
 */
async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 */
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate 6-digit OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate UUID
 */
function generateUserId() {
  return uuidv4();
}

/**
 * Get current Unix timestamp
 */
function getCurrentTimestamp() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Get current Unix timestamp in milliseconds
 */
function getCurrentTimestampMs() {
  return Date.now();
}

module.exports = {
  normalizePhoneNumber,
  normalizeUsername,
  hashPassword,
  verifyPassword,
  generateOTP,
  generateUserId,
  getCurrentTimestamp,
  getCurrentTimestampMs,
};

