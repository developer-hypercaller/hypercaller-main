/**
 * Central schema validation
 * Validates data against schemas with comprehensive error reporting
 */

import { businessSchema, SchemaFieldDefinition } from "./business-schema";
import { categorySchema } from "./category-schema";
import { locationSchema } from "./location-schema";
import { userSchema } from "./user-schema";
import { searchQuerySchema } from "./search-schema";
import { filterSchema } from "./filter-schema";

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Schema registry
 */
const schemaRegistry: Record<string, Record<string, SchemaFieldDefinition>> = {
  business: businessSchema,
  category: categorySchema,
  location: locationSchema,
  user: userSchema,
  search: searchQuerySchema,
  filter: filterSchema,
};

/**
 * Get schema by name
 */
function getSchema(schemaName: string): Record<string, SchemaFieldDefinition> | undefined {
  return schemaRegistry[schemaName.toLowerCase()];
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  const parts = path.split(".");
  let value = obj;
  for (const part of parts) {
    if (value === null || value === undefined) {
      return undefined;
    }
    value = value[part];
  }
  return value;
}

/**
 * Set nested value in object using dot notation
 */
function setNestedValue(obj: any, path: string, value: any): void {
  const parts = path.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

/**
 * Validate format
 */
function validateFormat(value: any, format: string): boolean {
  if (typeof value !== "string") {
    return false;
  }

  switch (format) {
    case "uuid":
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    case "E.164":
      return /^\+[1-9]\d{1,14}$/.test(value);
    case "url":
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    case "pincode":
      return /^\d{6}$/.test(value);
    case "timezone":
      // Basic IANA timezone validation
      return /^[A-Z][a-z]+\/[A-Z][a-z_]+$/.test(value);
    case "time":
      return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(value);
    default:
      return true; // Unknown format, skip validation
  }
}

/**
 * Validate type
 */
function validateType(value: any, expectedType: string): boolean {
  switch (expectedType) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && !isNaN(value);
    case "boolean":
      return typeof value === "boolean";
    case "array":
      return Array.isArray(value);
    case "object":
      return typeof value === "object" && value !== null && !Array.isArray(value);
    default:
      return true;
  }
}

/**
 * Validate enum
 */
function validateEnum(value: any, enumValues: string[]): boolean {
  return enumValues.includes(value);
}

/**
 * Validate precision for numbers
 */
function validatePrecision(value: number, precision: number): boolean {
  const decimalPlaces = (value.toString().split(".")[1] || "").length;
  return decimalPlaces <= precision;
}

/**
 * Validate data against schema
 */
export function validateData(schemaName: string, data: any): ValidationResult {
  const schema = getSchema(schemaName);
  const errors: ValidationError[] = [];

  if (!schema) {
    return {
      valid: false,
      errors: [
        {
          field: "schema",
          message: `Unknown schema: ${schemaName}`,
          code: "UNKNOWN_SCHEMA",
        },
      ],
    };
  }

  if (!data || typeof data !== "object") {
    return {
      valid: false,
      errors: [
        {
          field: "data",
          message: "Data must be an object",
          code: "INVALID_DATA_TYPE",
        },
      ],
    };
  }

  // Validate each field in schema
  for (const [fieldPath, fieldDef] of Object.entries(schema)) {
    const value = getNestedValue(data, fieldPath);
    const isPresent = value !== undefined && value !== null;

    // Check required fields
    if (fieldDef.required && !isPresent) {
      errors.push({
        field: fieldPath,
        message: `Field '${fieldPath}' is required`,
        code: "REQUIRED_FIELD_MISSING",
      });
      continue; // Skip further validation if required field is missing
    }

    // Skip validation if field is optional and not present
    if (!fieldDef.required && !isPresent) {
      // Apply default value if provided
      if (fieldDef.default !== undefined) {
        setNestedValue(data, fieldPath, fieldDef.default);
      }
      continue;
    }

    // Type validation
    if (isPresent && !validateType(value, fieldDef.type)) {
      errors.push({
        field: fieldPath,
        message: `Field '${fieldPath}' must be of type '${fieldDef.type}', got '${typeof value}'`,
        code: "INVALID_TYPE",
      });
      continue; // Skip further validation if type is wrong
    }

    // Format validation
    if (isPresent && fieldDef.format && typeof value === "string") {
      if (!validateFormat(value, fieldDef.format)) {
        errors.push({
          field: fieldPath,
          message: `Field '${fieldPath}' must match format '${fieldDef.format}'`,
          code: "INVALID_FORMAT",
        });
      }
    }

    // Enum validation
    if (isPresent && fieldDef.enum) {
      if (!validateEnum(value, fieldDef.enum)) {
        errors.push({
          field: fieldPath,
          message: `Field '${fieldPath}' must be one of: ${fieldDef.enum.join(", ")}`,
          code: "INVALID_ENUM",
        });
      }
    }

    // Min/Max validation for strings and arrays
    if (isPresent && (fieldDef.type === "string" || fieldDef.type === "array")) {
      const length = typeof value === "string" ? value.length : Array.isArray(value) ? value.length : 0;
      if (fieldDef.min !== undefined && length < fieldDef.min) {
        errors.push({
          field: fieldPath,
          message: `Field '${fieldPath}' must have minimum length of ${fieldDef.min}`,
          code: "MIN_LENGTH_VIOLATION",
        });
      }
      if (fieldDef.max !== undefined && length > fieldDef.max) {
        errors.push({
          field: fieldPath,
          message: `Field '${fieldPath}' must have maximum length of ${fieldDef.max}`,
          code: "MAX_LENGTH_VIOLATION",
        });
      }
    }

    // Min/Max validation for numbers
    if (isPresent && fieldDef.type === "number" && typeof value === "number") {
      if (fieldDef.min !== undefined && value < fieldDef.min) {
        errors.push({
          field: fieldPath,
          message: `Field '${fieldPath}' must be at least ${fieldDef.min}`,
          code: "MIN_VALUE_VIOLATION",
        });
      }
      if (fieldDef.max !== undefined && value > fieldDef.max) {
        errors.push({
          field: fieldPath,
          message: `Field '${fieldPath}' must be at most ${fieldDef.max}`,
          code: "MAX_VALUE_VIOLATION",
        });
      }

      // Precision validation
      if (fieldDef.precision !== undefined && !validatePrecision(value, fieldDef.precision)) {
        errors.push({
          field: fieldPath,
          message: `Field '${fieldPath}' must have at most ${fieldDef.precision} decimal places`,
          code: "PRECISION_VIOLATION",
        });
      }
    }

    // Note: Custom validation functions (validate: "category", etc.) are noted but not executed
    // These would be implemented separately in validation modules
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate business data
 */
export function validateBusiness(data: any): ValidationResult {
  return validateData("business", data);
}

/**
 * Validate category data
 */
export function validateCategory(data: any): ValidationResult {
  return validateData("category", data);
}

/**
 * Validate location data
 */
export function validateLocation(data: any): ValidationResult {
  return validateData("location", data);
}

/**
 * Validate user data
 */
export function validateUser(data: any): ValidationResult {
  return validateData("user", data);
}

/**
 * Validate search query data
 */
export function validateSearchQuery(data: any): ValidationResult {
  return validateData("search", data);
}

/**
 * Validate filter data
 */
export function validateFilter(data: any): ValidationResult {
  return validateData("filter", data);
}

// Re-export schemas
export * from "./business-schema";
export * from "./category-schema";
export * from "./location-schema";
export * from "./user-schema";
export * from "./search-schema";
export * from "./filter-schema";

