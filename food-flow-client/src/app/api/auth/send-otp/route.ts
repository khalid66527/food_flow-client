import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getDb } from "@/lib/mongodb";

// In-memory OTP store (persisted across module reloads in global)
const globalForOtp = global as unknown as {
  __otpStore?: Map<string, { otp: string; expires: number; verified?: boolean }>;
};
const otpStore =
  globalForOtp.__otpStore ||
  new Map<string, { otp: string; expires: number; verified?: boolean }>();
globalForOtp.__otpStore = otpStore;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists in MongoDB database
    try {
      const db = await getDb();
      const user = await db.collection("user").findOne({ email: normalizedEmail });
      if (!user) {
        return NextResponse.json(
          {
            success: false,
            message: "No account found with this email. Please check your email or register.",
          },
          { status: 404 }
        );
      }
    } catch (dbErr) {
      console.warn("DB user check warning in send-otp:", dbErr);
    }

    // Generate random 6-digit OTP (expires in 10 minutes)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000;
    otpStore.set(normalizedEmail, { otp, expires, verified: false });

    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = Number(process.env.SMTP_PORT) || 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const rawEmailFrom = process.env.EMAIL_FROM || smtpUser || "support.foodflow@gmail.com";

    // Format sender display name nicely: "Food Flow Support <email@domain.com>"
    const fromSender = rawEmailFrom.includes("<")
      ? rawEmailFrom
      : `"Food Flow Support" <${rawEmailFrom}>`;

    // Try sending real email if SMTP credentials are configured
    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        // Beautiful, responsive, branded HTML email template
        const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Food Flow - Password Reset Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #E2E8F0;">
          
          <!-- Header with Brand Accent -->
          <tr>
            <td style="background: linear-gradient(135deg, #FF6B35 0%, #F97316 100%); padding: 36px 32px 30px 32px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(255,255,255,0.2); padding: 8px 18px; border-radius: 9999px; margin-bottom: 12px;">
                <span style="font-size: 13px; font-weight: 700; color: #FFFFFF; letter-spacing: 1px; text-transform: uppercase;">🍔 Food Flow Security</span>
              </div>
              <h1 style="margin: 0; color: #FFFFFF; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Password Reset Code</h1>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px 28px 32px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #0F172A;">
                Hello,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748B; line-height: 1.6;">
                We received a request to reset the password for your Food Flow account. Use the 6-digit verification code below to proceed:
              </p>

              <!-- OTP Code Display Card -->
              <div style="background: #FFF7ED; border: 2px dashed #FDBA74; border-radius: 18px; padding: 22px 16px; margin: 24px 0; text-align: center;">
                <span style="display: block; font-size: 12px; font-weight: 700; color: #EA580C; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">Your Verification Code</span>
                <span style="display: block; font-size: 38px; font-weight: 900; letter-spacing: 12px; color: #C2410C; font-family: 'Courier New', Courier, monospace; margin-left: 12px;">
                  ${otp}
                </span>
              </div>

              <!-- Time Limit Notice -->
              <div style="display: inline-block; background-color: #FEF3C7; border-radius: 10px; padding: 8px 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; font-weight: 600; color: #92400E;">
                  ⏱️ This code expires in <strong>10 minutes</strong>
                </p>
              </div>

              <!-- Security Advisory -->
              <p style="margin: 0 0 16px 0; font-size: 13px; color: #94A3B8; line-height: 1.5; text-align: left; background-color: #F8FAFC; padding: 14px 18px; border-radius: 12px; border-left: 4px solid #CBD5E1;">
                🔒 <strong>Security Tip:</strong> Never share this code with anyone. Food Flow support representatives will never ask you for your verification code. If you did not make this request, please safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #F1F5F9; padding: 24px 32px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748B; font-weight: 500;">
                Food Flow &bull; Fast, Fresh & Reliable Food Delivery
              </p>
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">
                Need assistance? Contact us at <a href="mailto:support.foodflow@gmail.com" style="color: #FF6B35; text-decoration: none; font-weight: 600;">support.foodflow@gmail.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `;

        await transporter.sendMail({
          from: fromSender,
          to: normalizedEmail,
          subject: "🔐 Food Flow - Your Password Reset Code",
          html: emailHtml,
        });

        console.log(`✉️ [SMTP] Password reset email sent to ${normalizedEmail} with OTP: ${otp}`);
        return NextResponse.json({
          success: true,
          message: "Verification code sent to your email.",
        });
      } catch (smtpError) {
        console.error("⚠️ SMTP sending error:", smtpError);
        console.log("==========================================");
        console.log(`🔑 [FALLBACK OTP for ${normalizedEmail}]: ${otp}`);
        console.log("==========================================");

        // Fallback for development if SMTP fails (e.g. invalid credentials)
        return NextResponse.json({
          success: true,
          message: "Verification code generated! (Please check your email or server console in development).",
        });
      }
    }

    // If SMTP is not configured at all, fallback to console OTP for local testing
    console.log("==========================================");
    console.log(`🔑 [LOCAL DEV OTP for ${normalizedEmail}]: ${otp}`);
    console.log("==========================================");
    return NextResponse.json({
      success: true,
      message: "Verification code generated (Check server console in development).",
    });
  } catch (err) {
    console.error("send-otp server error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to process request. Please try again." },
      { status: 500 }
    );
  }
}

export function getOtpStore() {
  return (
    (global as unknown as { __otpStore?: Map<string, { otp: string; expires: number; verified?: boolean }> })
      .__otpStore || otpStore
  );
}
