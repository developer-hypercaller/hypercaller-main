#!/bin/bash

# DynamoDB Search Tables Creation Script for Singapore Region (ap-southeast-1)
# Run this script after configuring AWS CLI credentials

REGION="ap-southeast-1"

echo "Creating DynamoDB search tables in Singapore region ($REGION)..."

# Table 1: Businesses
echo "Creating Businesses table..."
aws dynamodb create-table \
  --table-name Businesses \
  --attribute-definitions \
    AttributeName=businessId,AttributeType=S \
    AttributeName=industry,AttributeType=S \
    AttributeName=location,AttributeType=S \
    AttributeName=createdAt,AttributeType=N \
  --key-schema \
    AttributeName=businessId,KeyType=HASH \
  --global-secondary-indexes \
    "[
      {
        \"IndexName\": \"industry-index\",
        \"KeySchema\": [
          {\"AttributeName\": \"industry\", \"KeyType\": \"HASH\"},
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
        \"IndexName\": \"location-index\",
        \"KeySchema\": [
          {\"AttributeName\": \"location\", \"KeyType\": \"HASH\"},
          {\"AttributeName\": \"createdAt\", \"KeyType\": \"RANGE\"}
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
    AttributeName=embeddingVersion,AttributeType=S \
  --key-schema \
    AttributeName=businessId,KeyType=HASH \
    AttributeName=embeddingVersion,KeyType=RANGE \
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
    AttributeName=userId,AttributeType=S \
    AttributeName=createdAt,AttributeType=N \
  --key-schema \
    AttributeName=queryId,KeyType=HASH \
  --global-secondary-indexes \
    "[
      {
        \"IndexName\": \"userId-index\",
        \"KeySchema\": [
          {\"AttributeName\": \"userId\", \"KeyType\": \"HASH\"},
          {\"AttributeName\": \"createdAt\", \"KeyType\": \"RANGE\"}
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

echo "Waiting for SearchQueries table to be active..."
aws dynamodb wait table-exists --table-name SearchQueries --region $REGION

# Table 4: UserSearchHistory
echo "Creating UserSearchHistory table..."
aws dynamodb create-table \
  --table-name UserSearchHistory \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=createdAt,AttributeType=N \
    AttributeName=searchId,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=createdAt,KeyType=RANGE \
  --global-secondary-indexes \
    "[
      {
        \"IndexName\": \"searchId-index\",
        \"KeySchema\": [
          {\"AttributeName\": \"searchId\", \"KeyType\": \"HASH\"}
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

echo "Waiting for UserSearchHistory table to be active..."
aws dynamodb wait table-exists --table-name UserSearchHistory --region $REGION

# Table 5: GeocodingCache
echo "Creating GeocodingCache table..."
aws dynamodb create-table \
  --table-name GeocodingCache \
  --attribute-definitions \
    AttributeName=addressKey,AttributeType=S \
    AttributeName=createdAt,AttributeType=N \
  --key-schema \
    AttributeName=addressKey,KeyType=HASH \
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
    AttributeName=createdAt,AttributeType=N \
  --key-schema \
    AttributeName=queryHash,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region $REGION

echo "Waiting for QueryEmbeddingCache table to be active..."
aws dynamodb wait table-exists --table-name QueryEmbeddingCache --region $REGION

echo ""
echo "All search tables created successfully!"
echo ""
echo "Tables created:"
echo "1. Businesses (with industry-index and location-index GSIs)"
echo "2. BusinessEmbeddings (composite key: businessId + embeddingVersion)"
echo "3. SearchQueries (with userId-index GSI)"
echo "4. UserSearchHistory (composite key: userId + createdAt, with searchId-index GSI)"
echo "5. GeocodingCache"
echo "6. QueryEmbeddingCache"
echo ""
echo "Note: The Users table already exists. To add 'locationLastUpdated' attribute,"
echo "      DynamoDB is schema-less, so you can add this attribute when updating user records."
echo "      No table modification is needed."

