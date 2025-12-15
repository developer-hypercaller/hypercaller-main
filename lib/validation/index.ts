/**
 * Central validation entry point
 * Exports all validation functions
 */

// Category validation
export * from "./category-validator";

// Location validation
export * from "./location-validator";
export * from "./address-validator";

// Name validation
export * from "./name-validator";

// Price range validation
export * from "./price-range-validator";

// Rating validation
export * from "./rating-validator";

// Phone validation
export * from "./phone-validator";

// Hours validation
export * from "./hours-validator";

// Business validation
export * from "./business-validator";

// Filter validation
export * from "./filter-validator";

// Import specific validators for routing
import { validateCategory } from "./category-validator";
import { validateLocation } from "./location-validator";
import { validateAddress } from "./address-validator";
import { validateBusinessName } from "./name-validator";
import { validatePriceRange } from "./price-range-validator";
import { validateRating } from "./rating-validator";
import { validatePhoneNumber } from "./phone-validator";
import { validateBusinessHours } from "./hours-validator";
import { validateBusiness } from "./business-validator";
import { validateFilters } from "./filter-validator";

/**
 * Supported data types for validation
 */
export type ValidatableDataType =
  | "category"
  | "location"
  | "address"
  | "businessName"
  | "priceRange"
  | "rating"
  | "phone"
  | "hours"
  | "business"
  | "filters";

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  errors?: string[];
  dataType: ValidatableDataType;
}

/**
 * Validate data by data type
 * Routes to appropriate validator based on data type
 * Supports multiple field validation
 * 
 * @param dataType - Type of data to validate
 * @param data - Data to validate
 * @returns ValidationResult with success status, errors, and data type
 */
export function validateData(dataType: ValidatableDataType, data: any): ValidationResult {
  try {
    let valid = false;
    let error: string | undefined = undefined;
    let errors: string[] | undefined = undefined;

    // Route to appropriate validator
    switch (dataType) {
      case "category":
        const categoryResult = validateCategory(data);
        valid = categoryResult.valid;
        error = categoryResult.error;
        break;

      case "location":
        const locationResult = validateLocation(data);
        valid = locationResult.valid;
        error = locationResult.error;
        break;

      case "address":
        const addressResult = validateAddress(data);
        valid = addressResult.valid;
        errors = addressResult.errors;
        break;

      case "businessName":
        const nameResult = validateBusinessName(data);
        valid = nameResult.valid;
        error = nameResult.error;
        break;

      case "priceRange":
        const priceRangeResult = validatePriceRange(data);
        valid = priceRangeResult.valid;
        error = priceRangeResult.error;
        break;

      case "rating":
        const ratingResult = validateRating(data);
        valid = ratingResult.valid;
        error = ratingResult.error;
        break;

      case "phone":
        const phoneResult = validatePhoneNumber(data);
        valid = phoneResult.valid;
        error = phoneResult.error;
        break;

      case "hours":
        const hoursResult = validateBusinessHours(data);
        valid = hoursResult.valid;
        errors = hoursResult.errors;
        break;

      case "business":
        const businessResult = validateBusiness(data);
        valid = businessResult.valid;
        errors = businessResult.errors;
        break;

      case "filters":
        const filtersResult = validateFilters(data);
        valid = filtersResult.valid;
        errors = filtersResult.errors;
        break;

      default:
        return {
          valid: false,
          error: `Unknown data type: ${dataType}`,
          dataType,
        };
    }

    return {
      valid,
      error: error || (errors && errors.length > 0 ? errors[0] : undefined),
      errors,
      dataType,
    };
  } catch (err) {
    // Handle errors gracefully
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      valid: false,
      error: `Error validating ${dataType}: ${errorMessage}`,
      dataType,
    };
  }
}

