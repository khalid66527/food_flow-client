import { NextResponse } from "next/server";
import { 
  getFoodCollection, 
  getOrdersCollection, 
  getSuccessOrdersCollection, 
  getRestaurantsCollection, 
  getCouponsCollection,
  getCartCollection,
<<<<<<< HEAD
  getFavoritesCollection,
  getUsersCollection,
  getAddressCollection,
  getRiderCollection,
} from "@/lib/db";
import { ObjectId } from "mongodb";

let workingKeyIndex = 0;
let cachedWorkingModel = "gemini-2.5-flash";

/* ------------------------------------------------------------------ */
/*  Tier 1: Google Gemini REST API with key rotation & model failover  */
/* ------------------------------------------------------------------ */
async function callGeminiRestWithFailover(payload: any): Promise<string> {
  const envKeys = process.env.GEMINI_API_KEYS
    ? process.env.GEMINI_API_KEYS.split(",").map((k) => k.trim()).filter(Boolean)
    : [];
  const singleKey = process.env.GEMINI_API_KEY?.trim();

  const keyPool = Array.from(new Set([
    ...envKeys, 
    ...(singleKey ? [singleKey] : [])
  ]));

  const models = [
    cachedWorkingModel,
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ].filter((v, i, a) => a.indexOf(v) === i);

  const totalKeys = keyPool.length;
  if (totalKeys === 0) {
    throw new Error("No Gemini API keys found in environment.");
=======
  getSettingsCollection,
} from "@/lib/db";
import { ObjectId } from "mongodb";

// Extract true image from DB document (supports direct image, images array, base64 data URIs, or web URLs)
function getTrueFoodImage(f: any): string {
  if (!f) return "";
  if (typeof f.image === "string" && f.image.trim()) {
    return f.image.trim();
>>>>>>> ed99c2d (Added: Multi-Model Ai Service Provider Added Like: Groq)
  }
  if (Array.isArray(f.images) && f.images.length > 0 && typeof f.images[0] === "string" && f.images[0].trim()) {
    return f.images[0].trim();
  }
<<<<<<< HEAD

  throw new Error(`All Gemini API keys failed: ${JSON.stringify(lastError)}`);
}

/* ------------------------------------------------------------------ */
/*  Tier 2: OpenRouter API Fallback                                   */
/* ------------------------------------------------------------------ */
async function callOpenRouterChat(systemPrompt: string, chatHistory: any[], userMessage: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  const openRouterBase = process.env.OPENROUTER_API_BASE || "https://openrouter.ai/api/v1";
  const openRouterModel = process.env.OPENROUTER_CHAT_MODEL || process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";

  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory.map((m) => ({
      role: m.role === "assistant" || m.role === "model" ? "assistant" : "user",
      content: m.content || m.parts?.[0]?.text || "",
    })),
    { role: "user", content: userMessage },
  ];

  const res = await fetch(`${openRouterBase}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "FoodFlow AI Assistant",
      ...(process.env.OPENROUTER_SITE_URL ? { "HTTP-Referer": process.env.OPENROUTER_SITE_URL } : {}),
    },
    body: JSON.stringify({
      model: openRouterModel,
      messages,
      temperature: 0.6,
      max_tokens: 1000,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenRouter failed (${res.status}): ${errText}`);
  }

  const json = await res.json();
  const reply = json?.choices?.[0]?.message?.content;
  if (!reply) {
    throw new Error("No text candidate returned from OpenRouter.");
  }
  return reply;
}

// Helper to sanitize images
=======
  return "";
}

// Sanitizer for images (supports base64 data URIs and valid web URLs)
>>>>>>> ed99c2d (Added: Multi-Model Ai Service Provider Added Like: Groq)
function sanitizeImageUrl(rawImg?: string): string {
  if (!rawImg || typeof rawImg !== "string" || !rawImg.trim()) {
    return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80";
  }
  const trimmed = rawImg.trim();
  if (trimmed.startsWith("data:image/") || trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
    return trimmed;
  }
  return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80";
}

/**
 * Comprehensive Local Fallback Generator for Customer, Restaurant, Rider, and Admin
 */
