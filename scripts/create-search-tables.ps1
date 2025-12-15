# DynamoDB Search Tables Creation Script for Singapore Region (ap-southeast-1)
# PowerShell script for Windows
# Run this script after configuring AWS CLI credentials

$REGION = "ap-southeast-1"

Write-Host "Creating DynamoDB search tables in Singapore region ($REGION)..." -ForegroundColor Green

# Helper function to create table from JSON
function Create-TableFromJson {
    param(
        [string]$TableName,
        [string]$JsonContent
    )
    
    $tempFile = Join-Path $env:TEMP "$TableName-table.json"
    try {
        # Write JSON to temp file with UTF-8 encoding (no BOM)
        [System.IO.File]::WriteAllText($tempFile, $JsonContent, [System.Text.UTF8Encoding]::new($false))
        
        # Use file path for AWS CLI (Windows format)
        $filePath = $tempFile -replace '\\', '/'
        aws dynamodb create-table --cli-input-json "file://$filePath" --region $REGION
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Waiting for $TableName table to be active..." -ForegroundColor Yellow
            aws dynamodb wait table-exists --table-name $TableName --region $REGION
        }
    }
    finally {
        if (Test-Path $tempFile) {
            Remove-Item $tempFile -ErrorAction SilentlyContinue
        }
    }
}

# Table 1: Businesses
Write-Host "Creating Businesses table..." -ForegroundColor Yellow
$businessesTableJson = @'
{
    "TableName": "Businesses",
    "AttributeDefinitions": [
        {"AttributeName": "businessId", "AttributeType": "S"},
        {"AttributeName": "industry", "AttributeType": "S"},
        {"AttributeName": "location", "AttributeType": "S"},
        {"AttributeName": "createdAt", "AttributeType": "N"}
    ],
    "KeySchema": [
        {"AttributeName": "businessId", "KeyType": "HASH"}
    ],
    "GlobalSecondaryIndexes": [
        {
            "IndexName": "industry-index",
            "KeySchema": [
                {"AttributeName": "industry", "KeyType": "HASH"},
                {"AttributeName": "createdAt", "KeyType": "RANGE"}
            ],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {
                "ReadCapacityUnits": 5,
                "WriteCapacityUnits": 5
            }
        },
        {
            "IndexName": "location-index",
            "KeySchema": [
                {"AttributeName": "location", "KeyType": "HASH"},
                {"AttributeName": "createdAt", "KeyType": "RANGE"}
            ],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {
                "ReadCapacityUnits": 5,
                "WriteCapacityUnits": 5
            }
        }
    ],
    "ProvisionedThroughput": {
        "ReadCapacityUnits": 5,
        "WriteCapacityUnits": 5
    }
}
'@

Create-TableFromJson -TableName "Businesses" -JsonContent $businessesTableJson

# Table 2: BusinessEmbeddings
Write-Host "Creating BusinessEmbeddings table..." -ForegroundColor Yellow
$businessEmbeddingsTableJson = @'
{
    "TableName": "BusinessEmbeddings",
    "AttributeDefinitions": [
        {"AttributeName": "businessId", "AttributeType": "S"},
        {"AttributeName": "embeddingVersion", "AttributeType": "S"}
    ],
    "KeySchema": [
        {"AttributeName": "businessId", "KeyType": "HASH"},
        {"AttributeName": "embeddingVersion", "KeyType": "RANGE"}
    ],
    "ProvisionedThroughput": {
        "ReadCapacityUnits": 5,
        "WriteCapacityUnits": 5
    }
}
'@

Create-TableFromJson -TableName "BusinessEmbeddings" -JsonContent $businessEmbeddingsTableJson

