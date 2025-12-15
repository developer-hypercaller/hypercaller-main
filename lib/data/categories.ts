/**
 * Master category taxonomy
 * All categories with unique IDs, synonyms, subcategories, Bedrock mappings, and Indian terms
 */

import { Category, CategoryTaxonomy } from "../schemas/category-schema";

// Master category definitions
const categoryDefinitions: Category[] = [
  // Accommodation
  {
    id: "accommodation",
    name: "Accommodation",
    displayName: "Hotels & Accommodation",
    synonyms: [
      "hotels",
      "hotel",
      "lodging",
      "accommodations",
      "places to stay",
      "where to stay",
      "sleep",
      "motels",
      "hostels",
      "resorts",
      "inns",
      "b&b",
      "bed and breakfast",
      "guesthouse",
      "dormitory",
      "stay",
      "accommodation",
    ],
    subcategories: ["hotels", "motels", "hostels", "resorts", "apartments", "guesthouses", "b&b"],
    indianTerms: ["hotel", "lodge", "dharamshala", "ashram", "saraai", "musafir khana"],
    icon: "accommodation",
    order: 1,
  },
  {
    id: "hotels",
    name: "Hotels",
    displayName: "Hotels",
    synonyms: ["hotel", "hotels", "luxury hotel", "budget hotel"],
    parentId: "accommodation",
    indianTerms: ["hotel", "lodge"],
    icon: "hotel",
    order: 1,
  },
  {
    id: "motels",
    name: "Motels",
    displayName: "Motels",
    synonyms: ["motel", "motels", "motor hotel"],
    parentId: "accommodation",
    icon: "motel",
    order: 2,
  },
  {
    id: "hostels",
    name: "Hostels",
    displayName: "Hostels",
    synonyms: ["hostel", "hostels", "backpacker hostel"],
    parentId: "accommodation",
    icon: "hostel",
    order: 3,
  },
  {
    id: "resorts",
    name: "Resorts",
    displayName: "Resorts",
    synonyms: ["resort", "resorts", "beach resort", "hill resort"],
    parentId: "accommodation",
    indianTerms: ["resort", "hill station resort"],
    icon: "resort",
    order: 4,
  },

  // Food
  {
    id: "food",
    name: "Food",
    displayName: "Food & Dining",
    synonyms: [
      "restaurant",
      "restaurants",
      "dining",
      "eatery",
      "food place",
      "food joint",
      "cafe",
      "café",
      "diner",
      "bistro",
      "food",
      "eating",
      "eat",
      "places to eat",
      "where to eat",
      "want to eat",
      "looking for food",
      "looking for places to eat",
      "need food",
      "meal",
      "cuisine",
      "food court",
      "fast food",
    ],
    subcategories: ["restaurant", "cafe", "fast-food", "fine-dining", "casual-dining", "street-food"],
    indianTerms: [
      "dhaba",
      "hotel",
      "restaurant",
      "khana",
      "bhojan",
      "thali",
      "mess",
      "canteen",
      "udupi",
    ],
    icon: "food",
    order: 2,
  },
  {
    id: "restaurant",
    name: "Restaurant",
    displayName: "Restaurant",
    synonyms: ["restaurant", "dining", "eatery", "food place"],
    parentId: "food",
    indianTerms: ["dhaba", "hotel", "restaurant"],
    icon: "restaurant",
    order: 1,
  },
  {
    id: "cafe",
    name: "Cafe",
    displayName: "Cafe",
    synonyms: ["cafe", "coffee shop", "coffee house", "coffee"],
    parentId: "food",
    indianTerms: ["chai tapri", "coffee shop"],
    icon: "cafe",
    order: 2,
  },
  {
    id: "fast-food",
    name: "Fast Food",
    displayName: "Fast Food",
    synonyms: ["fast food", "quick service", "qsr"],
    parentId: "food",
    icon: "fast-food",
    order: 3,
  },
  {
    id: "street-food",
    name: "Street Food",
    displayName: "Street Food",
    synonyms: ["street food", "street vendor", "food stall"],
    parentId: "food",
    indianTerms: ["thela", "rehri", "street food", "chaat"],
    icon: "street-food",
    order: 4,
  },

  // Fitness
  {
    id: "fitness",
    name: "Fitness",
    displayName: "Fitness & Gym",
    synonyms: [
      "gym",
      "gyms",
      "fitness",
      "fitness center",
      "workout",
      "exercise",
      "gymnasium",
      "health club",
      "fitness club",
      "training",
      "personal trainer",
      "yoga",
      "pilates",
      "crossfit",
      "fitness studio",
    ],
    subcategories: ["gym", "yoga", "pilates", "crossfit", "personal-training"],
    indianTerms: ["gym", "vyayamshala", "yoga shala", "akharra"],
    icon: "fitness",
    order: 3,
  },
  {
    id: "gym",
    name: "Gym",
    displayName: "Gym",
    synonyms: ["gym", "gyms", "gymnasium", "fitness center"],
    parentId: "fitness",
    indianTerms: ["gym", "vyayamshala"],
    icon: "gym",
    order: 1,
  },
  {
    id: "yoga",
    name: "Yoga",
    displayName: "Yoga Studio",
    synonyms: ["yoga", "yoga studio", "yoga class"],
    parentId: "fitness",
    indianTerms: ["yoga shala", "yoga center"],
    icon: "yoga",
    order: 2,
  },
  {
    id: "personal-training",
    name: "Personal Training",
    displayName: "Personal Training",
    synonyms: ["personal trainer", "personal training", "pt"],
    parentId: "fitness",
    icon: "personal-training",
    order: 3,
  },

  // Automotive
  {
    id: "automotive",
    name: "Automotive",
    displayName: "Automotive Services",
    synonyms: [
      "car",
      "automobile",
      "automotive",
      "vehicle",
      "auto",
      "car service",
      "car repair",
      "garage",
      "mechanic",
      "auto repair",
      "car wash",
      "tire shop",
      "auto parts",
      "car dealership",
      "bike service",
    ],
    subcategories: ["car-repair", "car-wash", "tire-shop", "auto-parts", "bike-service"],
    indianTerms: ["garage", "mechanic", "car service", "bike service", "two wheeler service"],
    icon: "automotive",
    order: 4,
  },
  {
    id: "car-repair",
    name: "Car Repair",
    displayName: "Car Repair",
    synonyms: ["car repair", "auto repair", "garage", "mechanic"],
    parentId: "automotive",
    indianTerms: ["garage", "mechanic"],
    icon: "car-repair",
    order: 1,
  },
  {
    id: "car-wash",
    name: "Car Wash",
    displayName: "Car Wash",
    synonyms: ["car wash", "auto wash", "vehicle wash"],
    parentId: "automotive",
    icon: "car-wash",
    order: 2,
  },
  {
    id: "bike-service",
    name: "Bike Service",
    displayName: "Bike Service",
    synonyms: ["bike service", "two wheeler service", "motorcycle service"],
    parentId: "automotive",
    indianTerms: ["bike service", "two wheeler service"],
    icon: "bike-service",
    order: 3,
  },

  // Healthcare
  {
    id: "healthcare",
    name: "Healthcare",
    displayName: "Healthcare",
    synonyms: [
      "hospital",
      "hospitals",
      "clinic",
      "clinics",
      "doctor",
      "doctors",
      "medical",
      "healthcare",
      "health",
      "pharmacy",
      "pharmacies",
      "dentist",
      "dental",
      "physician",
      "health center",
    ],
    subcategories: ["hospital", "clinic", "doctor", "pharmacy", "dentist"],
    indianTerms: [
      "hospital",
      "aspatal",
      "clinic",
      "doctor",
      "daktar",
      "vaidya",
      "medical store",
      "chemist",
    ],
    icon: "healthcare",
    order: 5,
  },
  {
    id: "hospital",
    name: "Hospital",
    displayName: "Hospital",
    synonyms: ["hospital", "medical center"],
    parentId: "healthcare",
    indianTerms: ["hospital", "aspatal"],
    icon: "hospital",
    order: 1,
  },
  {
    id: "clinic",
    name: "Clinic",
    displayName: "Clinic",
    synonyms: ["clinic", "medical clinic"],
    parentId: "healthcare",
    icon: "clinic",
    order: 2,
  },
  {
    id: "doctor",
    name: "Doctor",
    displayName: "Doctor",
    synonyms: ["doctor", "physician", "doctor's office"],
    parentId: "healthcare",
    indianTerms: ["doctor", "daktar", "vaidya"],
    icon: "doctor",
    order: 3,
  },
  {
    id: "pharmacy",
    name: "Pharmacy",
    displayName: "Pharmacy",
    synonyms: ["pharmacy", "drugstore", "chemist"],
    parentId: "healthcare",
    indianTerms: ["medical store", "chemist"],
    icon: "pharmacy",
    order: 4,
  },

  // Education
  {
    id: "education",
    name: "Education",
    displayName: "Education",
    synonyms: [
      "school",
      "schools",
      "college",
      "colleges",
      "university",
      "universities",
      "education",
      "tuition",
      "coaching",
      "training",
      "institute",
      "academy",
      "learning",
      "classes",
      "course",
    ],
    subcategories: ["school", "college", "coaching", "tuition", "training"],
    indianTerms: [
      "school",
      "vidyalaya",
      "college",
      "coaching",
      "tuition",
      "shiksha",
      "pathshala",
    ],
    icon: "education",
    order: 6,
  },
  {
    id: "school",
    name: "School",
    displayName: "School",
    synonyms: ["school", "schools"],
    parentId: "education",
    indianTerms: ["school", "vidyalaya", "pathshala"],
    icon: "school",
    order: 1,
  },
  {
    id: "coaching",
    name: "Coaching",
    displayName: "Coaching Center",
    synonyms: ["coaching", "coaching center", "tuition"],
    parentId: "education",
    indianTerms: ["coaching", "tuition"],
    icon: "coaching",
    order: 2,
  },
  {
    id: "training",
    name: "Training",
    displayName: "Training Institute",
    synonyms: ["training", "training institute", "skill development"],
    parentId: "education",
    icon: "training",
    order: 3,
  },

  // Retail
  {
    id: "retail",
    name: "Retail",
    displayName: "Retail & Shopping",
    synonyms: [
      "store",
      "stores",
      "shop",
      "shops",
      "retail",
      "shopping",
      "outlet",
      "market",
      "supermarket",
      "mall",
      "boutique",
      "showroom",
      "department store",
      "grocery",
      "supermarket",
    ],
    subcategories: ["grocery", "clothing", "electronics", "pharmacy", "kirana"],
    indianTerms: ["dukaan", "shop", "kirana", "general store", "provision store"],
    icon: "retail",
    order: 7,
  },
  {
    id: "grocery",
    name: "Grocery Store",
    displayName: "Grocery Store",
    synonyms: ["grocery", "supermarket", "super market", "grocery store"],
    parentId: "retail",
    indianTerms: ["kirana", "general store", "supermarket"],
    icon: "grocery",
    order: 1,
  },
  {
    id: "kirana",
    name: "Kirana Store",
    displayName: "Kirana Store",
    synonyms: ["kirana", "general store", "provision store"],
    parentId: "retail",
    indianTerms: ["kirana", "general store", "provision store", "dukaan"],
    icon: "kirana",
    order: 2,
  },
  {
    id: "clothing",
    name: "Clothing Store",
    displayName: "Clothing Store",
    synonyms: ["clothing", "apparel", "fashion", "garments"],
    parentId: "retail",
    indianTerms: ["kapde ki dukaan", "fashion store"],
    icon: "clothing",
    order: 3,
  },
  {
    id: "electronics",
    name: "Electronics Store",
    displayName: "Electronics Store",
    synonyms: ["electronics", "electronic store", "gadgets"],
    parentId: "retail",
    icon: "electronics",
    order: 4,
  },

  // Entertainment
  {
    id: "entertainment",
    name: "Entertainment",
    displayName: "Entertainment",
    synonyms: [
      "movie",
      "movies",
      "cinema",
      "theater",
      "theatre",
      "entertainment",
      "fun",
      "leisure",
      "amusement",
      "arcade",
      "bowling",
      "karaoke",
      "nightclub",
      "bar",
      "pub",
    ],
    subcategories: ["movie", "theater", "amusement", "arcade", "nightclub"],
    indianTerms: ["cinema hall", "movie hall", "theater"],
    icon: "entertainment",
    order: 8,
  },
  {
    id: "movie",
    name: "Movie Theater",
    displayName: "Movie Theater",
    synonyms: ["movie", "cinema", "theater", "movies"],
    parentId: "entertainment",
    indianTerms: ["cinema hall", "movie hall"],
    icon: "movie",
    order: 1,
  },
  {
    id: "theater",
    name: "Theater",
    displayName: "Theater",
    synonyms: ["theater", "theatre", "playhouse"],
    parentId: "entertainment",
    icon: "theater",
    order: 2,
  },
  {
    id: "amusement",
    name: "Amusement Park",
    displayName: "Amusement Park",
    synonyms: ["amusement park", "theme park", "fun park"],
    parentId: "entertainment",
    icon: "amusement",
    order: 3,
  },

  // Professional Services
  {
    id: "professional-services",
    name: "Professional Services",
    displayName: "Professional Services",
    synonyms: [
      "services",
      "service",
      "professional",
      "consultant",
      "consulting",
      "lawyer",
      "attorney",
      "accountant",
      "cpa",
      "real estate",
      "insurance",
      "financial",
      "advisory",
      "legal",
      "business services",
    ],
    subcategories: ["legal", "accounting", "consulting", "real-estate", "insurance"],
    indianTerms: ["advocate", "ca", "chartered accountant", "property dealer"],
    icon: "professional-services",
    order: 9,
  },
  {
    id: "legal",
    name: "Legal Services",
    displayName: "Legal Services",
    synonyms: ["lawyer", "attorney", "legal", "advocate"],
    parentId: "professional-services",
    indianTerms: ["advocate", "vakil"],
    icon: "legal",
    order: 1,
  },
  {
    id: "accounting",
    name: "Accounting",
    displayName: "Accounting Services",
    synonyms: ["accountant", "cpa", "accounting", "ca"],
    parentId: "professional-services",
    indianTerms: ["ca", "chartered accountant"],
    icon: "accounting",
    order: 2,
  },
  {
    id: "real-estate",
    name: "Real Estate",
    displayName: "Real Estate",
    synonyms: ["real estate", "property", "realtor"],
    parentId: "professional-services",
    indianTerms: ["property dealer", "broker"],
    icon: "real-estate",
    order: 3,
  },

  // General (Fallback)
  {
    id: "general",
    name: "General",
    displayName: "General",
    synonyms: [
      "general",
      "other",
      "misc",
      "miscellaneous",
      "unknown",
      "unspecified",
      "business",
      "establishment",
      "place",
      "location",
      "venue",
      "outlet",
      "store",
      "shop",
    ],
    subcategories: [],
    indianTerms: ["dukaan", "shop", "place"],
    icon: "general",
    order: 10,
  },
];

