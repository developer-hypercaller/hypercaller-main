/**
 * Business validation utilities
 * Comprehensive validation for business objects
 */

import { Business } from "../schemas/business-schema";
import { validateBusinessName } from "./name-validator";
import { validateCategoryId } from "./category-validator";
import { validateCoordinates } from "./location-validator";
import { validateAddress } from "./address-validator";
import { validatePhoneNumber } from "./phone-validator";
import { validateRating, validateReviewCount } from "./rating-validator";
import { validatePriceRange } from "./price-range-validator";
import { validateBusinessHours } from "./hours-validator";
import { isValidAmenity } from "../data/amenities";
import { isValidStatus } from "../data/status-values";

/**
 * Validate business object
 */
export function validateBusiness(business: Partial<Business>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  if (!business.name) {
    errors.push("Business name is required");
  } else {
    const nameResult = validateBusinessName(business.name);
    if (!nameResult.valid && nameResult.error) {
      errors.push(nameResult.error);
    }
  }

  if (!business.category) {
    errors.push("Category is required");
  } else {
    const categoryResult = validateCategoryId(business.category);
    if (!categoryResult.valid && categoryResult.error) {
      errors.push(categoryResult.error);
    }
  }

  if (!business.location) {
    errors.push("Location is required");
  } else {
    // Validate address structure (BusinessLocation has address fields directly)
    const addressResult = validateAddress({
      street: business.location.address,
      city: business.location.city,
      state: business.location.state,
      country: business.location.country,
      pinCode: business.location.pinCode,
    });
    if (!addressResult.valid) {
      errors.push(...addressResult.errors);
    }

    // Validate coordinates
    const coordsResult = validateCoordinates({
      latitude: business.location.latitude,
      longitude: business.location.longitude,
    });
    if (!coordsResult.valid && coordsResult.error) {
      errors.push(coordsResult.error);
    }
  }

  if (!business.businessHours) {
    errors.push("Business hours are required");
  } else {
    const hoursResult = validateBusinessHours(business.businessHours);
    if (!hoursResult.valid) {
      errors.push(...hoursResult.errors);
    }
  }

  // Optional fields validation
  if (business.contact?.phone) {
    const phoneResult = validatePhoneNumber(business.contact.phone);
    if (!phoneResult.valid && phoneResult.error) {
      errors.push(phoneResult.error);
    }
  }

  if (business.rating !== undefined) {
    const ratingResult = validateRating(business.rating);
    if (!ratingResult.valid && ratingResult.error) {
      errors.push(ratingResult.error);
    }
  }

  if (business.reviewCount !== undefined) {
    const reviewCountResult = validateReviewCount(business.reviewCount);
    if (!reviewCountResult.valid && reviewCountResult.error) {
      errors.push(reviewCountResult.error);
    }
  }

  if (business.priceRange) {
    const priceRangeResult = validatePriceRange(business.priceRange);
    if (!priceRangeResult.valid && priceRangeResult.error) {
      errors.push(priceRangeResult.error);
    }
  }

  if (business.amenities) {
    if (!Array.isArray(business.amenities)) {
      errors.push("Amenities must be an array");
    } else {
      business.amenities.forEach((amenity, index) => {
        if (!isValidAmenity(amenity)) {
          errors.push(`Invalid amenity at index ${index}: ${amenity}`);
        }
      });
    }
  }

  if (business.status && !isValidStatus(business.status)) {
    errors.push(`Invalid status: ${business.status}`);
  }

  if (typeof business.isVerified !== "boolean") {
    errors.push("isVerified must be a boolean");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

