/**
 * Price range definitions
 * Standardized price range enum and utilities
 */

export type PriceRange = "$" | "$$" | "$$$" | "$$$$";

export interface PriceRangeDefinition {
  value: PriceRange;
  displayName: string;
  description: string;
  minPrice?: number; // Optional min price in INR
  maxPrice?: number; // Optional max price in INR
}

export const priceRanges: PriceRangeDefinition[] = [
  {
    value: "$",
    displayName: "Budget",
    description: "Budget-friendly, affordable",
    minPrice: 0,
    maxPrice: 300,
  },
  {
    value: "$$",
    displayName: "Moderate",
    description: "Moderately priced",
    minPrice: 300,
    maxPrice: 800,
  },
  {
    value: "$$$",
    displayName: "Expensive",
    description: "Higher priced",
    minPrice: 800,
    maxPrice: 2000,
  },
  {
    value: "$$$$",
    displayName: "Very Expensive",
    description: "Premium pricing",
    minPrice: 2000,
    maxPrice: undefined,
  },
];

const priceRangeMap = new Map<PriceRange, PriceRangeDefinition>();
priceRanges.forEach((pr) => {
  priceRangeMap.set(pr.value, pr);
});

/**
 * Get price range definition
 */
export function getPriceRange(value: PriceRange): PriceRangeDefinition | undefined {
  return priceRangeMap.get(value);
}

/**
 * Validate price range
 */
export function isValidPriceRange(value: string): value is PriceRange {
  return value === "$" || value === "$$" || value === "$$$" || value === "$$$$";
}

/**
 * Normalize price range input
 */
export function normalizePriceRange(input: string): PriceRange | null {
  if (isValidPriceRange(input)) {
    return input;
  }

  // Try to map common variations
  const lower = input.toLowerCase().trim();
  if (lower === "budget" || lower === "cheap" || lower === "affordable") {
    return "$";
  }
  if (lower === "moderate" || lower === "medium") {
    return "$$";
  }
  if (lower === "expensive" || lower === "high") {
    return "$$$";
  }
  if (lower === "premium" || lower === "luxury" || lower === "very expensive") {
    return "$$$$";
  }

  return null;
}

/**
 * Get all price ranges
 */
export function getAllPriceRanges(): PriceRange[] {
  return ["$", "$$", "$$$", "$$$$"];
}

/**
 * Mapping rules for price range conversion
 */
export interface PriceRangeMappingRule {
  input: string | RegExp;
  output: PriceRange;
  priority: number; // Higher priority rules are checked first
}

export const priceRangeMappingRules: PriceRangeMappingRule[] = [
  // Budget mappings (highest priority)
  { input: /^budget$/i, output: "$", priority: 10 },
  { input: /^cheap$/i, output: "$", priority: 10 },
  { input: /^affordable$/i, output: "$", priority: 10 },
  { input: /^low$/i, output: "$", priority: 9 },
  { input: /^economy$/i, output: "$", priority: 9 },
  { input: /^inexpensive$/i, output: "$", priority: 8 },
  
  // Moderate mappings
  { input: /^moderate$/i, output: "$$", priority: 10 },
  { input: /^medium$/i, output: "$$", priority: 10 },
  { input: /^mid-range$/i, output: "$$", priority: 9 },
  { input: /^average$/i, output: "$$", priority: 8 },
  { input: /^standard$/i, output: "$$", priority: 8 },
  
  // Expensive mappings
  { input: /^expensive$/i, output: "$$$", priority: 10 },
  { input: /^high$/i, output: "$$$", priority: 9 },
  { input: /^upscale$/i, output: "$$$", priority: 9 },
  { input: /^fine dining$/i, output: "$$$", priority: 8 },
  
  // Premium mappings
  { input: /^premium$/i, output: "$$$$", priority: 10 },
  { input: /^luxury$/i, output: "$$$$", priority: 10 },
  { input: /^very expensive$/i, output: "$$$$", priority: 9 },
  { input: /^ultra premium$/i, output: "$$$$", priority: 9 },
  { input: /^exclusive$/i, output: "$$$$", priority: 8 },
  
  // Price-based mappings (if input is a number)
  { input: /^\d+$/, output: "$", priority: 5 }, // Default to budget for numeric inputs
];

/**
 * Map price range using mapping rules
 */
export function mapPriceRange(input: string): PriceRange | null {
  // First try direct normalization
  const normalized = normalizePriceRange(input);
  if (normalized) {
    return normalized;
  }

  // Sort rules by priority (highest first)
  const sortedRules = [...priceRangeMappingRules].sort((a, b) => b.priority - a.priority);

  // Try each rule
  for (const rule of sortedRules) {
    if (typeof rule.input === "string") {
      if (input.toLowerCase().trim() === rule.input.toLowerCase()) {
        return rule.output;
      }
    } else if (rule.input instanceof RegExp) {
      if (rule.input.test(input)) {
        return rule.output;
      }
    }
  }

  return null;
}

/**
 * Get price range for a given price amount (in INR)
 */
export function getPriceRangeForAmount(amount: number): PriceRange {
  if (amount <= 300) {
    return "$";
  } else if (amount <= 800) {
    return "$$";
  } else if (amount <= 2000) {
    return "$$$";
  } else {
    return "$$$$";
  }
}

/**
 * Get price range display name
 */
export function getPriceRangeDisplayName(value: PriceRange): string {
  const definition = getPriceRange(value);
  return definition?.displayName || value;
}

/**
 * Get price range description
 */
export function getPriceRangeDescription(value: PriceRange): string {
  const definition = getPriceRange(value);
  return definition?.description || "";
}

