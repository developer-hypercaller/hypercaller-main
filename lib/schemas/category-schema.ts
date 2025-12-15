/**
 * Category taxonomy schema definitions
 * Master schema for category structure and validation
 */

import { SchemaFieldDefinition } from "./business-schema";

/**
 * Category interface
 */
export interface Category {
  id: string; // Unique category ID
  name: string; // Display name
  displayName: string; // Localized display name
  synonyms: string[]; // Alternative names and search terms
  subcategories?: string[]; // Subcategory IDs
  parentId?: string; // Parent category ID if this is a subcategory
  indianTerms?: string[]; // Indian-specific terms (dhaba, kirana, etc.)
  icon?: string; // Icon identifier
  order?: number; // Display order
}

export interface CategoryTaxonomy {
  categories: Map<string, Category>;
  categoryHierarchy: Map<string, string[]>; // categoryId -> subcategoryIds
  synonymMap: Map<string, string>; // synonym -> categoryId
  indianTermMap: Map<string, string>; // indianTerm -> categoryId
}

export type CategoryId = string;

/**
 * Category schema definition
 * Defines structure, validation rules, and normalization rules for category data
 */
export const categorySchema: Record<string, SchemaFieldDefinition> = {
  id: {
    type: "string",
    required: true,
    normalize: true,
    validate: "categoryId",
    description: "Unique category ID (lowercase, no spaces)",
  },

  name: {
    type: "string",
    required: true,
    max: 100,
    description: "Display name",
  },

  displayName: {
    type: "string",
    required: true,
    max: 200,
    description: "Localized display name",
  },

  synonyms: {
    type: "array",
    required: true,
    min: 1,
    description: "Array of alternative names and search terms",
  },

  subcategories: {
    type: "array",
    required: false,
    validate: "subcategoryIds",
    description: "Array of subcategory IDs",
  },

  parentId: {
    type: "string",
    required: false,
    validate: "categoryId",
    description: "Parent category ID if this is a subcategory",
  },

  indianTerms: {
    type: "array",
    required: false,
    description: "Array of Indian-specific terms",
  },

  icon: {
    type: "string",
    required: false,
    max: 50,
    description: "Icon identifier",
  },

  order: {
    type: "number",
    required: false,
    min: 0,
    description: "Display order",
  },
};

/**
 * Get required fields for category
 */
export function getCategoryRequiredFields(): string[] {
  return Object.entries(categorySchema)
    .filter(([_, def]) => def.required)
    .map(([field]) => field);
}

