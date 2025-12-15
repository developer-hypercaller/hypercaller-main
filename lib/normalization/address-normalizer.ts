/**
 * Address normalization utilities
 */

import { Address } from "../schemas/location-schema";
import { normalizeCity, normalizeState, normalizeCountry, normalizePinCode, normalizeAddress } from "./location-normalizer";

/**
 * Normalize address object
 */
export function normalizeAddressObject(address: Address): Address {
  return {
    street: address.street ? normalizeAddress(address.street) : undefined,
    area: address.area ? normalizeAddress(address.area) : undefined,
    city: normalizeCity(address.city || ""),
    state: normalizeState(address.state || ""),
    country: normalizeCountry(address.country || "India"),
    pinCode: normalizePinCode(address.pinCode),
    landmark: address.landmark ? normalizeAddress(address.landmark) : undefined,
  };
}

/**
 * Parse and structure address from string
 * Attempts to parse an address string into structured Address object
 * 
 * @param addressString - Raw address string to parse
 * @returns Structured Address object or partial object if parsing incomplete
 */
export function parseAddressString(addressString: string): Partial<Address> {
  if (!addressString || typeof addressString !== "string") {
    return {};
  }

  const address: Partial<Address> = {};
  const trimmed = addressString.trim();

  if (!trimmed) {
    return {};
  }

  // Common patterns for Indian addresses:
  // - PIN code: 6 digits at the end
  // - City, State format
  // - Street, Area, City format

  // Extract PIN code (6 digits at end, possibly preceded by comma or space)
  const pinCodeMatch = trimmed.match(/(?:,|\s)(\d{6})(?:\s|$)/);
  if (pinCodeMatch) {
    address.pinCode = pinCodeMatch[1];
  }

  // Remove PIN code from string for further parsing
  let remaining = trimmed.replace(/(?:,|\s)\d{6}(?:\s|$)/, "").trim();

  // Split by common delimiters (comma, newline, etc.)
  const parts = remaining
    .split(/[,\n\r]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  // Try to identify city and state (usually at the end)
  // Look for common state names or abbreviations
  const statePattern = /(?:^|\s)(Maharashtra|Karnataka|Tamil Nadu|Delhi|Gujarat|Rajasthan|Uttar Pradesh|West Bengal|Andhra Pradesh|Telangana|Kerala|Punjab|Haryana|Madhya Pradesh|Bihar|Odisha|Assam|Jharkhand|Chhattisgarh|Himachal Pradesh|Uttarakhand|Goa|Manipur|Meghalaya|Mizoram|Nagaland|Sikkim|Tripura|Arunachal Pradesh|Jammu and Kashmir|Andaman and Nicobar Islands|Chandigarh|Dadra and Nagar Haveli|Daman and Diu|Lakshadweep|Puducherry)(?:\s|$)/i;
  
  let stateFound = false;
  let cityFound = false;

  // Process parts in reverse to find city and state first
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    
    // Check if it's a state
    const stateMatch = part.match(statePattern);
    if (stateMatch && !stateFound) {
      address.state = normalizeState(stateMatch[1]);
      stateFound = true;
      
      // The part before state is likely the city
      if (i > 0) {
        address.city = normalizeCity(parts[i - 1]);
        cityFound = true;
        i--; // Skip the city part in next iteration
      }
      break;
    }
  }

  // If city/state not found, try to infer from remaining parts
  if (!cityFound && parts.length > 0) {
    // Last part might be city if no state found
    address.city = normalizeCity(parts[parts.length - 1]);
  }

  // Remaining parts could be street, area, or landmark
  if (parts.length > 0) {
    const usedIndices = new Set<number>();
    
    // Find indices of city and state
    parts.forEach((part, index) => {
      if (address.city && normalizeCity(part).toLowerCase() === address.city.toLowerCase()) {
        usedIndices.add(index);
      }
      if (address.state && normalizeState(part).toLowerCase() === address.state.toLowerCase()) {
        usedIndices.add(index);
      }
    });

    // Collect unused parts
    const unusedParts = parts
      .map((part, index) => ({ part, index }))
      .filter(({ index }) => !usedIndices.has(index))
      .map(({ part }) => part);

    if (unusedParts.length > 0) {
      // First part is likely street, second could be area
      address.street = normalizeAddress(unusedParts[0]);
      if (unusedParts.length > 1) {
        address.area = normalizeAddress(unusedParts[1]);
      }
      if (unusedParts.length > 2) {
        // Third could be landmark
        address.landmark = normalizeAddress(unusedParts.slice(2).join(", "));
      }
    }
  }

  // Default country to India if not specified
  address.country = normalizeCountry(address.country || "India");

  return address;
}

/**
 * Build normalized address string from address object
 */
export function buildNormalizedAddressString(address: Address): string {
  const parts: string[] = [];

  if (address.street) parts.push(address.street);
  if (address.area) parts.push(address.area);
  if (address.landmark) parts.push(address.landmark);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.pinCode) parts.push(address.pinCode);
  if (address.country) parts.push(address.country);

  return parts.join(", ");
}

