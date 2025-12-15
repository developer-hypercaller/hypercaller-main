# DynamoDB Table Creation Script for Business Search System
# PowerShell script for Windows
# Run this script after configuring AWS CLI credentials

$REGION = "ap-southeast-1"

Write-Host "Creating DynamoDB tables for business search system in Singapore region ($REGION)..." -ForegroundColor Green

# Table 1: Businesses
Write-Host "Creating Businesses table..." -ForegroundColor Yellow
$businessesTable = @{
    TableName = "Businesses"
    AttributeDefinitions = @(
        @{AttributeName = "businessId"; AttributeType = "S"}
        @{AttributeName = "category"; AttributeType = "S"}
        @{AttributeName = "city"; AttributeType = "S"}
        @{AttributeName = "state"; AttributeType = "S"}
        @{AttributeName = "rating"; AttributeType = "N"}
        @{AttributeName = "ownerId"; AttributeType = "S"}
        @{AttributeName = "status"; AttributeType = "S"}
        @{AttributeName = "createdAt"; AttributeType = "N"}
        @{AttributeName = "updatedAt"; AttributeType = "N"}
    )
    KeySchema = @(
        @{AttributeName = "businessId"; KeyType = "HASH"}
    )
    GlobalSecondaryIndexes = @(
        @{
            IndexName = "category-location-index"
            KeySchema = @(
                @{AttributeName = "category"; KeyType = "HASH"}
                @{AttributeName = "city"; KeyType = "RANGE"}
            )
            Projection = @{ProjectionType = "ALL"}
            ProvisionedThroughput = @{
                ReadCapacityUnits = 5
                WriteCapacityUnits = 5
            }
        },
        @{
            IndexName = "location-index"
            KeySchema = @(
                @{AttributeName = "city"; KeyType = "HASH"}
                @{AttributeName = "state"; KeyType = "RANGE"}
            )
            Projection = @{ProjectionType = "ALL"}
            ProvisionedThroughput = @{
                ReadCapacityUnits = 5
                WriteCapacityUnits = 5
            }
        },
        @{
            IndexName = "rating-index"
            KeySchema = @(
                @{AttributeName = "category"; KeyType = "HASH"}
                @{AttributeName = "rating"; KeyType = "RANGE"}
            )
            Projection = @{ProjectionType = "ALL"}
            ProvisionedThroughput = @{
                ReadCapacityUnits = 5
                WriteCapacityUnits = 5
            }
        },
        @{
            IndexName = "ownerId-index"
            KeySchema = @(
                @{AttributeName = "ownerId"; KeyType = "HASH"}
                @{AttributeName = "createdAt"; KeyType = "RANGE"}
            )
            Projection = @{ProjectionType = "ALL"}
            ProvisionedThroughput = @{
                ReadCapacityUnits = 5
                WriteCapacityUnits = 5
            }
        },
        @{
            IndexName = "status-index"
            KeySchema = @(
                @{AttributeName = "status"; KeyType = "HASH"}
                @{AttributeName = "updatedAt"; KeyType = "RANGE"}
            )
            Projection = @{ProjectionType = "ALL"}
            ProvisionedThroughput = @{
                ReadCapacityUnits = 5
                WriteCapacityUnits = 5
            }
        }
    )
    ProvisionedThroughput = @{
        ReadCapacityUnits = 5
        WriteCapacityUnits = 5
    }
}

aws dynamodb create-table --cli-input-json ($businessesTable | ConvertTo-Json -Depth 10) --region $REGION

Write-Host "Waiting for Businesses table to be active..." -ForegroundColor Yellow
aws dynamodb wait table-exists --table-name Businesses --region $REGION

# Table 2: BusinessEmbeddings
Write-Host "Creating BusinessEmbeddings table..." -ForegroundColor Yellow
$embeddingsTable = @{
    TableName = "BusinessEmbeddings"
    AttributeDefinitions = @(
        @{AttributeName = "businessId"; AttributeType = "S"}
    )
    KeySchema = @(
        @{AttributeName = "businessId"; KeyType = "HASH"}
    )
    ProvisionedThroughput = @{
        ReadCapacityUnits = 5
        WriteCapacityUnits = 5
    }
}

aws dynamodb create-table --cli-input-json ($embeddingsTable | ConvertTo-Json -Depth 10) --region $REGION

Write-Host "Waiting for BusinessEmbeddings table to be active..." -ForegroundColor Yellow
aws dynamodb wait table-exists --table-name BusinessEmbeddings --region $REGION

