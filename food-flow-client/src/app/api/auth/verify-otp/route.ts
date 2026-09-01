import { NextRequest, NextResponse } from "next/server";
import { getOtpStore } from "../send-otp/route";

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, message: "Email and verification code are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    const store = getOtpStore();
    const record = store.get(normalizedEmail);

    if (!record) {
      return NextResponse.json(
        { success: false, message: "No verification code found. Please request a new code." },
        { status: 400 }
      );
    }

    if (Date.now() > record.expires) {
      store.delete(normalizedEmail);
      return NextResponse.json(
        { success: false, message: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    if (record.otp !== cleanOtp) {
      return NextResponse.json(
        { success: false, message: "Invalid verification code. Please check and try again." },
        { status: 400 }
      );
    }

    // Mark as verified so reset-password route knows OTP was passed
    record.verified = true;

    return NextResponse.json({
      success: true,
      message: "Verification code verified successfully!",
    });
  } catch (err) {
    console.error("verify-otp error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to verify code. Please try again." },
      { status: 500 }
    );
  }
}
