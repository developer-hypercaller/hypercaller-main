/**
 * Filter mapping utilities
 * Maps filter inputs to standardized filter format
 */

import { SearchFilters } from "../schemas/filter-schema";
import { normalizeCategory, normalizeCategoryInput } from "../normalization/category-normalizer";
import { normalizePriceRange, normalizePriceRanges } from "../normalization/price-range-normalizer";
import { normalizeAmenities } from "../normalization/amenity-normalizer";

/**
 * Map raw filter inputs to standardized SearchFilters
 */
export function mapFiltersToSearchFilters(rawFilters: {
  categories?: string | string[];
  priceRange?: string | string[];
  rating?: { min?: number; max?: number };
  amenities?: string | string[];
  isVerified?: boolean;
  distance?: { max?: number; unit?: string };
  openNow?: boolean;
  city?: string | string[];
  state?: string | string[];
}): SearchFilters {
  const filters: SearchFilters = {};

  // Map categories
  if (rawFilters.categories) {
    const categoryArray = Array.isArray(rawFilters.categories)
      ? rawFilters.categories
      : [rawFilters.categories];
    filters.categories = categoryArray
      .map((c) => normalizeCategoryInput(c))
      .filter((id): id is string => id !== null);
  }

  // Map price range
  if (rawFilters.priceRange) {
    const priceRangeArray = Array.isArray(rawFilters.priceRange)
      ? rawFilters.priceRange
      : [rawFilters.priceRange];
    const normalized = normalizePriceRanges(priceRangeArray);
    if (normalized.length > 0) {
      filters.priceRange = { values: normalized };
    }
  }

  // Map rating
  if (rawFilters.rating) {
    filters.rating = {
      min: rawFilters.rating.min,
      max: rawFilters.rating.max,
    };
  }

  // Map amenities
  if (rawFilters.amenities) {
    const amenityArray = Array.isArray(rawFilters.amenities)
      ? rawFilters.amenities
      : [rawFilters.amenities];
    filters.amenities = normalizeAmenities(amenityArray);
  }

  // Map isVerified
  if (rawFilters.isVerified !== undefined) {
    filters.isVerified = rawFilters.isVerified;
  }

  // Map distance
  if (rawFilters.distance) {
    const validUnits: ("meters" | "kilometers" | "miles")[] = ["meters", "kilometers", "miles"];
    const unit = rawFilters.distance.unit && validUnits.includes(rawFilters.distance.unit as any)
      ? (rawFilters.distance.unit as "meters" | "kilometers" | "miles")
      : "meters";
    filters.distance = {
      max: rawFilters.distance.max,
      unit,
    };
  }

  // Map hours
  if (rawFilters.openNow !== undefined) {
    filters.hours = {
      openNow: rawFilters.openNow,
    };
  }

  // Map location filters
  if (rawFilters.city) {
    filters.city = Array.isArray(rawFilters.city) ? rawFilters.city : [rawFilters.city];
  }

  if (rawFilters.state) {
    filters.state = Array.isArray(rawFilters.state) ? rawFilters.state : [rawFilters.state];
  }

  return filters;
}

/**
 * Map user-friendly filters to database format
 * Maps:
 * - "budget" → "$"
 * - "4 stars" → rating >= 4.0
 * - Category names → category IDs
 * 
 * @param userFilters - User-friendly filter inputs
 * @returns Mapped filters in database format
 */
export function mapFilters(userFilters: {
  categories?: string | string[];
  priceRange?: string | string[];
  rating?: string | number | { min?: number; max?: number };
  amenities?: string | string[];
  isVerified?: boolean;
  distance?: { max?: number; unit?: string };
  openNow?: boolean;
  city?: string | string[];
  state?: string | string[];
  [key: string]: any;
} | null | undefined): SearchFilters {
  // Handle null/undefined input
  if (!userFilters || typeof userFilters !== "object") {
    return {};
  }

  const filters: SearchFilters = {};

  // Map categories - convert category names to category IDs
  if (userFilters.categories) {
    const categoryArray = Array.isArray(userFilters.categories)
      ? userFilters.categories
      : [userFilters.categories];
    filters.categories = categoryArray
      .map((c) => {
        // Try normalization first (handles synonyms, etc.)
        const normalized = normalizeCategory(c);
        return normalized || normalizeCategoryInput(c);
      })
      .filter((id): id is string => id !== null);
  }

  // Map price range - convert text to symbols
  if (userFilters.priceRange) {
    const priceRangeArray = Array.isArray(userFilters.priceRange)
      ? userFilters.priceRange
      : [userFilters.priceRange];
    const normalized = priceRangeArray
      .map((pr) => {
        // Handle text like "budget", "cheap" → "$"
        if (typeof pr === "string") {
          return normalizePriceRange(pr);
        }
        return pr;
      })
      .filter((pr): pr is "$" | "$$" | "$$$" | "$$$$" => pr !== null);
    if (normalized.length > 0) {
      filters.priceRange = { values: normalized };
    }
  }

  // Map rating - convert "4 stars" or "4.5" to rating filter
  if (userFilters.rating !== undefined) {
    if (typeof userFilters.rating === "string") {
      // Handle "4 stars", "4.5 stars", etc.
      const ratingMatch = userFilters.rating.match(/(\d+(?:\.\d+)?)/);
      if (ratingMatch) {
        const ratingValue = parseFloat(ratingMatch[1]);
        if (ratingValue >= 0 && ratingValue <= 5) {
          filters.rating = { min: ratingValue };
        }
      }
    } else if (typeof userFilters.rating === "number") {
      filters.rating = { min: userFilters.rating };
    } else if (typeof userFilters.rating === "object") {
      filters.rating = {
        min: userFilters.rating.min,
        max: userFilters.rating.max,
      };
    }
  }

  // Map amenities
  if (userFilters.amenities) {
    const amenityArray = Array.isArray(userFilters.amenities)
      ? userFilters.amenities
      : [userFilters.amenities];
    filters.amenities = normalizeAmenities(amenityArray);
  }

  // Map isVerified
  if (userFilters.isVerified !== undefined) {
    filters.isVerified = userFilters.isVerified;
  }

  // Map distance
  if (userFilters.distance) {
    const validUnits: ("meters" | "kilometers" | "miles")[] = ["meters", "kilometers", "miles"];
    const unit = userFilters.distance.unit && validUnits.includes(userFilters.distance.unit as any)
      ? (userFilters.distance.unit as "meters" | "kilometers" | "miles")
      : "meters";
    filters.distance = {
      max: userFilters.distance.max,
      unit,
    };
  }

  // Map hours
  if (userFilters.openNow !== undefined) {
    filters.hours = {
      openNow: userFilters.openNow,
    };
  }

  // Map location filters
  if (userFilters.city) {
    filters.city = Array.isArray(userFilters.city) ? userFilters.city : [userFilters.city];
  }

  if (userFilters.state) {
    filters.state = Array.isArray(userFilters.state) ? userFilters.state : [userFilters.state];
  }

  return filters;
}