# Table 3: SearchQueries
Write-Host "Creating SearchQueries table..." -ForegroundColor Yellow
$searchQueriesTable = @{
    TableName = "SearchQueries"
    AttributeDefinitions = @(
        @{AttributeName = "queryId"; AttributeType = "S"}
        @{AttributeName = "timestamp"; AttributeType = "N"}
    )
    KeySchema = @(
        @{AttributeName = "queryId"; KeyType = "HASH"}
    )
    GlobalSecondaryIndexes = @(
        @{
            IndexName = "timestamp-index"
            KeySchema = @(
                @{AttributeName = "timestamp"; KeyType = "HASH"}
            )
            Projection = @{ProjectionType = "ALL"}
            ProvisionedThroughput = @{
                ReadCapacityUnits = 5
                WriteCapacityUnits = 5
            }
        }
    )
    ProvisionedThroughput = @{
        ReadCapacityUnits = 5
        WriteCapacityUnits = 5
    }
    TimeToLiveSpecification = @{
        Enabled = $true
        AttributeName = "ttl"
    }
}

aws dynamodb create-table --cli-input-json ($searchQueriesTable | ConvertTo-Json -Depth 10) --region $REGION

Write-Host "Waiting for SearchQueries table to be active..." -ForegroundColor Yellow
aws dynamodb wait table-exists --table-name SearchQueries --region $REGION

# Table 4: UserSearchHistory
Write-Host "Creating UserSearchHistory table..." -ForegroundColor Yellow
$userSearchHistoryTable = @{
    TableName = "UserSearchHistory"
    AttributeDefinitions = @(
        @{AttributeName = "userId"; AttributeType = "S"}
        @{AttributeName = "timestamp"; AttributeType = "N"}
    )
    KeySchema = @(
        @{AttributeName = "userId"; KeyType = "HASH"}
        @{AttributeName = "timestamp"; KeyType = "RANGE"}
    )
    ProvisionedThroughput = @{
        ReadCapacityUnits = 5
        WriteCapacityUnits = 5
    }
}

aws dynamodb create-table --cli-input-json ($userSearchHistoryTable | ConvertTo-Json -Depth 10) --region $REGION

Write-Host "Waiting for UserSearchHistory table to be active..." -ForegroundColor Yellow
aws dynamodb wait table-exists --table-name UserSearchHistory --region $REGION

# Table 5: GeocodingCache
Write-Host "Creating GeocodingCache table..." -ForegroundColor Yellow
$geocodingCacheTable = @{
    TableName = "GeocodingCache"
    AttributeDefinitions = @(
        @{AttributeName = "locationHash"; AttributeType = "S"}
    )
    KeySchema = @(
        @{AttributeName = "locationHash"; KeyType = "HASH"}
    )
    ProvisionedThroughput = @{
        ReadCapacityUnits = 5
        WriteCapacityUnits = 5
    }
}

aws dynamodb create-table --cli-input-json ($geocodingCacheTable | ConvertTo-Json -Depth 10) --region $REGION

Write-Host "Waiting for GeocodingCache table to be active..." -ForegroundColor Yellow
aws dynamodb wait table-exists --table-name GeocodingCache --region $REGION

# Table 6: QueryEmbeddingCache
Write-Host "Creating QueryEmbeddingCache table..." -ForegroundColor Yellow
$queryEmbeddingCacheTable = @{
    TableName = "QueryEmbeddingCache"
    AttributeDefinitions = @(
        @{AttributeName = "queryHash"; AttributeType = "S"}
    )
    KeySchema = @(
        @{AttributeName = "queryHash"; KeyType = "HASH"}
    )
    ProvisionedThroughput = @{
        ReadCapacityUnits = 5
        WriteCapacityUnits = 5
    }
    TimeToLiveSpecification = @{
        Enabled = $true
        AttributeName = "ttl"
    }
}

aws dynamodb create-table --cli-input-json ($queryEmbeddingCacheTable | ConvertTo-Json -Depth 10) --region $REGION

Write-Host "Waiting for QueryEmbeddingCache table to be active..." -ForegroundColor Yellow
aws dynamodb wait table-exists --table-name QueryEmbeddingCache --region $REGION

Write-Host "All business search tables created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Tables created:" -ForegroundColor Cyan
Write-Host "1. Businesses (with 5 GSIs: category-location-index, location-index, rating-index, ownerId-index, status-index)"
Write-Host "2. BusinessEmbeddings"
Write-Host "3. SearchQueries (with timestamp-index GSI and TTL)"
Write-Host "4. UserSearchHistory"
Write-Host "5. GeocodingCache"
Write-Host "6. QueryEmbeddingCache (with TTL)"

