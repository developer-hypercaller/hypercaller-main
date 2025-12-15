import { NextRequest, NextResponse } from "next/server";
const { validateSession } = require("../../../../lib/db/sessions");
const {
  saveBusiness,
  removeSavedBusiness,
  getSavedBusinesses,
  isBusinessSaved,
} = require("../../../../lib/db/user-saved-businesses");

/**
 * GET /api/profile/saved-businesses
 * Get saved businesses for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get("x-session-id") || request.cookies.get("sessionId")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 401 });
    }

    const result = await validateSession(sessionId);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const userId = result.session.userId;
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get("businessId"); // Check if specific business is saved

    if (businessId) {
      // Quick check endpoint
      const saved = await isBusinessSaved(userId, businessId);
      return NextResponse.json({
        success: true,
        isSaved: saved,
      });
    }

    const limit = parseInt(searchParams.get("limit") || "25", 10);
    const cursor = searchParams.get("cursor") || undefined;

    const data = await getSavedBusinesses(userId, { limit, cursor });

    return NextResponse.json({
      success: true,
      items: data.items,
      nextCursor: data.nextCursor,
      hasMore: data.hasMore,
    });
  } catch (error: any) {
    console.error("Error getting saved businesses:", error);
    return NextResponse.json({ error: "Failed to get saved businesses" }, { status: 500 });
  }
}

/**
 * POST /api/profile/saved-businesses
 * Save a business for the current user
 */
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get("x-session-id") || request.cookies.get("sessionId")?.value;

    if (!sessionId) {
      console.error("[SAVE BUSINESS] No session ID provided");
      return NextResponse.json({ error: "Session ID required" }, { status: 401 });
    }

    const result = await validateSession(sessionId);
    if (!result.valid) {
      console.error("[SAVE BUSINESS] Invalid session:", result.error);
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const userId = result.session.userId;
    console.log("[SAVE BUSINESS] User ID:", userId);
    
    const body = await request.json();
    console.log("[SAVE BUSINESS] Request body:", { businessId: body.businessId, hasBusiness: !!body.business });
    const { businessId, business, note, tags, source } = body;

    if (!businessId) {
      console.error("[SAVE BUSINESS] Missing businessId");
      return NextResponse.json({ error: "businessId is required" }, { status: 400 });
    }

    // Check if already saved
    const alreadySaved = await isBusinessSaved(userId, businessId);
    console.log("[SAVE BUSINESS] Already saved check:", alreadySaved);
    if (alreadySaved) {
      return NextResponse.json({ error: "Business already saved" }, { status: 409 });
    }

    console.log("[SAVE BUSINESS] Attempting to save business...");
    const saved = await saveBusiness(userId, {
      businessId,
      business,
      note,
      tags,
      source: source || "manual",
    });
    console.log("[SAVE BUSINESS] Successfully saved:", saved.businessId);

    return NextResponse.json({
      success: true,
      item: saved,
    });
  } catch (error: any) {
    console.error("[SAVE BUSINESS] Error saving business:", error);
    console.error("[SAVE BUSINESS] Error details:", {
      message: error.message,
      name: error.name,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack?.substring(0, 500), // Limit stack trace
    });
    
    // Check for specific DynamoDB errors
    if (error.name === "ResourceNotFoundException") {
      console.error("[SAVE BUSINESS] Table not found - UserSavedBusinesses table may not exist");
      return NextResponse.json({ 
        error: "Database table not found. Please contact support.",
        details: "The UserSavedBusinesses table does not exist in DynamoDB"
      }, { status: 500 });
    }
    
    if (error.message?.includes("already saved") || error.message?.includes("ConditionalCheckFailedException")) {
      return NextResponse.json({ error: "Business already saved" }, { status: 409 });
    }
    
    return NextResponse.json({ 
      error: "Failed to save business",
      details: error.message || error.name || String(error)
    }, { status: 500 });
  }
}

/**
 * DELETE /api/profile/saved-businesses?businessId=xxx
 * Remove a saved business
 */
export async function DELETE(request: NextRequest) {
  try {
    const sessionId = request.headers.get("x-session-id") || request.cookies.get("sessionId")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 401 });
    }

    const result = await validateSession(sessionId);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const userId = result.session.userId;
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get("businessId");

    if (!businessId) {
      return NextResponse.json({ error: "businessId is required" }, { status: 400 });
    }

    const removed = await removeSavedBusiness(userId, businessId);

    if (!removed) {
      return NextResponse.json({ error: "Business not found in saved list" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Business removed from saved list",
    });
  } catch (error: any) {
    console.error("Error removing saved business:", error);
    return NextResponse.json({ error: "Failed to remove business" }, { status: 500 });
  }
}

