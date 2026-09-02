import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const identifier = searchParams.get("identifier") || searchParams.get("email") || searchParams.get("id");

    if (!identifier) {
      return NextResponse.json(
        { success: false, message: "User identifier is required." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const query: Record<string, any>[] = [
      { email: identifier },
      { id: identifier },
      { _id: identifier },
    ];

    if (ObjectId.isValid(identifier)) {
      try {
        query.push({ _id: new ObjectId(identifier) });
      } catch {}
    }

    // Check 'user' and 'users' collections
    const userCol = db.collection("user");
    const usersCol = db.collection("users");

    let user = await userCol.findOne({ $or: query });
    if (!user) {
      user = await usersCol.findOne({ $or: query });
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: user._id?.toString() || user.id,
        id: user.id || user._id?.toString(),
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        image: user.image || user.avatar || user.photo || "",
        photo: user.photo || user.image || user.avatar || "",
        role: user.role || "Customer",
        status: user.status || "active",
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/user/profile:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch user profile." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, userId, name, phone, image, photo } = body;

    const targetId = identifier || userId || body.email;
    if (!targetId) {
      return NextResponse.json(
        { success: false, message: "User identifier is required." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const query: Record<string, any>[] = [
      { email: targetId },
      { id: targetId },
      { _id: targetId },
    ];

    if (ObjectId.isValid(targetId)) {
      try {
        query.push({ _id: new ObjectId(targetId) });
      } catch {}
    }

    const updateDoc: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateDoc.name = name.trim();
    if (phone !== undefined) updateDoc.phone = phone.trim();
    if (image !== undefined || photo !== undefined) {
      const imgVal = image || photo;
      if (imgVal) {
        updateDoc.image = imgVal;
        updateDoc.photo = imgVal;
        updateDoc.avatar = imgVal;
      }
    }

    const userCol = db.collection("user");
    const usersCol = db.collection("users");

    // Update both user and users collections in MongoDB
    const [res1, res2] = await Promise.all([
      userCol.updateMany({ $or: query }, { $set: updateDoc }).catch(() => null),
      usersCol.updateMany({ $or: query }, { $set: updateDoc }).catch(() => null),
    ]);

    // Also attempt proxy to Express server if running
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_API_URL || "http://localhost:5000";
    fetch(`${serverUrl.replace(/\/$/, "")}/api/admin/users/${encodeURIComponent(targetId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateDoc),
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully!",
      data: {
        identifier: targetId,
        ...updateDoc,
      },
    });
  } catch (error: any) {
    console.error("Error in PATCH /api/user/profile:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update profile." },
      { status: 500 }
    );
  }
}
