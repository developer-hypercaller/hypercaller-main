/**
 * Bedrock entity mapping utilities
 * Maps Bedrock NLP entities to our data structures
 */

import { mapBedrockCategory, mapBedrockCategoryToCategoryId } from "./bedrock-category-mapper";
import { mapBedrockLocation, mapBedrockLocationToLocation } from "./bedrock-location-mapper";
import { normalizeBusinessName } from "../normalization/name-normalizer";
import { normalizePriceRange } from "../normalization/price-range-normalizer";
import { normalizeTime } from "../normalization/hours-normalizer";

export interface BedrockEntity {
  type: string;
  text: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

/**
 * Mapped entities result
 */
export interface MappedBedrockEntities {
  locations?: Array<{
    city: string;
    state: string;
    country: string;
    address?: string;
    valid: boolean;
  }>;
  businessNames?: string[];
  priceRanges?: Array<"$" | "$$" | "$$$" | "$$$$">;
  times?: string[]; // HH:mm format
  categories?: Array<{
    categoryId: string;
    confidence: number;
  }>;
}

/**
 * Map Bedrock entities to search query components
 */
export function mapBedrockEntitiesToSearchComponents(entities: BedrockEntity[]): {
  category?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
    address?: string;
  };
  intent?: string;
} {
  const result: {
    category?: string;
    location?: {
      city?: string;
      state?: string;
      country?: string;
      address?: string;
    };
    intent?: string;
  } = {};

  entities.forEach((entity) => {
    const type = entity.type.toLowerCase();
    const text = entity.text;

    // Map category entities
    if (type.includes("category") || type.includes("business_type") || type.includes("type")) {
      const categoryId = mapBedrockCategoryToCategoryId(text);
      if (categoryId && !result.category) {
        result.category = categoryId;
      }
    }

    // Map location entities
    if (type.includes("location") || type.includes("place") || type.includes("city") || type.includes("state")) {
      if (!result.location) {
        result.location = {};
      }

      if (type.includes("city")) {
        result.location.city = text;
      } else if (type.includes("state")) {
        result.location.state = text;
      } else if (type.includes("country")) {
        result.location.country = text;
      } else {
        // Generic location - try to parse
        result.location.address = text;
      }
    }

    // Map intent entities
    if (type.includes("intent") || type.includes("action")) {
      const intent = text.toLowerCase();
      if (intent.includes("find") || intent.includes("search") || intent.includes("look")) {
        result.intent = "find";
      } else if (intent.includes("discover") || intent.includes("explore")) {
        result.intent = "discover";
      } else if (intent.includes("compare")) {
        result.intent = "compare";
      }
    }
  });

  // Normalize location if present
  if (result.location) {
    result.location = mapBedrockLocationToLocation(result.location);
  }

  return result;
}

/**
 * Map all Bedrock entities to our formats
 * Maps locations, business names, prices, times to normalized formats
 * 
 * @param entities - Array of Bedrock entities
 * @returns Mapped entities in our standardized formats
 */
export function mapBedrockEntities(entities: BedrockEntity[] | any): MappedBedrockEntities {
  const result: MappedBedrockEntities = {};

  if (!entities || !Array.isArray(entities)) {
    return result;
  }

  entities.forEach((entity) => {
    const type = (entity.type || "").toLowerCase();
    const text = entity.text || "";

    // Map location entities
    if (type.includes("location") || type.includes("place") || type.includes("city") || type.includes("state") || type.includes("address")) {
      if (!result.locations) {
        result.locations = [];
      }

      const locationResult = mapBedrockLocation(text);
      if (locationResult.valid) {
        result.locations.push({
          city: locationResult.city,
          state: locationResult.state,
          country: locationResult.country,
          address: locationResult.address,
          valid: true,
        });
      } else if (entity.metadata && (entity.metadata.city || entity.metadata.state)) {
        // Try object format
        const locationObj = mapBedrockLocation({
          city: entity.metadata.city,
          state: entity.metadata.state,
          country: entity.metadata.country,
          lat: entity.metadata.lat,
          lng: entity.metadata.lng,
        });
        if (locationObj.valid) {
          result.locations.push({
            city: locationObj.city,
            state: locationObj.state,
            country: locationObj.country,
            address: locationObj.address,
            valid: true,
          });
        }
      }
    }

    // Map business name entities
    if (type.includes("business") || type.includes("name") || type.includes("organization") || type.includes("company")) {
      if (!result.businessNames) {
        result.businessNames = [];
      }
      const normalizedName = normalizeBusinessName(text);
      if (normalizedName) {
        result.businessNames.push(normalizedName);
      }
    }

    // Map price entities
    if (type.includes("price") || type.includes("cost") || type.includes("budget") || type.includes("expensive")) {
      if (!result.priceRanges) {
        result.priceRanges = [];
      }
      const normalizedPrice = normalizePriceRange(text);
      if (normalizedPrice) {
        result.priceRanges.push(normalizedPrice);
      }
    }

    // Map time entities
    if (type.includes("time") || type.includes("hour") || type.includes("open") || type.includes("close")) {
      if (!result.times) {
        result.times = [];
      }
      const normalizedTime = normalizeTime(text);
      if (normalizedTime) {
        result.times.push(normalizedTime);
      }
    }

    // Map category entities
    if (type.includes("category") || type.includes("business_type") || type.includes("type")) {
      if (!result.categories) {
        result.categories = [];
      }
      const confidence = entity.confidence || 1.0;
      const categoryResult = mapBedrockCategory(text, confidence);
      if (categoryResult.categoryId !== "general") {
        result.categories.push({
          categoryId: categoryResult.categoryId,
          confidence: categoryResult.confidence,
        });
      }
    }
  });

  // Remove duplicates
  if (result.businessNames) {
    result.businessNames = Array.from(new Set(result.businessNames));
  }
  if (result.priceRanges) {
    result.priceRanges = Array.from(new Set(result.priceRanges));
  }
  if (result.times) {
    result.times = Array.from(new Set(result.times));
  }
  if (result.locations) {
    // Remove duplicate locations
    const locationMap = new Map<string, typeof result.locations[0]>();
    result.locations.forEach((loc) => {
      const key = `${loc.city}|${loc.state}|${loc.country}`;
      if (!locationMap.has(key)) {
        locationMap.set(key, loc);
      }
    });
    result.locations = Array.from(locationMap.values());
  }

  return result;
}

