/**
 * Status normalization utilities
 */

import { normalizeStatus, BusinessStatus } from "../data/status-values";

/**
 * Normalize status input
 */
export function normalizeStatusInput(input: string): BusinessStatus | null {
  if (!input || typeof input !== "string") {
    return null;
  }

  return normalizeStatus(input.trim());
}

