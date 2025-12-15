/**
 * AWS Bedrock client configuration
 * Creates and exports BedrockRuntimeClient instance
 */

import { BedrockRuntimeClient, BedrockRuntimeClientConfig } from "@aws-sdk/client-bedrock-runtime";

/**
 * Get Bedrock client configuration
 * Uses region from environment or defaults to ap-southeast-1
 * Uses default credential provider chain
 */
function getBedrockClientConfig(): BedrockRuntimeClientConfig {
  // IMPORTANT: Use ONLY AWS_BEDROCK_REGION for Bedrock (not AWS_REGION)
  // This ensures Bedrock uses us-east-1 while DynamoDB can use ap-southeast-1
  // Default to us-east-1 for Bedrock models (Mistral, Titan models are available there)
  const region = process.env.AWS_BEDROCK_REGION || "us-east-1";

  const config: BedrockRuntimeClientConfig = {
    region,
    // Use default credential provider chain
    // This will check:
    // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
    // 2. Shared credentials file (~/.aws/credentials)
    // 3. IAM role (if running on EC2/ECS/Lambda)
    // Only set explicit credentials if both are provided
    ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        }
      : {}),
  };

  return config;
}

/**
 * Initialize Bedrock client
 * Creates BedrockRuntimeClient with proper configuration and error handling
 */
let bedrockClientInstance: BedrockRuntimeClient | null = null;
let lastRegion: string | null = null;

export function getBedrockClient(): BedrockRuntimeClient {
  try {
    // IMPORTANT: Use ONLY AWS_BEDROCK_REGION for Bedrock (not AWS_REGION)
    // This ensures Bedrock uses us-east-1 while DynamoDB can use ap-southeast-1
    // Default to us-east-1 for Bedrock models
    const currentRegion = process.env.AWS_BEDROCK_REGION || "us-east-1";
    
    // Recreate client if region changed
    if (!bedrockClientInstance || lastRegion !== currentRegion) {
      const config = getBedrockClientConfig();
      bedrockClientInstance = new BedrockRuntimeClient(config);
      lastRegion = currentRegion;
    }
    
    return bedrockClientInstance;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to initialize Bedrock client: ${errorMessage}`);
  }
}

/**
 * Reset the Bedrock client cache
 * Useful for testing when region or credentials change
 */
export function resetBedrockClient(): void {
  bedrockClientInstance = null;
  lastRegion = null;
}

// Export client instance (for backward compatibility)
// Note: This is created lazily, so it will use the current region from env
export const bedrockClient = getBedrockClient();

// Model IDs from environment variables
// Default embedding model: Amazon Titan Embed Text v1 (no marketplace agreement required)
// Falls back to other Titan models, then Cohere if needed
// Note: Titan models don't require marketplace agreements or special payment setup
// Available models without marketplace subscription:
// - amazon.titan-embed-text-v1 (1536 dimensions, no marketplace required) - Most reliable
// - amazon.titan-embed-text-v2:0 (1024 dimensions, no marketplace required)
// - amazon.titan-embed-g1-text-02 (1024 dimensions, no marketplace required)
// Cohere models may require marketplace subscription:
// - cohere.embed-multilingual-v3 (1024 dimensions, may require marketplace)
// - cohere.embed-english-v3 (1024 dimensions, may require marketplace)
export const EMBEDDING_MODEL_ID = process.env.AWS_BEDROCK_EMBEDDING_MODEL_ID || "amazon.titan-embed-text-v1";

// NLP Model Configuration with Primary/Fallback Support
// Primary: Mistral Mixtral 8x7B Instruct (100% success rate, best overall)
// Fallback: Mistral Large 24.02 (100% success rate, excellent performance)
// Both models don't require marketplace agreements - standard AWS payment configuration is sufficient

/**
 * Get the inference profile ARN from environment variables
 * Reads from process.env dynamically to support dotenv loading
 */
export function getNLPInferenceProfileARN(): string | undefined {
  return process.env.AWS_BEDROCK_INFERENCE_PROFILE_ARN || undefined;
}

/**
 * Get the primary NLP model ID from environment variables
 * Defaults to Mistral Mixtral 8x7B Instruct (best overall performance)
 * Reads from process.env dynamically to support dotenv loading
 */
export function getNLPModelID(): string {
  return process.env.AWS_BEDROCK_NLP_MODEL_ID || "mistral.mixtral-8x7b-instruct-v0:1";
}

/**
 * Get the fallback NLP model ID from environment variables
 * Defaults to Mistral Large 24.02 (excellent backup option)
 * Reads from process.env dynamically to support dotenv loading
 */
export function getNLPFallbackModelID(): string {
  return process.env.AWS_BEDROCK_NLP_FALLBACK_MODEL_ID || "mistral.mistral-large-2402-v1:0";
}

/**
 * Get the model identifier to use for NLP inference
 * Returns inference profile ARN if available, otherwise returns primary model ID
 * Reads from process.env dynamically to ensure latest values
 */
export function getNLPModelIdentifier(): string {
  const profileARN = getNLPInferenceProfileARN();
  if (profileARN) {
    return profileARN;
  }
  return getNLPModelID();
}

// For backwards compatibility - exports that read dynamically
export const NLP_MODEL_ID = getNLPModelID();

