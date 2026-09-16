import { NextRequest, NextResponse } from "next/server";
import { getReviewsCollection } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetType = searchParams.get("targetType");
    const minRating = searchParams.get("minRating");
    const search = searchParams.get("search");

    const reviewsCol = await getReviewsCollection();
    const query: any = {};

    if (targetType && targetType.toLowerCase() !== "all") {
      query.targetType = targetType.toLowerCase();
    }

    if (minRating && Number(minRating) > 0) {
      query.rating = { $gte: Number(minRating) };
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { userName: searchRegex },
        { userEmail: searchRegex },
        { targetName: searchRegex },
        { comment: searchRegex },
        { orderId: searchRegex },
      ];
    }

    const allReviews = await reviewsCol.find(query).sort({ createdAt: -1 }).toArray();

    const totalReviews = allReviews.length;
    const riderReviews = allReviews.filter((r) => r.targetType === "rider");
    const restaurantReviews = allReviews.filter((r) => r.targetType === "restaurant");
    const foodReviews = allReviews.filter((r) => r.targetType === "food");

    const calcAvg = (items: any[]) =>
      items.length > 0
        ? Math.round((items.reduce((acc, i) => acc + (i.rating || 5), 0) / items.length) * 10) / 10
        : 0;

    const avgRating = calcAvg(allReviews);
    const avgRiderRating = calcAvg(riderReviews);
    const avgRestaurantRating = calcAvg(restaurantReviews);

    const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    allReviews.forEach((r) => {
      const star = Math.max(1, Math.min(5, Math.round(r.rating || 5)));
      ratingBreakdown[star as keyof typeof ratingBreakdown] =
        (ratingBreakdown[star as keyof typeof ratingBreakdown] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      data: {
        totalReviews,
        avgRating,
        avgRiderRating,
        avgRestaurantRating,
        totalRiderReviews: riderReviews.length,
        totalRestaurantReviews: restaurantReviews.length,
        totalFoodReviews: foodReviews.length,
        ratingBreakdown,
        reviews: allReviews,
      },
    });
  } catch (err: any) {
    console.error("GET /api/reviews/admin/all error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to fetch admin reviews." },
      { status: 500 }
    );
  }
}