# Table 3: SearchQueries
Write-Host "Creating SearchQueries table..." -ForegroundColor Yellow
$searchQueriesTableJson = @'
{
    "TableName": "SearchQueries",
    "AttributeDefinitions": [
        {"AttributeName": "queryId", "AttributeType": "S"},
        {"AttributeName": "userId", "AttributeType": "S"},
        {"AttributeName": "createdAt", "AttributeType": "N"}
    ],
    "KeySchema": [
        {"AttributeName": "queryId", "KeyType": "HASH"}
    ],
    "GlobalSecondaryIndexes": [
        {
            "IndexName": "userId-index",
            "KeySchema": [
                {"AttributeName": "userId", "KeyType": "HASH"},
                {"AttributeName": "createdAt", "KeyType": "RANGE"}
            ],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {
                "ReadCapacityUnits": 5,
                "WriteCapacityUnits": 5
            }
        }
    ],
    "ProvisionedThroughput": {
        "ReadCapacityUnits": 5,
        "WriteCapacityUnits": 5
    }
}
'@

Create-TableFromJson -TableName "SearchQueries" -JsonContent $searchQueriesTableJson

# Table 4: UserSearchHistory
Write-Host "Creating UserSearchHistory table..." -ForegroundColor Yellow
$userSearchHistoryTableJson = @'
{
    "TableName": "UserSearchHistory",
    "AttributeDefinitions": [
        {"AttributeName": "userId", "AttributeType": "S"},
        {"AttributeName": "createdAt", "AttributeType": "N"},
        {"AttributeName": "searchId", "AttributeType": "S"}
    ],
    "KeySchema": [
        {"AttributeName": "userId", "KeyType": "HASH"},
        {"AttributeName": "createdAt", "KeyType": "RANGE"}
    ],
    "GlobalSecondaryIndexes": [
        {
            "IndexName": "searchId-index",
            "KeySchema": [
                {"AttributeName": "searchId", "KeyType": "HASH"}
            ],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {
                "ReadCapacityUnits": 5,
                "WriteCapacityUnits": 5
            }
        }
    ],
    "ProvisionedThroughput": {
        "ReadCapacityUnits": 5,
        "WriteCapacityUnits": 5
    }
}
'@

Create-TableFromJson -TableName "UserSearchHistory" -JsonContent $userSearchHistoryTableJson

# Table 5: GeocodingCache
Write-Host "Creating GeocodingCache table..." -ForegroundColor Yellow
$geocodingCacheTableJson = @'
{
    "TableName": "GeocodingCache",
    "AttributeDefinitions": [
        {"AttributeName": "addressKey", "AttributeType": "S"}
    ],
    "KeySchema": [
        {"AttributeName": "addressKey", "KeyType": "HASH"}
    ],
    "ProvisionedThroughput": {
        "ReadCapacityUnits": 5,
        "WriteCapacityUnits": 5
    }
}
'@

Create-TableFromJson -TableName "GeocodingCache" -JsonContent $geocodingCacheTableJson

# Table 6: QueryEmbeddingCache
Write-Host "Creating QueryEmbeddingCache table..." -ForegroundColor Yellow
$queryEmbeddingCacheTableJson = @'
{
    "TableName": "QueryEmbeddingCache",
    "AttributeDefinitions": [
        {"AttributeName": "queryHash", "AttributeType": "S"}
    ],
    "KeySchema": [
        {"AttributeName": "queryHash", "KeyType": "HASH"}
    ],
    "ProvisionedThroughput": {
        "ReadCapacityUnits": 5,
        "WriteCapacityUnits": 5
    }
}
'@

Create-TableFromJson -TableName "QueryEmbeddingCache" -JsonContent $queryEmbeddingCacheTableJson

Write-Host "" -ForegroundColor Green
Write-Host "All search tables created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Tables created:" -ForegroundColor Cyan
Write-Host "1. Businesses (with industry-index and location-index GSIs)"
Write-Host "2. BusinessEmbeddings (composite key: businessId + embeddingVersion)"
Write-Host "3. SearchQueries (with userId-index GSI)"
Write-Host "4. UserSearchHistory (composite key: userId + createdAt, with searchId-index GSI)"
Write-Host "5. GeocodingCache"
Write-Host "6. QueryEmbeddingCache"
Write-Host ""
Write-Host "Note: The Users table already exists. To add 'locationLastUpdated' attribute," -ForegroundColor Yellow
Write-Host "      DynamoDB is schema-less, so you can add this attribute when updating user records." -ForegroundColor Yellow
Write-Host "      No table modification is needed." -ForegroundColor Yellow