/**
 * Build category taxonomy from definitions
 */
function buildCategoryTaxonomy(): CategoryTaxonomy {
  const categories = new Map<string, Category>();
  const categoryHierarchy = new Map<string, string[]>();
  const synonymMap = new Map<string, string>();
  const indianTermMap = new Map<string, string>();

  // Build categories map
  categoryDefinitions.forEach((category) => {
    categories.set(category.id, category);

    // Build synonym map (case-insensitive)
    category.synonyms.forEach((synonym) => {
      synonymMap.set(synonym.toLowerCase(), category.id);
    });

    // Build Indian terms map (case-insensitive)
    if (category.indianTerms) {
      category.indianTerms.forEach((term) => {
        indianTermMap.set(term.toLowerCase(), category.id);
      });
    }

    // Build hierarchy
    if (category.subcategories) {
      categoryHierarchy.set(category.id, category.subcategories);
    }
  });

  return {
    categories,
    categoryHierarchy,
    synonymMap,
    indianTermMap,
  };
}

// Export singleton taxonomy instance
export const categoryTaxonomy = buildCategoryTaxonomy();

/**
 * Get category by ID
 */
export function getCategoryById(categoryId: string): Category | undefined {
  if (!categoryId || typeof categoryId !== "string") {
    return undefined;
  }
  return categoryTaxonomy.categories.get(categoryId.toLowerCase());
}

