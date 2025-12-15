/**
 * Performance Optimizer
 * Optimizes similarity calculations, candidate filtering, caching, and batch processing
 * Monitors Bedrock costs and performance metrics
 */

import { cosineSimilarity } from "../utils/similarity";
import { Business } from "../schemas/business-schema";
import { get, set } from "../utils/cache";

/**
 * Similarity calculation cache
 */
const similarityCache = new Map<string, number>();
const MAX_CACHE_SIZE = 10000;

/**
 * Optimized similarity calculation with caching
 */
export function optimizedCosineSimilarity(
  vec1: number[],
  vec2: number[],
  cacheKey?: string
): number {
  // Check cache if key provided
  if (cacheKey) {
    const cached = similarityCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
  }

  // Calculate similarity
  const similarity = cosineSimilarity(vec1, vec2);

  // Cache result if key provided and cache not full
  if (cacheKey && similarityCache.size < MAX_CACHE_SIZE) {
    similarityCache.set(cacheKey, similarity);
  }

  return similarity;
}

/**
 * Batch similarity calculation with optimization
 */
export function batchSimilarityCalculation(
  queryEmbedding: number[],
  businessEmbeddings: Array<{ businessId: string; embedding: number[] }>,
  options: {
    maxCandidates?: number;
    useCache?: boolean;
    parallel?: boolean;
  } = {}
): Array<{ businessId: string; similarity: number }> {
  const { maxCandidates = 200, useCache = true, parallel = true } = options;

  // Limit candidates for performance
  const candidates = businessEmbeddings.slice(0, maxCandidates);

  if (parallel) {
    // Parallel calculation
    const results = candidates.map(({ businessId, embedding }) => {
      const cacheKey = useCache ? `${businessId}:${queryEmbedding.slice(0, 10).join(",")}` : undefined;
      const similarity = optimizedCosineSimilarity(queryEmbedding, embedding, cacheKey);
      return { businessId, similarity };
    });

    return results;
  } else {
    // Sequential calculation (for very large batches)
    const results: Array<{ businessId: string; similarity: number }> = [];
    for (const { businessId, embedding } of candidates) {
      const cacheKey = useCache ? `${businessId}:${queryEmbedding.slice(0, 10).join(",")}` : undefined;
      const similarity = optimizedCosineSimilarity(queryEmbedding, embedding, cacheKey);
      results.push({ businessId, similarity });
    }
    return results;
  }
}

/**
 * Optimized candidate filtering
 */
export function optimizedCandidateFiltering(
  businesses: Business[],
  filters: {
    category?: string;
    city?: string;
    minRating?: number;
    maxResults?: number;
  } = {}
): Business[] {
  let filtered = [...businesses];

  // Filter by category (fast - direct property access)
  if (filters.category) {
    filtered = filtered.filter((b) => b.category === filters.category);
  }

  // Filter by city (fast - direct property access)
  if (filters.city) {
    filtered = filtered.filter((b) => b.location?.city === filters.city);
  }

  // Filter by rating (fast - direct property access)
  if (filters.minRating !== undefined) {
    filtered = filtered.filter((b) => (b.rating || 0) >= filters.minRating!);
  }

  // Limit results early
  if (filters.maxResults) {
    filtered = filtered.slice(0, filters.maxResults);
  }

  return filtered;
}

/**
 * Cache key generator for similarity calculations
 */
export function generateSimilarityCacheKey(
  queryEmbedding: number[],
  businessId: string
): string {
  // Use first 10 dimensions and business ID for cache key
  const embeddingHash = queryEmbedding.slice(0, 10).map((v) => Math.round(v * 1000)).join(",");
  return `similarity:${businessId}:${embeddingHash}`;
}

/**
 * Clear similarity cache
 */
export function clearSimilarityCache(): void {
  similarityCache.clear();
}

/**
 * Get similarity cache statistics
 */
export function getSimilarityCacheStats(): {
  size: number;
  maxSize: number;
  hitRate?: number;
} {
  return {
    size: similarityCache.size,
    maxSize: MAX_CACHE_SIZE,
  };
}

/**
 * Bedrock cost monitor
 */
