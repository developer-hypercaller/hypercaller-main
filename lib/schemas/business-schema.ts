/**
 * Business data schema definitions
 * Master schema for business data structure, validation, and normalization rules
 */

import { getAllCategories } from "../data/categories";
import { getAllPriceRanges } from "../data/price-ranges";
import { getAllStatuses } from "../data/status-values";

/**
 * Business type definitions
 */
export interface BusinessLocation {
  address: string;
  normalizedAddress: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
  pinCode?: string;
  timezone: string; // IANA format, default: Asia/Kolkata
}

export interface BusinessContact {
  phone?: string; // E.164 format
  email?: string;
  website?: string;
}

export interface BusinessHours {
  [day: string]: {
    open?: string; // HH:mm format
    close?: string; // HH:mm format
    isClosed?: boolean;
  };
}

export interface SpecialHours {
  date: string; // YYYY-MM-DD
  hours: BusinessHours | { isClosed: true };
  reason?: string;
}

export interface Business {
  // Primary key
  businessId: string;

  // Basic info
  name: string;
  normalizedName: string; // For search
  description?: string;
  category: string; // Standardized category ID
  subcategory?: string;
  tags?: string[];

  // Location
  location: BusinessLocation;

  // Contact
  contact: BusinessContact;

  // Business info
  rating?: number; // 0.0-5.0, 1 decimal precision
  reviewCount?: number;
  priceRange?: "$" | "$$" | "$$$" | "$$$$";
  amenities?: string[]; // Standardized amenity names

  // Hours
  businessHours: BusinessHours;
  specialHours?: SpecialHours[];

  // Media
  images?: string[];
  logo?: string;

  // Status
  status: "active" | "inactive" | "pending" | "suspended";
  isVerified: boolean;

  // Metadata
  ownerId?: string;
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
  lastVerifiedAt?: number; // Unix timestamp
  embeddingVersion?: string;
}

export type BusinessStatus = Business["status"];
export type PriceRange = Business["priceRange"];

/**
 * Schema field definition structure
 */
export interface SchemaFieldDefinition {
  type: string; // 'string', 'number', 'boolean', 'object', 'array', etc.
  required: boolean; // Is field required?
  format?: string; // Special format (e.g., 'uuid', 'email', 'E.164', 'url')
  enum?: string[]; // Valid values
  min?: number; // Minimum value/length
  max?: number; // Maximum value/length
  precision?: number; // Decimal precision for numbers
  normalize?: boolean; // Should this be normalized?
  validate?: string; // Custom validation function name
  default?: any; // Default value
  description?: string; // Field description
}

/**
 * Business schema definition
 * Defines structure, validation rules, and normalization rules for business data
 */
