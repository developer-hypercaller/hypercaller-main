/**
 * Filter schema definitions
 * Master schema for search filter structure and validation
 */

export interface PriceRangeFilter {
  values: ("$" | "$$" | "$$$" | "$$$$")[];
}

export interface RatingFilter {
  min?: number; // 0.0-5.0
  max?: number; // 0.0-5.0
}

export interface DistanceFilter {
  max?: number; // Maximum distance in meters
  unit?: "meters" | "kilometers" | "miles";
}

export interface HoursFilter {
  openNow?: boolean;
  dayOfWeek?: string; // "monday", "tuesday", etc.
  time?: string; // "HH:mm" format
}

export interface SearchFilters {
  // Category filters
  categories?: string[]; // Category IDs
  subcategories?: string[]; // Subcategory IDs

  // Price range
  priceRange?: PriceRangeFilter;

  // Rating
  rating?: RatingFilter;

  // Distance
  distance?: DistanceFilter;

  // Amenities
  amenities?: string[]; // Standardized amenity names

  // Status
  isVerified?: boolean;
  status?: ("active" | "inactive" | "pending" | "suspended")[];

  // Hours
  hours?: HoursFilter;

  // Location-based
  city?: string[];
  state?: string[];
  country?: string[];

  // Custom filters
  [key: string]: any;
}

export interface FilterOptions {
  categories: string[];
  priceRanges: ("$" | "$$" | "$$$" | "$$$$")[];
  amenities: string[];
  ratingRange: {
    min: number;
    max: number;
  };
  distanceOptions: number[]; // Predefined distance options in meters
}

import { SchemaFieldDefinition } from "./business-schema";
import { getAllPriceRanges } from "../data/price-ranges";
import { getAllStatuses } from "../data/status-values";

/**
 * Filter schema definition
 * Defines structure, validation rules, and normalization rules for search filters
 */
export const filterSchema: Record<string, SchemaFieldDefinition> = {
  // Category filters
  categories: {
    type: "array",
    required: false,
    validate: "categoryIds",
    description: "Array of category IDs",
  },

  subcategories: {
    type: "array",
    required: false,
    validate: "subcategoryIds",
    description: "Array of subcategory IDs",
  },

  // Price range filter
  "priceRange.values": {
    type: "array",
    required: false,
    validate: "priceRanges",
    description: "Array of price range values",
  },

  // Rating filter
  "rating.min": {
    type: "number",
    required: false,
    min: 0,
    max: 5,
    precision: 1,
    description: "Minimum rating (0.0-5.0)",
  },

  "rating.max": {
    type: "number",
    required: false,
    min: 0,
    max: 5,
    precision: 1,
    description: "Maximum rating (0.0-5.0)",
  },

  // Distance filter
  "distance.max": {
    type: "number",
    required: false,
    min: 0,
    max: 50000,
    description: "Maximum distance in meters",
  },

  "distance.unit": {
    type: "string",
    required: false,
    enum: ["meters", "kilometers", "miles"],
    default: "meters",
    description: "Distance unit",
  },

  // Amenities filter
  amenities: {
    type: "array",
    required: false,
    validate: "amenities",
    description: "Array of standardized amenity names",
  },

  // Status filter
  isVerified: {
    type: "boolean",
    required: false,
    description: "Filter by verification status",
  },

  status: {
    type: "array",
    required: false,
    enum: getAllStatuses(),
    description: "Array of status values",
  },

  // Hours filter
  "hours.openNow": {
    type: "boolean",
    required: false,
    description: "Filter businesses open now",
  },

  "hours.dayOfWeek": {
    type: "string",
    required: false,
    enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    description: "Day of week",
  },

  "hours.time": {
    type: "string",
    required: false,
    format: "time",
    description: "Time in HH:mm format",
  },

  // Location-based filters
  city: {
    type: "array",
    required: false,
    validate: "cities",
    description: "Array of city names",
  },

  state: {
    type: "array",
    required: false,
    validate: "states",
    description: "Array of state names",
  },

  country: {
    type: "array",
    required: false,
    description: "Array of country names",
  },
};

/**
 * Get required fields for filter
 */
export function getFilterRequiredFields(): string[] {
  return Object.entries(filterSchema)
    .filter(([_, def]) => def.required)
    .map(([field]) => field);
}

