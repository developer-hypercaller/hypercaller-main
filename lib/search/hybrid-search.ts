/**
 * Hybrid search module
 * Combines semantic search and keyword search for better results
 * 
 * Implements hybrid search by:
 * 1. Running semantic search and keyword search in parallel
 * 2. Merging results and deduplicating by businessId
 * 3. Calculating combined scores (70% semantic, 30% keyword)
 * 4. Sorting by combined score
 * 5. Returning top results
 */

import { semanticSearch, semanticSearchFromQuery, SemanticSearchResult, SemanticSearchFilters } from "./semantic-search";
import { searchBusinessesByName, matchText } from "./keyword-search";
import { Business } from "../schemas/business-schema";
import { SearchFilters } from "../schemas/filter-schema";
import { getAllCategories } from "../data/categories";

/**
 * Keyword search result with relevance score
 */
export interface KeywordSearchResult {
  business: Business;
  relevance: number; // Relevance score 0-1
}

/**
 * Hybrid search result
 */
export interface HybridSearchResult {
  business: Business;
  semanticScore: number; // Semantic similarity score (0-1)
  keywordScore: number; // Keyword relevance score (0-1)
  combinedScore: number; // Combined weighted score (0-1)
}

/**
 * Default weights for score combination
 */
const DEFAULT_WEIGHTS = {
  semantic: 0.7, // 70% weight for semantic search
  keyword: 0.3, // 30% weight for keyword search
};

/**
 * Normalize score to 0-1 range
 * Handles scores that might be outside the expected range
 * 
 * @param score - Score to normalize
 * @param min - Minimum possible score (default: -1 for cosine similarity)
 * @param max - Maximum possible score (default: 1 for cosine similarity)
 * @returns Normalized score in 0-1 range
 */
function normalizeScore(score: number, min: number = -1, max: number = 1): number {
  // Clamp score to [min, max] range
  const clamped = Math.max(min, Math.min(max, score));
  
  // Normalize to 0-1 range
  if (max === min) {
    return 0; // Avoid division by zero
  }
  
  return (clamped - min) / (max - min);
}

/**
 * Calculate combined score from semantic and keyword scores
 * Uses weighted combination: semantic (70%) + keyword (30%)
 * 
 * @param semanticScore - Semantic similarity score (typically 0-1, but can be -1 to 1)
 * @param keywordScore - Keyword relevance score (0-1)
 * @param weights - Optional weights (default: 70% semantic, 30% keyword)
 * @returns Combined score in 0-1 range
 */
export function calculateCombinedScore(
  semanticScore: number,
  keywordScore: number,
  weights: { semantic: number; keyword: number } = DEFAULT_WEIGHTS
): number {
  // Normalize semantic score to 0-1 range (cosine similarity can be -1 to 1)
  const normalizedSemantic = normalizeScore(semanticScore, -1, 1);
  
  // Keyword score should already be in 0-1 range, but normalize to be safe
  const normalizedKeyword = normalizeScore(keywordScore, 0, 1);
  
  // Calculate weighted combination
  const combinedScore = normalizedSemantic * weights.semantic + normalizedKeyword * weights.keyword;
  
  // Ensure result is in 0-1 range
  return Math.max(0, Math.min(1, combinedScore));
}

/**
 * Merge search results from semantic and keyword searches
 * Combines results, deduplicates by businessId, and calculates combined scores
 * 
 * @param semanticResults - Results from semantic search
 * @param keywordResults - Results from keyword search
 * @param weights - Optional weights for score combination
 * @returns Merged results with combined scores, sorted by combined score (descending)
 */
