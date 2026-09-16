import { NextResponse } from "next/server";
import { 
  getFoodCollection, 
  getOrdersCollection, 
  getSuccessOrdersCollection, 
  getRestaurantCollection, 
  getCouponsCollection,
  getCartCollection,
} from "@/lib/db";
import { ObjectId } from "mongodb";

let workingKeyIndex = 0;
let cachedWorkingModel = "gemini-3.1-flash-lite";

async function callGeminiRestWithFailover(payload: any) {
  const envKeys = process.env.GEMINI_API_KEYS
    ? process.env.GEMINI_API_KEYS.split(",").map((k) => k.trim()).filter(Boolean)
    : [];
  const singleKey = process.env.GEMINI_API_KEY?.trim();

  const keyPool = Array.from(new Set([...envKeys, ...(singleKey ? [singleKey] : [])]));
  const models = [
    cachedWorkingModel,
    "gemini-3.1-flash-lite",
    "gemini-3.1-flash-lite-preview",
    "gemini-3.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-2.5-flash",
  ].filter((v, i, a) => a.indexOf(v) === i);

  const totalKeys = keyPool.length;
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

    const promises: Promise<any>[] = [];

    // 1. Fetch available food items
    promises.push(
      (async () => {
        try {
          const foodCol = await getFoodCollection();
          const rawFoods = await foodCol
            .find(
              { $or: [{ status: "available" }, { isAvailable: true }, { isAvailable: "true" }] },
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
            .limit(12)
            .toArray();

          liveFoods = rawFoods.map((f: any) => ({
            id: f._id?.toString(),
            restaurantId: f.restaurantId?.toString() || "",
            name: f.name,
            category: f.category || "Main",
            price: Number(f.price) || 0,
            discountPrice: f.discountPrice ? Number(f.discountPrice) : undefined,
            image: sanitizeImageUrl(f.image),
            isSpicy: Boolean(f.isSpicy),
            isVegetarian: Boolean(f.isVegetarian),
            restaurantName: f.restaurantName || "FoodFlow Express",
            rating: f.rating ? Number(f.rating) : 4.8,
          }));
        } catch (e) {
          console.error("AI liveFoods fetch error:", e);
        }
      })()
    );

    // 2. Fetch restaurants list
    promises.push(
      (async () => {
        try {
          const restCol = await getRestaurantCollection();
          const rawRest = await restCol
            .find(
              { status: { $ne: "blocked" } },
              { projection: { name: 1, cuisine: 1, rating: 1, deliveryTime: 1 } }
            )
            .limit(5)
            .toArray();

          liveRestaurants = rawRest.map((r: any) => ({
            id: r._id?.toString(),
            name: r.name,
            cuisine: r.cuisine || "Multi-Cuisine",
            rating: r.rating || 4.7,
            deliveryTime: r.deliveryTime || "25-35 mins",
          }));
        } catch (e) {
          console.error("AI liveRestaurants fetch error:", e);
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
            .limit(3)
            .toArray();

          activeCoupons = rawCoupons.map((c: any) => ({
            code: c.code,
            discount: c.discountPercentage ? `${c.discountPercentage}% OFF` : `৳${c.discountAmount} OFF`,
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

    // First check cartItems from client body
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

    const systemInstruction = `
You are FoodFlow AI, an ultra-fast, helpful, and CONCISE food assistant for FoodFlow.

CORE INSTRUCTIONS:
1. 🎯 SHORT & DIRECT ANSWERS:
   - Always reply in SHORT, clear, friendly Bengali (বাংলা).
   - Maximum 2 to 4 sentences. NEVER write long walls of text or long calculation lists.
   - If user asks for food suggestions, recommend at most 2-3 best matching dishes.
   - If nothing is found or information is unavailable, politely and concisely say so in 1 sentence.

2. 🛒 USER CART INQUIRIES:
   - When the user asks about their cart (e.g. "আমার কার্টে কি কিছু আছে?", "আমার কার্ট দেখাও", "cart summary"):
     * IF USER CART has items (totalItems > 0): List the food items with quantity, the subtotal, delivery fee (৳40), and grand total clearly in 2 friendly Bengali sentences (e.g. "আপনার কার্টে ৩টি আইটেম রয়েছে: ... মোট ৳XYZ (ডেলিভারিসহ)। আপনি চাইলে এখনই সরাসরি চেকআউট করতে পারেন!").
     * IF USER CART is empty (totalItems = 0): Tell them politely that their cart is currently empty and suggest adding some tasty dishes from our menu.

3. 💰 BUDGET & MOOD:
   - When user provides a budget (e.g. ৳200, ৳500), pick 2-3 delicious dishes from LIVE FOODS within that budget.
   - Mention total price simply: "খাবার মূল্য + ৳৪০ ডেলিভারি চার্জ = মোট ৳XYZ"।

4. 📦 TRACKING & SUPPORT:
   - For order status, give exact status, rider info, and ETA in 2 lines.

5. 🚫 NO RAW JSON / BASE64 IN TEXT:
   - NEVER write raw JSON code or base64 images inside your conversational sentences.
   - To render interactive UI cards, append the JSON code block strictly at the VERY END:
\`\`\`food_recommendations
[
  {
    "id": "<id>",
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

USER CART: ${JSON.stringify(userCart)}
LIVE FOODS: ${JSON.stringify(liveFoods)}
RESTAURANTS: ${JSON.stringify(liveRestaurants)}
USER ORDERS: ${JSON.stringify(userOrders)}
ACTIVE COUPONS: ${JSON.stringify(activeCoupons)}
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
        maxOutputTokens: 600,
      },
    };

    const reply = await callGeminiRestWithFailover(geminiPayload);

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
