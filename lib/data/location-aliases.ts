/**
 * Location alias mappings
 * Maps alternative location names to canonical names
 * Structure: { [alias: string]: string } // alias → official name
 */

import { LocationAlias } from "../schemas/location-schema";

/**
 * Simple alias map: alias → canonical name
 * This is the primary mapping structure
 */
const locationAliasMap: { [alias: string]: string } = {
  // Required city aliases
  "Bombay": "Mumbai",
  "Bangalore": "Bengaluru",
  "Calcutta": "Kolkata",
  "Madras": "Chennai",
  "Poona": "Pune",

  // Additional city aliases (regional variations)
  "Pondicherry": "Puducherry",
  "Trivandrum": "Thiruvananthapuram",
  "Calicut": "Kozhikode",
  "Cochin": "Kochi",
  "Gurgaon": "Gurugram",
  "Benares": "Varanasi",
  "Baroda": "Vadodara",
  "Cuttack": "Cuttack", // Same name, but included for consistency
  "Mysore": "Mysuru",
  "Vizag": "Visakhapatnam",
  "Vizagapatam": "Visakhapatnam",
  "Secunderabad": "Hyderabad",
  "Secunderbad": "Hyderabad",

  // Common abbreviations - Cities
  "BOM": "Mumbai",
  "BLR": "Bengaluru",
  "CCU": "Kolkata",
  "MAA": "Chennai",
  "PNQ": "Pune",
  "DEL": "Delhi",
  "NDLS": "New Delhi",
  "HYD": "Hyderabad",
  "AMD": "Ahmedabad",
  "JAI": "Jaipur",
  "LKO": "Lucknow",
  "GAU": "Guwahati",
  "IXB": "Siliguri",
  "COK": "Kochi",
  "TRV": "Thiruvananthapuram",
  "CCJ": "Kozhikode",
  "IXC": "Chandigarh",
  "IXR": "Ranchi",
  "PAT": "Patna",
  "BBI": "Bhubaneswar",
  "IXZ": "Port Blair",

  // State abbreviations
  "MH": "Maharashtra",
  "KA": "Karnataka",
  "TN": "Tamil Nadu",
  "DL": "Delhi",
  "GJ": "Gujarat",
  "RJ": "Rajasthan",
  "UP": "Uttar Pradesh",
  "WB": "West Bengal",
  "AP": "Andhra Pradesh",
  "TS": "Telangana",
  "KL": "Kerala",
  "PB": "Punjab",
  "HR": "Haryana",
  "MP": "Madhya Pradesh",
  "BR": "Bihar",
  "OR": "Odisha",
  "AS": "Assam",
  "JH": "Jharkhand",
  "CT": "Chhattisgarh",
  "HP": "Himachal Pradesh",
  "UK": "Uttarakhand",
  "GA": "Goa",
  "MN": "Manipur",
  "ML": "Meghalaya",
  "MZ": "Mizoram",
  "NL": "Nagaland",
  "SK": "Sikkim",
  "TR": "Tripura",
  "AN": "Andaman and Nicobar Islands",
  "CH": "Chandigarh",
  "DN": "Dadra and Nagar Haveli",
  "DD": "Daman and Diu",
  "LD": "Lakshadweep",
  "PY": "Puducherry",

  // Landmark variations - Mumbai
  "Andheri": "Mumbai",
  "Bandra": "Mumbai",
  "Worli": "Mumbai",
  "Colaba": "Mumbai",
  "Juhu": "Mumbai",
  "Powai": "Mumbai",
  "Kurla": "Mumbai",
  "Goregaon": "Mumbai",
  "Malad": "Mumbai",
  "Borivali": "Mumbai",
  "Dadar": "Mumbai",
  "Parel": "Mumbai",
  "Byculla": "Mumbai",
  "Chembur": "Mumbai",
  "Ghatkopar": "Mumbai",
  "Vikhroli": "Mumbai",
  "Bhandup": "Mumbai",
  "Mulund": "Mumbai",
  "Thane": "Mumbai",
  "Navi Mumbai": "Mumbai",
  "New Bombay": "Mumbai",

  // Landmark variations - Bengaluru
  "Koramangala": "Bengaluru",
  "Indiranagar": "Bengaluru",
  "Whitefield": "Bengaluru",
  "Electronic City": "Bengaluru",
  "Marathahalli": "Bengaluru",
  "HSR Layout": "Bengaluru",
  "BTM Layout": "Bengaluru",
  "Jayanagar": "Bengaluru",
  "Basavanagudi": "Bengaluru",
  "Malleshwaram": "Bengaluru",
  "Rajajinagar": "Bengaluru",
  "Vijayanagar": "Bengaluru",
  "Yeshwanthpur": "Bengaluru",
  "Hebbal": "Bengaluru",
  "Yelahanka": "Bengaluru",
  "Bommanahalli": "Bengaluru",
  "KR Puram": "Bengaluru",
  "K R Puram": "Bengaluru",

  // Landmark variations - Delhi
  "Connaught Place": "New Delhi",
  "CP": "New Delhi",
  "Karol Bagh": "New Delhi",
  "Lajpat Nagar": "New Delhi",
  "Saket": "New Delhi",
  "Dwarka": "New Delhi",
  "Rohini": "New Delhi",
  "Pitampura": "New Delhi",
  "Janakpuri": "New Delhi",
  "Rajouri Garden": "New Delhi",
  "Greater Kailash": "New Delhi",
  "GK": "New Delhi",
  "GK-1": "New Delhi",
  "GK-2": "New Delhi",
  "Vasant Kunj": "New Delhi",
  "Vasant Vihar": "New Delhi",
  "Noida": "Noida", // Separate city but in NCR
  "Ghaziabad": "Ghaziabad", // Separate city but in NCR

  // Landmark variations - Chennai
  "T Nagar": "Chennai",
  "T-Nagar": "Chennai",
  "Thyagaraya Nagar": "Chennai",
  "Adyar": "Chennai",
  "Anna Nagar": "Chennai",
  "Velachery": "Chennai",
  "Porur": "Chennai",
  "OMR": "Chennai", // Old Mahabalipuram Road
  "ECR": "Chennai", // East Coast Road

  // Landmark variations - Kolkata
  "Park Street": "Kolkata",
  "Salt Lake": "Kolkata",
  "Saltlake": "Kolkata",
  "New Town": "Kolkata",
  "Howrah": "Kolkata",
  "Dum Dum": "Kolkata",

  // Landmark variations - Hyderabad
  "Hitech City": "Hyderabad",
  "Gachibowli": "Hyderabad",
  "Kondapur": "Hyderabad",
  "Madhapur": "Hyderabad",
  "Banjara Hills": "Hyderabad",
  "Jubilee Hills": "Hyderabad",
  "Barkas": "Hyderabad",

  // Landmark variations - Pune
  "Hinjewadi": "Pune",
  "Kothrud": "Pune",
  "Baner": "Pune",
  "Aundh": "Pune",
  "Wakad": "Pune",
  "Viman Nagar": "Pune",
  "Koregaon Park": "Pune",
  "KP": "Pune",
};

