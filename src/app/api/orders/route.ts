import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrdersCollection, getCartCollection, getSettingsCollection, getCouponsCollection } from "@/lib/db";
import Stripe from "stripe";
import { sendOrderConfirmationEmail } from "@/lib/email";

// Helper to check if STRIPE_SECRET_KEY is a real, valid secret key format
function isValidStripeSecretKey(key: string): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  if (
    trimmed.includes("placeholder") ||
    trimmed.includes("...here") ||
    trimmed.includes("your_stripe") ||
    trimmed.endsWith("here")
  ) {
    return false;
  }
  return (
    trimmed.startsWith("sk_test_") ||
    trimmed.startsWith("sk_live_") ||
    trimmed.startsWith("sk_")
  );
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
const stripe = isValidStripeSecretKey(stripeSecretKey)
  ? new Stripe(stripeSecretKey.trim(), { apiVersion: "2025-02-24.acacia" as any })
  : null;

export async function POST(req: NextRequest) {
  try {
    // 1. Session Authentication via Better Auth
    let sessionUser: { id?: string; email?: string; name?: string } | null = null;

    try {
      const session = await auth.api.getSession({
        headers: req.headers,
      });
      if (session?.user) {
        sessionUser = session.user;
      }
    } catch (err) {
      console.warn("Better Auth session check fallback:", err);
    }

    // Fallback to x-user-id header if needed
    const userIdHeader = req.headers.get("x-user-id");
    const userEmailHeader = req.headers.get("x-user-email");

    const userId = sessionUser?.id || userIdHeader;
    const userEmail = sessionUser?.email || userEmailHeader;
    const userName = sessionUser?.name || "Customer";

    if (!userId || !userEmail) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // 2. Request Payload & Validation
    const body = await req.json();
    const { items, deliveryAddress, paymentMethod, subtotal, deliveryFee, discount, couponCode, totalAmount } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Cart is empty. Please add items to checkout." },
        { status: 400 }
      );
    }

    if (!deliveryAddress || !deliveryAddress.streetAddress || !deliveryAddress.fullName) {
      return NextResponse.json(
        { success: false, message: "Valid delivery address is required." },
        { status: 400 }
      );
    }

    if (!paymentMethod || (paymentMethod !== "COD" && paymentMethod !== "STRIPE")) {
      return NextResponse.json(
        { success: false, message: "Invalid payment method. Choose COD or STRIPE." },
        { status: 400 }
      );
    }

    // 3. Create Order Document & Financial Settlement Calculations
    const ordersCol = await getOrdersCollection();
    const cartCol = await getCartCollection();
    const settingsCol = await getSettingsCollection();
    const couponsCol = await getCouponsCollection();

    // Fetch active platform settings
    const settings = await settingsCol.findOne({ key: "global_settings" });
    const vatPercentage = Number(settings?.vatPercentage ?? 5);
    const restaurantCommissionPercentage = Number(settings?.restaurantCommissionPercentage ?? 15);
    const riderCommissionPercentage = Number(settings?.riderCommissionPercentage ?? 100);

    const numSubtotal = Number(subtotal) || 0;
    const numDeliveryFee = Number(deliveryFee) || 0;
    const numDiscount = Number(discount) || 0;
    const formattedCouponCode = couponCode ? String(couponCode).trim().toUpperCase() : null;

    // Check first-order coupon restriction if coupon applied
    let isFirstOrderDiscount = false;
    if (formattedCouponCode) {
      const couponDoc = await couponsCol.findOne({ code: formattedCouponCode });
      if (couponDoc?.isFirstOrderOnly) {
        isFirstOrderDiscount = true;
        const priorOrder = await ordersCol.findOne({
          userId,
          orderStatus: { $ne: "Cancelled" },
        });
        if (priorOrder) {
          return NextResponse.json(
            {
              success: false,
              message: "This welcome coupon is valid exclusively for your first successful order!",
            },
            { status: 400 }
          );
        }
      }
    }

    // Financial split & settlement calculations
    const vatAmount = Math.round(numSubtotal * (vatPercentage / 100) * 100) / 100;
    const adminGrossCommission = Math.round(numSubtotal * (restaurantCommissionPercentage / 100) * 100) / 100;
    // Coupon discount is subtracted strictly from Admin Commission
    const adminNetProfit = Math.round((adminGrossCommission - numDiscount) * 100) / 100;
    // Restaurant payout is Subtotal - Gross Commission (100% earnings protected)
    const restaurantPayout = Math.round((numSubtotal - adminGrossCommission) * 100) / 100;
    // Rider payout
    const riderPayout = Math.round((numDeliveryFee * (riderCommissionPercentage / 100)) * 100) / 100;
    const taxFundVat = vatAmount;

    const calculatedTotal = numSubtotal + vatAmount + numDeliveryFee - numDiscount;
    const finalTotalAmount = totalAmount ? Number(totalAmount) : Math.max(0, calculatedTotal);

    const timestamp = Date.now();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderId = `FF-${timestamp.toString().slice(-6)}-${randomSuffix}`;

    const orderDoc = {
      orderId,
      userId,
      userEmail,
      userName,
      items,
      deliveryAddress,
      subtotal: numSubtotal,
      vatPercentage,
      vatAmount,
      deliveryFee: numDeliveryFee,
      couponCode: formattedCouponCode,
      discount: numDiscount,
      isFirstOrderDiscount,
      totalAmount: finalTotalAmount,
      restaurantCommissionPercentage,
      adminGrossCommission,
      adminNetProfit,
      restaurantPayout,
      riderPayout,
      taxFundVat,
      paymentMethod,
      paymentStatus: "Pending",
      orderStatus: "Placed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const insertResult = await ordersCol.insertOne(orderDoc);
    const mongoId = insertResult.insertedId.toString();

    // 4. Handle Payment Method Flows
    if (paymentMethod === "COD") {
      // Clear Cart on COD success
      await cartCol.deleteOne({ userId });

      // Trigger instant Order Confirmation Email
      sendOrderConfirmationEmail({ ...orderDoc, _id: mongoId } as any)
        .then(() => ordersCol.updateOne({ _id: insertResult.insertedId }, { $set: { confirmationEmailSent: true } }))
        .catch((e) => console.warn("Background order confirmation email trigger error:", e));

      return NextResponse.json({
        success: true,
        message: "Order placed successfully with Cash on Delivery!",
        orderId,
        mongoId,
        redirectUrl: `/order-tracking/${orderId}`,
        data: { ...orderDoc, _id: mongoId, confirmationEmailSent: true },
      });
    }

    if (paymentMethod === "STRIPE") {
      const baseUrl =
        process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
        process.env.BETTER_AUTH_URL ||
        req.nextUrl.origin ||
        "http://localhost:3000";

      const currentKey = process.env.STRIPE_SECRET_KEY || "";
      let stripeInstance = isValidStripeSecretKey(currentKey)
        ? new Stripe(currentKey.trim(), { apiVersion: "2025-02-24.acacia" as any })
        : null;

      if (stripeInstance) {
        try {
          const lineItems = items.map((item: any) => ({
            price_data: {
              currency: "usd",
              product_data: {
                name: item.name,
                images: item.image ? [item.image] : [],
                description: `Restaurant: ${item.restaurantName || "FoodFlow"}`,
              },
              unit_amount: Math.round((item.discountPrice || item.price) * 100),
            },
            quantity: item.quantity,
          }));

          // Add delivery fee line item if applicable
          if (deliveryFee && deliveryFee > 0) {
            lineItems.push({
              price_data: {
                currency: "usd",
                product_data: {
                  name: "Delivery Fee",
                  images: [],
                  description: "Standard Delivery Charge",
                },
                unit_amount: Math.round(deliveryFee * 100),
              },
              quantity: 1,
            });
          }

          const session = await stripeInstance.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: lineItems,
            mode: "payment",
            customer_email: userEmail,
            client_reference_id: orderId,
            metadata: {
              orderId,
              mongoId,
              userId,
              userEmail,
            },
            success_url: `${baseUrl}/dashboard/customer/order-success?session_id={CHECKOUT_SESSION_ID}&orderId=${orderId}`,
            cancel_url: `${baseUrl}/dashboard/customer/checkout?canceled=true`,
          });

          // Store stripe session ID on saved MongoDB order document
          await ordersCol.updateOne(
            { _id: insertResult.insertedId },
            { $set: { stripeSessionId: session.id, updatedAt: new Date().toISOString() } }
          );

          return NextResponse.json({
            success: true,
            message: "Stripe Checkout session created successfully.",
            url: session.url,
            checkoutUrl: session.url,
            orderId,
            data: { ...orderDoc, _id: mongoId, stripeSessionId: session.id },
          });
        } catch (stripeErr: any) {
          console.error("Stripe Checkout Session error:", stripeErr);
          
          // Return clear error if key is invalid placeholder
          return NextResponse.json(
            {
              success: false,
              message:
                stripeErr.message ||
                "Failed to create Stripe Checkout session. Please verify your STRIPE_SECRET_KEY in .env.",
            },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          {
            success: false,
            message: "Stripe payment gateway is not configured. Please verify your STRIPE_SECRET_KEY in .env or choose Cash on Delivery (COD).",
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: false, message: "Invalid request payload." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to process order." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let userId = searchParams.get("userId") || req.headers.get("x-user-id");

    if (!userId) {
      try {
        const session = await auth.api.getSession({
          headers: req.headers,
        });
        if (session?.user?.id) {
          userId = session.user.id;
        }
      } catch (err) {
        console.warn("Session check fallback in GET /api/orders:", err);
      }
    }

    if (!userId) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const ordersCol = await getOrdersCollection();
    const orders = await ordersCol
      .find({ userId, isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .toArray();

    // Auto-verify & sync any Stripe orders whose payment was completed
    const currentKey = process.env.STRIPE_SECRET_KEY || "";
    const stripeInstance = isValidStripeSecretKey(currentKey)
      ? new Stripe(currentKey.trim(), { apiVersion: "2025-02-24.acacia" as any })
      : null;

    for (const order of orders) {
      if (order.paymentMethod === "STRIPE" && order.paymentStatus !== "Paid") {
        let isPaidInStripe = false;
        if (stripeInstance && order.stripeSessionId) {
          try {
            const session = await stripeInstance.checkout.sessions.retrieve(order.stripeSessionId);
            if (session.payment_status === "paid") {
              isPaidInStripe = true;
            }
          } catch (sErr) {
            console.warn("Stripe session check fallback in GET /api/orders:", sErr);
          }
        } else if (order.stripeSessionId) {
          // If a Stripe session ID is associated with the order, set as Paid
          isPaidInStripe = true;
        }

        if (isPaidInStripe) {
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
          order.paymentStatus = "Paid";
          order.orderStatus = "Confirmed";

          try {
            const cartCol = await getCartCollection();
            await cartCol.deleteOne({ userId: order.userId });
          } catch (cartErr) {
            console.warn("Cart cleanup error:", cartErr);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch orders." },
      { status: 500 }
    );
  }
}
