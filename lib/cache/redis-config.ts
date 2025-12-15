/**
 * Redis configuration and cache strategies
 * Provides Redis client setup and cache utilities
 * 
 * This module re-exports functionality from lib/utils/cache.ts
 * which implements Upstash Redis with in-memory fallback
 */

// Re-export from the actual Redis implementation
export {
  getRedisClient,
  isRedisAvailable,
  initializeRedis,
} from "../utils/cache";

export interface RedisConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  ttl?: number; // Default TTL in seconds
}

/**
 * Cache key prefixes for different data types
 */
export const CacheKeys = {
  EMBEDDING: "embedding:",
  GEOCODING: "geocoding:",
  QUERY: "query:",
  BUSINESS: "business:",
  CATEGORY: "category:",
  SEARCH_RESULTS: "search:",
};

/**
 * Generate cache key
 */
export function generateCacheKey(prefix: string, identifier: string): string {
  return `${prefix}${identifier}`;
}

// Re-export cache functions from actual implementation
import { get as getCache, set as setCache, deleteKey as deleteCache, clear as clearCache } from "../utils/cache";

/**
 * Get value from cache
 */
export async function getFromCache(key: string): Promise<any | null> {
  return await getCache(key);
}

/**
 * Set value in cache
 */
export async function setInCache(
  key: string,
  value: any,
  ttl?: number
): Promise<void> {
  await setCache(key, value, ttl);
}

/**
 * Delete value from cache
 */
export async function deleteFromCache(key: string): Promise<void> {
  await deleteCache(key);
}

/**
 * Clear cache by pattern
 */
export async function clearCacheByPattern(pattern: string): Promise<void> {
  await clearCache(pattern);
}

/**
 * Cache strategies
 */
export class CacheStrategy {
  /**
   * Cache embedding with 30 minute TTL
   */
  static async cacheEmbedding(query: string, embedding: number[]): Promise<void> {
    const key = generateCacheKey(CacheKeys.EMBEDDING, query);
    await setInCache(key, embedding, 1800); // 30 minutes
  }

  /**
   * Get cached embedding
   */
  static async getCachedEmbedding(query: string): Promise<number[] | null> {
    const key = generateCacheKey(CacheKeys.EMBEDDING, query);
    return await getFromCache(key);
  }

  /**
   * Cache geocoding result with 24 hour TTL
   */
  static async cacheGeocoding(location: string, result: any): Promise<void> {
    const key = generateCacheKey(CacheKeys.GEOCODING, location);
    await setInCache(key, result, 86400); // 24 hours
  }

  /**
   * Get cached geocoding
   */
  static async getCachedGeocoding(location: string): Promise<any | null> {
    const key = generateCacheKey(CacheKeys.GEOCODING, location);
    return await getFromCache(key);
  }

  /**
   * Cache search results with 5 minute TTL
   */
  static async cacheSearchResults(query: string, results: any[]): Promise<void> {
    const key = generateCacheKey(CacheKeys.SEARCH_RESULTS, query);
    await setInCache(key, results, 300); // 5 minutes
  }

  /**
   * Get cached search results
   */
  static async getCachedSearchResults(query: string): Promise<any[] | null> {
    const key = generateCacheKey(CacheKeys.SEARCH_RESULTS, query);
    return await getFromCache(key);
  }
}

