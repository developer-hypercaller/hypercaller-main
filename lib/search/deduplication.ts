/**
 * Deduplication utilities
 * Removes duplicate results from search
 */

import { SearchResult } from "../schemas/search-schema";

/**
 * Deduplicate search results by business ID
 * Keeps the result with the highest score
 */
export function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const seen = new Map<string, SearchResult>();

  results.forEach((result) => {
    const existing = seen.get(result.businessId);

    if (!existing || result.score > existing.score) {
      seen.set(result.businessId, result);
    }
  });

  return Array.from(seen.values());
}

/**
 * Merge multiple result sets and deduplicate
 */
export function mergeAndDeduplicate(
  resultSets: SearchResult[][]
): SearchResult[] {
  // Flatten all results
  const allResults = resultSets.flat();

  // Deduplicate
  return deduplicateResults(allResults);
}

/**
 * Remove results that are too similar (optional advanced deduplication)
 */
export function removeSimilarResults(
  results: SearchResult[],
  similarityThreshold: number = 0.95
): SearchResult[] {
  // For now, just deduplicate by ID
  // Advanced similarity checking would require comparing business names/descriptions
  return deduplicateResults(results);
}