function generateLocalFallbackResponse(
  message: string, 
  userRole: string,
  liveFoods: any[], 
  userOrders: any[], 
  userCart: any, 
<<<<<<< HEAD
  userFavorites: any[],
  userAddresses: any[],
  activeCoupons: any[],
  restaurantProfile: any,
  restaurantOrders: any[],
  restaurantFoods: any[],
  riderProfile: any,
  riderOrders: any[],
  adminStats: any
=======
  activeCoupons: any[],
  location?: any,
  mood?: any
>>>>>>> ed99c2d (Added: Multi-Model Ai Service Provider Added Like: Groq)
): string {
  const q = message.toLowerCase();

  // ------------------------------------------------------------------
  // 1. RESTAURANT PARTNER SPECIFIC LOGIC
  // ------------------------------------------------------------------
  if (userRole === "restaurant") {
    const restName = restaurantProfile?.name || "আপনার রেস্টুরেন্ট";

    // A. Check Running / Active incoming Orders
    if (q.includes("runing") || q.includes("running") || q.includes("order") || q.includes("অর্ডার") || q.includes("pending") || q.includes("সক্রিয়") || q.includes("নতুন")) {
      const activeRestOrders = (restaurantOrders || []).filter(o => 
        !["delivered", "cancelled", "completed"].includes(String(o.status || o.orderStatus).toLowerCase())
      );

      if (activeRestOrders.length > 0) {
        const orderSummary = activeRestOrders.map((o: any, idx: number) => {
          const itemsText = (o.items || []).map((it: any) => `${it.name || "খাবার"} (${it.quantity || 1}টি)`).join(", ");
          return `${idx + 1}. **অর্ডার #${o.orderId}** — স্ট্যাটাস: **${o.status || o.orderStatus}**\n   • আইটেম: ${itemsText}\n   • মোট মূল্য: ৳${o.totalAmount || o.grandTotal || 0}`;
        }).join("\n\n");

        return `🏪 **${restName}**-এর বর্তমান সক্রিয় রানিং অর্ডারসমূহ:\n\n${orderSummary}\n\nআপনি রেস্টুরেন্ট ড্যাশবোর্ড থেকে অর্ডার গ্রহণ বা প্রিপারেশন স্ট্যাটাস আপডেট করতে পারেন।\n\n\`\`\`action_buttons\n[{"type":"NAVIGATE","target":"/dashboard/restaurant/orders","label":"অর্ডার ম্যানেজ করুন"}]\n\`\`\``;
      }

      return `🏪 **${restName}**-এ বর্তমানে কোনো রানিং বা পেন্ডিং অর্ডার নেই। নতুন কোনো কাস্টমার অর্ডার প্লেস করলে আপনি সাথে সাথে ড্যাশবোর্ডে এবং এখানে নোটিফিকেশন পাবেন।\n\n\`\`\`action_buttons\n[{"type":"NAVIGATE","target":"/dashboard/restaurant/orders","label":"অর্ডার হিস্ট্রি দেখুন"}]\n\`\`\``;
    }

    // B. Check Restaurant Menu / Foods
    if (q.includes("menu") || q.includes("মেনু") || q.includes("খাবার") || q.includes("dish") || q.includes("item")) {
      if (restaurantFoods && restaurantFoods.length > 0) {
        const menuList = restaurantFoods.slice(0, 5).map((f: any) => `• **${f.name}** (৳${f.discountPrice || f.price}) - ${f.category || "General"}`).join("\n");
        return `🏪 **${restName}**-এর মেনুতে মোট ${restaurantFoods.length}টি খাবার আইটেম রয়েছে:\n\n${menuList}\n\nআপনি রেস্টুরেন্ট মেনু ম্যানেজমেন্ট পেজ থেকে নতুন খাবার যোগ বা প্রাইস আপডেট করতে পারেন।\n\n\`\`\`action_buttons\n[{"type":"NAVIGATE","target":"/dashboard/restaurant/menu","label":"মেনু ম্যানেজ করুন"},{"type":"NAVIGATE","target":"/dashboard/restaurant/add-food","label":"নতুন খাবার যোগ করুন"}]\n\`\`\``;
      }
      return `আপনার রেস্টুরেন্টে এখনও কোনো মেনু আইটেম যুক্ত করা হয়নি। মেনু ম্যানেজমেন্টে গিয়ে নতুন খাবারের আইটেম যোগ করুন।\n\n\`\`\`action_buttons\n[{"type":"NAVIGATE","target":"/dashboard/restaurant/add-food","label":"নতুন খাবার যোগ করুন"}]\n\`\`\``;
    }

    // C. Check Sales / Revenue
    if (q.includes("sales") || q.includes("বিক্রি") || q.includes("টাকা") || q.includes("আয়") || q.includes("revenue") || q.includes("earnings")) {
      const totalRev = (restaurantOrders || []).reduce((acc: number, cur: any) => acc + (Number(cur.totalAmount || cur.grandTotal) || 0), 0);
      return `🏪 **${restName}**-এর সেলস সামারি:\n• মোট প্রসেসকৃত অর্ডার: **${restaurantOrders.length}টি**\n• মোট সেলস ভলিউম: **৳${totalRev}**\n\nবিস্তারিত অ্যানালিটিক্স দেখতে সেলস হিস্ট্রি ড্যাশবোর্ডে প্রবেশ করুন।\n\n\`\`\`action_buttons\n[{"type":"NAVIGATE","target":"/dashboard/restaurant/sales-history","label":"সেলস অ্যানালিটিক্স"}]\n\`\`\``;
    }

    // D. Smart Grocery
    if (q.includes("grocery") || q.includes("গ্রোসারি") || q.includes("কাঁচামাল") || q.includes("স্টক") || q.includes("stock")) {
      return `🏪 **${restName}**-এর কিচেন স্টক ও গ্রোসারি ইনভেন্টরি ম্যানেজ করতে Smart Grocery ড্যাশবোর্ডে প্রবেশ করুন।\n\n\`\`\`action_buttons\n[{"type":"NAVIGATE","target":"/dashboard/restaurant/grocery","label":"স্মার্ট গ্রোসারি ড্যাশবোর্ড"}]\n\`\`\``;
    }

    return `স্বাগতম **${restName}** রেস্টুরেন্ট পার্টনার! 🏪\nআমি আপনার রেস্টুরেন্ট অ্যাসিস্ট্যান্ট। আপনি রানিং অর্ডার চেক করতে, মেনু আইটেম দেখতে বা সেলস সামারি জানতে আমাকে প্রশ্ন করতে পারেন।\n\n\`\`\`action_buttons\n[{"type":"NAVIGATE","target":"/dashboard/restaurant/orders","label":"রানিং অর্ডার দেখুন"},{"type":"NAVIGATE","target":"/dashboard/restaurant/menu","label":"মেনু ম্যানেজমেন্ট"}]\n\`\`\``;
  }

  // ------------------------------------------------------------------
  // 2. RIDER SPECIFIC LOGIC
  // ------------------------------------------------------------------
  if (userRole === "rider") {
    if (q.includes("active") || q.includes("delivery") || q.includes("order") || q.includes("অর্ডার") || q.includes("ডেলিভারি") || q.includes("ট্রিপ")) {
      const activeTrips = (riderOrders || []).filter(o => 
        ["ready", "out for delivery", "preparing"].includes(String(o.status || o.orderStatus).toLowerCase())
      );

      if (activeTrips.length > 0) {
        const trip = activeTrips[0];
        return `🛵 **সক্রিয় ডেলিভারি ট্রিপ #${trip.orderId}**:\n• কাস্টমার: ${trip.customerName || "Customer"}\n• ঠিকানা: ${trip.customerAddress || "ডেলিভারি লোকেশন"}\n• মূল্য: ৳${trip.totalAmount || 0} (${trip.paymentMethod || "COD"})\n\n\`\`\`action_buttons\n[{"type":"NAVIGATE","target":"/dashboard/rider/active","label":"অ্যাক্টিভ ডেলিভারি ম্যাপ"}]\n\`\`\``;
      }
      return `🛵 বর্তমানে আপনার কোনো সক্রিয় ডেলিভারি ট্রিপ অ্যাসাইন করা নেই। নতুন অর্ডার রেডি হলে রাইডার ড্যাশবোর্ডে দেখতে পাবেন।\n\n\`\`\`action_buttons\n[{"type":"NAVIGATE","target":"/dashboard/rider/active","label":"ডেলিভারি রিকোয়েস্ট চেক করুন"}]\n\`\`\``;
    }

    if (q.includes("earn") || q.includes("আয়") || q.includes("টাকা") || q.includes("কমিশন") || q.includes("commission")) {
      return `🛵 **রাইডার আর্নিংস সামারি**:\n• সম্পন্নকৃত ডেলিভারি: ${riderOrders?.length || 0}টি\n• প্রতিটি সফল ডেলিভারিতে কমিশন সরাসরি অ্যাকাউন্টে যোগ হয়।\n\n\`\`\`action_buttons\n[{"type":"NAVIGATE","target":"/dashboard/rider/earnings","label":"আর্নিংস ড্যাশবোর্ড"}]\n\`\`\``;
    }

    return `স্বাগতম রাইডার হিরো! 🛵\nআমি আপনার ডেলিভারি ও রুট গাইড। অ্যাক্টিভ ট্রিপ চেক করতে বা আর্নিংস দেখতে আমাকে জানান।\n\n\`\`\`action_buttons\n[{"type":"NAVIGATE","target":"/dashboard/rider/active","label":"অ্যাক্টিভ ট্রিপ"},{"type":"NAVIGATE","target":"/dashboard/rider/earnings","label":"আর্নিংস সামারি"}]\n\`\`\``;
  }

  // ------------------------------------------------------------------
  // 3. ADMIN SPECIFIC LOGIC
  // ------------------------------------------------------------------
  if (userRole === "admin") {
    if (q.includes("stat") || q.includes("overview") || q.includes("প্ল্যাটফর্ম") || q.includes("সামারি")) {
      return `🛡️ **FoodFlow প্ল্যাটফর্ম ওভারভিউ**:\n• মোট সক্রিয় রেস্টুরেন্ট: ${adminStats?.totalRestaurants || 15}টি\n• মোট রাইডার: ${adminStats?.totalRiders || 8}জন\n• মোট খাবার আইটেম: ${liveFoods.length}টি\n\n\`\`\`action_buttons\n[{"type":"NAVIGATE","target":"/dashboard/admin","label":"অ্যাডমিন ড্যাশবোর্ড"}]\n\`\`\``;
    }

    if (q.includes("approval") || q.includes("অনুমোদন") || q.includes("ভেরিফাই") || q.includes("partner")) {
      return `🛡️ নতুন রেস্টুরেন্ট ও রাইডার পার্টনারদের আবেদন অনুমোদন বা যাচাই করতে পার্টনার ম্যানেজমেন্ট পেজে প্রবেশ করুন।\n\n\`\`\`action_buttons\n[{"type":"NAVIGATE","target":"/dashboard/admin/restaurant-rider","label":"পার্টনার অ্যাপ্রুভাল পেজ"}]\n\`\`\``;
    }

    return `স্বাগতম সুপার অ্যাডমিন! 🛡️ প্ল্যাটফর্মের ডেটা ওভারভিউ, পার্টনার অ্যাপ্রুভাল বা সিস্টেম সেটিংস দেখতে পারেন।\n\n\`\`\`action_buttons\n[{"type":"NAVIGATE","target":"/dashboard/admin","label":"সেন্ট্রাল অ্যাডমিন প্যানেল"}]\n\`\`\``;
  }

  // ------------------------------------------------------------------
  // 4. CUSTOMER SPECIFIC LOGIC
  // ------------------------------------------------------------------
  const findMatchingFood = (queryStr: string) => {
    return liveFoods.find(f => 
      queryStr.includes(f.name.toLowerCase()) || 
      f.name.toLowerCase().includes(queryStr) ||
      (f.category && queryStr.includes(f.category.toLowerCase()))
    );
  };

  // A. Add to Cart intent
  if (q.includes("cart") && (q.includes("add") || q.includes("যোগ") || q.includes("দাও") || q.includes("ভরো") || q.includes("কিনব"))) {
    const targetFood = findMatchingFood(q) || (liveFoods.length > 0 ? liveFoods[0] : null);
    if (targetFood) {
      const actionObj = {
        action: "ADD_TO_CART",
        foodId: targetFood.id,
        foodName: targetFood.name,
        price: targetFood.discountPrice || targetFood.price,
        restaurantId: targetFood.restaurantId,
        image: targetFood.image,
        quantity: 1,
        label: `${targetFood.name} কার্টে যোগ করা হয়েছে`
      };
      return `আপনার কথামতো **${targetFood.name}** (৳${targetFood.discountPrice || targetFood.price}) আপনার কার্টে যোগ করা হয়েছে! 🛒\n\n\`\`\`action_execute\n${JSON.stringify(actionObj, null, 2)}\n\`\`\`\n\`\`\`action_buttons\n[{"type":"CHECKOUT","label":"সরাসরি চেকআউট করুন"}]\n\`\`\``;
    }
  }

  // B. Add to Favorite intent
  if ((q.includes("favorite") || q.includes("ফেভারিট") || q.includes("পছন্দ")) && (q.includes("add") || q.includes("যোগ") || q.includes("রাখ") || q.includes("সেভ"))) {
    const targetFood = findMatchingFood(q) || (liveFoods.length > 0 ? liveFoods[0] : null);
    if (targetFood) {
      const actionObj = {
        action: "ADD_TO_FAVORITE",
        foodId: targetFood.id,
        foodName: targetFood.name,
        label: `${targetFood.name} ফেভারিট লিস্টে যোগ করা হয়েছে`
      };
      return `**${targetFood.name}** আপনার ফেভারিট লিস্টে সফলভাবে যুক্ত করা হয়েছে! ❤️\n\n\`\`\`action_execute\n${JSON.stringify(actionObj, null, 2)}\n\`\`\``;
    }
  }

  // C. Remove from Favorite intent
  if ((q.includes("favorite") || q.includes("ফেভারিট") || q.includes("পছন্দ")) && (q.includes("remove") || q.includes("delete") || q.includes("ডিলিট") || q.includes("মুছে") || q.includes("বাদ"))) {
    const targetFood = userFavorites.find((f: any) => q.includes(f.name?.toLowerCase())) || (userFavorites.length > 0 ? userFavorites[0] : null);
    if (targetFood) {
      const actionObj = {
        action: "REMOVE_FROM_FAVORITE",
        foodId: targetFood.foodId || targetFood.id || targetFood._id,
        foodName: targetFood.name,
        label: `${targetFood.name} ফেভারিট থেকে মুছে ফেলা হয়েছে`
      };
      return `**${targetFood.name}** আপনার ফেভারিট তালিকা থেকে মুছে ফেলা হয়েছে।\n\n\`\`\`action_execute\n${JSON.stringify(actionObj, null, 2)}\n\`\`\``;
    }
  }

  // D. View Favorites intent
  if (q.includes("favorite") || q.includes("ফেভারিট") || q.includes("পছন্দের খাবার")) {
    if (userFavorites.length > 0) {
      const favNames = userFavorites.map((f: any) => `• **${f.name}** (৳${f.price})`).join("\n");
      return `আপনার ফেভারিট তালিকায় মোট ${userFavorites.length}টি খাবার রয়েছে:\n\n${favNames}\n\n\`\`\`action_buttons\n[{"type":"NAVIGATE","target":"/dashboard/customer/favorites","label":"ফেভারিট লিস্ট পেজ"}]\n\`\`\``;
    }
    return `আপনার ফেভারিট তালিকায় এখনও কোনো খাবার যোগ করা হয়নি।`;
  }

  // E. View Delivery Addresses
  if (q.includes("address") || q.includes("ঠিকানা") || q.includes("লোকেশন")) {
    if (userAddresses && userAddresses.length > 0) {
      const addrList = userAddresses.map((a: any) => `• **${a.label || "Address"}**: ${a.address || a.street || "ঠিকানা"}`).join("\n");
      return `আপনার সেভ করা ডেলিভারি ঠিকানাসমূহ:\n\n${addrList}\n\n\`\`\`action_buttons\n[{"type":"NAVIGATE","target":"/dashboard/customer/address","label":"ঠিকানা ম্যানেজ করুন"}]\n\`\`\``;
    }
    return `আপনার কোনো সেভ করা ঠিকানা পাওয়া যায়নি। চেকআউটের সুবিধার জন্য প্রোফাইল থেকে ঠিকানা যোগ করুন।\n\n\`\`\`action_buttons\n[{"type":"NAVIGATE","target":"/dashboard/customer/address","label":"নতুন ঠিকানা যোগ করুন"}]\n\`\`\``;
  }

  // F. View Coupons / Offers
  if (q.includes("coupon") || q.includes("কুপন") || q.includes("offer") || q.includes("অফার") || q.includes("discount") || q.includes("ছাড়")) {
    const list = activeCoupons.length > 0
      ? activeCoupons.map((c: any) => `• **${c.code}**: ${c.discount}`).join("\n")
      : "• **WELCOME20**: প্রথম অর্ডারে দারুণ ছাড়\n• **CRAVE30**: ৳৩০ ছাড়";
    return `FoodFlow-তে বর্তমানে আকর্ষণীয় কুপন কোডসমূহ:\n\n${list}\n\nচেকআউটে কুপন ব্যবহার করে উপভোগ করুন ইনস্ট্যান্ট ডিসকাউন্ট!`;
  }

  // G. Check Cart intent
  if (q.includes("cart") || q.includes("কার্ট") || q.includes("ঝুড়ি")) {
    if (userCart.totalItems > 0) {
      const itemsList = userCart.items.map((i: any) => `${i.name} (${i.quantity}টি)`).join(", ");
      return `আপনার কার্টে মোট **${userCart.totalItems}টি আইটেম** রয়েছে: ${itemsList}।\nখাবার মূল্য ৳${userCart.subtotal} + ডেলিভারি চার্জ ৳৪০ = **সর্বমোট ৳${userCart.grandTotal}**।\n\n\`\`\`action_buttons\n[{"type":"CHECKOUT","label":"সরাসরি চেকআউট করুন"}]\n\`\`\``;
    }
    return `আপনার কার্ট বর্তমানে খালি আছে। মেনু থেকে আপনার পছন্দের খাবার বাছাই করে নিন!`;
  }

  // H. Check Order Status intent
  if (q.includes("order") || q.includes("অর্ডার") || q.includes("track") || q.includes("ট্র্যাক") || q.includes("status") || q.includes("স্ট্যাটাস") || q.includes("রাইডার")) {
    if (userOrders.length > 0) {
      const ord = userOrders[0];
      return `আপনার সাম্প্রতিক অর্ডার #${ord.orderId}-এর বর্তমান স্ট্যাটাস: **${ord.status}**।\nডেলিভারি রাইডার: ${ord.riderName || "নির্ধারণ করা হচ্ছে"} (আনুমানিক সময়: ${ord.eta || "২৫-৩৫ মিনিট"})।\n\n\`\`\`order_status\n${JSON.stringify(ord, null, 2)}\n\`\`\`\n\`\`\`action_buttons\n[{"type":"TRACK_ORDER","label":"লাইভ অর্ডার ট্র্যাকিং পেজ"}]\n\`\`\``;
    }
    return `আপনার কোনো সক্রিয় অর্ডার পাওয়া যায়নি। নতুন খাবার অর্ডার করলে এখান থেকেই লাইভ স্ট্যাটাস দেখতে পারবেন!`;
  }

  // I. Checkout Navigation intent
  if (q.includes("checkout") || q.includes("চেকআউট") || q.includes("অর্ডার করব") || q.includes("পেমেন্ট")) {
    const actionObj = {
      action: "NAVIGATE",
      target: "/checkout",
      label: "চেকআউট পেজে যাওয়া হচ্ছে"
    };
    return `আপনাকে চেকআউট পেজে নিয়ে যাওয়া হচ্ছে... 🚀\n\n\`\`\`action_execute\n${JSON.stringify(actionObj, null, 2)}\n\`\`\`\n\`\`\`action_buttons\n[{"type":"CHECKOUT","label":"চেকআউট করুন"}]\n\`\`\``;
  }

<<<<<<< HEAD
  // J. Food Recommendation Matching (Budget, Spicy, Category)
=======
  // 4. Check for Platform General Info / Delivery charge
  if (q.includes("চার্জ") || q.includes("fee") || q.includes("delivery")) {
    return `FoodFlow-তে স্ট্যান্ডার্ড ডেলিভারি চার্জ মাত্র **৳৪০**। আমরা সাধারণত ২৫-৪০ মিনিটের মধ্যে গরম ও তাজা খাবার ডেলিভারি করে থাকি! 🚀`;
  }

  // 5. Food Recommendation Matching (Budget, Mood, Location)
>>>>>>> ed99c2d (Added: Multi-Model Ai Service Provider Added Like: Groq)
  let matchedFoods = [...liveFoods];
  const budgetMatch = message.match(/(?:৳|tk|bdt|\$)?\s*(\d{2,4})\s*(?:টাকা|tk|bdt|taka)?/i);
  const budget = budgetMatch ? parseInt(budgetMatch[1], 10) : null;

<<<<<<< HEAD
  const isSpicyQuery = q.includes("ঝাল") || q.includes("spicy");
  const isVegQuery = q.includes("ভেজিটেবল") || q.includes("নিরামিষ") || q.includes("veg");
  const isPizzaQuery = q.includes("pizza") || q.includes("পিজ্জা");
  const isBurgerQuery = q.includes("burger") || q.includes("বার্গার");
  const isBiryaniQuery = q.includes("biryani") || q.includes("বিরিয়ানি");

  if (isSpicyQuery) {
    const spicyFoods = matchedFoods.filter(f => f.isSpicy || f.name.toLowerCase().includes("spicy") || f.category?.toLowerCase().includes("pizza") || f.category?.toLowerCase().includes("burger"));
    if (spicyFoods.length > 0) matchedFoods = spicyFoods;
  }
  if (isVegQuery) {
    const vegFoods = matchedFoods.filter(f => f.isVegetarian || f.category?.toLowerCase().includes("veg") || f.name.toLowerCase().includes("salad"));
    if (vegFoods.length > 0) matchedFoods = vegFoods;
  }
  if (isPizzaQuery) {
    const pizzaFoods = matchedFoods.filter(f => f.category?.toLowerCase().includes("pizza") || f.name.toLowerCase().includes("pizza"));
    if (pizzaFoods.length > 0) matchedFoods = pizzaFoods;
  } else if (isBurgerQuery) {
    const burgerFoods = matchedFoods.filter(f => f.category?.toLowerCase().includes("burger") || f.name.toLowerCase().includes("burger"));
    if (burgerFoods.length > 0) matchedFoods = burgerFoods;
  } else if (isBiryaniQuery) {
    const biryaniFoods = matchedFoods.filter(f => f.category?.toLowerCase().includes("biryani") || f.name.toLowerCase().includes("biriyani"));
    if (biryaniFoods.length > 0) matchedFoods = biryaniFoods;
  }
=======
  const isSpicyQuery = q.includes("ঝাল") || q.includes("spicy") || mood === "spicy";
  const isHealthyQuery = q.includes("ভেজিটেবল") || q.includes("healthy") || q.includes("diet") || q.includes("সালাদ") || mood === "healthy";

  if (isSpicyQuery) {
    const spicyFoods = matchedFoods.filter(f => f.isSpicy || f.name.toLowerCase().includes("spicy") || f.name.toLowerCase().includes("burger"));
    if (spicyFoods.length > 0) matchedFoods = spicyFoods;
  }

  if (isHealthyQuery) {
    const vegFoods = matchedFoods.filter(f => f.isVegetarian || f.category.toLowerCase().includes("veg") || f.category.toLowerCase().includes("salad"));
    if (vegFoods.length > 0) matchedFoods = vegFoods;
  }
>>>>>>> ed99c2d (Added: Multi-Model Ai Service Provider Added Like: Groq)

  if (budget) {
    const withinBudget = matchedFoods.filter(f => (f.discountPrice || f.price) <= budget);
    if (withinBudget.length > 0) matchedFoods = withinBudget;
  }

  const recommendations = matchedFoods.slice(0, 3);
<<<<<<< HEAD
=======
  const locText = location?.zoneName || location?.area ? `আপনার এলাকা **${location.zoneName || location.area}**-এ ` : "";

>>>>>>> ed99c2d (Added: Multi-Model Ai Service Provider Added Like: Groq)
  if (recommendations.length > 0) {
    const foodNames = recommendations.map(f => `${f.name} (৳${f.discountPrice || f.price})`).join(" এবং ");
    const budgetText = budget ? `আপনার ৳${budget} বাজেটের মধ্যে ` : "";
    const spicyText = isSpicyQuery ? "ঝাল ও মজাদার " : "";

<<<<<<< HEAD
    return `${budgetText}সেরা ${spicyText}খাবারের অপশন হলো **${foodNames}**। ডেলিভারি চার্জ ৳৪০ সহ সহজেই কার্টে যোগ করে অর্ডার করতে পারেন!\n\n\`\`\`food_recommendations\n${JSON.stringify(recommendations, null, 2)}\n\`\`\`\n\`\`\`action_buttons\n[{"type":"CHECKOUT","label":"চেকআউট করুন"}]\n\`\`\``;
=======
    return `${locText}${budgetText}সেরা ${spicyText}খাবারের অপশন হলো **${foodNames}**। ডেলিভারি চার্জ ৳৪০ সহ সহজেই অর্ডার করতে পারেন!\n\n\`\`\`food_recommendations\n${JSON.stringify(recommendations, null, 2)}\n\`\`\`\n\`\`\`action_buttons\n[{"type":"CHECKOUT","label":"চেকআউট করুন"}]\n\`\`\``;
>>>>>>> ed99c2d (Added: Multi-Model Ai Service Provider Added Like: Groq)
  }

  return `FoodFlow AI Assistant-এ আপনাকে স্বাগতম! আপনি কি খাবারের পরামর্শ চান, কার্টে খাবার যোগ করতে চান, নাকি কোনো অর্ডার ট্র্যাক করতে চান?`;
}

