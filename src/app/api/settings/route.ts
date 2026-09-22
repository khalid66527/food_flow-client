import { NextRequest, NextResponse } from "next/server";
import { getSettingsCollection } from "@/lib/db";

const DEFAULT_SETTINGS = {
  key: "global_settings",
  vatPercentage: 5,
  restaurantCommissionPercentage: 15,
  deliveryFeeBase: 40,
  riderCommissionPercentage: 100,
  freeDeliveryThreshold: 500,
  updatedAt: new Date().toISOString(),
};

export async function GET() {
  try {
    const col = await getSettingsCollection();
    let settings = await col.findOne({ key: "global_settings" });

    if (!settings) {
      await col.insertOne(DEFAULT_SETTINGS);
      settings = await col.findOne({ key: "global_settings" });
    }

    const data = {
      vatPercentage: Number(settings?.vatPercentage ?? 5),
      restaurantCommissionPercentage: Number(settings?.restaurantCommissionPercentage ?? 15),
      deliveryFeeBase: Number(settings?.deliveryFeeBase ?? 40),
      riderCommissionPercentage: Number(settings?.riderCommissionPercentage ?? 100),
      freeDeliveryThreshold: Number(settings?.freeDeliveryThreshold ?? 500),
      updatedAt: settings?.updatedAt || new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch platform settings" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const col = await getSettingsCollection();

    const updateDoc: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (body.vatPercentage !== undefined) {
      updateDoc.vatPercentage = Math.max(0, Number(body.vatPercentage));
    }
    if (body.restaurantCommissionPercentage !== undefined) {
      updateDoc.restaurantCommissionPercentage = Math.max(0, Number(body.restaurantCommissionPercentage));
    }
    if (body.deliveryFeeBase !== undefined) {
      updateDoc.deliveryFeeBase = Math.max(0, Number(body.deliveryFeeBase));
    }
    if (body.riderCommissionPercentage !== undefined) {
      updateDoc.riderCommissionPercentage = Math.max(0, Math.min(100, Number(body.riderCommissionPercentage)));
    }
    if (body.freeDeliveryThreshold !== undefined) {
      updateDoc.freeDeliveryThreshold = Math.max(0, Number(body.freeDeliveryThreshold));
    }

    await col.updateOne(
      { key: "global_settings" },
      { $set: updateDoc },
      { upsert: true }
    );

    const updated = await col.findOne({ key: "global_settings" });

    return NextResponse.json({
      success: true,
      message: "Platform settings updated successfully",
      data: {
        vatPercentage: Number(updated?.vatPercentage ?? 5),
        restaurantCommissionPercentage: Number(updated?.restaurantCommissionPercentage ?? 15),
        deliveryFeeBase: Number(updated?.deliveryFeeBase ?? 40),
        riderCommissionPercentage: Number(updated?.riderCommissionPercentage ?? 100),
        freeDeliveryThreshold: Number(updated?.freeDeliveryThreshold ?? 500),
        updatedAt: updated?.updatedAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update platform settings" },
      { status: 500 }
    );
  }
}
