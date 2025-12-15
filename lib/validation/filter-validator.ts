/**
 * Filter validation utilities
 */

import { SearchFilters } from "../schemas/filter-schema";
import { validateCategoryIds } from "./category-validator";
import { validatePriceRanges } from "./price-range-validator";
import { validateRating } from "./rating-validator";
import { isValidAmenity } from "../data/amenities";

/**
 * Validate search filters
 */
export function validateFilters(filters: SearchFilters): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate categories
  if (filters.categories) {
    const categoryResult = validateCategoryIds(filters.categories);
    if (!categoryResult.valid) {
      errors.push(...categoryResult.errors);
    }
  }

  // Validate price range
  if (filters.priceRange?.values) {
    const priceRangeResult = validatePriceRanges(filters.priceRange.values);
    if (!priceRangeResult.valid) {
      errors.push(...priceRangeResult.errors);
    }
  }

  // Validate rating
  if (filters.rating) {
    if (filters.rating.min !== undefined) {
      const minRatingResult = validateRating(filters.rating.min);
      if (!minRatingResult.valid && minRatingResult.error) {
        errors.push(`Min rating: ${minRatingResult.error}`);
      }
    }

    if (filters.rating.max !== undefined) {
      const maxRatingResult = validateRating(filters.rating.max);
      if (!maxRatingResult.valid && maxRatingResult.error) {
        errors.push(`Max rating: ${maxRatingResult.error}`);
      }
    }

    if (
      filters.rating.min !== undefined &&
      filters.rating.max !== undefined &&
      filters.rating.min > filters.rating.max
    ) {
      errors.push("Min rating cannot be greater than max rating");
    }
  }

  // Validate distance
  if (filters.distance?.max !== undefined) {
    if (typeof filters.distance.max !== "number" || filters.distance.max < 0) {
      errors.push("Distance max must be a positive number");
    }
  }

  // Validate amenities
  if (filters.amenities) {
    if (!Array.isArray(filters.amenities)) {
      errors.push("Amenities must be an array");
    } else {
      filters.amenities.forEach((amenity, index) => {
        if (!isValidAmenity(amenity)) {
          errors.push(`Invalid amenity at index ${index}: ${amenity}`);
        }
      });
    }
  }

  // Validate isVerified
  if (filters.isVerified !== undefined && typeof filters.isVerified !== "boolean") {
    errors.push("isVerified must be a boolean");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

