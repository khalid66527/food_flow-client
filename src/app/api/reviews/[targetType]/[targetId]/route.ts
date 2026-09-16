import { NextRequest, NextResponse } from "next/server";
import { getReviewsCollection, getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ targetType: string; targetId: string }> }
) {
  try {
    const { targetType, targetId } = await context.params;

    if (!targetType || !targetId) {
      return NextResponse.json(
        { success: false, message: "targetType and targetId are required." },
        { status: 400 }
      );
    }

    const reviewsCol = await getReviewsCollection();

    if (targetType === "order") {
      const reviews = await reviewsCol.find({ orderId: targetId }).toArray();
      return NextResponse.json({
        success: true,
        data: {
          orderId: targetId,
          isReviewed: reviews.length > 0,
          reviews,
        },
      });
    }

    if (targetType === "rider") {
      const reviews = await reviewsCol
        .find({ targetType: "rider", targetId })
        .sort({ createdAt: -1 })
        .toArray();

      const totalReviews = reviews.length;
      let avgRating = 0;
      const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

      if (totalReviews > 0) {
        const sum = reviews.reduce((acc, r) => {
          const star = Math.max(1, Math.min(5, Math.round(r.rating || 5)));
          ratingBreakdown[star as keyof typeof ratingBreakdown] = (ratingBreakdown[star as keyof typeof ratingBreakdown] || 0) + 1;
          return acc + r.rating;
        }, 0);
        avgRating = Math.round((sum / totalReviews) * 10) / 10;
      }

      return NextResponse.json({
        success: true,
        data: {
          riderId: targetId,
          avgRating,
          totalReviews,
          ratingBreakdown,
          reviews,
        },
      });
    }

    if (targetType === "restaurant") {
      const db = await getDb();
      const restaurantReviews = await reviewsCol
        .find({ targetType: "restaurant", targetId })
        .sort({ createdAt: -1 })
        .toArray();

      // Find food items belonging to this restaurant to fetch their item reviews too
      const foodItems = await db
        .collection("food")
        .find({ $or: [{ restaurantId: targetId }, { "restaurant._id": targetId }] })
        .toArray();

      const foodIds = foodItems
        .map((item) => item._id.toString())
        .concat(foodItems.map((item) => item.id).filter(Boolean));

      const foodReviews = await reviewsCol
        .find({ targetType: "food", targetId: { $in: foodIds } })
        .sort({ createdAt: -1 })
        .toArray();

      const totalReviews = restaurantReviews.length;
      let avgRating = 0;
      const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

      if (totalReviews > 0) {
        const sum = restaurantReviews.reduce((acc, r) => {
          const star = Math.max(1, Math.min(5, Math.round(r.rating || 5)));
          ratingBreakdown[star as keyof typeof ratingBreakdown] = (ratingBreakdown[star as keyof typeof ratingBreakdown] || 0) + 1;
          return acc + r.rating;
        }, 0);
        avgRating = Math.round((sum / totalReviews) * 10) / 10;
      }

      return NextResponse.json({
        success: true,
        data: {
          restaurantId: targetId,
          avgRating,
          totalReviews,
          ratingBreakdown,
          reviews: restaurantReviews,
          foodReviews,
        },
      });
    }

    if (targetType === "food") {
      const queryConditions: any[] = [{ targetId }];
      if (ObjectId.isValid(targetId)) {
        queryConditions.push({ targetId });
      }

      const reviews = await reviewsCol
        .find({ targetType: "food", $or: queryConditions })
        .sort({ createdAt: -1 })
        .toArray();

      const totalReviews = reviews.length;
      let avgRating = 0;
      const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

      if (totalReviews > 0) {
        const sum = reviews.reduce((acc, r) => {
          const star = Math.max(1, Math.min(5, Math.round(r.rating || 5)));
          ratingBreakdown[star as keyof typeof ratingBreakdown] = (ratingBreakdown[star as keyof typeof ratingBreakdown] || 0) + 1;
          return acc + r.rating;
        }, 0);
        avgRating = Math.round((sum / totalReviews) * 10) / 10;
      }

      return NextResponse.json({
        success: true,
        data: {
          foodId: targetId,
          avgRating,
          totalReviews,
          ratingBreakdown,
          reviews,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: `Unsupported targetType: ${targetType}` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("GET /api/reviews/[targetType]/[targetId] error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to fetch reviews." },
      { status: 500 }
    );
  }
}
