import { NextRequest, NextResponse } from 'next/server';

const { createOTP } = require('../../../../lib/db/otp');
const { phoneNumberExists } = require('../../../../lib/db/users');
const { normalizePhoneNumber } = require('../../../../lib/server-utils');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

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

