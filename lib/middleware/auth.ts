/**
 * Authentication middleware for Next.js API routes
 * Provides optional session validation (doesn't require authentication)
 */

import { NextRequest } from "next/server";
import { User } from "../schemas/user-schema";

// Import CommonJS modules
const { validateSession, updateSessionActivity } = require("../db/sessions");
const { getUserById } = require("../db/users");

/**
 * Session data structure
 */
export interface Session {
  sessionId: string;
  userId: string;
  username: string;
  role: string;
  ipAddress?: string;
  userAgent?: string;
  rememberMe?: boolean;
  createdAt: number;
  expiresAt: number;
  lastActivityAt: number;
  isActive: boolean;
}

/**
 * Authentication result
 */
export interface AuthResult {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  error?: string;
}

/**
 * Extract session ID from request
 * Checks headers first, then cookies
 */
function extractSessionId(request: NextRequest): string | null {
  // Check header first (x-session-id)
  const headerSessionId = request.headers.get("x-session-id");
  if (headerSessionId) {
    return headerSessionId.trim();
  }

  // Check cookie (sessionId)
  const cookieSessionId = request.cookies.get("sessionId")?.value;
  if (cookieSessionId) {
    return cookieSessionId.trim();
  }

  return null;
}

/**
 * Validate session optionally
 * 
 * This function:
 * - Extracts session ID from headers or cookies
 * - If session ID exists, validates it
 * - If valid, returns user data and session
 * - If invalid or missing, returns null (not an error)
 * - Only returns error for system failures
 * - Updates session activity on validation
 * 
 * @param request - Next.js request object
 * @returns Authentication result with user and session data
 */
export async function validateSessionOptional(request: NextRequest): Promise<AuthResult> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/middleware/auth.ts:74',message:'validateSessionOptional entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    // Extract session ID
    const sessionId = extractSessionId(request);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/middleware/auth.ts:78',message:'After extractSessionId',data:{hasSessionId:!!sessionId,sessionIdLength:sessionId?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // No session ID - not authenticated, but not an error
    if (!sessionId) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/middleware/auth.ts:82',message:'No sessionId branch',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return {
        isAuthenticated: false,
        user: null,
        session: null,
      };
    }

    // Validate session
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/middleware/auth.ts:90',message:'Before validateSession',data:{sessionId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const validationResult = await validateSession(sessionId);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/middleware/auth.ts:93',message:'After validateSession',data:{valid:validationResult.valid,error:validationResult.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Invalid session - not authenticated, but not an error
    if (!validationResult.valid) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/middleware/auth.ts:97',message:'Invalid session branch',data:{error:validationResult.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return {
        isAuthenticated: false,
        user: null,
        session: null,
        error: validationResult.error, // Include error for debugging, but don't treat as failure
      };
    }

    const session = validationResult.session as Session;

    // Update session activity
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/middleware/auth.ts:105',message:'Before updateSessionActivity',data:{sessionId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      await updateSessionActivity(sessionId);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/middleware/auth.ts:107',message:'After updateSessionActivity success',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    } catch (activityError) {
      // #region agent log
      const errorMsg = activityError instanceof Error ? activityError.message : String(activityError);
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/middleware/auth.ts:110',message:'updateSessionActivity error',data:{errorMessage:errorMsg},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      // Log but don't fail - activity update is best effort
      console.warn("Failed to update session activity:", activityError);
    }

    // Get user profile
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/middleware/auth.ts:117',message:'Before getUserProfile',data:{userId:session.userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const user = await getUserProfile(session.userId);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/middleware/auth.ts:120',message:'After getUserProfile',data:{hasUser:!!user,userId:user?.userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (!user) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/middleware/auth.ts:123',message:'User not found branch',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      // User not found - session is valid but user doesn't exist
      return {
        isAuthenticated: false,
        user: null,
        session: null,
        error: "User not found",
      };
    }

    // Successfully authenticated
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/middleware/auth.ts:131',message:'Authentication success',data:{userId:user.userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return {
      isAuthenticated: true,
      user,
      session,
    };
  } catch (error) {
    // #region agent log
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : 'Unknown';
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/middleware/auth.ts:140',message:'validateSessionOptional catch error',data:{errorMessage,errorName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // System error - log and return error
    console.error("Session validation error:", error);

    return {
      isAuthenticated: false,
      user: null,
      session: null,
      error: `System error: ${errorMessage}`,
    };
  }
}

/**
 * Get user profile including location
 * 
 * Fetches user data from database and includes location information
 * 
 * @param userId - User ID to fetch
 * @returns User object with location data, or null if not found
 */
export async function getUserProfile(userId: string): Promise<User | null> {
  try {
    const user = await getUserById(userId);

    if (!user) {
      return null;
    }

    // Build user object with location
    const userProfile: User = {
      userId: user.userId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      phoneVerified: user.phoneVerified || false,
      role: user.role || "user",
      avatar: user.avatar,
      accountStatus: user.accountStatus || "active",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      locationLastUpdated: user.locationLastUpdated || undefined,
    };

    // Include location if available
    if (user.latitude !== undefined || user.longitude !== undefined || user.address) {
      userProfile.location = {
        address: user.address,
        latitude: user.latitude,
        longitude: user.longitude,
        city: user.city,
        state: user.state,
        country: user.country,
        pinCode: user.pinCode,
        locationLastUpdated: user.locationLastUpdated,
      };
    }

    return userProfile;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

/**
 * Validate session and require authentication
 * 
 * Similar to validateSessionOptional but throws error if not authenticated
 * Use this for routes that require authentication
 * 
 * @param request - Next.js request object
 * @returns Authentication result (always authenticated if returned)
 * @throws Error if not authenticated
 */
export async function validateSessionRequired(request: NextRequest): Promise<AuthResult> {
  const result = await validateSessionOptional(request);

  if (!result.isAuthenticated) {
    throw new Error(result.error || "Authentication required");
  }

  return result;
}

