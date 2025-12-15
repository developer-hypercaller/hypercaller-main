import { NextRequest, NextResponse } from 'next/server';

const { getUserByUsername, updateLastLogin } = require('../../../../lib/db/users');
const { createSession } = require('../../../../lib/db/sessions');
const { normalizeUsername, verifyPassword } = require('../../../../lib/server-utils');
const { rateLimiters } = require('../../../../lib/middleware/rate-limiter');
const { isAccountLocked, recordFailedAttempt, clearFailedAttempts, getLockoutResponse } = require('../../../../lib/middleware/account-lockout');

const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/login/route.ts:11',message:'Login POST entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  // Rate limiting check
  const rateLimitResponse = await rateLimiters.strict(request);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/login/route.ts:14',message:'After rate limit check',data:{rateLimited:!!rateLimitResponse},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  
  try {
    const body = await request.json();
    const { username, password, rememberMe } = body;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/login/route.ts:22',message:'After parse body',data:{hasUsername:!!username,hasPassword:!!password,usernameLength:username?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const normalizedUsername = normalizeUsername(username);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/login/route.ts:30',message:'After normalizeUsername',data:{normalizedUsername},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Check account lockout status
    const lockoutResponse = getLockoutResponse(normalizedUsername);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/login/route.ts:33',message:'After lockout check',data:{isLocked:!!lockoutResponse},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (lockoutResponse) {
      return lockoutResponse;
    }

    // Get user by username
    const user = await getUserByUsername(normalizedUsername);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/login/route.ts:40',message:'After getUserByUsername',data:{userFound:!!user,userId:user?.userId,accountStatus:user?.accountStatus},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (!user) {
      // Record failed attempt (even if user doesn't exist to prevent enumeration)
      recordFailedAttempt(normalizedUsername);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.passwordHash);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/login/route.ts:52',message:'After verifyPassword',data:{passwordValid,hasPasswordHash:!!user.passwordHash},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (!passwordValid) {
      // Record failed attempt
      const lockoutStatus = recordFailedAttempt(normalizedUsername);
      if (lockoutStatus.locked) {
        return getLockoutResponse(normalizedUsername);
      }
      return NextResponse.json(
        { 
          error: 'Invalid credentials',
          remainingAttempts: MAX_ATTEMPTS - lockoutStatus.attempts,
        },
        { status: 401 }
      );
    }

    // Clear failed attempts on successful login
    clearFailedAttempts(normalizedUsername);

    // Check account status
    if (user.accountStatus !== 'active') {
      return NextResponse.json(
        {
          error: `Account is ${user.accountStatus}. Please contact support.`,
        },
        { status: 403 }
      );
    }

    // Check phone verification
    if (!user.phoneVerified) {
      return NextResponse.json(
        {
          error: 'Phone number not verified. Please complete registration.',
        },
        { status: 403 }
      );
    }

    // Update last login
    await updateLastLogin(user.userId);

    // Create session
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/login/route.ts:95',message:'Before createSession',data:{userId:user.userId,ipAddress,rememberMe:!!rememberMe},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const { sessionId, expiresAt } = await createSession(
      {
        userId: user.userId,
        username: user.username,
        role: user.role,
      },
      ipAddress,
      userAgent,
      rememberMe || false
    );
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/login/route.ts:106',message:'After createSession',data:{sessionId,expiresAt},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        userId: user.userId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
      },
      session: {
        sessionId,
        expiresAt,
      },
    });
  } catch (error) {
    // #region agent log
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : 'Unknown';
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/login/route.ts:127',message:'Login catch error',data:{errorMessage:errorMsg,errorName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.error('Error during login:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}

