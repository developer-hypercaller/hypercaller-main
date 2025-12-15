/**
 * Location resolution utilities
 * Resolves user location from various sources with priority logic
 */

import { NextRequest } from "next/server";
import { normalizeLocationName } from "../normalization/location-normalizer";
import { isWithinIndiaBounds } from "../data/india-bounds";
import { forwardGeocode, reverseGeocode } from "../geocoding";
import { getCachedGeocoding, getOrCacheGeocoding } from "../db/geocoding-cache";

/**
 * Location resolution result
 */
export interface LocationResolutionResult {
  lat: number;
  lng: number;
  address: string;
  source: "explicit" | "profile" | "geolocation" | "ip";
  city?: string;
  state?: string;
  radius?: number;
  isStale?: boolean; // True if location is >30 days old
}

/**
 * Detect "near me" keywords in query
 * Checks for: "near me", "nearby", "close by", "in my area", "around here"
 * Case-insensitive matching
 * 
 * @param query - Search query string
 * @returns True if "near me" keywords detected
 */
export function detectNearMeKeywords(query: string): boolean {
  if (!query || typeof query !== "string") {
    return false;
  }

  // Normalize query to lowercase for case-insensitive matching
  const normalizedQuery = query.toLowerCase().trim();

  // Keywords to detect
  const nearMeKeywords = [
    "near me",
    "nearby",
    "close by",
    "close to me",
    "in my area",
    "around here",
    "around me",
    "local",
    "nearby me",
  ];

  // Check if any keyword is present in the query
  // Use word boundaries to avoid partial matches
  for (const keyword of nearMeKeywords) {
    // Escape special regex characters in keyword
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escapedKeyword}\\b`, "i");
    if (pattern.test(normalizedQuery)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if location is stale (>30 days old)
 * 
 * @param locationLastUpdated - Unix timestamp in seconds
 * @returns True if location is stale
 */
function isLocationStale(locationLastUpdated?: number | null): boolean {
  if (!locationLastUpdated) {
    return false; // No timestamp means we can't determine if stale
  }

  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const thirtyDaysInSeconds = 30 * 24 * 60 * 60; // 30 days
  const ageInSeconds = now - locationLastUpdated;

  return ageInSeconds > thirtyDaysInSeconds;
}

/**
 * Extract IP address from request
 */
function extractIPAddress(request: NextRequest): string | null {
  // Check various headers for IP address
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP.trim();
  }

  // Fallback to connection remote address (if available)
  return null;
}

/**
 * Get IP location from request
 * Extracts IP from request headers and uses IP geolocation service
 * Returns city-level location with source: "ip"
 * 
 * IP geolocation is last resort
 * City-level accuracy only
 * Can use free service or skip initially
 * 
 * @param request - Next.js request object
 * @returns Location result or null
 */
export async function getIPLocation(
  request: NextRequest
): Promise<LocationResolutionResult | null> {
  const ipAddress = extractIPAddress(request);
  
  if (!ipAddress) {
    return null;
  }

  return await resolveLocationFromIP(ipAddress);
}

/**
 * Extract city name from address string
 * 
 * @param address - Full address string
 * @returns City name or undefined
 */
function extractCityFromAddress(address: string): string | undefined {
  if (!address) {
    return undefined;
  }

  // Try to extract city from address
  // Common patterns: "City, State" or "City, State, Country"
  const parts = address.split(",").map((p) => p.trim());
  
  // Usually city is the first part or second-to-last part
  if (parts.length >= 2) {
    // Check if first part looks like a city (not too long, not a street)
    const firstPart = parts[0];
    if (firstPart.length < 50 && !firstPart.match(/^\d+/)) {
      return firstPart;
    }
    // Otherwise, try second part
    if (parts.length >= 2) {
      return parts[1];
    }
  }

  return undefined;
}

/**
 * Check if a city is urban (major metropolitan)
 * 
 * @param city - City name
 * @returns True if urban, false if suburban/rural, undefined if unknown
 */
function isUrbanCity(city: string): boolean | undefined {
  if (!city) {
    return undefined;
  }

  const normalizedCity = city.toLowerCase().trim();
  
  // Major metropolitan cities (urban) - Tier 1 cities
  const urbanCities = [
    "mumbai", "delhi", "bengaluru", "hyderabad", "chennai", "kolkata",
    "pune", "ahmedabad", "jaipur", "surat", "gurugram", "noida",
    "faridabad", "ghaziabad", "nagpur", "indore", "vadodara",
    "visakhapatnam", "coimbatore", "madurai", "kochi", "kanpur",
    "lucknow", "patna", "bhopal", "chandigarh", "dehradun",
  ];

  return urbanCities.includes(normalizedCity);
}

/**
 * Get default search radius based on city and urban classification
 * 
 * Urban areas: 5km
 * Suburban: 10km
 * Rural: 20km
 * Default: 10km
 * 
 * @param city - City name
 * @param isUrban - Whether the area is urban (true), suburban (false), or unknown (undefined)
 * @returns Radius in meters
 */
export function getDefaultRadius(city?: string, isUrban?: boolean): number {
  // If urban classification is explicitly provided
  if (isUrban === true) {
    return 5000; // 5km for urban areas
  } else if (isUrban === false) {
    return 10000; // 10km for suburban areas
  }

  // If urban classification is explicitly provided
  if (isUrban === true) {
    return 5000; // 5km for urban areas
  } else if (isUrban === false) {
    return 10000; // 10km for suburban areas
  }

  // If city is provided, try to determine from city name
  if (city) {
    const cityType = isUrbanCity(city);
    if (cityType === true) {
      return 5000; // 5km for urban areas
    } else if (cityType === false) {
      return 10000; // 10km for suburban areas
    }
    // Unknown city - default to suburban
    return 10000; // 10km for suburban areas
  }

  // Default: 10km (suburban)
  return 10000;
}

/**
 * Resolve location from IP address (fallback)
 * Uses a simple IP geolocation service
 */
async function resolveLocationFromIP(ipAddress: string): Promise<LocationResolutionResult | null> {
  try {
    // Use a free IP geolocation service
    // Note: In production, you might want to use a paid service for better accuracy
    const response = await fetch(`https://ipapi.co/${ipAddress}/json/`, {
      headers: {
        "User-Agent": "Hypercaller/1.0",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Check if location is in India
    if (data.country_code !== "IN") {
      return null;
    }

    const lat = parseFloat(data.latitude);
    const lng = parseFloat(data.longitude);

    // Validate coordinates are in India bounds
    if (!isWithinIndiaBounds(lat, lng)) {
      return null;
    }

    // Determine if urban based on city
    const cityName = data.city || "";
    const isUrban = cityName ? isUrbanCity(cityName) : undefined;
    const radius = getDefaultRadius(cityName, isUrban);

    return {
      lat,
      lng,
      address: data.city
        ? `${data.city}, ${data.region}, India`
        : `${data.region}, India`,
      source: "ip",
      city: data.city,
      state: data.region,
      radius, // Use calculated radius based on city type
    };
  } catch (error) {
    console.error("IP geolocation error:", error);
    return null;
  }
}

