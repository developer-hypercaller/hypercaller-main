# DynamoDB EmbeddingStatus Table Creation Script
# PowerShell script for Windows
# Run this script after configuring AWS CLI credentials

$REGION = "ap-southeast-1"

Write-Host "Creating EmbeddingStatus table in Singapore region ($REGION)..." -ForegroundColor Green

# Table: EmbeddingStatus
Write-Host "Creating EmbeddingStatus table..." -ForegroundColor Yellow
aws dynamodb create-table `
  --table-name EmbeddingStatus `
  --attribute-definitions `
    AttributeName=businessId,AttributeType=S `
    AttributeName=version,AttributeType=S `
    AttributeName=status,AttributeType=S `
  --key-schema `
    AttributeName=businessId,KeyType=HASH `
    AttributeName=version,KeyType=RANGE `
  --global-secondary-indexes `
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
    ]" `
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 `
  --region $REGION

Write-Host "Waiting for EmbeddingStatus table to be active..." -ForegroundColor Yellow
aws dynamodb wait table-exists --table-name EmbeddingStatus --region $REGION

Write-Host "EmbeddingStatus table created successfully!" -ForegroundColor Green