// Extended LocationAlias array for backward compatibility
const locationAliases: LocationAlias[] = [
  // Major Indian cities
  { alias: "Bombay", canonical: "Mumbai", type: "city", region: "Maharashtra" },
  { alias: "Calcutta", canonical: "Kolkata", type: "city", region: "West Bengal" },
  { alias: "Madras", canonical: "Chennai", type: "city", region: "Tamil Nadu" },
  { alias: "Bangalore", canonical: "Bengaluru", type: "city", region: "Karnataka" },
  { alias: "Pondicherry", canonical: "Puducherry", type: "city", region: "Puducherry" },
  { alias: "Trivandrum", canonical: "Thiruvananthapuram", type: "city", region: "Kerala" },
  { alias: "Calicut", canonical: "Kozhikode", type: "city", region: "Kerala" },
  { alias: "Cochin", canonical: "Kochi", type: "city", region: "Kerala" },
  { alias: "Gurgaon", canonical: "Gurugram", type: "city", region: "Haryana" },
  { alias: "Poona", canonical: "Pune", type: "city", region: "Maharashtra" },

  // State abbreviations
  { alias: "MH", canonical: "Maharashtra", type: "abbreviation", region: "India" },
  { alias: "KA", canonical: "Karnataka", type: "abbreviation", region: "India" },
  { alias: "TN", canonical: "Tamil Nadu", type: "abbreviation", region: "India" },
  { alias: "DL", canonical: "Delhi", type: "abbreviation", region: "India" },
  { alias: "GJ", canonical: "Gujarat", type: "abbreviation", region: "India" },
  { alias: "RJ", canonical: "Rajasthan", type: "abbreviation", region: "India" },
  { alias: "UP", canonical: "Uttar Pradesh", type: "abbreviation", region: "India" },
  { alias: "WB", canonical: "West Bengal", type: "abbreviation", region: "India" },
  { alias: "AP", canonical: "Andhra Pradesh", type: "abbreviation", region: "India" },
  { alias: "TS", canonical: "Telangana", type: "abbreviation", region: "India" },
  { alias: "KL", canonical: "Kerala", type: "abbreviation", region: "India" },
  { alias: "PB", canonical: "Punjab", type: "abbreviation", region: "India" },
  { alias: "HR", canonical: "Haryana", type: "abbreviation", region: "India" },

  // Common landmarks/areas (examples)
  { alias: "Andheri", canonical: "Mumbai", type: "landmark", region: "Maharashtra" },
  { alias: "Bandra", canonical: "Mumbai", type: "landmark", region: "Maharashtra" },
  { alias: "Koramangala", canonical: "Bengaluru", type: "landmark", region: "Karnataka" },
  { alias: "Indiranagar", canonical: "Bengaluru", type: "landmark", region: "Karnataka" },
  { alias: "Connaught Place", canonical: "New Delhi", type: "landmark", region: "Delhi" },
  { alias: "CP", canonical: "New Delhi", type: "abbreviation", region: "Delhi" },
];

