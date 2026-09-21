import { NextRequest, NextResponse } from "next/server";
import { loginOtpStore } from "../send/route";

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, message: "Email and verification code are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    const record = loginOtpStore.get(normalizedEmail);

    if (!record) {
      return NextResponse.json(
        {
          success: false,
          message: "No verification code found or session expired. Please request a new code.",
        },
        { status: 400 }
      );
    }

    if (Date.now() > record.expires) {
      loginOtpStore.delete(normalizedEmail);
      return NextResponse.json(
        {
          success: false,
          message: "Verification code has expired. Please request a new code.",
        },
        { status: 400 }
      );
    }

    if (record.otp !== cleanOtp) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid verification code. Please check and try again.",
        },
        { status: 400 }
      );
    }

    // Mark as verified
    record.verified = true;
    loginOtpStore.delete(normalizedEmail);

    return NextResponse.json({
      success: true,
      message: "Verification code verified successfully!",
    });
  } catch (err: unknown) {
    console.error("login-otp/verify error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to verify code. Please try again." },
      { status: 500 }
    );
  }
}