/**
 * Get all categories
 */
export function getAllCategories(): Category[] {
  return Array.from(categoryTaxonomy.categories.values());
}

/**
 * Check if category ID is valid
 */
export function isValidCategory(categoryId: string): boolean {
  if (!categoryId || typeof categoryId !== "string") {
    return false;
  }
  return categoryTaxonomy.categories.has(categoryId.toLowerCase());
}

/**
 * Get synonyms for a category
 */
export function getCategorySynonyms(categoryId: string): string[] {
  const category = getCategoryById(categoryId);
  return category?.synonyms || [];
}

/**
 * Check if subcategory is valid for a category
 */
export function isValidSubcategory(categoryId: string, subcategory: string): boolean {
  const category = getCategoryById(categoryId);
  if (!category || !category.subcategories) {
    return false;
  }
  return category.subcategories.includes(subcategory.toLowerCase());
}

/**
 * Normalize any category input to our category ID
 * Handles case-insensitive matching, synonyms, Indian terms
 * Prefers parent categories over subcategories when ambiguous
 */
export function normalizeCategory(input: string): string | null {
  if (!input || typeof input !== "string") {
    return null;
  }

  const normalized = input.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  // Try direct ID match
  if (isValidCategory(normalized)) {
    const category = getCategoryById(normalized);
    // If it's a subcategory, return parent if exists, otherwise return the category itself
    if (category?.parentId) {
      return category.parentId;
    }
    return normalized;
  }

  // Try synonym match - collect all matches first
  const matchedCategoryIds = new Set<string>();
  
  // Check synonym map
  const synonymMatch = categoryTaxonomy.synonymMap.get(normalized);
  if (synonymMatch) {
    matchedCategoryIds.add(synonymMatch);
  }

  // Check Indian term map
  const indianMatch = categoryTaxonomy.indianTermMap.get(normalized);
  if (indianMatch) {
    matchedCategoryIds.add(indianMatch);
  }

  // If we have matches, prefer parent category
  if (matchedCategoryIds.size > 0) {
    const matches = Array.from(matchedCategoryIds);
    const categories = matches.map(id => getCategoryById(id)).filter(Boolean) as Category[];
    
    // Prefer categories without parent (root categories)
    const rootCategories = categories.filter(cat => !cat.parentId);
    if (rootCategories.length > 0) {
      return rootCategories[0].id;
    }
    
    // If all are subcategories, return the first one's parent, or the first one
    if (categories.length > 0) {
      return categories[0].parentId || categories[0].id;
    }
  }

  // Note: Fuzzy matching is disabled - returns null if no exact/synonym/Indian term match is found
  // No match found
  return null;
}

