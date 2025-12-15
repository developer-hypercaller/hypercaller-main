/**
 * Rating normalization utilities
 */

/**
 * Normalize rating to 0.0-5.0 scale with 1 decimal precision
 * Handles:
 * - 10-point scale conversion (divide by 2)
 * - Percentage conversion (divide by 20)
 * - 5-point scale (already normalized)
 * - Rounding to 1 decimal place
 * - Validation range (0.0 to 5.0)
 * 
 * @param input - Rating input (number or string, can be 0-5, 0-10, or 0-100)
 * @returns Normalized rating (0.0-5.0) or null if invalid
 */
export function normalizeRating(input: number | string | undefined | null): number | null {
  // Step 1: Basic validation
  if (input === undefined || input === null) {
    return null;
  }

  // Step 2: Convert to number
  const num = typeof input === "string" ? parseFloat(input) : input;

  if (isNaN(num)) {
    return null;
  }

  // Step 3: Detect scale and convert to 5-point scale
  let normalizedValue: number;

  // Check if it's a 10-point scale first (0-10 range, excluding exact 5 which could be 5-point)
  // If value is > 5 and <= 10, assume 10-point scale
  if (num > 5 && num <= 10) {
    // Assume 10-point scale if value is between 5 and 10
    normalizedValue = num / 2; // Convert 10-point to 5-point scale (10 / 2 = 5)
  }
  // Check if it's a percentage (0-100 range, but > 10)
  else if (num > 10 && num <= 100) {
    // Assume percentage if value is between 10 and 100
    normalizedValue = num / 20; // Convert percentage to 5-point scale (100 / 20 = 5)
  }
  // Assume it's already a 5-point scale (0-5 range, including exact 5)
  else if (num >= 0 && num <= 5) {
    normalizedValue = num;
  }
  // Invalid range (negative or > 100)
  else {
    return null;
  }

  // Step 4: Validate range (0.0 to 5.0)
  if (normalizedValue < 0.0 || normalizedValue > 5.0) {
    return null;
  }

  // Step 5: Round to 1 decimal place
  const rounded = Math.round(normalizedValue * 10) / 10;

  return rounded;
}

/**
 * Validate rating value
 */
export function isValidRating(rating: number): boolean {
  return !isNaN(rating) && rating >= 0.0 && rating <= 5.0;
}

