/**
 * Similarity calculation utilities
 * For comparing embeddings and calculating similarity scores
 */

/**
 * Calculate cosine similarity between two vectors
 * Returns value between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite)
 * Typically returns 0-1 for normalized vectors
 * 
 * @param vec1 - First vector
 * @param vec2 - Second vector
 * @returns Cosine similarity score between -1 and 1
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  // Handle dimension mismatches
  if (vec1.length !== vec2.length) {
    throw new Error(`Vectors must have the same length. Got ${vec1.length} and ${vec2.length}`);
  }

  // Handle zero vectors
  if (vec1.length === 0) {
    return 0;
  }

  // Calculate dot product
  let dotProduct = 0;
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
  }

  // Calculate magnitudes
  const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
  const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));

  // Handle zero vectors (division by zero)
  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }

  // Return cosine similarity
  return dotProduct / (mag1 * mag2);
}

/**
 * Calculate Euclidean distance between two vectors
 */
export function euclideanDistance(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error("Vectors must have the same length");
  }

  let sum = 0;
  for (let i = 0; i < vec1.length; i++) {
    const diff = vec1[i] - vec2[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Convert distance to similarity score (0 to 1)
 * Uses inverse distance with normalization
 */
export function distanceToSimilarity(distance: number, maxDistance: number = 10): number {
  if (distance >= maxDistance) {
    return 0;
  }

  return 1 - distance / maxDistance;
}

/**
 * Calculate similarity score from cosine similarity
 * Converts -1 to 1 range to 0 to 1 range
 */
export function normalizeSimilarity(cosineSimilarity: number): number {
  // Cosine similarity ranges from -1 to 1
  // Normalize to 0 to 1
  return (cosineSimilarity + 1) / 2;
}

/**
 * Calculate text similarity (simple Jaccard similarity)
 */
export function textSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  if (union.size === 0) {
    return 0;
  }

  return intersection.size / union.size;
}

