/**
 * Query Processing Pipeline
 * Complete end-to-end query processing with all pipeline steps
 * 
 * Pipeline Steps:
 * 1. Validate and sanitize query
 * 2. Check cache for complete analysis
 * 3. Normalize query
 * 4. Run Bedrock NLP analysis (intent, category, entities)
 * 5. Extract and normalize entities
 * 6. Resolve location (using improved entity extraction)
 * 7. Generate or retrieve query embedding
 * 8. Perform hybrid search
 * 9. Apply filters
 * 10. Rank results
 * 11. Return enriched results
 */

// NLP functions
import { extractEntities, detectIntent, classifyCategory, EntityResult } from "../bedrock/nlp";
import { withRateLimit, getRateLimitStatus, extractIPAddress } from "../bedrock/rate-limiter";
import { 
  withFallback, 
  getFallbackEntities, 
  handleBedrockFailure,
  detectBedrockFailure,
  isRetryableError,
  retryWithBackoff
} from "../bedrock/fallback-handler";

// Embedding functions
import { generateQueryEmbedding } from "../bedrock/embeddings";

// Search functions
import { hybridSearch } from "./hybrid-search";
import { rankSearchResults, calculateRankingScore, RankingFactors } from "./ranking";

// Normalizers
import { normalizeBusinessName } from "../normalization/name-normalizer";
import { normalizeLocationName, normalizeCity } from "../normalization/location-normalizer";
import { normalizeCategory } from "../normalization/category-normalizer";
import { normalizePriceRange } from "../normalization/price-range-normalizer";
import { PriceRange } from "../data/price-ranges";

// Validators
import { validateBusinessName } from "../validation/name-validator";
import { validateCategory } from "../validation/category-validator";

// Location resolver
import { 
  LocationResolutionResult, 
  detectNearMeKeywords, 
  resolveSearchLocation,
  extractExplicitLocation,
  resolveLocationFromProfile
} from "./location-resolver";

// Cache utilities
import { get, set, hashString } from "../utils/cache";

// Schemas
import { Business } from "../schemas/business-schema";
import { SearchFilters } from "../schemas/filter-schema";

// Distance calculation
import { getDistance } from "../utils/distance";

// Database functions (CommonJS)
const { getUserById } = require("../db/users");

/**
 * Maximum query length
 */
const MAX_QUERY_LENGTH = 500;

/**
 * Cache TTLs (in milliseconds)
 */
const CACHE_TTL = {
  ANALYSIS: 30 * 60 * 1000, // 30 minutes
  EMBEDDING: 30 * 24 * 60 * 60 * 1000, // 30 days
  RESULTS: 5 * 60 * 1000, // 5 minutes
};

/**
 * Query analysis result
 */
export interface QueryAnalysis {
  intent: string;
  category?: string;
  entities: EntityResult;
  location?: LocationResolutionResult;
}

/**
 * Performance metrics for each step
 */
export interface StepPerformance {
  step: string;
  duration: number;
  fromCache?: boolean;
  error?: string;
}

/**
 * Query processing result
 */
export interface QueryProcessingResult {
  results: Business[];
  analysis: QueryAnalysis;
  performance: {
    responseTime: number;
    fromCache: boolean;
    steps: StepPerformance[];
    bedrockApiCalls: number;
    cacheHits: number;
    errors: string[];
  };
}

/**
 * Step 1: Validate and sanitize query
 */
function validateAndSanitizeQuery(query: string): string {
  if (!query || typeof query !== "string") {
    throw new Error("Query must be a non-empty string");
  }

  // Trim whitespace
  let sanitized = query.trim();

  // Check max length
  if (sanitized.length > MAX_QUERY_LENGTH) {
    sanitized = sanitized.substring(0, MAX_QUERY_LENGTH);
  }

  // Sanitize special characters (remove potentially dangerous ones, keep normal punctuation)
  // Allow: letters, numbers, spaces, common punctuation, question marks (for queries)
  sanitized = sanitized.replace(/[<>{}[\]\\]/g, "");

  // Basic validation for queries (not business name validation)
  if (sanitized.length < 2) {
    throw new Error("Query is too short");
  }
  if (sanitized.length > 500) {
    throw new Error("Query is too long (maximum 500 characters)");
  }

  return sanitized;
}

/**
 * Step 2: Check cache for complete analysis
 */
