/**
 * Embedding Queue System
 * Manages background processing of business embeddings
 * Handles queuing, processing, retries, and status tracking
 */

import { generateBusinessEmbedding } from "../bedrock/embeddings";
import { Business } from "../schemas/business-schema";
const { getBusinessById } = require("../db/businesses");
const { saveEmbedding, hasEmbedding } = require("../db/embeddings");
const { get, set } = require("../utils/cache");

/**
 * Embedding job status
 */
export enum EmbeddingJobStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  RETRYING = "retrying",
}

/**
 * Embedding job interface
 */
export interface EmbeddingJob {
  businessId: string;
  status: EmbeddingJobStatus;
  version: string;
  priority: number; // Higher = more important
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  updatedAt: number;
  error?: string;
  retryAfter?: number; // Timestamp for retry
}

/**
 * Queue configuration
 */
interface QueueConfig {
  batchSize: number; // Number of jobs to process at once
  retryDelay: number; // Delay before retry (ms)
  maxRetries: number; // Maximum retry attempts
  processingInterval: number; // How often to process queue (ms)
}

const DEFAULT_CONFIG: QueueConfig = {
  batchSize: 10,
  retryDelay: 5000, // 5 seconds
  maxRetries: 3,
  processingInterval: 10000, // 10 seconds
};

/**
 * Embedding Queue Manager
 */
