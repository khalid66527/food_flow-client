import { NextRequest, NextResponse } from "next/server";
import { getOrdersCollection } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ObjectId } from "mongodb";
import Stripe from "stripe";
import { sendOrderRefundEmail, sendOrderCancellationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    let sessionUser: { id?: string; email?: string; name?: string; role?: string } | null = null;
    try {
      const session = await auth.api.getSession({ headers: req.headers });
      if (session?.user) {
        sessionUser = session.user as any;
      }
    } catch (err) {
      console.warn("Session check fallback in /api/orders/refund:", err);
    }

    const body = await req.json();
    const { orderId, amount, reason, markAsCancelled = true } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "Order ID is required to process a refund." },
        { status: 400 }
      );
    }

    const ordersCol = await getOrdersCollection();
    const queryConditions: any[] = [{ orderId: orderId }];
    if (ObjectId.isValid(orderId)) {
      queryConditions.push({ _id: new ObjectId(orderId) });
    }

    const order = await ordersCol.findOne({ $or: queryConditions });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found." },
        { status: 404 }
      );
    }

    const refundAmount = amount ? Number(amount) : order.totalAmount || 0;
    const refundReason = reason || "Refund processed by Administrator";
    let stripeRefundId: string | undefined = undefined;

    // Execute Stripe Refund if order was paid with Stripe
    if (order.paymentMethod === "STRIPE") {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
      if (stripeSecretKey && order.stripeSessionId) {
        try {
          const stripeInstance = new Stripe(stripeSecretKey.trim(), {
            apiVersion: "2025-02-24.acacia" as any,
          });
          const session = await stripeInstance.checkout.sessions.retrieve(order.stripeSessionId);
          if (session && session.payment_intent) {
            const paymentIntentId =
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : (session.payment_intent as any).id;

            const stripeRefund = await stripeInstance.refunds.create({
              payment_intent: paymentIntentId,
              amount: Math.round(refundAmount * 100),
              reason: "requested_by_customer",
            });
            stripeRefundId = stripeRefund.id;
          }
        } catch (stripeErr: any) {
          console.warn("Stripe refund execution fallback:", stripeErr?.message || stripeErr);
        }
      }
    }

    const generatedRefundId =
      stripeRefundId ||
      `REF-${order.paymentMethod || "ONLINE"}-${Date.now().toString().slice(-6)}`;

    const refundInfo = {
      refundId: generatedRefundId,
      amount: refundAmount,
      reason: refundReason,
      refundedAt: new Date().toISOString(),
      status: "Completed" as const,
      refundedBy: sessionUser?.email ? `Admin (${sessionUser.email})` : "Administrator",
      stripeRefundId,
    };

    const updateDoc: any = {
      paymentStatus: "Refunded",
      refundInfo,
      updatedAt: new Date().toISOString(),
    };

    if (markAsCancelled) {
      updateDoc.orderStatus = "Cancelled";
    }

    await ordersCol.updateOne({ _id: order._id }, { $set: updateDoc });
    const updatedOrder = await ordersCol.findOne({ _id: order._id });

    // Send Refund Confirmation Email
    if (updatedOrder) {
      sendOrderRefundEmail(updatedOrder as any, refundInfo).catch((e) =>
        console.warn("Background order refund email error:", e)
      );

      if (markAsCancelled) {
        sendOrderCancellationEmail(updatedOrder as any, refundReason).catch((e) =>
          console.warn("Background cancellation email error:", e)
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Refund of ৳${refundAmount.toFixed(2)} processed successfully!`,
      refundInfo,
      data: updatedOrder,
    });
  } catch (error: any) {
    console.error("Error processing refund:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to process refund." },
      { status: 500 }
    );
  }
}
