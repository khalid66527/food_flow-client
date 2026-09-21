import { NextRequest, NextResponse } from "next/server";
import { getReviewsCollection, getOrdersCollection, getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, userId, userName, userEmail, userImage, reviews } = body;

    if (!orderId || !userId || !Array.isArray(reviews) || reviews.length === 0) {
      return NextResponse.json(
        { success: false, message: "orderId, userId, and at least one review item are required." },
        { status: 400 }
      );
    }

    const reviewsCol = await getReviewsCollection();
    const ordersCol = await getOrdersCollection();
    const db = await getDb();
    const now = new Date().toISOString();

    const queryConditions: any[] = [{ orderId }];
    if (ObjectId.isValid(orderId)) {
      queryConditions.push({ _id: new ObjectId(orderId) });
    }

    const orderDoc = await ordersCol.findOne({ $or: queryConditions });

    const insertedReviews = [];
    for (const r of reviews) {
      if (!r.targetType || !r.targetId || !r.rating) continue;
      const numericRating = Math.max(1, Math.min(5, Math.round(Number(r.rating) || 5)));

      const reviewDoc = {
        orderId: orderDoc?.orderId || orderId,
        userId,
        userName: userName || orderDoc?.userName || "Customer",
        userEmail: userEmail || orderDoc?.userEmail || "",
        userImage: userImage || "",
        targetType: r.targetType,
        targetId: r.targetId,
        targetName: r.targetName || "",
        rating: numericRating,
        comment: (r.comment || "").trim(),
        createdAt: now,
        updatedAt: now,
      };

      await reviewsCol.updateOne(
        { orderId: reviewDoc.orderId, targetType: reviewDoc.targetType, targetId: reviewDoc.targetId },
        { $set: reviewDoc },
        { upsert: true }
      );

      insertedReviews.push(reviewDoc);

      // Recalculate average rating for target collection asynchronously
      (async () => {
        try {
          const targetColName =
            r.targetType === "food"
              ? "food"
              : r.targetType === "restaurant"
              ? "restaurant"
              : r.targetType === "rider"
              ? "rider"
              : null;
          if (targetColName) {
            const pipeline = [
              { $match: { targetType: r.targetType, targetId: r.targetId } },
              {
                $group: {
                  _id: "$targetId",
                  avgRating: { $avg: "$rating" },
                  totalReviews: { $sum: 1 },
                },
              },
            ];
            const stats = await reviewsCol.aggregate(pipeline).toArray();
            if (stats.length > 0) {
              const avgRating = Math.round(stats[0].avgRating * 10) / 10;
              const totalReviews = stats[0].totalReviews;
              const col = db.collection(targetColName);
              const targetQuery: any[] = [{ id: r.targetId }, { _id: r.targetId }];
              if (ObjectId.isValid(r.targetId)) {
                targetQuery.push({ _id: new ObjectId(r.targetId) });
              }
              await col.updateOne(
                { $or: targetQuery },
                { $set: { rating: avgRating, reviewCount: totalReviews, updatedAt: now } }
              );
            }
          }
        } catch (e) {
          console.warn("Target rating calculation error:", e);
        }
      })();
    }

    // Mark order as reviewed
    await ordersCol.updateOne(
      { $or: queryConditions },
      { $set: { isReviewed: true, reviewedAt: now } }
    );

    return NextResponse.json({
      success: true,
      message: "Reviews submitted successfully!",
      count: insertedReviews.length,
      data: insertedReviews,
    });
  } catch (err: any) {
    console.error("POST /api/reviews error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to save reviews." },
      { status: 500 }
    );
  }
}