function extractRawKeyString(item: any): string {
  if (!item) return "";
  if (typeof item === "string") return item.trim();
  return typeof item.key === "string" ? item.key.trim() : "";
}

/**
 * Record usage count and health status for the used API key in MongoDB
 */
async function recordKeyUsage(
  provider: "groq" | "agentrouter" | "gemini",
  usedRawKey: string,
  status: "active" | "rate_limited" | "error" = "active"
) {
  try {
    const col = await getSettingsCollection();
    const doc = await col.findOne({ key: "ai_configuration" });
    if (!doc) return;

    const field =
      provider === "groq"
        ? "groqKeys"
        : provider === "agentrouter"
        ? "agentRouterKeys"
        : "geminiKeys";

    const keysArray = Array.isArray(doc[field]) ? doc[field] : [];
    let matched = false;

    const updatedArray = keysArray.map((item: any, idx: number) => {
      const raw = typeof item === "string" ? item.trim() : (item?.key?.trim() || "");
      if (raw && raw === usedRawKey.trim()) {
        matched = true;
        const currentCount =
          typeof item === "object" && typeof item.usageCount === "number"
            ? item.usageCount
            : 0;
        return {
          id: typeof item === "object" && item.id ? item.id : `k-${idx}`,
          key: raw,
          usageCount: status === "active" ? currentCount + 1 : currentCount,
          lastUsedAt: new Date().toISOString(),
          status: status,
          addedAt: typeof item === "object" && item.addedAt ? item.addedAt : new Date().toISOString(),
        };
      }
      return item;
    });

    if (matched) {
      await col.updateOne(
        { key: "ai_configuration" },
        { $set: { [field]: updatedArray } }
      );
    }
  } catch (e) {
    console.warn(`[recordKeyUsage] Error updating usage for ${provider}:`, e);
  }
}

