/**
 * Category mapping for keyword search
 * Maps search terms to category IDs for enhanced search results
 */

// Import categories
import { categoryTaxonomy, getAllCategories } from "../data/categories";

/**
 * Convert plural word to singular (simple English plural rules)
 * Handles common plural forms: -s, -es, -ies, -ves, etc.
 * 
 * @param word - The word to convert to singular
 * @returns The singular form of the word
 */
function pluralToSingular(word: string): string {
  const lower = word.toLowerCase();
  
  // Already singular or too short
  if (lower.length <= 3) return word;
  
  // Handle common plural patterns
  if (lower.endsWith("ies") && lower.length > 4) {
    // cities -> city, parties -> party
    return word.slice(0, -3) + "y";
  }
  if (lower.endsWith("ves") && lower.length > 4) {
    // knives -> knife, leaves -> leaf
    if (lower.endsWith("ives")) return word.slice(0, -4) + "ife";
    if (lower.endsWith("aves")) return word.slice(0, -4) + "af";
    if (lower.endsWith("lves")) return word.slice(0, -4) + "lf";
    return word.slice(0, -3) + "f";
  }
  if (lower.endsWith("es") && lower.length > 3) {
    // boxes -> box, dishes -> dish, but not "yes"
    const beforeEs = lower.slice(0, -2);
    if (beforeEs.endsWith("s") || beforeEs.endsWith("x") || beforeEs.endsWith("z") || 
        beforeEs.endsWith("ch") || beforeEs.endsWith("sh")) {
      return word.slice(0, -2);
    }
  }
  if (lower.endsWith("s") && !lower.endsWith("ss") && !lower.endsWith("us")) {
    // restaurants -> restaurant, cafes -> cafe
    return word.slice(0, -1);
  }
  
  return word;
}

/**
 * Get both singular and plural forms of a word for matching
 * 
 * @param word - The word to get forms for
 * @returns Array of [word, singular, plural] forms
 */
function getWordForms(word: string): string[] {
  const lower = word.toLowerCase();
  const forms = new Set<string>([lower]);
  
  // Add singular form if it's plural
  const singular = pluralToSingular(lower);
  if (singular !== lower) {
    forms.add(singular);
  }
  
  // Add plural form if it's singular (simple -s, -es rules)
  if (!lower.endsWith("s")) {
    forms.add(lower + "s");
  } else if (lower.endsWith("y") && !lower.endsWith("ay") && !lower.endsWith("ey") && !lower.endsWith("oy") && !lower.endsWith("uy")) {
    forms.add(lower.slice(0, -1) + "ies");
  }
  
  return Array.from(forms);
}

/**
 * Get category ID for a search term (strict matching - exact matches only)
 * Checks if the search term matches any category's synonyms or display names
 * Uses exact matching to avoid false positives, with plural handling
 * 
 * @param searchTerm - The search term to map to a category
 * @returns Category ID if found, null otherwise
 */
export function getCategoryForSearchTermStrict(searchTerm: string): string | null {
  if (!searchTerm || typeof searchTerm !== "string") {
    return null;
  }

  const normalizedTerm = searchTerm.toLowerCase().trim();
  const categories = getAllCategories();
  
  // Get word forms (original, singular, plural) for plural handling
  const wordForms = getWordForms(normalizedTerm);

  // Check each category and its synonyms
  for (const category of categories) {
    // Check direct ID match (with plural handling)
    for (const form of wordForms) {
      if (category.id.toLowerCase() === form) {
        return category.id;
      }
    }

    // Check name (exact match only, with plural handling)
    for (const form of wordForms) {
      if (category.name.toLowerCase() === form) {
        return category.id;
      }
    }

    // Check display name (exact match only, with plural handling)
    if (category.displayName) {
      for (const form of wordForms) {
        if (category.displayName.toLowerCase() === form) {
          return category.id;
        }
      }
    }

    // Check synonyms (exact match only, with plural handling)
    if (category.synonyms && category.synonyms.length > 0) {
      for (const synonym of category.synonyms) {
        const normalizedSynonym = synonym.toLowerCase();
        
        // Exact match (with plural handling)
        for (const form of wordForms) {
          if (normalizedSynonym === form) {
            return category.id;
          }
        }
        
        // Word boundary match for multi-word synonyms (e.g., "coffee shop" matches "coffee shop")
        // But NOT substring matches (e.g., "where" should NOT match "where to stay")
        const synonymWords = normalizedSynonym.split(/\s+/);
        for (const form of wordForms) {
          if (synonymWords.includes(form)) {
            return category.id;
          }
        }
      }
    }

    // Check Indian terms (exact match only, with plural handling)
    if (category.indianTerms && category.indianTerms.length > 0) {
      for (const term of category.indianTerms) {
        for (const form of wordForms) {
          if (term.toLowerCase() === form) {
            return category.id;
          }
        }
      }
    }

    // Check subcategories (exact match only, with plural handling)
    if (category.subcategories && category.subcategories.length > 0) {
      for (const subcategory of category.subcategories) {
        for (const form of wordForms) {
          if (subcategory.toLowerCase() === form) {
            return category.id;
          }
        }
      }
    }
  }

  return null;
}

