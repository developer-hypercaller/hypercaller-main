/**
 * Location validation utilities
 */

import { validateIndiaCoordinates, isWithinIndiaBounds } from "../data/india-bounds";
import { Coordinates } from "../schemas/location-schema";
import { getCityByName, isIndianCity } from "../data/indian-cities";

/**
 * Validate location
 * Validates coordinates, city/state combination, and coordinate format
 * 
 * @param location - Location object with lat, lng, city, and state
 * @returns Validation result with error message if invalid
 */
export function validateLocation(location: {
  lat: number;
  lng: number;
  city: string;
  state: string;
}): {
  valid: boolean;
  error?: string;
} {
  // Step 1: Validate input structure
  if (!location || typeof location !== "object") {
    return { valid: false, error: "Location object is required" };
  }

  const { lat, lng, city, state } = location;

  // Step 2: Validate coordinates format
  if (lat === undefined || lng === undefined) {
    return { valid: false, error: "Coordinates (lat, lng) are required" };
  }

  if (typeof lat !== "number" || typeof lng !== "number") {
    return { valid: false, error: "Coordinates must be numbers" };
  }

  if (isNaN(lat) || isNaN(lng)) {
    return { valid: false, error: "Coordinates must be valid numbers" };
  }

  // Step 3: Validate coordinate ranges
  if (lat < -90 || lat > 90) {
    return { valid: false, error: "Latitude must be between -90 and 90" };
  }

  if (lng < -180 || lng > 180) {
    return { valid: false, error: "Longitude must be between -180 and 180" };
  }

  // Step 4: Validate coordinates are within India bounds
  if (!isWithinIndiaBounds(lat, lng)) {
    return {
      valid: false,
      error: "Coordinates are outside India bounds",
    };
  }

  // Step 5: Validate city
  if (!city || typeof city !== "string" || city.trim().length === 0) {
    return { valid: false, error: "City is required" };
  }

  // Step 6: Validate state
  if (!state || typeof state !== "string" || state.trim().length === 0) {
    return { valid: false, error: "State is required" };
  }

  // Step 7: Validate city/state combination
  const cityData = getCityByName(city);
  if (cityData) {
    // If city exists in database, verify state matches
    if (cityData.state.toLowerCase() !== state.trim().toLowerCase()) {
      return {
        valid: false,
        error: `City "${city}" does not belong to state "${state}". Expected state: "${cityData.state}"`,
      };
    }
  } else {
    // City not in database, but still validate it's a valid city name format
    if (!isIndianCity(city)) {
      // Log for review but don't fail - city might be valid but not in our database
      console.log(`[Location Validator] City "${city}" not found in database, but allowing it`);
    }
  }

  return { valid: true };
}

/**
 * Validate coordinates
 */
export function validateCoordinates(coordinates: Coordinates): {
  valid: boolean;
  error?: string;
} {
  if (!coordinates) {
    return { valid: false, error: "Coordinates are required" };
  }

  const { latitude, longitude } = coordinates;

  return validateIndiaCoordinates(latitude, longitude);
}

/**
 * Validate latitude
 */
export function validateLatitude(latitude: number): {
  valid: boolean;
  error?: string;
} {
  if (isNaN(latitude)) {
    return { valid: false, error: "Latitude must be a number" };
  }

  if (latitude < -90 || latitude > 90) {
    return { valid: false, error: "Latitude must be between -90 and 90" };
  }

  return { valid: true };
}

/**
 * Validate longitude
 */
export function validateLongitude(longitude: number): {
  valid: boolean;
  error?: string;
} {
  if (isNaN(longitude)) {
    return { valid: false, error: "Longitude must be a number" };
  }

  if (longitude < -180 || longitude > 180) {
    return { valid: false, error: "Longitude must be between -180 and 180" };
  }

  return { valid: true };
}

/**
 * Validate city name
 */
export function validateCity(city: string): {
  valid: boolean;
  error?: string;
} {
  if (!city || typeof city !== "string") {
    return { valid: false, error: "City is required" };
  }

  if (city.trim().length === 0) {
    return { valid: false, error: "City cannot be empty" };
  }

  if (city.length > 100) {
    return { valid: false, error: "City name is too long" };
  }

  return { valid: true };
}

/**
 * Validate state name
 */
export function validateState(state: string): {
  valid: boolean;
  error?: string;
} {
  if (!state || typeof state !== "string") {
    return { valid: false, error: "State is required" };
  }

  if (state.trim().length === 0) {
    return { valid: false, error: "State cannot be empty" };
  }

  if (state.length > 100) {
    return { valid: false, error: "State name is too long" };
  }

  return { valid: true };
}

/**
 * Validate pin code
 */
export function validatePinCode(pinCode: string): {
  valid: boolean;
  error?: string;
} {
  if (!pinCode) {
    return { valid: true }; // Pin code is optional
  }

  if (typeof pinCode !== "string") {
    return { valid: false, error: "Pin code must be a string" };
  }

  // Indian pin codes are 6 digits
  if (!/^\d{6}$/.test(pinCode.trim())) {
    return { valid: false, error: "Pin code must be 6 digits" };
  }

  return { valid: true };
}

