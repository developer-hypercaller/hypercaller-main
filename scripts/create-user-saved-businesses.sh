#!/bin/bash

# DynamoDB UserSavedBusinesses Table Creation Script for Singapore Region (ap-southeast-1)
# Run this script after configuring AWS CLI credentials

REGION="ap-southeast-1"
TABLE_NAME="UserSavedBusinesses"

echo "Creating $TABLE_NAME table in region $REGION (PAY_PER_REQUEST)..."

aws dynamodb create-table \
  --table-name $TABLE_NAME \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=createdAt,AttributeType=N \
    AttributeName=businessId,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=createdAt,KeyType=RANGE \
  --global-secondary-indexes \
    "[
      {
        \"IndexName\": \"business-index\",
        \"KeySchema\": [
          {\"AttributeName\": \"userId\", \"KeyType\": \"HASH\"},
          {\"AttributeName\": \"businessId\", \"KeyType\": \"RANGE\"}
        ],
        \"Projection\": {
          \"ProjectionType\": \"ALL\"
        }
      }
    ]" \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION

echo "Waiting for $TABLE_NAME table to be active..."
aws dynamodb wait table-exists --table-name $TABLE_NAME --region $REGION

echo "Done. Table $TABLE_NAME is active."

