/**
 * AWS Bedrock embeddings utilities
 * Handles text embedding generation using Bedrock models
 */

import { bedrockClient, EMBEDDING_MODEL_ID } from "./bedrock-client";
import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { Business } from "../schemas/business-schema";
import { withRateLimit } from "./rate-limiter";
import { withFallback, getFallbackEmbedding } from "./fallback-handler";
import { getBedrockCostMonitor, optimizedBatchProcessing } from "../search/performance-optimizer";

// Import CommonJS modules
const { getCachedEmbedding, saveCachedEmbedding } = require("../db/query-embedding-cache");
const { saveEmbedding, getEmbedding } = require("../db/embeddings");
const { getBusinessById } = require("../db/businesses");

export interface EmbeddingOptions {
  modelId?: string;
  inputText: string;
  inputType?: "search_query" | "search_document";
}

export interface EmbeddingResult {
  embedding: number[];
  modelId: string;
  inputText: string;
  dimensions: number;
}

/**
 * Generate embedding for text using Bedrock
 * Uses ONLY the model specified in AWS_BEDROCK_EMBEDDING_MODEL_ID
 * No fallbacks - we use only the configured model
 */
export async function generateEmbedding(
  options: EmbeddingOptions
): Promise<EmbeddingResult> {
  const modelId = options.modelId || EMBEDDING_MODEL_ID;
  const { inputText, inputType = "search_document" } = options;

  if (!inputText || typeof inputText !== "string" || inputText.trim().length === 0) {
    throw new Error("Input text is required for embedding generation");
  }

  // Use only the specified model from environment
  return await generateEmbeddingWithModel(modelId, inputText, inputType);
}

/**
 * Generate embedding with a specific model (internal function)
 */
