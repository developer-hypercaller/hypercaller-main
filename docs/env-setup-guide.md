# Environment Variables Setup Guide

This guide explains how to properly configure environment variables for the Hypercaller project.

## Environment File Priority

Next.js and our scripts load environment variables in the following order (later files override earlier ones):

1. `.env` - Base environment variables (can be committed to git)
2. `.env.local` - Local overrides (should NOT be committed to git)
3. System environment variables (highest priority)

## Required Environment Variables

### AWS Configuration

```bash
# AWS Credentials (required for DynamoDB and Bedrock)
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=ap-southeast-1
```

### AWS Bedrock Configuration

```bash
# Bedrock Region (optional, defaults to AWS_REGION)
AWS_BEDROCK_REGION=ap-southeast-1

# Bedrock Model IDs (optional, has defaults)
# Embedding model: Amazon Titan Embed G1 Text v2 (no marketplace subscription required)
# Falls back to other models if Titan unavailable
AWS_BEDROCK_EMBEDDING_MODEL_ID=amazon.titan-embed-g1-text-02
AWS_BEDROCK_NLP_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0

# Inference Profile (optional, for models that require it)
AWS_BEDROCK_INFERENCE_PROFILE_ARN=arn:aws:bedrock:ap-southeast-1:account:inference-profile/name
```

### Redis Configuration (Optional)

```bash
# Upstash Redis (optional - falls back to in-memory cache if not set)
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

### Application Configuration

```bash
# Node Environment
NODE_ENV=development

# Public Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OTP Debug Mode (optional - set to 'true' to show OTP in API responses for testing)
# Useful for development and Vercel deployments where SMS might not be configured
SHOW_OTP_IN_RESPONSE=false

# Google OAuth (if using Google authentication)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## Setup Instructions

### 1. Create `.env.local` File

Create a `.env.local` file in the project root:

```bash
# Windows
type nul > .env.local

# Linux/Mac
touch .env.local
```

### 2. Add Your Credentials

Open `.env.local` and add your environment variables:

```bash
# AWS Configuration
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=ap-southeast-1

# Bedrock Configuration
AWS_BEDROCK_REGION=us-east-1  # Titan models are available in us-east-1
AWS_BEDROCK_EMBEDDING_MODEL_ID=amazon.titan-embed-g1-text-02  # No marketplace subscription required
AWS_BEDROCK_NLP_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0

# Redis Configuration (Optional)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

# Application Configuration
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Verify Configuration

Run the verification script to check your setup:

```bash
# Verify environment variables
npm run verify:env

# Comprehensive setup verification
npm run verify:setup
```

## Environment Variable Loading

### For Next.js Application

Next.js automatically loads `.env.local` and `.env` files. Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

### For Scripts (tsx/node)

Scripts use `dotenv` to load environment variables. The pattern is:

```typescript
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // Load .env.local first
dotenv.config(); // Then load .env (if exists)
```

This ensures `.env.local` takes precedence over `.env`.

## Common Issues

### Issue: Environment Variables Not Loading

**Solution:**
1. Ensure `.env.local` is in the project root (same directory as `package.json`)
2. Check file name spelling (should be exactly `.env.local`, not `.envlocal`)
3. Restart your development server after changing environment variables
4. For scripts, ensure dotenv is loaded at the top of the file

### Issue: Variables Not Available in Scripts

**Solution:**
- Scripts need explicit dotenv loading
- Check that scripts have:
  ```typescript
  import * as dotenv from "dotenv";
  dotenv.config({ path: ".env.local" });
  dotenv.config();
  ```

### Issue: Next.js Not Loading Variables

**Solution:**
- Restart the Next.js dev server: `npm run dev`
- Variables prefixed with `NEXT_PUBLIC_` are available in browser
- Other variables are only available in server-side code

### Issue: Variables Overridden

**Solution:**
- System environment variables override `.env.local`
- Check system environment variables: `echo $VARIABLE_NAME` (Linux/Mac) or `echo %VARIABLE_NAME%` (Windows)
- `.env.local` overrides `.env`

## Security Best Practices

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Use `.env` for non-sensitive defaults** - Can be committed
3. **Rotate credentials regularly** - Especially AWS keys
4. **Use IAM roles in production** - Instead of access keys when possible
5. **Limit permissions** - Give only necessary AWS permissions

## Verification Commands

```bash
# Check environment variables are loaded
npm run verify:env

# Comprehensive setup check
npm run verify:setup

# Test specific components
npm run test:bedrock-connection
npm run test:redis-cache
npm run verify:dynamodb
```

## Example `.env.local` Structure

```bash
# ============================================
# AWS Configuration
# ============================================
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=ap-southeast-1

# ============================================
# AWS Bedrock Configuration
# ============================================
AWS_BEDROCK_REGION=ap-southeast-1
AWS_BEDROCK_EMBEDDING_MODEL_ID=cohere.embed-multilingual-v3
AWS_BEDROCK_NLP_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
# AWS_BEDROCK_INFERENCE_PROFILE_ARN=arn:aws:bedrock:ap-southeast-1:account:inference-profile/name

# ============================================
# Redis Configuration (Optional)
# ============================================
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here

# ============================================
# Application Configuration
# ============================================
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OTP Debug Mode (set to 'true' to show OTP in API responses for testing)
# Useful for development and Vercel deployments where SMS might not be configured
SHOW_OTP_IN_RESPONSE=true

# ============================================
# Google OAuth (Optional)
# ============================================
# GOOGLE_CLIENT_ID=your_google_client_id
# GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## Next Steps

After setting up your environment variables:

1. **Verify configuration:**
   ```bash
   npm run verify:env
   npm run verify:setup
   ```

2. **Create DynamoDB tables:**
   ```bash
   # Windows
   .\scripts\create-dynamodb-tables.ps1
   
   # Linux/Mac
   ./scripts/create-dynamodb-tables.sh
   ```

3. **Test components:**
   ```bash
   npm run test:bedrock-connection
   npm run test:redis-cache
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

## Troubleshooting

If you encounter issues, see the [Troubleshooting Guide](./troubleshooting.md) for detailed solutions.