/**
 * Extract explicit location from entities
 * Priority 1: Explicit location in query (from entities)
 */
export async function extractExplicitLocation(
  entities: { locations?: string[] }
): Promise<LocationResolutionResult | null> {
  if (!entities.locations || entities.locations.length === 0) {
    return null;
  }

  // Take first location
  const locationName = entities.locations[0];

  if (!locationName) {
    return null;
  }

  // Normalize location name
  const normalizedLocation = normalizeLocationName(locationName);

  // Try to get from cache first
  const cached = await getCachedGeocoding(normalizedLocation);
  if (cached) {
    // Validate coordinates are in India
    if (isWithinIndiaBounds(cached.latitude, cached.longitude)) {
      // Determine radius based on city
      const cityName = extractCityFromAddress(cached.address || normalizedLocation);
      const radius = getDefaultRadius(cityName);

      return {
        lat: cached.latitude,
        lng: cached.longitude,
        address: cached.address || normalizedLocation,
        source: "explicit",
        radius,
      };
    }
  }

  // Geocode location
  try {
    const geocoded = await getOrCacheGeocoding(normalizedLocation, async (loc: string) => {
      const result = await forwardGeocode(loc);
      return {
        address: result.address,
        latitude: result.lat,
        longitude: result.lon,
        provider: "nominatim",
      };
    });

    // Validate coordinates are in India
    if (!isWithinIndiaBounds(geocoded.latitude, geocoded.longitude)) {
      return null;
    }

    // Determine radius based on city
    const cityName = extractCityFromAddress(geocoded.address || normalizedLocation);
    const radius = getDefaultRadius(cityName);

    return {
      lat: geocoded.latitude,
      lng: geocoded.longitude,
      address: geocoded.address || normalizedLocation,
      source: "explicit",
      radius,
    };
  } catch (error) {
    console.error("Geocoding error for explicit location:", error);
    return null;
  }
}

/**
 * Resolve location from user profile
 * Priority 2: "Near me" → User profile location
 * 
 * If "near me" detected and user profile has location:
 * - Use user profile latitude/longitude
 * - Use user profile address
 * - Return with source: "profile"
 * - Check if location is stale (>30 days old)
 * 
 * If "near me" but no profile location:
 * - Return null (will trigger location setup modal)
 */
