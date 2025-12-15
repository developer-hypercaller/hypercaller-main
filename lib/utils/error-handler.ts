/**
 * Error handling utilities
 * Provides standardized error handling, error codes, and logging
 */

/**
 * Error codes enum
 * Maps error codes to standardized messages
 */
export enum ErrorCode {
  // Validation errors (400)
  VALIDATION_ERROR = "VALIDATION_ERROR",
  VALIDATION_INVALID_INPUT = "VALIDATION_INVALID_INPUT",
  VALIDATION_MISSING_FIELD = "VALIDATION_MISSING_FIELD",
  VALIDATION_INVALID_FORMAT = "VALIDATION_INVALID_FORMAT",
  VALIDATION_OUT_OF_RANGE = "VALIDATION_OUT_OF_RANGE",

  // Normalization errors (400)
  NORMALIZATION_ERROR = "NORMALIZATION_ERROR",
  NORMALIZATION_FAILED = "NORMALIZATION_FAILED",
  NORMALIZATION_INVALID_INPUT = "NORMALIZATION_INVALID_INPUT",

  // Mapping errors (400)
  MAPPING_ERROR = "MAPPING_ERROR",
  MAPPING_FAILED = "MAPPING_FAILED",
  MAPPING_INVALID_INPUT = "MAPPING_INVALID_INPUT",
  MAPPING_NOT_FOUND = "MAPPING_NOT_FOUND",

  // Database errors (500)
  DATABASE_ERROR = "DATABASE_ERROR",
  DATABASE_CONNECTION_ERROR = "DATABASE_CONNECTION_ERROR",
  DATABASE_QUERY_ERROR = "DATABASE_QUERY_ERROR",
  DATABASE_WRITE_ERROR = "DATABASE_WRITE_ERROR",
  DATABASE_READ_ERROR = "DATABASE_READ_ERROR",

  // Bedrock errors (500)
  BEDROCK_ERROR = "BEDROCK_ERROR",
  BEDROCK_CONNECTION_ERROR = "BEDROCK_CONNECTION_ERROR",
  BEDROCK_API_ERROR = "BEDROCK_API_ERROR",
  BEDROCK_TIMEOUT = "BEDROCK_TIMEOUT",
  BEDROCK_INVALID_RESPONSE = "BEDROCK_INVALID_RESPONSE",

  // Cache errors (500)
  CACHE_ERROR = "CACHE_ERROR",
  CACHE_CONNECTION_ERROR = "CACHE_CONNECTION_ERROR",
  CACHE_READ_ERROR = "CACHE_READ_ERROR",
  CACHE_WRITE_ERROR = "CACHE_WRITE_ERROR",

  // Not found errors (404)
  NOT_FOUND = "NOT_FOUND",
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",

  // Authentication errors (401)
  UNAUTHORIZED = "UNAUTHORIZED",
  AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",

  // Forbidden errors (403)
  FORBIDDEN = "FORBIDDEN",
  ACCESS_DENIED = "ACCESS_DENIED",

  // Internal errors (500)
  INTERNAL_ERROR = "INTERNAL_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Error code to message mapping
 * Supports future localization
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  // Validation errors
  [ErrorCode.VALIDATION_ERROR]: "Validation failed",
  [ErrorCode.VALIDATION_INVALID_INPUT]: "Invalid input provided",
  [ErrorCode.VALIDATION_MISSING_FIELD]: "Required field is missing",
  [ErrorCode.VALIDATION_INVALID_FORMAT]: "Invalid format",
  [ErrorCode.VALIDATION_OUT_OF_RANGE]: "Value is out of valid range",

  // Normalization errors
  [ErrorCode.NORMALIZATION_ERROR]: "Normalization failed",
  [ErrorCode.NORMALIZATION_FAILED]: "Failed to normalize input",
  [ErrorCode.NORMALIZATION_INVALID_INPUT]: "Invalid input for normalization",

  // Mapping errors
  [ErrorCode.MAPPING_ERROR]: "Mapping failed",
  [ErrorCode.MAPPING_FAILED]: "Failed to map input",
  [ErrorCode.MAPPING_INVALID_INPUT]: "Invalid input for mapping",
  [ErrorCode.MAPPING_NOT_FOUND]: "Mapping not found",

  // Database errors
  [ErrorCode.DATABASE_ERROR]: "Database operation failed",
  [ErrorCode.DATABASE_CONNECTION_ERROR]: "Failed to connect to database",
  [ErrorCode.DATABASE_QUERY_ERROR]: "Database query failed",
  [ErrorCode.DATABASE_WRITE_ERROR]: "Failed to write to database",
  [ErrorCode.DATABASE_READ_ERROR]: "Failed to read from database",

  // Bedrock errors
  [ErrorCode.BEDROCK_ERROR]: "Bedrock operation failed",
  [ErrorCode.BEDROCK_CONNECTION_ERROR]: "Failed to connect to Bedrock",
  [ErrorCode.BEDROCK_API_ERROR]: "Bedrock API error",
  [ErrorCode.BEDROCK_TIMEOUT]: "Bedrock request timeout",
  [ErrorCode.BEDROCK_INVALID_RESPONSE]: "Invalid response from Bedrock",

  // Cache errors
  [ErrorCode.CACHE_ERROR]: "Cache operation failed",
  [ErrorCode.CACHE_CONNECTION_ERROR]: "Failed to connect to cache",
  [ErrorCode.CACHE_READ_ERROR]: "Failed to read from cache",
  [ErrorCode.CACHE_WRITE_ERROR]: "Failed to write to cache",

  // Not found errors
  [ErrorCode.NOT_FOUND]: "Resource not found",
  [ErrorCode.RESOURCE_NOT_FOUND]: "The requested resource was not found",

