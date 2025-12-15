/**
 * Business hours validation utilities
 */

import { BusinessHours, SpecialHours } from "../schemas/business-schema";
import { isValidTimeFormat, normalizeDayOfWeek } from "../normalization/hours-normalizer";

const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

/**
 * Validate business hours
 */
export function validateBusinessHours(hours: BusinessHours): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!hours || typeof hours !== "object") {
    return { valid: false, errors: ["Business hours are required"] };
  }

  const dayKeys = Object.keys(hours);
  if (dayKeys.length === 0) {
    return { valid: false, errors: ["At least one day must be specified"] };
  }

  dayKeys.forEach((day) => {
    const normalizedDay = normalizeDayOfWeek(day);
    if (!normalizedDay || !DAYS_OF_WEEK.includes(normalizedDay)) {
      errors.push(`Invalid day: ${day}`);
      return;
    }

    const dayHours = hours[day];
    if (dayHours.isClosed) {
      // Closed is valid
      return;
    }

    if (!dayHours.open || !dayHours.close) {
      errors.push(`${normalizedDay}: Both open and close times are required`);
      return;
    }

    if (!isValidTimeFormat(dayHours.open)) {
      errors.push(`${normalizedDay}: Invalid open time format. Must be HH:mm`);
    }

    if (!isValidTimeFormat(dayHours.close)) {
      errors.push(`${normalizedDay}: Invalid close time format. Must be HH:mm`);
    }

    // Validate that close time is after open time
    if (isValidTimeFormat(dayHours.open) && isValidTimeFormat(dayHours.close)) {
      const [openHours, openMinutes] = dayHours.open.split(":").map(Number);
      const [closeHours, closeMinutes] = dayHours.close.split(":").map(Number);
      const openTime = openHours * 60 + openMinutes;
      const closeTime = closeHours * 60 + closeMinutes;

      if (closeTime <= openTime) {
        errors.push(`${normalizedDay}: Close time must be after open time`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate special hours
 */
export function validateSpecialHours(specialHours: SpecialHours[]): {
  valid: boolean;
  errors: string[];
} {
  if (!Array.isArray(specialHours)) {
    return { valid: false, errors: ["Special hours must be an array"] };
  }

  const errors: string[] = [];

  specialHours.forEach((sh, index) => {
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sh.date)) {
      errors.push(`Special hours[${index}]: Invalid date format. Must be YYYY-MM-DD`);
    }

    // Validate hours
    if (sh.hours.isClosed) {
      // Closed is valid
      return;
    }

    const hoursResult = validateBusinessHours(sh.hours as BusinessHours);
    if (!hoursResult.valid) {
      errors.push(...hoursResult.errors.map((e) => `Special hours[${index}]: ${e}`));
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

