import { NextResponse } from "next/server";
import { getUsersCollection, getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = await getDb();
    const usersCol = await getUsersCollection();
    const ridersCol = db.collection("rider");

    const [riderDocCount, userRiderCount] = await Promise.all([
      ridersCol.countDocuments({ status: { $ne: "rejected" } }).catch(() => 0),
      usersCol.countDocuments({ role: { $regex: /^(rider|driver|delivery)/i } }).catch(() => 0),
    ]);

    const count = Math.max(riderDocCount, userRiderCount);

    return NextResponse.json({
      success: true,
      data: { count },
    });
  } catch (err: any) {
    console.error("GET /api/stats/riders-count error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to fetch riders count." },
      { status: 500 }
    );
  }
}
