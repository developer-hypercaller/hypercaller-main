/**
 * Semantic search module
 * Performs vector similarity search using embeddings
 * 
 * Implements semantic search by:
 * 1. Taking query embedding and filters
 * 2. Pre-filtering businesses by category/location (using GSI)
 * 3. Fetching embeddings for filtered businesses
 * 4. Calculating similarity scores
 * 5. Sorting by similarity
 * 6. Returning top results
 */

import { generateQueryEmbedding, CURRENT_EMBEDDING_VERSION } from "../bedrock/embeddings";
import { cosineSimilarity } from "../utils/similarity";
import { Business } from "../schemas/business-schema";
import { SearchFilters } from "../schemas/filter-schema";
import { get, set, hashString } from "../utils/cache";
import { optimizedCosineSimilarity, batchSimilarityCalculation, optimizedCandidateFiltering } from "./performance-optimizer";
const { getEmbedding, getEmbeddingsByVersion } = require("../db/embeddings");
const { queryBusinessesByCategoryAndCity, queryBusinessesByCity, getBusinessById } = require("../db/businesses");
const { normalizeCity } = require("../normalization/location-normalizer");
const { normalizeCategory } = require("../normalization/category-normalizer");
const { getDistance } = require("../utils/distance");

/**
 * Search filters for semantic search
 */
export interface SemanticSearchFilters {
  category?: string;
  location?: {
    lat: number;
    lng: number;
    radius?: number; // in kilometers
  };
  limit?: number;
}

/**
 * Semantic search result
 */
export interface SemanticSearchResult {
  business: Business;
  similarity: number; // Cosine similarity score (0-1 for normalized vectors)
}

/**
 * Maximum number of candidates to consider for similarity calculation
 * This limits the number of similarity calculations for performance
 */
const MAX_SIMILARITY_CANDIDATES = 200;

/**
 * Default limit for search results
 */
const DEFAULT_LIMIT = 20;

/**
 * Cache TTL for similarity calculations (30 minutes)
 */
const SIMILARITY_CACHE_TTL = 1800; // seconds

/**
 * Cache TTL for candidate sets (10 minutes)
 */
const CANDIDATE_CACHE_TTL = 600; // seconds

/**
 * Generate cache key for candidate set
 */
function generateCandidateCacheKey(category?: string, location?: { lat: number; lng: number; radius?: number }): string {
  const parts: string[] = ["semantic:candidates"];
  if (category) parts.push(`cat:${category}`);
  if (location) {
    // Round coordinates to 2 decimal places for cache key (approx 1km precision)
    const lat = Math.round(location.lat * 100) / 100;
    const lng = Math.round(location.lng * 100) / 100;
    parts.push(`loc:${lat},${lng}`);
    if (location.radius) parts.push(`rad:${location.radius}`);
  }
  return parts.join(":");
}

/**
 * Generate cache key for similarity results
 */
function generateSimilarityCacheKey(
  queryEmbedding: number[],
  filters: SemanticSearchFilters
): string {
  // Use hash of query embedding and filters for cache key
  const embeddingHash = hashString(JSON.stringify(queryEmbedding.slice(0, 10))); // Use first 10 values for hash
  const filterHash = hashString(JSON.stringify(filters));
  return `semantic:similarity:${embeddingHash}:${filterHash}`;
}

/**
 * Batch calculate similarities for multiple embeddings
 * Optimized for performance with caching
 */
function batchCalculateSimilarities(
  queryEmbedding: number[],
  businessEmbeddings: Array<{ businessId: string; embedding: number[] }>
): Array<{ businessId: string; similarity: number }> {
  // Use optimized batch similarity calculation
  return batchSimilarityCalculation(queryEmbedding, businessEmbeddings, {
    maxCandidates: MAX_SIMILARITY_CANDIDATES,
    useCache: true,
    parallel: true,
  });
}

/**
 * Perform semantic search using query embedding
 * Optimized with caching, candidate filtering, and batch operations
 * 
 * @param queryEmbedding - Query embedding vector (1536 dimensions)
 * @param filters - Search filters (category, location, limit)
 * @returns Array of search results with businesses and similarity scores
 */
