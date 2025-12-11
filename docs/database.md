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

