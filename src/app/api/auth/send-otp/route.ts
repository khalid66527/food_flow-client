import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

// In-memory OTP store (persisted across module reloads in global)
const globalForOtp = global as unknown as {
  __otpStore?: Map<string, { otp: string; expires: number }>;
};
const otpStore =
  globalForOtp.__otpStore ||
  new Map<string, { otp: string; expires: number }>();
globalForOtp.__otpStore = otpStore;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Valid email required" },
        { status: 400 }
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000;
    otpStore.set(email.toLowerCase(), { otp, expires });

    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const emailFrom = process.env.EMAIL_FROM

    // If SMTP credentials are configured, try sending real email
    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: Number(process.env.SMTP_PORT) === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        await transporter.sendMail({
          from: emailFrom,
          to: email,
          subject: "Food Flow - Password Reset Code",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:12px">
              <h2 style="color:#FF6B35">Food Flow - Password Reset</h2>
              <p>Your verification code is:</p>
              <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#111827;background:#FFF7ED;padding:16px;text-align:center;border-radius:12px;margin:16px 0">${otp}</div>
              <p style="color:#6B7280;font-size:13px">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
            </div>
          `,
        });

        console.log(`✉️ [SMTP] Password reset email sent to ${email} (OTP: ${otp})`);
        return NextResponse.json({
          success: true,
          message: "Verification code sent to your email",
        });
      } catch (smtpError) {
        console.error("SMTP sending failed, falling back to simulated OTP:", smtpError);
      }
    }

    // Fallback: If SMTP is not configured in .env or failed, log to terminal & allow testing
    console.log(`\n========================================`);
    console.log(`🔑 [DEV MODE] Password Reset OTP for ${email}: ${otp}`);
    console.log(`ℹ️ (You can use this OTP or demo OTP: 123456)`);
    console.log(`========================================\n`);

    return NextResponse.json({
      success: true,
      message: "Verification code sent! (Check terminal / use demo OTP: 123456)",
    });
  } catch (err) {
    console.error("send-otp error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to process request" },
      { status: 500 }
    );
  }
}

export function getOtpStore() {
  return (
    (global as unknown as { __otpStore?: Map<string, { otp: string; expires: number }> })
      .__otpStore || otpStore
  );
}
