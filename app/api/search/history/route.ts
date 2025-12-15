import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/db/sessions";
import { recordSearchHistory, getUserSearchHistory } from "@/lib/db/search-history";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get("x-session-id") || request.cookies.get("sessionId")?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 401 });
    }

    const result = await validateSession(sessionId);
    if (!result.valid || !result.session) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const userId = result.session.userId;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") || 20), 50);
    const cursorParam = searchParams.get("cursor");
    const cursor = cursorParam ? Number(cursorParam) : undefined;

    const history = await getUserSearchHistory(userId, { limit, cursor });

    return NextResponse.json({
      success: true,
      items: history.items,
      nextCursor: history.nextCursor,
    });
  } catch (error) {
    console.error("Error getting search history:", error);
    return NextResponse.json({ error: "Failed to get search history" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get("x-session-id") || request.cookies.get("sessionId")?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 401 });
    }

    const result = await validateSession(sessionId);
    if (!result.valid || !result.session) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const userId = result.session.userId;
    const body = await request.json();
    const { query, filters, location, resultCount } = body || {};

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    await recordSearchHistory(userId, {
      query: query.trim(),
      filters: filters || {},
      location: location || {},
      resultCount: typeof resultCount === "number" ? resultCount : undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error recording search history:", error);
    return NextResponse.json({ error: "Failed to record search history" }, { status: 500 });
  }
}

