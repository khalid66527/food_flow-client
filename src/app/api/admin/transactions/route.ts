import { NextRequest, NextResponse } from "next/server";
import { getOrdersCollection } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // Optional check for Admin session
    try {
      const session = await auth.api.getSession({ headers: req.headers });
      // We can inspect user role if available
    } catch (err) {
      console.warn("Session check fallback in /api/admin/transactions:", err);
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase() || "";
    const method = searchParams.get("method") || "";
    const status = searchParams.get("status") || "";

    const ordersCol = await getOrdersCollection();
    const allOrders = await ordersCol
      .find({ isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .toArray();

    // Financial aggregation stats
    let totalGrossVolume = 0;
    let totalAdminProfit = 0;
    let totalRestaurantPayout = 0;
    let totalRiderPayout = 0;
    let totalTaxFundVat = 0;
    let totalRefundedAmount = 0;

    let paidCount = 0;
    let pendingCount = 0;
    let refundedCount = 0;
    let codCount = 0;
    let stripeCount = 0;

    const formattedTransactions = allOrders.map((order: any) => {
      const isPaid = order.paymentStatus === "Paid";
      const isRefunded = order.paymentStatus === "Refunded";
      const isCOD = order.paymentMethod === "COD";
      const isStripe = order.paymentMethod === "STRIPE";

      const total = Number(order.totalAmount) || 0;
      const subtotal = Number(order.subtotal) || 0;
      const vat = Number(order.vatAmount) || 0;
      const deliveryFee = Number(order.deliveryFee) || 0;
      const discount = Number(order.discount) || 0;

      const adminCommission = Number(order.adminGrossCommission) || Math.round(subtotal * 0.15 * 100) / 100;
      const adminNet = Number(order.adminNetProfit) || Math.round((adminCommission - discount) * 100) / 100;
      const restPayout = Number(order.restaurantPayout) || Math.round((subtotal - adminCommission) * 100) / 100;
      const riderPay = Number(order.riderPayout) || deliveryFee;

      if (isPaid || order.orderStatus === "Delivered") {
        totalGrossVolume += total;
        totalAdminProfit += adminNet;
        totalRestaurantPayout += restPayout;
        totalRiderPayout += riderPay;
        totalTaxFundVat += vat;
        paidCount++;
      } else if (isRefunded) {
        const refAmt = Number(order.refundInfo?.amount) || total;
        totalRefundedAmount += refAmt;
        refundedCount++;
      } else {
        pendingCount++;
      }

      if (isCOD) codCount++;
      if (isStripe) stripeCount++;

      return {
        id: order._id?.toString(),
        orderId: order.orderId,
        userId: order.userId,
        userName: order.userName || order.deliveryAddress?.fullName || "Customer",
        userEmail: order.userEmail || "customer@foodflow.app",
        totalAmount: total,
        subtotal,
        deliveryFee,
        vatAmount: vat,
        discount,
        adminNetProfit: adminNet,
        restaurantPayout: restPayout,
        riderPayout: riderPay,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus || "Pending",
        orderStatus: order.orderStatus || "Placed",
        transactionId: order.transactionId || order.stripeSessionId || `TRX-${order.orderId}`,
        refundInfo: order.refundInfo,
        createdAt: order.createdAt || new Date().toISOString(),
      };
    });

    // Filter by search / method / status
    const filtered = formattedTransactions.filter((tx) => {
      const matchSearch =
        !search ||
        tx.orderId.toLowerCase().includes(search) ||
        tx.userName.toLowerCase().includes(search) ||
        tx.userEmail.toLowerCase().includes(search) ||
        (tx.transactionId && tx.transactionId.toLowerCase().includes(search));

      const matchMethod =
        !method ||
        method === "ALL" ||
        tx.paymentMethod.toUpperCase() === method.toUpperCase();

      const matchStatus =
        !status ||
        status === "ALL" ||
        tx.paymentStatus.toUpperCase() === status.toUpperCase();

      return matchSearch && matchMethod && matchStatus;
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalGrossVolume: Math.round(totalGrossVolume * 100) / 100,
        totalAdminProfit: Math.round(totalAdminProfit * 100) / 100,
        totalRestaurantPayout: Math.round(totalRestaurantPayout * 100) / 100,
        totalRiderPayout: Math.round(totalRiderPayout * 100) / 100,
        totalTaxFundVat: Math.round(totalTaxFundVat * 100) / 100,
        totalRefundedAmount: Math.round(totalRefundedAmount * 100) / 100,
        totalOrdersCount: allOrders.length,
        paidCount,
        pendingCount,
        refundedCount,
        codCount,
        stripeCount,
      },
      transactions: filtered,
    });

  } catch (error: any) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to load transactions." },
      { status: 500 }
    );
  }
}
