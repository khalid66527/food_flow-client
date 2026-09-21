import { NextResponse } from "next/server";
import { 
  getFoodCollection, 
  getOrdersCollection, 
  getSuccessOrdersCollection, 
  getRestaurantsCollection, 
  getCouponsCollection,
  getCartCollection,
} from "@/lib/db";
import { ObjectId } from "mongodb";

const FALLBACK_KEYS: string[] = [];

let workingKeyIndex = 0;
let cachedWorkingModel = "gemini-2.5-flash";

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
    throw new Error("No Gemini API keys found in process.env.GEMINI_API_KEY or process.env.GEMINI_API_KEYS");
  }
  let attempts = 0;
  let lastError: any = null;

  while (attempts < totalKeys) {
    const activeKey = keyPool[workingKeyIndex];

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const json = await res.json();
          const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            cachedWorkingModel = model;
            return text;
          }
        }

        const errJson = await res.json().catch(() => null);
        lastError = errJson || res.statusText;

        if (res.status === 404) {
          continue; // Try next model
        }

        if (res.status === 429 || res.status === 403 || String(lastError?.error?.message).includes("quota")) {
          break; // rotate to next API key
        }
      } catch (err) {
        lastError = err;
      }
    }

    workingKeyIndex = (workingKeyIndex + 1) % totalKeys;
    attempts++;
  }

  throw new Error(`All Gemini API keys failed. ${JSON.stringify(lastError)}`);
}

// Helper to sanitize images and avoid base64 data blowup
function sanitizeImageUrl(rawImg?: string): string {
  if (!rawImg || typeof rawImg !== "string") {
    return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80";
  }
  if (rawImg.startsWith("data:") || rawImg.length > 250) {
    return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80";
  }
  return rawImg;
}

/**
 * Intelligent local fallback generator for FoodFlow queries
 */
