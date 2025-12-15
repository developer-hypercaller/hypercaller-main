/**
 * Account lockout mechanism
 * Tracks failed login attempts and locks accounts after threshold
 */

import { NextRequest, NextResponse } from 'next/server';

interface LockoutEntry {
  attempts: number;
  lockoutUntil: number | null; // Timestamp when lockout expires
  lastAttempt: number; // Timestamp of last attempt
}

interface LockoutStore {
  [key: string]: LockoutEntry;
}

// In-memory store (for production, use DynamoDB or Redis)
const lockoutStore: LockoutStore = {};

// Configuration
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const RESET_WINDOW_MS = 15 * 60 * 1000; // Reset attempts after 15 minutes of no activity

/**
 * Clean up expired lockouts periodically
 */
setInterval(() => {
  const now = Date.now();
  Object.keys(lockoutStore).forEach((key) => {
    const entry = lockoutStore[key];
    // Remove if lockout expired and no recent activity
    if (
      entry.lockoutUntil &&
      entry.lockoutUntil < now &&
      entry.lastAttempt < now - RESET_WINDOW_MS
    ) {
      delete lockoutStore[key];
    }
  });
}, 60000); // Clean up every minute

/**
 * Check if account is locked
 */
export function isAccountLocked(identifier: string): {
  locked: boolean;
  lockoutUntil?: number;
  remainingAttempts?: number;
} {
  const entry = lockoutStore[identifier];
  
  if (!entry) {
    return { locked: false, remainingAttempts: MAX_ATTEMPTS };
  }

  const now = Date.now();

  // Check if currently locked
  if (entry.lockoutUntil && entry.lockoutUntil > now) {
    return {
      locked: true,
      lockoutUntil: entry.lockoutUntil,
    };
  }

  // Check if lockout expired
  if (entry.lockoutUntil && entry.lockoutUntil <= now) {
    // Reset attempts after lockout expires
    delete lockoutStore[identifier];
    return { locked: false, remainingAttempts: MAX_ATTEMPTS };
  }

  // Check if attempts should be reset (no activity for reset window)
  if (entry.lastAttempt < now - RESET_WINDOW_MS) {
    delete lockoutStore[identifier];
    return { locked: false, remainingAttempts: MAX_ATTEMPTS };
  }

  return {
    locked: false,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - entry.attempts),
  };
}

/**
 * Record failed login attempt
 */
export function recordFailedAttempt(identifier: string): {
  locked: boolean;
  lockoutUntil?: number;
  attempts: number;
} {
  const now = Date.now();
  const entry = lockoutStore[identifier] || {
    attempts: 0,
    lockoutUntil: null,
    lastAttempt: now,
  };

  // Reset if lockout expired
  if (entry.lockoutUntil && entry.lockoutUntil <= now) {
    entry.attempts = 0;
    entry.lockoutUntil = null;
  }

  // Reset if no activity for reset window
  if (entry.lastAttempt < now - RESET_WINDOW_MS) {
    entry.attempts = 0;
    entry.lockoutUntil = null;
  }

  // Increment attempts
  entry.attempts++;
  entry.lastAttempt = now;

  // Lock account if threshold reached
  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockoutUntil = now + LOCKOUT_DURATION_MS;
    lockoutStore[identifier] = entry;
    return {
      locked: true,
      lockoutUntil: entry.lockoutUntil,
      attempts: entry.attempts,
    };
  }

  lockoutStore[identifier] = entry;
  return {
    locked: false,
    attempts: entry.attempts,
  };
}

/**
 * Clear failed attempts (on successful login)
 */
export function clearFailedAttempts(identifier: string): void {
  delete lockoutStore[identifier];
}

/**
 * Get lockout status for response
 */
export function getLockoutResponse(identifier: string): NextResponse | null {
  const status = isAccountLocked(identifier);
  
  if (status.locked && status.lockoutUntil) {
    const remainingSeconds = Math.ceil((status.lockoutUntil - Date.now()) / 1000);
    return NextResponse.json(
      {
        error: `Account locked due to too many failed login attempts. Please try again in ${remainingSeconds} seconds.`,
        lockoutUntil: status.lockoutUntil,
        retryAfter: remainingSeconds,
      },
      {
        status: 423, // 423 Locked
        headers: {
          'Retry-After': String(remainingSeconds),
          'X-Account-Locked': 'true',
          'X-Lockout-Until': String(status.lockoutUntil),
        },
      }
    );
  }

  return null;
}

