import { NextRequest, NextResponse } from "next/server";
import { getSuccessOrdersCollection, getOrdersCollection, getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role"); // "customer" | "rider" | "restaurant"
    const userIdQuery = searchParams.get("userId");
    const restaurantIdQuery = searchParams.get("restaurantId");
    const restaurantNameQuery = searchParams.get("restaurantName");

    let userId = req.headers.get("x-user-id") || userIdQuery;
    const userEmail = req.headers.get("x-user-email");

    try {
      const session = await auth.api.getSession({ headers: req.headers });
      if (session?.user?.id) {
        userId = userId || session.user.id;
      }
    } catch (err) {
      console.warn("Session check in success-orders route:", err);
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User identity required." },
        { status: 401 }
      );
    }

    const successCol = await getSuccessOrdersCollection();
    const ordersCol = await getOrdersCollection();

    const query: Record<string, unknown> = {
      isDeleted: { $ne: true },
      orderStatus: "Delivered",
    };

    if (role === "rider") {
      query["riderInfo.riderId"] = userId;
    } else if (role === "restaurant") {
      let matchedIds: string[] = [];
      let matchedNames: string[] = [];
      if (restaurantIdQuery) matchedIds.push(restaurantIdQuery);
      if (restaurantNameQuery) matchedNames.push(restaurantNameQuery);

      try {
        const database = await getDb();
        const restaurantsCol = database.collection("restaurants");
        const rDocs = await restaurantsCol.find({
          $or: [
            { userId },
            { "owner.id": userId },
            { "owner.userId": userId },
            { email: userEmail || "" },
            { contactEmail: userEmail || "" },
          ],
        }).toArray();

        for (const r of rDocs) {
          if (r._id) matchedIds.push(r._id.toString());
          if (r.id) matchedIds.push(String(r.id));
          if (r.restaurantName) matchedNames.push(r.restaurantName);
          if (r.name) matchedNames.push(r.name);
        }
      } catch (e) {
        console.warn("Could not query restaurants collection in success-orders:", e);
      }

      const orConditions: Array<Record<string, unknown>> = [];
      if (matchedIds.length > 0) {
        orConditions.push({ "items.restaurantId": { $in: matchedIds } });
      }
      if (matchedNames.length > 0) {
        orConditions.push({ "items.restaurantName": { $in: matchedNames } });
        for (const rName of matchedNames) {
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
    } else {
      // Default: Customer
      query.userId = userId;
    }

    // 1. Fetch from successorders collection
    let records = await successCol.find(query).sort({ deliveredAt: -1, createdAt: -1 }).toArray();

    // 2. Fallback / Sync from orders collection if successorders doesn't have all records yet
    if (records.length === 0) {
      records = await ordersCol.find(query).sort({ deliveredAt: -1, createdAt: -1 }).toArray();
    }

    return NextResponse.json({
      success: true,
      data: records,
    });
  } catch (error: any) {
    console.error("Error fetching success orders:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch success orders." },
      { status: 500 }
    );
  }
}
