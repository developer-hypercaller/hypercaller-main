#!/bin/bash

# DynamoDB EmbeddingStatus Table Creation Script
# Run this script after configuring AWS CLI credentials

REGION="ap-southeast-1"

echo "Creating EmbeddingStatus table in Singapore region ($REGION)..."

# Table: EmbeddingStatus
echo "Creating EmbeddingStatus table..."
aws dynamodb create-table \
  --table-name EmbeddingStatus \
  --attribute-definitions \
    AttributeName=businessId,AttributeType=S \
    AttributeName=version,AttributeType=S \
    AttributeName=status,AttributeType=S \
  --key-schema \
    AttributeName=businessId,KeyType=HASH \
    AttributeName=version,KeyType=RANGE \
  --global-secondary-indexes \
    "[
      {
        \"IndexName\": \"version-status-index\",
        \"KeySchema\": [
          {\"AttributeName\": \"version\", \"KeyType\": \"HASH\"},
          {\"AttributeName\": \"status\", \"KeyType\": \"RANGE\"}
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

echo "Waiting for EmbeddingStatus table to be active..."
aws dynamodb wait table-exists --table-name EmbeddingStatus --region $REGION

echo "EmbeddingStatus table created successfully!"