export function resolveLocationFromProfile(
  userProfile: {
    latitude?: number;
    longitude?: number;
    address?: string;
    locationLastUpdated?: number | null;
  } | null
): LocationResolutionResult | null {
  if (!userProfile) {
    return null;
  }

  // Check if user has location
  if (
    userProfile.latitude === undefined ||
    userProfile.longitude === undefined ||
    userProfile.latitude === null ||
    userProfile.longitude === null
  ) {
    return null; // No location - will trigger location setup modal
  }

  // Validate coordinates are in India
  if (!isWithinIndiaBounds(userProfile.latitude, userProfile.longitude)) {
    return null;
  }

  // Check if location is stale (>30 days old)
  // Still use it, but mark as stale so UI can show indicator
  const isStale = isLocationStale(userProfile.locationLastUpdated);

  // Determine radius based on city from address
  const cityName = userProfile.address ? extractCityFromAddress(userProfile.address) : undefined;
  const radius = getDefaultRadius(cityName);

  return {
    lat: userProfile.latitude,
    lng: userProfile.longitude,
    address: userProfile.address || "User location",
    source: "profile",
    radius,
    isStale, // Indicate if location is stale
  };
}

/**
 * Resolve location from browser geolocation
 * Priority 3: Browser geolocation (if available)
 * Note: Browser geolocation comes from frontend, not backend
 * 
 * If browser geolocation available in request:
 * - Use provided coordinates
 * - Reverse geocode to get address
 * - Return with source: "geolocation"
 */
async function resolveLocationFromGeolocation(
  request: NextRequest
): Promise<LocationResolutionResult | null> {
  // Check if geolocation coordinates are in headers (from client)
  const latHeader = request.headers.get("x-geolocation-lat");
  const lngHeader = request.headers.get("x-geolocation-lng");

  if (latHeader && lngHeader) {
    const lat = parseFloat(latHeader);
    const lng = parseFloat(lngHeader);

    if (isNaN(lat) || isNaN(lng)) {
      return null;
    }

    // Validate coordinates are in India
    if (!isWithinIndiaBounds(lat, lng)) {
      return null;
    }

    // Reverse geocode to get address
    let address = "Current location";
    try {
      const reverseGeocoded = await reverseGeocode(lat, lng);
      if (reverseGeocoded && reverseGeocoded.address) {
        address = reverseGeocoded.address;
      }
    } catch (error) {
      // If reverse geocoding fails, use default address
      console.warn("Reverse geocoding failed for browser geolocation:", error);
      // Continue with default address
    }

    // Determine radius based on city from address
    const cityName = extractCityFromAddress(address);
    const radius = getDefaultRadius(cityName);

    return {
      lat,
      lng,
      address,
      source: "geolocation",
      radius,
    };
  }

  return null;
}

/**
 * Resolve search location with priority logic
 * 
 * Priority order:
 * 1. Explicit location in query (from entities)
 * 2. "Near me" → User profile location
 * 3. Browser geolocation (if available)
 * 4. IP geolocation (fallback)
 * 
 * @param query - Search query string
 * @param entities - Extracted entities from query (may contain locations)
 * @param userProfile - User profile with location data
 * @param request - Next.js request object
 * @returns Resolved location or null if no location can be determined
 */
export async function resolveSearchLocation(
  query: string,
  entities: { locations?: string[] },
  userProfile: { latitude?: number; longitude?: number; address?: string } | null,
  request: NextRequest
): Promise<LocationResolutionResult | null> {
  // Priority 1: Explicit location in query (from entities)
  const explicitLocation = await extractExplicitLocation(entities);
  if (explicitLocation) {
    return explicitLocation;
  }

  // Check if query contains "near me" or similar phrases
  const isNearMe = detectNearMeKeywords(query);

  // Priority 2: "Near me" → User profile location
  if (isNearMe) {
    const profileLocation = resolveLocationFromProfile(userProfile);
    if (profileLocation) {
      return profileLocation;
    }
    // If "near me" but no profile location, return null
    // This will trigger location setup modal in the frontend
    return null;
  }

  // Priority 3: Browser geolocation (if available)
  const geolocation = await resolveLocationFromGeolocation(request);
  if (geolocation) {
    return geolocation;
  }

  // Priority 4: IP geolocation (fallback)
  const ipLocation = await getIPLocation(request);
  if (ipLocation) {
    return ipLocation;
  }

  // If user profile exists and no explicit location, use it as fallback
  // (Only if not a "near me" query, as that was already handled above)
  if (userProfile && !isNearMe) {
    const profileLocation = resolveLocationFromProfile(userProfile);
    if (profileLocation) {
      return profileLocation;
    }
  }

  // No location can be determined
  return null;
}

