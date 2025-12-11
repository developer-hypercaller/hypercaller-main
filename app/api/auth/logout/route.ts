import { NextRequest, NextResponse } from 'next/server';

const { invalidateSession } = require('../../../../lib/db/sessions');

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('x-session-id') || 
                     request.cookies.get('sessionId')?.value;

    if (sessionId) {
      await invalidateSession(sessionId);
    }

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Error during logout:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}