export class BedrockCostMonitor {
  private apiCalls: Array<{ timestamp: number; model: string; tokens?: number }> = [];
  private costs: Map<string, number> = new Map();

  // Approximate costs per 1000 tokens (USD)
  private readonly COST_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
    "titan-embed": { input: 0.0001, output: 0 },
    "claude-3-sonnet": { input: 0.003, output: 0.015 },
    "claude-3-haiku": { input: 0.00025, output: 0.00125 },
  };

  /**
   * Record API call
   */
  recordAPICall(model: string, tokens?: { input?: number; output?: number }): void {
    const timestamp = Date.now();
    this.apiCalls.push({ timestamp, model, tokens: tokens?.input || tokens?.output || 0 });

    // Calculate cost
    const costConfig = this.COST_PER_1K_TOKENS[model] || { input: 0.001, output: 0.001 };
    const inputCost = ((tokens?.input || 0) / 1000) * costConfig.input;
    const outputCost = ((tokens?.output || 0) / 1000) * costConfig.output;
    const totalCost = inputCost + outputCost;

    const currentCost = this.costs.get(model) || 0;
    this.costs.set(model, currentCost + totalCost);
  }

  /**
   * Get cost statistics
   */
  getCostStats(timeWindow?: number): {
    totalCost: number;
    calls: number;
    byModel: Record<string, { cost: number; calls: number }>;
  } {
    const now = Date.now();
    const window = timeWindow || 24 * 60 * 60 * 1000; // Default 24 hours

    const recentCalls = this.apiCalls.filter((call) => now - call.timestamp < window);
    const byModel: Record<string, { cost: number; calls: number }> = {};

    for (const [model, cost] of this.costs.entries()) {
      const modelCalls = recentCalls.filter((call) => call.model === model);
      byModel[model] = {
        cost,
        calls: modelCalls.length,
      };
    }

    const totalCost = Array.from(this.costs.values()).reduce((sum, cost) => sum + cost, 0);

    return {
      totalCost,
      calls: recentCalls.length,
      byModel,
    };
  }

  /**
   * Reset costs
   */
  reset(): void {
    this.apiCalls = [];
    this.costs.clear();
  }
}

// Singleton instance
let costMonitorInstance: BedrockCostMonitor | null = null;

/**
 * Get Bedrock cost monitor instance
 */
export function getBedrockCostMonitor(): BedrockCostMonitor {
  if (!costMonitorInstance) {
    costMonitorInstance = new BedrockCostMonitor();
  }
  return costMonitorInstance;
}

/**
 * Optimized batch processing with rate limiting
 */
export async function optimizedBatchProcessing<T>(
  items: T[],
  processor: (item: T) => Promise<any>,
  options: {
    batchSize?: number;
    concurrency?: number;
    delayBetweenBatches?: number;
  } = {}
): Promise<Array<{ item: T; result?: any; error?: string }>> {
  const { batchSize = 10, concurrency = 3, delayBetweenBatches = 1000 } = options;

  const results: Array<{ item: T; result?: any; error?: string }> = [];

  // Process in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    // Process batch with concurrency limit
    const batchResults = await Promise.allSettled(
      batch.map((item) => processor(item))
    );

    batchResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        results.push({ item: batch[index], result: result.value });
      } else {
        results.push({ item: batch[index], error: result.reason?.message || String(result.reason) });
      }
    });

    // Delay between batches to avoid rate limiting
    if (i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return results;
}

/**
 * Cache optimization - preload frequently used embeddings
 */
export async function preloadEmbeddings(
  businessIds: string[],
  options: {
    batchSize?: number;
    ttl?: number;
  } = {}
): Promise<void> {
  const { batchSize = 50, ttl = 24 * 60 * 60 * 1000 } = options;
  const { getEmbedding } = require("../db/embeddings");

  // Load embeddings in batches
  for (let i = 0; i < businessIds.length; i += batchSize) {
    const batch = businessIds.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (businessId) => {
        try {
          const embeddingData = await getEmbedding(businessId);
          if (embeddingData?.embedding) {
            // Cache embedding
            await set(`embedding:${businessId}`, embeddingData.embedding, ttl);
          }
        } catch (error) {
          // Ignore errors in preloading
        }
      })
    );
  }
}

