import { NextResponse } from "next/server";
import {
  getRestaurantsCollection,
  getOrdersCollection,
  getSuccessOrdersCollection,
  getReviewsCollection,
  getUsersCollection,
  getDb,
} from "@/lib/db";

export async function GET() {
  try {
    const db = await getDb();
    const restaurantsCol = await getRestaurantsCollection();
    const ordersCol = await getOrdersCollection();
    const successOrdersCol = await getSuccessOrdersCollection();
    const reviewsCol = await getReviewsCollection();
    const usersCol = await getUsersCollection();
    const ridersCol = db.collection("rider");

    // 1. Partner Restaurants Count
    const [restaurantDocCount, userRestaurantCount] = await Promise.all([
      restaurantsCol.countDocuments({ status: { $ne: "rejected" } }).catch(() => 0),
      usersCol.countDocuments({ role: { $regex: /^(restaurant|vendor)/i } }).catch(() => 0),
    ]);
    const partnerRestaurants = Math.max(restaurantDocCount, userRestaurantCount);

    // 2. Successful Orders Delivered Count
    const [ordersDeliveredCount, successOrdersCount] = await Promise.all([
      ordersCol.countDocuments({
        $or: [
          { orderStatus: { $regex: /^delivered$/i } },
          { deliveryStatus: { $regex: /^delivered$/i } },
        ],
      }).catch(() => 0),
      successOrdersCol.countDocuments().catch(() => 0),
    ]);
    const successfulOrders = Math.max(ordersDeliveredCount, successOrdersCount);

    // 3. Active Riders Count
    const [riderDocCount, userRiderCount] = await Promise.all([
      ridersCol.countDocuments({ status: { $ne: "rejected" } }).catch(() => 0),
      usersCol.countDocuments({ role: { $regex: /^(rider|driver|delivery)/i } }).catch(() => 0),
    ]);
    const activeRiders = Math.max(riderDocCount, userRiderCount);

    // 4. Happy Customers Count
    let happyCustomers = 0;
    try {
      const deliveredCustomerPipeline = [
        {
          $match: {
            $or: [
              { orderStatus: { $regex: /^delivered$/i } },
              { deliveryStatus: { $regex: /^delivered$/i } },
            ],
          },
        },
        {
          $group: {
            _id: null,
            uniqueUsers: { $addToSet: { $ifNull: ["$userId", "$userEmail"] } },
          },
        },
      ];
      const result = await ordersCol.aggregate(deliveredCustomerPipeline).toArray();
      const uniqueOrderUsers =
        result.length > 0 && Array.isArray(result[0].uniqueUsers) ? result[0].uniqueUsers.length : 0;

      const reviewCustomerPipeline = [
        {
          $group: {
            _id: null,
            uniqueUsers: { $addToSet: { $ifNull: ["$userId", "$userEmail"] } },
          },
        },
      ];
      const reviewResult = await reviewsCol.aggregate(reviewCustomerPipeline).toArray();
      const uniqueReviewUsers =
        reviewResult.length > 0 && Array.isArray(reviewResult[0].uniqueUsers) ? reviewResult[0].uniqueUsers.length : 0;

      const totalRegisteredCustomers = await usersCol.countDocuments({
        $or: [
          { role: { $regex: /^(customer|user|client)/i } },
          { role: null },
          { role: "" },
        ],
      }).catch(() => 0);

      happyCustomers = Math.max(uniqueOrderUsers, uniqueReviewUsers, totalRegisteredCustomers);
    } catch (e) {
      console.warn("Error computing happy customers:", e);
      happyCustomers = await usersCol.countDocuments().catch(() => 0);
    }

    // 5. Average Rating
    let avgRating = 4.8;
    let totalReviews = 0;
    try {
      const ratingPipeline = [
        {
          $group: {
            _id: null,
            avgRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
          },
        },
      ];
      const ratingResult = await reviewsCol.aggregate(ratingPipeline).toArray();
      if (ratingResult.length > 0 && ratingResult[0].totalReviews > 0) {
        avgRating = Math.round(ratingResult[0].avgRating * 10) / 10;
        totalReviews = ratingResult[0].totalReviews;
      }
    } catch (e) {
      console.warn("Error computing avg rating:", e);
    }

    return NextResponse.json({
      success: true,
      data: {
        partnerRestaurants,
        successfulOrders,
        activeRiders,
        happyCustomers,
        avgRating,
        totalReviews,
      },
    });
  } catch (err: any) {
    console.error("GET /api/stats error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to fetch platform stats." },
      { status: 500 }
    );
  }
}
