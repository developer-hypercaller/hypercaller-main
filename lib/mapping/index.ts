/**
 * Central mapping entry point
 * Exports all mapping functions
 */

// Bedrock mappings
export * from "./bedrock-category-mapper";
export * from "./bedrock-location-mapper";
export * from "./bedrock-entity-mapper";

// Filter mappings
export * from "./filter-mapper";

// Price range mappings
export * from "./price-range-mapper";

// Import specific mappers for routing
import { mapBedrockCategory } from "./bedrock-category-mapper";
import { mapBedrockLocation } from "./bedrock-location-mapper";
import { mapBedrockEntities } from "./bedrock-entity-mapper";
import { mapFilters } from "./filter-mapper";

/**
 * Supported data types for mapping
 */
export type MappableDataType =
  | "bedrockCategory"
  | "bedrockLocation"
  | "bedrockEntities"
  | "filters";

/**
 * Mapping result
 */
export interface MappingResult {
  success: boolean;
  value: any;
  error?: string;
  dataType: MappableDataType;
}

/**
 * Map data by data type
 * Routes to appropriate mapper based on data type
 * Handles errors gracefully
 * 
 * @param dataType - Type of data to map
 * @param input - Input data to map
 * @returns MappingResult with success status, mapped value, and error if any
 */
export function mapData(dataType: MappableDataType, input: any): MappingResult {
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

    let mappedValue: any = null;
    let error: string | undefined = undefined;

    // Route to appropriate mapper
    switch (dataType) {
      case "bedrockCategory":
        if (typeof input === "string") {
          // Default confidence to 1.0 if not provided
          const result = mapBedrockCategory(input, 1.0);
          mappedValue = result;
        } else if (typeof input === "object" && input.bedrockCategory) {
          const confidence = typeof input.confidence === "number" ? input.confidence : 1.0;
          const result = mapBedrockCategory(input.bedrockCategory, confidence);
          mappedValue = result;
        } else {
          error = "Bedrock category input must be a string or object with bedrockCategory property";
        }
        break;

      case "bedrockLocation":
        const locationResult = mapBedrockLocation(input);
        if (locationResult.valid) {
          mappedValue = {
            city: locationResult.city,
            state: locationResult.state,
            country: locationResult.country,
            address: locationResult.address,
          };
        } else {
          error = locationResult.error || "Failed to map Bedrock location";
        }
        break;

      case "bedrockEntities":
        if (!Array.isArray(input)) {
          error = "Bedrock entities input must be an array";
        } else {
          mappedValue = mapBedrockEntities(input);
        }
        break;

      case "filters":
        mappedValue = mapFilters(input);
        break;

      default:
        return {
          success: false,
          value: null,
          error: `Unknown data type: ${dataType}`,
          dataType,
        };
    }

    // Check if mapping was successful
    const success = mappedValue !== null && mappedValue !== undefined && !error;

    return {
      success,
      value: mappedValue,
      error: error || (success ? undefined : "Mapping failed"),
      dataType,
    };
  } catch (err) {
    // Handle errors gracefully
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      value: null,
      error: `Error mapping ${dataType}: ${errorMessage}`,
      dataType,
    };
  }
}

