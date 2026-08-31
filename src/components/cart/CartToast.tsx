'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { CartToastData } from '@/contexts/CartContext';

interface CartToastProps {
  toast: CartToastData | null;
}

/**
 * Lightweight, dependency-free success notification used by the cart
 * provider for item removal / clear-cart confirmations.
 */
export function CartToast({ toast }: CartToastProps) {
  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100]"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2.5 rounded-full bg-white shadow-lg border border-gray-200 px-5 py-3">
            <CheckCircle2 className="w-5 h-5 text-[#FF6B35] shrink-0" />
            <span className="text-sm font-medium text-gray-800">{toast.message}</span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
