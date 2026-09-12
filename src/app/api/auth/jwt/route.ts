import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.BETTER_AUTH_SECRET ||
  "Ermde6JRPK1BwSjUnCI4H7gBKmTdq6WU";

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
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: "7d",
    });

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