/**
 * Map Bedrock output to our category
 * Handles multiple possible Bedrock outputs
 * Always returns parent category ID
 */
export function mapBedrockCategory(bedrockCategory: string): string | null {
  if (!bedrockCategory || typeof bedrockCategory !== "string") {
    return null;
  }

  const normalized = bedrockCategory.trim().toLowerCase();

  // Try direct normalization (handles synonyms, Indian terms, etc.)
  // normalizeCategory already returns parent categories
  const mapped = normalizeCategory(normalized);
  if (mapped) {
    return mapped;
  }

  // Try common Bedrock category patterns (direct to parent categories)
  const bedrockPatterns: Record<string, string> = {
    "accommodation": "accommodation",
    "hotels": "accommodation",
    "lodging": "accommodation",
    "hotel": "accommodation",
    "restaurant": "food",
    "dining": "food",
    "food": "food",
    "cafe": "food",
    "café": "food",
    "gym": "fitness",
    "fitness": "fitness",
    "workout": "fitness",
    "automotive": "automotive",
    "car": "automotive",
    "vehicle": "automotive",
    "auto": "automotive",
    "hospital": "healthcare",
    "medical": "healthcare",
    "healthcare": "healthcare",
    "health": "healthcare",
    "school": "education",
    "education": "education",
    "college": "education",
    "store": "retail",
    "retail": "retail",
    "shopping": "retail",
    "shop": "retail",
    "entertainment": "entertainment",
    "movie": "entertainment",
    "cinema": "entertainment",
    "service": "professional-services",
    "professional": "professional-services",
    "consulting": "professional-services",
  };

  // Check patterns (exact or contains match)
  for (const [pattern, categoryId] of Object.entries(bedrockPatterns)) {
    if (normalized === pattern || normalized.includes(pattern) || pattern.includes(normalized)) {
      // Log for review
      console.log(`[Category] Bedrock mapping: "${bedrockCategory}" -> "${categoryId}"`);
      return categoryId;
    }
  }

  // Log unmapped for review
  console.log(`[Category] Unmapped Bedrock category: "${bedrockCategory}"`);
  return null;
}

/**
 * Get subcategories for a category
 */
export function getSubcategories(categoryId: string): Category[] {
  const subcategoryIds = categoryTaxonomy.categoryHierarchy.get(categoryId);
  if (!subcategoryIds) return [];

  return subcategoryIds
    .map((id) => getCategoryById(id))
    .filter((cat): cat is Category => cat !== undefined);
}

/**
 * Get root categories (categories without parent)
 */
export function getRootCategories(): Category[] {
  return categoryDefinitions.filter((cat) => !cat.parentId);
}

/**
 * Get category by Indian term
 */
export function getCategoryByIndianTerm(term: string): Category | undefined {
  const categoryId = categoryTaxonomy.indianTermMap.get(term.toLowerCase());
  if (!categoryId) return undefined;
  return getCategoryById(categoryId);
}

/**
 * Get category by synonym
 */
export function getCategoryBySynonym(synonym: string): Category | undefined {
  const categoryId = categoryTaxonomy.synonymMap.get(synonym.toLowerCase());
  if (!categoryId) return undefined;
  return getCategoryById(categoryId);
}
