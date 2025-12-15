/**
 * Fallback handler for Bedrock API failures
 * Provides graceful degradation with multiple fallback strategies
 */

import { searchBusinessesByName } from "../search/keyword-search";
import { Business } from "../schemas/business-schema";

/**
 * Fallback usage log entry
 */
interface FallbackLog {
  timestamp: number;
  error: string;
  fallbackType: string;
  query?: string;
}

// In-memory fallback log (in production, use proper logging service)
const fallbackLogs: FallbackLog[] = [];
const MAX_LOG_ENTRIES = 1000;

/**
 * Log fallback usage
 */
function logFallback(error: string, fallbackType: string, query?: string): void {
  fallbackLogs.push({
    timestamp: Date.now(),
    error,
    fallbackType,
    query,
  });

  // Keep only recent logs
  if (fallbackLogs.length > MAX_LOG_ENTRIES) {
    fallbackLogs.shift();
  }

  console.warn(`[FallbackHandler] Using ${fallbackType} fallback: ${error}`);
}

/**
 * Handle Bedrock API errors with fallback
 */
export async function withFallback<T>(
  fn: () => Promise<T>,
  fallback: () => T | Promise<T>,
  options?: { logError?: boolean; fallbackType?: string }
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    const fallbackType = options?.fallbackType || "default";

    if (options?.logError !== false) {
      logFallback(errorMessage, fallbackType);
    }

    // Return fallback value
    return await fallback();
  }
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;

  const errorMessage = error.message?.toLowerCase() || "";
  const errorCode = error.code || error.name || "";

  // Retryable errors
  const retryablePatterns = [
    "throttling",
    "rate limit",
    "too many requests",
    "service unavailable",
    "timeout",
    "network",
    "connection",
    "temporary",
  ];

  return (
    retryablePatterns.some(
      (pattern) =>
        errorMessage.includes(pattern) || errorCode.toLowerCase().includes(pattern)
    ) ||
    errorCode === "ThrottlingException" ||
    errorCode === "ServiceUnavailableException" ||
    errorCode === "TimeoutException"
  );
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (!isRetryableError(error) || attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Detect Bedrock failure type
 */
export function detectBedrockFailure(error: any): {
  type: "timeout" | "rate_limit" | "api_error" | "unknown";
  retryable: boolean;
} {
  if (!error) {
    return { type: "unknown", retryable: false };
  }

  const errorMessage = error.message?.toLowerCase() || "";
  const errorCode = error.code || error.name || "";

  // Timeout errors
  if (
    errorMessage.includes("timeout") ||
    errorCode === "TimeoutException" ||
    errorCode === "RequestTimeoutException"
  ) {
    return { type: "timeout", retryable: true };
  }

  // Rate limit errors
  if (
    errorMessage.includes("throttling") ||
    errorMessage.includes("rate limit") ||
    errorMessage.includes("too many requests") ||
    errorCode === "ThrottlingException" ||
    errorCode === "TooManyRequestsException"
  ) {
    return { type: "rate_limit", retryable: true };
  }

  // API errors
  if (
    errorMessage.includes("access denied") ||
    errorMessage.includes("unauthorized") ||
    errorMessage.includes("forbidden") ||
    errorCode === "AccessDeniedException" ||
    errorCode === "UnauthorizedException"
  ) {
    return { type: "api_error", retryable: false };
  }

  return { type: "unknown", retryable: isRetryableError(error) };
}

/**
 * Fallback to keyword search
 */
export async function fallbackToKeywordSearch(
  query: string,
  limit: number = 20
): Promise<Business[]> {
  try {
    const results = await searchBusinessesByName(query, limit, 0);
    return results.items as Business[];
  } catch (error: any) {
    console.error("[FallbackHandler] Keyword search fallback failed:", error);
    return [];
  }
}

/**
 * Fallback for embedding generation
 * Returns zero vector or cached embedding
 */
export function getFallbackEmbedding(dimensions: number = 1024): number[] {
  return new Array(dimensions).fill(0);
}

/**
 * Fallback for NLP extraction
 * Returns empty entities with basic intent
 */
export function getFallbackEntities(query?: string): {
  categories?: string[];
  locations?: string[];
  intent?: string;
  businessNames?: string[];
  priceRange?: string[];
} {
  // Try to extract basic entities from query
  const entities: any = {
    categories: [],
    locations: [],
    intent: "search",
    businessNames: [],
    priceRange: [],
  };

  if (query) {
    const queryLower = query.toLowerCase();

    // Basic category detection
    const categoryKeywords: Record<string, string> = {
      restaurant: "food",
      cafe: "food",
      coffee: "food",
      pizza: "food",
      hotel: "accommodation",
      gym: "fitness",
      doctor: "healthcare",
      hospital: "healthcare",
    };

    for (const [keyword, category] of Object.entries(categoryKeywords)) {
      if (queryLower.includes(keyword)) {
        entities.categories = [category];
        break;
      }
    }

    // Basic location detection (common Indian cities)
    const cityKeywords = [
      "mumbai",
      "delhi",
      "bangalore",
      "hyderabad",
      "chennai",
      "kolkata",
      "pune",
      "ahmedabad",
    ];

    for (const city of cityKeywords) {
      if (queryLower.includes(city)) {
        entities.locations = [city];
        break;
      }
    }
  }

  return entities;
}

/**
 * Fallback for category classification
 * Returns null (no category detected)
 */
export function getFallbackCategory(): string | null {
  return null;
}

/**
 * Handle Bedrock failure with appropriate fallback strategy
 */
export async function handleBedrockFailure<T>(
  error: any,
  query: string,
  originalFn: () => Promise<T>,
  options?: {
    fallbackType?: "keyword" | "hybrid" | "none";
    semanticWeight?: number;
  }
): Promise<T | Business[]> {
  const failure = detectBedrockFailure(error);
  logFallback(error.message || String(error), failure.type, query);

  // Strategy: Bedrock timeout → Keyword search
  if (failure.type === "timeout") {
    if (options?.fallbackType === "keyword" || options?.fallbackType === undefined) {
      return await fallbackToKeywordSearch(query);
    }
  }

  // Strategy: Bedrock rate limit → Keyword search
  if (failure.type === "rate_limit") {
    if (options?.fallbackType === "keyword" || options?.fallbackType === undefined) {
      return await fallbackToKeywordSearch(query);
    }
  }

  // Strategy: Bedrock API error → Keyword search
  if (failure.type === "api_error") {
    if (options?.fallbackType === "keyword" || options?.fallbackType === undefined) {
      return await fallbackToKeywordSearch(query);
    }
  }

  // Strategy: Low confidence → Hybrid with lower semantic weight
  // (This would be handled by the caller with adjusted weights)

  // Default: Try keyword search
  return await fallbackToKeywordSearch(query);
}

/**
 * Get fallback logs (for monitoring)
 */
export function getFallbackLogs(limit: number = 100): FallbackLog[] {
  return fallbackLogs.slice(-limit);
}

/**
 * Clear fallback logs
 */
export function clearFallbackLogs(): void {
  fallbackLogs.length = 0;
}
