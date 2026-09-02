import { NextRequest, NextResponse } from "next/server";
import { getOrdersCollection, getCartCollection } from "@/lib/db";
import Stripe from "stripe";
import { sendOrderConfirmationEmail } from "@/lib/email";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2025-02-24.acacia" as any })
  : null;

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    if (stripe && stripeWebhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
      } catch (err: any) {
        console.error("Stripe Webhook signature verification failed:", err.message);
        return NextResponse.json(
          { success: false, message: `Webhook Error: ${err.message}` },
          { status: 400 }
        );
      }
    } else {
      // Unverified or test mode payload parsing
      try {
        event = JSON.parse(rawBody);
      } catch {
        return NextResponse.json(
          { success: false, message: "Invalid payload JSON." },
          { status: 400 }
        );
      }
    }

    // Handle checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.client_reference_id || session.metadata?.orderId;
      const sessionId = session.id;
      const userId = session.metadata?.userId;

      const ordersCol = await getOrdersCollection();
      const cartCol = await getCartCollection();

      const queryConditions: any[] = [];
      if (orderId) queryConditions.push({ orderId });
      if (sessionId) queryConditions.push({ stripeSessionId: sessionId });

      if (queryConditions.length > 0) {
        const order = await ordersCol.findOne({ $or: queryConditions });

        if (order) {
          // Update MongoDB order status: paymentStatus = Paid, orderStatus = Confirmed
          await ordersCol.updateOne(
            { _id: order._id },
            {
              $set: {
                paymentStatus: "Paid",
                orderStatus: "Confirmed",
                confirmationEmailSent: true,
                updatedAt: new Date().toISOString(),
              },
            }
          );

          if (order.confirmationEmailSent !== true) {
            sendOrderConfirmationEmail({ ...order, paymentStatus: "Paid", orderStatus: "Confirmed" } as any).catch(
              (e) => console.warn("Webhook email send error:", e)
            );
          }

          // Clear cart in MongoDB
          const effectiveUserId = userId || order.userId;
          if (effectiveUserId) {
            await cartCol.deleteOne({ userId: effectiveUserId });
          }

          console.log(`✅ Order ${order.orderId} updated to Paid & Confirmed via Webhook.`);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Stripe Webhook processing error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Webhook handler error." },
      { status: 500 }
    );
  }
}