// Build maps for fast lookup
const aliasMap = new Map<string, string>(); // alias -> canonical (lowercase keys)
const canonicalMap = new Map<string, LocationAlias[]>(); // canonical -> aliases

// Populate from simple map structure
Object.entries(locationAliasMap).forEach(([alias, canonical]) => {
  aliasMap.set(alias.toLowerCase(), canonical);
});

// Also populate from LocationAlias array for backward compatibility
locationAliases.forEach((alias) => {
  aliasMap.set(alias.alias.toLowerCase(), alias.canonical);
  if (!canonicalMap.has(alias.canonical)) {
    canonicalMap.set(alias.canonical, []);
  }
  canonicalMap.get(alias.canonical)!.push(alias);
});

/**
 * Normalize location name using aliases
 * Handles case-insensitive matching
 * Returns official name or original if not found
 * Logs unmapped locations for review
 */
export function normalizeLocationName(location: string): string {
  if (!location || typeof location !== "string") {
    return "";
  }

  const normalized = location.trim();
  if (!normalized) {
    return "";
  }

  const lower = normalized.toLowerCase();

  // Check if it's an alias
  const canonical = aliasMap.get(lower);
  if (canonical) {
    return canonical;
  }

  // Log unmapped location for review
  // Only log if it's a meaningful location (not empty, not just whitespace, has some length)
  if (normalized.length >= 2) {
    console.log(`[Location] Unmapped location: "${location}" -> "${normalized}" (no alias found)`);
  }

  // Return original if no alias found
  return normalized;
}

/**
 * Get canonical name for a location
 */
export function getCanonicalName(location: string): string {
  return normalizeLocationName(location);
}

/**
 * Get all aliases for a canonical location
 */
export function getAliasesForLocation(canonical: string): LocationAlias[] {
  return canonicalMap.get(canonical) || [];
}

/**
 * Check if a location name is an alias
 */
export function isAlias(location: string): boolean {
  return aliasMap.has(location.toLowerCase());
}

/**
 * Get location alias information
 */
export function getLocationAlias(location: string): LocationAlias | undefined {
  const lower = location.toLowerCase();
  const canonical = aliasMap.get(lower);
  if (!canonical) return undefined;

  const aliases = canonicalMap.get(canonical);
  return aliases?.find((a) => a.alias.toLowerCase() === lower);
}

/**
 * Normalize city name
 */
export function normalizeCityName(city: string): string {
  return normalizeLocationName(city);
}

/**
 * Normalize state name
 */
export function normalizeStateName(state: string): string {
  return normalizeLocationName(state);
}

/**
 * Get the simple alias map
 * Returns: { [alias: string]: string }
 */
export function getLocationAliasMap(): { [alias: string]: string } {
  return { ...locationAliasMap };
}

/**
 * Get canonical name from alias (case-insensitive)
 * Returns the canonical name if alias exists, otherwise returns the input
 */
export function getCanonicalFromAlias(alias: string): string {
  if (!alias || typeof alias !== "string") {
    return "";
  }
  const normalized = alias.trim().toLowerCase();
  return aliasMap.get(normalized) || alias.trim();
}

