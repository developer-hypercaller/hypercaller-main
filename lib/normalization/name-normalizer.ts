/**
 * Name normalization utilities
 */

/**
 * Normalize business name for search
 * Handles:
 * - Convert to lowercase
 * - Remove special characters (®, ™, ©, etc.)
 * - Remove extra spaces
 * - Remove punctuation (keep essential characters)
 * - Handle multilingual names
 * - Preserve essential characters
 * 
 * @param input - Business name input string
 * @returns Normalized name for search
 */
export function normalizeBusinessName(input: string): string {
  // Step 1: Basic validation
  if (!input || typeof input !== "string") {
    return "";
  }

  // Step 2: Trim whitespace
  let normalized = input.trim();
  if (!normalized) {
    return "";
  }

  // Step 3: Convert to lowercase
  normalized = normalized.toLowerCase();

  // Step 4: Remove special trademark/copyright symbols and similar characters
  // Remove: ®, ™, ©, ℠, ℗, etc.
  normalized = normalized.replace(/[®™©℠℗]/g, "");

  // Step 5: Remove punctuation (but keep essential characters)
  // Keep: alphanumeric, spaces, hyphens
  // Remove: periods, commas, exclamation marks, question marks, quotes, apostrophes, etc.
  // Note: Removing apostrophes for search normalization (e.g., "Joe's" -> "joes")
  normalized = normalized.replace(/[.,!?;:()[\]{}"'`~]/g, "");

  // Step 6: Normalize whitespace (remove extra spaces)
  normalized = normalized.replace(/\s+/g, " ");

  // Step 7: Handle multilingual characters and preserve essential characters
  // Keep: Unicode word characters (including Indian scripts), spaces, hyphens, apostrophes
  // \p{L} = Unicode letters, \p{M} = Unicode marks (diacritics), \p{N} = Unicode numbers
  // For broader multilingual support, we use a regex that keeps letters, marks, numbers, spaces, hyphens, and apostrophes
  normalized = normalized.replace(/[^\p{L}\p{M}\p{N}\s'-]/gu, "");

  // Step 8: Remove leading/trailing spaces, hyphens, and apostrophes
  normalized = normalized.trim().replace(/^[-']+|[-']+$/g, "");

  // Step 9: Final whitespace normalization
  normalized = normalized.replace(/\s+/g, " ").trim();

  return normalized;
}

/**
 * Normalize name while preserving case for display
 */
export function normalizeNameForDisplay(name: string): string {
  if (!name || typeof name !== "string") {
    return "";
  }

  return name
    .trim()
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

/**
 * Generate search-friendly normalized name
 */
export function generateNormalizedName(name: string): string {
  return normalizeBusinessName(name);
}

