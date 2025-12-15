#!/bin/bash

# DynamoDB UserPreferredCategories table creation (ap-southeast-1)
# Usage: ./scripts/create-user-preferred-categories.sh

REGION="ap-southeast-1"
TABLE="UserPreferredCategories"

echo "Creating $TABLE table in region $REGION (PAY_PER_REQUEST)..."

aws dynamodb create-table \
  --table-name "$TABLE" \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=categoryId,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=categoryId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region "$REGION"

echo "Waiting for $TABLE table to be active..."
aws dynamodb wait table-exists --table-name "$TABLE" --region "$REGION"

echo "Done. Table $TABLE is active."


