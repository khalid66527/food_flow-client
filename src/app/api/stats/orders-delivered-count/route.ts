import { NextResponse } from "next/server";
import { getOrdersCollection, getSuccessOrdersCollection } from "@/lib/db";

export async function GET() {
  try {
    const ordersCol = await getOrdersCollection();
    const successOrdersCol = await getSuccessOrdersCollection();

    const [ordersDeliveredCount, successOrdersCount] = await Promise.all([
      ordersCol.countDocuments({
        $or: [
          { orderStatus: { $regex: /^delivered$/i } },
          { deliveryStatus: { $regex: /^delivered$/i } },
        ],
      }).catch(() => 0),
      successOrdersCol.countDocuments().catch(() => 0),
    ]);

    const count = Math.max(ordersDeliveredCount, successOrdersCount);

    return NextResponse.json({
      success: true,
      data: { count },
    });
  } catch (err: any) {
    console.error("GET /api/stats/orders-delivered-count error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to fetch orders delivered count." },
      { status: 500 }
    );
  }
}
