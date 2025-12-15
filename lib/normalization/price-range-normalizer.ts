/**
 * Price range normalization utilities
 */

import { PriceRange } from "../data/price-ranges";

/**
 * Normalize price range input
 * Maps text descriptions and symbol variations to standardized price range symbols
 * 
 * @param input - Price range input string
 * @returns Standardized symbol ($, $$, $$$, $$$$) or null if not found
 */
export function normalizePriceRange(input: string): PriceRange | null {
  // Step 1: Basic validation
  if (!input || typeof input !== "string") {
    return null;
  }

  // Step 2: Trim whitespace and convert to lowercase
  const normalized = input.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  // Step 3: Check if it's already a valid symbol (case-insensitive)
  if (normalized === "$" || normalized === "$$" || normalized === "$$$" || normalized === "$$$$") {
    return normalized as PriceRange;
  }

  // Step 4: Handle symbol variations (e.g., "dollar", "dollars", "$1", "$2", etc.)
  if (normalized === "$1" || normalized === "1" || normalized === "one") {
    return "$";
  }
  if (normalized === "$$2" || normalized === "$2" || normalized === "2" || normalized === "two") {
    return "$$";
  }
  if (normalized === "$$$3" || normalized === "$3" || normalized === "3" || normalized === "three") {
    return "$$$";
  }
  if (normalized === "$$$$4" || normalized === "$4" || normalized === "4" || normalized === "four") {
    return "$$$$";
  }

  // Step 5: Map text descriptions to symbols
  // Budget tier: "$"
  const budgetTerms = ["budget", "cheap", "affordable", "inexpensive", "economical", "low-cost", "low cost"];
  if (budgetTerms.some((term) => normalized === term || normalized.includes(term))) {
    return "$";
  }

  // Moderate tier: "$$"
  const moderateTerms = ["moderate", "mid-range", "midrange", "medium", "mid", "average", "reasonable"];
  if (moderateTerms.some((term) => normalized === term || normalized.includes(term))) {
    return "$$";
  }

  // Luxury tier: "$$$$" (check first for premium/luxury terms)
  const luxuryTerms = ["luxury", "premium", "ultra-premium", "ultra premium", "very expensive", "very-expensive", "high-end", "high end"];
  if (luxuryTerms.some((term) => normalized === term || normalized.includes(term))) {
    return "$$$$";
  }

  // Expensive tier: "$$$"
  const expensiveTerms = ["expensive", "high-priced", "high priced", "costly"];
  if (expensiveTerms.some((term) => normalized === term || normalized.includes(term))) {
    return "$$$";
  }

  // Step 6: No match found
  return null;
}

/**
 * Normalize multiple price range inputs
 */
export function normalizePriceRanges(inputs: string[]): PriceRange[] {
  if (!Array.isArray(inputs)) {
    return [];
  }

  const normalized = inputs
    .map((input) => normalizePriceRange(input))
    .filter((pr): pr is PriceRange => pr !== null);

  // Remove duplicates
  return Array.from(new Set(normalized));
}

/**
 * Normalize price range input (alias for backward compatibility)
 */
export function normalizePriceRangeInput(input: string): PriceRange | null {
  return normalizePriceRange(input);
}

