/**
 * Amenity normalization utilities
 */

import { normalizeAmenity } from "../data/amenities";

/**
 * Normalize amenity input to amenity ID
 * Handles multi-word inputs by extracting keywords
 */
export function normalizeAmenityInput(input: string): string | null {
  if (!input || typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  // Try direct match first
  const directMatch = normalizeAmenity(trimmed);
  if (directMatch) {
    return directMatch;
  }

  // Try lowercase match
  const lowerMatch = normalizeAmenity(trimmed.toLowerCase());
  if (lowerMatch) {
    return lowerMatch;
  }

  // For multi-word inputs, try to extract keywords
  // Split by spaces and try each word
  const words = trimmed.toLowerCase().split(/\s+/);
  for (const word of words) {
    // Skip common words
    if (word.length < 3 || ["free", "available", "with", "and", "or"].includes(word)) {
      continue;
    }
    const wordMatch = normalizeAmenity(word);
    if (wordMatch) {
      return wordMatch;
    }
  }

  return null;
}

/**
 * Normalize multiple amenity inputs
 */
export function normalizeAmenities(inputs: string[]): string[] {
  if (!Array.isArray(inputs)) {
    return [];
  }

  const normalized = inputs
    .map((input) => normalizeAmenityInput(input))
    .filter((id): id is string => id !== null);

  // Remove duplicates
  return Array.from(new Set(normalized));
}

