import { NextRequest, NextResponse } from "next/server";
import { getReviewsCollection } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reviewsCol = await getReviewsCollection();

    const queryConditions: any[] = [{ _id: id }];
    if (ObjectId.isValid(id)) {
      queryConditions.push({ _id: new ObjectId(id) });
    }

    const reviewDoc = await reviewsCol.findOne({ $or: queryConditions });
    if (!reviewDoc) {
      return NextResponse.json(
        { success: false, message: `Review not found for ID: ${id}` },
        { status: 404 }
      );
    }

    const nextFeatured = typeof body.isFeatured === "boolean" ? body.isFeatured : !reviewDoc.isFeatured;

    await reviewsCol.updateOne(
      { $or: queryConditions },
      { $set: { isFeatured: nextFeatured, updatedAt: new Date().toISOString() } }
    );

    return NextResponse.json({
      success: true,
      reviewId: id,
      isFeatured: nextFeatured,
      message: nextFeatured ? "Review marked as featured on homepage!" : "Review unfeatured.",
    });
  } catch (err: any) {
    console.error("PATCH /api/reviews/feature/[id] error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to update review status." },
      { status: 500 }
    );
  }
}
