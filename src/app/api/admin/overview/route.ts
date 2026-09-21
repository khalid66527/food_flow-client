import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Helper to query collection with singular/plural fallback
async function getCollectionDocs(db: any, names: string[], query: any = {}, sort: any = { createdAt: -1 }, limit: number = 0) {
  for (const name of names) {
    try {
      const col = db.collection(name);
      const count = await col.countDocuments();
      if (count > 0 || names.indexOf(name) === names.length - 1) {
        let cursor = col.find(query).sort(sort);
        if (limit > 0) cursor = cursor.limit(limit);
        const docs = await cursor.toArray();
        return { name, docs, count };
      }
    } catch (e) {
      console.warn(`Error querying ${name}:`, e);
    }
  }
  return { name: names[0], docs: [], count: 0 };
}

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();

    // 1. Fetch Orders
    const ordersCol = db.collection("orders");
    const allOrders = await ordersCol.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).toArray();

    // 2. Fetch Users (check 'user' and 'users')
    const { docs: allUsers } = await getCollectionDocs(db, ["user", "users"], {});

    // 3. Fetch Restaurants (check 'restaurant' and 'restaurants')
    const { docs: allRestaurants } = await getCollectionDocs(db, ["restaurant", "restaurants"], {});

    // 4. Fetch Riders (check 'rider', 'riders')
    const { docs: allRiders } = await getCollectionDocs(db, ["rider", "riders"], {});

    // 5. Fetch Foods (check 'food', 'foodItems')
    const { docs: allFoods } = await getCollectionDocs(db, ["food", "foodItems"], {});

    // 6. Fetch Categories (check 'category', 'categories')
    const { docs: allCategories } = await getCollectionDocs(db, ["category", "categories"], {});

    // 7. Fetch Reviews
    const { docs: allReviews } = await getCollectionDocs(db, ["reviews", "review"], {});

    // 8. Fetch Messages / Contacts
    const { docs: allMessages } = await getCollectionDocs(db, ["contacts", "contact_messages", "messages"], {});

    // 9. Fetch Platform Settings
    const { docs: settingsDocs } = await getCollectionDocs(db, ["platform_settings", "settings"], {});
    const activeSettings = settingsDocs[0] || {
      vatPercentage: 5,
      restaurantCommissionPercentage: 15,
      riderCommissionPercentage: 100,
      deliveryFeePerKm: 10,
    };

    // --- Aggregations & Analytics ---

    // A. Financial Totals
    let totalGrossRevenue = 0;
    let totalAdminProfit = 0;
    let totalRestaurantPayout = 0;
    let totalRiderPayout = 0;
    let totalTaxFundVat = 0;
    let totalDiscountsGiven = 0;

    // B. Order Status Counts
    let deliveredOrders = 0;
    let placedOrders = 0;
    let preparingOrders = 0;
    let onTheWayOrders = 0;
    let cancelledOrders = 0;
    let paidOrders = 0;
    let pendingPaymentOrders = 0;
    let codOrders = 0;
    let stripeOrders = 0;

    // Daily Sales (Last 7 Days)
    const last7Days: { [key: string]: { date: string; day: string; sales: number; orders: number; adminNet: number } } = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      last7Days[key] = { date: key, day: dayName, sales: 0, orders: 0, adminNet: 0 };
    }

    allOrders.forEach((order: any) => {
      const total = Number(order.totalAmount) || 0;
      const subtotal = Number(order.subtotal) || 0;
      const vat = Number(order.vatAmount) || 0;
      const delivery = Number(order.deliveryFee) || 0;
      const discount = Number(order.discount) || 0;
      const adminNet = Number(order.adminNetProfit) || Math.round((subtotal * 0.15 - discount) * 100) / 100;
      const restPayout = Number(order.restaurantPayout) || Math.round((subtotal - subtotal * 0.15) * 100) / 100;
      const riderPay = Number(order.riderPayout) || delivery;

      const isPaid = order.paymentStatus === "Paid" || order.orderStatus === "Delivered";

      if (isPaid) {
        totalGrossRevenue += total;
        totalAdminProfit += adminNet;
        totalRestaurantPayout += restPayout;
        totalRiderPayout += riderPay;
        totalTaxFundVat += vat;
        paidOrders++;
      } else {
        pendingPaymentOrders++;
      }

      totalDiscountsGiven += discount;

      // Status
      const status = (order.orderStatus || "").toLowerCase();
      if (status === "delivered") deliveredOrders++;
      else if (status === "placed") placedOrders++;
      else if (status === "preparing" || status === "cooking" || status === "confirmed") preparingOrders++;
      else if (status === "on the way" || status === "on_the_way" || status === "picked_up" || status === "pickedup") onTheWayOrders++;
      else if (status === "cancelled" || status === "rejected") cancelledOrders++;

      // Method
      const method = (order.paymentMethod || "").toUpperCase();
      if (method === "COD") codOrders++;
      if (method === "STRIPE") stripeOrders++;

      // Group by 7 days
      if (order.createdAt) {
        const dateKey = new Date(order.createdAt).toISOString().split("T")[0];
        if (last7Days[dateKey]) {
          last7Days[dateKey].sales += total;
          last7Days[dateKey].orders += 1;
          last7Days[dateKey].adminNet += adminNet;
        }
      }
    });

    const chartData = Object.values(last7Days).map((item) => ({
      ...item,
      sales: Math.round(item.sales * 100) / 100,
      adminNet: Math.round(item.adminNet * 100) / 100,
    }));

    // C. User Categorization
    let customerCount = 0;
    let restaurantUserCount = 0;
    let riderUserCount = 0;
    let adminUserCount = 0;
    let activeUsers = 0;
    let pendingUsers = 0;

    allUsers.forEach((u: any) => {
      const role = (u.role || "").toLowerCase();
      if (/admin/i.test(role)) adminUserCount++;
      else if (/restaurant/i.test(role)) restaurantUserCount++;
      else if (/rider|delivery/i.test(role)) riderUserCount++;
      else customerCount++;

      const status = (u.status || "active").toLowerCase();
      if (status === "active") activeUsers++;
      else if (status === "pending") pendingUsers++;
    });

    // D. Partner Approvals
    const pendingRestaurants = allRestaurants.filter((r: any) => /pending/i.test(r.status || "")).length;
    const activeRestaurants = allRestaurants.filter((r: any) => /active/i.test(r.status || "active")).length;

    const pendingRiders = allRiders.filter((r: any) => /pending/i.test(r.status || "")).length;
    const activeRiders = allRiders.filter((r: any) => /active/i.test(r.status || "active")).length;

    // E. Catalog
    const availableFoods = allFoods.filter((f: any) => f.isAvailable !== false && f.status !== "unavailable").length;

    // F. Unread Contact Messages
    const unreadMessages = allMessages.filter((m: any) => m.status === "unread" || m.isRead === false).length;

    // G. Top/Recent Lists
    const recentOrders = allOrders.slice(0, 8).map((o: any) => ({
      id: o._id?.toString(),
      orderId: o.orderId,
      customerName: o.userName || o.deliveryAddress?.fullName || "Customer",
      customerEmail: o.userEmail || "customer@foodflow.app",
      itemsCount: Array.isArray(o.items) ? o.items.length : 1,
      items: o.items || [],
      totalAmount: Number(o.totalAmount) || 0,
      subtotal: Number(o.subtotal) || 0,
      deliveryFee: Number(o.deliveryFee) || 0,
      vatAmount: Number(o.vatAmount) || 0,
      discount: Number(o.discount) || 0,
      adminNetProfit: Number(o.adminNetProfit) || 0,
      restaurantPayout: Number(o.restaurantPayout) || 0,
      riderPayout: Number(o.riderPayout) || 0,
      paymentMethod: o.paymentMethod || "COD",
      paymentStatus: o.paymentStatus || "Pending",
      orderStatus: o.orderStatus || "Placed",
      deliveryAddress: o.deliveryAddress,
      createdAt: o.createdAt || new Date().toISOString(),
    }));

    const recentUsers = allUsers.slice(0, 6).map((u: any) => ({
      id: u._id?.toString() || u.id,
      name: u.name || "FoodFlow User",
      email: u.email,
      role: u.role || "Customer",
      status: u.status || "active",
      image: u.image || u.avatar || null,
      createdAt: u.createdAt || new Date().toISOString(),
    }));

    const topRestaurants = allRestaurants.slice(0, 5).map((r: any) => ({
      id: r._id?.toString(),
      name: r.name || r.restaurantName,
      cuisine: r.cuisineType || r.category || "Multi-Cuisine",
      rating: r.rating || 4.8,
      totalOrders: r.totalOrders || Math.floor(Math.random() * 80 + 20),
      image: r.logo || r.bannerImage || r.image || "/images/restaurant-placeholder.jpg",
      status: r.status || "Active",
      phone: r.phone || r.contactNumber,
      city: r.address?.city || r.city || "Dhaka",
    }));

    const topFoods = allFoods.slice(0, 5).map((f: any) => ({
      id: f._id?.toString(),
      name: f.name,
      price: f.price,
      discountPrice: f.discountPrice,
      category: f.category,
      restaurantName: f.restaurantName || "Partner Restaurant",
      image: f.image || "/images/food-placeholder.jpg",
      rating: f.rating || 4.9,
      isAvailable: f.isAvailable !== false && f.status !== "unavailable",
    }));

    const totalOrdersCount = allOrders.length;
    const averageOrderValue = totalOrdersCount > 0 ? Math.round((totalGrossRevenue / Math.max(1, paidOrders || totalOrdersCount)) * 100) / 100 : 0;

    return NextResponse.json({
      success: true,
      stats: {
        revenue: {
          totalGross: Math.round(totalGrossRevenue * 100) / 100,
          adminProfit: Math.round(totalAdminProfit * 100) / 100,
          restaurantPayout: Math.round(totalRestaurantPayout * 100) / 100,
          riderPayout: Math.round(totalRiderPayout * 100) / 100,
          taxFundVat: Math.round(totalTaxFundVat * 100) / 100,
          discounts: Math.round(totalDiscountsGiven * 100) / 100,
          averageOrderValue,
        },
        orders: {
          total: totalOrdersCount,
          delivered: deliveredOrders,
          placed: placedOrders,
          preparing: preparingOrders,
          onTheWay: onTheWayOrders,
          cancelled: cancelledOrders,
          paid: paidOrders,
          pending: pendingPaymentOrders,
          cod: codOrders,
          stripe: stripeOrders,
        },
        users: {
          total: allUsers.length,
          customers: customerCount,
          restaurants: restaurantUserCount,
          riders: riderUserCount,
          admins: adminUserCount,
          active: activeUsers,
          pending: pendingUsers,
        },
        partners: {
          restaurantsTotal: allRestaurants.length,
          restaurantsActive: activeRestaurants,
          restaurantsPending: pendingRestaurants,
          ridersTotal: allRiders.length,
          ridersActive: activeRiders,
          ridersPending: pendingRiders,
          totalPendingApprovals: pendingRestaurants + pendingRiders,
        },
        catalog: {
          totalFoods: allFoods.length,
          availableFoods,
          totalCategories: allCategories.length,
          totalReviews: allReviews.length,
          unreadMessages,
        },
        settings: activeSettings,
      },
      chartData,
      recentOrders,
      recentUsers,
      topRestaurants,
      topFoods,
    });
  } catch (error: any) {
    console.error("Error in /api/admin/overview:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to load overview data." },
      { status: 500 }
    );
  }
}
