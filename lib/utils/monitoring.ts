/**
 * Monitoring utilities
 * Provides logging, metrics tracking, and data quality tracking
 * Prepared for CloudWatch integration
 */

import { AppError } from "./error-handler";

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error | AppError;
  metadata?: Record<string, any>;
}

/**
 * Metric entry structure
 */
export interface MetricEntry {
  name: string;
  value: number;
  unit?: string;
  timestamp: number;
  dimensions?: Record<string, string>;
  metadata?: Record<string, any>;
}

/**
 * Data quality issue structure
 */
export interface DataQualityIssue {
  type: "unmapped" | "validation_failure" | "mapping_issue" | "normalization_failure";
  source: string; // e.g., "normalizer", "validator", "mapper"
  input: any;
  output?: any;
  error?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Monitoring class
 * Centralized monitoring and logging
 */
class Monitoring {
  private logs: LogEntry[] = [];
  private metrics: MetricEntry[] = [];
  private dataQualityIssues: DataQualityIssue[] = [];
  private maxEntries = 1000; // Keep last 1000 entries in memory

  /**
   * Log a message
   */
  log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error | AppError): void {
    const logEntry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      context,
      error,
    };

    this.logs.push(logEntry);

    // Keep only last maxEntries
    if (this.logs.length > this.maxEntries) {
      this.logs.shift();
    }

    // Console logging (in production, send to CloudWatch)
    this.logToConsole(logEntry);

    // In production, send to CloudWatch Logs
    // await this.sendToCloudWatch(logEntry);
  }

  /**
   * Log to console (development)
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : "";
    const errorStr = entry.error ? ` Error: ${entry.error.message}` : "";

    const logMessage = `[${timestamp}] [${entry.level}] ${entry.message}${contextStr}${errorStr}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage);
        break;
      case LogLevel.INFO:
        console.log(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.ERROR:
        console.error(logMessage);
        if (entry.error?.stack) {
          console.error(entry.error.stack);
        }
        break;
    }
  }

  /**
   * Track a metric
   */
  trackMetric(
    name: string,
    value: number,
    unit?: string,
    dimensions?: Record<string, string>,
    metadata?: Record<string, any>
  ): void {
    const metric: MetricEntry = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      dimensions,
      metadata,
    };

    this.metrics.push(metric);

    // Keep only last maxEntries
    if (this.metrics.length > this.maxEntries) {
      this.metrics.shift();
    }

    // In production, send to CloudWatch Metrics
    // await this.sendMetricToCloudWatch(metric);
  }

  /**
   * Track data quality issue
   */
  trackDataQualityIssue(issue: DataQualityIssue): void {
    this.dataQualityIssues.push(issue);

    // Keep only last maxEntries
    if (this.dataQualityIssues.length > this.maxEntries) {
      this.dataQualityIssues.shift();
    }

    // Log as warning
    this.log(LogLevel.WARN, `Data quality issue: ${issue.type}`, {
      source: issue.source,
      input: issue.input,
      error: issue.error,
      ...issue.metadata,
    });
  }

  /**
   * Get recent logs
   */
  getRecentLogs(limit: number = 100, level?: LogLevel): LogEntry[] {
    let filtered = this.logs;
    if (level) {
      filtered = this.logs.filter((log) => log.level === level);
    }
    return filtered.slice(-limit).reverse();
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(limit: number = 100, name?: string): MetricEntry[] {
    let filtered = this.metrics;
    if (name) {
      filtered = this.metrics.filter((m) => m.name === name);
    }
    return filtered.slice(-limit).reverse();
  }

  /**
   * Get data quality issues
   */
  getDataQualityIssues(limit: number = 100, type?: DataQualityIssue["type"]): DataQualityIssue[] {
    let filtered = this.dataQualityIssues;
    if (type) {
      filtered = this.dataQualityIssues.filter((issue) => issue.type === type);
    }
    return filtered.slice(-limit).reverse();
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    logs: {
      total: number;
      byLevel: Record<LogLevel, number>;
    };
    metrics: {
      total: number;
      byName: Record<string, number>;
    };
    dataQuality: {
      total: number;
      byType: Record<string, number>;
    };
  } {
    const logsByLevel: Record<LogLevel, number> = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0,
    };

    this.logs.forEach((log) => {
      logsByLevel[log.level]++;
    });

    const metricsByName: Record<string, number> = {};
    this.metrics.forEach((metric) => {
      metricsByName[metric.name] = (metricsByName[metric.name] || 0) + 1;
    });

    const issuesByType: Record<string, number> = {};
    this.dataQualityIssues.forEach((issue) => {
      issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
    });

    return {
      logs: {
        total: this.logs.length,
        byLevel: logsByLevel,
      },
      metrics: {
        total: this.metrics.length,
        byName: metricsByName,
      },
      dataQuality: {
        total: this.dataQualityIssues.length,
        byType: issuesByType,
      },
    };
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.logs = [];
    this.metrics = [];
    this.dataQualityIssues = [];
  }
}

