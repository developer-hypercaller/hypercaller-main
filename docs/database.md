# Database Documentation

This document describes the database schema and setup for Hypercaller.

## Overview

Hypercaller uses **AWS DynamoDB** as its database. All tables are configured for the **ap-southeast-1** (Singapore) region.

## Tables

### Users Table

Stores user account information.

**Table Name**: `Users`

**Primary Key**:
- `userId` (String) - Unique user identifier

**Global Secondary Indexes (GSI)**:
1. **username-index**
   - Partition Key: `username` (String)
   - Used for username lookups

2. **phoneNumber-index**
   - Partition Key: `phoneNumber` (String)
   - Used for phone number lookups

**Attributes**:
- `userId` (String) - Primary key, format: `user_<timestamp>`
- `username` (String) - Normalized to lowercase, unique
- `firstName` (String) - User's first name
- `lastName` (String) - User's last name
- `phoneNumber` (String) - E.164 format (e.g., +15551234567)
- `phoneVerified` (Boolean) - Whether phone number is verified
- `passwordHash` (String) - bcrypt hashed password
- `role` (String) - User role: "user" or "business"
- `avatar` (String) - Avatar identifier
- `accountStatus` (String) - Account status: "active", "suspended", etc.
- `createdAt` (Number) - Unix timestamp
- `updatedAt` (Number) - Unix timestamp
- `lastLoginAt` (Number) - Unix timestamp, nullable

**Provisioned Throughput**:
- Read Capacity Units: 5
- Write Capacity Units: 5

---

### OTPVerifications Table

Stores OTP codes for phone number verification.

**Table Name**: `OTPVerifications`

**Primary Key**:
- `phoneNumber` (String) - Partition key
- `createdAt` (Number) - Sort key (Unix timestamp)

**Attributes**:
- `phoneNumber` (String) - E.164 format phone number
- `createdAt` (Number) - Unix timestamp when OTP was created
- `otp` (String) - 6-digit OTP code
- `purpose` (String) - Purpose of OTP: "registration", "login", etc.
- `verified` (Boolean) - Whether OTP has been verified
- `ttl` (Number) - Time to live (Unix timestamp), expires after 10 minutes

**TTL Configuration**:
- TTL attribute: `ttl`
- Expiration: 10 minutes from creation
- DynamoDB automatically deletes expired items

**Provisioned Throughput**:
- Read Capacity Units: 5
- Write Capacity Units: 5

---

### Sessions Table

Stores user session information.

**Table Name**: `Sessions`

**Primary Key**:
- `sessionId` (String) - Unique session identifier

**Global Secondary Index (GSI)**:
- **userId-index**
  - Partition Key: `userId` (String)
  - Sort Key: `createdAt` (Number)
  - Used for querying all sessions for a user

**Attributes**:
- `sessionId` (String) - Primary key, format: `session_<uuid>`
- `userId` (String) - Reference to user
- `username` (String) - User's username
- `role` (String) - User's role
- `ipAddress` (String) - IP address of session creation
- `userAgent` (String) - User agent string
- `createdAt` (Number) - Unix timestamp
- `expiresAt` (Number) - Unix timestamp when session expires
- `ttl` (Number) - Time to live (Unix timestamp)
  - Default: 1 day (86400 seconds)
  - Remember me: 30 days (2592000 seconds)

**TTL Configuration**:
- TTL attribute: `ttl`
- DynamoDB automatically deletes expired sessions

**Provisioned Throughput**:
- Read Capacity Units: 5
- Write Capacity Units: 5

---

## Table Creation

### Automated Setup

Use the provided scripts to create all tables:

**Windows (PowerShell)**:
```powershell
.\scripts\create-dynamodb-tables.ps1
```

**Linux/Mac**:
```bash
chmod +x scripts/create-dynamodb-tables.sh
./scripts/create-dynamodb-tables.sh
```

### Manual Setup

You can also create tables manually using the AWS Console or AWS CLI. Refer to the scripts in `scripts/` directory for the exact table definitions.

### Verification

After creating tables, verify they exist:

```bash
aws dynamodb list-tables --region ap-southeast-1
```

Expected output should include:
- `Users`
- `OTPVerifications`
- `Sessions`
- `Businesses`
- `BusinessEmbeddings`
- `UserSearchHistory`
- `GeocodingCache`

---

### Businesses Table

Stores business information for the search platform.

**Table Name**: `Businesses`

**Primary Key**:
- `businessId` (String) - Unique business identifier

**Global Secondary Indexes (GSI)**:
1. **category-location-index**
   - Partition Key: `category` (String)
   - Sort Key: `city` (String)
   - Used for efficient category-location queries
   - Projection: ALL

2. **location-index**
   - Partition Key: `city` (String)
   - Sort Key: `state` (String)
   - Used for location-based queries
   - Projection: ALL

**Attributes**:
- `businessId` (String) - Primary key
- `name` (String) - Business name (normalized)
- `category` (String) - Business category (normalized)
- `city` (String) - City name (normalized)
- `state` (String) - State name (normalized)
- `latitude` (Number) - Latitude coordinate
- `longitude` (Number) - Longitude coordinate
- `status` (String) - Business status: "active", "inactive", etc.
- `address` (String) - Full address
- `phone` (String) - Phone number (E.164 format)
- `rating` (Number) - Average rating (0-5)
- `priceRange` (String) - Price range: "$", "$$", "$$$", "$$$$"
- `amenities` (Array) - List of amenities
- `hours` (Object) - Business hours
- `createdAt` (Number) - Unix timestamp
- `updatedAt` (Number) - Unix timestamp

