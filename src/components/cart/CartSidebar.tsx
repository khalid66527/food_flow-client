"use client";

import React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  X,
  Minus,
  Plus,
  Trash2,
  ShoppingCart,
  ArrowRight,
  Lock,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useSession } from "@/lib/auth-client";

export default function CartSidebar() {
  const {
    items,
    changeQuantity,
    removeItem,
    clearCart,
    totalItems,
    totalPrice,
    isLoading,
    cartError,
    isDrawerOpen,
    closeCartDrawer,
  } = useCart();
  const { data: session } = useSession();
  const user = session?.user;

  const handleCheckout = () => {
    closeCartDrawer();
  };

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-xs"
            onClick={closeCartDrawer}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-[60] w-[380px] max-w-[92vw] bg-white shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-[#FF6B35]" />
                <h2 className="text-base font-bold text-gray-900">
                  Your Cart
                  {totalItems > 0 && (
                    <span className="ml-2 text-xs font-semibold text-gray-400">
                      ({totalItems} item{totalItems > 1 ? "s" : ""})
                    </span>
                  )}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeCartDrawer}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Close cart"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner */}
            {cartError && (
              <div className="mx-5 mt-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                {cartError}
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {isLoading ? (
                <LoadingSpinner size={50} minHeight="200px" />
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
                    <ShoppingCart className="w-7 h-7 text-orange-400" />
                  </div>
                  <p className="text-base font-semibold text-gray-800">
                    Your cart is empty
                  </p>
                  <p className="text-sm text-gray-500 mt-1 mb-5">
                    Explore restaurants and add some tasty food!
                  </p>
                  <Link
                    href="/restaurants"
                    onClick={closeCartDrawer}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FF6B35] text-white text-sm font-semibold shadow-md shadow-[#FF6B35]/20 hover:bg-[#e85b27] transition"
                  >
                    Browse Restaurants
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.foodItem._id}
                      className="flex gap-3 p-3 rounded-2xl border border-gray-100 shadow-sm"
                    >
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
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
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {item.foodItem.name}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {item.foodItem.restaurantName || "Food Flow"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.foodItem._id)}
                            className="p-1 text-gray-300 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                            aria-label={`Remove ${item.foodItem.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-1 border border-gray-200 rounded-full px-1 py-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                changeQuantity(item.foodItem._id, -1)
                              }
                              className="p-1 rounded-full text-gray-600 hover:text-[#FF6B35] hover:bg-orange-50 transition-colors cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center text-xs font-bold text-gray-900">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                changeQuantity(item.foodItem._id, 1)
                              }
                              className="p-1 rounded-full text-gray-600 hover:text-[#FF6B35] hover:bg-orange-50 transition-colors cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <p className="text-sm font-bold text-gray-900">
                            $
                            {(
                              (item.foodItem.discountPrice ||
                                item.foodItem.price) * item.quantity
                            ).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={clearCart}
                    className="w-full text-center text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors py-1 cursor-pointer"
                  >
                    Clear Cart
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="px-5 py-4 border-t border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Subtotal</span>
                  <span className="text-lg font-extrabold text-gray-900">
                    ${totalPrice.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  Delivery fee calculated at checkout.
                </p>
                <Link
                  href={user ? "/dashboard/customer/checkout" : "/auth/login"}
                  onClick={handleCheckout}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-[#FF6B35] text-white text-sm font-bold shadow-lg shadow-[#FF6B35]/25 hover:bg-[#e85b27] transition"
                >
                  {user ? (
                    <>
                      Proceed to Checkout
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
                  href="/dashboard/customer/cart"
                  onClick={handleCheckout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition"
                >
                  View Full Cart
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
