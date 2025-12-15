import { NextRequest, NextResponse } from 'next/server';

const { usernameExists } = require('../../../../lib/db/users');
const { normalizeUsername } = require('../../../../lib/server-utils');
const { rateLimiters } = require('../../../../lib/middleware/rate-limiter');

export async function POST(request: NextRequest) {
  // Rate limiting check
  const rateLimitResponse = await rateLimiters.general(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    const normalizedUsername = normalizeUsername(username);

    // Validate username format
    if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
      return NextResponse.json(
        {
          error: 'Username must be 3-20 characters, alphanumeric and underscore only',
        },
        { status: 400 }
      );
    }

    const exists = await usernameExists(normalizedUsername);

    return NextResponse.json({
      available: !exists,
      message: exists ? 'Username already taken' : 'Username available',
    });
  } catch (error) {
    console.error('Error checking username:', error);
    return NextResponse.json(
      { error: 'Failed to check username' },
      { status: 500 }
    );
  }
}

