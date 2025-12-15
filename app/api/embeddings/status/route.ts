/**
 * Embedding Status API
 * Provides status information about business embeddings
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getEmbeddingStatus,
  getEmbeddingStats,
  getBusinessesWithEmbeddings,
  getBusinessesWithoutEmbeddings,
} from "../../../../lib/db/embedding-status";
import { getEmbeddingQueue } from "../../../../lib/queue/embedding-queue";

/**
 * GET handler - Get embedding status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get("businessId");
    const version = searchParams.get("version") || "titan-v1";
    const stats = searchParams.get("stats") === "true";

    // Get statistics
    if (stats) {
      const embeddingStats = await getEmbeddingStats(version);
      const queueStats = getEmbeddingQueue().getStats();

      return NextResponse.json({
        success: true,
        stats: {
          ...embeddingStats,
          queue: queueStats,
        },
      });
    }

    // Get status for specific business
    if (businessId) {
      const status = await getEmbeddingStatus(businessId, version);
      const queueJob = getEmbeddingQueue().getJobStatus(businessId);

      return NextResponse.json({
        success: true,
        businessId,
        version,
        status: status || {
          businessId,
          version,
          status: "pending",
          hasEmbedding: false,
          lastUpdated: Math.floor(Date.now() / 1000),
        },
        queueJob: queueJob || null,
      });
    }

    // Get all businesses with/without embeddings
    const withEmbeddings = searchParams.get("withEmbeddings") === "true";
    const withoutEmbeddings = searchParams.get("withoutEmbeddings") === "true";

    if (withEmbeddings) {
      const businessIds = await getBusinessesWithEmbeddings(version);
      return NextResponse.json({
        success: true,
        version,
        businessIds,
        count: businessIds.length,
      });
    }

    if (withoutEmbeddings) {
      const businessIds = await getBusinessesWithoutEmbeddings(version);
      return NextResponse.json({
        success: true,
        version,
        businessIds,
        count: businessIds.length,
      });
    }

    // Default: return stats
    const embeddingStats = await getEmbeddingStats(version);
    const queueStats = getEmbeddingQueue().getStats();

    return NextResponse.json({
      success: true,
      stats: {
        ...embeddingStats,
        queue: queueStats,
      },
    });
  } catch (error: any) {
    console.error("[EmbeddingStatusAPI] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to get embedding status",
      },
      { status: 500 }
    );
  }
}