export function mergeSearchResults(
  semanticResults: Array<{ business: Business; similarity: number }>,
  keywordResults: Array<{ business: Business; relevance: number }>,
  weights: { semantic: number; keyword: number } = DEFAULT_WEIGHTS
): HybridSearchResult[] {
  // Create a map to store merged results by businessId
  const mergedMap = new Map<string, HybridSearchResult>();

  // Process semantic results
  for (const result of semanticResults) {
    const businessId = result.business.businessId;
    if (!businessId) continue;

    const existing = mergedMap.get(businessId);
    if (existing) {
      // Business already exists, update semantic score if higher
      if (result.similarity > existing.semanticScore) {
        existing.semanticScore = result.similarity;
        existing.combinedScore = calculateCombinedScore(
          existing.semanticScore,
          existing.keywordScore,
          weights
        );
      }
    } else {
      // New business, add with semantic score only
      mergedMap.set(businessId, {
        business: result.business,
        semanticScore: result.similarity,
        keywordScore: 0, // Will be updated if found in keyword results
        combinedScore: calculateCombinedScore(result.similarity, 0, weights),
      });
    }
  }

  // Process keyword results
  for (const result of keywordResults) {
    const businessId = result.business.businessId;
    if (!businessId) continue;

    const existing = mergedMap.get(businessId);
    if (existing) {
      // Business already exists, update keyword score if higher
      if (result.relevance > existing.keywordScore) {
        existing.keywordScore = result.relevance;
        existing.combinedScore = calculateCombinedScore(
          existing.semanticScore,
          existing.keywordScore,
          weights
        );
      }
    } else {
      // New business, add with keyword score only
      mergedMap.set(businessId, {
        business: result.business,
        semanticScore: 0, // Will remain 0 if not in semantic results
        keywordScore: result.relevance,
        combinedScore: calculateCombinedScore(0, result.relevance, weights),
      });
    }
  }

  // Convert map to array and sort by combined score (descending)
  const mergedResults = Array.from(mergedMap.values());
  mergedResults.sort((a, b) => b.combinedScore - a.combinedScore);

  return mergedResults;
}

/**
 * Perform keyword search with relevance scoring
 * Searches businesses by name and calculates relevance scores
 * 
 * @param query - Search query string
 * @param limit - Maximum number of results
 * @param bedrockCategory - Optional: Bedrock NLP classified category with confidence (to prioritize)
 * @returns Array of keyword search results with relevance scores
 */
