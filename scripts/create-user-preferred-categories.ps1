Param(
  [string]$Region = "ap-southeast-1"
)

$Table = "UserPreferredCategories"

Write-Host "Creating $Table table in region $Region (PAY_PER_REQUEST)..."

aws dynamodb create-table `
  --table-name $Table `
  --attribute-definitions `
    AttributeName=userId,AttributeType=S `
    AttributeName=categoryId,AttributeType=S `
  --key-schema `
    AttributeName=userId,KeyType=HASH `
    AttributeName=categoryId,KeyType=RANGE `
  --billing-mode PAY_PER_REQUEST `
  --region $Region

Write-Host "Waiting for $Table table to be active..."
aws dynamodb wait table-exists --table-name $Table --region $Region

Write-Host "Done. Table $Table is active."