  // Authentication errors
  [ErrorCode.UNAUTHORIZED]: "Unauthorized access",
  [ErrorCode.AUTHENTICATION_FAILED]: "Authentication failed",

  // Forbidden errors
  [ErrorCode.FORBIDDEN]: "Access forbidden",
  [ErrorCode.ACCESS_DENIED]: "Access denied",

  // Internal errors
  [ErrorCode.INTERNAL_ERROR]: "Internal server error",
  [ErrorCode.UNKNOWN_ERROR]: "An unknown error occurred",
};

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCode | string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Get error message (supports localization in future)
   */
  getErrorMessage(): string {
    if (typeof this.code === "string" && this.code in ErrorMessages) {
      return ErrorMessages[this.code as ErrorCode];
    }
    return this.message;
  }
}

/**
 * Validation error
 * Thrown when input validation fails
 */
export class ValidationError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.VALIDATION_ERROR, details?: any) {
    super(message, code, 400, details);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Normalization error
 * Thrown when normalization fails
 */
export class NormalizationError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.NORMALIZATION_ERROR, details?: any) {
    super(message, code, 400, details);
    this.name = "NormalizationError";
    Object.setPrototypeOf(this, NormalizationError.prototype);
  }
}

/**
 * Mapping error
 * Thrown when mapping fails
 */
export class MappingError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.MAPPING_ERROR, details?: any) {
    super(message, code, 400, details);
    this.name = "MappingError";
    Object.setPrototypeOf(this, MappingError.prototype);
  }
}

/**
 * Database error
 * Thrown when database operations fail
 */
export class DatabaseError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.DATABASE_ERROR, details?: any) {
    super(message, code, 500, details);
    this.name = "DatabaseError";
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * Bedrock error
 * Thrown when Bedrock operations fail
 */
export class BedrockError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.BEDROCK_ERROR, details?: any) {
    super(message, code, 500, details);
    this.name = "BedrockError";
    Object.setPrototypeOf(this, BedrockError.prototype);
  }
}

/**
 * Cache error
 * Thrown when cache operations fail
 */
export class CacheError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.CACHE_ERROR, details?: any) {
    super(message, code, 500, details);
    this.name = "CacheError";
    Object.setPrototypeOf(this, CacheError.prototype);
  }
}

/**
 * Not found error
 * Thrown when a resource is not found
 */
export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found", details?: any) {
    super(message, ErrorCode.NOT_FOUND, 404, details);
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Error response format for API
 */
export interface ErrorResponse {
  error: string;
  code: string;
  statusCode: number;
  details?: any;
  timestamp?: string;
}

/**
 * Format error for API response
 * Creates standardized error response format
 */
export function formatError(error: Error | AppError, includeTimestamp: boolean = false): ErrorResponse {
  const response: ErrorResponse = {
    error: error.message || "Internal server error",
    code: ErrorCode.INTERNAL_ERROR,
    statusCode: 500,
  };

  // Check if it's an AppError instance or has AppError properties (for cross-module compatibility)
  const isAppError = error instanceof AppError || 
    (error as any).statusCode !== undefined && 
    (error as any).code !== undefined &&
    typeof (error as any).getErrorMessage === "function";

  if (isAppError) {
    const appError = error as AppError;
    response.error = appError.getErrorMessage();
    response.code = typeof appError.code === "string" ? appError.code : appError.code;
    response.statusCode = appError.statusCode;
    if (appError.details) {
      response.details = appError.details;
    }
  } else {
    // For non-AppError errors, try to extract useful information
    response.error = error.message || ErrorMessages[ErrorCode.INTERNAL_ERROR];
    response.code = ErrorCode.INTERNAL_ERROR;
    response.statusCode = 500;

    // Add stack trace in development
    if (process.env.NODE_ENV === "development" && error.stack) {
      response.details = { stack: error.stack };
    }
  }

  if (includeTimestamp) {
    response.timestamp = new Date().toISOString();
  }

  return response;
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: Error | AppError, context?: Record<string, any>): Record<string, any> {
  const logData: Record<string, any> = {
    name: error.name,
    message: error.message,
    ...context,
  };

  if (error instanceof AppError) {
    logData.code = error.code;
    logData.statusCode = error.statusCode;
    if (error.details) {
      logData.details = error.details;
    }
  }

  if (error.stack) {
    logData.stack = error.stack;
  }

  return logData;
}

/**
 * Log error
 * Logs error with context information
 */
export function logError(error: Error | AppError, context?: Record<string, any>): void {
  const errorInfo = formatErrorForLogging(error, context);

  // In production, you would send this to a logging service (e.g., CloudWatch, Sentry)
  if (error instanceof AppError && error.statusCode >= 500) {
    // Server errors - log with full details
    console.error("[ERROR]", errorInfo);
  } else if (error instanceof AppError) {
    // Client errors - log with less detail
    console.warn("[WARN]", {
      code: errorInfo.code,
      message: errorInfo.message,
      ...context,
    });
  } else {
    // Unknown errors - log with full details
    console.error("[ERROR]", errorInfo);
  }
}

/**
 * Get error message by code
 * Supports future localization
 */
export function getErrorMessage(code: ErrorCode | string, locale: string = "en"): string {
  if (typeof code === "string" && code in ErrorMessages) {
    return ErrorMessages[code as ErrorCode];
  }
  return ErrorMessages[ErrorCode.UNKNOWN_ERROR];
}

/**
 * Handle async errors
 */
export function asyncHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T
): T {
  return ((...args: any[]) => {
    return Promise.resolve(fn(...args)).catch((error) => {
      logError(error, { function: fn.name, args });
      throw error;
    });
  }) as T;
}

