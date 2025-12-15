/**
 * Embedding Status Tracking
 * Tracks which businesses have embeddings, versions, and generation status
 */

const { dynamoClient } = require("../dynamodb");
const { GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const TABLE_NAME = "EmbeddingStatus";

/**
 * Embedding status interface
 */
export interface EmbeddingStatus {
  businessId: string;
  version: string;
  status: "pending" | "processing" | "completed" | "failed";
  hasEmbedding: boolean;
  lastGenerated?: number; // Unix timestamp
  lastUpdated: number; // Unix timestamp
  error?: string;
  attempts?: number;
}

/**
 * Get current Unix timestamp
 */
function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Save or update embedding status
 */
export async function saveEmbeddingStatus(
  businessId: string,
  status: {
    version?: string;
    status?: EmbeddingStatus["status"];
    hasEmbedding?: boolean;
    error?: string;
    attempts?: number;
  }
): Promise<void> {
  try {
    // Use dynamic import to get current version
    const { getCurrentEmbeddingVersion } = require("../bedrock/embeddings");
    const version = status.version || getCurrentEmbeddingVersion();
    const now = getCurrentTimestamp();

    const statusData: any = {
      businessId,
      version,
      status: status.status || "pending",
      hasEmbedding: status.hasEmbedding || false,
      lastUpdated: now,
    };

    if (status.status === "completed") {
      statusData.lastGenerated = now;
      statusData.hasEmbedding = true;
    }

    if (status.error) {
      statusData.error = status.error;
    }

    if (status.attempts !== undefined) {
      statusData.attempts = status.attempts;
    }

    await dynamoClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: statusData,
      })
    );
  } catch (error: any) {
    console.error(`[EmbeddingStatus] Failed to save status: ${error.message}`);
    // Don't throw - status tracking is non-critical
  }
}

/**
 * Get embedding status for a business
 */
export async function getEmbeddingStatus(
  businessId: string,
  version?: string
): Promise<EmbeddingStatus | null> {
  const { getCurrentEmbeddingVersion } = require("../bedrock/embeddings");
  const versionToUse = version || getCurrentEmbeddingVersion();
  try {
    const result = await dynamoClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          businessId,
          version: versionToUse,
        },
      })
    );

    return result.Item as EmbeddingStatus | null;
  } catch (error: any) {
    console.error(`[EmbeddingStatus] Failed to get status: ${error.message}`);
    return null;
  }
}

/**
 * Get all businesses with embeddings for a version
 */
export async function getBusinessesWithEmbeddings(version?: string): Promise<string[]> {
  const { getCurrentEmbeddingVersion } = require("../bedrock/embeddings");
  const versionToUse = version || getCurrentEmbeddingVersion();
  try {
    const result = await dynamoClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "version-status-index", // Assumes GSI exists
        KeyConditionExpression: "version = :version AND #status = :status",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":version": versionToUse,
          ":status": "completed",
        },
      })
    );

    return (result.Items || []).map((item: any) => item.businessId);
  } catch (error: any) {
    // If GSI doesn't exist, fall back to scan
    if (error.name === "ResourceNotFoundException" || error.message?.includes("index")) {
      const scanResult = await dynamoClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: "version = :version AND #status = :status",
          ExpressionAttributeNames: {
            "#status": "status",
          },
          ExpressionAttributeValues: {
            ":version": versionToUse,
            ":status": "completed",
          },
        })
      );

      return (scanResult.Items || []).map((item: any) => item.businessId);
    }
    throw error;
  }
}

/**
 * Get all businesses without embeddings for a version
 */
export async function getBusinessesWithoutEmbeddings(version?: string): Promise<string[]> {
  const { getCurrentEmbeddingVersion } = require("../bedrock/embeddings");
  const versionToUse = version || getCurrentEmbeddingVersion();
  try {
    // Get all businesses with status
    const result = await dynamoClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "version = :version",
        ExpressionAttributeValues: {
          ":version": versionToUse,
        },
      })
    );

    // Filter out those with completed status
    const withoutEmbeddings = (result.Items || [])
      .filter((item: any) => item.status !== "completed" || !item.hasEmbedding)
      .map((item: any) => item.businessId);

    return withoutEmbeddings;
  } catch (error: any) {
    console.error(`[EmbeddingStatus] Failed to get businesses without embeddings: ${error.message}`);
    return [];
  }
}

/**
 * Get embedding status statistics
 */
export async function getEmbeddingStats(version?: string): Promise<{
  total: number;
  completed: number;
  pending: number;
  processing: number;
  failed: number;
  withEmbeddings: number;
  withoutEmbeddings: number;
}> {
  const { getCurrentEmbeddingVersion } = require("../bedrock/embeddings");
  const versionToUse = version || getCurrentEmbeddingVersion();
  
  try {
    const result = await dynamoClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "version = :version",
        ExpressionAttributeValues: {
          ":version": versionToUse,
        },
      })
    );

    const items = result.Items || [];
    const stats = {
      total: items.length,
      completed: items.filter((item: any) => item.status === "completed").length,
      pending: items.filter((item: any) => item.status === "pending").length,
      processing: items.filter((item: any) => item.status === "processing").length,
      failed: items.filter((item: any) => item.status === "failed").length,
      withEmbeddings: items.filter((item: any) => item.hasEmbedding === true).length,
      withoutEmbeddings: items.filter((item: any) => !item.hasEmbedding).length,
    };

    return stats;
  } catch (error: any) {
    console.error(`[EmbeddingStatus] Failed to get stats: ${error.message}`);
    return {
      total: 0,
      completed: 0,
      pending: 0,
      processing: 0,
      failed: 0,
      withEmbeddings: 0,
      withoutEmbeddings: 0,
    };
  }
}

/**
 * Update embedding status
 */
export async function updateEmbeddingStatus(
  businessId: string,
  updates: {
    status?: EmbeddingStatus["status"];
    hasEmbedding?: boolean;
    error?: string;
    attempts?: number;
  },
  version?: string
): Promise<void> {
  const { getCurrentEmbeddingVersion } = require("../bedrock/embeddings");
  const versionToUse = version || getCurrentEmbeddingVersion();
  try {
    const now = getCurrentTimestamp();
    const updateExpressions: string[] = ["lastUpdated = :timestamp"];
    const expressionAttributeValues: any = { ":timestamp": now };

    if (updates.status !== undefined) {
      updateExpressions.push("#status = :status");
      expressionAttributeValues[":status"] = updates.status;
    }

    if (updates.hasEmbedding !== undefined) {
      updateExpressions.push("hasEmbedding = :hasEmbedding");
      expressionAttributeValues[":hasEmbedding"] = updates.hasEmbedding;
    }

    if (updates.error !== undefined) {
      if (updates.error) {
        updateExpressions.push("error = :error");
        expressionAttributeValues[":error"] = updates.error;
      } else {
        updateExpressions.push("REMOVE error");
      }
    }

    if (updates.attempts !== undefined) {
      updateExpressions.push("attempts = :attempts");
      expressionAttributeValues[":attempts"] = updates.attempts;
    }

    if (updates.status === "completed") {
      updateExpressions.push("lastGenerated = :lastGenerated");
      expressionAttributeValues[":lastGenerated"] = now;
    }

    await dynamoClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          businessId,
          version: versionToUse,
        },
        UpdateExpression: `SET ${updateExpressions.join(", ")}`,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: {
          "#status": "status",
        },
      })
    );
  } catch (error: any) {
    console.error(`[EmbeddingStatus] Failed to update status: ${error.message}`);
    // Don't throw - status tracking is non-critical
  }
}

