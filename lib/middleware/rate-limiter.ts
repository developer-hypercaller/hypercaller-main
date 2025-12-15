/**
 * Rate limiting middleware for API routes
 * Prevents abuse and brute force attacks
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
  keyGenerator?: (request: NextRequest) => string; // Custom key generator
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store (for production, use Redis)
const rateLimitStore: RateLimitStore = {};

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach((key) => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  });
}, 60000); // Clean up every minute

/**
 * Rate limiting middleware
 */
export function rateLimit(config: RateLimitConfig) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const now = Date.now();
    
    // Generate key for rate limiting (default: IP address)
    const key = config.keyGenerator 
      ? config.keyGenerator(request)
      : request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
        request.headers.get('x-real-ip') || 
        'unknown';

    const storeKey = `${key}_${config.windowMs}`;
    const entry = rateLimitStore[storeKey];

    // Check if entry exists and is still valid
    if (entry && entry.resetTime > now) {
      // Increment count
      entry.count++;
      
      // Check if limit exceeded
      if (entry.count > config.maxRequests) {
        return NextResponse.json(
          {
            error: config.message || `Too many requests. Please try again after ${Math.ceil((entry.resetTime - now) / 1000)} seconds.`,
            retryAfter: Math.ceil((entry.resetTime - now) / 1000),
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil((entry.resetTime - now) / 1000)),
              'X-RateLimit-Limit': String(config.maxRequests),
              'X-RateLimit-Remaining': String(Math.max(0, config.maxRequests - entry.count)),
              'X-RateLimit-Reset': String(Math.ceil(entry.resetTime / 1000)),
            },
          }
        );
      }
    } else {
      // Create new entry or reset expired entry
      rateLimitStore[storeKey] = {
        count: 1,
        resetTime: now + config.windowMs,
      };
    }

    // Request allowed
    return null;
  };
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiters = {
  // Strict: 5 requests per 15 minutes (for login)
  strict: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many login attempts. Please try again in 15 minutes.',
  }),

  // Moderate: 10 requests per 15 minutes (for registration)
  moderate: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
    message: 'Too many registration attempts. Please try again in 15 minutes.',
  }),

  // OTP: 3 requests per 10 minutes (for OTP sending)
  otp: rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 3,
    message: 'Too many OTP requests. Please try again in 10 minutes.',
    keyGenerator: (request) => {
      // Rate limit by phone number if available in body
      // For now, use IP as fallback
      return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip') || 
             'unknown';
    },
  }),

  // General: 100 requests per 15 minutes (for general API)
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many requests. Please try again later.',
  }),
};