async function checkCache(query: string, filters: SearchFilters): Promise<{
  analysis?: QueryAnalysis;
  embedding?: number[];
  results?: Business[];
} | null> {
  const cacheKey = `query:${hashString(query + JSON.stringify(filters))}`;

  try {
    // Check for cached results (most complete)
    const cachedResults = (await get(`${cacheKey}:results`)) as Business[] | null;
    if (cachedResults) {
      const cachedAnalysis = (await get(`${cacheKey}:analysis`)) as QueryAnalysis | null;
      const cachedEmbedding = (await get(`${cacheKey}:embedding`)) as number[] | null;
      return {
        analysis: cachedAnalysis || undefined,
        embedding: cachedEmbedding || undefined,
        results: cachedResults,
      };
    }

    // Check for cached analysis
    const cachedAnalysis = (await get(`${cacheKey}:analysis`)) as QueryAnalysis | null;
    const cachedEmbedding = (await get(`${cacheKey}:embedding`)) as number[] | null;

    if (cachedAnalysis && cachedEmbedding) {
      return {
        analysis: cachedAnalysis,
        embedding: cachedEmbedding,
      };
    }

    // Check for cached embedding only
    if (cachedEmbedding) {
      return {
        embedding: cachedEmbedding,
      };
    }

    return null;
  } catch (error) {
    // Cache errors shouldn't break the pipeline
    console.warn(`[QueryProcessor] Cache check failed: ${error}`);
    return null;
  }
}

/**
 * Step 3: Normalize query
 */
function normalizeQuery(query: string): string {
  return normalizeBusinessName(query);
}

/**
 * Keyword-based category detection fallback
 * Detects category from query keywords when Bedrock NLP fails
 */
function detectCategoryFromKeywords(query: string): string | undefined {
  if (!query || typeof query !== "string") {
    return undefined;
  }

  const queryLower = query.toLowerCase().trim();
  
  // Category keyword mappings
  const categoryKeywords: Record<string, string[]> = {
    food: ["restaurant", "restaurants", "food", "cafe", "café", "dining", "eatery", "diner", "bistro", "meal", "eat", "eating", "cuisine", "pizza", "burger", "sushi", "indian food", "chinese food"],
    fitness: ["gym", "fitness", "workout", "exercise", "yoga", "pilates", "crossfit", "training", "fitness center", "gymnasium"],
    healthcare: ["hospital", "clinic", "doctor", "medical", "health", "pharmacy", "dentist", "dental", "eye care", "cardiac", "pediatric"],
    education: ["school", "college", "university", "education", "tuition", "coaching", "academy", "institute", "learning", "training center"],
    accommodation: ["hotel", "hotels", "resort", "motel", "hostel", "lodging", "accommodation", "stay", "inn"],
    retail: ["store", "shop", "shopping", "retail", "market", "supermarket", "mall", "outlet"],
    entertainment: ["cinema", "movie", "theater", "amusement", "park", "bowling", "karaoke", "arcade", "nightclub"],
    automotive: ["car", "auto", "vehicle", "service", "repair", "garage", "dealership", "tire", "battery"],
    "professional-services": ["law", "legal", "lawyer", "accountant", "ca", "consultant", "real estate", "insurance", "architect"],
  };

  // Check each category's keywords
  for (const [categoryId, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      // Check if keyword appears as a whole word in the query
      const regex = new RegExp(`\\b${keyword}\\b`, "i");
      if (regex.test(queryLower)) {
        // Validate category exists
        try {
          const categoryValidation = validateCategory(categoryId);
          if (categoryValidation.valid) {
            return categoryId;
          }
        } catch (error) {
          // Continue to next category
        }
      }
    }
  }

  return undefined;
}

/**
 * Build EntityResult-compatible fallback entities
 */
function getEntityFallback(query?: string): EntityResult {
  const fallback = getFallbackEntities(query);
  return {
    locations: fallback.locations || [],
    businessNames: fallback.businessNames || [],
    categories: fallback.categories || [],
    times: [],
    prices: fallback.priceRange || [],
    features: [],
    confidence: 0.2,
  };
}

/**
 * Step 4: Run Bedrock NLP analysis with rate limiting and fallbacks
 */
