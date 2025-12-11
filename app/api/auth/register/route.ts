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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const normalizedUsername = normalizeUsername(username);

    // Check if phone number already exists and is verified
    const phoneCheck = await phoneNumberExists(normalizedPhone);
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
      return NextResponse.json(
        { error: 'Please verify your phone number with OTP first' },
        { status: 400 }
      );
    }

    const verifiedOTP = otpQuery.Items[0];

    // Check username availability
    const usernameAvailable = !(await usernameExists(normalizedUsername));
    if (!usernameAvailable) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 400 }
      );
    }

    // Validate username format
    if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
      return NextResponse.json(
        {
          error: 'Username must be 3-20 characters, alphanumeric and underscore only',
        },
        { status: 400 }
      );
    }

    // Validate password
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await createUser({
      firstName,
      lastName,
      username: normalizedUsername,
      phoneNumber: normalizedPhone,
      passwordHash,
      role,
      avatar,
    });

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
    console.error('Error during registration:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}

