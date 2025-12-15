/**
 * Location data schema definitions
 * Master schema for location structure and validation
 */

export interface Address {
  street?: string;
  area?: string;
  city: string;
  state: string;
  country: string;
  pinCode?: string;
  landmark?: string;
}

export interface Coordinates {
  latitude: number; // -90 to 90
  longitude: number; // -180 to 180
}

export interface Location {
  address: Address;
  normalizedAddress: string;
  coordinates: Coordinates;
  city: string; // Normalized city name
  state: string; // Normalized state name
  country: string; // Normalized country name
  pinCode?: string;
  timezone: string; // IANA format
  formattedAddress?: string; // Full formatted address string
}

export interface LocationAlias {
  alias: string; // Alternative name (e.g., "Bombay")
  canonical: string; // Canonical name (e.g., "Mumbai")
  type: "city" | "state" | "landmark" | "abbreviation";
  region?: string; // Regional context
}

export interface LocationBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface GeocodingResult {
  address: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
  city: string;
  state: string;
  country: string;
  pinCode?: string;
  timezone: string;
  provider: string; // Geocoding provider name
}

import { SchemaFieldDefinition } from "./business-schema";

/**
 * Location schema definition
 * Defines structure, validation rules, and normalization rules for location data
 */
export const locationSchema: Record<string, SchemaFieldDefinition> = {
  // Address fields
  "address.street": {
    type: "string",
    required: false,
    max: 200,
    normalize: true,
    description: "Street address",
  },

  "address.area": {
    type: "string",
    required: false,
    max: 100,
    normalize: true,
    description: "Area/neighborhood",
  },

  "address.city": {
    type: "string",
    required: true,
    max: 100,
    normalize: true,
    validate: "city",
    description: "City name (normalized)",
  },

  "address.state": {
    type: "string",
    required: true,
    max: 100,
    normalize: true,
    validate: "state",
    description: "State name (normalized)",
  },

  "address.country": {
    type: "string",
    required: true,
    default: "India",
    max: 100,
    normalize: true,
    description: "Country name",
  },

  "address.pinCode": {
    type: "string",
    required: false,
    format: "pincode",
    description: "PIN code (6 digits)",
  },

  "address.landmark": {
    type: "string",
    required: false,
    max: 200,
    description: "Landmark reference",
  },

  // Coordinates
  "coordinates.latitude": {
    type: "number",
    required: false,
    min: -90,
    max: 90,
    validate: "coordinates",
    description: "Latitude coordinate",
  },

  "coordinates.longitude": {
    type: "number",
    required: false,
    min: -180,
    max: 180,
    validate: "coordinates",
    description: "Longitude coordinate",
  },

  // Location fields
  normalizedAddress: {
    type: "string",
    required: true,
    normalize: true,
    max: 500,
    description: "Normalized address for search",
  },

  city: {
    type: "string",
    required: true,
    normalize: true,
    validate: "city",
    description: "Normalized city name",
  },

  state: {
    type: "string",
    required: true,
    normalize: true,
    validate: "state",
    description: "Normalized state name",
  },

  country: {
    type: "string",
    required: true,
    default: "India",
    normalize: true,
    description: "Normalized country name",
  },

  pinCode: {
    type: "string",
    required: false,
    format: "pincode",
    description: "PIN code",
  },

  timezone: {
    type: "string",
    required: true,
    default: "Asia/Kolkata",
    format: "timezone",
    description: "IANA timezone format",
  },

  formattedAddress: {
    type: "string",
    required: false,
    max: 500,
    description: "Full formatted address string",
  },
};

/**
 * Get required fields for location
 */
export function getLocationRequiredFields(): string[] {
  return Object.entries(locationSchema)
    .filter(([_, def]) => def.required)
    .map(([field]) => field);
}

