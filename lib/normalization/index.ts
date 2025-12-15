/**
 * Central normalization entry point
 * Exports all normalization functions
 */

// Category normalization
export * from "./category-normalizer";

// Location normalization
export * from "./location-normalizer";
export * from "./address-normalizer";

// Name normalization
export * from "./name-normalizer";

// Price range normalization
export * from "./price-range-normalizer";

// Rating normalization
export * from "./rating-normalizer";

// Phone normalization
export * from "./phone-normalizer";

// Hours normalization
export * from "./hours-normalizer";

// Amenity normalization
export * from "./amenity-normalizer";

// Status normalization
export * from "./status-normalizer";

// Import specific functions for routing
import { normalizeCategory } from "./category-normalizer";
import { normalizeLocationName, normalizeCity, normalizeState, normalizeCountry, normalizePinCode } from "./location-normalizer";
import { normalizeBusinessName } from "./name-normalizer";
import { normalizePriceRange } from "./price-range-normalizer";
import { normalizeRating } from "./rating-normalizer";
import { normalizePhoneNumber } from "./phone-normalizer";
import { normalizeAmenityInput } from "./amenity-normalizer";
import { normalizeStatusInput } from "./status-normalizer";
import { parseAddressString } from "./address-normalizer";

/**
 * Supported data types for normalization
 */
export type NormalizableDataType =
  | "category"
  | "location"
  | "city"
  | "state"
  | "country"
  | "pinCode"
  | "name"
  | "businessName"
  | "priceRange"
  | "rating"
  | "phone"
  | "phoneNumber"
  | "amenity"
  | "status"
  | "address";

/**
 * Normalization result
 */
export interface NormalizationResult {
  success: boolean;
  value: any;
  error?: string;
  dataType: NormalizableDataType;
}

/**
 * Normalize data by data type
 * Routes to appropriate normalizer based on data type
 * 
 * @param dataType - Type of data to normalize
 * @param input - Input value to normalize
 * @returns NormalizationResult with success status, normalized value, and error if any
 */
export function normalizeData(dataType: NormalizableDataType, input: any): NormalizationResult {
  try {
    // Validate input
    if (input === null || input === undefined) {
      return {
        success: false,
        value: null,
        error: `Input is null or undefined for data type: ${dataType}`,
        dataType,
      };
    }

    let normalizedValue: any = null;
    let error: string | undefined = undefined;

    // Route to appropriate normalizer
    switch (dataType) {
      case "category":
        normalizedValue = normalizeCategory(typeof input === "string" ? input : String(input));
        if (normalizedValue === null) {
          error = "Failed to normalize category";
        }
        break;

      case "location":
        normalizedValue = normalizeLocationName(typeof input === "string" ? input : String(input));
        break;

      case "city":
        normalizedValue = normalizeCity(typeof input === "string" ? input : String(input));
        break;

      case "state":
        normalizedValue = normalizeState(typeof input === "string" ? input : String(input));
        break;

      case "country":
        normalizedValue = normalizeCountry(typeof input === "string" ? input : String(input));
        break;

      case "pinCode":
        normalizedValue = normalizePinCode(input);
        break;

      case "name":
      case "businessName":
        normalizedValue = normalizeBusinessName(typeof input === "string" ? input : String(input));
        break;

      case "priceRange":
        normalizedValue = normalizePriceRange(typeof input === "string" ? input : String(input));
        if (normalizedValue === null) {
          error = "Failed to normalize price range";
        }
        break;

      case "rating":
        normalizedValue = normalizeRating(input);
        if (normalizedValue === null) {
          error = "Failed to normalize rating";
        }
        break;

      case "phone":
      case "phoneNumber":
        normalizedValue = normalizePhoneNumber(typeof input === "string" ? input : String(input));
        if (normalizedValue === null) {
          error = "Failed to normalize phone number";
        }
        break;

      case "amenity":
        normalizedValue = normalizeAmenityInput(typeof input === "string" ? input : String(input));
        if (normalizedValue === null) {
          error = "Failed to normalize amenity";
        }
        break;

      case "status":
        normalizedValue = normalizeStatusInput(typeof input === "string" ? input : String(input));
        if (normalizedValue === null) {
          error = "Failed to normalize status";
        }
        break;

      case "address":
        if (typeof input === "string") {
          normalizedValue = parseAddressString(input);
        } else if (typeof input === "object" && input !== null) {
          // If it's already an object, return as-is (could enhance this later)
          normalizedValue = input;
        } else {
          error = "Address input must be a string or object";
        }
        break;

      default:
        return {
          success: false,
          value: null,
          error: `Unknown data type: ${dataType}`,
          dataType,
        };
    }

    // Check if normalization was successful
    const success = normalizedValue !== null && normalizedValue !== undefined && !error;

    return {
      success,
      value: normalizedValue,
      error: error || (success ? undefined : "Normalization failed"),
      dataType,
    };
  } catch (err) {
    // Handle errors gracefully
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      value: null,
      error: `Error normalizing ${dataType}: ${errorMessage}`,
      dataType,
    };
  }
}