function generateLocalFallbackResponse(
  message: string, 
  liveFoods: any[], 
  userOrders: any[], 
  userCart: any, 
  activeCoupons: any[]
): string {
  const q = message.toLowerCase();
  
  // 1. Check if user is asking about Cart
  if (q.includes("cart") || q.includes("কার্ট") || q.includes("ঝুড়ি")) {
    if (userCart.totalItems > 0) {
      const itemsList = userCart.items.map((i: any) => `${i.name} (${i.quantity}টি)`).join(", ");
      return `আপনার কার্টে মোট ${userCart.totalItems}টি আইটেম রয়েছে: ${itemsList}। খাবার মূল্য ৳${userCart.subtotal} + ডেলিভারি চার্জ ৳৪০ = সর্বমোট ৳${userCart.grandTotal}।\n\n\`\`\`action_buttons\n[{"type":"CHECKOUT","label":"সরাসরি চেকআউট করুন"}]\n\`\`\``;
    }
    return `আপনার কার্ট বর্তমানে খালি আছে। আমাদের সুস্বাদু মেনু থেকে আপনার পছন্দের খাবার কার্টে যোগ করুন!`;
  }

  // 2. Check if user is asking about Order Status
  if (q.includes("order") || q.includes("অর্ডার") || q.includes("track") || q.includes("ট্র্যাক") || q.includes("status") || q.includes("স্ট্যাটাস") || q.includes("রাইডার")) {
    if (userOrders.length > 0) {
      const ord = userOrders[0];
      return `আপনার সাম্প্রতিক অর্ডার #${ord.orderId}-এর বর্তমান স্ট্যাটাস: **${ord.status}**। ডেলিভারি রাইডার: ${ord.riderName || "নির্ধারণ করা হচ্ছে"} (আনুমানিক সময়: ${ord.eta || "২৫ মিনিট"})।\n\n\`\`\`order_status\n${JSON.stringify(ord)}\n\`\`\`\n\`\`\`action_buttons\n[{"type":"TRACK_ORDER","label":"লাইভ অর্ডার ট্র্যাকিং"}]\n\`\`\``;
    }
    return `আপনার কোনো সক্রিয় অর্ডার পাওয়া যায়নি। আপনি নতুন খাবার অর্ডার করলে এখান থেকেই লাইভ স্ট্যাটাস দেখতে পারবেন!`;
  }

  // 3. Check for Coupons / Offers
  if (q.includes("coupon") || q.includes("কুপন") || q.includes("offer") || q.includes("অফার") || q.includes("discount") || q.includes("ছাড়")) {
    const couponList = activeCoupons.length > 0 
      ? activeCoupons.map((c: any) => `• **${c.code}**: ${c.discount} ডিসকাউন্ট`).join("\n")
      : "• **WELCOME20**: প্রথম অর্ডারে দারুণ ছাড়\n• **CRAVE30**: ৳৩০ ছাড়";
    return `FoodFlow-তে বর্তমানে আকর্ষণীয় ডিসকাউন্ট ভাউচার চলছে:\n\n${couponList}\n\nচেকআউট পেজে কুপন কোড ব্যবহার করে উপভোগ করুন ইনস্ট্যান্ট ডিসকাউন্ট!`;
  }

  // 4. Check for Platform General Info / How to Order / Roles
  if (q.includes("foodflow") || q.includes("ফুডফ্লো") || q.includes("কিভাবে") || q.includes("how to") || q.includes("order") || q.includes("ডেলিভারি চার্জ") || q.includes("delivery fee")) {
    if (q.includes("চার্জ") || q.includes("fee")) {
      return `FoodFlow-তে স্ট্যান্ডার্ড ডেলিভারি চার্জ মাত্র **৳৪০**। আমরা সাধারণত ২৫-৪০ মিনিটের মধ্যে গরম ও তাজা খাবার ডেলিভারি করে থাকি! 🚀`;
    }
    if (q.includes("রেস্টুরেন্ট") || q.includes("restaurant") || q.includes("partner") || q.includes("পার্টনার")) {
      return `FoodFlow-তে রেস্টুরেন্ট পার্টনার হিসেবে যোগ দিতে Register পেজ থেকে Restaurant Role নির্বাচন করে আপনার রেস্টুরেন্টের তথ্য জমা দিন। অ্যাডমিন যাচাই শেষে দ্রুত অনুমোদন দেওয়া হবে।`;
    }
    if (q.includes("রাইডার") || q.includes("rider") || q.includes("delivery hero")) {
      return `FoodFlow ডেলিভারি রাইডার হিসেবে যোগ দিতে Rider Role দিয়ে রেজিস্ট্রেশন করুন। প্রতিটি সফল ডেলিভারিতে আকর্ষণীয় কমিশন ও বোনাস পাবেন!`;
    }
    return `FoodFlow একটি আধুনিক অনলাইন ফুড ডেলিভারি প্ল্যাটফর্ম 🍔।\n\n১. মেনু থেকে পছন্দের খাবার সিলেক্ট করুন\n২. কার্টে যোগ করে চেকআউটে ঠিকানা দিন\n৩. কার্ড অথবা ক্যাশ অন ডেলিভারিতে অর্ডার কনফার্ম করুন এবং লাইভ ট্র্যাক করুন!`;
  }

  // 5. Food Recommendation Matching (Budget, Spicy, Category)
  let matchedFoods = [...liveFoods];

  // Budget filter
  const budgetMatch = message.match(/(?:৳|tk|bdt|\$)?\s*(\d{2,4})\s*(?:টাকা|tk|bdt|taka)?/i);
  const budget = budgetMatch ? parseInt(budgetMatch[1], 10) : null;

  const isSpicyQuery = q.includes("ঝাল") || q.includes("spicy") || q.includes("ঝাল খাবার");
  const isVegQuery = q.includes("ভেজিটেবল") || q.includes("নিরামিষ") || q.includes("vegetable") || q.includes("veg") || q.includes("salad");
  const isPizzaQuery = q.includes("pizza") || q.includes("পিজ্জা");
  const isBurgerQuery = q.includes("burger") || q.includes("বার্গার");
  const isBiryaniQuery = q.includes("biryani") || q.includes("বিরিয়ানি");

  if (isSpicyQuery) {
    const spicyFoods = matchedFoods.filter(f => f.isSpicy || f.name.toLowerCase().includes("spicy") || f.name.toLowerCase().includes("pizza") || f.name.toLowerCase().includes("burger"));
    if (spicyFoods.length > 0) matchedFoods = spicyFoods;
  }

  if (isVegQuery) {
    const vegFoods = matchedFoods.filter(f => f.isVegetarian || f.category.toLowerCase().includes("veg") || f.name.toLowerCase().includes("salad"));
    if (vegFoods.length > 0) matchedFoods = vegFoods;
  }

  if (isPizzaQuery) {
    const pizzaFoods = matchedFoods.filter(f => f.category.toLowerCase().includes("pizza") || f.name.toLowerCase().includes("pizza"));
    if (pizzaFoods.length > 0) matchedFoods = pizzaFoods;
  } else if (isBurgerQuery) {
    const burgerFoods = matchedFoods.filter(f => f.category.toLowerCase().includes("burger") || f.name.toLowerCase().includes("burger"));
    if (burgerFoods.length > 0) matchedFoods = burgerFoods;
  } else if (isBiryaniQuery) {
    const biryaniFoods = matchedFoods.filter(f => f.category.toLowerCase().includes("biryani") || f.name.toLowerCase().includes("biriyani"));
    if (biryaniFoods.length > 0) matchedFoods = biryaniFoods;
  }

  if (budget) {
    const withinBudget = matchedFoods.filter(f => (f.discountPrice || f.price) <= budget);
    if (withinBudget.length > 0) {
      matchedFoods = withinBudget;
    }
  }

  // Pick top 2-3 items
  const recommendations = matchedFoods.slice(0, 3);

  if (recommendations.length > 0) {
    const foodNames = recommendations.map(f => `${f.name} (৳${f.discountPrice || f.price})`).join(" এবং ");
    const budgetText = budget ? `আপনার ৳${budget} বাজেটের মধ্যে ` : "";
    const spicyText = isSpicyQuery ? "ঝাল ও মজাদার " : "";

    return `${budgetText}সেরা ${spicyText}খাবারের অপশন হলো **${foodNames}**। ডেলিভারি চার্জ ৳৪০ সহ সহজেই অর্ডার করতে পারেন!\n\n\`\`\`food_recommendations\n${JSON.stringify(recommendations, null, 2)}\n\`\`\`\n\`\`\`action_buttons\n[{"type":"CHECKOUT","label":"চেকআউট করুন"}]\n\`\`\``;
  }

  return `FoodFlow-তে আপনাকে স্বাগতম! আপনার পছন্দের খাবারের নাম, বাজেট অথবা যেকোনো সহায়তার জন্য আমাকে বলতে পারেন।`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      userRole = "customer", 
      message, 
      chatHistory = [], 
      userId, 
      userEmail, 
      userName,
      cartItems = [] 
    } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, message: "Message is required" },
        { status: 400 }
      );
    }

    // Extract potential order ID from message (e.g., FF-12345, 65f... mongo id)
    const orderIdMatch = message.match(/(?:FF-[A-Za-z0-9_-]+|[a-f0-9]{24})/i);
    const extractedOrderId = orderIdMatch ? orderIdMatch[0] : null;

    // Concurrently fetch real live context from MongoDB
    let liveFoods: any[] = [];
    let liveRestaurants: any[] = [];
    let userOrders: any[] = [];
    let activeCoupons: any[] = [];
    const restaurantNameMap: Record<string, string> = {};

    const promises: Promise<any>[] = [];

    // 1. Fetch restaurants list & build restaurant lookup map
    promises.push(
      (async () => {
        try {
          const restCol = await getRestaurantsCollection();
          const rawRest = await restCol
            .find(
              { status: { $ne: "blocked" } },
              { projection: { name: 1, cuisine: 1, rating: 1, deliveryTime: 1, address: 1 } }
            )
            .limit(15)
            .toArray();

          liveRestaurants = rawRest.map((r: any) => {
            const rId = r._id?.toString() || "";
            restaurantNameMap[rId] = r.name || "FoodFlow Restaurant";
            return {
              id: rId,
              name: r.name,
              cuisine: r.cuisine || "Multi-Cuisine",
              rating: r.rating || 4.8,
              deliveryTime: r.deliveryTime || "25-35 mins",
            };
          });
        } catch (e) {
          console.error("AI liveRestaurants fetch error:", e);
        }
      })()
    );

    // 2. Fetch available food items
    promises.push(
      (async () => {
        try {
          const foodCol = await getFoodCollection();
          const rawFoods = await foodCol
            .find(
              { $or: [{ status: "available" }, { isAvailable: true }, { isAvailable: "true" }, { status: { $exists: false } }] },
              {
                projection: {
                  name: 1,
                  price: 1,
                  discountPrice: 1,
                  category: 1,
                  restaurantId: 1,
                  restaurantName: 1,
                  image: 1,
                  isSpicy: 1,
                  isVegetarian: 1,
                  rating: 1,
                },
              }
            )
            .sort({ createdAt: -1 })
            .limit(20)
            .toArray();

          liveFoods = rawFoods.map((f: any) => {
            const restId = f.restaurantId?.toString() || "";
            return {
              id: f._id?.toString(),
              restaurantId: restId,
              name: f.name,
              category: f.category || "Dishes",
              price: Number(f.price) || 0,
              discountPrice: f.discountPrice ? Number(f.discountPrice) : undefined,
              image: sanitizeImageUrl(f.image),
              isSpicy: Boolean(f.isSpicy),
              isVegetarian: Boolean(f.isVegetarian),
              restaurantName: f.restaurantName || restaurantNameMap[restId] || "FoodFlow Kitchen",
              rating: f.rating ? Number(f.rating) : 4.8,
            };
          });
        } catch (e) {
          console.error("AI liveFoods fetch error:", e);
        }
      })()
    );

    // 3. Fetch user orders
    promises.push(
      (async () => {
        try {
          const ordersCol = await getOrdersCollection();
          const successCol = await getSuccessOrdersCollection();

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

    // 4. Fetch available coupons
    promises.push(
      (async () => {
        try {
          const couponCol = await getCouponsCollection();
          const rawCoupons = await couponCol
            .find({ isActive: { $ne: false } })
            .limit(5)
            .toArray();

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

    // 5. Fetch and ground live user cart
    let userCart: {
      items: Array<{ name: string; quantity: number; price: number; subtotal: number }>;
      totalItems: number;
      subtotal: number;
      deliveryCharge: number;
      grandTotal: number;
    } = {
      items: [],
      totalItems: 0,
      subtotal: 0,
      deliveryCharge: 0,
      grandTotal: 0,
    };

    if (Array.isArray(cartItems) && cartItems.length > 0) {
      const items = cartItems.map((ci: any) => {
        const qty = Number(ci.quantity) || 1;
        const price = Number(ci.price) || 0;
        return {
          name: ci.name || "খাবার আইটেম",
          quantity: qty,
          price: price,
          subtotal: price * qty,
        };
      });
      const subtotal = items.reduce((acc: number, cur: any) => acc + cur.subtotal, 0);
      const totalItems = items.reduce((acc: number, cur: any) => acc + cur.quantity, 0);
      userCart = {
        items,
        totalItems,
        subtotal,
        deliveryCharge: totalItems > 0 ? 40 : 0,
        grandTotal: totalItems > 0 ? subtotal + 40 : 0,
      };
    } else if (userId || userEmail) {
      promises.push(
        (async () => {
          try {
            const cartCol = await getCartCollection();
            const conds: any[] = [];
            if (userId) conds.push({ userId });
            if (userEmail) conds.push({ userEmail });

            const dbCartDocs = await cartCol.find({ $or: conds }).toArray();
            if (dbCartDocs && dbCartDocs.length > 0) {
              const items = dbCartDocs.map((doc: any) => {
                const qty = Number(doc.quantity) || 1;
                const price = Number(doc.discountPrice || doc.price) || 0;
                return {
                  name: doc.name || "খাবার আইটেম",
                  quantity: qty,
                  price: price,
                  subtotal: price * qty,
                };
              });
              const subtotal = items.reduce((acc: number, cur: any) => acc + cur.subtotal, 0);
              const totalItems = items.reduce((acc: number, cur: any) => acc + cur.quantity, 0);
              userCart = {
                items,
                totalItems,
                subtotal,
                deliveryCharge: totalItems > 0 ? 40 : 0,
                grandTotal: totalItems > 0 ? subtotal + 40 : 0,
              };
            }
          } catch (e) {
            console.error("AI userCart fetch error:", e);
          }
        })()
      );
    }

    await Promise.all(promises);

    // Make sure food items have restaurant names filled
    liveFoods = liveFoods.map(f => ({
      ...f,
      restaurantName: f.restaurantName || restaurantNameMap[f.restaurantId] || "FoodFlow Kitchen"
    }));

    const systemInstruction = `
You are FoodFlow AI, an ultra-smart, helpful, friendly Food Recommendation and Support Assistant for the FoodFlow platform.

PLATFORM INFORMATION:
- Platform: FoodFlow (Leading online food delivery platform in Bangladesh).
- Delivery: Base delivery fee is ৳40. Fast delivery within 25-40 minutes.
- Payment Methods: Stripe (Cards), Cash on Delivery (COD), Mobile Banking.
- Roles:
  * Customer: Order delicious food, live order tracking, reviews.
  * Restaurant: Register/Login, manage menu items, accept & prepare incoming orders, check payouts.
  * Rider: Accept delivery trips, navigate to customer, verify OTP, earn commissions.
  * Admin: Platform management, approve restaurants/riders, system settings.
- Active Coupons: ${JSON.stringify(activeCoupons)}

CORE GUIDELINES:
1. 🌟 COMPREHENSIVE SUPPORT:
   - Answer ANY question about FoodFlow, dishes, recommendations, orders, prices, delivery, restaurant joining, rider joining, coupons, etc. accurately.
   - Reply in natural, friendly Bengali (বাংলা) by default. If the user writes in English, reply in English.
   - Keep answers clear, courteous, and helpful (typically 2 to 4 concise sentences).

2. 🍔 SMART FOOD RECOMMENDATIONS:
   - When user asks for food suggestions or specifies budget/taste (e.g. "আমার বাজেট ৫০০ টাকা, ঝাল খাবার চাই, ২ জনের জন্য"):
     * Select 2-3 best matching dishes from LIVE FOODS below.
     * If user asks for spicy (ঝাল), prioritize dishes with isSpicy: true or spicy category (Pizza, Burger, Biryani).
     * If user asks for 2 people, calculate package total (e.g., 2 burgers or 1 pizza + side) + ৳40 delivery fee within budget.
     * ALWAYS append the recommended foods JSON block at the very end so that UI cards with "Add to Cart" and "Buy Now" are rendered.

3. 🛒 CART & ORDER STATUS:
   - If user asks about their cart, report the live cart items, subtotal, ৳40 delivery charge, and grand total.
   - If user asks about their order, report the status, rider details, and ETA.

4. 📦 STRUCTURED JSON BLOCKS (Only append at the END when recommending foods or showing status):
\`\`\`food_recommendations
[
  {
    "id": "<id_from_live_foods>",
    "restaurantId": "<restaurantId>",
    "name": "<name>",
    "price": <price>,
    "discountPrice": <discountPrice_or_null>,
    "restaurantName": "<restaurantName>",
    "image": "<image_url>",
    "rating": 4.8,
    "isSpicy": <true/false>,
    "isVegetarian": <true/false>
  }
]
\`\`\`

\`\`\`action_buttons
[{"type":"CHECKOUT","label":"চেকআউট করুন"}]
\`\`\`

LIVE FOODS: ${JSON.stringify(liveFoods)}
RESTAURANTS: ${JSON.stringify(liveRestaurants)}
USER CART: ${JSON.stringify(userCart)}
USER ORDERS: ${JSON.stringify(userOrders)}
`;

    // Trim history to prevent token blowout
    const trimmedHistory = chatHistory.slice(-4).map((m: any) => ({
      role: m.role === "assistant" || m.role === "model" ? "model" : "user",
      parts: [{ text: m.content || m.text || m.message || "" }],
    }));

    const contents = [...trimmedHistory, { role: "user", parts: [{ text: message.trim() }] }];

    const geminiPayload = {
      contents,
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 800,
      },
    };

    let reply: string;
    try {
      reply = await callGeminiRestWithFailover(geminiPayload);
    } catch (llmErr) {
      console.warn("[Next AI Chat] Gemini API failed, using intelligent local fallback:", llmErr);
      reply = generateLocalFallbackResponse(message, liveFoods, userOrders, userCart, activeCoupons);
    }

    return NextResponse.json({
      success: true,
      reply,
    });
  } catch (error: any) {
    console.error("[Next AI Chat Route] Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || "Internal server error" 
      },
      { status: 500 }
    );
  }
}

