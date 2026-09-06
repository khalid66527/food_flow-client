'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X, ShoppingBag } from 'lucide-react';

interface CartConflictModalProps {
  isOpen: boolean;
  existingRestaurantName: string;
  newRestaurantName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CartConflictModal({
  isOpen,
  existingRestaurantName,
  newRestaurantName,
  onConfirm,
  onCancel,
}: CartConflictModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 z-10 space-y-6"
          >
            {/* Close Button */}
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon Header */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0 shadow-xs">
                <AlertTriangle className="w-7 h-7 text-amber-500" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase tracking-wider">
                  <ShoppingBag className="w-3 h-3" /> Single Restaurant Cart Policy
                </span>
                <h3 className="text-xl font-extrabold text-gray-900 mt-1 leading-tight">
                  Replace items in cart?
                </h3>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3 text-sm text-gray-600 leading-relaxed bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
              <p>
                Your cart currently contains items from{' '}
                <strong className="text-gray-900 font-bold">{existingRestaurantName}</strong>.
              </p>
              <p>
                Would you like to clear your cart and start a new order from{' '}
                <strong className="text-[#FF6B35] font-extrabold">{newRestaurantName}</strong>?
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="w-full sm:flex-1 py-3 px-4 rounded-2xl text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition cursor-pointer"
              >
                Keep Existing Cart
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="w-full sm:flex-1 py-3 px-4 rounded-2xl text-xs font-bold bg-gradient-to-r from-[#FF6B35] to-amber-500 hover:brightness-105 text-white shadow-md shadow-[#FF6B35]/25 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Clear & Add Item
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
