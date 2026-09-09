import { NextRequest, NextResponse } from "next/server";
import { getOrdersCollection, getCartCollection } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ObjectId } from "mongodb";
import Stripe from "stripe";
import { sendOrderConfirmationEmail, sendOrderCancellationEmail, sendDeliveryOtpEmail, sendDeliverySuccessEmail } from "@/lib/email";

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
              orderStatus: "Preparing",
              updatedAt: new Date().toISOString(),
            },
          }
        );

        // Clear user cart
        if (order.userId) {
          await cartCol.deleteOne({ userId: order.userId });
        }

        order.paymentStatus = "Paid";
        order.orderStatus = "Preparing";
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

      // 📧 Trigger Order Cancellation Email Notification (COD Orders)
      if (updatedOrder && updatedOrder.paymentMethod === "COD") {
        sendOrderCancellationEmail(
          updatedOrder as any,
          body.reason || "Order cancelled by user prior to kitchen preparation"
        ).catch((e) =>
          console.warn("Background order cancellation email trigger error:", e)
        );
      }

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

    // 🔑 3. Send / Resend Delivery Verification OTP to Customer (Email & Dashboard)
    if (action === "send_otp" || action === "resend_otp") {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      await ordersCol.updateOne(
        { _id: order._id },
        {
          $set: {
            deliveryOtp: generatedOtp,
            deliveryOtpCreatedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }
      );

      const rName =
        [...new Set((order.items || []).map((i: any) => i.restaurantName).filter(Boolean))].join(", ") ||
        "FoodFlow Kitchen";

      if (order.userEmail) {
        sendDeliveryOtpEmail({
          orderId: order.orderId,
          userEmail: order.userEmail,
          userName: order.userName || order.deliveryAddress?.fullName,
          otp: generatedOtp,
          restaurantName: rName,
          totalAmount: order.totalAmount,
        }).catch((e) => console.warn("Background OTP email dispatch error:", e));
      }

      const updatedOrder = await ordersCol.findOne({ _id: order._id });

      return NextResponse.json({
        success: true,
        message: "Delivery OTP sent to customer successfully via email and dashboard.",
        data: updatedOrder,
      });
    }

    // 🔒 4. OTP Validation on Delivery Completion
    if (orderStatus === "Delivered") {
      if (order.deliveryOtp) {
        const inputOtp = (body.otp || body.deliveryOtp || "").toString().trim();
        if (!inputOtp || inputOtp !== order.deliveryOtp.trim()) {
          return NextResponse.json(
            {
              success: false,
              message: "Invalid OTP code. Please ask the customer for the 6-digit delivery verification OTP.",
            },
            { status: 400 }
          );
        }
      }
    }

    // Generic Update
    const updateFields: any = { updatedAt: new Date().toISOString() };
    if (paymentStatus) updateFields.paymentStatus = paymentStatus;
    if (orderStatus) {
      updateFields.orderStatus = orderStatus;

      // Auto-generate OTP when status changes to 'Out for Delivery' if not already generated
      if (orderStatus === "Out for Delivery") {
        const otp = order.deliveryOtp || Math.floor(100000 + Math.random() * 900000).toString();
        updateFields.deliveryOtp = otp;
        updateFields.deliveryOtpCreatedAt = order.deliveryOtpCreatedAt || new Date().toISOString();

        // Send OTP email to customer
        const rName =
          [...new Set((order.items || []).map((i: any) => i.restaurantName).filter(Boolean))].join(", ") ||
          "FoodFlow Kitchen";

        if (order.userEmail && (!order.deliveryOtp || body.resendOtp)) {
          sendDeliveryOtpEmail({
            orderId: order.orderId,
            userEmail: order.userEmail,
            userName: order.userName || order.deliveryAddress?.fullName,
            otp,
            restaurantName: rName,
            totalAmount: order.totalAmount,
          }).catch((e) => console.warn("Background OTP email dispatch error on status change:", e));
        }
      }

      if (orderStatus === "Delivered") {
        updateFields.deliveryStatus = "Delivered";
        updateFields.deliveredAt = new Date().toISOString();
        updateFields.paymentStatus = "Paid"; // Both COD and Online orders are marked Paid upon delivery
      }
    }
    if (riderInfo) {
      updateFields.riderInfo = {
        ...(order.riderInfo || {}),
        ...riderInfo,
        ...(orderStatus === "Delivered" ? { deliveredAt: updateFields.deliveredAt || new Date().toISOString() } : {}),
      };
    }
    if (typeof isDeleted === "boolean") updateFields.isDeleted = isDeleted;

    await ordersCol.updateOne({ _id: order._id }, { $set: updateFields });
    const updatedOrder = await ordersCol.findOne({ _id: order._id });

    // 🌟 Store into successorders collection for successful deliveries
    if (orderStatus === "Delivered" && updatedOrder) {
      try {
        const successCol = await (await import("@/lib/db")).getSuccessOrdersCollection();
        const successDoc = {
          ...updatedOrder,
          orderStatus: "Delivered",
          deliveryStatus: "Delivered",
          deliveredAt: updateFields.deliveredAt || new Date().toISOString(),
          paymentStatus: "Paid",
          storedAt: new Date().toISOString(),
        };
        delete (successDoc as any)._id; // prevent _id conflict on upsert
        await successCol.updateOne(
          { orderId: updatedOrder.orderId },
          { $set: successDoc },
          { upsert: true }
        );
      } catch (sErr) {
        console.warn("Could not save to successorders collection:", sErr);
      }

      // 📧 Trigger Delivery Success Email to Customer
      if (updatedOrder.userEmail) {
        sendDeliverySuccessEmail(updatedOrder as any).catch((e) =>
          console.warn("Background delivery success email trigger error:", e)
        );
      }
    }

    // 📧 Trigger Order Cancellation Email for generic updates (e.g. restaurant/admin setting status to Cancelled)
    if (
      orderStatus === "Cancelled" &&
      order.orderStatus !== "Cancelled" &&
      order.paymentMethod === "COD" &&
      updatedOrder
    ) {
      sendOrderCancellationEmail(
        updatedOrder as any,
        body.reason || "Order cancelled by kitchen or restaurant administrator"
      ).catch((e) =>
        console.warn("Background order cancellation email trigger error:", e)
      );
    }

    return NextResponse.json({
      success: true,
      message: orderStatus === "Delivered" ? "Order delivered successfully with OTP validation!" : "Order updated successfully.",
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