async function performKeywordSearch(
  query: string,
  limit: number = 50,
  bedrockCategory?: { category: string; confidence: number }
): Promise<KeywordSearchResult[]> {
  try {
    // Extract business keywords from query (remove location keywords like "in", "near", etc.)
    // Split on common location prepositions and take the first part
    const businessKeywords = query.split(/\s+(?:in|near|at|around|close to)\s+/i)[0].trim() || query;
    
    // Get category matches with priority (exact vs parent categories)
    // BUT: If Bedrock NLP has high confidence, prioritize its category over category mapper
    const { extractCategoriesFromQueryWithPriority } = await import("./category-mapper");
    let categoryMatches = extractCategoriesFromQueryWithPriority(query);
    
    // If Bedrock NLP has high confidence (>=0.7), use its category and override category mapper false positives
    if (bedrockCategory && bedrockCategory.confidence >= 0.7) {
      const bedrockCat = bedrockCategory.category.toLowerCase();
      
      // Clear any incorrect parent matches that don't align with Bedrock's classification
      if (bedrockCat !== "general") {
        // If Bedrock says it's a specific category, prioritize that
        // Remove parent matches that contradict Bedrock's classification
        const allCategoriesList = getAllCategories();
        const bedrockCategoryData = allCategoriesList.find(c => c.id.toLowerCase() === bedrockCat);
        const bedrockParentId = bedrockCategoryData?.parentId?.toLowerCase();
        
        // Only keep parent matches that are actually parents of the Bedrock category
        const validatedParentMatches = bedrockParentId 
          ? categoryMatches.parentMatches.filter(cat => cat.toLowerCase() === bedrockParentId)
          : [];
        
        // If Bedrock category is in exact matches, that's perfect
        // If not, add it as an exact match (Bedrock is authoritative when confidence >= 0.7)
        const hasBedrockInExact = categoryMatches.exactMatches.some(c => c.toLowerCase() === bedrockCat);
        if (!hasBedrockInExact) {
          // Add Bedrock category as primary exact match, remove any conflicting matches
          categoryMatches = {
            exactMatches: [bedrockCat],
            parentMatches: validatedParentMatches,
            allCategories: [bedrockCat, ...validatedParentMatches],
          };
        } else {
          // Bedrock category is already in exact matches, just clean up parent matches
          categoryMatches = {
            exactMatches: categoryMatches.exactMatches.filter(c => {
              // Keep Bedrock category and any that match it, remove others
              const cLower = c.toLowerCase();
              return cLower === bedrockCat || (bedrockParentId && cLower === bedrockParentId);
            }),
            parentMatches: validatedParentMatches,
            allCategories: [bedrockCat, ...validatedParentMatches].filter((v, i, arr) => arr.indexOf(v) === i),
          };
        }
      } else {
        // Bedrock says "general" with high confidence - clear category mapper results (they're likely false positives)
        categoryMatches = {
          exactMatches: [],
          parentMatches: [],
          allCategories: [],
        };
      }
    }
    
    const isCategorySearch = categoryMatches.allCategories.length > 0;
    
    // Search businesses by name (this now also searches by category when applicable)
    // Pass isSearchQuery=true to skip business name validation (queries can have special chars)
    const searchResults = await searchBusinessesByName(businessKeywords, limit * 3, 0, true);
    
    // Calculate relevance scores for each result
    const keywordResults: KeywordSearchResult[] = [];
    
    for (const business of searchResults.items) {
      // Calculate relevance score using matchText function
      // Use businessKeywords (extracted) instead of full query for better matching
      const nameRelevance = matchText(business.name || "", businessKeywords);
      
      // Also check description if available
      let descriptionRelevance = 0;
      if (business.description) {
        descriptionRelevance = matchText(business.description, businessKeywords);
      }
      
      // Check query terms in name/description (higher boost for exact term matches)
      let queryTermRelevance = 0;
      const queryTerms = businessKeywords.toLowerCase().split(/\s+/).filter(t => t.length >= 3);
      const businessName = (business.name || "").toLowerCase();
      const businessDesc = (business.description || "").toLowerCase();
      
      for (const term of queryTerms) {
        // Check if term appears in name (strong boost)
        if (businessName.includes(term)) {
          queryTermRelevance += 0.15; // Boost for term in name
        }
        // Check if term appears in description (moderate boost)
        if (businessDesc.includes(term)) {
          queryTermRelevance += 0.05; // Boost for term in description
        }
      }
      queryTermRelevance = Math.min(0.3, queryTermRelevance); // Cap at 0.3
      
      // Check if business category matches query category (category search match)
      // Exact category matches get higher relevance than parent category matches
      let categoryRelevance = 0;
      if (isCategorySearch && business.category) {
        const businessCategory = business.category.toLowerCase();
        
        // Check for exact category match (highest priority)
        for (const exactCategory of categoryMatches.exactMatches) {
          if (businessCategory === exactCategory.toLowerCase()) {
            categoryRelevance = 0.7; // High score for exact category match
            break;
          }
        }
        
        // If no exact match, check parent categories (lower priority)
        if (categoryRelevance === 0) {
          for (const parentCategory of categoryMatches.parentMatches) {
            if (businessCategory === parentCategory.toLowerCase()) {
              categoryRelevance = 0.4; // Lower score for parent category match
              break;
            }
          }
        }
        
        // Also check if business category is in all categories (fallback)
        if (categoryRelevance === 0) {
          for (const matchedCategory of categoryMatches.allCategories) {
            if (businessCategory === matchedCategory.toLowerCase()) {
              categoryRelevance = 0.3; // Base score for any category match
              break;
            }
          }
        }
      }
      
      // Combine name, description, query term, and category relevance
      // Base relevance from text matching
      let relevance = nameRelevance * 0.6 + descriptionRelevance * 0.2 + queryTermRelevance;
      
      // Apply category relevance boost
      if (categoryRelevance > 0) {
        // If we have a category match, boost the relevance
        // Exact category matches get much higher boost
        if (categoryRelevance >= 0.7) {
          // Exact category match: use category relevance as base, add text matching as bonus
          relevance = categoryRelevance + (relevance * 0.2); // Category is primary, text is bonus
        } else if (categoryRelevance >= 0.4) {
          // Parent category match: combine category and text matching
          relevance = Math.max(relevance, categoryRelevance * 0.7 + relevance * 0.3);
        } else {
          // Any category match: use category as minimum
          relevance = Math.max(relevance, categoryRelevance);
        }
      }
      
      // Cap relevance at 1.0
      relevance = Math.min(1.0, relevance);
      
      // Only include results with some relevance (name, description, query term, or category match)
      if (relevance > 0 || categoryRelevance > 0) {
        keywordResults.push({
          business: business as Business,
          relevance,
        });
      }
    }
    
    // Sort by relevance (descending)
    keywordResults.sort((a, b) => b.relevance - a.relevance);
    
    // Return top results
    return keywordResults.slice(0, limit);
  } catch (error: any) {
    console.error(`[HybridSearch] Keyword search failed: ${error.message}`);
    return [];
  }
}

/**
 * Search filters for hybrid search
 * Extends SearchFilters with additional hybrid-specific options
 */
export interface HybridSearchFilters extends SemanticSearchFilters {
  // Inherits category, location, limit from SemanticSearchFilters
}

/**
 * Perform hybrid search
 * Combines semantic and keyword search results
 * Runs both searches in parallel, merges results, calculates combined scores, and returns top results
 * 
 * @param query - Search query string
 * @param queryEmbedding - Pre-computed query embedding vector (1024 dimensions for Titan/Cohere v3)
 * @param filters - Search filters (category, location, limit, etc.)
 * @param bedrockCategory - Optional: Bedrock NLP classified category with confidence (to prioritize over category mapper)
 * @returns Array of businesses sorted by combined score (descending)
 */
