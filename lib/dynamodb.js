const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const { logDebug } = require("./debug-logger");

// #region agent log
logDebug('lib/dynamodb.js:6', 'DynamoDB client initialization start', {hasAccessKey:!!process.env.AWS_ACCESS_KEY_ID,hasSecretKey:!!process.env.AWS_SECRET_ACCESS_KEY,region:process.env.AWS_REGION||'ap-southeast-1'}, 'A');
// #endregion

// Initialize DynamoDB client for Singapore region
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-southeast-1",
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined, // Will use default credential provider chain if not set
});

// #region agent log
logDebug('lib/dynamodb.js:18', 'DynamoDB client created', {hasCredentials:!!client.config.credentials,region:client.config.region}, 'A');
// #endregion

const dynamoClient = DynamoDBDocumentClient.from(client);

module.exports = { dynamoClient };

