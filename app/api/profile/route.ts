import { NextRequest, NextResponse } from 'next/server';

const { validateSession } = require('../../../lib/db/sessions');
const { getUserById, updateUserProfile } = require('../../../lib/db/users');
const { reverseGeocode, forwardGeocode } = require('../../../lib/geocoding');

/**
 * GET /api/profile
 * Get current user's profile
 */
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

    const userId = result.session.userId;
    const user = await getUserById(userId);

    if (!user) {
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
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (error) {
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
    const { address, latitude, longitude, useCurrentLocation, manualAddress } = body;

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

    // Update user profile
    const updatedUser = await updateUserProfile(userId, updateData);

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

