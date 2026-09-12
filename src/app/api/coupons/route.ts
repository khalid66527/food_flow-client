import { NextRequest, NextResponse } from "next/server";
import { getCouponsCollection, getOrdersCollection } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode");
    const userId = searchParams.get("userId");
    const col = await getCouponsCollection();

    // Auto-migrate any old WELCOME30 coupon in DB to WELCOME20
    try {
      await col.updateMany(
        { code: "WELCOME30" },
        {
          $set: {
            code: "WELCOME20",
            discountType: "percentage",
            discountValue: 20,
            isFirstOrderOnly: true,
            updatedAt: new Date().toISOString(),
          },
        }
      );
    } catch (migErr) {
      console.warn("Coupon migration warning:", migErr);
    }

    let query: Record<string, any> = {};

    if (mode === "active") {
      const now = new Date().toISOString();
      query = {
        isActive: true,
        $or: [{ expiryDate: { $gt: now } }, { expiryDate: null }, { expiryDate: { $exists: false } }],
      };
    }

    let coupons = await col.find(query).sort({ createdAt: -1 }).toArray();

    // Global Coupon Visibility: Return active coupons globally to all customers
    if (userId && mode === "active") {
      try {
        const ordersCol = await getOrdersCollection();
        const userOrders = await ordersCol
          .find({ userId, orderStatus: { $ne: "Cancelled" } })
          .toArray();

        const hasPriorOrders = userOrders.length > 0;

        coupons = coupons.filter((c) => {
          const upperCode = (c.code || "").toUpperCase();
          // Filter out first-order only coupons ONLY if user has prior completed orders
          if (hasPriorOrders && (c.isFirstOrderOnly || upperCode.startsWith("WELCOME"))) {
            return false;
          }
          return true;
        });
      } catch (userFilterErr) {
        console.warn("User coupon filtering error:", userFilterErr);
      }
    }

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
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Coupon ID is required" },
        { status: 400 }
      );
    }

    const col = await getCouponsCollection();
    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    const existing = await col.findOne(query as any);
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Coupon not found" },
        { status: 404 }
      );
    }

    const updateFields: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (body.code !== undefined) {
      const formattedCode = (body.code || "").trim().toUpperCase();
      if (!formattedCode) {
        return NextResponse.json(
          { success: false, message: "Coupon code cannot be empty" },
          { status: 400 }
        );
      }
      const dup = await col.findOne({
        code: formattedCode,
        _id: { $ne: existing._id },
      });
      if (dup) {
        return NextResponse.json(
          { success: false, message: `Coupon code "${formattedCode}" is already taken.` },
          { status: 400 }
        );
      }
      updateFields.code = formattedCode;
    }

    if (body.discountType !== undefined) {
      updateFields.discountType = body.discountType === "percentage" ? "percentage" : "fixed";
    }
    if (body.discountValue !== undefined) {
      updateFields.discountValue = Math.max(0, Number(body.discountValue || 0));
    }
    if (body.minOrderValue !== undefined) {
      updateFields.minOrderValue = Math.max(0, Number(body.minOrderValue || 0));
    }
    if (body.maxDiscountAmount !== undefined) {
      updateFields.maxDiscountAmount = body.maxDiscountAmount ? Math.max(0, Number(body.maxDiscountAmount)) : undefined;
    }
    if (body.isFirstOrderOnly !== undefined) {
      updateFields.isFirstOrderOnly = Boolean(body.isFirstOrderOnly);
    }
    if (body.expiryDate !== undefined) {
      updateFields.expiryDate = body.expiryDate;
    }
    if (body.isActive !== undefined) {
      updateFields.isActive = Boolean(body.isActive);
    }

    await col.updateOne(query as any, { $set: updateFields });
    const updated = await col.findOne(query as any);

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Coupon update failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Coupon updated successfully",
      data: {
        ...updated,
        _id: updated._id.toString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update coupon" },
      { status: 500 }
    );
  }
}
