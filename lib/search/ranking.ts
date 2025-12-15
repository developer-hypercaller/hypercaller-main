/**
 * Ranking utilities
 * Ranks search results based on multiple factors
 */

import { Business } from "../schemas/business-schema";
import { SearchResult } from "../schemas/search-schema";
import { getDistance } from "../utils/distance";

export interface RankingFactors {
  relevanceScore: number; // 0-1 from semantic/keyword search
  distance?: number; // Distance in meters
  rating?: number; // Business rating 0-5
  reviewCount?: number; // Number of reviews
  isVerified?: boolean; // Whether business is verified
  recency?: number; // How recent the business was created/updated
  queryKeywords?: string[]; // Keywords from user query for exact name matching
  businessName?: string; // Business name for keyword boost
  businessDescription?: string; // Business description for keyword boost
}

/**
 * Calculate keyword match boost
 * Boosts businesses whose names contain exact query keywords
 */
function calculateKeywordBoost(queryKeywords: string[], businessName: string, businessDescription?: string): number {
  if (!queryKeywords || queryKeywords.length === 0) return 0;
  
  const nameLower = businessName.toLowerCase();
  const descLower = (businessDescription || "").toLowerCase();
  let boost = 0;
  
  for (const keyword of queryKeywords) {
    const keywordLower = keyword.toLowerCase().trim();
    if (keywordLower.length < 3) continue; // Skip very short keywords
    
    // Exact keyword in business name (highest boost: +0.15)
    if (nameLower.includes(keywordLower)) {
      // Exact word match (not just substring) gets even higher boost
      const nameWords = nameLower.split(/\s+/);
      if (nameWords.includes(keywordLower) || nameWords.some(w => w.startsWith(keywordLower))) {
        boost += 0.15;
      } else {
        boost += 0.10; // Substring match
      }
    }
    
    // Keyword in description (smaller boost: +0.05)
    if (descLower.includes(keywordLower)) {
      boost += 0.05;
    }
  }
  
  return Math.min(0.25, boost); // Cap keyword boost at 25%
}

/**
 * Calculate ranking score
 */
export function calculateRankingScore(factors: RankingFactors): number {
  let score = 0;

  // Keyword boost (if query keywords provided) - adds to relevance
  let keywordBoost = 0;
  if (factors.queryKeywords && factors.businessName) {
    keywordBoost = calculateKeywordBoost(
      factors.queryKeywords,
      factors.businessName,
      factors.businessDescription
    );
  }
  
  // Enhanced relevance score (relevance + keyword boost) - 50% weight
  const enhancedRelevance = Math.min(1.0, factors.relevanceScore + keywordBoost);
  score += enhancedRelevance * 0.5;

  // Distance (if provided) - 15% weight (reduced from 20% to prioritize relevance)
  if (factors.distance !== undefined) {
    // Normalize distance: closer businesses get higher scores
    // Max distance considered: 50km = 50000m
    const maxDistance = 50000;
    const distanceScore = Math.max(0, 1 - factors.distance / maxDistance);
    score += distanceScore * 0.15;
  }

  // Rating - 15% weight (reduced from 20%)
  if (factors.rating !== undefined) {
    const ratingScore = factors.rating / 5.0; // Normalize to 0-1
    score += ratingScore * 0.15;
  }

  // Review count - 10% weight (more reviews = more trusted)
  if (factors.reviewCount !== undefined) {
    // Normalize: log scale (reviews can vary widely)
    const reviewScore = Math.min(1.0, Math.log10(factors.reviewCount + 1) / 3); // log10(1000) ≈ 3
    score += reviewScore * 0.1;
  }

  // Verification - 5% weight
  if (factors.isVerified) {
    score += 0.05;
  }

  // Recency - 5% weight (newer businesses get slight boost)
  if (factors.recency !== undefined) {
    // Normalize: businesses created in last 30 days get full score
    const daysSinceCreation = factors.recency / (24 * 60 * 60);
    const recencyScore = Math.max(0, 1 - daysSinceCreation / 30);
    score += recencyScore * 0.05;
  }

  return Math.min(1.0, score);
}

/**
 * Rank search results
 */
export function rankSearchResults(
  results: Array<{
    businessId: string;
    relevanceScore: number;
    business?: Business;
    distance?: number;
  }>,
  userLocation?: { latitude: number; longitude: number },
  queryKeywords?: string[] // Optional query keywords for exact name matching boost
): SearchResult[] {
  const ranked = results.map((result) => {
    const business = result.business;

    // Calculate distance if user location provided
    let distance: number | undefined;
    if (userLocation && business?.location) {
      distance = getDistance(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
        {
          latitude: business.location.latitude,
          longitude: business.location.longitude,
        }
      );
    }

    // Calculate recency
    const recency = business?.createdAt
      ? Math.floor(Date.now() / 1000) - business.createdAt
      : undefined;

    // Calculate ranking score with keyword boost
    const rankingScore = calculateRankingScore({
      relevanceScore: result.relevanceScore,
      distance,
      rating: business?.rating,
      reviewCount: business?.reviewCount,
      isVerified: business?.isVerified,
      recency,
      queryKeywords,
      businessName: business?.name || "",
      businessDescription: business?.description,
    });

    return {
      businessId: result.businessId,
      score: rankingScore,
      distance,
      matchReason: `Relevance: ${(result.relevanceScore * 100).toFixed(0)}%`,
    };
  });

  // Sort by ranking score (descending)
  ranked.sort((a, b) => b.score - a.score);

  return ranked;
}