export async function semanticSearch(
  queryEmbedding: number[],
  filters: SemanticSearchFilters = {}
): Promise<SemanticSearchResult[]> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/search/semantic-search.ts:121',message:'semanticSearch entry',data:{embeddingLength:queryEmbedding.length,hasCategory:!!filters.category,hasLocation:!!filters.location},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  const { category, location, limit = DEFAULT_LIMIT } = filters;
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/search/semantic-search.ts:127',message:'After extract filters',data:{category,limit},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  // Validate query embedding
  if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
    throw new Error("Query embedding must be a non-empty array");
  }

  // Note: Embedding dimensions are validated in generateQueryEmbedding
  // This function expects dimensions to match business embeddings
  // Common dimensions: 1024 (Titan v2, Cohere v3) or 1536 (Titan v1)

  // Step 1: Check cache for similarity results
  const similarityCacheKey = generateSimilarityCacheKey(queryEmbedding, filters);
  const cachedResults = await get(similarityCacheKey);
  if (cachedResults) {
    return cachedResults as SemanticSearchResult[];
  }

  // Step 2: Pre-filter businesses by category and location (using GSI)
  // Check cache for candidate set
  const candidateCacheKey = generateCandidateCacheKey(category, location);
  let candidateBusinessIds: string[] = (await get(candidateCacheKey)) || [];

  if (candidateBusinessIds.length === 0) {
    try {
      if (category) {
        // Pre-filter by category first (using GSI for performance)
        const normalizedCategory = normalizeCategory(category);
        if (!normalizedCategory) {
          throw new Error(`Invalid category: ${category}`);
        }

        // For category filtering, we can't use category-location-index with empty city
        // DynamoDB doesn't allow empty strings for key attributes
        // Instead, get all embeddings and filter by category after fetching
        // This is less efficient but necessary when city is not available
        try {
          // Get all embeddings using the configured version
          const allEmbeddings = await getEmbeddingsByVersion(CURRENT_EMBEDDING_VERSION);
          
          // Get business IDs from embeddings
          const allBusinessIds = allEmbeddings
            .slice(0, MAX_SIMILARITY_CANDIDATES * 3) // Get more to filter
            .map((e: any) => e.businessId);
          
          // Fetch businesses to filter by category (batch fetch)
          const { getBusinessById } = require("../db/businesses");
          const businessPromises = allBusinessIds.slice(0, 50).map((id: string) => getBusinessById(id));
          const businesses = (await Promise.all(businessPromises)).filter(Boolean);
          
          // Filter by category
          const categoryBusinessIds = businesses
            .filter((b: Business) => {
              const businessCategory = normalizeCategory(b.category || "");
              return businessCategory === normalizedCategory;
            })
            .slice(0, MAX_SIMILARITY_CANDIDATES * (location ? 2 : 1))
            .map((b: Business) => b.businessId);
          
          candidateBusinessIds = categoryBusinessIds;
        } catch (filterError: any) {
          // Fallback: Use all embeddings (will filter later in similarity calculation)
          console.warn(`[SemanticSearch] Category filtering failed, using all embeddings: ${filterError.message}`);
          const allEmbeddings = await getEmbeddingsByVersion(CURRENT_EMBEDDING_VERSION);
          candidateBusinessIds = allEmbeddings
            .slice(0, MAX_SIMILARITY_CANDIDATES * 2)
            .map((e: any) => e.businessId);
        }
      } else if (location) {
        // Filter by location (city-level) first if city is available
        // Note: location object may not have city, only lat/lng
        // In that case, we'll filter by radius after fetching
        // Get all embeddings and filter by radius later
        const allEmbeddings = await getEmbeddingsByVersion(CURRENT_EMBEDDING_VERSION);
        candidateBusinessIds = allEmbeddings
          .slice(0, MAX_SIMILARITY_CANDIDATES * 2)
          .map((e: any) => e.businessId);
      } else {
        // No filters - get all embeddings (limited to MAX_SIMILARITY_CANDIDATES)
        // This is expensive, so we limit it
        const allEmbeddings = await getEmbeddingsByVersion(CURRENT_EMBEDDING_VERSION);
        candidateBusinessIds = allEmbeddings
          .slice(0, MAX_SIMILARITY_CANDIDATES)
          .map((e: any) => e.businessId);
      }

      // Cache candidate set
      if (candidateBusinessIds.length > 0) {
        await set(candidateCacheKey, candidateBusinessIds, CANDIDATE_CACHE_TTL);
      }
    } catch (error: any) {
      console.error(`[SemanticSearch] Error pre-filtering businesses: ${error.message}`);
      // Continue with empty candidate list - will return empty results
      candidateBusinessIds = [];
    }
  }

  if (candidateBusinessIds.length === 0) {
    return [];
  }

  // Step 3: Fetch embeddings for candidate businesses (batch)
  const embeddingMap = new Map<string, number[]>();
  const businessMap = new Map<string, Business>();

  try {
    // Fetch embeddings in parallel (batch)
    const embeddingPromises = candidateBusinessIds.map(async (businessId) => {
      try {
        // Use the configured version
        const embeddingData = await getEmbedding(businessId, CURRENT_EMBEDDING_VERSION);
        if (embeddingData && embeddingData.embedding && Array.isArray(embeddingData.embedding)) {
          embeddingMap.set(businessId, embeddingData.embedding);
          
          // Also fetch business data
          const business = await getBusinessById(businessId);
          if (business) {
            businessMap.set(businessId, business as Business);
          }
        }
      } catch (error: any) {
        // Handle rate limiting and other errors gracefully
        if (error.message && error.message.includes("provisioned throughput")) {
          // DynamoDB rate limit - log but continue with other businesses
          console.warn(`[SemanticSearch] Rate limit hit for ${businessId}, skipping embedding fetch`);
        } else {
          console.warn(`[SemanticSearch] Failed to fetch embedding for business ${businessId}: ${error.message}`);
        }
        // Continue processing other businesses - don't fail entire search
      }
    });

    await Promise.all(embeddingPromises);
  } catch (error: any) {
    console.error(`[SemanticSearch] Error fetching embeddings: ${error.message}`);
    return [];
  }

  // Step 4: Batch calculate similarities (optimized)
  const businessEmbeddings = Array.from(embeddingMap.entries()).map(([businessId, embedding]) => ({
    businessId,
    embedding,
  }));

  // If we have category filter and no location, filter by category here if we got all embeddings
  let candidatesForSimilarity = businessEmbeddings;
  if (category && !location && businessEmbeddings.length > 0) {
    // Filter businesses by category if we're using all embeddings approach
    const categoryBusinesses = Array.from(businessMap.values()).filter((b: Business) => {
      const businessCategory = normalizeCategory(b.category || "");
      const normalizedFilterCategory = normalizeCategory(category);
      return businessCategory === normalizedFilterCategory;
    });
    const categoryBusinessIds = new Set(categoryBusinesses.map(b => b.businessId));
    candidatesForSimilarity = businessEmbeddings.filter(e => categoryBusinessIds.has(e.businessId));
  }

  // Limit to top candidates before similarity calculation (approximate filtering)
  candidatesForSimilarity = candidatesForSimilarity.slice(0, MAX_SIMILARITY_CANDIDATES);
  
  // Batch calculate similarities
  const similarityResults = batchCalculateSimilarities(queryEmbedding, candidatesForSimilarity);

  // Step 5: Apply location radius filter if provided (after similarity calculation)
  let filteredResults = similarityResults;
  if (location && location.radius) {
    filteredResults = similarityResults.filter((result) => {
      const business = businessMap.get(result.businessId);
      if (!business || !business.location || typeof business.location.latitude !== "number" || typeof business.location.longitude !== "number") {
        return false;
      }

      // Calculate distance in kilometers
      const distanceKm = getDistance(
        { latitude: location.lat, longitude: location.lng },
        {
          latitude: business.location.latitude,
          longitude: business.location.longitude,
        }
      ) / 1000; // Convert meters to kilometers

      return distanceKm <= location.radius!;
    });
  }

  // Step 6: Sort by similarity (descending)
  filteredResults.sort((a, b) => b.similarity - a.similarity);

  // Step 7: Return top N results with business data
  const topResults = filteredResults.slice(0, limit);

  const results: SemanticSearchResult[] = [];
  for (const result of topResults) {
    const business = businessMap.get(result.businessId);
    if (business) {
      results.push({
        business: business as Business,
        similarity: result.similarity,
      });
    }
  }

  // Cache results for popular queries
  if (results.length > 0) {
    await set(similarityCacheKey, results, SIMILARITY_CACHE_TTL).catch((error) => {
      console.warn(`[SemanticSearch] Failed to cache results: ${error.message}`);
    });
  }
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/search/semantic-search.ts:334',message:'semanticSearch return',data:{resultCount:results.length,limit,filteredCount:filteredResults.length,candidateCount:candidateBusinessIds.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  return results;
}

/**
 * Perform semantic search from query string
 * Generates query embedding and performs semantic search
 * 
 * @param query - Search query string
 * @param filters - Search filters
 * @returns Array of search results with businesses and similarity scores
 */
export async function semanticSearchFromQuery(
  query: string,
  filters: SemanticSearchFilters = {}
): Promise<SemanticSearchResult[]> {
  // Generate query embedding
  const queryEmbedding = await generateQueryEmbedding(query);

  // Perform semantic search
  return semanticSearch(queryEmbedding, filters);
}
