const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

/**
 * Normalize phone number to E.164 format
 * Uses improved validation for Indian numbers
 */
function normalizePhoneNumber(phone) {
  if (!phone || typeof phone !== "string") {
    return null;
  }

  // Remove spaces, dashes, parentheses, and other formatting characters
  // Keep only digits and + sign
  let normalized = phone
    .replace(/\s+/g, "") // Remove spaces
    .replace(/-/g, "") // Remove dashes
    .replace(/\(/g, "") // Remove opening parentheses
    .replace(/\)/g, "") // Remove closing parentheses
    .replace(/\./g, ""); // Remove dots

  if (!normalized) {
    return null;
  }

  // If it already starts with +, validate E.164 format
  if (normalized.startsWith("+")) {
    // Validate E.164 format
    if (/^\+[1-9]\d{1,14}$/.test(normalized)) {
      // Check if it's an Indian number (+91)
      if (normalized.startsWith("+91")) {
        const numberPart = normalized.substring(3); // Remove +91
        // Indian mobile: 10 digits starting with 6-9
        // Indian landline: 8-10 digits (with area code)
        if (/^[6-9]\d{9}$/.test(numberPart)) {
          // Valid mobile number
          return normalized;
        } else if (/^\d{8,10}$/.test(numberPart)) {
          // Valid landline number (8-10 digits with area code)
          return normalized;
        } else {
          return null; // Invalid Indian number format
        }
      } else {
        // Non-Indian number - validate general E.164 format
        return normalized;
      }
    } else {
      return null; // Invalid E.164 format
    }
  }

  // Handle different Indian number formats
  // Check for 11-digit numbers starting with 0
  if (normalized.length === 11 && normalized.startsWith("0")) {
    // 11-digit number starting with 0 (e.g., 09123456789 for mobile, 02212345678 for landline)
    const numberWithoutZero = normalized.substring(1);
    // Check if it's a mobile number (10 digits starting with 6-9)
    if (/^[6-9]\d{9}$/.test(numberWithoutZero)) {
      return "+91" + numberWithoutZero;
    } else if (/^\d{8,10}$/.test(numberWithoutZero)) {
      // Could be a landline (8-10 digits with area code)
      return "+91" + numberWithoutZero;
    } else {
      return null;
    }
  }

  // Remove leading zeros (but only if not already handled above)
  normalized = normalized.replace(/^0+/, "");

  // Handle different Indian number formats
  if (normalized.length === 10) {
    // 10-digit number - check if mobile (starts with 6-9) or landline
    if (/^[6-9]\d{9}$/.test(normalized)) {
      // Valid Indian mobile number (starts with 6-9)
      return "+91" + normalized;
    } else if (/^[1-4]\d{9}$/.test(normalized)) {
      // Valid 10-digit landline number (starts with 1-4, area code + number)
      return "+91" + normalized;
    } else {
      return null; // Invalid number format
    }
  } else if (normalized.length === 12 && normalized.startsWith("91")) {
    // 12-digit number starting with 91 (e.g., 919123456789)
    const numberPart = normalized.substring(2);
    if (/^[6-9]\d{9}$/.test(numberPart)) {
      return "+91" + numberPart;
    } else if (/^\d{8,10}$/.test(numberPart)) {
      // Landline
      return "+91" + numberPart;
    } else {
      return null;
    }
  } else if (normalized.length >= 8 && normalized.length <= 10) {
    // 8-10 digit number - could be landline
    if (/^\d{8,10}$/.test(normalized)) {
      return "+91" + normalized;
    } else {
      return null;
    }
  } else {
    // Invalid length
    return null;
  }
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

