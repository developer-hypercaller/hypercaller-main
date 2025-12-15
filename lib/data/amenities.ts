/**
 * Standardized amenity list
 * All amenities with unique IDs and display names
 */

export interface Amenity {
  id: string;
  name: string;
  displayName: string;
  category: "basic" | "food" | "accessibility" | "payment" | "parking" | "wifi" | "other";
  icon?: string;
}

export const amenities: Amenity[] = [
  // Basic
  { id: "wifi", name: "WiFi", displayName: "Free WiFi", category: "wifi", icon: "wifi" },
  { id: "parking", name: "Parking", displayName: "Parking Available", category: "parking", icon: "parking" },
  { id: "valet-parking", name: "Valet Parking", displayName: "Valet Parking", category: "parking", icon: "valet" },
  { id: "air-conditioning", name: "Air Conditioning", displayName: "Air Conditioning", category: "basic", icon: "ac" },
  { id: "restroom", name: "Restroom", displayName: "Restroom Available", category: "basic", icon: "restroom" },

  // Food
  { id: "vegetarian", name: "Vegetarian", displayName: "Vegetarian Options", category: "food", icon: "vegetarian" },
  { id: "vegan", name: "Vegan", displayName: "Vegan Options", category: "food", icon: "vegan" },
  { id: "halal", name: "Halal", displayName: "Halal Certified", category: "food", icon: "halal" },
  { id: "jain", name: "Jain", displayName: "Jain Food Available", category: "food", icon: "jain" },
  { id: "home-delivery", name: "Home Delivery", displayName: "Home Delivery", category: "food", icon: "delivery" },
  { id: "takeaway", name: "Takeaway", displayName: "Takeaway Available", category: "food", icon: "takeaway" },
  { id: "outdoor-seating", name: "Outdoor Seating", displayName: "Outdoor Seating", category: "food", icon: "outdoor" },
  { id: "bar", name: "Bar", displayName: "Bar Available", category: "food", icon: "bar" },

  // Accessibility
  { id: "wheelchair-accessible", name: "Wheelchair Accessible", displayName: "Wheelchair Accessible", category: "accessibility", icon: "wheelchair" },
  { id: "elevator", name: "Elevator", displayName: "Elevator Available", category: "accessibility", icon: "elevator" },
  { id: "braille-menu", name: "Braille Menu", displayName: "Braille Menu Available", category: "accessibility", icon: "braille" },

  // Payment
  { id: "cash-only", name: "Cash Only", displayName: "Cash Only", category: "payment", icon: "cash" },
  { id: "card-payment", name: "Card Payment", displayName: "Card Payment Accepted", category: "payment", icon: "card" },
  { id: "upi", name: "UPI", displayName: "UPI Payment Accepted", category: "payment", icon: "upi" },
  { id: "digital-wallet", name: "Digital Wallet", displayName: "Digital Wallet Accepted", category: "payment", icon: "wallet" },

  // Other
  { id: "live-music", name: "Live Music", displayName: "Live Music", category: "other", icon: "music" },
  { id: "tv", name: "TV", displayName: "TV Available", category: "other", icon: "tv" },
  { id: "pet-friendly", name: "Pet Friendly", displayName: "Pet Friendly", category: "other", icon: "pet" },
  { id: "smoking-area", name: "Smoking Area", displayName: "Smoking Area", category: "other", icon: "smoking" },
  { id: "kids-friendly", name: "Kids Friendly", displayName: "Kids Friendly", category: "other", icon: "kids" },
];

