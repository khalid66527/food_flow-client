"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/lib/api/LoadingSpinner";
import {
  MapPin,
  CreditCard,
  Banknote,
  ShieldCheck,
  Truck,
  Loader2,
  ArrowRight,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Home,
  Briefcase,
  User,
  Phone,
  Building2,
  ShoppingBag,
  Sparkles,
  ChevronLeft,
  Zap,
  Tag,
  Percent,
  Receipt,
  X,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useCart } from "@/contexts/CartContext";
import { TAddress } from "@/types/address";
import { getAddresses } from "@/lib/api/address";
import { createOrderApi } from "@/lib/api/order";
import { getPlatformSettings } from "@/lib/api/settings";
import { applyCouponApi } from "@/lib/api/coupon";
import AddressQuickSwitcherModal from "./AddressQuickSwitcherModal";

const DELIVERY_FEE = 40;
const FREE_DELIVERY_THRESHOLD = 500;

export default function CustomerCheckout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending: sessionPending } = useSession();
  const { items: cartItems, totalPrice: cartTotalPrice, clearCart } = useCart();

  const isBuyNowParam = searchParams.get("buyNow") === "true";
  const [buyNowItem, setBuyNowItem] = useState<{ foodItem: any; quantity: number } | null>(null);

  // Read Buy Now item from sessionStorage if buyNow query param is present
  useEffect(() => {
    if (isBuyNowParam && typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("foodflow_buy_now_item");
        if (stored) {
          setBuyNowItem(JSON.parse(stored));
        }
      } catch (e) {
        console.warn("Failed to load Buy Now item:", e);
      }
    }
  }, [isBuyNowParam]);

  const isBuyNowMode = isBuyNowParam && Boolean(buyNowItem);
  const activeItems = isBuyNowMode && buyNowItem ? [buyNowItem] : (cartItems || []);
  const items = activeItems;

  const activeSubtotal = isBuyNowMode && buyNowItem
    ? (buyNowItem.foodItem.discountPrice || buyNowItem.foodItem.price) * buyNowItem.quantity
    : cartTotalPrice;

  const sessionUser = session?.user as
    | { id?: string; email?: string; name?: string; role?: string }
    | null
    | undefined;

  const userId = sessionUser?.id || "";
  const userEmail = sessionUser?.email || "";
  const userName = sessionUser?.name || "Customer";

  // Address Guard State
  const [addresses, setAddresses] = useState<TAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<TAddress | null>(null);
  const [isCheckingAddress, setIsCheckingAddress] = useState<boolean>(true);

  // Quick Switcher Modal State
  const [isSwitcherOpen, setIsSwitcherOpen] = useState<boolean>(false);

  // Payment Selection & Submission State
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "STRIPE">("COD");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);



  // Platform Settings State
  const [vatPercentage, setVatPercentage] = useState<number>(5);
  const [deliveryFeeBase, setDeliveryFeeBase] = useState<number>(40);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number>(500);

  // Coupon Engine State
  const [couponInput, setCouponInput] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    isFirstOrderOnly?: boolean;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState<boolean>(false);
  const [couponMessage, setCouponMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch Platform Settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await getPlatformSettings();
        if (res.success && res.data) {
          setVatPercentage(res.data.vatPercentage);
          setDeliveryFeeBase(res.data.deliveryFeeBase);
          setFreeDeliveryThreshold(res.data.freeDeliveryThreshold);
        }
      } catch (err) {
        console.warn("Failed to load platform settings:", err);
      }
    };
    loadSettings();
  }, []);

  // Calculate Delivery Fee, VAT & Grand Total based on active settings & coupon
  const vatAmount = Math.round(activeSubtotal * (vatPercentage / 100) * 100) / 100;
  const deliveryFee =
    activeSubtotal === 0 || activeSubtotal >= freeDeliveryThreshold ? 0 : deliveryFeeBase;
  const couponDiscount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const grandTotal = Math.max(0, activeSubtotal + vatAmount + deliveryFee - couponDiscount);

  // Handle Apply Coupon
  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) {
      setCouponMessage({ type: "error", text: "Please enter a coupon code." });
      return;
    }

    setCouponLoading(true);
    setCouponMessage(null);

    const res = await applyCouponApi(couponInput, userId, activeSubtotal);
    setCouponLoading(false);

    if (res.success && res.code && res.discountAmount !== undefined) {
      setAppliedCoupon({
        code: res.code,
        discountAmount: res.discountAmount,
        isFirstOrderOnly: res.isFirstOrderOnly,
      });
      setCouponMessage({ type: "success", text: res.message });
    } else {
      setCouponMessage({ type: "error", text: res.message || "Invalid coupon code." });
    }
  };

  // Remove Coupon
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponMessage(null);
  };

  // 1. Address Validation Guard Execution
  const fetchAndValidateAddress = useCallback(async () => {
    if (!userId) {
      setIsCheckingAddress(false);
      return;
    }

    setIsCheckingAddress(true);
    setErrorMessage(null);

    const res = await getAddresses(userId, userEmail);

    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      const fetchedAddresses = res.data as TAddress[];
      setAddresses(fetchedAddresses);

      // Look for address with isDefault: true
      const defaultAddr = fetchedAddresses.find((addr) => addr.isDefault === true);

      if (defaultAddr) {
        setSelectedAddress(defaultAddr);
        setIsCheckingAddress(false);
      } else {
        // Requirement 1 Guard: If no default address is set (isDefault: true), redirect directly to /dashboard/address
        console.warn("No default address found. Redirecting to /dashboard/address");
        router.push("/dashboard/address");
      }
    } else {
      // No address records at all -> Redirect directly to /dashboard/address
      console.warn("No addresses found. Redirecting to /dashboard/address");
      router.push("/dashboard/address");
    }
  }, [userId, userEmail, router]);

  useEffect(() => {
    if (!sessionPending && userId) {
      fetchAndValidateAddress();
    } else if (!sessionPending && !userId) {
      setIsCheckingAddress(false);
    }
  }, [sessionPending, userId, fetchAndValidateAddress]);

  // Handle Order Placement
  const handlePlaceOrder = async () => {
    if (!userId || !userEmail) {
      router.push("/auth/login");
      return;
    }

    if (!selectedAddress) {
      setErrorMessage("Please select a valid delivery address before proceeding.");
      return;
    }

    if (activeItems.length === 0) {
      setErrorMessage("No items selected for checkout.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    // Format order payload
    const orderPayload = {
      items: activeItems.map((item) => ({
        foodId: item.foodItem._id,
        name: item.foodItem.name,
        price: item.foodItem.price,
        discountPrice: item.foodItem.discountPrice,
        quantity: item.quantity,
        image: item.foodItem.image,
        restaurantId: item.foodItem.restaurantId,
        restaurantName: item.foodItem.restaurantName,
      })),
      deliveryAddress: selectedAddress,
      paymentMethod,
      subtotal: activeSubtotal,
      vatPercentage,
      vatAmount,
      deliveryFee,
      couponCode: appliedCoupon?.code || null,
      discount: couponDiscount,
      totalAmount: grandTotal,
    };

    const res = await createOrderApi(userId, userEmail, orderPayload as any);

    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.message || "Failed to process order. Please try again.");
      return;
    }

    // Clean up single Buy Now payload or clear global cart
    if (isBuyNowMode) {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("foodflow_buy_now_item");
      }
    } else {
      clearCart();
    }

    // COD Flow: Redirect to Order Success page
    if (paymentMethod === "COD") {
      const targetUrl = `/dashboard/customer/order-success?orderId=${res.orderId}`;
      router.push(targetUrl);
      return;
    }

    // Stripe Flow: Redirect browser directly to Stripe Checkout URL
    const stripeTargetUrl = (res as any).url || res.checkoutUrl;
    if (paymentMethod === "STRIPE" && stripeTargetUrl) {
      window.location.href = stripeTargetUrl;
      return;
    }
  };


  // Helper to extract clean address details
  const getCleanAddressDetails = (addr: TAddress) => {
    let category: "Home" | "Work" | "Other" = "Home";
    let buildingClean = addr.building || "";
    const match = buildingClean.match(/^\[(Home|Work|Other)\]\s*(.*)/i);
    if (match) {
      const tag = match[1].toUpperCase();
      if (tag === "HOME") category = "Home";
      else if (tag === "WORK") category = "Work";
      else category = "Other";
      buildingClean = match[2];
    }
    return { category, buildingClean };
  };

  if (isCheckingAddress || sessionPending) {
    return <LoadingSpinner size={50} minHeight="60vh" />;
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-4 text-[#FF6B35]">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900">Your Cart is Empty</h2>
        <p className="text-sm text-gray-500 mt-1 mb-6">
          Add delicious meals to your cart before proceeding to checkout.
        </p>
        <Link
          href="/restaurants"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#FF6B35] text-white text-sm font-bold shadow-md hover:bg-[#e85b27] transition"
        >
          <ChevronLeft className="w-4 h-4" /> Browse Restaurants
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="mb-8 bg-gradient-to-r from-[#FF6B35] via-[#FF7843] to-[#FF8C42] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-xs font-bold uppercase tracking-wider mb-2.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> Secure Checkout
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Checkout & Payment
            </h1>
            <p className="text-orange-100 text-sm mt-1">
              Review delivery address and select payment method to complete your order.
            </p>
          </div>
          <Link
            href="/dashboard/customer/cart"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition backdrop-blur-md border border-white/25 shrink-0"
          >
            <ChevronLeft className="w-4 h-4" /> Edit Cart
          </Link>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left 2 Columns: Address Guard & Payment Method Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Address Guard Card */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#FF6B35] flex items-center justify-center font-bold">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-gray-900">Delivery Address</h2>
                  <p className="text-xs text-gray-400">Order will be delivered to this location</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSwitcherOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 hover:bg-orange-100 text-[#FF6B35] text-xs font-bold transition border border-orange-200/80 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Change Address</span>
              </button>
            </div>

            {selectedAddress ? (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-50/40 to-amber-50/30 border border-orange-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-700 text-[10px] font-bold uppercase tracking-wider">
                      {getCleanAddressDetails(selectedAddress).category === "Home" && <Home className="w-3 h-3 text-[#FF6B35]" />}
                      {getCleanAddressDetails(selectedAddress).category === "Work" && <Briefcase className="w-3 h-3 text-blue-500" />}
                      {getCleanAddressDetails(selectedAddress).category === "Other" && <MapPin className="w-3 h-3 text-purple-500" />}
                      {getCleanAddressDetails(selectedAddress).category}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      ✓ Default Address
                    </span>
                  </div>

                  <p className="text-sm font-bold text-gray-900">
                    {selectedAddress.streetAddress}
                    {selectedAddress.building && `, ${getCleanAddressDetails(selectedAddress).buildingClean}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedAddress.area}
                    {selectedAddress.postalCode && ` - ${selectedAddress.postalCode}`}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-gray-600 pt-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      {selectedAddress.fullName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      {selectedAddress.phoneNumber}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center">
                  <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Payment Method Selection Card */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#FF6B35] flex items-center justify-center font-bold">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-gray-900">Select Payment Method</h2>
                <p className="text-xs text-gray-400">Choose how you wish to pay for this order</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">

              {/* COD Method Option Card */}
              <div
                onClick={() => setPaymentMethod("COD")}

                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${paymentMethod === "COD"
                    ? "border-[#FF6B35] bg-orange-50/40 ring-2 ring-[#FF6B35]/20 shadow-md"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
              >

                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 font-bold">
                    <Banknote className="w-6 h-6" />
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${paymentMethod === "COD"
                        ? "border-[#FF6B35] bg-[#FF6B35] text-white"
                        : "border-gray-300"
                      }`}
                  >
                    {paymentMethod === "COD" && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                </div>

                <h3 className="text-sm font-extrabold text-gray-900">Cash on Delivery (COD)</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Pay cash directly to the delivery rider upon receiving your package.
                </p>
                <span className="inline-block mt-3 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">
                  Pay Upon Parcel Arrival
                </span>
              </div>

              {/* Stripe Online Payment Method Option Card */}
              <div
                onClick={() => setPaymentMethod("STRIPE")}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${paymentMethod === "STRIPE"
                    ? "border-[#FF6B35] bg-orange-50/40 ring-2 ring-[#FF6B35]/20 shadow-md"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3 font-bold">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${paymentMethod === "STRIPE"
                        ? "border-[#FF6B35] bg-[#FF6B35] text-white"
                        : "border-gray-300"
                      }`}
                  >
                    {paymentMethod === "STRIPE" && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                </div>

                <h3 className="text-sm font-extrabold text-gray-900">Stripe Online Payment</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Instant secure online checkout via Credit/Debit Card (Visa, Mastercard).
                </p>
                <span className="inline-block mt-3 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[10px] font-extrabold border border-blue-200">
                  Instant Confirmation & Invoice
                </span>
              </div>
            </div>
          </div>
        </div>


        {/* Right Column: Order Summary & Place Order Action */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-base font-extrabold text-gray-900">
                Order Items ({activeItems.length})
              </h2>
              {isBuyNowMode && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black border border-amber-200">
                  <Zap className="w-3 h-3 fill-amber-500 text-amber-500" /> Fast Buy Now
                </span>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto space-y-3 pr-1 divide-y divide-gray-100 scrollbar-thin">
              {activeItems.map((item) => {
                const unitPrice = item.foodItem.discountPrice || item.foodItem.price;
                const lineTotal = unitPrice * item.quantity;
                return (
                  <div key={item.foodItem._id} className="pt-3 first:pt-0 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                      {item.foodItem.image ? (
                        <img
                          src={item.foodItem.image}
                          alt={item.foodItem.name}
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {item.foodItem.name}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Qty: {item.quantity} x Tk {unitPrice.toFixed(2)}
                      </p>
                    </div>
                    <span className="text-xs font-extrabold text-gray-900 shrink-0">
                      Tk {lineTotal.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 🎟️ COUPON & PROMO CODE INPUT WIDGET */}
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#FF6B35]" />
                  Promo / Coupon Code
                </span>
                {appliedCoupon && (
                  <span className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Applied
                  </span>
                )}
              </label>

              {appliedCoupon ? (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div>
                    <span className="font-black text-xs text-emerald-900 tracking-wider">
                      {appliedCoupon.code}
                    </span>
                    <p className="text-[10px] text-emerald-700 font-semibold">
                      Discount Saved: ৳ {appliedCoupon.discountAmount.toFixed(2)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                    title="Remove Coupon"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="e.g. WELCOME50"
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-xs font-bold uppercase transition"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponInput.trim()}
                    className="px-4 py-2 rounded-xl bg-[#FF6B35] text-white text-xs font-extrabold shadow-sm hover:bg-[#e85b27] transition disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                  </button>
                </div>
              )}

              {couponMessage && (
                <p
                  className={`text-[11px] font-semibold flex items-center gap-1 mt-1 ${
                    couponMessage.type === "success" ? "text-emerald-700" : "text-rose-600"
                  }`}
                >
                  {couponMessage.type === "success" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{couponMessage.text}</span>
                </p>
              )}
            </div>

            {/* Financial Summary Breakdown */}
            <div className="pt-3 border-t border-gray-100 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-gray-600">
                <span>Subtotal (Food Price)</span>
                <span className="font-bold text-gray-900">Tk {activeSubtotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-gray-600">
                <span>VAT ({vatPercentage}%)</span>
                <span className="font-bold text-gray-900">+Tk {vatAmount.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-gray-600">
                <span>Delivery Fee</span>
                <span className="font-bold text-gray-900">
                  {deliveryFee === 0 ? (
                    <span className="text-emerald-600 font-extrabold">FREE</span>
                  ) : (
                    `+Tk ${deliveryFee.toFixed(2)}`
                  )}
                </span>
              </div>

              {couponDiscount > 0 && (
                <div className="flex items-center justify-between text-emerald-600 font-extrabold">
                  <span>Coupon Discount ({appliedCoupon?.code})</span>
                  <span>-Tk {couponDiscount.toFixed(2)}</span>
                </div>
              )}

              {deliveryFee > 0 && (
                <div className="p-2.5 rounded-xl bg-orange-50 text-[11px] text-orange-700 flex items-center gap-1.5 font-medium border border-orange-100">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#FF6B35]" />
                  Add Tk {(freeDeliveryThreshold - activeSubtotal).toFixed(2)} more for free delivery!
                </div>
              )}

              <div className="pt-3 border-t border-gray-200 flex items-center justify-between text-sm">
                <span className="font-extrabold text-gray-900">Grand Total</span>
                <span className="text-xl font-black text-[#FF6B35]">
                  Tk {grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Submit Order Action Button */}
            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={isSubmitting || !selectedAddress}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-amber-500 text-white text-sm font-extrabold shadow-lg shadow-orange-500/25 hover:brightness-105 active:scale-98 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-4"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {paymentMethod === "STRIPE" ? "Redirecting to Stripe..." : "Placing Order..."}
                </>
              ) : paymentMethod === "STRIPE" ? (
                <>
                  Proceed to Stripe Payment
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Confirm & Place Order (COD)
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Switcher Modal */}
      <AddressQuickSwitcherModal
        isOpen={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
        addresses={addresses}
        selectedAddressId={selectedAddress ? String(selectedAddress._id || selectedAddress.id) : null}
        onSelectAddress={(addr) => setSelectedAddress(addr)}
        userId={userId}
        userEmail={userEmail}
        onRefreshAddresses={fetchAndValidateAddress}
      />
    </div>
  );
}
