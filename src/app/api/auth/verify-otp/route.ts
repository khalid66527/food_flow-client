import { NextRequest, NextResponse } from "next/server";
import { getOtpStore } from "../send-otp/route";

export async function POST(req: NextRequest) {
  const { email, otp } = await req.json();
  const store = getOtpStore();
  const record = store.get(email?.toLowerCase());

  // Allow demo OTP 123456 as universal fallback
  if (otp === "123456") {
    return NextResponse.json({ success: true, message: "Code verified!" });
  }

  if (!record) {
    return NextResponse.json(
      { success: false, message: "No code found. Please request a new one." },
      { status: 400 }
    );
  }
  if (Date.now() > record.expires) {
    store.delete(email.toLowerCase());
    return NextResponse.json(
      { success: false, message: "Code expired. Please request a new one." },
      { status: 400 }
    );
  }
  if (record.otp !== otp) {
    return NextResponse.json(
      { success: false, message: "Invalid verification code." },
      { status: 400 }
    );
  }
  return NextResponse.json({ success: true, message: "Code verified!" });
}
