/**
 * Price range validation utilities
 */

import { isValidPriceRange, PriceRange } from "../data/price-ranges";

/**
 * Validate price range
 * Check if value is in enum: ['$', '$$', '$$$', '$$$$']
 * 
 * @param priceRange - Price range value to validate
 * @returns Validation result with error message if invalid
 */
export function validatePriceRange(priceRange: string): {
  valid: boolean;
  error?: string;
} {
  if (!priceRange || typeof priceRange !== "string") {
    return {
      valid: false,
      error: "Price range is required and must be one of: $, $$, $$$, $$$$",
    };
  }

  const trimmed = priceRange.trim();
  if (trimmed.length === 0) {
    return {
      valid: false,
      error: "Price range cannot be empty. Must be one of: $, $$, $$$, $$$$",
    };
  }

  if (!isValidPriceRange(trimmed)) {
    return {
      valid: false,
      error: `Invalid price range: ${trimmed}. Must be one of: $, $$, $$$, $$$$`,
    };
  }

  return { valid: true };
}

/**
 * Validate multiple price ranges
 */
export function validatePriceRanges(priceRanges: string[]): {
  valid: boolean;
  errors: string[];
} {
  if (!Array.isArray(priceRanges)) {
    return { valid: false, errors: ["Price ranges must be an array"] };
  }

  const errors: string[] = [];
  priceRanges.forEach((pr) => {
    const result = validatePriceRange(pr);
    if (!result.valid && result.error) {
      errors.push(result.error);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

