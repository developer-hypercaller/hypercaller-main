import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const { validateSession, updateSessionActivity } = require('../../../../lib/db/sessions');

export async function GET(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/session/route.ts:5',message:'Session GET entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  try {
    const sessionId = request.headers.get('x-session-id') || 
                     request.cookies.get('sessionId')?.value;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/session/route.ts:7',message:'After extract sessionId',data:{hasSessionId:!!sessionId,sessionIdLength:sessionId?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    if (!sessionId) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/session/route.ts:10',message:'No sessionId branch',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 401 }
      );
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/session/route.ts:17',message:'Before validateSession',data:{sessionId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const result = await validateSession(sessionId);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/session/route.ts:19',message:'After validateSession',data:{valid:result.valid,error:result.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    if (!result.valid) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/session/route.ts:22',message:'Invalid session branch',data:{error:result.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    // Update activity
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/session/route.ts:27',message:'Before updateSessionActivity',data:{sessionId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    await updateSessionActivity(sessionId);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/session/route.ts:29',message:'After updateSessionActivity success',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    return NextResponse.json({
      success: true,
      session: result.session,
    });
  } catch (error) {
    // #region agent log
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : 'Unknown';
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/session/route.ts:33',message:'Session GET catch error',data:{errorMessage:errorMsg,errorName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    console.error('Error validating session:', error);
    return NextResponse.json(
      { error: 'Session validation failed' },
      { status: 500 }
    );
  }
}