// Synonyms mapping for amenities
const amenitySynonyms: Record<string, string> = {
  // WiFi synonyms
  "free wifi": "wifi",
  "wifi": "wifi",
  "wireless": "wifi",
  "internet": "wifi",
  "free internet": "wifi",
  "wi-fi": "wifi",
  "wi fi": "wifi",
  
  // Parking synonyms
  "parking": "parking",
  "car parking": "parking",
  "free parking": "parking",
  "parking available": "parking",
  "valet": "valet-parking",
  "valet parking": "valet-parking",
  "valet service": "valet-parking",
  
  // Air Conditioning synonyms
  "air conditioning": "air-conditioning",
  "ac": "air-conditioning",
  "a/c": "air-conditioning",
  "airconditioning": "air-conditioning",
  "air con": "air-conditioning",
  "cooling": "air-conditioning",
  
  // Pet Friendly synonyms
  "pet friendly": "pet-friendly",
  "pets allowed": "pet-friendly",
  "pet allowed": "pet-friendly",
  "dogs allowed": "pet-friendly",
  "pets welcome": "pet-friendly",
  
  // Wheelchair Accessible synonyms
  "wheelchair accessible": "wheelchair-accessible",
  "wheelchair": "wheelchair-accessible",
  "accessible": "wheelchair-accessible",
  "disabled access": "wheelchair-accessible",
  "handicap accessible": "wheelchair-accessible",
  
  // Restroom synonyms
  "restroom": "restroom",
  "toilet": "restroom",
  "washroom": "restroom",
  "bathroom": "restroom",
  "rest room": "restroom",
  
  // Vegetarian synonyms
  "vegetarian": "vegetarian",
  "veg": "vegetarian",
  "vegetarian options": "vegetarian",
  "veg food": "vegetarian",
  
  // Vegan synonyms
  "vegan": "vegan",
  "vegan options": "vegan",
  "vegan food": "vegan",
  
  // Halal synonyms
  "halal": "halal",
  "halal certified": "halal",
  "halal food": "halal",
  
  // Home Delivery synonyms
  "home delivery": "home-delivery",
  "delivery": "home-delivery",
  "food delivery": "home-delivery",
  "delivery available": "home-delivery",
  
  // Takeaway synonyms
  "takeaway": "takeaway",
  "take away": "takeaway",
  "take-out": "takeaway",
  "take out": "takeaway",
  "to go": "takeaway",
  
  // Outdoor Seating synonyms
  "outdoor seating": "outdoor-seating",
  "outdoor": "outdoor-seating",
  "patio": "outdoor-seating",
  "terrace": "outdoor-seating",
  "al fresco": "outdoor-seating",
  
  // Card Payment synonyms
  "card payment": "card-payment",
  "card": "card-payment",
  "credit card": "card-payment",
  "debit card": "card-payment",
  "cards accepted": "card-payment",
  
  // UPI synonyms
  "upi": "upi",
  "upi payment": "upi",
  "phonepe": "upi",
  "google pay": "upi",
  "paytm": "upi",
  
  // Digital Wallet synonyms
  "digital wallet": "digital-wallet",
  "wallet": "digital-wallet",
  "mobile wallet": "digital-wallet",
  "e-wallet": "digital-wallet",
  
  // Live Music synonyms
  "live music": "live-music",
  "music": "live-music",
  "live entertainment": "live-music",
  "live performance": "live-music",
  
  // Kids Friendly synonyms
  "kids friendly": "kids-friendly",
  "kid friendly": "kids-friendly",
  "children friendly": "kids-friendly",
  "family friendly": "kids-friendly",
  "child friendly": "kids-friendly",
};

const amenityMap = new Map<string, Amenity>();
amenities.forEach((amenity) => {
  amenityMap.set(amenity.id, amenity);
  amenityMap.set(amenity.name.toLowerCase(), amenity);
});

// Add synonyms to map
Object.entries(amenitySynonyms).forEach(([synonym, amenityId]) => {
  const amenity = amenityMap.get(amenityId);
  if (amenity) {
    amenityMap.set(synonym.toLowerCase(), amenity);
  }
});

/**
 * Get amenity by ID or name
 */
export function getAmenity(idOrName: string): Amenity | undefined {
  return amenityMap.get(idOrName.toLowerCase());
}

/**
 * Validate amenity ID
 */
export function isValidAmenity(amenityId: string): boolean {
  return amenityMap.has(amenityId.toLowerCase());
}

/**
 * Normalize amenity input to amenity ID
 */
export function normalizeAmenity(input: string): string | null {
  const amenity = getAmenity(input);
  return amenity ? amenity.id : null;
}

/**
 * Get all amenities
 */
export function getAllAmenities(): Amenity[] {
  return amenities;
}

/**
 * Get amenities by category
 */
export function getAmenitiesByCategory(category: Amenity["category"]): Amenity[] {
  return amenities.filter((a) => a.category === category);
}

/**
 * Get amenity by synonym
 */
export function getAmenityBySynonym(synonym: string): Amenity | undefined {
  const normalizedSynonym = synonym.toLowerCase().trim();
  const amenityId = amenitySynonyms[normalizedSynonym];
  if (amenityId) {
    return amenityMap.get(amenityId);
  }
  return amenityMap.get(normalizedSynonym);
}

/**
 * Get all amenity IDs
 */
export function getAllAmenityIds(): string[] {
  return amenities.map((a) => a.id);
}

/**
 * Search amenities by name (fuzzy search)
 */
export function searchAmenities(query: string): Amenity[] {
  const normalizedQuery = query.toLowerCase().trim();
  return amenities.filter(
    (amenity) =>
      amenity.name.toLowerCase().includes(normalizedQuery) ||
      amenity.displayName.toLowerCase().includes(normalizedQuery) ||
      amenity.id.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * Get amenity synonyms for a given amenity ID
 */
export function getAmenitySynonyms(amenityId: string): string[] {
  return Object.entries(amenitySynonyms)
    .filter(([_, id]) => id === amenityId)
    .map(([synonym, _]) => synonym);
}

