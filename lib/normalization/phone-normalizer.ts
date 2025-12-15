/**
 * Phone number normalization utilities
 * Normalizes to E.164 format
 */

/**
 * Normalize phone number to E.164 format
 * E.164 format: +[country code][number]
 * For India: +91[10 digits] (mobile) or +91[area code][number] (landline)
 * 
 * @param input - Phone number input string
 * @returns Normalized phone number in E.164 format or null if invalid
 */
export function normalizePhoneNumber(input: string): string | null {
  // Step 1: Basic validation
  if (!input || typeof input !== "string") {
    return null;
  }

  // Step 2: Remove spaces, dashes, parentheses, and other formatting characters
  // Keep only digits and + sign
  let normalized = input
    .replace(/\s+/g, "") // Remove spaces
    .replace(/-/g, "") // Remove dashes
    .replace(/\(/g, "") // Remove opening parentheses
    .replace(/\)/g, "") // Remove closing parentheses
    .replace(/\./g, ""); // Remove dots

  if (!normalized) {
    return null;
  }

  // Step 3: Handle different input formats
  // If it already starts with +, keep it
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

  // Step 4: Handle different Indian number formats
  // Check for 11-digit numbers starting with 0 BEFORE removing leading zeros
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

  // Step 5: Add country code if missing (default to +91 for India)
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
      // Note: Starting with 5 is not valid for Indian numbers
      return "+91" + normalized;
    } else {
      return null; // Invalid number format (e.g., starts with 5 or 0)
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
 * Check if phone number is a mobile number (vs landline)
 */
export function isMobileNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    return false;
  }

  if (normalized.startsWith("+91")) {
    const numberPart = normalized.substring(3);
    // Indian mobile numbers are 10 digits starting with 6-9
    return /^[6-9]\d{9}$/.test(numberPart);
  }

  return false;
}

/**
 * Check if phone number is a landline number
 */
export function isLandlineNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    return false;
  }

  if (normalized.startsWith("+91")) {
    const numberPart = normalized.substring(3);
    // Landline numbers are 8-10 digits and don't start with 6-9 in the first digit
    return /^\d{8,10}$/.test(numberPart) && !/^[6-9]\d{9}$/.test(numberPart);
  }

  return false;
}

/**
 * Validate Indian phone number format
 */
export function isValidIndianPhoneNumber(phone: string): boolean {
  return normalizePhoneNumber(phone) !== null;
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  return normalizePhoneNumber(phone) !== null;
}