**Provisioned Throughput**:
- Read Capacity Units: 5
- Write Capacity Units: 5

**Note**: The `category-location-index` GSI is required for efficient search queries. See [GSI Setup](#gsi-setup) below for setup instructions.

---

### Other Tables

Additional tables used by the application:
- **BusinessEmbeddings**: Stores vector embeddings for semantic search
- **UserSearchHistory**: Tracks user search queries
- **GeocodingCache**: Caches geocoding results to reduce API calls

## GSI Setup

### Adding the category-location-index GSI

The `category-location-index` GSI is required for efficient category-based searches. If it's missing, you can add it using one of the following methods:

#### Option 1: Using Node.js Script (Recommended)
```bash
npm run add:category-location-gsi
```

This script will:
1. Check if the GSI already exists
2. Add the GSI if it's missing
3. Wait for it to become active (up to 5 minutes)

#### Option 2: Using PowerShell (Windows)
```powershell
.\scripts\add-category-location-index.ps1
```

#### Option 3: Using Bash (Linux/Mac)
```bash
./scripts/add-category-location-index.sh
```

### Verifying GSI Status

Check if the GSI exists and is active:
```bash
npm run verify:business-gsi
```

This will show:
- ✅ GSI exists and is ACTIVE
- ❌ GSI does not exist (needs to be created)
- ⚠️ GSI exists but is CREATING (wait for it to become active)

### Waiting for GSI to Become Active

GSI creation can take several minutes. To wait for it to become active:
```bash
npm run wait:gsi-active
```

This script will:
- Check GSI status every 5 seconds
- Wait up to 10 minutes for it to become ACTIVE
- Show progress updates

### GSI Configuration

The `category-location-index` GSI has the following configuration:
- **Index Name:** `category-location-index`
- **Partition Key:** `category` (String)
- **Sort Key:** `city` (String)
- **Projection:** ALL (all attributes projected)
- **Provisioned Throughput:**
  - Read Capacity Units: 5
  - Write Capacity Units: 5

### Troubleshooting GSI Setup

**Error:** `ResourceInUseException`
- **Solution:** The table is being updated. Wait a few minutes and try again.

**Error:** `ResourceNotFoundException`
- **Solution:** The Businesses table doesn't exist. Create it first using the table creation scripts.

**Error:** `ValidationException`
- **Solution:** Check that the table has `category` and `city` attributes. These should be top-level attributes on business items.

**GSI Status Stuck on CREATING**
- Wait up to 10 minutes for large tables
- Check AWS Console for any errors
- Verify table has data (empty tables may take longer)
- Check AWS service health status

**Notes:**
- GSI creation is **idempotent** - running the script multiple times is safe
- The script checks if the GSI exists before creating it
- GSI creation can take 2-5 minutes depending on table size
- The GSI is required for efficient category-location queries
- Without the GSI, category search will fall back to Scan (slower)

## Data Normalization

### Phone Numbers

All phone numbers are normalized to E.164 format:
- Input: `+1 555-123-4567`, `(555) 123-4567`, `5551234567`
- Stored: `+15551234567`

### Usernames

All usernames are normalized to lowercase:
- Input: `JohnDoe`, `JOHNDOE`, `johndoe`
- Stored: `johndoe`

## Indexes

### Why GSIs?

1. **username-index**: Enables fast username lookups without scanning the entire Users table
2. **phoneNumber-index**: Enables fast phone number lookups for duplicate checking
3. **userId-index** (Sessions): Enables querying all sessions for a specific user

## TTL (Time To Live)

DynamoDB TTL is used for automatic cleanup:

1. **OTPVerifications**: OTPs expire after 10 minutes
2. **Sessions**: Sessions expire after 1 day (default) or 30 days (remember me)

TTL is handled automatically by DynamoDB - expired items are deleted without additional cost.

## Backup and Recovery

For production environments, consider:

1. **Point-in-Time Recovery**: Enable for critical tables
2. **On-Demand Backup**: Create regular backups
3. **Cross-Region Replication**: For disaster recovery

## Cost Optimization

Current configuration uses **Provisioned Capacity**:
- Read: 5 RCU per table
- Write: 5 WCU per table

For production, consider:
- **On-Demand Capacity**: Pay per request, no capacity planning
- **Auto Scaling**: Automatically adjust capacity based on traffic
- **Reserved Capacity**: For predictable workloads

## Security

1. **IAM Policies**: Ensure AWS credentials have minimal required permissions:
   - `dynamodb:PutItem`
   - `dynamodb:GetItem`
   - `dynamodb:UpdateItem`
   - `dynamodb:DeleteItem`
   - `dynamodb:Query`
   - `dynamodb:Scan` (if needed)

2. **Encryption**: Enable encryption at rest for production tables

3. **VPC Endpoints**: Use VPC endpoints for private access (if applicable)

## Monitoring

Monitor the following metrics:
- **Consumed Read Capacity Units**: Track read usage
- **Consumed Write Capacity Units**: Track write usage
- **Throttled Requests**: Indicates capacity issues
- **TTL Deletions**: Monitor automatic cleanup

Use CloudWatch to set up alarms for capacity and throttling.

