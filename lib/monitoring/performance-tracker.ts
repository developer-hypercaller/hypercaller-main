/**
 * Performance tracking utilities
 * Tracks API performance and response times
 */

export interface PerformanceMetric {
  operation: string;
  duration: number; // milliseconds
  timestamp: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

class PerformanceTracker {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000;

  /**
   * Track performance metric
   */
  trackMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only last maxMetrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  /**
   * Get performance statistics
   */
  getStats(operation?: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    successRate: number;
  } {
    const filtered = operation
      ? this.metrics.filter((m) => m.operation === operation)
      : this.metrics;

    if (filtered.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        successRate: 0,
      };
    }

    const durations = filtered.map((m) => m.duration);
    const successes = filtered.filter((m) => m.success).length;

    return {
      count: filtered.length,
      avgDuration:
        durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      successRate: successes / filtered.length,
    };
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(limit: number = 100): PerformanceMetric[] {
    return this.metrics.slice(-limit).reverse();
  }
}

// Singleton instance
export const performanceTracker = new PerformanceTracker();

/**
 * Measure async operation performance
 */
export async function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const start = Date.now();
  let success = true;
  let error: string | undefined;

  try {
    const result = await fn();
    return result;
  } catch (e: any) {
    success = false;
    error = e.message;
    throw e;
  } finally {
    const duration = Date.now() - start;
    performanceTracker.trackMetric({
      operation,
      duration,
      timestamp: Date.now(),
      success,
      error,
      metadata,
    });
  }
}

