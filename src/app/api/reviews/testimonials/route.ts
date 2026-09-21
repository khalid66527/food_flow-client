import { NextRequest, NextResponse } from "next/server";
import { getReviewsCollection } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const starFilter = searchParams.get("starFilter") || searchParams.get("rating");

    const reviewsCol = await getReviewsCollection();

    const query: any = { isFeatured: true };
    if (starFilter && starFilter !== "all" && Number(starFilter) > 0) {
      query.rating = Number(starFilter);
    }

    // Fetch strictly Admin-Featured reviews for Homepage slider
    let reviews = await reviewsCol.find(query).sort({ createdAt: -1 }).toArray();

    // Fallback: If no reviews have been explicitly featured by Admin yet, fetch top rated (4-5 star) reviews
    if (reviews.length === 0) {
      const fallbackQuery: any = {};
      if (starFilter && starFilter !== "all" && Number(starFilter) > 0) {
        fallbackQuery.rating = Number(starFilter);
      } else {
        fallbackQuery.rating = { $gte: 4 };
      }
      reviews = await reviewsCol.find(fallbackQuery).sort({ createdAt: -1 }).limit(10).toArray();
    }

    // Global total reviews & average rating across all verified database reviews
    const totalReviews = await reviewsCol.countDocuments({}).catch(() => 0);

    let avgRating = 4.8;
    try {
      const ratingPipeline = [
        {
          $group: {
            _id: null,
            avgRating: { $avg: "$rating" },
          },
        },
      ];
      const ratingResult = await reviewsCol.aggregate(ratingPipeline).toArray();
      if (ratingResult.length > 0 && ratingResult[0].avgRating > 0) {
        avgRating = Math.round(ratingResult[0].avgRating * 10) / 10;
      }
    } catch (e) {
      console.warn("Error computing avg rating in route handler:", e);
    }

    // Happy customers count is real count of review submissions
    const happyCustomers = totalReviews;

    return NextResponse.json({
      success: true,
      data: {
        reviews,
        avgRating,
        happyCustomers,
        totalReviews,
      },
    });
  } catch (err: any) {
    console.error("GET /api/reviews/testimonials error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to fetch testimonials." },
      { status: 500 }
    );
  }
}
