import { NextRequest, NextResponse } from "next/server";
import { getOtpStore } from "../send-otp/route";
import { getDb } from "@/lib/mongodb";
import { hashPassword } from "better-auth/crypto";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const store = getOtpStore();
    const record = store.get(normalizedEmail);

    // Verify that the user actually completed the OTP verification step
    if (!record || !record.verified) {
      return NextResponse.json(
        {
          success: false,
          message: "Please verify the OTP code sent to your email first.",
        },
        { status: 403 }
      );
    }

    const db = await getDb();
    const user = await db.collection("user").findOne({ email: normalizedEmail });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Account not found for this email address.",
        },
        { status: 404 }
      );
    }

    // Generate Better-Auth compliant password hash (salt:hash format)
    const hashedPassword = await hashPassword(password);
    const now = new Date();

    // Look for existing credential account for this user
    const userIdObj = user._id;
    const userIdStr = user.id || String(user._id);

    const updateResult = await db.collection("account").updateOne(
      {
        providerId: "credential",
        $or: [
          { userId: userIdObj },
          { userId: userIdStr },
          { accountId: userIdStr },
          { accountId: userIdObj },
        ],
      },
      {
        $set: {
          password: hashedPassword,
          updatedAt: now,
        },
      }
    );

    // If no credential account was found (e.g. user was created without password), insert one
    if (updateResult.matchedCount === 0) {
      await db.collection("account").insertOne({
        userId: userIdObj,
        accountId: userIdStr,
        providerId: "credential",
        password: hashedPassword,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Also update updatedAt on user document
    await db.collection("user").updateOne(
      { _id: user._id },
      { $set: { updatedAt: now } }
    );

    // Remove the OTP record from memory once password reset is successfully finished
    store.delete(normalizedEmail);

    console.log(`✅ [Password Reset] Password successfully updated in DB for: ${normalizedEmail}`);

    return NextResponse.json({
      success: true,
      message: "Password reset successfully! You can now sign in with your new password.",
    });
  } catch (err) {
    console.error("reset-password error:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to reset password in database. Please try again.",
      },
      { status: 500 }
    );
  }
}
