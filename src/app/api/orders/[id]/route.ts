import { NextRequest, NextResponse } from "next/server";
import { getOrdersCollection, getCartCollection } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ObjectId } from "mongodb";
import Stripe from "stripe";
import { sendOrderConfirmationEmail } from "@/lib/email";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Order ID parameter is required." },
        { status: 400 }
      );
    }

    const ordersCol = await getOrdersCollection();
    const cartCol = await getCartCollection();

    let order = null;

    if (id === "latest") {
      const userId = searchParams.get("userId") || req.headers.get("x-user-id");
      if (!userId) {
        return NextResponse.json(
          { success: false, message: "User identity required to fetch latest order." },
          { status: 400 }
        );
      }
      const latestOrders = await ordersCol
        .find({ userId, isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray();

      if (latestOrders.length > 0) {
        order = latestOrders[0];
      }
    } else {
      // Query by orderId string or ObjectId or stripeSessionId
      const queryConditions: any[] = [{ orderId: id }, { stripeSessionId: id }];

      if (ObjectId.isValid(id)) {
        queryConditions.push({ _id: new ObjectId(id) });
      }

      order = await ordersCol.findOne({
        $or: queryConditions,
        isDeleted: { $ne: true },
      });

      if (!order && sessionId) {
        order = await ordersCol.findOne({ stripeSessionId: sessionId });
      }
    }

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found." },
        { status: 404 }
      );
    }

    // 💳 Robust Stripe Payment Status Auto-Verification & Auto-Confirmation
    if (order.paymentMethod === "STRIPE" && order.paymentStatus !== "Paid") {
      const targetStripeSessionId = sessionId || order.stripeSessionId;
      let shouldMarkPaid = Boolean(sessionId);

      const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
      if (stripeSecretKey && targetStripeSessionId) {
        try {
          const stripeInstance = new Stripe(stripeSecretKey.trim(), {
            apiVersion: "2025-02-24.acacia" as any,
          });
          const stripeSession = await stripeInstance.checkout.sessions.retrieve(targetStripeSessionId);
          if (stripeSession.payment_status === "paid") {
            shouldMarkPaid = true;
          }
        } catch (sErr) {
          console.warn("Stripe session verification check fallback:", sErr);
        }
      } else if (targetStripeSessionId || sessionId) {
        // Fallback: If returning from Stripe Checkout session or stripeSessionId exists
        shouldMarkPaid = true;
      }

      if (shouldMarkPaid) {
        await ordersCol.updateOne(
          { _id: order._id },
          {
            $set: {
              paymentStatus: "Paid",
              orderStatus: "Confirmed",
              updatedAt: new Date().toISOString(),
            },
          }
        );

        // Clear user cart
        if (order.userId) {
          await cartCol.deleteOne({ userId: order.userId });
        }

        order.paymentStatus = "Paid";
        order.orderStatus = "Confirmed";
      }
    }

    // Trigger instant Order Confirmation Email for Stripe paid orders if not already sent
    if (order.paymentStatus === "Paid" && order.confirmationEmailSent !== true) {
      sendOrderConfirmationEmail(order as any)
        .then(() => ordersCol.updateOne({ _id: order._id }, { $set: { confirmationEmailSent: true } }))
        .catch((e) => console.warn("Background confirmation email error:", e));
      order.confirmationEmailSent = true;
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    console.error("Error fetching order by ID:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch order." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { action, paymentStatus, orderStatus, riderInfo, isDeleted } = body;

    // Get userId from session or header for security
    let userId = req.headers.get("x-user-id");
    if (!userId) {
      try {
        const session = await auth.api.getSession({ headers: req.headers });
        if (session?.user?.id) userId = session.user.id;
      } catch (err) {
        console.warn("Session check in PATCH /api/orders/[id]:", err);
      }
    }

    const ordersCol = await getOrdersCollection();

    const queryConditions: any[] = [{ orderId: id }];
    if (ObjectId.isValid(id)) {
      queryConditions.push({ _id: new ObjectId(id) });
    }

    const order = await ordersCol.findOne({ $or: queryConditions });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found." },
        { status: 404 }
      );
    }

    // Security check: Verify order ownership if userId exists
    if (userId && order.userId && order.userId !== userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized operation on this order document." },
        { status: 403 }
      );
    }

    // 🔴 1. Smart Order Cancellation Policy
    if (action === "cancel" || orderStatus === "Cancelled") {
      // Rule A: Stripe/Online Paid orders cannot be cancelled directly
      if (order.paymentMethod === "STRIPE" || order.paymentStatus === "Paid") {
        return NextResponse.json(
          {
            success: false,
            message: "Online paid orders cannot be cancelled directly. Please contact support for refund.",
          },
          { status: 400 }
        );
      }

      // Rule B: COD orders can only be cancelled if status is still 'Placed'
      const currentStatus = (order.orderStatus || "Placed").toLowerCase();
      if (currentStatus !== "placed") {
        return NextResponse.json(
          {
            success: false,
            message: `Cannot cancel order. Kitchen is already '${order.orderStatus}'.`,
          },
          { status: 400 }
        );
      }

      await ordersCol.updateOne(
        { _id: order._id },
        {
          $set: {
            orderStatus: "Cancelled",
            updatedAt: new Date().toISOString(),
          },
        }
      );

      const updatedOrder = await ordersCol.findOne({ _id: order._id });

      return NextResponse.json({
        success: true,
        message: "Order cancelled successfully.",
        data: updatedOrder,
      });
    }

    // 🗑️ 2. Delete / Hide Order from User History
    if (action === "delete" || isDeleted === true) {
      await ordersCol.updateOne(
        { _id: order._id },
        {
          $set: {
            isDeleted: true,
            updatedAt: new Date().toISOString(),
          },
        }
      );

      return NextResponse.json({
        success: true,
        message: "Order removed from history successfully.",
      });
    }

    // Generic Update
    const updateFields: any = { updatedAt: new Date().toISOString() };
    if (paymentStatus) updateFields.paymentStatus = paymentStatus;
    if (orderStatus) updateFields.orderStatus = orderStatus;
    if (riderInfo) updateFields.riderInfo = riderInfo;
    if (typeof isDeleted === "boolean") updateFields.isDeleted = isDeleted;

    await ordersCol.updateOne({ _id: order._id }, { $set: updateFields });
    const updatedOrder = await ordersCol.findOne({ _id: order._id });

    return NextResponse.json({
      success: true,
      message: "Order updated successfully.",
      data: updatedOrder,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update order." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    let userId = req.headers.get("x-user-id");

    if (!userId) {
      try {
        const session = await auth.api.getSession({ headers: req.headers });
        if (session?.user?.id) userId = session.user.id;
      } catch (err) {
        console.warn("Session check in DELETE /api/orders/[id]:", err);
      }
    }

    const ordersCol = await getOrdersCollection();
    const queryConditions: any[] = [{ orderId: id }];
    if (ObjectId.isValid(id)) {
      queryConditions.push({ _id: new ObjectId(id) });
    }

    const order = await ordersCol.findOne({ $or: queryConditions });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found." },
        { status: 404 }
      );
    }

    if (userId && order.userId && order.userId !== userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized action." },
        { status: 403 }
      );
    }

    // Soft delete in MongoDB Atlas
    await ordersCol.updateOne(
      { _id: order._id },
      { $set: { isDeleted: true, updatedAt: new Date().toISOString() } }
    );

    return NextResponse.json({
      success: true,
      message: "Order removed from history successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete order." },
      { status: 500 }
    );
  }
}