async function generateEmbeddingWithModel(
  modelId: string,
  inputText: string,
  inputType: "search_query" | "search_document"
): Promise<EmbeddingResult> {
  try {
    // Determine request format based on model type
    let requestBody: any;
    if (modelId.includes("titan")) {
      // Amazon Titan embedding model format
      requestBody = {
        inputText: inputText,
      };
    } else if (modelId.includes("cohere")) {
      // Cohere embedding model format
      // Cohere v4 uses different format than v3
      if (modelId.includes("embed-v4")) {
        requestBody = {
          texts: [inputText],
          input_type: inputType,
          embedding_types: ["float"],
        };
      } else {
        // Cohere v3 format
        requestBody = {
          texts: [inputText],
          input_type: inputType,
          truncate: "END",
        };
      }
    } else {
      // Default to Titan format (most common)
      requestBody = {
        inputText: inputText,
      };
    }

    const command = new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(requestBody),
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Track cost (approximate token count based on input text length)
    try {
      const costMonitor = getBedrockCostMonitor();
      const approximateTokens = Math.ceil(inputText.length / 4); // Rough estimate: 4 chars per token
      costMonitor.recordAPICall(modelId, { input: approximateTokens });
    } catch (costError) {
      // Don't fail if cost tracking fails
      console.warn(`[Embeddings] Failed to track cost: ${costError}`);
    }

    // Extract embedding based on model type
    let embedding: number[] = [];
    if (modelId.includes("titan")) {
      // Titan returns embedding directly
      if (responseBody.embedding && Array.isArray(responseBody.embedding)) {
        embedding = responseBody.embedding;
      } else if (responseBody.embeddings && Array.isArray(responseBody.embeddings)) {
        embedding = responseBody.embeddings;
      } else {
        throw new Error("Unexpected Titan embedding response format");
      }
    } else if (modelId.includes("cohere")) {
      // Cohere returns embeddings in a specific format
      // Cohere v4 format
      if (responseBody.embeddings && Array.isArray(responseBody.embeddings)) {
        // v4 returns array of embeddings directly
        if (Array.isArray(responseBody.embeddings[0])) {
          embedding = responseBody.embeddings[0];
        } else if (responseBody.embeddings[0]?.embedding) {
          embedding = responseBody.embeddings[0].embedding;
        } else {
          embedding = responseBody.embeddings[0];
        }
      } else if (responseBody.embeddings?.float && Array.isArray(responseBody.embeddings.float[0])) {
        embedding = responseBody.embeddings.float[0];
      } else if (responseBody.embedding && Array.isArray(responseBody.embedding)) {
        embedding = responseBody.embedding;
      } else {
        throw new Error("Unexpected Cohere embedding response format");
      }
    } else {
      // Try common formats
      if (responseBody.embeddings && Array.isArray(responseBody.embeddings[0])) {
        embedding = responseBody.embeddings[0];
      } else if (responseBody.embedding && Array.isArray(responseBody.embedding)) {
        embedding = responseBody.embedding;
      } else {
        throw new Error("Unexpected embedding response format");
      }
    }

    return {
      embedding,
      modelId,
      inputText,
      dimensions: embedding.length,
    };
  } catch (error: any) {
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Generate embeddings for multiple texts
 */
export async function generateEmbeddings(
  texts: string[],
  options?: { modelId?: string; inputType?: "search_query" | "search_document" }
): Promise<EmbeddingResult[]> {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  // Generate embeddings in parallel (with rate limiting handled by rate-limiter)
  const promises = texts.map((text) =>
    generateEmbedding({
      inputText: text,
      modelId: options?.modelId,
      inputType: options?.inputType,
    })
  );

  return Promise.all(promises);
}

/**
 * Generate embedding for business text content (legacy function)
 * @deprecated Use buildBusinessEmbeddingText(Business) instead
 */
export function buildBusinessEmbeddingTextLegacy(business: {
  name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  city?: string;
  state?: string;
}): string {
  const parts: string[] = [];

  // Name is most important
  if (business.name) {
    parts.push(business.name);
  }

  // Description
  if (business.description) {
    parts.push(business.description);
  }

  // Category and subcategory
  if (business.category) {
    parts.push(business.category);
  }
  if (business.subcategory) {
    parts.push(business.subcategory);
  }

  // Tags
  if (business.tags && business.tags.length > 0) {
    parts.push(...business.tags);
  }

  // Location context
  if (business.city) {
    parts.push(business.city);
  }
  if (business.state) {
    parts.push(business.state);
  }

  return parts.join(" ");
}

/**
 * Normalize query for caching
 * Converts to lowercase, trims, and normalizes whitespace
 */
function normalizeQuery(query: string): string {
  if (!query || typeof query !== "string") {
    return "";
  }
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Cache for expected dimensions to avoid repeated database checks
 */
let cachedExpectedDimensions: number | null = null;
let dimensionsCacheTimestamp: number = 0;
const DIMENSIONS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get expected embedding dimensions based on stored business embeddings
 * Checks database to determine what dimension embeddings are stored with
 * Falls back to checking environment/model configuration
 * Caches result for 5 minutes to avoid repeated database queries
 */
async function getExpectedEmbeddingDimensions(): Promise<number> {
  // Return cached value if still valid
  if (cachedExpectedDimensions !== null && Date.now() - dimensionsCacheTimestamp < DIMENSIONS_CACHE_TTL) {
    return cachedExpectedDimensions;
  }

  try {
    // Check dimensions from existing businesses only (ignore orphaned embeddings)
    const { getAllBusinessIds } = require("../db/businesses");
    const { getEmbedding } = require("../db/embeddings");
    const existingBusinessIds = await getAllBusinessIds();
    
    // Check a sample of existing businesses
    if (existingBusinessIds.length > 0) {
      const sampleBusinessId = existingBusinessIds[0];
      const sampleEmbedding = await getEmbedding(sampleBusinessId, CURRENT_EMBEDDING_VERSION);
      
      if (sampleEmbedding && sampleEmbedding.embedding && Array.isArray(sampleEmbedding.embedding)) {
        const actualDims = sampleEmbedding.embedding.length;
        console.log(`[Embeddings] Detected business embedding dimensions: ${actualDims} (from existing business)`);
        cachedExpectedDimensions = actualDims;
        dimensionsCacheTimestamp = Date.now();
        return actualDims;
      }
    }
  } catch (error) {
    // Ignore errors, fall back to model-based detection
  }
  
  // Fallback: Determine dimensions based on model ID
  const modelId = EMBEDDING_MODEL_ID.toLowerCase();
  if (modelId.includes("titan-embed-text-v1")) {
    // Titan Embed Text v1 produces 1536 dimensions
    cachedExpectedDimensions = 1536;
    dimensionsCacheTimestamp = Date.now();
    return 1536;
  } else if (modelId.includes("titan-embed-text-v2") || modelId.includes("titan-embed-g1-text-02")) {
    // Titan Embed Text v2 and G1 Text v2 produce 1024 dimensions
    cachedExpectedDimensions = 1024;
    dimensionsCacheTimestamp = Date.now();
    return 1024;
  } else if (modelId.includes("cohere")) {
    // Cohere models produce 1024 dimensions
    cachedExpectedDimensions = 1024;
    dimensionsCacheTimestamp = Date.now();
    return 1024;
  }
  
  // Default fallback
  cachedExpectedDimensions = 1024;
  dimensionsCacheTimestamp = Date.now();
  return 1024;
}

/**
 * Validate embedding dimensions are in sync
 * Checks if query embeddings and business embeddings have matching dimensions
 * @returns Object with validation status and details
 */
export async function validateEmbeddingDimensions(): Promise<{
  valid: boolean;
  queryDimensions: number | null;
  businessDimensions: number | null;
  modelId: string;
  issue?: string;
  recommendation?: string;
}> {
  try {
    // Get expected dimensions from business embeddings
    const businessDims = await getExpectedEmbeddingDimensions();
    
    // Generate a test query embedding to check what the model produces
    const testEmbedding = await generateEmbedding({
      inputText: "test",
      inputType: "search_query"
    });
    
    const queryDims = testEmbedding.dimensions;
    const modelId = testEmbedding.modelId || EMBEDDING_MODEL_ID;
    
    const valid = queryDims === businessDims;
    
    if (!valid) {
      return {
        valid: false,
        queryDimensions: queryDims,
        businessDimensions: businessDims,
        modelId,
        issue: `Dimension mismatch: Query embeddings are ${queryDims}D but business embeddings are ${businessDims}D`,
        recommendation: `Either (1) Regenerate business embeddings with model ${modelId}, or (2) Change embedding model to match business embeddings (${businessDims}D)`
      };
    }
    
    return {
      valid: true,
      queryDimensions: queryDims,
      businessDimensions: businessDims,
      modelId
    };
  } catch (error: any) {
    return {
      valid: false,
      queryDimensions: null,
      businessDimensions: null,
      modelId: EMBEDDING_MODEL_ID,
      issue: `Failed to validate dimensions: ${error.message}`,
      recommendation: "Check Bedrock access and database connectivity"
    };
  }
}

/**
 * Generate query embedding with caching
 * Checks cache first, then calls Bedrock if not cached
 * Automatically detects and matches business embedding dimensions
 * Stores result in cache for 30 days
 * 
 * @param query - User search query
 * @returns Embedding vector with dimensions matching business embeddings
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  // Basic validation
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    throw new Error("Query is required for embedding generation");
  }

  // Normalize query for cache key
  const normalizedQuery = normalizeQuery(query);

  // Get expected dimensions from business embeddings
  const expectedDims = await getExpectedEmbeddingDimensions();

  // Check cache first
  try {
    const cached = await getCachedEmbedding(normalizedQuery);
    if (cached && cached.embedding && Array.isArray(cached.embedding)) {
      // Verify dimensions match expected
      if (cached.embedding.length === expectedDims) {
        return cached.embedding;
      } else {
        console.warn(`[Embeddings] Cached embedding has wrong dimensions: ${cached.embedding.length}, expected ${expectedDims}. Regenerating...`);
        // Continue to generate new embedding
      }
    }
  } catch (error: any) {
    console.warn(`[Embeddings] Cache check failed: ${error.message}, continuing to generate`);
  }

  // Not cached, generate new embedding
  try {
    const result = await withRateLimit(async () => {
      return await generateEmbedding({
        inputText: query, // Use original query, not normalized
        inputType: "search_query",
      });
    });

    // Verify dimensions match business embeddings
    if (result.embedding.length !== expectedDims) {
      const errorMsg = `CRITICAL: Embedding dimension mismatch! Generated: ${result.embedding.length}, Expected (from business embeddings): ${expectedDims}. ` +
        `This will cause incorrect similarity scores and poor search results. ` +
        `Please run: npm run validate-embeddings to check the issue, then either: ` +
        `(1) Regenerate business embeddings with model ${result.modelId}, or ` +
        `(2) Change AWS_BEDROCK_EMBEDDING_MODEL_ID to a model that produces ${expectedDims} dimensions.`;
      console.error(`[Embeddings] ${errorMsg}`);
      
      // DO NOT truncate or pad - this causes incorrect similarity
      // Instead, throw an error to prevent silently incorrect results
      // Users should fix the configuration rather than getting bad results
      throw new Error(errorMsg);
    }

  // Store in cache (async, don't wait)
  saveCachedEmbedding(normalizedQuery, result.embedding, result.modelId).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Embeddings] Failed to cache embedding: ${message}`);
  });

    return result.embedding;
  } catch (error: any) {
    // Re-throw dimension mismatch errors
    if (error.message && error.message.includes("dimension mismatch")) {
      throw error;
    }
    // Fallback to zero vector on other errors
    console.error(`[Embeddings] Failed to generate query embedding: ${error.message}`);
    return getFallbackEmbedding(expectedDims);
  }
}

/**
 * Build business text content for embedding
 * Combines: name + description + category + subcategory + tags
 * Format: "Business Name. Description. Category: X. Tags: Y, Z."
 * Limits total length to 1000 characters
 * 
 * @param business - Business object
 * @returns Formatted text content for embedding
 */
export function buildBusinessEmbeddingText(business: Business): string {
  const parts: string[] = [];

  // Name (most important) - always include
  if (business.name) {
    parts.push(business.name);
  }

  // Description
  if (business.description && business.description.trim().length > 0) {
    parts.push(business.description.trim());
  }

  // Category
  if (business.category) {
    parts.push(`Category: ${business.category}`);
  }

  // Subcategory
  if (business.subcategory) {
    parts.push(`Subcategory: ${business.subcategory}`);
  }

  // Tags
  if (business.tags && business.tags.length > 0) {
    const validTags = business.tags.filter((tag) => tag && tag.trim().length > 0);
    if (validTags.length > 0) {
      parts.push(`Tags: ${validTags.join(", ")}`);
    }
  }

  // Combine with periods
  let text = parts.join(". ");

  // Ensure we have at least the name
  if (text.trim().length === 0 && business.name) {
    text = business.name;
  }

  // Limit to 1000 characters
  if (text.length > 1000) {
    text = text.substring(0, 997) + "...";
  }

  return text;
}

/**
 * Generate business embedding
 * Creates text content from business data, generates embedding, and stores in database
 * 
 * @param business - Business object
 * @returns 1024-dimensional embedding vector
 */
export async function generateBusinessEmbedding(business: Business): Promise<number[]> {
  // Basic validation
  if (!business || !business.businessId) {
    throw new Error("Business object with businessId is required");
  }

  if (!business.name) {
    throw new Error("Business name is required");
  }

  // Build text content
  const textContent = buildBusinessEmbeddingText(business);

  if (!textContent || textContent.trim().length === 0) {
    throw new Error("Business text content is empty");
  }

  // Generate embedding
  try {
    const result = await withRateLimit(async () => {
      return await generateEmbedding({
        inputText: textContent,
        inputType: "search_document",
      });
    });

    // Verify dimensions match what the model produces
    // amazon.titan-embed-text-v1 produces 1536 dimensions
    // Other models may produce different dimensions
    // We do NOT normalize/truncate - dimensions must match business embeddings
    // This is validated in generateQueryEmbedding

    // Store in database (async, don't wait)
    // Use model ID as version identifier - matches CURRENT_EMBEDDING_VERSION
  const embeddingVersion = getCurrentEmbeddingVersion();
  saveEmbedding(business.businessId, result.embedding, embeddingVersion, textContent).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Embeddings] Failed to save business embedding: ${message}`);
  });

    // Update business with embedding version
    // Note: This would typically be done in the business update API
    // business.embeddingVersion = embeddingVersion;

    return result.embedding;
  } catch (error: any) {
    // Fallback to zero vector on error (1024 dimensions for Titan/Cohere compatibility)
    console.error(`[Embeddings] Failed to generate business embedding: ${error.message}`);
    return getFallbackEmbedding(1024);
  }
}

/**
 * Result for batch embedding generation
 */
export interface BatchEmbeddingResult {
  businessId: string;
  success: boolean;
  embedding?: number[];
  error?: string;
}

/**
 * Generate embeddings for multiple businesses in batches
 * Processes businesses in batches of 10, handles rate limiting, and retries failed embeddings
 * 
 * @param businessIds - Array of business IDs to generate embeddings for
 * @param options - Options for batch processing
 * @returns Array of results with success/failure for each business
 */
export async function generateEmbeddingsForBusinesses(
  businessIds: string[],
  options: {
    batchSize?: number;
    maxRetries?: number;
    retryDelay?: number;
    targetVersion?: string;
  } = {}
): Promise<BatchEmbeddingResult[]> {
  const {
    batchSize = 10,
    maxRetries = 3,
    retryDelay = 1000,
    targetVersion = getCurrentEmbeddingVersion(),
  } = options;

  if (!Array.isArray(businessIds) || businessIds.length === 0) {
    return [];
  }

  // Use optimized batch processing
  const processedResults = await optimizedBatchProcessing(
    businessIds,
    async (businessId: string) => {
      let lastError: Error | null = null;

      // Retry logic
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Get business data
          const business = await getBusinessById(businessId);
          if (!business) {
            throw new Error(`Business not found: ${businessId}`);
          }

          // Generate embedding
          const embedding = await generateBusinessEmbedding(business as Business);

          return {
            businessId,
            success: true,
            embedding,
          } as BatchEmbeddingResult;
        } catch (error: any) {
          lastError = error;
          if (attempt < maxRetries) {
            console.warn(`[Embeddings] Attempt ${attempt}/${maxRetries} failed for business ${businessId}, retrying in ${retryDelay * attempt}ms...`);
            await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt)); // Exponential backoff
          }
        }
      }

      // All retries failed
      throw lastError || new Error("Unknown error");
    },
    {
      batchSize,
      concurrency: 3, // Process 3 at a time within each batch
      delayBetweenBatches: retryDelay,
    }
  );

  // Convert to BatchEmbeddingResult format
  const results: BatchEmbeddingResult[] = processedResults.map((item) => {
    if (item.error) {
      return {
        businessId: item.item as string,
        success: false,
        error: item.error,
      };
    } else {
      return item.result as BatchEmbeddingResult;
    }
  });

  // Final summary
  const totalSuccess = results.filter((r) => r.success).length;
  const totalFailed = results.filter((r) => !r.success).length;
  const failedBusinessIds = results.filter((r) => !r.success).map((r) => r.businessId);

  console.log(`[Embeddings] Batch processing complete: ${totalSuccess} succeeded, ${totalFailed} failed out of ${businessIds.length} total`);

  if (totalFailed > 0) {
    console.warn(`[Embeddings] Failed business IDs: ${failedBusinessIds.join(", ")}`);
  }

  return results;
}

/**
 * Current embedding version
 * Derived from the embedding model ID in environment
 * Uses the model ID normalized to a version identifier format
 */
export function getCurrentEmbeddingVersion(): string {
  // Convert model ID to version identifier format
  // e.g., "amazon.titan-embed-text-v1" -> "amazon-titan-embed-text-v1"
  return EMBEDDING_MODEL_ID.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
}

// For backward compatibility, export a constant
export const CURRENT_EMBEDDING_VERSION = getCurrentEmbeddingVersion();

/**
 * Check if a business has an embedding with the specified version
 * 
 * @param businessId - Business ID to check
 * @param version - Version to check (defaults to current version)
 * @returns True if embedding exists with the specified version
 */
export async function hasEmbedding(businessId: string, version: string = CURRENT_EMBEDDING_VERSION): Promise<boolean> {
  try {
    const embedding = await getEmbedding(businessId, version);
    return embedding !== null && embedding !== undefined;
  } catch (error) {
    return false;
  }
}

/**
 * Check embedding version for a business
 * 
 * @param businessId - Business ID to check
 * @returns Version string if embedding exists, null otherwise
 */
export async function getEmbeddingVersion(businessId: string): Promise<string | null> {
  try {
    // Try current version first
    const currentEmbedding = await getEmbedding(businessId, CURRENT_EMBEDDING_VERSION);
    if (currentEmbedding) {
      return currentEmbedding.embeddingVersion || CURRENT_EMBEDDING_VERSION;
    }

    // If not found, return null (no embedding exists)
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Check if embedding version matches target version
 * 
 * @param businessId - Business ID to check
 * @param targetVersion - Target version to match (defaults to current version)
 * @returns True if version matches or embedding doesn't exist, false if version mismatch
 */
export async function isEmbeddingVersionCurrent(
  businessId: string,
  targetVersion: string = CURRENT_EMBEDDING_VERSION
): Promise<boolean> {
  const version = await getEmbeddingVersion(businessId);
  if (version === null) {
    // No embedding exists, consider it "current" (needs generation)
    return true;
  }
  return version === targetVersion;
}

/**
 * Get all business IDs that need embedding regeneration
 * 
 * @param businessIds - Array of business IDs to check
 * @param targetVersion - Target version (defaults to current version)
 * @returns Array of business IDs that need regeneration
 */
export async function getBusinessesNeedingEmbedding(
  businessIds: string[],
  targetVersion: string = CURRENT_EMBEDDING_VERSION
): Promise<string[]> {
  const needsEmbedding: string[] = [];

  // Check in batches to avoid overwhelming the database
  const batchSize = 50;
  for (let i = 0; i < businessIds.length; i += batchSize) {
    const batch = businessIds.slice(i, i + batchSize);
    const checks = await Promise.all(
      batch.map(async (businessId) => {
        const isCurrent = await isEmbeddingVersionCurrent(businessId, targetVersion);
        return { businessId, isCurrent };
      })
    );

    checks.forEach(({ businessId, isCurrent }) => {
      if (!isCurrent) {
        needsEmbedding.push(businessId);
      }
    });
  }

  return needsEmbedding;
}

/**
 * Migration result for version updates
 */
export interface VersionMigrationResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  failedBusinessIds: string[];
}

/**
 * Migrate embeddings to a new version
 * Regenerates embeddings for all businesses that don't have the target version
 * 
 * @param targetVersion - Target version to migrate to (defaults to current version)
 * @param options - Options for migration
 * @returns Migration result with success/failure counts
 */
export async function migrateEmbeddingsToVersion(
  targetVersion: string = CURRENT_EMBEDDING_VERSION,
  options: {
    batchSize?: number;
    maxRetries?: number;
    retryDelay?: number;
  } = {}
): Promise<VersionMigrationResult> {
  const {
    batchSize = 10,
    maxRetries = 3,
    retryDelay = 1000,
  } = options;

  console.log(`[Embedding Migration] Starting migration to version: ${targetVersion}`);

  // Get all business IDs
  const { getAllBusinessIds } = require("../db/businesses");
  const allBusinessIds = await getAllBusinessIds();
  console.log(`[Embedding Migration] Found ${allBusinessIds.length} businesses`);

  // Get businesses needing migration
  const businessesNeedingMigration = await getBusinessesNeedingEmbedding(
    allBusinessIds,
    targetVersion
  );
  console.log(`[Embedding Migration] ${businessesNeedingMigration.length} businesses need migration`);

  if (businessesNeedingMigration.length === 0) {
    return {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      failedBusinessIds: [],
    };
  }

  // Generate embeddings for businesses needing migration
  const results = await generateEmbeddingsForBusinesses(businessesNeedingMigration, {
    batchSize,
    maxRetries,
    retryDelay,
    targetVersion,
  });

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const failedBusinessIds = failed.map((r) => r.businessId);

  console.log(`[Embedding Migration] Migration complete: ${successful.length} succeeded, ${failed.length} failed`);

  return {
    totalProcessed: results.length,
    successful: successful.length,
    failed: failed.length,
    failedBusinessIds,
  };
}

