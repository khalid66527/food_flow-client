import { NextRequest, NextResponse } from "next/server";
import { getOrdersCollection } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");
    const restaurantName = searchParams.get("restaurantName");
    const statusFilter = searchParams.get("status");

    let userId = req.headers.get("x-user-id");

    try {
      const session = await auth.api.getSession({ headers: req.headers });
      if (session?.user?.id) {
        userId = userId || session.user.id;
      }
    } catch (err) {
      console.warn("Session check in restaurant-orders route:", err);
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Restaurant identity required." },
        { status: 401 }
      );
    }

    const ordersCol = await getOrdersCollection();

    const query: Record<string, unknown> = {
      isDeleted: { $ne: true },
    };

    if (restaurantId) {
      query["items.restaurantId"] = restaurantId;
    } else if (restaurantName) {
      query["items.restaurantName"] = restaurantName;
    } else {
      query["$or"] = [
        { "items.restaurantId": userId },
        { userId },
      ];
    }

    if (statusFilter && statusFilter.toUpperCase() !== "ALL") {
      const statuses = statusFilter.split(",").map((s) => s.trim());
      query.orderStatus = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }

    const orders = await ordersCol
      .find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return NextResponse.json({ success: true, data: orders });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch restaurant orders.";
    console.error("Error fetching restaurant orders:", error);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}