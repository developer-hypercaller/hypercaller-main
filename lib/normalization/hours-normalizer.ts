/**
 * Business hours normalization utilities
 */

import { BusinessHours, SpecialHours } from "../schemas/business-schema";

const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

/**
 * Normalize day of week name
 */
export function normalizeDayOfWeek(day: string): string {
  if (!day || typeof day !== "string") {
    return "";
  }

  const lower = day.toLowerCase().trim();
  const dayMap: Record<string, string> = {
    mon: "monday",
    tue: "tuesday",
    wed: "wednesday",
    thu: "thursday",
    fri: "friday",
    sat: "saturday",
    sun: "sunday",
  };

  return dayMap[lower] || lower;
}

/**
 * Validate time format (HH:mm)
 */
export function isValidTimeFormat(time: string): boolean {
  if (!time || typeof time !== "string") {
    return false;
  }

  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time.trim());
}

/**
 * Normalize time to HH:mm format
 */
export function normalizeTime(time: string): string | null {
  if (!time || typeof time !== "string") {
    return null;
  }

  const trimmed = time.trim();

  // Already in HH:mm format
  if (isValidTimeFormat(trimmed)) {
    return trimmed;
  }

  // Try to parse common formats
  // Handle formats like "9:30 AM", "9:30PM", "09:30", etc.
  const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)?/i;
  const match = trimmed.match(timeRegex);

  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3]?.toUpperCase();

    if (period === "PM" && hours !== 12) {
      hours += 12;
    } else if (period === "AM" && hours === 12) {
      hours = 0;
    }

    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    }
  }

  return null;
}

/**
 * Normalize business hours object
 */
export function normalizeBusinessHours(hours: BusinessHours): BusinessHours {
  const normalized: BusinessHours = {};

  Object.keys(hours).forEach((day) => {
    const normalizedDay = normalizeDayOfWeek(day);
    if (!normalizedDay || !DAYS_OF_WEEK.includes(normalizedDay)) {
      return;
    }

    const dayHours = hours[day];
    if (dayHours.isClosed) {
      normalized[normalizedDay] = { isClosed: true };
    } else if (dayHours.open && dayHours.close) {
      const openTime = normalizeTime(dayHours.open);
      const closeTime = normalizeTime(dayHours.close);

      if (openTime && closeTime) {
        normalized[normalizedDay] = {
          open: openTime,
          close: closeTime,
        };
      }
    }
  });

  return normalized;
}

/**
 * Normalize special hours
 */
export function normalizeSpecialHours(specialHours: SpecialHours[]): SpecialHours[] {
  if (!Array.isArray(specialHours)) {
    return [];
  }

  return specialHours
    .map((sh): SpecialHours | null => {
      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(sh.date)) {
        return null;
      }

      if (sh.hours.isClosed) {
        return {
          date: sh.date,
          hours: { isClosed: true },
          reason: sh.reason,
        };
      }

      const normalized = normalizeBusinessHours(sh.hours as BusinessHours);
      if (Object.keys(normalized).length === 0) {
        return null;
      }

      return {
        date: sh.date,
        hours: normalized,
        reason: sh.reason,
      };
    })
    .filter((sh): sh is SpecialHours => sh !== null);
}

