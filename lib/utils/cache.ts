/**
 * Redis cache utility functions
 * Provides Redis caching with Upstash Redis (serverless)
 * Falls back to in-memory cache if Redis is not configured
 */

import { Redis } from "@upstash/redis";

// In-memory fallback cache
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class SimpleCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private defaultTTL: number; // in milliseconds

  constructor(defaultTTL: number = 3600000) {
    // Default 1 hour
    this.defaultTTL = defaultTTL;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiresAt });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Redis client instance
let redisClient: Redis | null = null;
let isRedisEnabled = false;
const fallbackCache = new SimpleCache<any>();

/**
 * Initialize Redis client
 * Supports:
 * 1. Upstash Redis (serverless) - Recommended
 * 2. ElastiCache - Requires ioredis package (not currently implemented)
 * Falls back to in-memory cache if neither is configured
 */
export function initializeRedis(): void {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/utils/cache.ts:60',message:'initializeRedis entry',data:{hasUpstashUrl:!!process.env.UPSTASH_REDIS_REST_URL,hasUpstashToken:!!process.env.UPSTASH_REDIS_REST_TOKEN},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  try {
    // Option 1: Upstash Redis (serverless) - Recommended
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (upstashUrl && upstashToken) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/utils/cache.ts:67',message:'Before creating Redis client',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      redisClient = new Redis({
        url: upstashUrl,
        token: upstashToken,
      });
      isRedisEnabled = true;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/utils/cache.ts:72',message:'Redis client created successfully',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      console.log("[Redis] Connected to Upstash Redis");
      return;
    }

    // Option 2: ElastiCache (would require ioredis)
    // Note: Current implementation uses @upstash/redis
    // To use ElastiCache, install ioredis and update this code
    const elasticacheHost = process.env.REDIS_HOST;
    const elasticachePort = process.env.REDIS_PORT;

    if (elasticacheHost && elasticachePort) {
      console.log("[Redis] ElastiCache configuration detected but not implemented");
      console.log("[Redis] Install 'ioredis' and update cache.ts to use ElastiCache");
      console.log("[Redis] Falling back to in-memory cache");
      isRedisEnabled = false;
      return;
    }

    // No Redis configuration found
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/utils/cache.ts:92',message:'No Redis config found, using in-memory',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    console.log("[Redis] Redis credentials not found, using in-memory cache");
    console.log("[Redis] To use Redis, set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN");
    isRedisEnabled = false;
  } catch (error) {
    // #region agent log
    const errorInfo = error instanceof Error ? {errorMessage:error.message,errorName:error.name} : {errorMessage:String(error)};
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/utils/cache.ts:96',message:'Redis initialization error',data:errorInfo,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    console.error("[Redis] Failed to initialize Redis client:", error);
    isRedisEnabled = false;
  }
}

/**
 * Get Redis client instance
 */
export function getRedisClient(): Redis | null {
  if (!redisClient && !isRedisEnabled) {
    initializeRedis();
  }
  return redisClient;
}

/**
 * Check if Redis is enabled
 */
export function isRedisAvailable(): boolean {
  return isRedisEnabled && redisClient !== null;
}

/**
 * Get value from cache
 * Uses Redis if available, otherwise falls back to in-memory cache
 */
export async function get(key: string): Promise<any | null> {
  try {
    if (isRedisAvailable() && redisClient) {
      const value = await redisClient.get(key);
      return value;
    } else {
      // Fallback to in-memory cache
      return fallbackCache.get(key);
    }
  } catch (error) {
    console.error(`[Cache] Error getting key "${key}":`, error);
    // Fallback to in-memory cache on error
    try {
      return fallbackCache.get(key);
    } catch (fallbackError) {
      console.error(`[Cache] Fallback cache error:`, fallbackError);
      return null;
    }
  }
}

/**
 * Set value in cache
 * Uses Redis if available, otherwise falls back to in-memory cache
 * @param key - Cache key
 * @param value - Value to cache (will be JSON stringified)
 * @param ttl - Time to live in seconds (default: 3600 = 1 hour)
 */
export async function set(key: string, value: any, ttl?: number): Promise<void> {
  try {
    if (isRedisAvailable() && redisClient) {
      // Upstash Redis automatically handles JSON serialization
      if (ttl) {
        await redisClient.set(key, value, { ex: ttl });
      } else {
        await redisClient.set(key, value);
      }
    } else {
      // Fallback to in-memory cache (convert seconds to milliseconds)
      const ttlMs = ttl ? ttl * 1000 : undefined;
      fallbackCache.set(key, value, ttlMs);
    }
  } catch (error) {
    console.error(`[Cache] Error setting key "${key}":`, error);
    // Fallback to in-memory cache on error
    try {
      const ttlMs = ttl ? ttl * 1000 : undefined;
      fallbackCache.set(key, value, ttlMs);
    } catch (fallbackError) {
      console.error(`[Cache] Fallback cache error:`, fallbackError);
    }
  }
}

/**
 * Delete value from cache
 */
export async function deleteKey(key: string): Promise<void> {
  try {
    if (isRedisAvailable() && redisClient) {
      await redisClient.del(key);
    } else {
      fallbackCache.delete(key);
    }
  } catch (error) {
    console.error(`[Cache] Error deleting key "${key}":`, error);
    // Try fallback
    try {
      fallbackCache.delete(key);
    } catch (fallbackError) {
      console.error(`[Cache] Fallback cache error:`, fallbackError);
    }
  }
}

/**
 * Clear cache by pattern
 * Note: Upstash Redis uses SCAN for pattern matching
 * In-memory fallback supports simple prefix matching
 */
export async function clear(pattern: string): Promise<void> {
  try {
    if (isRedisAvailable() && redisClient) {
      // Upstash Redis uses SCAN for pattern matching
      const keys: string[] = [];
      let cursor: string | number = 0;

      do {
        const result = await redisClient.scan(cursor, { match: pattern, count: 100 });
        cursor = result[0] as string | number;
        keys.push(...(result[1] as string[]));
      } while (cursor !== 0 && cursor !== "0");

      // Delete all matching keys
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } else {
      // Fallback: Simple prefix matching for in-memory cache
      // Convert pattern to prefix (e.g., "test:clear:*" -> "test:clear:")
      const prefix = pattern.replace(/\*$/, "");
      if (prefix) {
        // Note: In-memory cache doesn't support pattern matching efficiently
        // This is a simplified implementation
        // For production, consider using a more sophisticated in-memory cache
        if (pattern === "*" || pattern.endsWith("*")) {
          // Clear all if pattern is "*" or ends with "*"
          // In a real implementation, you'd track keys and filter by prefix
          fallbackCache.clear();
        }
      }
    }
  } catch (error) {
    console.error(`[Cache] Error clearing pattern "${pattern}":`, error);
    // Try fallback
    try {
      if (pattern === "*" || pattern.endsWith("*")) {
        fallbackCache.clear();
      }
    } catch (fallbackError) {
      console.error(`[Cache] Fallback cache error:`, fallbackError);
    }
  }
}

/**
 * Generate cache key from object
 */
export function generateCacheKey(prefix: string, data: any): string {
  const dataStr = typeof data === "string" ? data : JSON.stringify(data);
  return `${prefix}:${Buffer.from(dataStr).toString("base64")}`;
}

/**
 * Hash string for cache key
 */
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get embedding cache instance
 * Returns a SimpleCache instance for caching embeddings
 */
export function getEmbeddingCache(): SimpleCache<number[]> {
  return new SimpleCache<number[]>(1800000); // 30 minutes TTL
}

// Initialize Redis on module load
initializeRedis();

