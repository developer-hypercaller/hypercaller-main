import { NextRequest, NextResponse } from 'next/server';

const { validateSession, updateSessionActivity } = require('../../../../lib/db/sessions');

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get('x-session-id') || 
                     request.cookies.get('sessionId')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 401 }
      );
    }

    const result = await validateSession(sessionId);

    if (!result.valid) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    // Update activity
    await updateSessionActivity(sessionId);

    return NextResponse.json({
      success: true,
      session: result.session,
    });
  } catch (error) {
    console.error('Error validating session:', error);
    return NextResponse.json(
      { error: 'Session validation failed' },
      { status: 500 }
    );
  }
}

