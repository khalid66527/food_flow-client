import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.BETTER_AUTH_SECRET ||
  "Ermde6JRPK1BwSjUnCI4H7gBKmTdq6WU";

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt(payload: any, secret: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signatureInput)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${signatureInput}.${signature}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, userId, email, name, role, phone } = body || {};

    if (!email && !id && !userId) {
      return NextResponse.json(
        { success: false, message: "Email or User ID is required" },
        { status: 400 }
      );
    }

    const payload = {
      id: String(id || userId || ""),
      userId: String(userId || id || ""),
      email: String(email || "").trim().toLowerCase(),
      name: name || "User",
      role: role || "Customer",
      phone: phone || "",
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    };

    const token = signJwt(payload, JWT_SECRET);

    return NextResponse.json({
      success: true,
      token,
      user: payload,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to issue JWT token" },
      { status: 500 }
    );
  }
}
