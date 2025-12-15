import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const { validateSession } = require('../../../lib/db/sessions');
const { getUserById, updateUserProfile } = require('../../../lib/db/users');
const { getUserPreferredCategories, replaceUserPreferredCategories } = require('../../../lib/db/user-preferred-categories');
const { reverseGeocode, forwardGeocode } = require('../../../lib/geocoding');

/**
 * GET /api/profile
 * Get current user's profile
 */
export async function GET(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/profile/route.ts:12',message:'Profile GET entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    const sessionId = request.headers.get('x-session-id') || 
                     request.cookies.get('sessionId')?.value;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/profile/route.ts:14',message:'After extract sessionId',data:{hasSessionId:!!sessionId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (!sessionId) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/profile/route.ts:17',message:'No sessionId branch',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 401 }
      );
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/profile/route.ts:24',message:'Before validateSession',data:{sessionId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const result = await validateSession(sessionId);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/profile/route.ts:26',message:'After validateSession',data:{valid:result.valid,userId:result.session?.userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (!result.valid) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/profile/route.ts:27',message:'Invalid session branch',data:{error:result.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    const userId = result.session.userId;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/profile/route.ts:34',message:'Before getUserById and getUserPreferredCategories',data:{userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const [user, preferredCategories] = await Promise.all([
      getUserById(userId),
      getUserPreferredCategories(userId),
    ]);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/profile/route.ts:39',message:'After getUserById and getUserPreferredCategories',data:{hasUser:!!user,hasCategories:!!preferredCategories},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (!user) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/profile/route.ts:39',message:'User not found branch',data:{userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Return user profile (excluding sensitive data)
    return NextResponse.json({
      success: true,
      user: {
        userId: user.userId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        role: user.role,
        avatar: user.avatar,
        address: user.address || null,
        latitude: user.latitude || null,
        longitude: user.longitude || null,
        locationLastUpdated: user.locationLastUpdated || null,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        preferredCategories,
      },
    });
  } catch (error) {
    // #region agent log
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : 'Unknown';
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/profile/route.ts:66',message:'Profile GET catch error',data:{errorMessage:errorMsg,errorName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.error('Error getting profile:', error);
    return NextResponse.json(
      { error: 'Failed to get profile' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/profile
 * Update user profile (including location)
 */
export async function PUT(request: NextRequest) {
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

    const userId = result.session.userId;
    const body = await request.json();
    const {
      address,
      latitude,
      longitude,
      useCurrentLocation,
      manualAddress,
      firstName,
      lastName,
      avatar,
      preferredCategories,
    } = body;

    let updateData: any = {};

    // Handle current location
    if (useCurrentLocation && latitude !== undefined && longitude !== undefined) {
      try {
        // Reverse geocode to get full address
        const geocodeResult = await reverseGeocode(latitude, longitude);
        updateData.address = geocodeResult.address;
        updateData.latitude = geocodeResult.lat;
        updateData.longitude = geocodeResult.lon;
      } catch (error) {
        console.error('Reverse geocoding error:', error);
        return NextResponse.json(
          { error: 'Failed to get address from location. Please try again.' },
          { status: 400 }
        );
      }
    }
    // Handle manual address entry
    else if (manualAddress && typeof manualAddress === 'string' && manualAddress.trim()) {
      try {
        // Forward geocode to get lat/long
        const geocodeResult = await forwardGeocode(manualAddress.trim());
        updateData.address = geocodeResult.address;
        updateData.latitude = geocodeResult.lat;
        updateData.longitude = geocodeResult.lon;
      } catch (error) {
        console.error('Forward geocoding error:', error);
        return NextResponse.json(
          { error: 'Failed to find location for this address. Please check the address and try again.' },
          { status: 400 }
        );
      }
    }
    // Direct update (if address, lat, lon are provided directly)
    else {
      if (address !== undefined) updateData.address = address;
      if (latitude !== undefined) updateData.latitude = latitude;
      if (longitude !== undefined) updateData.longitude = longitude;
    }

    // Handle name/avatar updates
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (avatar !== undefined) updateData.avatar = avatar;

    // Update user profile
    const updatedUser = await updateUserProfile(userId, updateData);

    // Update preferred categories if provided as an array
    if (Array.isArray(preferredCategories)) {
      await replaceUserPreferredCategories(userId, preferredCategories, "manual");
    }

    const updatedPreferredCategories = Array.isArray(preferredCategories)
      ? preferredCategories
      : await getUserPreferredCategories(userId);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        userId: updatedUser.userId,
        username: updatedUser.username,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phoneNumber: updatedUser.phoneNumber,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
        address: updatedUser.address || null,
        latitude: updatedUser.latitude || null,
        longitude: updatedUser.longitude || null,
        locationLastUpdated: updatedUser.locationLastUpdated || null,
        preferredCategories: updatedPreferredCategories,
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

