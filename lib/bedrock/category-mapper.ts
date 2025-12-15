/**
 * Category mapping utilities for Bedrock
 * Maps Bedrock-extracted categories to our taxonomy
 * Handles Bedrock API responses and returns normalized categories
 */

import { mapBedrockCategory, BedrockCategoryMappingResult } from "../mapping/bedrock-category-mapper";

/**
 * Bedrock API category response structure
 */
export interface BedrockCategoryResponse {
  category?: string;
  categories?: string[];
  confidence?: number;
  [key: string]: any;
}

/**
 * Map Bedrock categories from API response
 * Handles various Bedrock API response formats
 * 
 * @param bedrockResponse - Response from Bedrock API
 * @returns Array of mapped categories with confidence scores
 */
export function mapBedrockCategories(
  bedrockResponse: BedrockCategoryResponse | string | string[]
): BedrockCategoryMappingResult[] {
  const results: BedrockCategoryMappingResult[] = [];

  try {
    // Handle string input (single category)
    if (typeof bedrockResponse === "string") {
      const result = mapBedrockCategory(bedrockResponse, 1.0);
      results.push(result);
      return results;
    }

    // Handle array input (multiple categories)
    if (Array.isArray(bedrockResponse)) {
      bedrockResponse.forEach((category) => {
        if (typeof category === "string") {
          const result = mapBedrockCategory(category, 1.0);
          results.push(result);
        }
      });
      return results;
    }

    // Handle object response from Bedrock API
    if (typeof bedrockResponse === "object" && bedrockResponse !== null) {
      const confidence = bedrockResponse.confidence || 1.0;

      // Handle single category
      if (bedrockResponse.category && typeof bedrockResponse.category === "string") {
        const result = mapBedrockCategory(bedrockResponse.category, confidence);
        results.push(result);
      }

      // Handle multiple categories
      if (bedrockResponse.categories && Array.isArray(bedrockResponse.categories)) {
        bedrockResponse.categories.forEach((category) => {
          if (typeof category === "string") {
            const result = mapBedrockCategory(category, confidence);
            results.push(result);
          }
        });
      }

      // Handle other possible formats (e.g., entities array)
      if (Array.isArray(bedrockResponse.entities)) {
        bedrockResponse.entities.forEach((entity: any) => {
          if (entity.type === "category" || entity.type === "CATEGORY" || entity.type?.toLowerCase().includes("category")) {
            const categoryText = entity.text || entity.value || entity.category;
            const entityConfidence = entity.confidence || confidence;
            if (typeof categoryText === "string") {
              const result = mapBedrockCategory(categoryText, entityConfidence);
              results.push(result);
            }
          }
        });
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Bedrock Category Mapper] Error mapping categories: ${errorMessage}`);
    // Return empty array on error
    return [];
  }

  // Remove duplicates (same categoryId)
  const uniqueResults = new Map<string, BedrockCategoryMappingResult>();
  results.forEach((result) => {
    const existing = uniqueResults.get(result.categoryId);
    if (!existing || result.confidence > existing.confidence) {
      uniqueResults.set(result.categoryId, result);
    }
  });

  return Array.from(uniqueResults.values());
}

/**
 * Map extracted category to our category ID (backward compatibility)
 */
export function mapExtractedCategoryToCategoryId(
  extractedCategory: string
): string | null {
  if (!extractedCategory || typeof extractedCategory !== "string") {
    return null;
  }

  const result = mapBedrockCategory(extractedCategory, 1.0);
  return result.categoryId === "general" ? null : result.categoryId;
}

/**
 * Map multiple extracted categories
 */
export function mapExtractedCategoriesToCategoryIds(
  extractedCategories: string[]
): string[] {
  if (!Array.isArray(extractedCategories)) {
    return [];
  }

  const categoryIds = extractedCategories
    .map((cat) => mapExtractedCategoryToCategoryId(cat))
    .filter((id): id is string => id !== null);

  // Remove duplicates
  return Array.from(new Set(categoryIds));
}

