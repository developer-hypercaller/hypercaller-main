/**
 * Bedrock category mapping utilities
 * Maps Bedrock model categories to our taxonomy
 */

import {
  getCategoryById,
  getCategoryBySynonym,
  mapBedrockCategory as mapBedrockCategoryFromData,
} from "../data/categories";

/**
 * Mapping result with confidence
 */
export interface BedrockCategoryMappingResult {
  categoryId: string;
  confidence: number;
  matchType: "exact" | "synonym" | "pattern" | "fallback";
}

/**
 * Map Bedrock category to our category taxonomy
 * Handles exact matches, synonym matches, and Bedrock pattern matching
 * Note: Fuzzy matching is disabled - returns "general" if no exact/synonym/pattern match is found
 * 
 * @param bedrockCategory - Category from Bedrock model
 * @param confidence - Confidence score from Bedrock (0.0 to 1.0)
 * @returns Mapped category with confidence, or "general" if no match
 */
export function mapBedrockCategory(
  bedrockCategory: string,
  confidence: number = 1.0
): BedrockCategoryMappingResult {
  // Step 1: Basic validation
  if (!bedrockCategory || typeof bedrockCategory !== "string") {
    const { trackMappingIssue } = require("../utils/monitoring");
    trackMappingIssue("bedrock-category-mapper", bedrockCategory, "general", "Invalid input type", {
      confidence,
      inputType: typeof bedrockCategory,
    });
    return {
      categoryId: "general",
      confidence: confidence * 0.5, // Lower confidence for invalid input
      matchType: "fallback",
    };
  }

  const normalized = bedrockCategory.trim().toLowerCase();
  if (!normalized) {
    const { trackMappingIssue } = require("../utils/monitoring");
    trackMappingIssue("bedrock-category-mapper", bedrockCategory, "general", "Empty input", {
      confidence,
    });
    return {
      categoryId: "general",
      confidence: confidence * 0.5,
      matchType: "fallback",
    };
  }

  // Step 2: Try exact match (category ID match)
  const exactCategory = getCategoryById(normalized);
  if (exactCategory) {
    // Return parent category if it's a subcategory
    const categoryId = exactCategory.parentId || exactCategory.id;
    return {
      categoryId,
      confidence: confidence * 0.9, // Lower confidence for mapped categories
      matchType: "exact",
    };
  }

  // Step 3: Try synonym match
  const synonymCategory = getCategoryBySynonym(normalized);
  if (synonymCategory) {
    const categoryId = synonymCategory.parentId || synonymCategory.id;
    return {
      categoryId,
      confidence: confidence * 0.9, // Lower confidence for mapped categories
      matchType: "synonym",
    };
  }

  // Step 4: Try Bedrock pattern matching (from categories.ts)
  // Note: Fuzzy matching is disabled - if no exact/synonym/pattern match, return "general"
  const bedrockMapped = mapBedrockCategoryFromData(normalized);
  if (bedrockMapped) {
    return {
      categoryId: bedrockMapped,
      confidence: confidence * 0.9, // Lower confidence for mapped categories
      matchType: "pattern",
    };
  }

  // Step 5: No match found - return "general" as fallback
  // Track unmapped category for monitoring
  const { trackUnmappedValue } = require("../utils/monitoring");
  trackUnmappedValue("bedrock-category-mapper", bedrockCategory, {
    confidence,
    fallback: "general",
    normalized,
    message: "No match found, using general category",
  });

  return {
    categoryId: "general",
    confidence: confidence * 0.5, // Lower confidence for fallback
    matchType: "fallback",
  };
}

/**
 * Map Bedrock category to our category ID (backward compatibility)
 * Uses synonym matching since bedrockMapping was removed
 */
export function mapBedrockCategoryToCategoryId(bedrockCategory: string): string | null {
  const result = mapBedrockCategory(bedrockCategory, 1.0);
  return result.categoryId === "general" ? null : result.categoryId;
}

/**
 * Map multiple Bedrock categories to category IDs
 */
export function mapBedrockCategoriesToCategoryIds(bedrockCategories: string[]): string[] {
  if (!Array.isArray(bedrockCategories)) {
    return [];
  }

  const categoryIds = bedrockCategories
    .map((bc) => mapBedrockCategoryToCategoryId(bc))
    .filter((id): id is string => id !== null);

  // Remove duplicates
  return Array.from(new Set(categoryIds));
}

/**
 * Map our category ID to Bedrock category (if mapping exists)
 * Note: bedrockMapping was removed, so this returns the category name as fallback
 */
export function mapCategoryIdToBedrockCategory(categoryId: string): string | null {
  const category = getCategoryById(categoryId);
  // Return category name as fallback since bedrockMapping was removed
  return category?.name || null;
}