/**
 * Call Groq with key pool failover & usage tracking
 */
async function callGroqWithFailover(
  keys: any[],
  model: string,
  messages: Array<{ role: string; content: string }>,
  temperature: number,
  maxTokens: number
): Promise<string> {
  const rawList = (keys || []).map(extractRawKeyString).filter(Boolean);
  const mergedKeys = Array.from(new Set([
    ...rawList,
    ...(process.env.GROQ_API_KEYS ? process.env.GROQ_API_KEYS.split(",").map(k => k.trim()) : []),
    ...(process.env.GROQ_API_KEY ? [process.env.GROQ_API_KEY.trim()] : []),
  ])).filter(Boolean);

  if (mergedKeys.length === 0) throw new Error("No Groq keys configured");

  let lastError: any = null;
  for (const key of mergedKeys) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: model || "qwen/qwen3.8-27b",
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const text = json?.choices?.[0]?.message?.content;
        if (text) {
          recordKeyUsage("groq", key, "active").catch(() => {});
          return text;
        }
      }

      if (res.status === 429) {
        recordKeyUsage("groq", key, "rate_limited").catch(() => {});
      } else if (res.status === 401 || res.status === 403) {
        recordKeyUsage("groq", key, "error").catch(() => {});
      }

      const errJson = await res.json().catch(() => null);
      lastError = errJson?.error?.message || `HTTP ${res.status}`;
    } catch (err: any) {
      lastError = err?.message || err;
    }
  }

  throw new Error(`All Groq keys failed. ${lastError}`);
}

/**
 * Call Agent Router with SSE stream reader & usage tracking
 */
async function callAgentRouterWithFailover(
  keys: any[],
  messages: Array<{ role: string; content: string }>,
  temperature: number,
  maxTokens: number
): Promise<string> {
  const rawList = (keys || []).map(extractRawKeyString).filter(Boolean);
  const mergedKeys = Array.from(new Set([
    ...rawList,
    ...(process.env.AGENTROUTER_API_KEYS ? process.env.AGENTROUTER_API_KEYS.split(",").map(k => k.trim()) : []),
    ...(process.env.AGENTROUTER_API_KEY ? [process.env.AGENTROUTER_API_KEY.trim()] : []),
  ])).filter(Boolean);

  if (mergedKeys.length === 0) throw new Error("No Agent Router keys configured");

  let lastError: any = null;
  for (const key of mergedKeys) {
    try {
      const res = await fetch("https://agentrouter.org/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          Originator: "codex_cli_rs",
          Version: "0.114.0",
          "anthropic-dangerous-direct-browser-access": "true",
          "x-app": "cli",
        },
        body: JSON.stringify({
          model: "deepseek-v4-flash",
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
        }),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let content = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const clean = line.trim();
            if (clean.startsWith("data:") && !clean.includes("[DONE]")) {
              try {
                const parsed = JSON.parse(clean.slice(5).trim());
                const delta = parsed?.choices?.[0]?.delta?.content;
                if (delta) content += delta;
              } catch {}
            }
          }
        }

        if (content.trim()) {
          recordKeyUsage("agentrouter", key, "active").catch(() => {});
          return content.trim();
        }
      }

      if (res.status === 429) {
        recordKeyUsage("agentrouter", key, "rate_limited").catch(() => {});
      } else if (res.status === 401 || res.status === 403) {
        recordKeyUsage("agentrouter", key, "error").catch(() => {});
      }

      const errJson = await res.json().catch(() => null);
      lastError = errJson?.error?.message || `HTTP ${res.status}`;
    } catch (err: any) {
      lastError = err?.message || err;
    }
  }

  throw new Error(`All Agent Router keys failed. ${lastError}`);
}

/**
 * Call Gemini REST with key failover & usage tracking
 */
async function callGeminiRestWithFailover(
  keys: any[],
  model: string,
  payload: any
): Promise<string> {
  const rawList = (keys || []).map(extractRawKeyString).filter(Boolean);
  const mergedKeys = Array.from(new Set([
    ...rawList,
    ...(process.env.GEMINI_API_KEYS ? process.env.GEMINI_API_KEYS.split(",").map(k => k.trim()) : []),
    ...(process.env.GEMINI_API_KEY ? [process.env.GEMINI_API_KEY.trim()] : []),
  ])).filter(Boolean);

  if (mergedKeys.length === 0) throw new Error("No Gemini keys configured");

  const models = [
    model || "gemini-2.5-flash",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ].filter((v, i, a) => a.indexOf(v) === i);

  let lastError: any = null;
  for (const activeKey of mergedKeys) {
    for (const m of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${activeKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const json = await res.json();
          const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            recordKeyUsage("gemini", activeKey, "active").catch(() => {});
            return text;
          }
        }

        if (res.status === 429) {
          recordKeyUsage("gemini", activeKey, "rate_limited").catch(() => {});
        } else if (res.status === 401 || res.status === 403) {
          recordKeyUsage("gemini", activeKey, "error").catch(() => {});
        }

        const errJson = await res.json().catch(() => null);
        lastError = errJson || res.statusText;
        if (res.status === 404) continue;
        if (res.status === 429 || res.status === 403) break;
      } catch (err) {
        lastError = err;
      }
    }
  }

  throw new Error(`All Gemini keys failed. ${JSON.stringify(lastError)}`);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      userRole: rawUserRole = "customer", 
      message, 
      chatHistory = [], 
      userId, 
      userEmail, 
      userName,
      cartItems = [],
      userLocation,
      userMood,
    } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, message: "Message is required" },
        { status: 400 }
      );
    }

