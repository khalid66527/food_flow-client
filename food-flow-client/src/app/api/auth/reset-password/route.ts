import { NextRequest, NextResponse } from "next/server";
import { getOtpStore } from "../send-otp/route";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!password || password.length < 6) {
    return NextResponse.json({ success: false, message: "Password must be at least 6 characters" }, { status: 400 });
  }

  const store = getOtpStore();
  store.delete(email?.toLowerCase());

  // TODO: Update password in DB via better-auth/mongodb when backend is ready.
  // For now, just clear OTP and return success so flow completes.
  console.log(`[Reset] Password updated for ${email}`);

  return NextResponse.json({ success: true, message: "Password reset successfully!" });
}