export async function hybridSearch(
  query: string,
  queryEmbedding: number[],
  filters: SearchFilters = {},
  bedrockCategory?: { category: string; confidence: number }
): Promise<Business[]> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/search/hybrid-search.ts:379',message:'hybridSearch entry',data:{query,embeddingLength:queryEmbedding.length,hasCategory:!!filters.categories,hasLocation:!!filters.location},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  // Extract limit from filters or use default
  const limit = (filters as any).limit || 20;
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/search/hybrid-search.ts:386',message:'After extract limit',data:{limit},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return [];
  }

  // Validate query embedding
  if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
    throw new Error("Query embedding must be a non-empty array");
  }

  // Convert SearchFilters to SemanticSearchFilters format
  const semanticFilters: SemanticSearchFilters = {
    category: (filters as any).category || filters.categories?.[0],
    location: (filters as any).location,
    limit,
  };

  try {
    // Run semantic and keyword searches in parallel
    // Pass bedrockCategory to keyword search to prioritize it
    const [semanticResults, keywordResults] = await Promise.all([
      semanticSearch(queryEmbedding, semanticFilters),
      performKeywordSearch(query, limit * 2, bedrockCategory), // Pass bedrock category for prioritization
    ]);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/search/hybrid-search.ts:410',message:'After parallel searches',data:{semanticCount:semanticResults.length,keywordCount:keywordResults.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    // Merge results with default weights (70% semantic, 30% keyword)
    const mergedResults = mergeSearchResults(semanticResults, keywordResults, DEFAULT_WEIGHTS);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/search/hybrid-search.ts:414',message:'After merge results',data:{mergedCount:mergedResults.length,limit},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    // Sort by combined score (already sorted, but ensure)
    mergedResults.sort((a, b) => b.combinedScore - a.combinedScore);

    // Apply limit and return top N results (businesses with relevance scores attached)
    const finalResults = mergedResults.slice(0, limit).map((result) => {
      // Attach relevance scores to business object for ranking
      (result.business as any).relevanceScore = result.combinedScore;
      (result.business as any).combinedScore = result.combinedScore;
      (result.business as any).semanticScore = result.semanticScore;
      (result.business as any).keywordScore = result.keywordScore;
      return result.business;
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/search/hybrid-search.ts:426',message:'Before return final results',data:{finalCount:finalResults.length,limit},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return finalResults;
  } catch (error: any) {
    // #region agent log
    const errorMsg = error instanceof Error ? error.message : String(error);
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/search/hybrid-search.ts:430',message:'Hybrid search error',data:{errorMessage:errorMsg},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    console.error(`[HybridSearch] Hybrid search failed: ${error.message}`);
    return [];
  }
}

/**
 * Perform hybrid search and return full results with scores
 * 
 * @param query - Search query string
 * @param queryEmbedding - Pre-computed query embedding (optional)
 * @param filters - Search filters
 * @param weights - Optional weights for score combination
 * @returns Array of hybrid search results with scores
 */
export async function hybridSearchWithScores(
  query: string,
  queryEmbedding?: number[],
  filters: HybridSearchFilters = {},
  weights: { semantic: number; keyword: number } = DEFAULT_WEIGHTS
): Promise<HybridSearchResult[]> {
  const { limit = 20 } = filters;

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return [];
  }

  try {
    // Run semantic and keyword searches in parallel
    const [semanticResults, keywordResults] = await Promise.all([
      // Use provided embedding or generate from query
      queryEmbedding
        ? semanticSearch(queryEmbedding, filters)
        : semanticSearchFromQuery(query, filters),
      performKeywordSearch(query, limit * 2),
    ]);

    // Merge results
    const mergedResults = mergeSearchResults(semanticResults, keywordResults, weights);

    // Return top N results with scores
    return mergedResults.slice(0, limit);
  } catch (error: any) {
    console.error(`[HybridSearch] Hybrid search failed: ${error.message}`);
    return [];
  }
}

/**
 * Perform hybrid search with custom semantic and keyword results
 * Useful when you already have results from both searches
 * 
 * @param semanticResults - Results from semantic search
 * @param keywordResults - Results from keyword search
 * @param weights - Optional weights for score combination
 * @returns Merged hybrid search results
 */
export function hybridSearchFromResults(
  semanticResults: SemanticSearchResult[],
  keywordResults: KeywordSearchResult[],
  weights: { semantic: number; keyword: number } = DEFAULT_WEIGHTS
): HybridSearchResult[] {
  return mergeSearchResults(semanticResults, keywordResults, weights);
}

