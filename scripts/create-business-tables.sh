#!/bin/bash

# DynamoDB Table Creation Script for Business Search System
# Run this script after configuring AWS CLI credentials

REGION="ap-southeast-1"

echo "Creating DynamoDB tables for business search system in Singapore region ($REGION)..."

# Table 1: Businesses
echo "Creating Businesses table..."
aws dynamodb create-table \
  --table-name Businesses \
  --attribute-definitions \
    AttributeName=businessId,AttributeType=S \
    AttributeName=category,AttributeType=S \
    AttributeName=city,AttributeType=S \
    AttributeName=state,AttributeType=S \
    AttributeName=rating,AttributeType=N \
    AttributeName=ownerId,AttributeType=S \
    AttributeName=status,AttributeType=S \
    AttributeName=createdAt,AttributeType=N \
    AttributeName=updatedAt,AttributeType=N \
  --key-schema \
    AttributeName=businessId,KeyType=HASH \
  --global-secondary-indexes \
    "[
      {
        \"IndexName\": \"category-location-index\",
        \"KeySchema\": [
          {\"AttributeName\": \"category\", \"KeyType\": \"HASH\"},
          {\"AttributeName\": \"city\", \"KeyType\": \"RANGE\"}
        ],
        \"Projection\": {
          \"ProjectionType\": \"ALL\"
        },
        \"ProvisionedThroughput\": {
          \"ReadCapacityUnits\": 5,
          \"WriteCapacityUnits\": 5
        }
      },
      {
        \"IndexName\": \"location-index\",
        \"KeySchema\": [
          {\"AttributeName\": \"city\", \"KeyType\": \"HASH\"},
          {\"AttributeName\": \"state\", \"KeyType\": \"RANGE\"}
        ],
        \"Projection\": {
          \"ProjectionType\": \"ALL\"
        },
        \"ProvisionedThroughput\": {
          \"ReadCapacityUnits\": 5,
          \"WriteCapacityUnits\": 5
        }
      },
      {
        \"IndexName\": \"rating-index\",
        \"KeySchema\": [
          {\"AttributeName\": \"category\", \"KeyType\": \"HASH\"},
          {\"AttributeName\": \"rating\", \"KeyType\": \"RANGE\"}
        ],
        \"Projection\": {
          \"ProjectionType\": \"ALL\"
        },
        \"ProvisionedThroughput\": {
          \"ReadCapacityUnits\": 5,
          \"WriteCapacityUnits\": 5
        }
      },
      {
        \"IndexName\": \"ownerId-index\",
        \"KeySchema\": [
          {\"AttributeName\": \"ownerId\", \"KeyType\": \"HASH\"},
          {\"AttributeName\": \"createdAt\", \"KeyType\": \"RANGE\"}
        ],
        \"Projection\": {
          \"ProjectionType\": \"ALL\"
        },
        \"ProvisionedThroughput\": {
          \"ReadCapacityUnits\": 5,
          \"WriteCapacityUnits\": 5
        }
      },
      {
        \"IndexName\": \"status-index\",
        \"KeySchema\": [
          {\"AttributeName\": \"status\", \"KeyType\": \"HASH\"},
          {\"AttributeName\": \"updatedAt\", \"KeyType\": \"RANGE\"}
        ],
        \"Projection\": {
          \"ProjectionType\": \"ALL\"
        },
        \"ProvisionedThroughput\": {
          \"ReadCapacityUnits\": 5,
          \"WriteCapacityUnits\": 5
        }
      }
    ]" \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region $REGION

echo "Waiting for Businesses table to be active..."
aws dynamodb wait table-exists --table-name Businesses --region $REGION

# Table 2: BusinessEmbeddings
echo "Creating BusinessEmbeddings table..."
aws dynamodb create-table \
  --table-name BusinessEmbeddings \
  --attribute-definitions \
    AttributeName=businessId,AttributeType=S \
  --key-schema \
    AttributeName=businessId,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region $REGION

echo "Waiting for BusinessEmbeddings table to be active..."
aws dynamodb wait table-exists --table-name BusinessEmbeddings --region $REGION

# Table 3: SearchQueries
echo "Creating SearchQueries table..."
aws dynamodb create-table \
  --table-name SearchQueries \
  --attribute-definitions \
    AttributeName=queryId,AttributeType=S \
    AttributeName=timestamp,AttributeType=N \
  --key-schema \
    AttributeName=queryId,KeyType=HASH \
  --global-secondary-indexes \
    "[
      {
        \"IndexName\": \"timestamp-index\",
        \"KeySchema\": [
          {\"AttributeName\": \"timestamp\", \"KeyType\": \"HASH\"}
        ],
        \"Projection\": {
          \"ProjectionType\": \"ALL\"
        },
        \"ProvisionedThroughput\": {
          \"ReadCapacityUnits\": 5,
          \"WriteCapacityUnits\": 5
        }
      }
    ]" \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --time-to-live-specification Enabled=true,AttributeName=ttl \
  --region $REGION

echo "Waiting for SearchQueries table to be active..."
aws dynamodb wait table-exists --table-name SearchQueries --region $REGION

# Table 4: UserSearchHistory
echo "Creating UserSearchHistory table..."
aws dynamodb create-table \
  --table-name UserSearchHistory \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=timestamp,AttributeType=N \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=timestamp,KeyType=RANGE \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region $REGION

echo "Waiting for UserSearchHistory table to be active..."
aws dynamodb wait table-exists --table-name UserSearchHistory --region $REGION

# Table 5: GeocodingCache
echo "Creating GeocodingCache table..."
aws dynamodb create-table \
  --table-name GeocodingCache \
  --attribute-definitions \
    AttributeName=locationHash,AttributeType=S \
  --key-schema \
    AttributeName=locationHash,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region $REGION

echo "Waiting for GeocodingCache table to be active..."
aws dynamodb wait table-exists --table-name GeocodingCache --region $REGION

# Table 6: QueryEmbeddingCache
echo "Creating QueryEmbeddingCache table..."
aws dynamodb create-table \
  --table-name QueryEmbeddingCache \
  --attribute-definitions \
    AttributeName=queryHash,AttributeType=S \
  --key-schema \
    AttributeName=queryHash,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --time-to-live-specification Enabled=true,AttributeName=ttl \
  --region $REGION

echo "Waiting for QueryEmbeddingCache table to be active..."
aws dynamodb wait table-exists --table-name QueryEmbeddingCache --region $REGION

echo "All business search tables created successfully!"
echo ""
echo "Tables created:"
echo "1. Businesses (with 5 GSIs: category-location-index, location-index, rating-index, ownerId-index, status-index)"
echo "2. BusinessEmbeddings"
echo "3. SearchQueries (with timestamp-index GSI and TTL)"
echo "4. UserSearchHistory"
echo "5. GeocodingCache"
echo "6. QueryEmbeddingCache (with TTL)"

