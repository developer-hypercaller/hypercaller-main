/**
 * Location normalization utilities
 */

import { getCanonicalFromAlias } from "../data/location-aliases";
import { getCityByName } from "../data/indian-cities";
import { trackUnmappedValue } from "../utils/monitoring";

/**
 * Normalize location name
 * Handles case-insensitive matching, alias mapping, abbreviation expansion, and city database lookup
 * 
 * @param input - Location input string
 * @returns Official name or original if not found
 */
export function normalizeLocationName(input: string): string {
  // Step 1: Basic validation
  if (!input || typeof input !== "string") {
    return "";
  }

  // Step 2: Trim whitespace
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }

  // Step 3: Check alias mappings (case-insensitive)
  const canonicalFromAlias = getCanonicalFromAlias(trimmed);
  // If alias was found and it's different from input, return canonical
  if (canonicalFromAlias && canonicalFromAlias.toLowerCase() !== trimmed.toLowerCase()) {
    return canonicalFromAlias;
  }

  // Step 4: Check city database (case-insensitive)
  const cityData = getCityByName(trimmed);
  if (cityData) {
    return cityData.city; // Return official city name
  }

  // Step 5: If alias lookup returned something (even if same), use it
  // This handles cases where the input is already canonical
  if (canonicalFromAlias) {
    return canonicalFromAlias;
  }

  // Step 6: Track unmapped locations for monitoring
  if (trimmed.length >= 2) {
    trackUnmappedValue("location-normalizer", input, {
      normalized: trimmed,
      message: "No alias or city match found",
    });
  }

  // Step 7: Return original (trimmed) if not found
  return trimmed;
}

/**
 * Normalize city name
 */
export function normalizeCity(city: string): string {
  if (!city || typeof city !== "string") {
    return "";
  }
  return normalizeLocationName(city);
}

/**
 * Normalize state name
 */
export function normalizeState(state: string): string {
  if (!state || typeof state !== "string") {
    return "";
  }
  // Use alias mapping for states as well
  return normalizeLocationName(state);
}

/**
 * Normalize country name
 */
export function normalizeCountry(country: string): string {
  if (!country || typeof country !== "string") {
    return "India"; // Default
  }

  const normalized = country.trim();
  const lower = normalized.toLowerCase();

  // Common variations
  if (lower === "in" || lower === "ind" || lower === "india") {
    return "India";
  }

  return normalized;
}

/**
 * Normalize pin code
 */
export function normalizePinCode(pinCode: string | number | undefined): string | undefined {
  if (!pinCode) {
    return undefined;
  }

  const str = typeof pinCode === "number" ? pinCode.toString() : pinCode;
  const normalized = str.trim().replace(/\s+/g, "");

  // Indian pin codes are 6 digits
  if (/^\d{6}$/.test(normalized)) {
    return normalized;
  }

  return undefined;
}

/**
 * Normalize address string
 */
export function normalizeAddress(address: string): string {
  if (!address || typeof address !== "string") {
    return "";
  }

  // Remove extra whitespace, normalize line breaks
  return address
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\r+/g, "");
}

