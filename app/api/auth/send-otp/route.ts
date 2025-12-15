import { NextRequest, NextResponse } from 'next/server';

const { createOTP } = require('../../../../lib/db/otp');
const { phoneNumberExists } = require('../../../../lib/db/users');
const { normalizePhoneNumber } = require('../../../../lib/server-utils');
const { rateLimiters } = require('../../../../lib/middleware/rate-limiter');

export async function POST(request: NextRequest) {
  // Rate limiting check
  const rateLimitResponse = await rateLimiters.otp(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  
  try {
    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
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

    // Check if phone number already exists and is verified
    const phoneCheck = await phoneNumberExists(normalizedPhone);
    if (phoneCheck.exists && phoneCheck.verified) {
      return NextResponse.json(
        { error: 'Phone number already registered' },
        { status: 400 }
      );
    }

    // Generate and store OTP
    const otpCode = await createOTP(normalizedPhone, 'registration', null);

    // In development, return OTP in response (remove in production)
    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      otp: process.env.NODE_ENV === 'development' ? otpCode : undefined, // Only in dev
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}