async function runNLPAnalysis(
  query: string,
  userId?: string,
  request?: any
): Promise<{
  intent: string;
  category?: string;
  entities: EntityResult;
}> {
  try {
    // Check rate limit status before proceeding
    const { getRateLimitStatus, extractIPAddress } = await import("../bedrock/rate-limiter");
    const ipAddress = request ? extractIPAddress(request) : undefined;
    const rateLimitStatus = getRateLimitStatus(userId, ipAddress, request);
    
    // Check if user/IP is at limit
    if (rateLimitStatus.user && rateLimitStatus.user.remaining === 0) {
      console.warn(`[QueryProcessor] User rate limit reached for ${userId}`);
      // Use fallback immediately
      return {
        intent: "search",
        entities: getEntityFallback(query),
      };
    }

    if (rateLimitStatus.ip && rateLimitStatus.ip.remaining === 0) {
      console.warn(`[QueryProcessor] IP rate limit reached for ${ipAddress}`);
      // Use fallback immediately
      return {
        intent: "search",
        entities: getEntityFallback(query),
      };
    }

    // Run entity extraction and intent detection in parallel with rate limiting
    const [entities, intentResult] = await Promise.all([
      withFallback(
        async () => {
          return await withRateLimit(
            async () => {
              return await extractEntities(query);
            },
            {
              userId,
              ipAddress,
              request,
            }
          );
        },
        () => getEntityFallback(query),
        { logError: true, fallbackType: "nlp_entities" }
      ),
      withFallback(
        async () => {
          return await withRateLimit(
            async () => {
              return await detectIntent(query);
            },
            {
              userId,
              ipAddress,
              request,
            }
          );
        },
        () => ({ intent: "search" as const, confidence: 0.5 }),
        { logError: true, fallbackType: "nlp_intent" }
      ),
    ]);

    // Extract category from entities or classify
    let category: string | undefined;
    if (entities.categories && entities.categories.length > 0) {
      const normalizedCategory = normalizeCategory(entities.categories[0]);
      if (normalizedCategory) {
        const categoryValidation = validateCategory(normalizedCategory);
        if (categoryValidation.valid) {
          category = normalizedCategory;
        }
      }
    }

    // If no category from entities, try direct classification
    let categoryClassificationResult: { category: string; confidence: number; alternatives: string[] } | null = null;
    if (!category) {
      try {
        categoryClassificationResult = await withFallback(
          async () => {
            return await withRateLimit(async () => {
              return await classifyCategory(query);
            });
          },
          () => null
        );

        if (categoryClassificationResult?.category) {
          const normalizedCategory = normalizeCategory(categoryClassificationResult.category);
          if (normalizedCategory) {
            const categoryValidation = validateCategory(normalizedCategory);
            if (categoryValidation.valid) {
              category = normalizedCategory;
            }
          }
        }
      } catch (error) {
        // Classification failure is not critical
        console.warn(`[QueryProcessor] Category classification failed: ${error}`);
      }
    } else {
      // If we already have category from entities, still get classification for confidence
      try {
        categoryClassificationResult = await withFallback(
          async () => {
            return await withRateLimit(
              async () => {
                return await classifyCategory(query);
              },
              {
                userId,
                ipAddress,
                request,
              }
            );
          },
          () => null
        );
      } catch (error) {
        // Ignore - we already have a category
      }
    }
    
    // Fallback: Keyword-based category detection if Bedrock failed
    if (!category) {
      category = detectCategoryFromKeywords(query);
    }

    // Return result with category classification for later use (to prioritize Bedrock over category mapper)
    const result = {
      intent: intentResult.intent,
      category,
      entities,
    };
    
    // Store category classification result for later use
    (result as any).categoryClassification = categoryClassificationResult;
    
    return result;
  } catch (error: any) {
    // Fallback to keyword search if NLP fails
    console.error(`[QueryProcessor] NLP analysis failed: ${error.message}`);
    return {
      intent: "search",
      entities: getEntityFallback(query),
    };
  }
}

/**
 * Step 5: Extract and normalize entities
 */
function extractAndNormalizeEntities(entities: EntityResult): {
  locations: string[];
  businessNames: string[];
  prices: PriceRange[];
  times: string[];
  features: string[];
} {
  const normalized: {
    locations: string[];
    businessNames: string[];
    prices: PriceRange[];
    times: string[];
    features: string[];
  } = {
    locations: [],
    businessNames: [],
    prices: [],
    times: [],
    features: [],
  };

  // Normalize locations
  if (entities.locations) {
    normalized.locations = entities.locations
      .map((loc) => normalizeLocationName(loc))
      .filter((loc): loc is string => !!loc);
  }

  // Normalize business names
  if (entities.businessNames) {
    normalized.businessNames = entities.businessNames
      .map((name) => normalizeBusinessName(name))
      .filter((name): name is string => !!name);
  }

  // Normalize prices
  if (entities.prices) {
    normalized.prices = entities.prices
      .map((price) => normalizePriceRange(price))
      .filter((price): price is PriceRange => price !== null);
  }

  // Extract times (if available in entities)
  if ((entities as any).times) {
    normalized.times = (entities as any).times || [];
  }

  // Extract features/amenities (if available in entities)
  if ((entities as any).features || (entities as any).amenities) {
    normalized.features = (entities as any).features || (entities as any).amenities || [];
  }

  return normalized;
}

/**
 * Step 6: Resolve location
 */
