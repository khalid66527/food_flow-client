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
    const db = await getOrdersCollection().then((c) => c.dbName ? c : c);

    let matchedRestaurantIds: string[] = [];
    let matchedRestaurantNames: string[] = [];

    if (restaurantId) matchedRestaurantIds.push(restaurantId);
    if (restaurantName) matchedRestaurantNames.push(restaurantName);

    // Look up restaurant document for this user if not fully specified
    try {
      const database = await (await import("@/lib/db")).getDb();
      const restaurantsCol = database.collection("restaurants");
      const rDocs = await restaurantsCol.find({
        $or: [
          { userId: userId },
          { "owner.id": userId },
          { "owner.userId": userId },
          { email: req.headers.get("x-user-email") || "" },
          { contactEmail: req.headers.get("x-user-email") || "" },
        ],
      }).toArray();

      for (const r of rDocs) {
        if (r._id) matchedRestaurantIds.push(r._id.toString());
        if (r.id) matchedRestaurantIds.push(String(r.id));
        if (r.restaurantName) matchedRestaurantNames.push(r.restaurantName);
        if (r.name) matchedRestaurantNames.push(r.name);
      }
    } catch (e) {
      console.warn("Could not query restaurants collection in restaurant-orders:", e);
    }

    const query: Record<string, unknown> = {
      isDeleted: { $ne: true },
    };

    const orConditions: Array<Record<string, unknown>> = [];

    if (matchedRestaurantIds.length > 0) {
      orConditions.push({ "items.restaurantId": { $in: matchedRestaurantIds } });
    }
    if (matchedRestaurantNames.length > 0) {
      orConditions.push({ "items.restaurantName": { $in: matchedRestaurantNames } });
      for (const rName of matchedRestaurantNames) {
        orConditions.push({ "items.restaurantName": { $regex: new RegExp(`^${rName.trim()}$`, "i") } });
      }
    }

    if (orConditions.length > 0) {
      query["$or"] = orConditions;
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