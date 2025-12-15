/**
 * Category validation utilities
 */

import { isValidCategory, getCategoryById } from "../data/categories";
import { trackValidationFailure } from "../utils/monitoring";

/**
 * Validate category
 * Check if category exists in taxonomy
 * 
 * @param categoryId - Category ID to validate
 * @returns Validation result with error message if invalid
 */
export function validateCategory(categoryId: string): {
  valid: boolean;
  error?: string;
} {
  if (!categoryId || typeof categoryId !== "string") {
    trackValidationFailure("category-validator", categoryId, "Category ID is required");
    return { valid: false, error: "Category ID is required" };
  }

  if (!isValidCategory(categoryId)) {
    trackValidationFailure("category-validator", categoryId, `Invalid category ID: ${categoryId}`);
    return { valid: false, error: `Invalid category ID: ${categoryId}` };
  }

  // Additional check: ensure category exists in taxonomy
  const category = getCategoryById(categoryId);
  if (!category) {
    trackValidationFailure("category-validator", categoryId, `Category not found in taxonomy: ${categoryId}`);
    return { valid: false, error: `Category not found in taxonomy: ${categoryId}` };
  }

  return { valid: true };
}

/**
 * Validate category ID (alias for backward compatibility)
 */
export function validateCategoryId(categoryId: string): {
  valid: boolean;
  error?: string;
} {
  return validateCategory(categoryId);
}

/**
 * Validate multiple category IDs
 */
export function validateCategoryIds(categoryIds: string[]): {
  valid: boolean;
  errors: string[];
} {
  if (!Array.isArray(categoryIds)) {
    return { valid: false, errors: ["Category IDs must be an array"] };
  }

  const errors: string[] = [];
  categoryIds.forEach((id) => {
    const result = validateCategoryId(id);
    if (!result.valid && result.error) {
      errors.push(result.error);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

