/**
 * Filter utilities
 * Applies filters to search results
 */

import { Business } from "../schemas/business-schema";
import { SearchFilters } from "../schemas/filter-schema";
import { getDistance } from "../utils/distance";
import { isWithinRadius } from "../utils/distance";

/**
 * Check if business matches price range filter
 */
function matchesPriceRange(
  business: Business,
  priceRanges: ("$" | "$$" | "$$$" | "$$$$")[]
): boolean {
  if (!business.priceRange) {
    return false; // No price range = doesn't match
  }

  return priceRanges.includes(business.priceRange);
}

/**
 * Check if business matches rating filter
 */
function matchesRating(
  business: Business,
  minRating?: number,
  maxRating?: number
): boolean {
  if (business.rating === undefined) {
    return false; // No rating = doesn't match
  }

  if (minRating !== undefined && business.rating < minRating) {
    return false;
  }

  if (maxRating !== undefined && business.rating > maxRating) {
    return false;
  }

  return true;
}

/**
 * Check if business matches distance filter
 */
function matchesDistance(
  business: Business,
  centerLocation: { latitude: number; longitude: number },
  maxDistance?: number
): boolean {
  if (!maxDistance) {
    return true; // No distance limit
  }

  if (!business.location) {
    return false;
  }

  const distance = getDistance(
    centerLocation,
    {
      latitude: business.location.latitude,
      longitude: business.location.longitude,
    }
  );

  return distance <= maxDistance;
}

/**
 * Check if business matches amenity filter
 */
function matchesAmenities(business: Business, requiredAmenities: string[]): boolean {
  if (!business.amenities || business.amenities.length === 0) {
    return false;
  }

  // Check if all required amenities are present
  return requiredAmenities.every((amenity) => business.amenities!.includes(amenity));
}

/**
 * Check if business matches category filter
 */
function matchesCategory(business: Business, categories: string[]): boolean {
  if (!business.category) {
    return false;
  }

  return categories.includes(business.category);
}

/**
 * Check if business matches location filter
 */
function matchesLocation(
  business: Business,
  cities?: string[],
  states?: string[]
): boolean {
  if (!business.location) {
    return false;
  }

  if (cities && cities.length > 0) {
    const businessCity = business.location.city?.toLowerCase() || "";
    if (!cities.some((city) => city.toLowerCase() === businessCity)) {
      return false;
    }
  }

  if (states && states.length > 0) {
    const businessState = business.location.state?.toLowerCase() || "";
    if (!states.some((state) => state.toLowerCase() === businessState)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if business matches hours filter
 */
function matchesHours(business: Business, openNow?: boolean): boolean {
  if (openNow === undefined || !openNow) {
    return true; // No hours filter
  }

  if (!business.businessHours) {
    return false;
  }

  // Get current day and time
  const now = new Date();
  const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  const dayHours = business.businessHours[dayOfWeek];
  if (!dayHours || dayHours.isClosed) {
    return false;
  }

  // Check if current time is between open and close
  const openTime = dayHours.open;
  const closeTime = dayHours.close;

  if (!openTime || !closeTime) {
    return false;
  }

  return currentTime >= openTime && currentTime <= closeTime;
}

/**
 * Apply filters to businesses
 */
export function applyFilters(
  businesses: Business[],
  filters: SearchFilters,
  userLocation?: { latitude: number; longitude: number }
): Business[] {
  return businesses.filter((business) => {
    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      if (!matchesCategory(business, filters.categories)) {
        return false;
      }
    }

    // Price range filter
    if (filters.priceRange?.values && filters.priceRange.values.length > 0) {
      if (!matchesPriceRange(business, filters.priceRange.values)) {
        return false;
      }
    }

    // Rating filter
    if (filters.rating) {
      if (!matchesRating(business, filters.rating.min, filters.rating.max)) {
        return false;
      }
    }

    // Distance filter
    if (filters.distance?.max && userLocation) {
      if (!matchesDistance(business, userLocation, filters.distance.max)) {
        return false;
      }
    }

    // Amenities filter
    if (filters.amenities && filters.amenities.length > 0) {
      if (!matchesAmenities(business, filters.amenities)) {
        return false;
      }
    }

    // Verification filter
    if (filters.isVerified !== undefined) {
      if (business.isVerified !== filters.isVerified) {
        return false;
      }
    }

    // Location filter
    if (filters.city || filters.state) {
      if (!matchesLocation(business, filters.city, filters.state)) {
        return false;
      }
    }

    // Hours filter
    if (filters.hours) {
      if (!matchesHours(business, filters.hours.openNow)) {
        return false;
      }
    }

    return true;
  });
}

