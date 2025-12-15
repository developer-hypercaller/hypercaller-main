/**
 * Category normalization utilities
 * Handles case-insensitive matching, synonym matching, and Bedrock category mapping
 * Note: Fuzzy matching is disabled - returns null if no exact/synonym/Indian term/Bedrock match is found
 */

import {
  mapBedrockCategory,
  getCategoryById,
  isValidCategory,
  getCategorySynonyms,
  categoryTaxonomy,
} from "../data/categories";
import { trackUnmappedValue, trackNormalizationFailure } from "../utils/monitoring";

/**
 * Normalize category input to standardized category ID
 * Handles:
 * - Case-insensitive matching
 * - Synonym matching
 * - Bedrock category mapping
 * 
 * Note: Fuzzy matching is disabled - returns null if no match found
 * 
 * @param input - Category input string
 * @returns Standardized category ID or null if no match found
 */
export function normalizeCategory(input: string): string | null {
  // Step 1: Basic validation
  if (!input || typeof input !== "string") {
    return null;
  }

  // Step 2: Convert to lowercase and trim whitespace
  const normalized = input.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  // Step 3: Check exact match first (case-insensitive)
  if (isValidCategory(normalized)) {
    const category = getCategoryById(normalized);
    // Return parent category if it's a subcategory
    if (category?.parentId) {
      return category.parentId;
    }
    return normalized;
  }

  // Step 4: Check synonyms
  const synonymMatch = categoryTaxonomy.synonymMap.get(normalized);
  if (synonymMatch) {
    const category = getCategoryById(synonymMatch);
    if (category?.parentId) {
      return category.parentId;
    }
    return synonymMatch;
  }

  // Step 5: Check Indian terms
  const indianTermMatch = categoryTaxonomy.indianTermMap.get(normalized);
  if (indianTermMatch) {
    const category = getCategoryById(indianTermMatch);
    if (category?.parentId) {
      return category.parentId;
    }
    return indianTermMatch;
  }

  // Step 6: Check Bedrock category mappings
  const bedrockMatch = mapBedrockCategory(normalized);
  if (bedrockMatch) {
    return bedrockMatch;
  }

  // Step 7: No match found - track for monitoring
  // Note: Fuzzy matching is disabled - returns null instead of fuzzy match results
  trackUnmappedValue("category-normalizer", input, {
    normalized,
    message: "No match found in category taxonomy",
  });
  return null;
}

/**
 * Normalize category input (alias for backward compatibility)
 */
export function normalizeCategoryInput(input: string): string | null {
  return normalizeCategory(input);
}

/**
 * Normalize multiple category inputs
 */
export function normalizeCategories(inputs: string[]): string[] {
  if (!Array.isArray(inputs)) {
    return [];
  }

  const normalized = inputs
    .map((input) => normalizeCategory(input))
    .filter((id): id is string => id !== null);

  // Remove duplicates
  return Array.from(new Set(normalized));
}

/**
 * Check if category input can be normalized
 */
export function canNormalizeCategory(input: string): boolean {
  return normalizeCategory(input) !== null;
}

