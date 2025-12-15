# DynamoDB Table Creation Script for Singapore Region (ap-southeast-1)
# PowerShell script for Windows
# Run this script after configuring AWS CLI credentials

$REGION = "ap-southeast-1"

Write-Host "Creating DynamoDB tables in Singapore region ($REGION)..." -ForegroundColor Green

# Table 1: Users
Write-Host "Creating Users table..." -ForegroundColor Yellow
$usersTable = @{
    TableName = "Users"
    AttributeDefinitions = @(
        @{AttributeName = "userId"; AttributeType = "S"}
        @{AttributeName = "username"; AttributeType = "S"}
        @{AttributeName = "phoneNumber"; AttributeType = "S"}
    )
    KeySchema = @(
        @{AttributeName = "userId"; KeyType = "HASH"}
    )
    GlobalSecondaryIndexes = @(
        @{
            IndexName = "username-index"
            KeySchema = @(
                @{AttributeName = "username"; KeyType = "HASH"}
            )
            Projection = @{ProjectionType = "ALL"}
            ProvisionedThroughput = @{
                ReadCapacityUnits = 5
                WriteCapacityUnits = 5
            }
        },
        @{
            IndexName = "phoneNumber-index"
            KeySchema = @(
                @{AttributeName = "phoneNumber"; KeyType = "HASH"}
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

aws dynamodb create-table --cli-input-json ($usersTable | ConvertTo-Json -Depth 10) --region $REGION

Write-Host "Waiting for Users table to be active..." -ForegroundColor Yellow
aws dynamodb wait table-exists --table-name Users --region $REGION

# Table 2: OTPVerifications
Write-Host "Creating OTPVerifications table..." -ForegroundColor Yellow
$otpTable = @{
    TableName = "OTPVerifications"
    AttributeDefinitions = @(
        @{AttributeName = "phoneNumber"; AttributeType = "S"}
        @{AttributeName = "createdAt"; AttributeType = "N"}
    )
    KeySchema = @(
        @{AttributeName = "phoneNumber"; KeyType = "HASH"}
        @{AttributeName = "createdAt"; KeyType = "RANGE"}
    )
    ProvisionedThroughput = @{
        ReadCapacityUnits = 5
        WriteCapacityUnits = 5
    }
}

aws dynamodb create-table --cli-input-json ($otpTable | ConvertTo-Json -Depth 10) --region $REGION

Write-Host "Waiting for OTPVerifications table to be active..." -ForegroundColor Yellow
aws dynamodb wait table-exists --table-name OTPVerifications --region $REGION

# Table 3: Sessions
Write-Host "Creating Sessions table..." -ForegroundColor Yellow
$sessionsTable = @{
    TableName = "Sessions"
    AttributeDefinitions = @(
        @{AttributeName = "sessionId"; AttributeType = "S"}
        @{AttributeName = "userId"; AttributeType = "S"}
        @{AttributeName = "createdAt"; AttributeType = "N"}
    )
    KeySchema = @(
        @{AttributeName = "sessionId"; KeyType = "HASH"}
    )
    GlobalSecondaryIndexes = @(
        @{
            IndexName = "userId-index"
            KeySchema = @(
                @{AttributeName = "userId"; KeyType = "HASH"}
                @{AttributeName = "createdAt"; KeyType = "RANGE"}
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

aws dynamodb create-table --cli-input-json ($sessionsTable | ConvertTo-Json -Depth 10) --region $REGION

Write-Host "Waiting for Sessions table to be active..." -ForegroundColor Yellow
aws dynamodb wait table-exists --table-name Sessions --region $REGION

Write-Host "All tables created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Tables created:" -ForegroundColor Cyan
Write-Host "1. Users (with username-index and phoneNumber-index GSIs)"
Write-Host "2. OTPVerifications"
Write-Host "3. Sessions (with userId-index GSI and TTL)"

