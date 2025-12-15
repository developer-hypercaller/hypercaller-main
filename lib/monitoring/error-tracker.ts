/**
 * Error tracking and monitoring utilities
 * Provides error logging and monitoring capabilities
 */

import { AppError, logError } from "../utils/error-handler";

export interface ErrorLog {
  timestamp: number;
  error: string;
  code?: string;
  stack?: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

class ErrorTracker {
  private errors: ErrorLog[] = [];
  private maxErrors = 1000; // Keep last 1000 errors in memory

  /**
   * Track error
   */
  trackError(
    error: Error | AppError,
    context?: {
      userId?: string;
      sessionId?: string;
      [key: string]: any;
    }
  ): void {
    const errorLog: ErrorLog = {
      timestamp: Date.now(),
      error: error.message,
      code: error instanceof AppError ? error.code : undefined,
      stack: error.stack,
      context,
      userId: context?.userId,
      sessionId: context?.sessionId,
    };

    this.errors.push(errorLog);

    // Keep only last maxErrors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log to console (in production, send to monitoring service)
    logError(error, context);
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 100): ErrorLog[] {
    return this.errors.slice(-limit).reverse();
  }

  /**
   * Get errors by code
   */
  getErrorsByCode(code: string): ErrorLog[] {
    return this.errors.filter((e) => e.code === code);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byCode: Record<string, number>;
    recent: number;
  } {
    const byCode: Record<string, number> = {};
    this.errors.forEach((e) => {
      const code = e.code || "UNKNOWN";
      byCode[code] = (byCode[code] || 0) + 1;
    });

    return {
      total: this.errors.length,
      byCode,
      recent: this.errors.filter(
        (e) => Date.now() - e.timestamp < 3600000
      ).length, // Last hour
    };
  }

  /**
   * Clear errors
   */
  clearErrors(): void {
    this.errors = [];
  }
}

// Singleton instance
export const errorTracker = new ErrorTracker();

/**
 * Track error (convenience function)
 */
export function trackError(
  error: Error | AppError,
  context?: Record<string, any>
): void {
  errorTracker.trackError(error, context);
}

