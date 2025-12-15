Param(
  [string]$Region = "ap-southeast-1"
)

$Table = "UserSavedBusinesses"

Write-Host "Creating $Table table in region $Region (PAY_PER_REQUEST)..."

$gsiJson = '[{"IndexName":"business-index","KeySchema":[{"AttributeName":"userId","KeyType":"HASH"},{"AttributeName":"businessId","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]'

aws dynamodb create-table `
  --table-name $Table `
  --attribute-definitions `
    AttributeName=userId,AttributeType=S `
    AttributeName=createdAt,AttributeType=N `
    AttributeName=businessId,AttributeType=S `
  --key-schema `
    AttributeName=userId,KeyType=HASH `
    AttributeName=createdAt,KeyType=RANGE `
  --global-secondary-indexes $gsiJson `
  --billing-mode PAY_PER_REQUEST `
  --region $Region

Write-Host "Waiting for $Table table to be active..."
aws dynamodb wait table-exists --table-name $Table --region $Region

Write-Host "Done. Table $Table is active."

