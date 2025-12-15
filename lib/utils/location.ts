/**
 * Location utility functions
 */

import { Coordinates } from "../schemas/location-schema";
import { normalizeCity, normalizeState, normalizeCountry } from "../normalization/location-normalizer";

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 6371000; // Earth radius in meters
  const lat1 = (coord1.latitude * Math.PI) / 180;
  const lat2 = (coord2.latitude * Math.PI) / 180;
  const deltaLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const deltaLng = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Convert meters to kilometers
 */
export function metersToKilometers(meters: number): number {
  return meters / 1000;
}

/**
 * Convert meters to miles
 */
export function metersToMiles(meters: number): number {
  return meters / 1609.34;
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number, unit: "meters" | "kilometers" | "miles" = "kilometers"): string {
  if (unit === "kilometers") {
    const km = metersToKilometers(meters);
    if (km < 1) {
      return `${Math.round(meters)}m`;
    }
    return `${km.toFixed(1)}km`;
  } else if (unit === "miles") {
    const miles = metersToMiles(meters);
    if (miles < 1) {
      return `${Math.round(meters)}m`;
    }
    return `${miles.toFixed(1)}mi`;
  } else {
    return `${Math.round(meters)}m`;
  }
}

/**
 * Normalize location object
 */
export function normalizeLocation(location: {
  city?: string;
  state?: string;
  country?: string;
}): {
  city: string;
  state: string;
  country: string;
} {
  return {
    city: location.city ? normalizeCity(location.city) : "",
    state: location.state ? normalizeState(location.state) : "",
    country: location.country ? normalizeCountry(location.country) : "India",
  };
}

/**
 * Check if two locations are in the same city
 */
export function isSameCity(
  location1: { city?: string; state?: string },
  location2: { city?: string; state?: string }
): boolean {
  const city1 = location1.city ? normalizeCity(location1.city) : "";
  const city2 = location2.city ? normalizeCity(location2.city) : "";
  const state1 = location1.state ? normalizeState(location1.state) : "";
  const state2 = location2.state ? normalizeState(location2.state) : "";

  return city1 === city2 && state1 === state2;
}

