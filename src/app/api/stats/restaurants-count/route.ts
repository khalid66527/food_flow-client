import { NextResponse } from "next/server";
import { getRestaurantsCollection, getUsersCollection } from "@/lib/db";

export async function GET() {
  try {
    const restaurantsCol = await getRestaurantsCollection();
    const usersCol = await getUsersCollection();

    const [restaurantDocCount, userRestaurantCount] = await Promise.all([
      restaurantsCol.countDocuments({ status: { $ne: "rejected" } }).catch(() => 0),
      usersCol.countDocuments({ role: { $regex: /^(restaurant|vendor)/i } }).catch(() => 0),
    ]);

    const count = Math.max(restaurantDocCount, userRestaurantCount);

    return NextResponse.json({
      success: true,
      data: { count },
    });
  } catch (err: any) {
    console.error("GET /api/stats/restaurants-count error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to fetch restaurants count." },
      { status: 500 }
    );
  }
}