async function resolveLocationForQuery(
  query: string,
  entities: EntityResult,
  userId?: string,
  session?: any,
  request?: any
): Promise<LocationResolutionResult | undefined> {
  // Build user profile object for location resolver
  let userProfile: { latitude?: number; longitude?: number; address?: string; locationLastUpdated?: number | null } | null = null;
  
  // Priority 1: Use session.location (from auth middleware, already processed)
  if (session?.location) {
    userProfile = {
      latitude: session.location.latitude,
      longitude: session.location.longitude,
      address: session.location.address || undefined,
      locationLastUpdated: session.location.locationLastUpdated || null,
    };
  }
  
  // Priority 2: If no session location, get from database
  // Note: Database stores location as flat fields (latitude, longitude, address)
  // but we need to handle both flat and nested structures
  if (!userProfile && userId) {
    try {
      const user = await getUserById(userId);
      if (user) {
        // Handle both flat fields (from database) and nested object (if already converted)
        const lat = user.location?.latitude ?? user.latitude;
        const lng = user.location?.longitude ?? user.longitude;
        const addr = user.location?.address ?? user.address;
        
        if (lat !== undefined && lng !== undefined) {
          userProfile = {
            latitude: lat,
            longitude: lng,
            address: addr || undefined,
            locationLastUpdated: user.locationLastUpdated || null,
          };
        }
      }
    } catch (error) {
      console.warn(`[QueryProcessor] Failed to get user location: ${error}`);
    }
  }

  // Use the proper location resolver which handles all priority logic
  // This includes: explicit locations from entities, "near me", geolocation, IP
  try {
    // Convert NextRequest-like object to proper NextRequest if needed
    // The resolveSearchLocation function expects a NextRequest
    if (request) {
      const resolved = await resolveSearchLocation(
        query,
        entities,
        userProfile,
        request
      );
      return resolved || undefined;
    } else {
      // Fallback: manual resolution without request object
      // Priority 1: Explicit location from entities
      if (entities.locations && entities.locations.length > 0) {
        const explicitLocation = await extractExplicitLocation(entities);
        if (explicitLocation) {
          return explicitLocation;
        }
      }

      // Priority 2: "Near me" → User profile
      if (detectNearMeKeywords(query) && userProfile) {
        const profileLocation = resolveLocationFromProfile(userProfile);
        if (profileLocation) {
          return profileLocation;
        }
      }

      // Priority 3: Fallback to user profile (if not "near me")
      if (userProfile && !detectNearMeKeywords(query)) {
        const profileLocation = resolveLocationFromProfile(userProfile);
        if (profileLocation) {
          return profileLocation;
        }
      }
    }
  } catch (error) {
    console.warn(`[QueryProcessor] Location resolution failed: ${error}`);
  }

  return undefined;
}

/**
 * Step 7: Generate or retrieve query embedding with rate limiting and fallback
 */
async function getQueryEmbedding(
  query: string,
  normalizedQuery: string,
  userId?: string,
  request?: any
): Promise<number[] | null> {
  try {
    // Check rate limit before generating embedding
    const { getRateLimitStatus, extractIPAddress } = await import("../bedrock/rate-limiter");
    const ipAddress = request ? extractIPAddress(request) : undefined;
    const rateLimitStatus = getRateLimitStatus(userId, ipAddress, request);
    
    // If at limit, skip embedding generation (will use keyword-only search)
    if (rateLimitStatus.user && rateLimitStatus.user.remaining === 0) {
      console.warn(`[QueryProcessor] Rate limit reached, skipping embedding generation`);
      return null;
    }

    if (rateLimitStatus.ip && rateLimitStatus.ip.remaining === 0) {
      console.warn(`[QueryProcessor] IP rate limit reached, skipping embedding generation`);
      return null;
    }

    // Generate embedding with rate limiting
    return await withRateLimit(
      async () => {
        // generateQueryEmbedding already handles caching internally
        return await generateQueryEmbedding(normalizedQuery || query);
      },
      {
        userId,
        ipAddress,
        request,
      }
    );
  } catch (error: any) {
    // Check if it's a rate limit error
    const failure = detectBedrockFailure(error);
    if (failure.type === "rate_limit" || failure.type === "timeout") {
      console.warn(`[QueryProcessor] Embedding generation failed (${failure.type}), using keyword-only search`);
      return null; // Will trigger keyword-only fallback
    }
    
    // For other errors, log and return null
    console.error(`[QueryProcessor] Embedding generation error: ${error.message}`);
    return null;
  }
}

/**
 * Step 8: Perform hybrid search
 */
async function performHybridSearch(
  query: string,
  queryEmbedding: number[],
  filters: SearchFilters,
  bedrockCategory?: { category: string; confidence: number }
): Promise<Business[]> {
  return await hybridSearch(query, queryEmbedding, filters, bedrockCategory);
}

/**
 * Step 9: Apply filters
 */
