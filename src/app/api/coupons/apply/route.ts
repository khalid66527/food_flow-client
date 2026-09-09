import { NextRequest, NextResponse } from "next/server";
import { getCouponsCollection, getOrdersCollection } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, userId, subtotal } = body;

    const formattedCode = (code || "").trim().toUpperCase();
    if (!formattedCode) {
      return NextResponse.json(
        { success: false, message: "Please enter a coupon code." },
        { status: 400 }
      );
    }

    const couponsCol = await getCouponsCollection();
    const coupon = await couponsCol.findOne({ code: formattedCode });

    if (!coupon) {
      return NextResponse.json(
        { success: false, message: `Coupon "${formattedCode}" does not exist.` },
        { status: 404 }
      );
    }

    if (!coupon.isActive) {
      return NextResponse.json(
        { success: false, message: `Coupon "${formattedCode}" is currently inactive.` },
        { status: 400 }
      );
    }

    if (coupon.expiryDate && new Date(coupon.expiryDate).getTime() < Date.now()) {
      return NextResponse.json(
        { success: false, message: `Coupon "${formattedCode}" has expired.` },
        { status: 400 }
      );
    }

    const currentSubtotal = Number(subtotal) || 0;
    const minOrderVal = Number(coupon.minOrderValue) || 0;

    if (currentSubtotal < minOrderVal) {
      return NextResponse.json(
        {
          success: false,
          message: `Minimum order subtotal of ৳${minOrderVal} is required to apply "${formattedCode}".`,
        },
        { status: 400 }
      );
    }

    // REQUIREMENT 4: FIRST-ORDER WELCOME COUPON CHECK
    if (coupon.isFirstOrderOnly && userId) {
      const ordersCol = await getOrdersCollection();
      const priorOrder = await ordersCol.findOne({
        userId,
        orderStatus: { $ne: "Cancelled" },
      });

      if (priorOrder) {
        return NextResponse.json(
          {
            success: false,
            message: "This welcome coupon is valid exclusively for your first successful order!",
          },
          { status: 400 }
        );
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.discountType === "percentage") {
      discountAmount = (currentSubtotal * Number(coupon.discountValue)) / 100;
      if (coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0) {
        discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
      }
    } else {
      discountAmount = Number(coupon.discountValue);
    }

    discountAmount = Math.min(discountAmount, currentSubtotal);
    discountAmount = Math.round(discountAmount * 100) / 100;

    return NextResponse.json({
      success: true,
      code: coupon.code,
      discountAmount,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      isFirstOrderOnly: coupon.isFirstOrderOnly,
      message: `🎉 Coupon "${coupon.code}" applied successfully! You saved ৳${discountAmount.toFixed(2)}.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to validate coupon." },
      { status: 500 }
    );
  }
}