<<<<<<< HEAD
    // 1. Genuine Role Discovery from MongoDB
    let effectiveRole = String(rawUserRole || "customer").toLowerCase().trim();
    let restaurantProfile: any = null;
    let restaurantOrders: any[] = [];
    let restaurantFoods: any[] = [];
    let riderProfile: any = null;
    let riderOrders: any[] = [];
    let userAddresses: any[] = [];
    let adminStats: any = {};

    const userCol = await getUsersCollection();
    const restCol = await getRestaurantsCollection();
    const riderCol = await getRiderCollection();
    const ordersCol = await getOrdersCollection();
    const successCol = await getSuccessOrdersCollection();
    const foodCol = await getFoodCollection();
    const addressCol = await getAddressCollection();

    // Look up restaurant or rider or user profile
    if (userId || userEmail) {
      const restConds: any[] = [];
      if (userEmail) {
        restConds.push({ email: userEmail }, { ownerEmail: userEmail });
      }
      if (userId) {
        restConds.push({ ownerId: userId }, { userId: userId });
        if (ObjectId.isValid(userId)) {
          restConds.push({ ownerId: new ObjectId(userId) }, { userId: new ObjectId(userId) });
        }
      }

      if (restConds.length > 0) {
        const foundRest = await restCol.findOne({ $or: restConds });
        if (foundRest) {
          effectiveRole = "restaurant";
          restaurantProfile = foundRest;
        }
      }

      // Check Rider profile if not restaurant
      if (!restaurantProfile) {
        const riderConds: any[] = [];
        if (userEmail) riderConds.push({ email: userEmail });
        if (userId) {
          riderConds.push({ userId: userId });
          if (ObjectId.isValid(userId)) riderConds.push({ _id: new ObjectId(userId) });
        }

        if (riderConds.length > 0) {
          const foundRider = await riderCol.findOne({ $or: riderConds });
          if (foundRider) {
            effectiveRole = "rider";
            riderProfile = foundRider;
          }
        }
      }

      // Also check user collection role if not determined yet
      if (!restaurantProfile && !riderProfile) {
        const userConds: any[] = [];
        if (userEmail) userConds.push({ email: userEmail });
        if (userId && ObjectId.isValid(userId)) userConds.push({ _id: new ObjectId(userId) });

        if (userConds.length > 0) {
          const dbUser = await userCol.findOne({ $or: userConds });
          if (dbUser?.role) {
            const r = String(dbUser.role).toLowerCase();
            if (r.includes("restaurant")) effectiveRole = "restaurant";
            else if (r.includes("rider") || r.includes("delivery")) effectiveRole = "rider";
            else if (r.includes("admin")) effectiveRole = "admin";
            else effectiveRole = "customer";
          }
        }
      }
    }

    // Extract potential order ID from message (e.g., FF-12345, mongo id)
    const orderIdMatch = message.match(/(?:FF-[A-Za-z0-9_-]+|[a-f0-9]{24})/i);
    const extractedOrderId = orderIdMatch ? orderIdMatch[0] : null;

=======
    const orderIdMatch = message.match(/(?:FF-[A-Za-z0-9_-]+|[a-f0-9]{24})/i);
    const extractedOrderId = orderIdMatch ? orderIdMatch[0] : null;

    // Load AI Configuration from DB
    let aiSettings: any = null;
    try {
      const settingsCol = await getSettingsCollection();
      aiSettings = await settingsCol.findOne({ key: "ai_configuration" });
    } catch (e) {
      console.warn("Could not load AI configuration from DB:", e);
    }

    const activeProvider = aiSettings?.activeProvider || "gemini";
    const activeModel = aiSettings?.activeModel || "gemini-2.5-flash";
    const geminiKeys: string[] = Array.isArray(aiSettings?.geminiKeys) ? aiSettings.geminiKeys : [];
    const groqKeys: string[] = Array.isArray(aiSettings?.groqKeys) ? aiSettings.groqKeys : [];
    const agentRouterKeys: string[] = Array.isArray(aiSettings?.agentRouterKeys) ? aiSettings.agentRouterKeys : [];
    const temperature = Number(aiSettings?.temperature ?? 0.6);
    const maxTokens = Math.max(Number(aiSettings?.maxOutputTokens ?? 2048), 1800);

    // Concurrently fetch real live context from MongoDB
>>>>>>> ed99c2d (Added: Multi-Model Ai Service Provider Added Like: Groq)
    let liveFoods: any[] = [];
    let liveRestaurants: any[] = [];
    let userOrders: any[] = [];
    let userFavorites: any[] = [];
    let activeCoupons: any[] = [];
    const restaurantNameMap: Record<string, string> = {};
    const foodLookup = new Map<string, any>();

    const promises: Promise<any>[] = [];

