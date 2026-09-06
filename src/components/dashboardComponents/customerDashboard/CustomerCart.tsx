"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingCart,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Lock,
  Sparkles,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useSession } from "@/lib/auth-client";

const DELIVERY_FEE = 40;
const FREE_DELIVERY_THRESHOLD = 500;
const ITEMS_PER_PAGE = 6;

export default function CustomerCart() {
  const {
    items,
    changeQuantity,
    removeItem,
    clearCart,
    totalItems,
    totalPrice,
    isLoading,
    cartError,
  } = useCart();
  const { data: session } = useSession();
  const user = session?.user;

  const deliveryFee =
    totalPrice === 0 || totalPrice >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const estimatedTotal = totalPrice + deliveryFee;

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        const aTime = a.addedAt ? new Date(a.addedAt).getTime() : 0;
        const bTime = b.addedAt ? new Date(b.addedAt).getTime() : 0;
        return bTime - aTime;
      }),
    [items]
  );

  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const visibleItems = sortedItems.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="mb-8 bg-gradient-to-r from-[#FF6B35] via-[#FF7843] to-[#FF8C42] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-xs font-bold uppercase tracking-wider mb-2.5">
              <ShoppingCart className="w-3.5 h-3.5 text-white" /> Food Flow Cart
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Your Shopping Cart
            </h1>
            <p className="text-orange-100 text-sm mt-1">
              Review your selected food items, adjust quantities, and proceed seamlessly to checkout.
            </p>
          </div>
          {items.length > 0 && (
            <div className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-md border border-white/25 shrink-0">
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>{totalItems} {totalItems === 1 ? "Item" : "Items"} Selected</span>
            </div>
          )}
        </div>
      </div>

      {cartError && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {cartError}
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <LoadingSpinner size={50} minHeight="300px" />
      ) : items.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mb-5">
            <ShoppingCart className="w-9 h-9 text-orange-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Your cart is empty</h2>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            Looks like you haven&apos;t added anything yet.
          </p>
          <Link
            href="/restaurants"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#FF6B35] text-white text-sm font-semibold shadow-md shadow-[#FF6B35]/20 hover:bg-[#e85b27] transition"
          >
            Browse Restaurants
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items list */}
          <div className="lg:col-span-2 space-y-4">
            {visibleItems.map((item) => {
              const unitPrice = item.foodItem.discountPrice || item.foodItem.price;
              const lineTotal = unitPrice * item.quantity;
              return (
                <div
                  key={item.foodItem._id}
                  className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm"
                >
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                    {item.foodItem.image ? (
                      <img
                        src={item.foodItem.image}
                        alt={item.foodItem.name}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-gray-900 truncate">
                          {item.foodItem.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {item.foodItem.restaurantName || "Food Flow"}
                        </p>
                        <p className="text-sm text-gray-600 mt-1 font-medium">
                          Tk {unitPrice.toFixed(2)}
                          {item.foodItem.discountPrice &&
                            item.foodItem.discountPrice < item.foodItem.price && (
                              <span className="ml-2 line-through text-gray-400 font-normal">
                                Tk {item.foodItem.price.toFixed(2)}
                              </span>
                            )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.foodItem._id)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        aria-label={`Remove ${item.foodItem.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1 border border-gray-200 rounded-full px-1.5 py-1">
                        <button
                          type="button"
                          onClick={() =>
                            changeQuantity(item.foodItem._id, -1)
                          }
                          className="p-1.5 rounded-full text-gray-600 hover:text-[#FF6B35] hover:bg-orange-50 transition-colors cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            changeQuantity(item.foodItem._id, 1)
                          }
                          className="p-1.5 rounded-full text-gray-600 hover:text-[#FF6B35] hover:bg-orange-50 transition-colors cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-base font-bold text-gray-900">
                        Tk {lineTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={clearCart}
              className="text-sm font-semibold text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
            >
              Clear Cart
            </button>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="p-2 rounded-full border border-gray-200 text-gray-600 hover:text-[#FF6B35] hover:border-[#FF6B35]/40 hover:bg-orange-50 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-4 py-1.5 text-sm font-semibold text-gray-700">
                  Page {safePage} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="p-2 rounded-full border border-gray-200 text-gray-600 hover:text-[#FF6B35] hover:border-[#FF6B35]/40 hover:bg-orange-50 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Order summary */}
          <div className="h-fit space-y-4 lg:sticky lg:top-24">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Order Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">
                    Subtotal ({totalItems} item{totalItems > 1 ? "s" : ""})
                  </span>
                  <span className="font-semibold text-gray-900">
                    Tk {totalPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Delivery Fee</span>
                  <span className="font-semibold text-gray-900">
                    {deliveryFee === 0 ? (
                      <span className="text-emerald-600">FREE</span>
                    ) : (
                      `Tk ${deliveryFee.toFixed(2)}`
                    )}
                  </span>
                </div>

                {deliveryFee > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-50 border border-orange-100 text-xs text-orange-600">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    Add Tk {(FREE_DELIVERY_THRESHOLD - totalPrice).toFixed(2)} more for free
                    delivery!
                  </div>
                )}

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-base font-bold text-gray-900">
                    Estimated Total
                  </span>
                  <span className="text-xl font-extrabold text-gray-900">
                    Tk {estimatedTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <Link
              href={user ? "/dashboard/customer/checkout" : "/auth/login"}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-[#FF6B35] text-white text-sm font-bold shadow-lg shadow-[#FF6B35]/25 hover:bg-[#e85b27] transition"
            >
              {user ? (
                <>
                  Proceed to Payment
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Login to Checkout
                </>
              )}
            </Link>

            <Link
              href="/restaurants"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-full border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
