import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { verifyPassword } from "better-auth/crypto";
import { sendLoginOtpEmail } from "@/lib/email";

// Persistent in-memory store for login OTPs
const globalForLoginOtp = global as unknown as {
  __loginOtpStore?: Map<
    string,
    { otp: string; expires: number; verified?: boolean; userName?: string }
  >;
};

export const loginOtpStore =
  globalForLoginOtp.__loginOtpStore ||
  new Map<
    string,
    { otp: string; expires: number; verified?: boolean; userName?: string }
  >();

globalForLoginOtp.__loginOtpStore = loginOtpStore;

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Please provide both email and password." },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const user = await db.collection("user").findOne({ email: normalizedEmail });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password. Please try again." },
        { status: 401 }
      );
    }

    const userIdObj = user._id;
    const userIdStr = user.id || String(user._id);

    // Look for credential account
    const account = await db.collection("account").findOne({
      providerId: "credential",
      $or: [
        { userId: userIdObj },
        { userId: userIdStr },
        { accountId: userIdStr },
        { accountId: userIdObj },
      ],
    });

    if (!account || !account.password) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This account was created using social sign-in (Google) or has no password set.",
        },
        { status: 401 }
      );
    }

    // Verify password hash
    let isPasswordValid = false;
    try {
      isPasswordValid = await verifyPassword({
        hash: account.password,
        password: String(password),
      });
    } catch (verifyErr) {
      console.error("Password verification error:", verifyErr);
      isPasswordValid = false;
    }

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password. Please try again." },
        { status: 401 }
      );
    }

    // Generate 6-digit OTP code (5 minutes expiry)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000;

    loginOtpStore.set(normalizedEmail, {
      otp,
      expires,
      verified: false,
      userName: user.name || normalizedEmail.split("@")[0],
    });

    console.log("==========================================");
    console.log(`🔐 [LOGIN OTP for ${normalizedEmail}]: ${otp}`);
    console.log("==========================================");

    // Send the OTP email asynchronously
    await sendLoginOtpEmail({
      email: normalizedEmail,
      otp,
      userName: user.name,
    });

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${normalizedEmail}.`,
    });
  } catch (err: unknown) {
    console.error("login-otp/send error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to process login request. Please try again." },
      { status: 500 }
    );
  }
}
