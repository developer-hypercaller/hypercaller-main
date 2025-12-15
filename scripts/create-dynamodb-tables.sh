#!/bin/bash

# DynamoDB Table Creation Script for Singapore Region (ap-southeast-1)
# Run this script after configuring AWS CLI credentials

REGION="ap-southeast-1"

echo "Creating DynamoDB tables in Singapore region ($REGION)..."

# Table 1: Users
echo "Creating Users table..."
aws dynamodb create-table \
  --table-name Users \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=username,AttributeType=S \
    AttributeName=phoneNumber,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
  --global-secondary-indexes \
    "[
      {
        \"IndexName\": \"username-index\",
        \"KeySchema\": [
          {\"AttributeName\": \"username\", \"KeyType\": \"HASH\"}
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
        \"IndexName\": \"phoneNumber-index\",
        \"KeySchema\": [
          {\"AttributeName\": \"phoneNumber\", \"KeyType\": \"HASH\"}
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

echo "Waiting for Users table to be active..."
aws dynamodb wait table-exists --table-name Users --region $REGION

# Table 2: OTPVerifications
echo "Creating OTPVerifications table..."
aws dynamodb create-table \
  --table-name OTPVerifications \
  --attribute-definitions \
    AttributeName=phoneNumber,AttributeType=S \
    AttributeName=createdAt,AttributeType=N \
  --key-schema \
    AttributeName=phoneNumber,KeyType=HASH \
    AttributeName=createdAt,KeyType=RANGE \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region $REGION

echo "Waiting for OTPVerifications table to be active..."
aws dynamodb wait table-exists --table-name OTPVerifications --region $REGION

# Table 3: Sessions
echo "Creating Sessions table..."
aws dynamodb create-table \
  --table-name Sessions \
  --attribute-definitions \
    AttributeName=sessionId,AttributeType=S \
    AttributeName=userId,AttributeType=S \
    AttributeName=createdAt,AttributeType=N \
  --key-schema \
    AttributeName=sessionId,KeyType=HASH \
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
  --time-to-live-specification Enabled=true,AttributeName=ttl \
  --region $REGION

echo "Waiting for Sessions table to be active..."
aws dynamodb wait table-exists --table-name Sessions --region $REGION

echo "All tables created successfully!"
echo ""
echo "Tables created:"
echo "1. Users (with username-index and phoneNumber-index GSIs)"
echo "2. OTPVerifications"
echo "3. Sessions (with userId-index GSI and TTL)"

