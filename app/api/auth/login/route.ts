import { NextRequest, NextResponse } from 'next/server';

const { getUserByUsername, updateLastLogin } = require('../../../../lib/db/users');
const { createSession } = require('../../../../lib/db/sessions');
const { normalizeUsername, verifyPassword } = require('../../../../lib/server-utils');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, rememberMe } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const normalizedUsername = normalizeUsername(username);

    // Get user by username
    const user = await getUserByUsername(normalizedUsername);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

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
    console.error('Error during login:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}

