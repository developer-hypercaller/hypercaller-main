import { NextRequest, NextResponse } from 'next/server';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';

const { deleteOTP } = require('../../../../lib/db/otp');
const { createUser, usernameExists, phoneNumberExists } = require('../../../../lib/db/users');
const { createSession } = require('../../../../lib/db/sessions');
const {
  normalizePhoneNumber,
  normalizeUsername,
  hashPassword,
  getCurrentTimestamp,
} = require('../../../../lib/server-utils');
const { dynamoClient } = require('../../../../lib/dynamodb');
const { rateLimiters } = require('../../../../lib/middleware/rate-limiter');
const { recordFailedAttempt, clearFailedAttempts, getLockoutResponse } = require('../../../../lib/middleware/account-lockout');

const MAX_REGISTRATION_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/register/route.ts:19',message:'Register POST entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  // Rate limiting check
  const rateLimitResponse = await rateLimiters.moderate(request);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/register/route.ts:22',message:'After rate limit check',data:{rateLimited:!!rateLimitResponse},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  
  try {
    const body = await request.json();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/register/route.ts:30',message:'After parse body',data:{hasUsername:!!body.username,hasPhone:!!body.phoneNumber,hasPassword:!!body.password},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const {
      firstName,
      lastName,
      username,
      phoneNumber,
      password,
      role,
      avatar,
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !username || !phoneNumber || !password || !role || !avatar) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate phone number format before normalization
    if (typeof phoneNumber !== 'string' || phoneNumber.trim().length < 8) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Phone number must be at least 8 digits.' },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const normalizedUsername = normalizeUsername(username);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/register/route.ts:56',message:'After normalize',data:{normalizedPhone,normalizedUsername},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Validate normalized phone result
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Please provide a valid phone number.' },
        { status: 400 }
      );
    }

    // Additional validation: ensure normalized phone meets minimum requirements
    // For Indian numbers, should be +91 followed by 8-10 digits
    if (normalizedPhone.startsWith('+91')) {
      const numberPart = normalizedPhone.substring(3);
      if (numberPart.length < 8 || numberPart.length > 10) {
        return NextResponse.json(
          { error: 'Invalid phone number format. Indian numbers must be 8-10 digits.' },
          { status: 400 }
        );
      }
      // Validate Indian mobile number format (should start with 6-9 for mobile)
      if (numberPart.length === 10 && !/^[6-9]\d{9}$/.test(numberPart)) {
        return NextResponse.json(
          { error: 'Invalid phone number format. Indian mobile numbers must start with 6-9.' },
          { status: 400 }
        );
      }
    }

    // Check account lockout status (by phone number)
    const lockoutResponse = getLockoutResponse(normalizedPhone);
    if (lockoutResponse) {
      return lockoutResponse;
    }

    // Check if phone number already exists and is verified
    const phoneCheck = await phoneNumberExists(normalizedPhone);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/register/route.ts:93',message:'After phoneNumberExists',data:{exists:phoneCheck.exists,verified:phoneCheck.verified},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (phoneCheck.exists && phoneCheck.verified) {
      return NextResponse.json(
        { error: 'Phone number already registered' },
        { status: 400 }
      );
    }

    // Verify OTP was verified - check for any recent verified OTP
    // Query for verified OTPs in the last 10 minutes
    const now = getCurrentTimestamp();
    const tenMinutesAgo = now - 600;

    const otpQuery = await dynamoClient.send(
      new QueryCommand({
        TableName: 'OTPVerifications',
        KeyConditionExpression: 'phoneNumber = :phoneNumber AND createdAt >= :tenMinutesAgo',
        FilterExpression: 'verified = :true',
        ExpressionAttributeValues: {
          ':phoneNumber': normalizedPhone,
          ':tenMinutesAgo': tenMinutesAgo,
          ':true': true,
        },
        ScanIndexForward: false,
        Limit: 1,
      })
    );

    if (!otpQuery.Items || otpQuery.Items.length === 0) {
      // Record failed attempt
      const lockoutStatus = recordFailedAttempt(normalizedPhone);
      if (lockoutStatus.locked) {
        return getLockoutResponse(normalizedPhone);
      }
      return NextResponse.json(
        { 
          error: 'Please verify your phone number with OTP first',
          remainingAttempts: MAX_REGISTRATION_ATTEMPTS - lockoutStatus.attempts,
        },
        { status: 400 }
      );
    }

    const verifiedOTP = otpQuery.Items[0];

    // Check username availability
    const usernameAvailable = !(await usernameExists(normalizedUsername));
    if (!usernameAvailable) {
      // Record failed attempt
      const lockoutStatus = recordFailedAttempt(normalizedPhone);
      if (lockoutStatus.locked) {
        return getLockoutResponse(normalizedPhone);
      }
      return NextResponse.json(
        { 
          error: 'Username already taken',
          remainingAttempts: MAX_REGISTRATION_ATTEMPTS - lockoutStatus.attempts,
        },
        { status: 400 }
      );
    }

    // Validate username format
    if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
      // Record failed attempt
      const lockoutStatus = recordFailedAttempt(normalizedPhone);
      if (lockoutStatus.locked) {
        return getLockoutResponse(normalizedPhone);
      }
      return NextResponse.json(
        {
          error: 'Username must be 3-20 characters, alphanumeric and underscore only',
          remainingAttempts: MAX_REGISTRATION_ATTEMPTS - lockoutStatus.attempts,
        },
        { status: 400 }
      );
    }

    // Validate password
    if (password.length < 8) {
      // Record failed attempt
      const lockoutStatus = recordFailedAttempt(normalizedPhone);
      if (lockoutStatus.locked) {
        return getLockoutResponse(normalizedPhone);
      }
      return NextResponse.json(
        { 
          error: 'Password must be at least 8 characters',
          remainingAttempts: MAX_REGISTRATION_ATTEMPTS - lockoutStatus.attempts,
        },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/register/route.ts:191',message:'Before createUser',data:{normalizedUsername,normalizedPhone,hasPasswordHash:!!passwordHash},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const user = await createUser({
      firstName,
      lastName,
      username: normalizedUsername,
      phoneNumber: normalizedPhone,
      passwordHash,
      role,
      avatar,
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/register/route.ts:201',message:'After createUser',data:{userId:user?.userId,username:user?.username},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // Clear failed attempts on successful registration
    clearFailedAttempts(normalizedPhone);

    // Delete verified OTP (optional cleanup)
    if (verifiedOTP) {
      try {
        await deleteOTP(normalizedPhone, verifiedOTP.createdAt);
      } catch (err) {
        // Ignore if deletion fails (TTL will handle it)
        console.log('OTP cleanup warning:', (err as Error).message);
      }
    }

    // Create session
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const { sessionId, expiresAt } = await createSession(
      {
        userId: user.userId,
        username: user.username,
        role: user.role,
      },
      ipAddress,
      userAgent,
      false // Registration doesn't have remember me
    );

    return NextResponse.json({
      success: true,
      message: 'Registration successful',
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
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/register/route.ts:247',message:'Register catch error',data:{errorMessage:errorMsg,errorName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.error('Error during registration:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}

