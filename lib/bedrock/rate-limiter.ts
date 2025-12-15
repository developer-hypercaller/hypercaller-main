/**
 * Rate limiter for Bedrock API calls
 * Tracks requests per user, per IP, and globally
 * Enforces limits and queues requests
 */

import { get, set } from "../utils/cache";

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  perUser: number; // Requests per hour per user
  perIP: number; // Requests per hour per IP
  global: number; // Requests per hour globally
}

/**
 * Default rate limits
 */
const DEFAULT_LIMITS: RateLimitConfig = {
  perUser: 100, // 100 requests/hour per user
  perIP: 200, // 200 requests/hour per IP
  global: 1000, // 1000 requests/hour globally
};

/**
 * Request queue entry
 */
interface QueuedRequest {
  id: string;
  timestamp: number;
  userId?: string;
  ipAddress?: string;
  resolve: () => void;
  reject: (error: Error) => void;
}

/**
 * Rate limit tracker
 */
class RateLimitTracker {
  private userRequests: Map<string, number[]> = new Map(); // userId -> timestamps
  private ipRequests: Map<string, number[]> = new Map(); // ipAddress -> timestamps
  private globalRequests: number[] = []; // Global timestamps
  private requestQueue: QueuedRequest[] = [];
  private processing = false;
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_LIMITS, ...config };
  }

  /**
   * Check if request is allowed
   */
  private isAllowed(userId?: string, ipAddress?: string): {
    allowed: boolean;
    reason?: string;
    waitTime?: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Clean old requests
    this.cleanOldRequests(oneHourAgo);

    // Check global limit
    const globalCount = this.globalRequests.length;
    if (globalCount >= this.config.global) {
      const oldestRequest = Math.min(...this.globalRequests);
      const waitTime = 60 * 60 * 1000 - (now - oldestRequest);
      return {
        allowed: false,
        reason: "Global rate limit exceeded",
        waitTime,
      };
    }

    // Check per-IP limit
    if (ipAddress) {
      const ipRequests = this.ipRequests.get(ipAddress) || [];
      if (ipRequests.length >= this.config.perIP) {
        const oldestRequest = Math.min(...ipRequests);
        const waitTime = 60 * 60 * 1000 - (now - oldestRequest);
        return {
          allowed: false,
          reason: "IP rate limit exceeded",
          waitTime,
        };
      }
    }

    // Check per-user limit
    if (userId) {
      const userRequests = this.userRequests.get(userId) || [];
      if (userRequests.length >= this.config.perUser) {
        const oldestRequest = Math.min(...userRequests);
        const waitTime = 60 * 60 * 1000 - (now - oldestRequest);
        return {
          allowed: false,
          reason: "User rate limit exceeded",
          waitTime,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Clean old requests (older than one hour)
   */
  private cleanOldRequests(oneHourAgo: number): void {
    // Clean global requests
    this.globalRequests = this.globalRequests.filter((ts) => ts > oneHourAgo);

    // Clean user requests
    for (const [userId, requests] of this.userRequests.entries()) {
      const filtered = requests.filter((ts) => ts > oneHourAgo);
      if (filtered.length === 0) {
        this.userRequests.delete(userId);
      } else {
        this.userRequests.set(userId, filtered);
      }
    }

    // Clean IP requests
    for (const [ip, requests] of this.ipRequests.entries()) {
      const filtered = requests.filter((ts) => ts > oneHourAgo);
      if (filtered.length === 0) {
        this.ipRequests.delete(ip);
      } else {
        this.ipRequests.set(ip, filtered);
      }
    }
  }

  /**
   * Record a request
   */
  private recordRequest(userId?: string, ipAddress?: string): void {
    const now = Date.now();

    // Record global request
    this.globalRequests.push(now);

    // Record IP request
    if (ipAddress) {
      const ipRequests = this.ipRequests.get(ipAddress) || [];
      ipRequests.push(now);
      this.ipRequests.set(ipAddress, ipRequests);
    }

    // Record user request
    if (userId) {
      const userRequests = this.userRequests.get(userId) || [];
      userRequests.push(now);
      this.userRequests.set(userId, userRequests);
    }
  }

  /**
   * Wait for rate limit availability
   */
  async waitForAvailability(
    userId?: string,
    ipAddress?: string,
    timeout: number = 30000
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const queuedRequest: QueuedRequest = {
        id: requestId,
        timestamp: Date.now(),
        userId,
        ipAddress,
        resolve,
        reject,
      };

      this.requestQueue.push(queuedRequest);

      // Set timeout
      const timeoutId = setTimeout(() => {
        const index = this.requestQueue.findIndex((r) => r.id === requestId);
        if (index !== -1) {
          this.requestQueue.splice(index, 1);
          reject(new Error("Rate limit wait timeout"));
        }
      }, timeout);

      // Clear timeout when resolved
      queuedRequest.resolve = () => {
        clearTimeout(timeoutId);
        resolve();
      };

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process request queue
   */
  private async processQueue(): Promise<void> {
    this.processing = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue[0];
      const check = this.isAllowed(request.userId, request.ipAddress);

      if (check.allowed) {
        // Remove from queue
        this.requestQueue.shift();

        // Record request
        this.recordRequest(request.userId, request.ipAddress);

        // Resolve promise
        request.resolve();
      } else {
        // Wait before checking again
        const waitTime = Math.min(check.waitTime || 1000, 5000); // Max 5 seconds
        await this.sleep(waitTime);
      }
    }

    this.processing = false;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current rate limit status
   */
  getStatus(userId?: string, ipAddress?: string): {
    global: { used: number; limit: number; remaining: number };
    ip?: { used: number; limit: number; remaining: number };
    user?: { used: number; limit: number; remaining: number };
  } {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    this.cleanOldRequests(oneHourAgo);

    const globalUsed = this.globalRequests.length;
    const globalRemaining = Math.max(0, this.config.global - globalUsed);

    const status: any = {
      global: {
        used: globalUsed,
        limit: this.config.global,
        remaining: globalRemaining,
      },
    };

    if (ipAddress) {
      const ipRequests = this.ipRequests.get(ipAddress) || [];
      const ipUsed = ipRequests.length;
      const ipRemaining = Math.max(0, this.config.perIP - ipUsed);
      status.ip = {
        used: ipUsed,
        limit: this.config.perIP,
        remaining: ipRemaining,
      };
    }

    if (userId) {
      const userRequests = this.userRequests.get(userId) || [];
      const userUsed = userRequests.length;
      const userRemaining = Math.max(0, this.config.perUser - userUsed);
      status.user = {
        used: userUsed,
        limit: this.config.perUser,
        remaining: userRemaining,
      };
    }

    return status;
  }
}

// Singleton instance
let rateLimitTrackerInstance: RateLimitTracker | null = null;

/**
 * Get rate limit tracker instance
 */
export function getRateLimitTracker(config?: Partial<RateLimitConfig>): RateLimitTracker {
  if (!rateLimitTrackerInstance) {
    rateLimitTrackerInstance = new RateLimitTracker(config);
  }
  return rateLimitTrackerInstance;
}

/**
 * Extract IP address from request
 */
export function extractIPAddress(request: any): string | undefined {
  if (!request) return undefined;

  // Check headers
  const forwardedFor = request.headers?.get?.("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = request.headers?.get?.("x-real-ip");
  if (realIP) {
    return realIP.trim();
  }

  // Check connection remote address
  if (request.connection?.remoteAddress) {
    return request.connection.remoteAddress;
  }

  return undefined;
}

/**
 * Wrap async function with rate limiting
 */
export async function withRateLimit<T>(
  fn: () => Promise<T>,
  options?: {
    userId?: string;
    ipAddress?: string;
    request?: any;
    config?: Partial<RateLimitConfig>;
    timeout?: number;
  }
): Promise<T> {
  const tracker = getRateLimitTracker(options?.config);

  // Extract IP from request if provided
  let ipAddress = options?.ipAddress;
  if (!ipAddress && options?.request) {
    ipAddress = extractIPAddress(options.request);
  }

  // Wait for availability
  await tracker.waitForAvailability(options?.userId, ipAddress, options?.timeout);

  // Execute function
  try {
    return await fn();
  } catch (error: any) {
    // Check if it's a rate limit error from Bedrock
    if (isBedrockRateLimitError(error)) {
      // Wait and retry once
      await tracker.waitForAvailability(options?.userId, ipAddress, 5000);
      return await fn();
    }
    throw error;
  }
}

/**
 * Check if error is a Bedrock rate limit error
 */
function isBedrockRateLimitError(error: any): boolean {
  if (!error) return false;

  const errorMessage = error.message?.toLowerCase() || "";
  const errorCode = error.code || error.name || "";

  return (
    errorMessage.includes("throttling") ||
    errorMessage.includes("rate limit") ||
    errorMessage.includes("too many requests") ||
    errorCode === "ThrottlingException" ||
    errorCode === "TooManyRequestsException"
  );
}

/**
 * Get rate limit status
 */
export function getRateLimitStatus(
  userId?: string,
  ipAddress?: string,
  request?: any
): ReturnType<RateLimitTracker["getStatus"]> {
  const tracker = getRateLimitTracker();

  // Extract IP from request if provided
  let ip = ipAddress;
  if (!ip && request) {
    ip = extractIPAddress(request);
  }

  return tracker.getStatus(userId, ip);
}
