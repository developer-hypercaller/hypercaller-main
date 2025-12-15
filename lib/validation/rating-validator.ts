/**
 * Rating validation utilities
 */

import { isValidRating } from "../normalization/rating-normalizer";

/**
 * Validate rating
 * Validates:
 * - Is a number
 * - Between 0.0 and 5.0
 * - Has max 1 decimal place
 * 
 * @param rating - Rating value to validate
 * @returns Validation result with error message if invalid
 */
export function validateRating(rating: number | undefined): {
  valid: boolean;
  error?: string;
} {
  // Step 1: Check if rating is provided (optional field)
  if (rating === undefined || rating === null) {
    return { valid: true }; // Rating is optional
  }

  // Step 2: Validate is a number
  if (typeof rating !== "number") {
    return { valid: false, error: "Rating must be a number" };
  }

  if (isNaN(rating)) {
    return { valid: false, error: "Rating must be a valid number" };
  }

  // Step 3: Validate between 0.0 and 5.0
  if (rating < 0.0 || rating > 5.0) {
    return { valid: false, error: "Rating must be between 0.0 and 5.0" };
  }

  // Step 4: Validate has max 1 decimal place
  const decimalPlaces = (rating.toString().split(".")[1] || "").length;
  if (decimalPlaces > 1) {
    return { valid: false, error: "Rating must have at most 1 decimal place" };
  }

  // Additional validation using normalization utility
  if (!isValidRating(rating)) {
    return { valid: false, error: "Rating must be between 0.0 and 5.0" };
  }

  return { valid: true };
}

/**
 * Validate review count
 */
export function validateReviewCount(reviewCount: number | undefined): {
  valid: boolean;
  error?: string;
} {
  if (reviewCount === undefined || reviewCount === null) {
    return { valid: true }; // Review count is optional
  }

  if (typeof reviewCount !== "number") {
    return { valid: false, error: "Review count must be a number" };
  }

  if (reviewCount < 0) {
    return { valid: false, error: "Review count cannot be negative" };
  }

  if (!Number.isInteger(reviewCount)) {
    return { valid: false, error: "Review count must be an integer" };
  }

  return { valid: true };
}

