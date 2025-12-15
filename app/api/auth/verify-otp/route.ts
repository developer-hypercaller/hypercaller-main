import { NextRequest, NextResponse } from 'next/server';

const { verifyOTP } = require('../../../../lib/db/otp');
const { normalizePhoneNumber } = require('../../../../lib/server-utils');
const { rateLimiters } = require('../../../../lib/middleware/rate-limiter');
const { recordFailedAttempt, clearFailedAttempts, getLockoutResponse } = require('../../../../lib/middleware/account-lockout');

const MAX_OTP_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  // Rate limiting check
  const rateLimitResponse = await rateLimiters.strict(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const { phoneNumber, otpCode, otp } = body;

    // Accept both 'otp' and 'otpCode' for backward compatibility, but prefer otpCode
    const otpValue = otpCode || otp;

    if (!phoneNumber || !otpValue) {
      return NextResponse.json(
        { error: 'Phone number and OTP are required' },
        { status: 400 }
      );
    }

    // Validate OTP format (must be 6 digits)
    if (!/^\d{6}$/.test(otpValue)) {
      return NextResponse.json(
        { error: 'OTP must be 6 digits' },
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

    // Validate normalized result
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

    const result = await verifyOTP(normalizedPhone, otpValue);

    if (!result.success) {
      // Record failed attempt
      const lockoutStatus = recordFailedAttempt(normalizedPhone);
      if (lockoutStatus.locked) {
        return getLockoutResponse(normalizedPhone);
      }
      return NextResponse.json(
        { 
          error: result.error,
          remainingAttempts: MAX_OTP_ATTEMPTS - lockoutStatus.attempts,
        },
        { status: 400 }
      );
    }

    // Clear failed attempts on successful verification
    clearFailedAttempts(normalizedPhone);

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully',
      verified: true,
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}

