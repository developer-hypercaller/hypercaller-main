/**
 * Search query schema definitions
 * Master schema for search query structure and validation
 */

import { SearchFilters } from "./filter-schema";

export interface SearchLocation {
  lat?: number;
  lng?: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  source: "user" | "ip" | "gps" | "manual"; // How location was determined
  radius?: number; // Search radius in meters
}

// Re-export SearchFilters from filter-schema for convenience
export type { SearchFilters };

export interface SearchQuery {
  query: string; // Original query text
  normalizedQuery: string; // Normalized query text
  intent?: "find" | "discover" | "compare" | "explore"; // Standardized intent
  category?: string; // Detected category ID
  location?: SearchLocation;
  filters?: SearchFilters;
  userId?: string; // Nullable for anonymous searches
  sessionId?: string; // Nullable
  timestamp: number; // Unix timestamp
}

export interface SearchResult {
  businessId: string;
  score: number; // Relevance score
  distance?: number; // Distance in meters if location provided
  matchReason?: string; // Why this result matched
}

export interface SearchResponse {
  query: SearchQuery;
  results: SearchResult[];
  totalCount: number;
  responseTime: number; // Milliseconds
  searchType: "semantic" | "keyword" | "hybrid";
  filtersApplied: SearchFilters;
}

export type SearchIntent = SearchQuery["intent"];

import { SchemaFieldDefinition } from "./business-schema";

/**
 * Search query schema definition
 * Defines structure, validation rules, and normalization rules for search queries
 */
export const searchQuerySchema: Record<string, SchemaFieldDefinition> = {
  query: {
    type: "string",
    required: true,
    min: 1,
    max: 500,
    description: "Original query text",
  },

  normalizedQuery: {
    type: "string",
    required: true,
    normalize: true,
    max: 500,
    description: "Normalized query text for search",
  },

  intent: {
    type: "string",
    required: false,
    enum: ["find", "discover", "compare", "explore"],
    description: "Standardized search intent",
  },

  category: {
    type: "string",
    required: false,
    validate: "category",
    description: "Detected category ID",
  },

  // Location fields
  "location.lat": {
    type: "number",
    required: false,
    min: -90,
    max: 90,
    validate: "coordinates",
    description: "Latitude coordinate",
  },

  "location.lng": {
    type: "number",
    required: false,
    min: -180,
    max: 180,
    validate: "coordinates",
    description: "Longitude coordinate",
  },

  "location.address": {
    type: "string",
    required: false,
    max: 500,
    description: "Address string",
  },

  "location.city": {
    type: "string",
    required: false,
    normalize: true,
    validate: "city",
    description: "City name",
  },

  "location.state": {
    type: "string",
    required: false,
    normalize: true,
    validate: "state",
    description: "State name",
  },

  "location.country": {
    type: "string",
    required: false,
    normalize: true,
    description: "Country name",
  },

  "location.source": {
    type: "string",
    required: true,
    enum: ["user", "ip", "gps", "manual"],
    description: "How location was determined",
  },

  "location.radius": {
    type: "number",
    required: false,
    min: 0,
    max: 50000,
    description: "Search radius in meters",
  },

  userId: {
    type: "string",
    required: false,
    format: "uuid",
    description: "User ID (nullable for anonymous searches)",
  },

  sessionId: {
    type: "string",
    required: false,
    format: "uuid",
    description: "Session ID",
  },

  timestamp: {
    type: "number",
    required: true,
    min: 0,
    description: "Unix timestamp (milliseconds)",
  },
};

/**
 * Get required fields for search query
 */
export function getSearchQueryRequiredFields(): string[] {
  return Object.entries(searchQuerySchema)
    .filter(([_, def]) => def.required)
    .map(([field]) => field);
}

