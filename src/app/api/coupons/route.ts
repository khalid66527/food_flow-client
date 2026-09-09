import { NextRequest, NextResponse } from "next/server";
import { getCouponsCollection } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode");
    const col = await getCouponsCollection();

    let query: Record<string, any> = {};

    if (mode === "active") {
      const now = new Date().toISOString();
      query = {
        isActive: true,
        $or: [{ expiryDate: { $gt: now } }, { expiryDate: null }, { expiryDate: { $exists: false } }],
      };
    }

    const coupons = await col.find(query).sort({ createdAt: -1 }).toArray();

    return NextResponse.json({
      success: true,
      data: coupons.map((c) => ({
        ...c,
        _id: c._id.toString(),
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch coupons" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const formattedCode = (body.code || "").trim().toUpperCase();

    if (!formattedCode) {
      return NextResponse.json(
        { success: false, message: "Coupon code is required" },
        { status: 400 }
      );
    }

    const col = await getCouponsCollection();
    const existing = await col.findOne({ code: formattedCode });

    if (existing) {
      return NextResponse.json(
        { success: false, message: `Coupon code "${formattedCode}" already exists!` },
        { status: 400 }
      );
    }

    const couponDoc = {
      code: formattedCode,
      discountType: body.discountType === "percentage" ? "percentage" : "fixed",
      discountValue: Math.max(0, Number(body.discountValue || 0)),
      minOrderValue: Math.max(0, Number(body.minOrderValue || 0)),
      maxDiscountAmount: body.maxDiscountAmount ? Math.max(0, Number(body.maxDiscountAmount)) : undefined,
      isFirstOrderOnly: Boolean(body.isFirstOrderOnly),
      expiryDate: body.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await col.insertOne(couponDoc);

    return NextResponse.json({
      success: true,
      message: "Coupon created successfully",
      data: {
        ...couponDoc,
        _id: result.insertedId.toString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create coupon" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Coupon ID is required" },
        { status: 400 }
      );
    }

    const col = await getCouponsCollection();
    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    await col.deleteOne(query as any);

    return NextResponse.json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete coupon" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Coupon ID is required" },
        { status: 400 }
      );
    }

    const col = await getCouponsCollection();
    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    await col.updateOne(query as any, {
      $set: { isActive: Boolean(isActive), updatedAt: new Date().toISOString() },
    });

    const updated = await col.findOne(query as any);

    return NextResponse.json({
      success: true,
      message: "Coupon status updated",
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update coupon status" },
      { status: 500 }
    );
  }
}
