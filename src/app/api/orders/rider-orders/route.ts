import { NextRequest, NextResponse } from "next/server";
import { getOrdersCollection } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode"); // "available" | "assigned" | "active" | null (all)
    const statusFilter = searchParams.get("status");

    let userId = req.headers.get("x-user-id");

    try {
      const session = await auth.api.getSession({ headers: req.headers });
      if (session?.user?.id) {
        userId = userId || session.user.id;
      }
    } catch (err) {
      console.warn("Session check in rider-orders route:", err);
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Rider identity required." },
        { status: 401 }
      );
    }

    const ordersCol = await getOrdersCollection();

    const query: Record<string, unknown> = {
      isDeleted: { $ne: true },
    };

    if (mode === "available") {
      query.orderStatus = "Out for Delivery";
      query["riderInfo.riderId"] = { $exists: false };
    } else if (mode === "assigned" || mode === "active") {
      query["riderInfo.riderId"] = userId;
      query.orderStatus = { $in: ["Out for Delivery", "Delivered"] };
    } else if (statusFilter) {
      const statuses = statusFilter.split(",").map((s) => s.trim());
      query.orderStatus = statuses.length === 1 ? statuses[0] : { $in: statuses };
      query["$or"] = [
        { "riderInfo.riderId": userId },
        { "riderInfo.riderId": { $exists: false } },
      ];
    } else {
      query["$or"] = [
        { "riderInfo.riderId": userId },
        { orderStatus: "Out for Delivery", "riderInfo.riderId": { $exists: false } },
      ];
    }

    const orders = await ordersCol
      .find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return NextResponse.json({ success: true, data: orders });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch rider orders.";
    console.error("Error fetching rider orders:", error);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}