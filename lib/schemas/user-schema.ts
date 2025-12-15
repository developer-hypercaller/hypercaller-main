/**
 * User data schema definitions
 * Extends existing user schema with location tracking
 */

import { SchemaFieldDefinition } from "./business-schema";

export interface UserLocation {
  address?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  state?: string;
  country?: string;
  pinCode?: string;
  locationLastUpdated?: number; // Unix timestamp
}

export interface User {
  userId: string;
  username: string;
  firstName?: string;
  lastName?: string;
  phoneNumber: string;
  phoneVerified: boolean;
  passwordHash?: string;
  role: string;
  avatar?: string;
  accountStatus: string;
  createdAt: number;
  updatedAt: number;
  lastLoginAt?: number;
  location?: UserLocation;
  locationLastUpdated?: number; // Unix timestamp, nullable
}

/**
 * User schema definition
 * Defines structure, validation rules, and normalization rules for user data
 */
export const userSchema: Record<string, SchemaFieldDefinition> = {
  userId: {
    type: "string",
    required: true,
    format: "uuid",
    description: "Unique user identifier (UUID)",
  },

  username: {
    type: "string",
    required: true,
    min: 3,
    max: 50,
    normalize: true,
    validate: "username",
    description: "Username (normalized, lowercase)",
  },

  firstName: {
    type: "string",
    required: false,
    max: 100,
    normalize: true,
    description: "First name",
  },

  lastName: {
    type: "string",
    required: false,
    max: 100,
    normalize: true,
    description: "Last name",
  },

  phoneNumber: {
    type: "string",
    required: true,
    format: "E.164",
    normalize: true,
    validate: "phone",
    description: "Phone number in E.164 format",
  },

  phoneVerified: {
    type: "boolean",
    required: true,
    default: false,
    description: "Whether phone number is verified",
  },

  passwordHash: {
    type: "string",
    required: false,
    description: "Hashed password (not stored in client)",
  },

  role: {
    type: "string",
    required: true,
    default: "user",
    enum: ["user", "admin", "moderator", "business_owner"],
    description: "User role",
  },

  avatar: {
    type: "string",
    required: false,
    format: "url",
    description: "Avatar image URL",
  },

  accountStatus: {
    type: "string",
    required: true,
    default: "active",
    enum: ["active", "inactive", "suspended", "banned"],
    description: "Account status",
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

  lastLoginAt: {
    type: "number",
    required: false,
    min: 0,
    description: "Unix timestamp (milliseconds)",
  },

  // Location fields
  "location.address": {
    type: "string",
    required: false,
    max: 500,
    description: "User address",
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

  "location.pinCode": {
    type: "string",
    required: false,
    format: "pincode",
    description: "PIN code",
  },

  locationLastUpdated: {
    type: "number",
    required: false,
    min: 0,
    description: "Unix timestamp when location was last updated",
  },
};

/**
 * Get required fields for user
 */
export function getUserRequiredFields(): string[] {
  return Object.entries(userSchema)
    .filter(([_, def]) => def.required)
    .map(([field]) => field);
}