class EmbeddingQueue {
  private queue: Map<string, EmbeddingJob> = new Map();
  private processing: boolean = false;
  private config: QueueConfig;
  private processingIntervalId: NodeJS.Timeout | null = null;

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add job to queue
   */
  async enqueue(
    businessId: string,
    options: {
      version?: string;
      priority?: number;
      force?: boolean; // Force regeneration even if embedding exists
    } = {}
  ): Promise<void> {
    const version = options.version || "titan-v1";
    const priority = options.priority || 0;

    // Check if embedding already exists (unless forced)
    if (!options.force) {
      const exists = await hasEmbedding(businessId, version);
      if (exists) {
        console.log(`[EmbeddingQueue] Embedding already exists for ${businessId}, skipping`);
        return;
      }
    }

    // Check if job already exists
    const existingJob = this.queue.get(businessId);
    if (existingJob && existingJob.status === EmbeddingJobStatus.PENDING) {
      // Update priority if higher
      if (priority > existingJob.priority) {
        existingJob.priority = priority;
        existingJob.updatedAt = Date.now();
      }
      return;
    }

    // Create new job
    const job: EmbeddingJob = {
      businessId,
      status: EmbeddingJobStatus.PENDING,
      version,
      priority,
      attempts: 0,
      maxAttempts: this.config.maxRetries,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.queue.set(businessId, job);

    // Save to cache for persistence
    await this.saveJobToCache(job);

    console.log(`[EmbeddingQueue] Enqueued embedding job for ${businessId}`);
  }

  /**
   * Process queue
   */
  async processQueue(): Promise<void> {
    if (this.processing) {
      return; // Already processing
    }

    this.processing = true;

    try {
      // Get pending jobs sorted by priority
      const pendingJobs = Array.from(this.queue.values())
        .filter(
          (job) =>
            job.status === EmbeddingJobStatus.PENDING ||
            (job.status === EmbeddingJobStatus.RETRYING &&
              job.retryAfter &&
              Date.now() >= job.retryAfter)
        )
        .sort((a, b) => b.priority - a.priority)
        .slice(0, this.config.batchSize);

      if (pendingJobs.length === 0) {
        return;
      }

      console.log(`[EmbeddingQueue] Processing ${pendingJobs.length} embedding jobs`);

      // Process jobs in parallel (with concurrency limit)
      const batch = pendingJobs.slice(0, this.config.batchSize);
      await Promise.allSettled(batch.map((job) => this.processJob(job)));
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: EmbeddingJob): Promise<void> {
    try {
      // Update status to processing
      job.status = EmbeddingJobStatus.PROCESSING;
      job.attempts++;
      job.updatedAt = Date.now();
      await this.saveJobToCache(job);

      // Update status tracking
      const { saveEmbeddingStatus } = await import("../db/embedding-status");
      await saveEmbeddingStatus(job.businessId, {
        version: job.version,
        status: "processing",
        attempts: job.attempts,
      });

      // Get business data
      const business = await getBusinessById(job.businessId);
      if (!business) {
        throw new Error(`Business not found: ${job.businessId}`);
      }

      // Generate embedding
      await generateBusinessEmbedding(business as Business);

      // Update status tracking
      await saveEmbeddingStatus(job.businessId, {
        version: job.version,
        status: "completed",
        hasEmbedding: true,
      });

      // Update status to completed
      job.status = EmbeddingJobStatus.COMPLETED;
      job.updatedAt = Date.now();
      delete job.error;
      await this.saveJobToCache(job);

      console.log(`[EmbeddingQueue] Completed embedding for ${job.businessId}`);
    } catch (error: any) {
      console.error(`[EmbeddingQueue] Failed to process job for ${job.businessId}:`, error);

      // Update status tracking
      const { saveEmbeddingStatus } = await import("../db/embedding-status");

      // Check if should retry
      if (job.attempts < job.maxAttempts) {
        job.status = EmbeddingJobStatus.RETRYING;
        job.retryAfter = Date.now() + this.config.retryDelay * job.attempts; // Exponential backoff
        job.error = error.message || String(error);
        job.updatedAt = Date.now();
        await this.saveJobToCache(job);

        await saveEmbeddingStatus(job.businessId, {
          version: job.version,
          status: "pending", // Will retry
          error: job.error,
          attempts: job.attempts,
        });

        console.log(
          `[EmbeddingQueue] Will retry job for ${job.businessId} after ${job.retryAfter} (attempt ${job.attempts}/${job.maxAttempts})`
        );
      } else {
        // Max retries reached
        job.status = EmbeddingJobStatus.FAILED;
        job.error = error.message || String(error);
        job.updatedAt = Date.now();
        await this.saveJobToCache(job);

        await saveEmbeddingStatus(job.businessId, {
          version: job.version,
          status: "failed",
          error: job.error,
          attempts: job.attempts,
        });

        console.error(`[EmbeddingQueue] Job failed after ${job.attempts} attempts: ${job.businessId}`);
      }
    }
  }

  /**
   * Save job to cache for persistence
   */
  private async saveJobToCache(job: EmbeddingJob): Promise<void> {
    try {
      const cacheKey = `embedding_job:${job.businessId}`;
      await set(cacheKey, job, 24 * 60 * 60 * 1000); // 24 hours TTL
    } catch (error) {
      // Cache errors shouldn't break queue
      console.warn(`[EmbeddingQueue] Failed to save job to cache: ${error}`);
    }
  }

  /**
   * Get job status
   */
  getJobStatus(businessId: string): EmbeddingJob | null {
    return this.queue.get(businessId) || null;
  }

  /**
   * Get all jobs
   */
  getAllJobs(): EmbeddingJob[] {
    return Array.from(this.queue.values());
  }

  /**
   * Get jobs by status
   */
  getJobsByStatus(status: EmbeddingJobStatus): EmbeddingJob[] {
    return Array.from(this.queue.values()).filter((job) => job.status === status);
  }

  /**
   * Start background processing
   */
  start(): void {
    if (this.processingIntervalId) {
      return; // Already started
    }

    console.log("[EmbeddingQueue] Starting background processing");
    this.processingIntervalId = setInterval(() => {
      this.processQueue().catch((error) => {
        console.error("[EmbeddingQueue] Error processing queue:", error);
      });
    }, this.config.processingInterval);

    // Process immediately
    this.processQueue().catch((error) => {
      console.error("[EmbeddingQueue] Error in initial queue processing:", error);
    });
  }

  /**
   * Stop background processing
   */
  stop(): void {
    if (this.processingIntervalId) {
      clearInterval(this.processingIntervalId);
      this.processingIntervalId = null;
      console.log("[EmbeddingQueue] Stopped background processing");
    }
  }

  /**
   * Clear completed jobs
   */
  clearCompleted(): void {
    const completed = Array.from(this.queue.entries()).filter(
      ([_, job]) => job.status === EmbeddingJobStatus.COMPLETED
    );
    completed.forEach(([businessId]) => {
      this.queue.delete(businessId);
    });
    console.log(`[EmbeddingQueue] Cleared ${completed.length} completed jobs`);
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    retrying: number;
  } {
    const jobs = Array.from(this.queue.values());
    return {
      total: jobs.length,
      pending: jobs.filter((j) => j.status === EmbeddingJobStatus.PENDING).length,
      processing: jobs.filter((j) => j.status === EmbeddingJobStatus.PROCESSING).length,
      completed: jobs.filter((j) => j.status === EmbeddingJobStatus.COMPLETED).length,
      failed: jobs.filter((j) => j.status === EmbeddingJobStatus.FAILED).length,
      retrying: jobs.filter((j) => j.status === EmbeddingJobStatus.RETRYING).length,
    };
  }
}

// Singleton instance
let queueInstance: EmbeddingQueue | null = null;

/**
 * Get embedding queue instance
 */
export function getEmbeddingQueue(config?: Partial<QueueConfig>): EmbeddingQueue {
  if (!queueInstance) {
    queueInstance = new EmbeddingQueue(config);
    // Auto-start processing
    queueInstance.start();
  }
  return queueInstance;
}

/**
 * Queue embedding generation for a business
 */
export async function queueEmbeddingGeneration(
  businessId: string,
  options?: {
    version?: string;
    priority?: number;
    force?: boolean;
  }
): Promise<void> {
  const queue = getEmbeddingQueue();
  await queue.enqueue(businessId, options);
}

