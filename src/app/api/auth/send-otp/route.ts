import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const otpStore = new Map<string, { otp: string; expires: number }>();

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, message: "Valid email required" }, { status: 400 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000;
    otpStore.set(email.toLowerCase(), { otp, expires });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
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

    ;(global as unknown as { __otpStore?: Map<string, { otp: string; expires: number }> }).__otpStore = otpStore;

    return NextResponse.json({ success: true, message: "Verification code sent to your email" });
  } catch (err) {
    console.error("send-otp error:", err);
    return NextResponse.json({ success: false, message: "Failed to send email. Check SMTP config." }, { status: 500 });
  }
}

export function getOtpStore() {
  return (global as unknown as { __otpStore?: Map<string, { otp: string; expires: number }> }).__otpStore || otpStore;
}