function applyFilters(
  results: Business[],
  filters: SearchFilters,
  analysis: QueryAnalysis
): Business[] {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/search/query-processor.ts:633',message:'applyFilters entry',data:{inputCount:results.length,hasCategory:!!analysis.category,hasLocation:!!analysis.location,hasLocationEntities:!!(analysis.entities?.locations && analysis.entities.locations.length > 0)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  let filtered = [...results];
  
  // Check if query contains location entities (city names) even if location.city is not set
  const hasLocationEntities = analysis.entities?.locations && analysis.entities.locations.length > 0;

  // Apply category filter (use normalized category matching, but only if we have a strong match)
  // If category filter would remove all results, skip it to avoid over-filtering
  if (analysis.category) {
    const beforeCount = filtered.length;
    const { normalizeCategory } = require("../normalization/category-normalizer");
    const normalizedAnalysisCategory = normalizeCategory(analysis.category);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/search/query-processor.ts:645',message:'Before category filter',data:{beforeCount,category:analysis.category,normalizedCategory:normalizedAnalysisCategory},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    // Try filtering with normalized category matching
    const filteredByCategory = filtered.filter((b) => {
      if (!b.category) return true; // Keep businesses without category
      const normalizedBusinessCategory = normalizeCategory(b.category);
      // Match if normalized categories match, or if either contains the other
      return normalizedBusinessCategory === normalizedAnalysisCategory ||
             (normalizedBusinessCategory && normalizedAnalysisCategory && 
              (normalizedBusinessCategory.includes(normalizedAnalysisCategory) ||
               normalizedAnalysisCategory.includes(normalizedBusinessCategory)));
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/search/query-processor.ts:660',message:'After category filter',data:{afterCount:filteredByCategory.length,willApply:filteredByCategory.length > 0 || beforeCount === 0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    // Only apply category filter if it doesn't remove all results
    // This prevents over-filtering when NLP category doesn't match database categories
    if (filteredByCategory.length > 0 || beforeCount === 0) {
      filtered = filteredByCategory;
    }
    // If category filter would remove all results, keep original results (don't filter by category)
  }

  // Apply location filter (city name matching first, then distance)
  if (analysis.location) {
    // #region agent log
    const beforeLocationCount = filtered.length;
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/search/query-processor.ts:667',message:'Before location filter',data:{beforeCount:beforeLocationCount,hasCity:!!analysis.location.city,hasCoordinates:!!(analysis.location.lat && analysis.location.lng)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    // If location has a city, filter by city name first (exact match)
    if (analysis.location.city) {
      const locationCity = analysis.location.city.toLowerCase().trim();
      filtered = filtered.filter((b) => {
        const businessCity = (b.location?.city || "").toLowerCase().trim();
        const businessAddressCity = (b.location?.address || "").toLowerCase();
        
        // Match if city names match exactly or city is in address
        if (businessCity === locationCity || businessAddressCity.includes(locationCity)) {
          return true;
        }
        
        // Also check locationDetails if available
        const locationDetailsCity = ((b as any).locationDetails?.city || "").toLowerCase().trim();
        if (locationDetailsCity === locationCity) {
          return true;
        }
        
        return false;
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/search/query-processor.ts:688',message:'After city filter',data:{afterCount:filtered.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
    }
    
    // Also apply distance filter if coordinates are available and distance filter is specified
    // BUT: Skip distance filtering entirely if query contains location entities (city names) - these are city-based searches
    // City name matching is sufficient for city searches, distance filtering is too restrictive
    // Only apply strict distance filtering for "near me" searches (no city entities)
    if (analysis.location.lat && analysis.location.lng && filters.distance) {
      // Check if this is a city-based search (has location entities or city name)
      const isCitySearch = analysis.location.city || hasLocationEntities;
      
      if (isCitySearch) {
        // For city-based searches, skip distance filtering entirely
        // City name matching (if available) is sufficient, and distance filtering would exclude valid results
        // Distance filtering is only appropriate for "near me" type searches
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/search/query-processor.ts:721',message:'Skipping distance filter (city search)',data:{beforeCount:filtered.length,hasCity:!!analysis.location.city,hasLocationEntities},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        // Skip distance filtering - city name matching is sufficient for city-based searches
      } else {
        // For "near me" searches (no city entities), use strict distance filtering
        const maxDistance = filters.distance.max || 10000; // Default 10km (in meters)
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/search/query-processor.ts:737',message:'Applying distance filter (near me, strict)',data:{beforeCount:filtered.length,maxDistance},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        filtered = filtered.filter((b) => {
          if (!b.location?.latitude || !b.location?.longitude) {
            // If business has no coordinates but passed city filter, include it
            return true;
          }

          // Calculate distance using proper distance calculation (in meters)
          const distance = getDistance(
            {
              latitude: analysis.location!.lat,
              longitude: analysis.location!.lng,
            },
            {
              latitude: b.location.latitude,
              longitude: b.location.longitude,
            }
          );
          return distance <= maxDistance;
        });
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/search/query-processor.ts:757',message:'After distance filter (near me)',data:{afterCount:filtered.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
      }
    }
  }

  // Apply rating filter
  if (filters.rating?.min !== undefined) {
    filtered = filtered.filter((b) => (b.rating || 0) >= filters.rating!.min!);
  }

  // Apply price filter
  if (filters.priceRange?.values && filters.priceRange.values.length > 0) {
    filtered = filtered.filter((b) => {
      if (!b.priceRange) return false;
      return filters.priceRange!.values.includes(b.priceRange);
    });
  }

  // Apply other filters
  if (filters.isVerified !== undefined) {
    filtered = filtered.filter((b) => b.isVerified === filters.isVerified);
  }

  if (filters.status) {
    filtered = filtered.filter((b) => filters.status!.includes(b.status || "active"));
  }
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/search/query-processor.ts:737',message:'applyFilters return',data:{finalCount:filtered.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  return filtered;
}

/**
 * Extract meaningful keywords from query (removes stop words, location prepositions)
 */
function extractQueryKeywords(query: string): string[] {
  // Remove location prepositions and common stop words
  const locationPattern = /\s+(?:in|near|at|around|close to|within|from)\s+/i;
  const businessPart = query.split(locationPattern)[0].trim();
  
  // Common stop words to filter out
  const stopWords = new Set([
    'i', 'want', 'to', 'eat', 'a', 'an', 'the', 'and', 'or', 'but', 'for', 'with',
    'need', 'looking', 'for', 'show', 'me', 'find', 'get', 'where', 'can'
  ]);
  
  // Extract meaningful keywords (length >= 3, not stop words)
  const keywords = businessPart
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length >= 3 && !stopWords.has(word));
  
  return keywords;
}

/**
 * Step 10: Rank results
 */
function rankResults(
  results: Business[],
  location?: LocationResolutionResult,
  originalQuery?: string
): Business[] {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/search/query-processor.ts:766',message:'rankResults entry',data:{inputCount:results.length,hasLocation:!!location},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  // Convert to ranking format
  // Extract relevance scores from business objects if available (from hybrid search)
  const rankingInput = results.map((business) => {
    let distance: number | undefined;
    if (location && business.location?.latitude && business.location?.longitude) {
      distance = getDistance(
        {
          latitude: location.lat,
          longitude: location.lng,
        },
        {
          latitude: business.location.latitude,
          longitude: business.location.longitude,
        }
      );
      
      // Add distance to business object for frontend display
      (business as any).distance = distance;
      (business as any).distanceKm = distance / 1000;
    }

    // Get relevance score from business metadata if available (hybrid search stores it)
    const relevanceScore = (business as any).relevanceScore || (business as any).combinedScore || 0.5;

    return {
      businessId: business.businessId,
      relevanceScore,
      business,
      distance,
    };
  });

  // Extract keywords from query for exact name matching boost
  const queryKeywords = originalQuery ? extractQueryKeywords(originalQuery) : undefined;
  
  // Rank using ranking algorithm with keyword boost
  const ranked = rankSearchResults(
    rankingInput,
    location
      ? {
          latitude: location.lat,
          longitude: location.lng,
        }
      : undefined,
    queryKeywords
  );

  // Map back to businesses in ranked order
  const rankedBusinessIds = new Set(ranked.map((r) => r.businessId));
  const rankedBusinesses = ranked
    .map((r) => results.find((b) => b.businessId === r.businessId))
    .filter((b): b is Business => !!b);

  // Add any businesses not in ranked results (shouldn't happen, but safety)
  const unranked = results.filter((b) => !rankedBusinessIds.has(b.businessId));
  rankedBusinesses.push(...unranked);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/search/query-processor.ts:828',message:'rankResults return',data:{finalCount:rankedBusinesses.length,rankedCount:ranked.length,unrankedCount:unranked.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  return rankedBusinesses;
}

/**
 * Step 11: Return enriched results
 */
function formatResults(
  results: Business[],
  analysis: QueryAnalysis,
  performance: {
    responseTime: number;
    fromCache: boolean;
    steps?: StepPerformance[];
    bedrockApiCalls?: number;
    cacheHits?: number;
    errors?: string[];
  }
): QueryProcessingResult {
  return {
    results,
    analysis,
    performance: {
      responseTime: performance.responseTime,
      fromCache: performance.fromCache,
      steps: performance.steps || [],
      bedrockApiCalls: performance.bedrockApiCalls || 0,
      cacheHits: performance.cacheHits || 0,
      errors: performance.errors || [],
    },
  };
}

/**
 * Main query processing function
 * Implements complete 11-step pipeline with error handling and performance tracking
 */
export async function processQuery(
  query: string,
  userId?: string,
  session?: any,
  request?: any
): Promise<QueryProcessingResult> {
  const startTime = Date.now();
  const stepPerformance: StepPerformance[] = [];
  const errors: string[] = [];
  let fromCache = false;
  let bedrockApiCalls = 0;
  let cacheHits = 0;

  // Helper to track step performance
  const trackStep = async <T>(
    stepName: string,
    stepFn: () => Promise<T>,
    options?: { fromCache?: boolean }
  ): Promise<T | null> => {
    const stepStart = Date.now();
    try {
      const result = await stepFn();
      const duration = Date.now() - stepStart;
      stepPerformance.push({
        step: stepName,
        duration,
        fromCache: options?.fromCache || false,
      });
      if (options?.fromCache) cacheHits++;
      return result;
    } catch (error: any) {
      const duration = Date.now() - stepStart;
      const errorMsg = error.message || String(error);
      errors.push(`${stepName}: ${errorMsg}`);
      stepPerformance.push({
        step: stepName,
        duration,
        error: errorMsg,
      });
      console.error(`[QueryProcessor] Step "${stepName}" failed: ${errorMsg}`);
      return null;
    }
  };

  try {
    // Step 1: Validate and sanitize query
    let sanitizedQuery: string;
    try {
      sanitizedQuery = validateAndSanitizeQuery(query);
      stepPerformance.push({
        step: "1. Validate and sanitize",
        duration: 0,
      });
    } catch (error: any) {
      throw new Error(`Query validation failed: ${error.message}`);
    }

    // Build filters from session/user preferences
    const filters: SearchFilters = {
      limit: 20,
      ...(session?.filters || {}),
    };

    // Step 2: Check cache for complete analysis
    const cached = await trackStep("2. Check cache", async () => {
      return await checkCache(sanitizedQuery, filters);
    });

    if (cached?.results && cached.analysis) {
      fromCache = true;
      cacheHits = 3; // Analysis, embedding, and results all cached
      return formatResults(
        cached.results,
        cached.analysis,
        {
          responseTime: Date.now() - startTime,
          fromCache: true,
          steps: stepPerformance,
          bedrockApiCalls: 0,
          cacheHits: 3,
          errors: [],
        }
      );
    }

    // Step 3: Normalize query
    const normalizedQuery = await trackStep("3. Normalize query", async () => {
      return normalizeQuery(sanitizedQuery);
    });
    if (!normalizedQuery) {
      throw new Error("Query normalization failed");
    }

    // Step 4: Run Bedrock NLP analysis (with fallback and rate limiting)
    let nlpResult: { intent: string; category?: string; entities: EntityResult } | null = null;
    try {
      nlpResult = await trackStep("4. NLP analysis", async () => {
        bedrockApiCalls += 2; // extractEntities + detectIntent
        return await runNLPAnalysis(sanitizedQuery, userId, request);
      });
    } catch (error: any) {
      // Fallback to keyword search
      errors.push(`NLP analysis failed, using fallback: ${error.message}`);
      nlpResult = {
        intent: "search",
        entities: getEntityFallback(sanitizedQuery),
      };
      stepPerformance.push({
        step: "4. NLP analysis (fallback)",
        duration: 0,
        error: error.message,
      });
    }

    if (!nlpResult) {
      nlpResult = {
        intent: "search",
        entities: getEntityFallback(sanitizedQuery),
      };
    }

    // Step 5: Extract and normalize entities
    const normalizedEntities = await trackStep("5. Extract and normalize entities", async () => {
      return extractAndNormalizeEntities(nlpResult!.entities);
    });

    // Step 6: Resolve location (with fallback)
    let location: LocationResolutionResult | undefined;
    try {
      location = await trackStep("6. Resolve location", async () => {
        return await resolveLocationForQuery(sanitizedQuery, nlpResult!.entities, userId, session, request);
      }) || undefined;
    } catch (error: any) {
      // Location failure → Search without location filter
      errors.push(`Location resolution failed: ${error.message}`);
      location = undefined;
    }

    // Get Bedrock category classification for prioritization (if available)
    let bedrockCategory: { category: string; confidence: number } | undefined;
    if ((nlpResult as any).categoryClassification) {
      const catResult = (nlpResult as any).categoryClassification;
      if (catResult.category && catResult.confidence >= 0.5) {
        bedrockCategory = {
          category: catResult.category,
          confidence: catResult.confidence,
        };
      }
    }

    // Build analysis result
    const analysis: QueryAnalysis = {
      intent: nlpResult.intent,
      category: nlpResult.category,
      entities: nlpResult.entities,
      location,
    };

    // Update filters based on analysis
    if (analysis.category) {
      filters.categories = [analysis.category];
    }

    if (location) {
      filters.location = {
        lat: location.lat,
        lng: location.lng,
        radius: location.radius || 10000, // Default 10km
      };
      // Also set distance filter for applyFilters function
      filters.distance = {
        max: location.radius || 10000, // Default 10km in meters
      };
    }

    // Step 7: Generate or retrieve query embedding (with fallback and rate limiting)
    let queryEmbedding: number[] | null = null;
    if (cached?.embedding) {
      queryEmbedding = cached.embedding;
      cacheHits++;
      stepPerformance.push({
        step: "7. Get query embedding",
        duration: 0,
        fromCache: true,
      });
    } else {
      try {
        queryEmbedding = await trackStep("7. Generate query embedding", async () => {
          return await getQueryEmbedding(sanitizedQuery, normalizedQuery, userId, request);
        });
      } catch (error: any) {
        // Check failure type
        const failure = detectBedrockFailure(error);
        if (failure.type === "rate_limit") {
          errors.push(`Rate limit reached, using keyword-only search`);
        } else {
          errors.push(`Embedding generation failed: ${error.message}`);
        }
        queryEmbedding = null;
      }
    }

    // Step 8: Perform hybrid search (with fallback to keyword-only)
    // Pass Bedrock category to prioritize its results over category mapper
    let results: Business[] = [];
    if (queryEmbedding) {
      try {
        results = await trackStep("8. Hybrid search", async () => {
          return await performHybridSearch(sanitizedQuery, queryEmbedding!, filters, bedrockCategory);
        }) || [];
      } catch (error: any) {
        // Search failure → Return empty with error message
        errors.push(`Hybrid search failed: ${error.message}`);
        results = [];
      }
    } else {
      // Fallback to keyword-only search
      errors.push("Using keyword-only search (embedding unavailable)");
      try {
        const { searchBusinessesByName } = await import("./keyword-search");
        // Extract business keywords from query (remove location keywords)
        // Use business names from entities if available, otherwise use the query
        const businessKeywords = normalizedEntities && normalizedEntities.businessNames.length > 0
          ? normalizedEntities.businessNames.join(" ")
          : sanitizedQuery.split(/\s+(?:in|near|at|around)\s+/i)[0].trim() || sanitizedQuery;
        const keywordResults = await searchBusinessesByName(businessKeywords, filters.limit || 20, 0, true);
        results = keywordResults.items as Business[];
        stepPerformance.push({
          step: "8. Keyword search (fallback)",
          duration: 0,
        });
      } catch (error: any) {
        errors.push(`Keyword search fallback failed: ${error.message}`);
        results = [];
      }
    }

    // Step 9: Apply filters
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/search/query-processor.ts:1103',message:'Before applyFilters step',data:{resultCount:results.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      results = await trackStep("9. Apply filters", async () => {
        return applyFilters(results, filters, analysis);
      }) || results;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/search/query-processor.ts:1109',message:'After applyFilters step',data:{resultCount:results.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
    } catch (error: any) {
      errors.push(`Filter application failed: ${error.message}`);
      // Continue with unfiltered results
    }

    // Step 10: Rank results
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/search/query-processor.ts:1115',message:'Before rankResults step',data:{resultCount:results.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      results = await trackStep("10. Rank results", async () => {
        return rankResults(results, location, sanitizedQuery);
      }) || results;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/search/query-processor.ts:1121',message:'After rankResults step',data:{resultCount:results.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
    } catch (error: any) {
      errors.push(`Ranking failed: ${error.message}`);
      // Continue with unranked results
    }

    // Cache results (non-blocking)
    const cacheKey = `query:${hashString(sanitizedQuery + JSON.stringify(filters))}`;
    try {
      await Promise.all([
        set(`${cacheKey}:analysis`, analysis, CACHE_TTL.ANALYSIS),
        queryEmbedding && set(`${cacheKey}:embedding`, queryEmbedding, CACHE_TTL.EMBEDDING),
        set(`${cacheKey}:results`, results, CACHE_TTL.RESULTS),
      ]);
    } catch (error) {
      // Cache errors shouldn't break the pipeline
      console.warn(`[QueryProcessor] Cache save failed: ${error}`);
    }

    // Step 11: Return enriched results (even if partial)
    return formatResults(results, analysis, {
      responseTime: Date.now() - startTime,
      fromCache: false,
      steps: stepPerformance,
      bedrockApiCalls,
      cacheHits,
      errors,
    });
  } catch (error: any) {
    console.error(`[QueryProcessor] Pipeline failed: ${error.message}`);
    // Return partial results if possible
    return {
      results: [],
      analysis: {
        intent: "search",
        entities: getEntityFallback(query),
      },
      performance: {
        responseTime: Date.now() - startTime,
        fromCache: false,
        steps: stepPerformance,
        bedrockApiCalls,
        cacheHits,
        errors: [...errors, `Pipeline error: ${error.message}`],
      },
    };
  }
}