export const businessSchema: Record<string, SchemaFieldDefinition> = {
  // Primary key
  businessId: {
    type: "string",
    required: true,
    format: "uuid",
    description: "Unique business identifier (UUID)",
  },

  // Basic info
  name: {
    type: "string",
    required: true,
    max: 200,
    normalize: true,
    description: "Business name",
  },

  normalizedName: {
    type: "string",
    required: true,
    normalize: true,
    description: "Normalized business name for search",
  },

  description: {
    type: "string",
    required: false,
    max: 2000,
    description: "Business description",
  },

  category: {
    type: "string",
    required: true,
    enum: getAllCategories().map((cat) => cat.id),
    validate: "category",
    description: "Standardized category ID",
  },

  subcategory: {
    type: "string",
    required: false,
    validate: "subcategory",
    description: "Subcategory ID (must be valid for parent category)",
  },

  tags: {
    type: "array",
    required: false,
    description: "Array of tag strings",
  },

  // Location
  location: {
    type: "object",
    required: true,
    validate: "address",
    description: "Business location object",
  },

  // Location sub-fields (for nested validation)
  "location.address": {
    type: "string",
    required: true,
    max: 500,
    description: "Street address",
  },

  "location.normalizedAddress": {
    type: "string",
    required: true,
    normalize: true,
    description: "Normalized address for search",
  },

  "location.latitude": {
    type: "number",
    required: false,
    min: -90,
    max: 90,
    validate: "coordinates",
    description: "Latitude coordinate",
  },

  "location.longitude": {
    type: "number",
    required: false,
    min: -180,
    max: 180,
    validate: "coordinates",
    description: "Longitude coordinate",
  },

  "location.city": {
    type: "string",
    required: true,
    normalize: true,
    validate: "city",
    description: "City name (normalized)",
  },

  "location.state": {
    type: "string",
    required: true,
    normalize: true,
    validate: "state",
    description: "State name (normalized)",
  },

  "location.country": {
    type: "string",
    required: true,
    default: "India",
    normalize: true,
    description: "Country name",
  },

  "location.pinCode": {
    type: "string",
    required: false,
    format: "pincode",
    description: "PIN code (6 digits)",
  },

  "location.timezone": {
    type: "string",
    required: false,
    default: "Asia/Kolkata",
    format: "timezone",
    description: "IANA timezone format",
  },

  // Contact
  contact: {
    type: "object",
    required: false,
    description: "Business contact information",
  },

  "contact.phone": {
    type: "string",
    required: false,
    format: "E.164",
    normalize: true,
    description: "Phone number in E.164 format",
  },

  "contact.email": {
    type: "string",
    required: false,
    format: "email",
    description: "Email address",
  },

  "contact.website": {
    type: "string",
    required: false,
    format: "url",
    description: "Website URL",
  },

  // Business info
  rating: {
    type: "number",
    required: false,
    min: 0,
    max: 5,
    precision: 1,
    description: "Average rating (0.0-5.0)",
  },

  reviewCount: {
    type: "number",
    required: false,
    min: 0,
    description: "Number of reviews",
  },

  priceRange: {
    type: "string",
    required: false,
    enum: getAllPriceRanges(),
    description: "Price range indicator",
  },

  amenities: {
    type: "array",
    required: false,
    description: "Array of standardized amenity names",
  },

  // Hours
  businessHours: {
    type: "object",
    required: true,
    validate: "businessHours",
    description: "Business operating hours",
  },

  specialHours: {
    type: "array",
    required: false,
    validate: "specialHours",
    description: "Special hours for holidays/events",
  },

  // Media
  images: {
    type: "array",
    required: false,
    description: "Array of image URLs",
  },

  logo: {
    type: "string",
    required: false,
    format: "url",
    description: "Logo image URL",
  },

  // Status
  status: {
    type: "string",
    required: true,
    enum: getAllStatuses(),
    description: "Business status",
  },

  isVerified: {
    type: "boolean",
    required: true,
    default: false,
    description: "Whether business is verified",
  },

  // Metadata
  ownerId: {
    type: "string",
    required: false,
    format: "uuid",
    description: "Owner user ID",
  },

  createdAt: {
    type: "number",
    required: true,
    min: 0,
    description: "Unix timestamp (milliseconds)",
  },

  updatedAt: {
    type: "number",
    required: true,
    min: 0,
    description: "Unix timestamp (milliseconds)",
  },

  lastVerifiedAt: {
    type: "number",
    required: false,
    min: 0,
    description: "Unix timestamp (milliseconds)",
  },

  embeddingVersion: {
    type: "string",
    required: false,
    description: "Version of embedding model used",
  },
};

/**
 * Get required fields
 */
export function getRequiredFields(): string[] {
  return Object.entries(businessSchema)
    .filter(([_, def]) => def.required)
    .map(([field]) => field);
}

/**
 * Get fields that should be normalized
 */
export function getNormalizedFields(): string[] {
  return Object.entries(businessSchema)
    .filter(([_, def]) => def.normalize)
    .map(([field]) => field);
}

/**
 * Get fields with validation functions
 */
export function getValidatedFields(): string[] {
  return Object.entries(businessSchema)
    .filter(([_, def]) => def.validate)
    .map(([field]) => field);
}

/**
 * Get field definition
 */
export function getFieldDefinition(fieldName: string): SchemaFieldDefinition | undefined {
  return businessSchema[fieldName];
}

/**
 * Check if field is required
 */
export function isFieldRequired(fieldName: string): boolean {
  const field = businessSchema[fieldName];
  return field?.required ?? false;
}

/**
 * Check if field should be normalized
 */
export function shouldNormalizeField(fieldName: string): boolean {
  const field = businessSchema[fieldName];
  return field?.normalize ?? false;
}

/**
 * Get validation function name for field
 */
export function getValidationFunction(fieldName: string): string | undefined {
  const field = businessSchema[fieldName];
  return field?.validate;
}

// Types are already exported above
