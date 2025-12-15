/**
 * Address validation utilities
 */

import { Address } from "../schemas/location-schema";
import { validateCity, validateState, validatePinCode } from "./location-validator";

/**
 * Validate address object
 */
export function validateAddress(address: Address): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // City is required
  const cityResult = validateCity(address.city);
  if (!cityResult.valid && cityResult.error) {
    errors.push(cityResult.error);
  }

  // State is required
  const stateResult = validateState(address.state);
  if (!stateResult.valid && stateResult.error) {
    errors.push(stateResult.error);
  }

  // Pin code is optional but must be valid if provided
  if (address.pinCode) {
    const pinCodeResult = validatePinCode(address.pinCode);
    if (!pinCodeResult.valid && pinCodeResult.error) {
      errors.push(pinCodeResult.error);
    }
  }

  // Optional fields validation
  if (address.street && address.street.length > 500) {
    errors.push("Street address is too long (max 500 characters)");
  }

  if (address.area && address.area.length > 200) {
    errors.push("Area is too long (max 200 characters)");
  }

  if (address.landmark && address.landmark.length > 200) {
    errors.push("Landmark is too long (max 200 characters)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

