/**
 * Phone number validation utilities
 */

import { trackValidationFailure } from "../utils/monitoring";

import { normalizePhoneNumber, isValidPhoneNumber } from "../normalization/phone-normalizer";

/**
 * Validate phone number
 * Validates:
 * - E.164 format
 * - Indian phone number format
 * - Correct length
 * 
 * @param phone - Phone number to validate
 * @returns Validation result with error message if invalid
 */
export function validatePhoneNumber(phone: string | undefined): {
  valid: boolean;
  error?: string;
} {
  // Step 1: Check if phone is provided
  if (phone === undefined || phone === null) {
    return { valid: true }; // Phone is optional (undefined/null allowed)
  }

  // Step 2: Validate is a string
  if (typeof phone !== "string") {
    trackValidationFailure("phone-validator", phone, "Phone number must be a string");
    return { valid: false, error: "Phone number must be a string" };
  }

  const trimmed = phone.trim();
  if (trimmed.length === 0) {
    trackValidationFailure("phone-validator", phone, "Phone number cannot be empty");
    return { valid: false, error: "Phone number cannot be empty" };
  }

  // Step 3: Validate E.164 format first (or valid Indian format that can be normalized)
  // E.164 format: +[country code][number]
  // For Indian numbers, we also accept formats that can be normalized to E.164:
  // - 10 digits (mobile)
  // - 11 digits starting with 0
  // - Already in E.164 format
  
  // Check if already in E.164 format
  const isE164Format = trimmed.startsWith("+") && /^\+[1-9]\d{1,14}$/.test(trimmed);
  
  // Check if it's a valid Indian format that can be normalized
  const isIndianFormat = /^(\+91|91|0)?[6-9]\d{9}$/.test(trimmed.replace(/\s+/g, "")) ||
                         /^(\+91|91|0)?\d{8,10}$/.test(trimmed.replace(/[\s\-()]/g, ""));
  
  if (!isE164Format && !isIndianFormat) {
    trackValidationFailure("phone-validator", phone, "Phone number must be in E.164 format or valid Indian format");
    return { valid: false, error: "Phone number must be in E.164 format (+[country code][number]) or valid Indian format" };
  }

  // Step 4: Try to normalize the phone number
  const normalized = normalizePhoneNumber(trimmed);
  if (!normalized) {
    trackValidationFailure("phone-validator", phone, "Invalid phone number format - normalization failed");
    return { valid: false, error: "Invalid phone number format" };
  }

  // Step 5: Validate normalized result is in E.164 format
  const e164Pattern = /^\+[1-9]\d{1,14}$/;
  if (!e164Pattern.test(normalized)) {
    trackValidationFailure("phone-validator", phone, "Phone number must be in E.164 format");
    return { valid: false, error: "Phone number must be in E.164 format (+[country code][number])" };
  }

  // Step 5: Validate Indian phone number format
  // Indian numbers should start with +91
  if (!normalized.startsWith("+91")) {
    trackValidationFailure("phone-validator", phone, "Phone number must be an Indian number (starting with +91)");
    return { valid: false, error: "Phone number must be an Indian number (starting with +91)" };
  }

  // Step 6: Validate correct length
  // Indian mobile: +91 + 10 digits = 13 characters total
  // Indian landline: +91 + 8-10 digits = 11-13 characters total
  const numberPart = normalized.substring(3); // Remove +91
  const numberLength = numberPart.length;

  if (numberLength < 8 || numberLength > 10) {
    trackValidationFailure("phone-validator", phone, `Invalid phone number length: ${numberLength} digits`);
    return {
      valid: false,
      error: `Invalid phone number length. Indian numbers must be 8-10 digits after country code (+91). Got ${numberLength} digits`,
    };
  }

  // Step 7: Additional validation using normalization utility
  if (!isValidPhoneNumber(trimmed)) {
    trackValidationFailure("phone-validator", phone, "Invalid phone number format - failed additional validation");
    return { valid: false, error: "Invalid phone number format" };
  }

  return { valid: true };
}

