/**
 * Bedrock location mapping utilities
 * Maps Bedrock location entities to our location format
 */

import { normalizeLocationName, normalizeCity, normalizeState, normalizeCountry } from "../normalization/location-normalizer";
import { validateLocation } from "../validation/location-validator";

/**
 * Mapping result for location
 */
export interface BedrockLocationMappingResult {
  city: string;
  state: string;
  country: string;
  address?: string;
  valid: boolean;
  error?: string;
}

/**
 * Map Bedrock location to our location format
 * Normalizes Bedrock location and validates it
 * 
 * @param bedrockLocation - Location string or object from Bedrock
 * @returns Mapped location with validation result
 */
export function mapBedrockLocation(
  bedrockLocation: string | {
    city?: string;
    state?: string;
    country?: string;
    address?: string;
    lat?: number;
    lng?: number;
  }
): BedrockLocationMappingResult {
  // Step 1: Handle string input (simple location string)
  if (typeof bedrockLocation === "string") {
    const normalized = normalizeLocationName(bedrockLocation);
    return {
      city: normalized,
      state: "",
      country: "India",
      valid: normalized.length > 0,
      error: normalized.length === 0 ? "Invalid location string" : undefined,
    };
  }

  // Step 2: Handle object input
  if (!bedrockLocation || typeof bedrockLocation !== "object") {
    return {
      city: "",
      state: "",
      country: "India",
      valid: false,
      error: "Invalid location object",
    };
  }

  // Step 3: Normalize location components
  const city = bedrockLocation.city ? normalizeCity(bedrockLocation.city) : "";
  const state = bedrockLocation.state ? normalizeState(bedrockLocation.state) : "";
  const country = bedrockLocation.country ? normalizeCountry(bedrockLocation.country) : "India";

  // Step 4: Validate location if coordinates are provided
  if (bedrockLocation.lat !== undefined && bedrockLocation.lng !== undefined) {
    const validationResult = validateLocation({
      lat: bedrockLocation.lat,
      lng: bedrockLocation.lng,
      city,
      state,
    });

    return {
      city,
      state,
      country,
      address: bedrockLocation.address,
      valid: validationResult.valid,
      error: validationResult.error,
    };
  }

  // Step 5: Basic validation (city and state should be provided)
  if (!city || !state) {
    return {
      city,
      state,
      country,
      address: bedrockLocation.address,
      valid: false,
      error: city && !state ? "State is required" : !city && state ? "City is required" : "City and state are required",
    };
  }

  return {
    city,
    state,
    country,
    address: bedrockLocation.address,
    valid: true,
  };
}

/**
 * Map Bedrock location entity to normalized location (backward compatibility)
 */
export function mapBedrockLocationToLocation(bedrockLocation: {
  city?: string;
  state?: string;
  country?: string;
  address?: string;
}): {
  city: string;
  state: string;
  country: string;
  address?: string;
} {
  const result = mapBedrockLocation(bedrockLocation);
  return {
    city: result.city,
    state: result.state,
    country: result.country,
    address: result.address,
  };
}

