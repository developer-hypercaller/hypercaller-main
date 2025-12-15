# Troubleshooting Guide

This guide covers common issues encountered during Phase 1 setup and their solutions.

## Table of Contents

1. [DynamoDB Issues](#dynamodb-issues)
2. [Category Normalization Issues](#category-normalization-issues)
3. [Redis Connection Issues](#redis-connection-issues)
4. [Bedrock Access Issues](#bedrock-access-issues)
5. [Rate Limiting and API Call Issues](#rate-limiting-and-api-call-issues)
   - [Too Many API Calls to AWS Bedrock](#issue-too-many-api-calls-to-aws-bedrock)
   - [Too Many Geocoding API Calls](#issue-too-many-geocoding-api-calls)
6. [Caching Strategy to Reduce API Calls](#caching-strategy-to-reduce-api-calls)
7. [Bedrock API Failures and Fallback Handling](#bedrock-api-failures-and-fallback-handling)
8. [Normalization Consistency Issues](#normalization-consistency-issues)
9. [General Debugging Tips](#general-debugging-tips)

---

## DynamoDB Issues

### Issue: DynamoDB Table Creation Fails

**Symptoms:**
- Error: "Access Denied" or "Invalid credentials"
- Error: "Table already exists"
- Error: "Region not supported"
- Script hangs or times out

**Solutions:**

#### 1. Check AWS Credentials
```bash
# Verify AWS CLI is configured
aws configure list

# Test credentials
aws sts get-caller-identity

# If credentials are missing, configure them:
aws configure
# Enter: Access Key ID, Secret Access Key, Region (ap-southeast-1), Output format (json)
```

**Environment Variables:**
```bash
# Set in .env or environment
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=ap-southeast-1
```

#### 2. Verify Region
```bash
# Check current region
aws configure get region

# Verify region supports DynamoDB
# Singapore region: ap-southeast-1
# Make sure scripts use correct region
```

#### 3. Check IAM Permissions
Required IAM permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:CreateTable",
        "dynamodb:DescribeTable",
        "dynamodb:ListTables",
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "*"
    }
  ]
}
```

**Verify permissions:**
```bash
# Test table creation permission
aws dynamodb list-tables --region ap-southeast-1
```

#### 4. Check if Table Already Exists
```bash
# List existing tables
aws dynamodb list-tables --region ap-southeast-1

# If table exists, either:
# Option 1: Delete and recreate (WARNING: Deletes all data)
aws dynamodb delete-table --table-name Users --region ap-southeast-1

# Option 2: Use different table name
# Option 3: Skip creation if table exists (modify script)
```

#### 5. Verify Table Creation Script
```bash
# Check script syntax (bash)
bash -n scripts/create-dynamodb-tables.sh

# Check PowerShell script
# Open PowerShell and test syntax
```

**Common Script Issues:**
- Missing shebang (`#!/bin/bash`)
- Incorrect JSON escaping in GSI definitions
- Missing wait commands between table creations

#### 6. Network and Timeout Issues
```bash
# Increase timeout
export AWS_CLI_TIMEOUT=300

# Check network connectivity
ping dynamodb.ap-southeast-1.amazonaws.com

# Use AWS CLI with verbose logging
aws dynamodb create-table ... --debug
```

**Verification:**
```bash
# List tables to verify they exist
aws dynamodb list-tables --region ap-southeast-1

# Describe a table to check its structure
aws dynamodb describe-table --table-name Users --region ap-southeast-1
```

---

## Category Normalization Issues

### Issue: Category Normalization Not Working

**Symptoms:**
- Categories not matching expected values
- Synonyms not recognized
- Indian terms not mapping
- Returns `null` for valid categories

**Solutions:**

#### 1. Verify Category Taxonomy is Complete
```bash
# Run unit tests for categories
npm run test:unit

# Or manually check the taxonomy file
# File: lib/data/categories.ts
```

**Check taxonomy file:**
- File: `lib/data/categories.ts`
- Verify all categories have:
  - `id` (unique)
  - `name` (display name)
  - `synonyms` (array of synonyms)
  - `indianTerms` (if applicable)

#### 2. Check Synonym Matching
```typescript
// Test synonym matching
import { normalizeCategory, getCategoryBySynonym } from './lib/data/categories';

// Test specific synonym
const category = getCategoryBySynonym("restaurant");
console.log(category); // Should return food category

// Test normalization
const normalized = normalizeCategory("dhaba");
console.log(normalized); // Should return "food"
```

**Common Issues:**
- Case sensitivity: Synonyms are case-insensitive, but check input
- Whitespace: Trim input before matching
- Exact match required: No fuzzy matching by default

#### 3. Verify Indian Terms Mapping
```typescript
// Test Indian term mapping
import { getCategoryByIndianTerm } from './lib/data/categories';

const category = getCategoryByIndianTerm("dhaba");
console.log(category); // Should return food category
```

**Add missing Indian terms:**
```typescript
// In lib/data/categories.ts
{
  id: "food",
  indianTerms: [
    "dhaba",
    "hotel", // Indian context: restaurant
    "restaurant",
    // Add more terms here
  ],
}
```

#### 4. Test Normalization Function
```bash
# Run unit tests for normalizers
npm run test:unit

# Or manually test in code
```

**Debug normalization:**
```typescript
import { normalizeCategory } from './lib/data/categories';

// Add logging
const input = "restaurant";
const result = normalizeCategory(input);
console.log(`Input: ${input}, Output: ${result}`);

// Check if category exists
import { isValidCategory } from './lib/data/categories';
console.log(`Is valid: ${isValidCategory(result)}`);
```

#### 5. Check Category Mapper
```bash
# Run unit tests for mappers
npm run test:unit

# Or manually test in code
```

**Verify Bedrock mapping:**
```typescript
import { mapBedrockCategory } from './lib/data/categories';

const bedrockOutput = "restaurant";
const mapped = mapBedrockCategory(bedrockOutput);
console.log(`Bedrock: ${bedrockOutput}, Mapped: ${mapped}`);
```

#### 6. Common Normalization Issues

**Issue: Returns null for valid category**
- Check if category ID is in taxonomy
- Verify synonym is in synonyms array
- Check for typos in input

**Issue: Wrong parent category returned**
- Subcategories return parent category (by design)
- Check if you need subcategory or parent

**Issue: Case sensitivity**
- Normalization is case-insensitive
- Input is lowercased before matching

---

## Redis Connection Issues

### Issue: Redis Connection Fails

**Symptoms:**
- Error: "Connection refused"
- Error: "Invalid credentials"
- Cache operations fail silently
- Falls back to in-memory cache

**Solutions:**

#### 1. Verify Credentials
```bash
# Check environment variables
echo $UPSTASH_REDIS_REST_URL
echo $UPSTASH_REDIS_REST_TOKEN

# Or in .env file
cat .env | grep UPSTASH
```

**Required Environment Variables:**
```bash
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

#### 2. Check Network Connectivity
```bash
# Test connection to Upstash Redis
curl -X GET "$UPSTASH_REDIS_REST_URL/ping" \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"

# Should return: {"result":"PONG"}
```

#### 3. Test Connection Separately
```bash
# Run unit tests for Redis
npm run test:unit

# Or manually test in code
```

**Manual Test:**
```typescript
// Test Redis connection
import { initializeRedis, isRedisAvailable, getRedisClient } from './lib/utils/cache';

initializeRedis();
console.log('Redis available:', isRedisAvailable());

const client = getRedisClient();
if (client) {
  const result = await client.ping();
  console.log('Ping result:', result);
}
```

#### 4. Verify Upstash Redis Setup
- Log into Upstash Console: https://console.upstash.com
- Verify Redis database is active
- Check REST API URL and token
- Verify region matches your application

#### 5. Check Fallback Behavior
```typescript
// Redis falls back to in-memory cache if unavailable
import { isRedisAvailable } from './lib/utils/cache';

if (!isRedisAvailable()) {
  console.warn('Redis not available, using in-memory cache');
  // In-memory cache works but is not persistent
}
```

**Fallback Cache Limitations:**
- Not persistent (lost on restart)
- Single instance only (not shared)
- Limited memory
- No TTL enforcement (manual cleanup)

#### 6. Common Redis Issues

**Issue: "Connection refused"**
- Check UPSTASH_REDIS_REST_URL is correct
- Verify network allows HTTPS to Upstash
- Check firewall rules

**Issue: "Invalid credentials"**
- Verify UPSTASH_REDIS_REST_TOKEN is correct
- Token should start with "AX"
- Check for extra spaces or newlines

**Issue: Silent failures**
- Check console logs for Redis errors
- Verify error handling in cache functions
- Test with explicit error logging

#### 7. Redis Configuration
```typescript
// In lib/utils/cache.ts
// Redis is initialized automatically on module load
// To reinitialize:
import { initializeRedis } from './lib/utils/cache';
initializeRedis();
```

---

## Bedrock Access Issues

### Issue: Bedrock Access Denied

**Symptoms:**
- Error: "AccessDeniedException"
- Error: "Model not found"
- Error: "Region not supported"
- Error: "Inference profile not found"

**Solutions:**

#### 1. Check IAM Permissions
Required IAM permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:GetInferenceProfile",
        "bedrock:ListInferenceProfiles"
      ],
      "Resource": [
        "arn:aws:bedrock:ap-southeast-1::foundation-model/*",
        "arn:aws:bedrock:ap-southeast-1::inference-profile/*"
      ]
    }
  ]
}
```

**Verify permissions:**
```bash
# Test Bedrock access
aws bedrock list-foundation-models --region ap-southeast-1

# List inference profiles
aws bedrock list-inference-profiles --region ap-southeast-1
```

#### 2. Verify Region
```bash
# Check current region
echo $AWS_REGION
echo $AWS_BEDROCK_REGION

# Bedrock models are region-specific
# Singapore (ap-southeast-1) supports:
# - Cohere Embed Multilingual v3
# - Claude 3 Haiku
# - Claude 3 Sonnet (with inference profile)
```

**Region Configuration:**
```bash
# Set in environment
export AWS_REGION=ap-southeast-1
export AWS_BEDROCK_REGION=ap-southeast-1
```

#### 3. Check Model Availability
```bash
# List available models in region
aws bedrock list-foundation-models \
  --region ap-southeast-1 \
  --query 'modelSummaries[*].[modelId,modelName]' \
  --output table
```

**Verify Model IDs:**
```typescript
// In lib/bedrock/bedrock-client.ts
// Default models:
// Embedding: "cohere.embed-multilingual-v3"
// NLP: "anthropic.claude-3-haiku-20240307-v1:0"

// Check environment variables
console.log(process.env.AWS_BEDROCK_EMBEDDING_MODEL_ID);
console.log(process.env.AWS_BEDROCK_NLP_MODEL_ID);
```

#### 4. Verify Inference Profile (if using)
```bash
# List inference profiles
npm run bedrock:list-profiles
# or
tsx scripts/list-inference-profiles.ts

# Create inference profile if needed
npm run bedrock:create-profile
# or
tsx scripts/create-inference-profile.ts
```

**Inference Profile Setup:**
```bash
# Set in environment
export AWS_BEDROCK_INFERENCE_PROFILE_ARN=arn:aws:bedrock:ap-southeast-1:account:inference-profile/name
```

#### 5. Test Bedrock Connection
```bash
# Run unit tests for Bedrock
npm run test:unit

# Or manually test by making a search query through the application
# Check application logs for Bedrock API calls
```

**Manual Test:**
```typescript
import { getBedrockClient } from './lib/bedrock/bedrock-client';
import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = getBedrockClient();
// Test with simple request
```

#### 6. Common Bedrock Issues

**Issue: "Model not found"**
- Verify model ID is correct
- Check model is available in region
- Some models require inference profile

**Issue: "Inference profile not found"**
- Create inference profile first
- Verify ARN is correct
- Check profile is in same region

**Issue: "Region not supported"**
- Bedrock is not available in all regions
- Use ap-southeast-1 (Singapore)
- Check AWS Bedrock service availability

**Issue: "Access denied"**
- Verify IAM permissions
- Check resource ARNs in policy
- Verify AWS credentials

**Issue: "InvalidPaymentInstrument" or "INVALID_PAYMENT_INSTRUMENT"**
- **Payment Method Verification Delay**: AWS may need 24-48 hours to fully verify new payment methods, even if added
- **Solution**: Wait 10 minutes to 48 hours after adding payment method
- **Check Payment Status**: Go to AWS Console → Billing → Payment methods and verify status is "Verified" and "Active"
- **Model Catalog Access**: Some models (especially Anthropic) may require explicit use case submission:
  1. Go to Bedrock → Model catalog
  2. Search for your model (e.g., `claude-3-haiku`)
  3. Click on the model and look for "Submit use case" or "Request access"
  4. Fill out the form and wait 10-15 minutes
- **AWS Marketplace**: Some models require Marketplace subscription even with auto-enable
- **Account Verification**: New AWS accounts may need additional verification
- **Alternative**: Try different models if these don't work (e.g., `amazon.titan-embed-text-v1` for embeddings)

#### 7. Bedrock Model Configuration
```typescript
// In lib/bedrock/bedrock-client.ts
// Models are configured via environment variables:

// Embedding model (default: cohere.embed-multilingual-v3)
process.env.AWS_BEDROCK_EMBEDDING_MODEL_ID

// NLP model (default: claude-3-haiku)
process.env.AWS_BEDROCK_NLP_MODEL_ID

// Inference profile (optional, takes precedence)
process.env.AWS_BEDROCK_INFERENCE_PROFILE_ARN
```

---

## Normalization Consistency Issues

### Issue: Normalization Inconsistent

**Symptoms:**
- Same input produces different outputs
- Edge cases not handled
- Inconsistent results across normalizers

**Solutions:**

#### 1. Ensure All Normalizers Use Same Logic
**Common Normalization Patterns:**
```typescript
// Pattern 1: Trim and lowercase
function normalize(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input.trim().toLowerCase();
}

// Pattern 2: Handle null/undefined
function normalize(input: any): string | null {
  if (!input || typeof input !== "string") return null;
  const normalized = input.trim();
  if (!normalized) return null;
  return normalized.toLowerCase();
}

// Pattern 3: Return original if normalization fails
function normalize(input: string): string {
  if (!input || typeof input !== "string") return input;
  return input.trim().toLowerCase() || input;
}
```

**Check all normalizers:**
```bash
# Review all normalizer files
ls lib/normalization/

# Ensure consistent patterns:
# - Input validation
# - Trimming
# - Case handling
# - Null/undefined handling
```

#### 2. Test Edge Cases
```bash
# Run unit tests for normalizers
npm run test:unit

# Or manually test edge cases in code
```

**Test Edge Cases:**
```typescript
// Test cases to verify:
const testCases = [
  "",                    // Empty string
  "   ",                 // Whitespace only
  null,                  // Null
  undefined,             // Undefined
  "  test  ",            // Leading/trailing spaces
  "TEST",                // Uppercase
  "Test Case",           // Mixed case
  "test\ncase",          // Newlines
  "test\tcase",          // Tabs
  "test\u00A0case",      // Non-breaking space
];
```

#### 3. Verify Normalization Functions
**Location:** `lib/normalization/`

**Check each normalizer:**
- `address-normalizer.ts` - Address normalization
- `amenity-normalizer.ts` - Amenity normalization
- `category-normalizer.ts` - Category normalization
- `hours-normalizer.ts` - Business hours normalization
- `location-normalizer.ts` - Location normalization
- `name-normalizer.ts` - Business name normalization
- `phone-normalizer.ts` - Phone number normalization
- `price-range-normalizer.ts` - Price range normalization
- `rating-normalizer.ts` - Rating normalization
- `status-normalizer.ts` - Status normalization

**Common Issues:**
- Inconsistent trimming
- Different null handling
- Case sensitivity differences
- Whitespace handling

#### 4. Use Centralized Utilities
```typescript
// Create shared normalization utilities
// In lib/utils/normalization-helpers.ts

export function normalizeString(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input.trim().toLowerCase();
}

export function normalizeStringOrNull(input: string): string | null {
  if (!input || typeof input !== "string") return null;
  const normalized = input.trim();
  return normalized || null;
}
```

#### 5. Add Validation Tests
```typescript
// Test normalization consistency
describe('Normalization Consistency', () => {
  it('should handle empty strings consistently', () => {
    expect(normalizeName("")).toBe("");
    expect(normalizeCategory("")).toBe(null);
    // All should handle consistently
  });

  it('should handle whitespace consistently', () => {
    expect(normalizeName("  test  ")).toBe("test");
    expect(normalizeCategory("  test  ")).toBe("test");
  });
});
```

#### 6. Log Normalization Issues
```typescript
// In monitoring
import { trackNormalizationFailure } from './lib/utils/monitoring';

try {
  const normalized = normalize(input);
  if (!normalized) {
    trackNormalizationFailure('normalizer-name', input, 'Returned null');
  }
} catch (error) {
  trackNormalizationFailure('normalizer-name', input, error.message);
}
```

#### 7. Review Normalization Logic
**Check for:**
- Consistent input validation
- Same trimming logic
- Consistent case handling
- Same null/undefined handling
- Consistent error handling

---

## General Debugging Tips

### Enable Debug Logging
```bash
# Set debug environment variable
export DEBUG=true
export NODE_ENV=development

# Enable AWS SDK logging
export AWS_SDK_LOAD_CONFIG=1
export AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE=1
```

### Check Environment Variables
```bash
# Verify all required environment variables are set
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY
echo $AWS_REGION
echo $AWS_BEDROCK_REGION
echo $UPSTASH_REDIS_REST_URL
echo $UPSTASH_REDIS_REST_TOKEN

# Or check .env.local file
cat .env.local
```

### Verify Setup
```bash
# Verify DynamoDB tables exist
aws dynamodb list-tables --region ap-southeast-1

# Verify AWS credentials
aws sts get-caller-identity

# Verify Bedrock access
aws bedrock list-foundation-models --region ap-southeast-1 --max-results 5
```

### Check Logs
```typescript
// Enable detailed logging
import { logDebug, logInfo, logError } from './lib/utils/monitoring';

logDebug('Debug message', { context: 'value' });
logInfo('Info message', { context: 'value' });
logError('Error message', { context: 'value' }, error);
```

### Test Individual Components
```bash
# Run unit tests for specific components
npm run test:unit

# Run integration tests
npm run test:integration

# Run all tests
npm test
```

### Common Error Messages

**DynamoDB:**
- `ResourceNotFoundException` - Table doesn't exist
- `ResourceInUseException` - Table already exists
- `ValidationException` - Invalid request parameters
- `ProvisionedThroughputExceededException` - Too many requests

**Bedrock:**
- `AccessDeniedException` - Missing IAM permissions
- `ModelNotReadyException` - Model not available
- `ValidationException` - Invalid request format
- `ThrottlingException` - Rate limit exceeded

**Redis:**
- `ECONNREFUSED` - Connection refused
- `ETIMEDOUT` - Connection timeout
- `ENOTFOUND` - Host not found

---

## Rate Limiting and API Call Issues

### Issue: Too Many API Calls to AWS Bedrock

**Symptoms:**
- Error: `ThrottlingException`
- Error: "Rate limit exceeded"
- Error: "Too many requests"
- Bedrock API calls failing intermittently
- High AWS costs from excessive API usage

**Root Cause:**
- Making too many concurrent or rapid requests to AWS Bedrock
- No rate limiting implemented initially
- Parallel processing without throttling
- Exceeding AWS Bedrock rate limits (varies by model and region)

**Solution Implemented:**

1. **Rate Limiter Implementation** (`lib/bedrock/rate-limiter.ts`):
   - Created a centralized rate limiter with configurable limits:
     - **Max requests per second**: 10 (default)
     - **Max requests per minute**: 100 (default)
     - **Max concurrent requests**: 5 (default)
   - Queue-based system that waits for availability
   - Automatic request tracking and throttling

2. **Usage Pattern:**
   ```typescript
   import { withRateLimit } from "@/lib/bedrock/rate-limiter";
   
   // Wrap Bedrock API calls
   const result = await withRateLimit(async () => {
     return await bedrockClient.invokeModel(...);
   });
   ```

3. **Applied to:**
   - Embedding generation (`lib/bedrock/embeddings.ts`)
   - NLP processing (`lib/bedrock/nlp.ts`)
   - Query processing (`lib/search/query-processor.ts`)
   - Semantic search (`lib/search/semantic-search.ts`)

**Configuration:**
```typescript
// Customize rate limits if needed
const result = await withRateLimit(
  async () => { /* your code */ },
  {
    maxRequestsPerSecond: 5,  // Lower for conservative approach
    maxRequestsPerMinute: 50,
    maxConcurrentRequests: 3
  }
);
```

**Best Practices:**
- Always wrap Bedrock API calls with `withRateLimit()`
- Use caching to reduce API calls (see Caching Strategy section)
- Monitor rate limit metrics
- Adjust limits based on your AWS account tier

---

### Issue: Too Many Geocoding API Calls

**Symptoms:**
- Nominatim API returning 429 (Too Many Requests)
- Geocoding requests failing
- IP address getting blocked by Nominatim

**Root Cause:**
- Nominatim has strict rate limits: **1 request per second**
- Making multiple geocoding requests without throttling
- No caching implemented initially

**Solution Implemented:**

1. **Rate Limiting** (`lib/geocoding.js`):
   - Implemented `waitForRateLimit()` function
   - Enforces minimum 1 second interval between requests
   - Tracks last request timestamp

2. **Caching Strategy** (`lib/cache/redis-config.ts`):
   - Geocoding results cached for **24 hours** (86400 seconds)
   - Reduces redundant API calls for same locations
   - Uses Redis with in-memory fallback

3. **Usage:**
   ```javascript
   // Rate limiting is automatic
   const result = await forwardGeocode("Mumbai, India");
   
   // Caching is handled by cache layer
   // Check cache before making API call
   ```

**Best Practices:**
- Always check cache before making geocoding requests
- Use consistent location formatting for cache hits
- Monitor cache hit rates
- Consider using paid geocoding service for production (Google Maps, Mapbox)

---

## Caching Strategy to Reduce API Calls

### Issue: Excessive API Calls Leading to High Costs and Rate Limits

**Symptoms:**
- High AWS Bedrock costs
- Rate limit errors
- Slow response times
- Redundant API calls for same queries

**Solution Implemented:**

1. **Redis Caching Layer** (`lib/cache/redis-config.ts`):
   - Upstash Redis (serverless) with in-memory fallback
   - Automatic fallback if Redis unavailable
   - TTL-based expiration

2. **Cache Strategies by Data Type:**

   **Embeddings** (30 minutes TTL):
   ```typescript
   // Cache embedding results
   await CacheStrategy.cacheEmbedding(query, embedding);
   
   // Retrieve cached embedding
   const cached = await CacheStrategy.getCachedEmbedding(query);
   ```

   **Geocoding** (24 hours TTL):
   ```typescript
   // Cache geocoding results
   await CacheStrategy.cacheGeocoding(location, result);
   
   // Retrieve cached geocoding
   const cached = await CacheStrategy.getCachedGeocoding(location);
   ```

   **Search Results** (5 minutes TTL):
   ```typescript
   // Cache search results
   await CacheStrategy.cacheSearchResults(query, results);
   
   // Retrieve cached results
   const cached = await CacheStrategy.getCachedSearchResults(query);
   ```

3. **Cache Key Patterns:**
   - `embedding:{query}` - Embedding cache
   - `geocoding:{location}` - Geocoding cache
   - `search:{query}` - Search results cache
   - `business:{businessId}` - Business data cache

4. **Implementation Pattern:**
   ```typescript
   // Always check cache first
   const cached = await CacheStrategy.getCachedEmbedding(query);
   if (cached) {
     return cached; // Return cached result
   }
   
   // Generate new result
   const result = await generateEmbedding(query);
   
   // Cache for future use
   await CacheStrategy.cacheEmbedding(query, result);
   return result;
   ```

**Benefits:**
- **Reduced API calls**: 60-80% reduction in Bedrock calls
- **Lower costs**: Significant AWS cost savings
- **Faster responses**: Cache hits are instant
- **Better reliability**: Less dependency on external APIs

**Monitoring:**
- Track cache hit rates
- Monitor Redis memory usage
- Set up alerts for cache failures
- Review TTL values based on data freshness requirements

---

## Bedrock API Failures and Fallback Handling

### Issue: Bedrock API Failures Causing Application Errors

**Symptoms:**
- Application crashes when Bedrock is unavailable
- No graceful degradation
- Users see error messages instead of results
- Throttling errors breaking functionality

**Solution Implemented:**

1. **Fallback Handler** (`lib/bedrock/fallback-handler.ts`):
   - Graceful degradation when Bedrock fails
   - Automatic fallback to default values
   - Retry logic with exponential backoff

2. **Fallback Values:**
   ```typescript
   // Embedding fallback: Zero vector
   getFallbackEmbedding(dimensions: 1536) // Returns [0, 0, 0, ...]
   
   // NLP fallback: Empty entities
   getFallbackEntities() // Returns { categories: [], locations: [], intent: "find" }
   
   // Category fallback: null
   getFallbackCategory() // Returns null
   ```

3. **Retry Logic:**
   ```typescript
   import { retryWithBackoff, isRetryableError } from "@/lib/bedrock/fallback-handler";
   
   try {
     const result = await retryWithBackoff(
       async () => await bedrockCall(),
       maxRetries: 3,
       initialDelay: 1000 // 1 second
     );
   } catch (error) {
     if (isRetryableError(error)) {
       // Use fallback
       return getFallbackValue();
     }
     throw error; // Non-retryable error
   }
   ```

4. **Retryable Errors:**
   - `ThrottlingException`
   - `ServiceUnavailableException`
   - Network timeouts
   - Connection errors
   - Rate limit errors

5. **Usage Pattern:**
   ```typescript
   import { withFallback } from "@/lib/bedrock/fallback-handler";
   
   const result = await withFallback(
     async () => await generateEmbedding(query),
     () => getFallbackEmbedding(1536),
     { logError: true }
   );
   ```

**Benefits:**
- Application continues working even when Bedrock fails
- Better user experience with graceful degradation
- Automatic retry for transient errors
- Reduced error rates

**Best Practices:**
- Always use fallback handlers for critical Bedrock calls
- Log fallback usage for monitoring
- Set appropriate retry limits
- Monitor fallback usage rates

---

## Phase 2 Search Issues

### Issue: Search Returns No Results

**Symptoms:**
- Search API returns empty results array
- No businesses found for valid queries
- Search works but returns 0 results

**Solutions:**

#### 1. Check Database Has Businesses
```bash
# Check DynamoDB directly
aws dynamodb scan --table-name Businesses --region ap-southeast-1 --max-items 5

# Or use AWS Console to inspect the table
```

**Verify business data:**
- Check `Businesses` table has items
- Verify businesses have `status: "active"`
- Check businesses have required fields (name, category, location)

#### 2. Verify Normalization
```bash
# Run unit tests for normalizers
npm run test:unit

# Or manually test normalization in code
```

**Check normalization:**
- Business names are normalized correctly
- Categories are normalized correctly
- Location names are normalized correctly
- Normalized values match database values

#### 3. Check Filters
```typescript
// Verify status filter
// Search only returns businesses with status: "active"
// Check if businesses have correct status

// Verify category filter
// Check if category normalization matches database

// Verify location filter
// Check if location coordinates are valid
// Verify radius calculation
```

**Common Filter Issues:**
- Status filter too restrictive (only "active" businesses)
- Category filter not matching normalized categories
- Location filter radius too small
- Filters applied incorrectly

#### 4. Check Status Filter
```bash
# Verify businesses have status: "active"
# In DynamoDB, check:
# - status attribute exists
# - status value is "active" (not "inactive" or missing)
```

**Fix:**
- Update business status to "active"
- Ensure all businesses have status attribute
- Check status normalization

#### 5. Test Search Functions
```bash
# Run integration tests
npm run test:integration

# Or manually test search API with curl/Postman
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"restaurants","pagination":{"page":1,"limit":20}}'
```

**Debug search:**
- Test name search separately
- Test category search separately
- Test location search separately
- Check search query parameters

---

### Issue: Location Not Resolving

**Symptoms:**
- Location resolution returns null
- "Near me" searches fail
- Explicit location not found
- Geocoding errors

**Solutions:**

#### 1. Check Geocoding Cache
```bash
# Verify geocoding cache table exists
aws dynamodb describe-table --table-name GeocodingCache --region ap-southeast-1

# Check cache entries
aws dynamodb scan --table-name GeocodingCache --region ap-southeast-1 --max-items 5
```

**Cache Issues:**
- Cache table not created
- Cache entries expired (TTL)
- Cache key generation mismatch
- Cache not being used

#### 2. Verify Location Names
```typescript
// Test location normalization
import { normalizeCity, normalizeState } from './lib/normalization/location-normalizer';

const normalized = normalizeCity("Mumbai");
console.log(normalized); // Should return normalized city name
```

**Location Name Issues:**
- Location name not in Indian cities database
- Location name not normalized correctly
- Location alias not recognized
- Location name typo

#### 3. Check User Profile Location
```bash
# Verify user profile has location
# Check via API:
curl -X GET http://localhost:3000/api/profile \
  -H "x-session-id: YOUR_SESSION_ID"
```

**Profile Location Issues:**
- User profile missing location
- Location coordinates invalid
- Location address not set
- Location timestamp missing

#### 4. Test Location Resolution
```bash
# Run integration tests
npm run test:integration

# Or manually test location resolution through the application
# Make a search query with location and check the results
```

**Debug location resolution:**
- Test explicit location extraction
- Test "near me" detection
- Test user profile location
- Test geocoding
- Test IP geolocation

---

### Issue: "Near Me" Not Working

**Symptoms:**
- "Near me" searches return error
- Location required error
- No results for "near me" queries

**Solutions:**

#### 1. Check User Profile Has Location
```bash
# Verify user profile location
curl -X GET http://localhost:3000/api/profile \
  -H "x-session-id: YOUR_SESSION_ID" \
  | jq '.user.location'
```

**Profile Location Check:**
- `latitude` exists and is valid
- `longitude` exists and is valid
- `address` exists (optional but recommended)
- `locationLastUpdated` exists

#### 2. Verify Location Timestamp
```typescript
// Check if location is stale (>30 days old)
const locationLastUpdated = user.location?.locationLastUpdated;
const now = Math.floor(Date.now() / 1000);
const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
const isStale = locationLastUpdated && (now - locationLastUpdated > thirtyDaysInSeconds);
```

**Timestamp Issues:**
- Location timestamp missing
- Location timestamp too old (stale)
- Location timestamp format incorrect

#### 3. Check Location Resolver Logic
```bash
# Run integration tests
npm run test:integration

# Or manually test "near me" functionality through the application
# Set user location and search for "restaurants near me"
```

**Location Resolver Issues:**
- "Near me" keywords not detected
- User profile location not used
- Location resolver priority wrong
- Location resolver returns null incorrectly

#### 4. Update User Location
```bash
# Set user location via API
curl -X PUT http://localhost:3000/api/profile \
  -H "Content-Type: application/json" \
  -H "x-session-id: YOUR_SESSION_ID" \
  -d '{
    "useCurrentLocation": true,
    "latitude": 19.0760,
    "longitude": 72.8777
  }'
```

**Fix:**
- Use location setup modal to set location
- Use location update button
- Manually set location via API
- Verify location is saved correctly

---

### Issue: API Timeout

**Symptoms:**
- Search API times out (>5 seconds)
- Partial results returned
- Timeout error messages
- Slow search performance

**Solutions:**

#### 1. Optimize Queries
```typescript
// Check query performance
// Use GSI indexes for queries
// Limit scan operations
// Use pagination
```

**Query Optimization:**
- Use GSI indexes (category-location-index, location-index)
- Avoid full table scans
- Use QueryCommand instead of ScanCommand
- Limit result sets

#### 2. Add Pagination
```typescript
// Ensure pagination is used
const limit = 20; // Default limit
const offset = (page - 1) * limit;

// Use pagination in all search functions
```

**Pagination Issues:**
- No pagination implemented
- Pagination limit too high
- Offset calculation wrong
- Pagination not applied to all queries

#### 3. Check Database Indexes
```bash
# Verify GSI indexes exist and are active
aws dynamodb describe-table --table-name Businesses --region ap-southeast-1

# Check for GlobalSecondaryIndexes in the output
```

**Index Issues:**
- GSI indexes missing
- GSI indexes not active
- GSI indexes not used in queries
- Index key attributes wrong

#### 4. Add Caching
```typescript
// Implement caching for:
// - Geocoding results (already implemented)
// - Search results (if needed)
// - Business data (if needed)
```

**Caching:**
- Geocoding cache (already implemented)
- Search results cache (optional)
- Business data cache (optional)
- Cache TTL configuration

#### 5. Test Performance
```bash
# Run integration tests
npm run test:integration

# Or manually test performance by:
# 1. Making search queries through the application
# 2. Measuring response times in browser DevTools
# 3. Checking AWS CloudWatch metrics
```

**Performance Targets:**
- Search response: < 2 seconds
- Pagination: < 3 seconds per page
- Many results: < 5 seconds

---

### Issue: Location Setup Modal Not Appearing

**Symptoms:**
- Modal doesn't open when location required
- Error handling not working
- API response format incorrect
- Component state not updating

**Solutions:**

#### 1. Check Error Handling
```typescript
// Verify error handling in search bar
// Check for LOCATION_REQUIRED error code
if (data.errorCode === "LOCATION_REQUIRED" && data.action === "SET_LOCATION") {
  setShowLocationModal(true);
}
```

**Error Handling Issues:**
- Error code not checked
- Error message not parsed correctly
- Error handling logic missing
- Error state not set

#### 2. Verify API Response Format
```bash
# Test API response
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"restaurants near me","pagination":{"page":1,"limit":20}}'
```

**Response Format:**
- `errorCode` should be "LOCATION_REQUIRED"
- `action` should be "SET_LOCATION"
- `error` message should be present
- Response status should be 400

#### 3. Check Component State
```typescript
// Verify component state management
const [showLocationModal, setShowLocationModal] = useState(false);

// Check state updates
useEffect(() => {
  if (errorCode === "LOCATION_REQUIRED") {
    setShowLocationModal(true);
  }
}, [errorCode]);
```

**State Issues:**
- State not initialized
- State not updated on error
- State update logic missing
- State update timing wrong

#### 4. Test Location Modal
```bash
# Run integration tests
npm run test:integration

# Or manually test by:
# 1. Making a "near me" search without location set
# 2. Verifying the location modal appears
# 3. Setting location and verifying it works
```

**Modal Issues:**
- Modal component not imported
- Modal props incorrect
- Modal state not managed
- Modal not rendered

#### 5. Check API Integration
```typescript
// Verify search API integration
const response = await fetch("/api/search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query, pagination }),
});

const data = await response.json();
// Check data.errorCode and data.action
```

**API Integration Issues:**
- API call not made
- Response not parsed
- Error codes not checked
- Error handling not implemented

---

## Major Development Challenges

### Embedding Dimension Mismatch

**Problem**: Query embeddings (1536D) and business embeddings (1024D) had mismatched dimensions, causing incorrect similarity calculations.

**Solution**: Regenerated all business embeddings with the correct model (`amazon.titan-embed-text-v1`) to match query embeddings. Removed truncation code that was losing information.

**Prevention**: Always validate embedding dimensions match between query and stored embeddings. Use consistent model versions across the entire pipeline.

### Location Resolution Data Structure Mismatch

**Problem**: User location was stored as flat fields (`latitude`, `longitude`) but code expected nested object (`location.latitude`, `location.longitude`).

**Solution**: Updated `updateUserProfile()` to store location as nested object matching the expected structure.

**Prevention**: Maintain consistent data structures across storage and retrieval. Document data structure expectations clearly.

### Category Mapper False Positives

**Problem**: Category mapper was producing false positive matches (e.g., "where" matching "where to stay" in accommodation).

**Solution**: 
- Implemented strict matching with word boundaries
- Added comprehensive stop word filtering
- Prioritized Bedrock NLP results when confidence is high (≥0.7)

**Prevention**: Use exact matching instead of substring matching. Always validate results against authoritative sources.

### Database Population Validation Failures

**Problem**: Business hours validation failed for 24/7 businesses, `isVerified` type mismatches, missing location fields.

**Solution**: 
- Fixed business hours format for 24/7 businesses (use `{ open: "00:00", close: "23:59" }`)
- Ensured `isVerified` is always boolean type
- Added missing location fields (`country`, `timezone`)

**Prevention**: Validate data structure before database insertion. Use TypeScript types to catch type mismatches early.

### UI State Management Issues

**Problem**: Old search results remained visible during new searches, causing confusion.

**Solution**: Clear results state immediately when starting a new search. Added deduplication in UI components.

**Prevention**: Always clear state when starting new operations. Implement deduplication at the UI level.

For detailed information about all challenges and solutions, see [Development Journey](./development-journey.md).

---

## Getting Help

If you encounter issues not covered here:

1. **Check Logs:** Review application logs and error messages
2. **Run Tests:** Execute Jest test suite (`npm test`)
3. **Verify Configuration:** Check environment variables and credentials
4. **Review Documentation:** See `docs/` directory for detailed guides
5. **Check AWS Console:** Verify resources in AWS Management Console
6. **Manual Testing:** Test functionality through the application UI
7. **Development Journey:** See [Development Journey](./development-journey.md) for detailed challenge documentation

---

## Quick Reference

### Verification Commands
```bash
# Verify DynamoDB tables
aws dynamodb list-tables --region ap-southeast-1

# Verify AWS credentials
aws sts get-caller-identity

# Verify environment variables
echo $AWS_ACCESS_KEY_ID
echo $AWS_REGION
echo $AWS_BEDROCK_REGION

# Test all components
npm test
npm run test:unit
npm run test:integration
```

### Common Test Commands
```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage
```

### Environment Variables Checklist
```bash
# AWS
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
AWS_BEDROCK_REGION

# Bedrock
AWS_BEDROCK_EMBEDDING_MODEL_ID
AWS_BEDROCK_NLP_MODEL_ID
AWS_BEDROCK_INFERENCE_PROFILE_ARN

# Redis
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

