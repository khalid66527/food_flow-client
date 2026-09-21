import { NextResponse } from "next/server";
import { getReviewsCollection, getOrdersCollection, getUsersCollection } from "@/lib/db";

export async function GET() {
  try {
    const reviewsCol = await getReviewsCollection();
    const totalReviewSubmissions = await reviewsCol.countDocuments({}).catch(() => 0);

    let count = totalReviewSubmissions;
    if (count === 0) {
      const ordersCol = await getOrdersCollection();
      const usersCol = await getUsersCollection();
      const [orderUsers, registeredUsers] = await Promise.all([
        ordersCol.countDocuments({
          $or: [
            { orderStatus: { $regex: /^delivered$/i } },
            { deliveryStatus: { $regex: /^delivered$/i } },
          ],
        }).catch(() => 0),
        usersCol.countDocuments().catch(() => 0),
      ]);
      count = Math.max(orderUsers, registeredUsers);
    }

    return NextResponse.json({
      success: true,
      data: { count },
    });
  } catch (err: any) {
    console.error("GET /api/stats/happy-customers-count error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to fetch happy customers count." },
      { status: 500 }
    );
  }
}
