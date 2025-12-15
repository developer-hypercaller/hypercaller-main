/**
 * India geographic bounds
 * Bounding box for India to validate coordinates
 */

import { LocationBounds } from "../schemas/location-schema";

/**
 * India's approximate geographic bounds
 * Used for coordinate validation
 * Structure: { minLat: number, maxLat: number, minLng: number, maxLng: number }
 * 
 * Approximate bounds:
 * - Latitude: 6.5 to 37.5
 * - Longitude: 68.0 to 97.5
 */
export const indiaBounds: LocationBounds = {
  minLat: 6.5, // Southernmost point (approximately)
  maxLat: 37.5, // Northernmost point (approximately)
  minLng: 68.0, // Westernmost point (approximately)
  maxLng: 97.5, // Easternmost point (approximately)
};

/**
 * Check if coordinates are within India bounds
 */
export function isWithinIndiaBounds(latitude: number, longitude: number): boolean {
  return (
    latitude >= indiaBounds.minLat &&
    latitude <= indiaBounds.maxLat &&
    longitude >= indiaBounds.minLng &&
    longitude <= indiaBounds.maxLng
  );
}

/**
 * Validate coordinates for India
 */
export function validateIndiaCoordinates(latitude: number, longitude: number): {
  valid: boolean;
  error?: string;
} {
  if (isNaN(latitude) || isNaN(longitude)) {
    return { valid: false, error: "Invalid coordinates: must be numbers" };
  }

  if (latitude < -90 || latitude > 90) {
    return { valid: false, error: "Invalid latitude: must be between -90 and 90" };
  }

  if (longitude < -180 || longitude > 180) {
    return { valid: false, error: "Invalid longitude: must be between -180 and 180" };
  }

  if (!isWithinIndiaBounds(latitude, longitude)) {
    return {
      valid: false,
      error: "Coordinates are outside India bounds",
    };
  }

  return { valid: true };
}

