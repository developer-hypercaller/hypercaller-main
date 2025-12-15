#!/usr/bin/env tsx

/**
 * Business Embedding Generation Script
 * 
 * Fetches all businesses without embeddings and generates embeddings in batches
 * Updates BusinessEmbeddings table with generated embeddings
 * 
 * Usage:
 *   npm run generate:embeddings
 *   tsx scripts/generate-business-embeddings.js
 *   tsx scripts/generate-business-embeddings.js --version titan-v1
 *   tsx scripts/generate-business-embeddings.js --batch-size 5
 *   tsx scripts/generate-business-embeddings.js --max-retries 5
 */

require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

// Note: This script requires tsx or ts-node to run TypeScript modules
// Run with: tsx scripts/generate-business-embeddings.js
// Or: node --loader ts-node/esm scripts/generate-business-embeddings.js

let generateEmbeddingsForBusinesses, getBusinessesNeedingEmbedding, CURRENT_EMBEDDING_VERSION;

try {
  const embeddingsModule = require("../lib/bedrock/embeddings");
  generateEmbeddingsForBusinesses = embeddingsModule.generateEmbeddingsForBusinesses;
  getBusinessesNeedingEmbedding = embeddingsModule.getBusinessesNeedingEmbedding;
  CURRENT_EMBEDDING_VERSION = embeddingsModule.CURRENT_EMBEDDING_VERSION || "titan-v1";
} catch (error) {
  console.error("Error loading embeddings module. Make sure to run with tsx:");
  console.error("  tsx scripts/generate-business-embeddings.js");
  process.exit(1);
}

const { getAllBusinessIds } = require("../lib/db/businesses");
const { getBusinessesWithoutEmbeddings, hasEmbedding } = require("../lib/db/embeddings");

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    version: CURRENT_EMBEDDING_VERSION,
    batchSize: 10,
    maxRetries: 3,
    retryDelay: 1000,
    regenerate: false, // If true, regenerate even if embedding exists
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--version" && args[i + 1]) {
      options.version = args[i + 1];
      i++;
    } else if (arg === "--batch-size" && args[i + 1]) {
      options.batchSize = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === "--max-retries" && args[i + 1]) {
      options.maxRetries = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === "--retry-delay" && args[i + 1]) {
      options.retryDelay = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === "--regenerate") {
      options.regenerate = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Business Embedding Generation Script

Usage:
  node scripts/generate-business-embeddings.js [options]

Options:
  --version <version>      Target embedding version (default: ${CURRENT_EMBEDDING_VERSION})
  --batch-size <size>      Number of businesses to process per batch (default: 10)
  --max-retries <count>    Maximum retry attempts for failed embeddings (default: 3)
  --retry-delay <ms>        Delay between retries in milliseconds (default: 1000)
  --regenerate             Regenerate embeddings even if they already exist
  --help, -h               Show this help message

Examples:
  node scripts/generate-business-embeddings.js
  node scripts/generate-business-embeddings.js --version titan-v1
  node scripts/generate-business-embeddings.js --batch-size 5 --max-retries 5
      `);
      process.exit(0);
    }
  }

  return options;
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();

  console.log("=".repeat(80));
  console.log("Business Embedding Generation Script");
  console.log("=".repeat(80));
  console.log(`Target Version: ${options.version}`);
  console.log(`Batch Size: ${options.batchSize}`);
  console.log(`Max Retries: ${options.maxRetries}`);
  console.log(`Retry Delay: ${options.retryDelay}ms`);
  console.log(`Regenerate: ${options.regenerate ? "Yes" : "No"}`);
  console.log("=".repeat(80));
  console.log();

  try {
    // Step 1: Get all business IDs
    console.log("Step 1: Fetching all business IDs...");
    const startTime = Date.now();
    const allBusinessIds = await getAllBusinessIds();
    const fetchTime = Date.now() - startTime;
    console.log(`✓ Found ${allBusinessIds.length} businesses (took ${fetchTime}ms)`);
    console.log();

    if (allBusinessIds.length === 0) {
      console.log("No businesses found. Exiting.");
      return;
    }

    // Step 2: Filter businesses without embeddings
    let businessesToProcess = [];
    if (options.regenerate) {
      console.log("Step 2: Regenerating all embeddings (--regenerate flag set)...");
      businessesToProcess = allBusinessIds;
    } else {
      console.log("Step 2: Finding businesses without embeddings...");
      const checkStartTime = Date.now();
      
      // Use the version-aware check from embeddings module
      businessesToProcess = await getBusinessesNeedingEmbedding(
        allBusinessIds,
        options.version
      );
      
      const checkTime = Date.now() - checkStartTime;
      console.log(`✓ Found ${businessesToProcess.length} businesses needing embeddings (took ${checkTime}ms)`);
      
      // Also check using database module for businesses with no embeddings at all
      const withoutAnyEmbeddings = await getBusinessesWithoutEmbeddings(
        allBusinessIds,
        options.version
      );
      
      // Combine both lists (remove duplicates)
      const combined = new Set([...businessesToProcess, ...withoutAnyEmbeddings]);
      businessesToProcess = Array.from(combined);
      console.log(`✓ Total businesses to process: ${businessesToProcess.length}`);
    }
    console.log();

    if (businessesToProcess.length === 0) {
      console.log("✓ All businesses already have embeddings. Nothing to do.");
      return;
    }

    // Step 3: Generate embeddings in batches
    console.log("Step 3: Generating embeddings in batches...");
    console.log(`Processing ${businessesToProcess.length} businesses in batches of ${options.batchSize}`);
    console.log();

    const generationStartTime = Date.now();
    const results = await generateEmbeddingsForBusinesses(businessesToProcess, {
      batchSize: options.batchSize,
      maxRetries: options.maxRetries,
      retryDelay: options.retryDelay,
      targetVersion: options.version,
    });
    const generationTime = Date.now() - generationStartTime;

    // Step 4: Summary
    console.log();
    console.log("=".repeat(80));
    console.log("Generation Summary");
    console.log("=".repeat(80));
    
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);
    
    console.log(`Total Processed: ${results.length}`);
    console.log(`✓ Successful: ${successful.length}`);
    console.log(`✗ Failed: ${failed.length}`);
    console.log(`Time Taken: ${(generationTime / 1000).toFixed(2)}s`);
    console.log(`Average Time per Business: ${(generationTime / results.length).toFixed(2)}ms`);
    console.log();

    if (failed.length > 0) {
      console.log("Failed Business IDs:");
      failed.forEach((result) => {
        console.log(`  - ${result.businessId}: ${result.error}`);
      });
      console.log();
    }

    // Step 5: Final verification
    console.log("Step 4: Verifying embeddings...");
    const verifyStartTime = Date.now();
    
    let verifiedCount = 0;
    for (const businessId of businessesToProcess) {
      const has = await hasEmbedding(businessId, options.version);
      if (has) {
        verifiedCount++;
      }
    }
    const verifyTime = Date.now() - verifyStartTime;
    
    console.log(`✓ Verified: ${verifiedCount}/${businessesToProcess.length} businesses have embeddings`);
    console.log(`Verification took ${verifyTime}ms`);
    console.log();

    console.log("=".repeat(80));
    console.log("✓ Script completed successfully!");
    console.log("=".repeat(80));
  } catch (error) {
    console.error();
    console.error("=".repeat(80));
    console.error("✗ Script failed with error:");
    console.error("=".repeat(80));
    console.error(error.message);
    console.error();
    if (error.stack) {
      console.error("Stack trace:");
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}

module.exports = { main };