/**
 * Get category ID for a search term (legacy - uses substring matching)
 * @deprecated Use getCategoryForSearchTermStrict for better accuracy
 * 
 * @param searchTerm - The search term to map to a category
 * @returns Category ID if found, null otherwise
 */
export function getCategoryForSearchTerm(searchTerm: string): string | null {
  // Use strict matching for better accuracy
  return getCategoryForSearchTermStrict(searchTerm);
}

/**
 * Extract category terms from a search query with priority
 * Splits the query and checks each word for category matches
 * Returns both exact matches and parent categories with priority info
 * 
 * @param query - The full search query
 * @returns Object with exact category matches and parent categories
 */
export function extractCategoriesFromQueryWithPriority(query: string): {
  exactMatches: string[]; // Direct category matches (highest priority)
  parentMatches: string[]; // Parent category matches (lower priority)
  allCategories: string[]; // All related categories
} {
  if (!query || typeof query !== "string") {
    return { exactMatches: [], parentMatches: [], allCategories: [] };
  }

  const normalizedQuery = query.toLowerCase().trim();
  const categories = getAllCategories();
  const exactMatches = new Set<string>();
  const parentMatches = new Set<string>();

  // Check multi-word patterns first (more specific)
  // IMPORTANT: These patterns are checked BEFORE word splitting to preserve phrases
  const multiWordPatterns = [
    // Food & Dining
    { pattern: /coffee\s+shop/gi, category: "cafe" }, // cafe is more specific than food
    { pattern: /coffee\s+shops/gi, category: "cafe" }, // plural
    { pattern: /coffee\s+house/gi, category: "cafe" },
    { pattern: /fast\s+food/gi, category: "fast-food" },
    { pattern: /food\s+court/gi, category: "food" },
    
    // Fitness
    { pattern: /\bwork\s+out\b/gi, category: "fitness" }, // "work out" -> fitness (workout)
    { pattern: /\bworking\s+out\b/gi, category: "fitness" }, // "working out" -> fitness
    { pattern: /\bworkout\b/gi, category: "fitness" }, // "workout" (one word)
    
    // Accommodation
    { pattern: /bed\s+and\s+breakfast/gi, category: "accommodation" },
    { pattern: /guest\s+house/gi, category: "accommodation" },
    
    // Automotive
    { pattern: /car\s+wash/gi, category: "automotive" },
    { pattern: /car\s+service/gi, category: "automotive" },
    { pattern: /gas\s+station/gi, category: "gas_station" },
    { pattern: /petrol\s+station/gi, category: "gas_station" },
    
    // Services
    { pattern: /atm\s+machine/gi, category: "atm" },
    { pattern: /\batm\b/gi, category: "atm" },
  ];

  for (const { pattern, category } of multiWordPatterns) {
    if (pattern.test(query)) {
      exactMatches.add(category);
      // Also add parent category
      const categoryData = categories.find((c) => c.id === category);
      if (categoryData?.parentId) {
        parentMatches.add(categoryData.parentId);
      }
    }
  }

  // Check the full query for exact category match (after multi-word patterns)
  // This helps catch cases like "coffee shop" matching "cafe" via synonyms
  // Also check with plural handling for consistency
  const fullQueryCategory = getCategoryForSearchTermStrict(normalizedQuery);
  if (fullQueryCategory) {
    // Check if this category was already added by multi-word patterns
    // If not, add it as an exact match
    if (!exactMatches.has(fullQueryCategory) && !parentMatches.has(fullQueryCategory)) {
      // Check if the category has synonyms that match the query (indicates exact match)
      // Use plural-aware matching
      const categoryData = categories.find((c) => c.id === fullQueryCategory);
      const queryForms = getWordForms(normalizedQuery);
      
      const isExactMatch = categoryData && (
        queryForms.some(form => categoryData.id.toLowerCase() === form) ||
        queryForms.some(form => categoryData.name.toLowerCase() === form) ||
        categoryData.synonyms?.some(s => queryForms.some(form => s.toLowerCase() === form)) ||
        categoryData.indianTerms?.some(t => queryForms.some(form => t.toLowerCase() === form)) ||
        categoryData.subcategories?.some(sub => queryForms.some(form => normalizedQuery.includes(sub.toLowerCase())))
      );
      
      if (isExactMatch) {
        exactMatches.add(fullQueryCategory);
        // Add parent if exists
        if (categoryData?.parentId) {
          parentMatches.add(categoryData.parentId);
        }
      } else {
        // Might be a parent category, add to parent matches
        parentMatches.add(fullQueryCategory);
      }
    }
  }
  
  // Split query into words, removing location prepositions and common stop words
  // IMPORTANT: "to" is removed from stop words to preserve phrases like "work out"
  // But we'll filter it contextually (not when it's part of a phrase)
  const stopWords = new Set([
    // Location prepositions (but NOT "to" - it's needed for phrases)
    "in", "near", "at", "around", "close", "by", "from",
    // Common words that shouldn't trigger category matches
    "where", "can", "i", "am", "is", "are", "the", "a", "an", 
    "for", "with", "this", "that", "these", "those",
    "me", "my", "you", "your", "we", "our", "they", "their",
    "what", "when", "why", "how", "which", "who",
    "something", "somewhere", "some", "any", "all", "every",
    // Removed: "places", "place", "things", "thing", "options", "option" - these can be useful
    // "to" is also removed - we handle it contextually
  ]);
  
  // Check for phrases that contain "to" before filtering
  // If "to" is part of a recognized phrase, we should preserve the phrase
  const phraseWords = new Set<string>();
  const words = normalizedQuery.split(/\s+/);
  
  // Check for multi-word phrases that include "to"
  for (let i = 0; i < words.length - 1; i++) {
    const twoWord = `${words[i]} ${words[i + 1]}`.toLowerCase();
    const threeWord = i < words.length - 2 ? `${words[i]} ${words[i + 1]} ${words[i + 2]}`.toLowerCase() : "";
    
    // Check if this is part of a multi-word pattern
    for (const { pattern } of multiWordPatterns) {
      if (pattern.test(twoWord) || (threeWord && pattern.test(threeWord))) {
        // Mark these words as part of a phrase (don't filter "to" if it's in a phrase)
        phraseWords.add(words[i].toLowerCase());
        phraseWords.add(words[i + 1].toLowerCase());
        if (threeWord) phraseWords.add(words[i + 2].toLowerCase());
      }
    }
  }
  
  // Filter words, but preserve "to" if it's part of a phrase
  const filteredWords = words.filter((word) => {
    const cleaned = word.toLowerCase().trim();
    // Keep words that are part of phrases
    if (phraseWords.has(cleaned)) return true;
    // Filter out stop words and short words
    // Don't filter "to" if it's between two non-stop words (might be part of phrase)
    if (cleaned === "to") {
      const wordIndex = words.indexOf(word);
      const prevWord = wordIndex > 0 ? words[wordIndex - 1].toLowerCase() : "";
      const nextWord = wordIndex < words.length - 1 ? words[wordIndex + 1].toLowerCase() : "";
      // Keep "to" if surrounded by non-stop words (potential phrase)
      return !stopWords.has(prevWord) && !stopWords.has(nextWord) && prevWord.length >= 3 && nextWord.length >= 3;
    }
    return !stopWords.has(cleaned) && cleaned.length >= 3;
  });

  // Check each word individually with stricter matching (including plural handling)
  for (const word of filteredWords) {
    const categoryId = getCategoryForSearchTermStrict(word);
    if (categoryId) {
      // Check if it's a direct match or parent
      const categoryData = categories.find((c) => c.id === categoryId);
      
      // Get word forms for comparison (handles plurals)
      const wordForms = getWordForms(word);
      
      // If the word matches the category directly (not just as a parent), it's an exact match
      const isExact = categoryData && (
        wordForms.some(form => categoryData.id.toLowerCase() === form) ||
        wordForms.some(form => categoryData.name.toLowerCase() === form) ||
        categoryData.synonyms?.some(s => wordForms.some(form => s.toLowerCase() === form)) ||
        categoryData.indianTerms?.some(t => wordForms.some(form => t.toLowerCase() === form))
      );
      
      if (isExact) {
        exactMatches.add(categoryId);
        // Also add parent category for broader search
        if (categoryData?.parentId) {
          parentMatches.add(categoryData.parentId);
        }
      } else {
        // Only add as parent match if it's clearly related
        // Don't add vague matches
        const categoryName = categoryData?.name.toLowerCase() || "";
        const categoryDisplay = categoryData?.displayName?.toLowerCase() || "";
        // Only add if word is a significant part of the category name/display (with plural handling)
        const wordInCategory = wordForms.some(form => 
          categoryName.includes(form) || categoryDisplay.includes(form)
        );
        if (wordInCategory) {
          parentMatches.add(categoryId);
        }
      }
    }
  }
  
  // Also check for two-word combinations that might match phrases
  // This helps catch cases like "work out" even if "out" was filtered
  for (let i = 0; i < filteredWords.length - 1; i++) {
    const twoWord = `${filteredWords[i]} ${filteredWords[i + 1]}`;
    const categoryId = getCategoryForSearchTermStrict(twoWord);
    if (categoryId) {
      const categoryData = categories.find((c) => c.id === categoryId);
      if (categoryData) {
        exactMatches.add(categoryId);
        if (categoryData.parentId) {
          parentMatches.add(categoryData.parentId);
        }
      }
    }
  }
  
  // Also extract key words from query and check individually for consistency
  // This ensures same words match regardless of query structure
  // Remove punctuation and clean the query
  const cleanedQuery = normalizedQuery.replace(/[^\w\s]/g, " ");
  const allWords = cleanedQuery.split(/\s+/).filter(w => w.length >= 3);
  
  // Check each significant word that wasn't already processed in filtered words
  // This ensures "restaurants" matches whether it's "find restaurants" or "where can I find restaurants"
  for (const word of allWords) {
    // Skip if already processed in filtered words
    if (filteredWords.includes(word)) continue;
    
    const categoryId = getCategoryForSearchTermStrict(word);
    if (categoryId) {
      const categoryData = categories.find((c) => c.id === categoryId);
      const wordForms = getWordForms(word);
      
      const isExact = categoryData && (
        wordForms.some(form => categoryData.id.toLowerCase() === form) ||
        wordForms.some(form => categoryData.name.toLowerCase() === form) ||
        categoryData.synonyms?.some(s => wordForms.some(form => s.toLowerCase() === form)) ||
        categoryData.indianTerms?.some(t => wordForms.some(form => t.toLowerCase() === form))
      );
      
      if (isExact) {
        exactMatches.add(categoryId);
        if (categoryData?.parentId) {
          parentMatches.add(categoryData.parentId);
        }
      }
    }
  }

  // Remove duplicates (exact matches shouldn't also be in parent matches)
  const exactArray = Array.from(exactMatches);
  const parentArray = Array.from(parentMatches).filter(cat => !exactArray.includes(cat));
  
  // Additional validation: Remove any parent matches that seem incorrect
  // If we have exact matches, only keep parent matches that make sense
  const validatedParentArray = parentArray.filter(cat => {
    // If we have exact matches, be more conservative with parent matches
    if (exactArray.length > 0) {
      const categoryData = categories.find(c => c.id === cat);
      // Only keep parent matches if they're actually parents of exact matches
      const isParentOfExact = exactArray.some(exactCat => {
        const exactCatData = categories.find(c => c.id === exactCat);
        return exactCatData?.parentId === cat;
      });
      return isParentOfExact;
    }
    return true;
  });
  
  const allCategories = [...exactArray, ...validatedParentArray];

  return {
    exactMatches: exactArray,
    parentMatches: validatedParentArray,
    allCategories,
  };
}

/**
 * Extract category terms from a search query
 * Splits the query and checks each word for category matches
 * 
 * @param query - The full search query
 * @returns Array of category IDs that match terms in the query
 */
export function extractCategoriesFromQuery(query: string): string[] {
  const { allCategories } = extractCategoriesFromQueryWithPriority(query);
  return allCategories;
}

/**
 * Get all possible category IDs that could match a search query
 * Includes parent categories and related categories
 * 
 * @param query - The search query
 * @returns Array of category IDs
 */
export function getAllRelatedCategories(query: string): string[] {
  const directCategories = extractCategoriesFromQuery(query);
  const categories = getAllCategories();
  const allCategories = new Set<string>(directCategories);

  // Add parent categories
  for (const categoryId of directCategories) {
    const category = categories.find((c) => c.id === categoryId);
    if (category?.parentId) {
      allCategories.add(category.parentId);
    }
  }

  return Array.from(allCategories);
}