<<<<<<< HEAD
    // 2. Role-specific Data Fetching
    if (effectiveRole === "restaurant") {
      promises.push(
        (async () => {
          try {
            const restIdStr = restaurantProfile?._id?.toString() || "";
            const restName = restaurantProfile?.name || "";

            const restOrderConds: any[] = [];
            if (restIdStr) {
              restOrderConds.push({ restaurantId: restIdStr }, { "items.restaurantId": restIdStr });
            }
            if (restName) {
              restOrderConds.push({ restaurantName: restName }, { "items.restaurantName": restName });
            }

            if (restOrderConds.length > 0) {
              const [activeOrders, recentSuccess] = await Promise.all([
                ordersCol.find({ $or: restOrderConds }).sort({ createdAt: -1 }).limit(10).toArray(),
                successCol.find({ $or: restOrderConds }).sort({ createdAt: -1 }).limit(5).toArray(),
              ]);

              const combined = [...activeOrders, ...recentSuccess];
              restaurantOrders = combined.map((o: any) => ({
                orderId: o.orderId || o._id?.toString(),
                status: o.orderStatus || o.status || "Placed",
                totalAmount: o.totalAmount || o.grandTotal || 0,
                customerName: o.customerName || o.userName || o.userEmail || "Customer",
                customerAddress: o.deliveryAddress?.address || o.address || "Delivery Address",
                items: (o.items || []).map((it: any) => ({
                  name: it.name || it.foodItem?.name || "Food Item",
                  quantity: it.quantity || 1,
                  price: it.price || 0,
                })),
                createdAt: o.createdAt,
              }));
            }

            // Fetch this restaurant's food menu
            if (restIdStr || restName) {
              const foodConds: any[] = [];
              if (restIdStr) foodConds.push({ restaurantId: restIdStr });
              if (restName) foodConds.push({ restaurantName: restName });

              const rawMenu = await foodCol.find({ $or: foodConds }).limit(20).toArray();
              restaurantFoods = rawMenu.map((f: any) => ({
                id: f._id?.toString(),
                name: f.name,
                price: Number(f.price) || 0,
                discountPrice: f.discountPrice ? Number(f.discountPrice) : undefined,
                category: f.category || "General",
                status: f.status || (f.isAvailable ? "available" : "unavailable"),
              }));
            }
          } catch (e) {
            console.error("AI Restaurant data fetch error:", e);
          }
        })()
      );
    } else if (effectiveRole === "rider") {
      promises.push(
        (async () => {
          try {
            const riderConds: any[] = [];
            if (userId) riderConds.push({ riderId: userId }, { "riderInfo.riderId": userId });
            if (userEmail) riderConds.push({ "riderInfo.email": userEmail });

            const rawRiderOrders = await ordersCol.find({ $or: riderConds.length > 0 ? riderConds : [{ status: "Ready" }] }).sort({ createdAt: -1 }).limit(8).toArray();
            riderOrders = rawRiderOrders.map((o: any) => ({
              orderId: o.orderId || o._id?.toString(),
              status: o.orderStatus || o.status,
              totalAmount: o.totalAmount || o.grandTotal || 0,
              customerName: o.customerName || o.userName || "Customer",
              customerAddress: o.deliveryAddress?.address || o.address || "Delivery Location",
              paymentMethod: o.paymentMethod || "COD",
            }));
          } catch (e) {
            console.error("AI Rider data fetch error:", e);
          }
        })()
      );
    } else if (effectiveRole === "admin") {
      promises.push(
        (async () => {
          try {
            const [totalRest, totalRiders, totalUsers] = await Promise.all([
              restCol.countDocuments(),
              riderCol.countDocuments(),
              userCol.countDocuments(),
            ]);
            adminStats = {
              totalRestaurants: totalRest,
              totalRiders: totalRiders,
              totalUsers: totalUsers,
            };
          } catch (e) {
            console.error("AI Admin stats fetch error:", e);
          }
        })()
      );
    }

    // 3. Common Context: Live Foods & Restaurants
    promises.push(
      (async () => {
        try {
=======
    // 1 & 2. Fetch restaurants and foods strictly geofenced to the customer's active delivery zone
    promises.push(
      (async () => {
        try {
          const restCol = await getRestaurantsCollection();
          const foodCol = await getFoodCollection();

          const userLoc = userLocation || {};
          const rawZoneIds: string[] = (
            Array.isArray(userLoc.candidateZoneIds) && userLoc.candidateZoneIds.length > 0
              ? userLoc.candidateZoneIds.map(String)
              : userLoc.currentZoneId
              ? [String(userLoc.currentZoneId)]
              : []
          ).filter(Boolean);

          const zoneNameStr = (userLoc.zoneName || "").trim();
          const districtStr = (userLoc.district || "").trim();
          const upazilaStr = (userLoc.upazila || "").trim();
          const cityStr = (userLoc.city || "").trim();
          const areaStr = (userLoc.area || "").trim();

          const hasSpecificLocation = Boolean(
            rawZoneIds.length > 0 ||
            (zoneNameStr && zoneNameStr !== "All Bangladesh" && zoneNameStr !== "Bangladesh") ||
            (districtStr && districtStr !== "All Bangladesh" && districtStr !== "Bangladesh") ||
            (cityStr && cityStr !== "All Bangladesh" && cityStr !== "Bangladesh")
          );

          let restaurantQuery: any = { status: { $ne: "blocked" } };

          if (rawZoneIds.length > 0) {
            // Strict Delivery Geofence by Zone ID (matches dishes page behavior)
            const numericIds = rawZoneIds.map(Number).filter((n) => !isNaN(n));
            const allMatches: (string | number)[] = [...rawZoneIds, ...numericIds];
            restaurantQuery = {
              status: { $ne: "blocked" },
              $or: [
                { zoneId: { $in: allMatches } },
                { numericZoneId: { $in: allMatches } },
                { zoneIds: { $in: allMatches } },
                { numericZoneIds: { $in: allMatches } },
                { "address.zoneId": { $in: allMatches } },
                { zoneMongoIdStr: { $in: rawZoneIds } },
              ],
            };
          } else if (hasSpecificLocation) {
            // Fallback to text area matching only when zone ID is absent
            const textMatchers = [zoneNameStr, upazilaStr, districtStr, areaStr, cityStr]
              .filter((t) => t && t !== "All Bangladesh" && t !== "Bangladesh");
            const zoneMatchConditions: any[] = [];

            for (const text of textMatchers) {
              const clean = text.replace(/(Hub|Zone|Food Hub)$/i, "").trim();
              if (clean) {
                const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                const reg = new RegExp(escaped, "i");
                zoneMatchConditions.push(
                  { "address.zoneName": reg },
                  { "address.area": reg },
                  { "address.upazila": reg },
                  { "address.district": reg },
                  { "address.city": reg },
                  { city: reg }
                );
              }
            }

            if (zoneMatchConditions.length > 0) {
              restaurantQuery = {
                status: { $ne: "blocked" },
                $or: zoneMatchConditions,
              };
            }
          }

>>>>>>> ed99c2d (Added: Multi-Model Ai Service Provider Added Like: Groq)
          const rawRest = await restCol
            .find(restaurantQuery, {
              projection: {
                name: 1,
                restaurantName: 1,
                cuisine: 1,
                rating: 1,
                deliveryTime: 1,
                address: 1,
                zone: 1,
                zoneId: 1,
              },
            })
            .limit(30)
            .toArray();

          liveRestaurants = rawRest.map((r: any) => {
            const rId = r._id?.toString() || "";
            const rName = r.restaurantName || r.name || "FoodFlow Restaurant";
            restaurantNameMap[rId] = rName;
            return {
              id: rId,
              name: rName,
              cuisine: r.cuisine || "Multi-Cuisine",
              rating: r.rating || 4.8,
              deliveryTime: r.deliveryTime || "25-35 mins",
              zone: r.address?.zoneName || r.zone || r.address?.city,
            };
          });

<<<<<<< HEAD
    promises.push(
      (async () => {
        try {
=======
          const matchingRestaurantIds = rawRest.map((r: any) => r._id?.toString()).filter(Boolean);
          const matchingRestaurantObjectIds = matchingRestaurantIds
            .filter((id: string) => ObjectId.isValid(id))
            .map((id: string) => new ObjectId(id));

          let foodQuery: any = {
            $or: [
              { status: "available" },
              { isAvailable: true },
              { isAvailable: "true" },
              { status: { $exists: false } },
            ],
          };

          if (hasSpecificLocation) {
            if (matchingRestaurantIds.length > 0) {
              foodQuery.restaurantId = {
                $in: [...matchingRestaurantIds, ...matchingRestaurantObjectIds],
              };
            } else {
              // 0 restaurants in this zone => exactly 0 foods available!
              foodQuery = { _id: "NO_MATCHING_ZONE_FOODS" };
            }
          }

>>>>>>> ed99c2d (Added: Multi-Model Ai Service Provider Added Like: Groq)
          const rawFoods = await foodCol
            .find(foodQuery, {
              projection: {
                name: 1,
                price: 1,
                discountPrice: 1,
                category: 1,
                restaurantId: 1,
                restaurantName: 1,
                image: 1,
                images: 1,
                isSpicy: 1,
                isVegetarian: 1,
                rating: 1,
              },
            })
            .sort({ createdAt: -1 })
<<<<<<< HEAD
            .limit(25)
=======
            .limit(40)
>>>>>>> ed99c2d (Added: Multi-Model Ai Service Provider Added Like: Groq)
            .toArray();

          rawFoods.forEach((f: any) => {
            const id = f._id?.toString();
            if (id) foodLookup.set(id, f);
            if (f.name) foodLookup.set(f.name.toLowerCase().trim(), f);
          });

          let foods = rawFoods.map((f: any) => {
            const restId = f.restaurantId?.toString() || "";
            const trueImg = getTrueFoodImage(f);
            return {
              id: f._id?.toString(),
              restaurantId: restId,
              name: f.name,
              category: f.category || "Dishes",
              price: Number(f.price) || 0,
              discountPrice: f.discountPrice ? Number(f.discountPrice) : undefined,
              // Keep image compact for LLM prompt context; exact real image is restored during response post-processing
              image: (trueImg.startsWith("data:") || trueImg.length > 250)
                ? "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80"
                : (trueImg || "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80"),
              isSpicy: Boolean(f.isSpicy),
              isVegetarian: Boolean(f.isVegetarian),
              restaurantName: f.restaurantName || restaurantNameMap[restId] || "FoodFlow Kitchen",
              rating: f.rating ? Number(f.rating) : 4.8,
            };
          });

          // Sort by user mood if present
          if (userMood) {
            const m = String(userMood).toLowerCase();
            if (m.includes("spicy") || m.includes("ঝাল")) {
              foods = foods.sort((a: any, b: any) => (b.isSpicy ? 1 : 0) - (a.isSpicy ? 1 : 0));
            } else if (m.includes("healthy") || m.includes("diet") || m.includes("হেলদি")) {
              foods = foods.sort((a: any, b: any) => (b.isVegetarian ? 1 : 0) - (a.isVegetarian ? 1 : 0));
            } else if (m.includes("budget") || m.includes("বাজেট")) {
              foods = foods.sort((a: any, b: any) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
            }
          }

          liveFoods = foods.slice(0, 25);
        } catch (e) {
          console.error("AI liveRestaurants & liveFoods fetch error:", e);
        }
      })()
    );

    // 4. Fetch customer orders & addresses (if customer)
    if (effectiveRole === "customer" && (userId || userEmail)) {
      promises.push(
        (async () => {
          try {
            const conds: any[] = [];
            if (userId) conds.push({ userId });
            if (userEmail) conds.push({ userEmail });
            if (extractedOrderId) {
              conds.push({ orderId: extractedOrderId });
              if (ObjectId.isValid(extractedOrderId)) {
                conds.push({ _id: new ObjectId(extractedOrderId) });
              }
            }

            if (conds.length > 0) {
              const [active, completed] = await Promise.all([
                ordersCol
                  .find({ $or: conds })
                  .sort({ createdAt: -1 })
                  .limit(3)
                  .toArray(),
                successCol
                  .find({ $or: conds })
                  .sort({ createdAt: -1 })
                  .limit(2)
                  .toArray(),
              ]);

              const merged = [...active, ...completed];
              userOrders = merged.map((o: any) => ({
                orderId: o.orderId || o._id?.toString(),
                status: o.orderStatus || o.status || "Placed",
                totalAmount: o.totalAmount || o.grandTotal || 0,
                riderName: o.riderInfo?.name || o.riderName || "Searching for rider...",
                riderPhone: o.riderInfo?.phone || o.riderPhone || null,
                eta: o.estimatedTime || "20-30 mins",
              }));
            }
          } catch (e) {
            console.error("AI userOrders fetch error:", e);
          }
        })()
      );

<<<<<<< HEAD
      // Fetch saved addresses
      promises.push(
        (async () => {
          try {
            const conds: any[] = [];
            if (userId) conds.push({ userId });
            if (userEmail) conds.push({ userEmail });
            const rawAddrs = await addressCol.find({ $or: conds }).limit(5).toArray();
            userAddresses = rawAddrs.map((a: any) => ({
              label: a.label || a.type || "Address",
              address: a.address || a.street || "Delivery Address",
=======
          if (conds.length > 0) {
            const [active, completed] = await Promise.all([
              ordersCol.find({ $or: conds }).sort({ createdAt: -1 }).limit(3).toArray(),
              successCol.find({ $or: conds }).sort({ createdAt: -1 }).limit(2).toArray(),
            ]);

            const merged = [...active, ...completed];
            userOrders = merged.map((o: any) => ({
              orderId: o.orderId || o._id?.toString(),
              status: o.orderStatus || o.status || "Placed",
              totalAmount: o.totalAmount || o.grandTotal || 0,
              riderName: o.riderInfo?.name || o.riderName || "Searching for rider...",
              riderPhone: o.riderInfo?.phone || o.riderPhone || null,
              eta: o.estimatedTime || "20-30 mins",
>>>>>>> ed99c2d (Added: Multi-Model Ai Service Provider Added Like: Groq)
            }));
          } catch (e) {
            console.error("AI address fetch error:", e);
          }
        })()
      );
    }

    // 5. Fetch user favorites
    if (userId || userEmail) {
      promises.push(
        (async () => {
          try {
            const favCol = await getFavoritesCollection();
            const conds: any[] = [];
            if (userId) conds.push({ userId });
            if (userEmail) conds.push({ userEmail });

            const rawFavs = await favCol.find({ $or: conds }).limit(10).toArray();
            userFavorites = rawFavs.map((fav: any) => ({
              id: fav._id?.toString(),
              foodId: fav.foodId || fav._id?.toString(),
              name: fav.name || fav.foodName || "Favorite Food",
              price: fav.price || 0,
              image: fav.image,
              restaurantName: fav.restaurantName,
            }));
          } catch (e) {
            console.error("AI userFavorites fetch error:", e);
          }
        })()
      );
    }

    // 6. Fetch coupons
    promises.push(
      (async () => {
        try {
          const couponCol = await getCouponsCollection();
          const rawCoupons = await couponCol.find({ isActive: { $ne: false } }).limit(5).toArray();

          activeCoupons = rawCoupons.map((c: any) => ({
            code: c.code,
            discount: c.discountValue ? `${c.discountValue}% OFF` : (c.discountAmount ? `৳${c.discountAmount} OFF` : "Special Discount"),
            minOrder: c.minOrderValue || 0,
          }));
        } catch (e) {
          console.error("AI coupons fetch error:", e);
        }
      })()
    );

<<<<<<< HEAD
    await Promise.all(promises);

    liveFoods = liveFoods.map(f => ({
      ...f,
      restaurantName: f.restaurantName || restaurantNameMap[f.restaurantId] || "FoodFlow Kitchen"
    }));

    // Construct tailored System Prompt depending on User Role
    let roleSpecificPrompt = "";

    if (effectiveRole === "restaurant") {
      roleSpecificPrompt = `
CURRENT USER IS A RESTAURANT PARTNER / OWNER:
Restaurant Name: "${restaurantProfile?.name || "FoodFlow Partner"}"
Restaurant ID: "${restaurantProfile?._id?.toString() || ""}"
ACTIVE RESTAURANT ORDERS (Incoming / Preparing / Ready): ${JSON.stringify(restaurantOrders)}
RESTAURANT MENU ITEMS: ${JSON.stringify(restaurantFoods)}

RESTAURANT OWNER BEHAVIOR RULES:
- The user is a RESTAURANT OWNER. NEVER suggest customer food recommendations to buy or show customer "Add to Cart" or "Checkout" buttons.
- When user asks about running orders (e.g. "amr ki runing kuno oder ase", "active orders", "pending orders"):
  * Check ACTIVE RESTAURANT ORDERS. If active orders exist, report order ID, customer name, items, quantity, total price, and status.
  * Append action button: \`\`\`action_buttons\n[{"type":"NAVIGATE","target":"/dashboard/restaurant/orders","label":"অর্ডার ম্যানেজমেন্ট ড্যাশবোর্ড"}]\n\`\`\`
- When user asks about menu, dishes, or adding food:
  * Summarize their menu and provide action buttons for /dashboard/restaurant/menu and /dashboard/restaurant/add-food.
- When user asks about sales or earnings:
  * Calculate total volume from restaurant orders data and summarize.
- When user asks about photo editing:
  * Provide action button for /dashboard/restaurant/ai-image-editor.
`;
    } else if (effectiveRole === "rider") {
      roleSpecificPrompt = `
CURRENT USER IS A RIDER / DELIVERY HERO:
RIDER PROFILE: "${riderProfile?.name || userName || "Rider"}"
ACTIVE RIDER ORDERS: ${JSON.stringify(riderOrders)}

RIDER BEHAVIOR RULES:
- When rider asks about active deliveries or trips, report pickup/drop info and provide action button for /dashboard/rider/active.
- When rider asks about earnings, report commission info and provide action button for /dashboard/rider/earnings.
`;
    } else if (effectiveRole === "admin") {
      roleSpecificPrompt = `
CURRENT USER IS AN ADMIN:
ADMIN STATS: ${JSON.stringify(adminStats)}

ADMIN BEHAVIOR RULES:
- When admin asks about platform statistics, summarize totals and link to /dashboard/admin.
- When admin asks about partner approvals, link to /dashboard/admin/restaurant-rider.
`;
    } else {
      roleSpecificPrompt = `
CURRENT USER IS A CUSTOMER:
User Name: "${userName || "Customer"}"
LIVE FOODS: ${JSON.stringify(liveFoods)}
USER CART: ${JSON.stringify(cartItems)}
USER FAVORITES: ${JSON.stringify(userFavorites)}
USER ADDRESSES: ${JSON.stringify(userAddresses)}
USER ORDERS: ${JSON.stringify(userOrders)}
ACTIVE COUPONS: ${JSON.stringify(activeCoupons)}

CUSTOMER CAPABILITIES:
- Suggest foods from LIVE FOODS with \`\`\`food_recommendations ... \`\`\` block and Checkout buttons.
- Execute actions (ADD_TO_CART, REMOVE_FROM_CART, CLEAR_CART, ADD_TO_FAVORITE, REMOVE_FROM_FAVORITE, CHECK_ORDERS, NAVIGATE).
- When asked about delivery addresses, show saved addresses and link to /dashboard/customer/address.
- When asked about coupons, show active promo codes.
`;
    }

    const systemInstruction = `
You are FoodFlow AI Super Assistant, an intelligent, role-aware autonomous agent for FoodFlow Bangladesh.
Current Verified Role: "${effectiveRole.toUpperCase()}"

${roleSpecificPrompt}

GENERAL RULES:
- Reply in natural, polite Bengali (বাংলা) by default. If the user writes in English, reply in English.
- Keep answers concise, clear, and action-oriented (2 to 4 sentences).
- If outputting structured directives, append them cleanly at the end.
=======
    // 5. Fetch live user cart
    let userCart: any = { items: [], totalItems: 0, subtotal: 0, deliveryCharge: 0, grandTotal: 0 };
    if (Array.isArray(cartItems) && cartItems.length > 0) {
      const items = cartItems.map((ci: any) => {
        const qty = Number(ci.quantity) || 1;
        const price = Number(ci.price) || 0;
        return { name: ci.name || "খাবার আইটেম", quantity: qty, price, subtotal: price * qty };
      });
      const subtotal = items.reduce((acc: number, cur: any) => acc + cur.subtotal, 0);
      const totalItems = items.reduce((acc: number, cur: any) => acc + cur.quantity, 0);
      userCart = { items, totalItems, subtotal, deliveryCharge: totalItems > 0 ? 40 : 0, grandTotal: totalItems > 0 ? subtotal + 40 : 0 };
    }

    await Promise.all(promises);

    // 6. Detect Add-To-Cart Intent
    const lowerMsg = message.toLowerCase();
    const isCartAddIntent =
      /(?:cart|কার্ট|ঝুড়ি|কিনব|কিনতে|নেব|অর্ডার|order|যোগ|add)/i.test(lowerMsg) &&
      /(?:add|যোগ|করো|দিন|দাও|কর|রাখো|ঢুকাও|ইনক্লুড|include|চাই|করুন|দিব|নেব|প্যাক)/i.test(lowerMsg);

    let detectedCartItem: any = null;
    if (isCartAddIntent && liveFoods.length > 0) {
      for (const f of liveFoods) {
        const cleanFoodName = f.name.toLowerCase().trim();
        if (
          lowerMsg.includes(cleanFoodName) ||
          cleanFoodName.split(/\s+/).some((part: string) => part.length >= 4 && lowerMsg.includes(part))
        ) {
          const doc = foodLookup.get(f.id) || foodLookup.get(cleanFoodName) || f;
          const trueImg = getTrueFoodImage(doc);
          detectedCartItem = {
            id: doc._id?.toString() || f.id,
            name: doc.name || f.name,
            price: Number(doc.price) || f.price,
            discountPrice: doc.discountPrice ? Number(doc.discountPrice) : f.discountPrice,
            restaurantId: doc.restaurantId?.toString() || f.restaurantId,
            restaurantName: doc.restaurantName || restaurantNameMap[doc.restaurantId?.toString()] || f.restaurantName,
            image: (trueImg && trueImg.length > 200) ? trueImg : (f.image || "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80"),
            category: doc.category || f.category || "Dishes",
            isSpicy: Boolean(doc.isSpicy),
            isVegetarian: Boolean(doc.isVegetarian),
            quantity: 1,
          };
          break;
        }
      }
    }

    const locationStr = userLocation?.zoneName || userLocation?.area || userLocation?.city || "ঢাকা";
    const moodStr = userMood || "সাধারণ ক্ষুধা";

    const defaultPrompt = `You are FoodFlow's Lead Food Concierge & Gourmet Sales Executive. FoodFlow is a premier online food delivery platform in Bangladesh.
Your mission: Entice, delight, and guide customers into ordering the best food deliverable to their location!

PERSONALITY & SALES TONE:
- Be warm, extremely polite, and mouthwateringly descriptive (বাংলায় কথা বলুন). Use appetizing sensory words (যেমন: মুচমুচে, গরম গরম, চিজি, ধোঁয়া ওঠা, স্পাইসি, সুগন্ধি বাসমতী চাল, অথেনটিক মসলা).
- Proactive Sales Executive: If customer chooses a main dish, tempt them with a beverage, side, or dessert.
- Keep responses concise (3-5 sentences) and persuasive.

LOCATION CONTEXT ({{USER_LOCATION}}):
- Prioritize dishes deliverable to user's area (সাধারণত ২৫-৪০ মিনিটে খাবার পৌঁছাবে).

MOOD & CRAVINGS ({{USER_MOOD}}):
- Match the user's vibe (ঝাল/স্পাইসি, চিট ডে, হেলদি, লেট নাইট, বাজেট কম্বো).

BUDGET CALCULATION:
- Standard delivery fee is ৳৪০. When recommending packages within a budget, always include the ৳৪০ delivery fee calculation clearly.

STRUCTURED RECOMMENDATIONS:
Whenever suggesting food, ALWAYS append the structured food recommendations and checkout action button codeblocks at the very end of your response:
\`\`\`food_recommendations
[{"id":"<food_id>","restaurantId":"<restaurant_id>","name":"<name>","price":<price>,"discountPrice":<discountPrice_or_null>,"restaurantName":"<restaurant_name>","image":"<image_url>","rating":4.8,"isSpicy":<true/false>}]
\`\`\`
\`\`\`action_buttons
[{"type":"CHECKOUT","label":"চেকআউট করুন"}]
\`\`\`
>>>>>>> ed99c2d (Added: Multi-Model Ai Service Provider Added Like: Groq)
`;

    let customPrompt = aiSettings?.salesExecutivePrompt || defaultPrompt;
    customPrompt = customPrompt
      .replace(/{{USER_LOCATION}}/g, locationStr)
      .replace(/{{USER_MOOD}}/g, String(moodStr))
      .replace(/{{LIVE_FOODS}}/g, JSON.stringify(liveFoods))
      .replace(/{{USER_CART}}/g, JSON.stringify(userCart))
      .replace(/{{ACTIVE_COUPONS}}/g, JSON.stringify(activeCoupons));

    const geofenceRules = `
CRITICAL ZONE GEOFENCING & DISH AVAILABILITY RULES (MANDATORY):
1. CUSTOMER'S ACTIVE LOCATION: ${locationStr}.
2. DELIVERABLE FOODS: You are strictly and ONLY allowed to suggest and recommend dishes that appear in the LIVE FOODS list below (these are the ONLY items deliverable to ${locationStr}).
   - Absolutely NEVER invent or recommend dishes from other cities, other zones, or restaurants not present in LIVE FOODS.
   - Every recommended dish MUST be from LIVE FOODS with its exact name, restaurant, and price.
3. IF LIVE FOODS IS EMPTY (${liveFoods.length === 0 ? "CURRENT STATUS: EMPTY / 0 DISHES" : "CURRENT STATUS: HAS DISHES"}):
   - Clearly and politely explain in Bengali:
     "দুঃখিত! আপনার এলাকা (${locationStr})-তে আমাদের ফুড ডেলিভারি সার্ভিস এখনো সক্রিয় হয়নি বা এই মুহূর্তে কোনো অনুমোদিত রেস্টুরেন্ট খোলা নেই।"
   - Advise the customer to choose another nearby delivery area from the top location selector.
   - NEVER output any \`\`\`food_recommendations\`\`\` codeblock when LIVE FOODS is empty.
4. IF THE CUSTOMER ASKS FOR A FOOD NOT IN LIVE FOODS (e.g. they ask for Burger, Biryani, Coffee, etc., but that specific category/food is not in LIVE FOODS):
   - First, politely acknowledge and inform them:
     "দুঃখিত, আপনার বর্তমান লোকেশন (${locationStr})-তে এই মুহূর্তে কাঙ্ক্ষিত খাবারটি পাওয়া যাচ্ছে না।"
   - Then, act as a passionate, friendly gourmet concierge and convince them to try the best dishes that ARE currently available from the active restaurants in their area:
     "তবে আপনার এরিয়ার [Restaurant Name] থেকে গরম গরম [Food Name] (৳[Price]) এখনই অর্ডার করতে পারেন!"
   - ONLY include the truly available dishes in the \`\`\`food_recommendations\`\`\` codeblock.
`;

    const systemInstruction = `
${customPrompt}

${geofenceRules}

LIVE CONTEXT:
- Location: ${locationStr}
- Mood/Vibe: ${moodStr}
- Live Foods: ${JSON.stringify(liveFoods)}
- Live Restaurants: ${JSON.stringify(liveRestaurants)}
- User Cart: ${JSON.stringify(userCart)}
- User Orders: ${JSON.stringify(userOrders)}
`;

    // Format chat messages
    const trimmedHistory = chatHistory.slice(-4).map((m: any) => ({
      role: m.role === "assistant" || m.role === "model" ? "assistant" : "user",
      content: m.content || m.text || m.message || (m.parts && m.parts[0]?.text) || "",
    }));

    const unifiedMessages = [
      { role: "system", content: systemInstruction },
      ...trimmedHistory,
      { role: "user", content: message.trim() },
    ];

    const geminiPayload = {
      contents: [
        ...trimmedHistory.map((m: any) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        { role: "user", parts: [{ text: message.trim() }] },
      ],
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      generationConfig: {
<<<<<<< HEAD
        temperature: 0.6,
        maxOutputTokens: 1000,
      },
    };

    let reply: string;

    // Multi-tier failover: 1. Gemini -> 2. OpenRouter -> 3. Local Rule Engine
    try {
      reply = await callGeminiRestWithFailover(geminiPayload);
    } catch (geminiErr) {
      console.warn("[AI Chat] Gemini API failed, trying OpenRouter fallback:", geminiErr);
      try {
        reply = await callOpenRouterChat(systemInstruction, trimmedHistory, message.trim());
      } catch (openRouterErr) {
        console.warn("[AI Chat] OpenRouter failed, using intelligent local engine:", openRouterErr);
        reply = generateLocalFallbackResponse(
          message, 
          effectiveRole, 
          liveFoods, 
          userOrders, 
          cartItems, 
          userFavorites, 
          userAddresses,
          activeCoupons,
          restaurantProfile,
          restaurantOrders,
          restaurantFoods,
          riderProfile,
          riderOrders,
          adminStats
        );
=======
        temperature,
        maxOutputTokens: maxTokens,
      },
    };

    let reply = "";
    let providerUsed = activeProvider;

    // Provider cascade
    const providerSequence = Array.from(new Set([
      activeProvider,
      activeProvider === "groq" ? "agentrouter" : "groq",
      "gemini",
    ]));

    for (const provider of providerSequence) {
      try {
        if (provider === "groq") {
          reply = await callGroqWithFailover(groqKeys, activeModel, unifiedMessages, temperature, maxTokens);
          providerUsed = "groq";
          break;
        } else if (provider === "agentrouter") {
          reply = await callAgentRouterWithFailover(agentRouterKeys, unifiedMessages, temperature, maxTokens);
          providerUsed = "agentrouter";
          break;
        } else if (provider === "gemini") {
          reply = await callGeminiRestWithFailover(geminiKeys, activeModel, geminiPayload);
          providerUsed = "gemini";
          break;
        }
      } catch (err) {
        console.warn(`[Next AI Chat] Provider ${provider} failed, trying next:`, err);
      }
    }

    if (!reply) {
      console.warn("[Next AI Chat] All providers failed. Using local fallback.");
      reply = generateLocalFallbackResponse(message, liveFoods, userOrders, userCart, activeCoupons, userLocation, userMood);
      providerUsed = "fallback";
    }

    // Enforce exact real food images and verified dish metadata from MongoDB
    if (reply && foodLookup.size > 0) {
      reply = reply.replace(
        /```(?:food_recommendations|json:foods|json)?\s*(\[[\s\S]*?\])\s*```?/gi,
        (fullMatch, jsonStr) => {
          try {
            const list = JSON.parse(jsonStr);
            if (Array.isArray(list)) {
              const enriched = list.map((item: any) => {
                const doc = (item.id && foodLookup.get(item.id)) ||
                  (item.name && foodLookup.get(item.name.toLowerCase().trim()));
                if (doc) {
                  const trueImg = getTrueFoodImage(doc);
                  return {
                    ...item,
                    id: doc._id?.toString() || item.id,
                    name: doc.name || item.name,
                    restaurantId: doc.restaurantId?.toString() || item.restaurantId,
                    restaurantName: doc.restaurantName || restaurantNameMap[doc.restaurantId?.toString()] || item.restaurantName,
                    price: Number(doc.price) || item.price,
                    discountPrice: doc.discountPrice ? Number(doc.discountPrice) : item.discountPrice,
                    image: (trueImg && trueImg.length > 200) ? trueImg : (item.image || "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80"),
                    rating: doc.rating ? Number(doc.rating) : item.rating || 4.8,
                    isSpicy: Boolean(doc.isSpicy ?? item.isSpicy),
                    isVegetarian: Boolean(doc.isVegetarian ?? item.isVegetarian),
                  };
                }
                return item;
              });
              return "```food_recommendations\n" + JSON.stringify(enriched, null, 2) + "\n```";
            }
          } catch (e) {
            // Keep original if JSON parsing fails
          }
          return fullMatch;
        }
      );
    }

    // Handle Cart Action detection & response encapsulation
    let finalCartAction: any = detectedCartItem ? { type: "ADD_TO_CART", food: detectedCartItem } : null;

    const cartMatch = reply.match(/```(?:cart_action|json:cart)?\s*(\{\s*[\s\S]*?"(?:ADD_TO_CART|type)"[\s\S]*?\}\s*)\s*```?/i);
    if (cartMatch) {
      try {
        const parsedCart = JSON.parse(cartMatch[1]);
        if (parsedCart && (parsedCart.type === "ADD_TO_CART" || parsedCart.action === "ADD_TO_CART")) {
          const targetId = parsedCart.foodId || parsedCart.id || parsedCart.food?.id;
          const targetName = parsedCart.name || parsedCart.food?.name;
          const doc = (targetId && foodLookup.get(targetId)) ||
            (targetName && foodLookup.get(targetName.toLowerCase().trim())) ||
            detectedCartItem;
          if (doc) {
            const trueImg = getTrueFoodImage(doc);
            finalCartAction = {
              type: "ADD_TO_CART",
              food: {
                id: doc._id?.toString() || doc.id,
                name: doc.name,
                price: Number(doc.price),
                discountPrice: doc.discountPrice ? Number(doc.discountPrice) : undefined,
                restaurantId: doc.restaurantId?.toString(),
                restaurantName: doc.restaurantName || restaurantNameMap[doc.restaurantId?.toString()],
                image: (trueImg && trueImg.length > 200) ? trueImg : (doc.image || "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80"),
                category: doc.category || "Dishes",
                isSpicy: Boolean(doc.isSpicy),
                isVegetarian: Boolean(doc.isVegetarian),
                quantity: Number(parsedCart.quantity) || 1,
              },
            };
          }
        }
      } catch (e) {}
    } else if (detectedCartItem) {
      reply += `\n\n\`\`\`cart_action\n${JSON.stringify({ type: "ADD_TO_CART", food: detectedCartItem }, null, 2)}\n\`\`\``;
      if (!reply.includes("action_buttons")) {
        reply += `\n\`\`\`action_buttons\n[{"type":"CHECKOUT","label":"সরাসরি চেকআউট করুন 🛒"}]\n\`\`\``;
>>>>>>> ed99c2d (Added: Multi-Model Ai Service Provider Added Like: Groq)
      }
    }

    return NextResponse.json({
      success: true,
      userRole: effectiveRole,
      restaurantName: restaurantProfile?.name,
      reply,
      provider: providerUsed,
      model: activeModel,
      cartAction: finalCartAction,
    });
  } catch (error: any) {
    console.error("[Next AI Chat Route] Unhandled Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || "Internal server error" 
      },
      { status: 500 }
    );
  }
}
