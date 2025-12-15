/**
 * Price range mapping utilities
 */

import { PriceRange } from "../data/price-ranges";
import { normalizePriceRange } from "../data/price-ranges";

/**
 * Map price value to price range
 */
export function mapPriceToPriceRange(price: number): PriceRange {
  if (price <= 300) {
    return "$";
  } else if (price <= 800) {
    return "$$";
  } else if (price <= 2000) {
    return "$$$";
  } else {
    return "$$$$";
  }
}

/**
 * Map price range string to PriceRange enum
 */
export function mapStringToPriceRange(input: string): PriceRange | null {
  return normalizePriceRange(input);
}