// Singleton instance
export const monitoring = new Monitoring();

/**
 * Convenience functions for logging
 */
export function logDebug(message: string, context?: Record<string, any>): void {
  monitoring.log(LogLevel.DEBUG, message, context);
}

export function logInfo(message: string, context?: Record<string, any>): void {
  monitoring.log(LogLevel.INFO, message, context);
}

export function logWarn(message: string, context?: Record<string, any>, error?: Error | AppError): void {
  monitoring.log(LogLevel.WARN, message, context, error);
}

export function logError(message: string, context?: Record<string, any>, error?: Error | AppError): void {
  monitoring.log(LogLevel.ERROR, message, context, error);
}

/**
 * Convenience functions for metrics
 */
export function trackMetric(
  name: string,
  value: number,
  unit?: string,
  dimensions?: Record<string, string>,
  metadata?: Record<string, any>
): void {
  monitoring.trackMetric(name, value, unit, dimensions, metadata);
}

/**
 * Convenience functions for data quality
 */
export function trackUnmappedValue(source: string, input: any, metadata?: Record<string, any>): void {
  monitoring.trackDataQualityIssue({
    type: "unmapped",
    source,
    input,
    timestamp: Date.now(),
    metadata,
  });
}

export function trackValidationFailure(source: string, input: any, error: string, metadata?: Record<string, any>): void {
  monitoring.trackDataQualityIssue({
    type: "validation_failure",
    source,
    input,
    error,
    timestamp: Date.now(),
    metadata,
  });
}

export function trackMappingIssue(source: string, input: any, output?: any, error?: string, metadata?: Record<string, any>): void {
  monitoring.trackDataQualityIssue({
    type: "mapping_issue",
    source,
    input,
    output,
    error,
    timestamp: Date.now(),
    metadata,
  });
}

export function trackNormalizationFailure(source: string, input: any, error: string, metadata?: Record<string, any>): void {
  monitoring.trackDataQualityIssue({
    type: "normalization_failure",
    source,
    input,
    error,
    timestamp: Date.now(),
    metadata,
  });
}

/**
 * CloudWatch integration (prepared for future implementation)
 */
export class CloudWatchIntegration {
  /**
   * Send log to CloudWatch Logs
   * TODO: Implement AWS CloudWatch Logs integration
   */
  static async sendLogToCloudWatch(entry: LogEntry): Promise<void> {
    // In production, implement:
    // const cloudwatch = new CloudWatchLogsClient({ region: "ap-southeast-1" });
    // await cloudwatch.send(new PutLogEventsCommand({ ... }));
    console.log("[CloudWatch] Would send log:", entry);
  }

  /**
   * Send metric to CloudWatch Metrics
   * TODO: Implement AWS CloudWatch Metrics integration
   */
  static async sendMetricToCloudWatch(metric: MetricEntry): Promise<void> {
    // In production, implement:
    // const cloudwatch = new CloudWatchClient({ region: "ap-southeast-1" });
    // await cloudwatch.send(new PutMetricDataCommand({ ... }));
    console.log("[CloudWatch] Would send metric:", metric);
  }
}

