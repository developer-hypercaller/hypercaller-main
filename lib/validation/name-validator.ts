/**
 * Name validation utilities
 */

import { trackValidationFailure } from "../utils/monitoring";

/**
 * Validate business name
 * Validates:
 * - Not empty
 * - Not too long (max 200 chars)
 * - Contains valid characters
 * 
 * @param name - Business name to validate
 * @returns Validation result with error message if invalid
 */
export function validateBusinessName(name: string): {
  valid: boolean;
  error?: string;
} {
  // Step 1: Check if name is provided
  if (!name || typeof name !== "string") {
    trackValidationFailure("name-validator", name, "Business name is required");
    return { valid: false, error: "Business name is required" };
  }

  const trimmed = name.trim();

  // Step 2: Validate not empty
  if (trimmed.length === 0) {
    trackValidationFailure("name-validator", name, "Business name cannot be empty");
    return { valid: false, error: "Business name cannot be empty" };
  }

  // Step 3: Validate not too long (max 200 chars)
  if (trimmed.length > 200) {
    trackValidationFailure("name-validator", name, "Business name is too long (max 200 characters)");
    return { valid: false, error: "Business name is too long (max 200 characters)" };
  }

  // Step 4: Validate contains valid characters
  // Allow: letters (including Unicode), numbers, spaces, hyphens, apostrophes, periods, commas
  // Disallow: control characters, special symbols that could cause issues
  const validCharPattern = /^[\p{L}\p{N}\s\-'.,&()]+$/u;
  if (!validCharPattern.test(trimmed)) {
    trackValidationFailure("name-validator", name, "Business name contains invalid characters");
    return {
      valid: false,
      error: "Business name contains invalid characters. Only letters, numbers, spaces, hyphens, apostrophes, periods, commas, ampersands, and parentheses are allowed",
    };
  }

  // Additional check: should not be only whitespace or special characters
  const hasValidContent = /[\p{L}\p{N}]/u.test(trimmed);
  if (!hasValidContent) {
    trackValidationFailure("name-validator", name, "Business name must contain at least one letter or number");
    return { valid: false, error: "Business name must contain at least one letter or number" };
  }

  return { valid: true };
}

