'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { IGlobalFoodItem } from '@/types/restaurant';
import { TCartItem } from '@/types/cart';
import { useSession } from '@/lib/auth-client';
import { getUserCart } from '@/lib/api/cart';
import {
  addToCartAction,
  updateCartQuantityAction,
  removeCartItemAction,
  clearCartAction,
} from '@/lib/actions/cart';
import { CartToast } from '@/components/cart/CartToast';
import { CartConflictModal } from '@/components/cart/CartConflictModal';

export interface CartItem {
  foodItem: IGlobalFoodItem;
  quantity: number;
  addedAt?: number | string;
}

export interface CartToastData {
  id: number;
  message: string;
  variant?: 'success' | 'info';
}

interface CartContextType {
  items: CartItem[];
  addItem: (foodItem: IGlobalFoodItem, quantity?: number) => void;
  removeItem: (foodId: string) => void;
  /** Adjust an item's quantity by a delta (+1 / -1) with optimistic + debounced sync. */
  changeQuantity: (foodId: string, delta: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isLoading: boolean;
  cartError: string | null;
  canAddToCart: boolean;
  isDrawerOpen: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/**
 * Convert the frontend food item model into the backend cart item payload.
 */
function toCartPayload(foodItem: IGlobalFoodItem, quantity: number): Partial<TCartItem> {
  return {
    foodId: foodItem._id,
    restaurantId: foodItem.restaurantId,
    name: foodItem.name,
    price: foodItem.price,
    discountPrice: foodItem.discountPrice,
    image: foodItem.image,
    restaurantName: foodItem.restaurantName,
    quantity,
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending: sessionPending } = useSession();

  // `role` is a Better Auth additional field not present on the base user type.
  const sessionUser = session?.user as
    | { id?: string; email?: string; role?: string }
    | null
    | undefined;

  const userId = sessionUser?.id || '';
  const userEmail = sessionUser?.email || '';
  const userRole = sessionUser?.role || '';

  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<CartToastData | null>(null);

  /**
   * Per-item accumulated delta from rapid +/- clicks, plus a per-item debounce
   * timer. Rapid clicks are folded into `pendingDeltasRef` and flushed as a
   * single atomic PATCH after the user pauses, so every click is counted with
   * no dropped/in-flight request races.
   */
  const pendingDeltasRef = useRef<Record<string, number>>({});
  const debounceTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const toastTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const toastIdRef = useRef<number>(0);
  // Mirror of `items` used by rapid stepper clicks to compute running targets
  // without reading possibly-stale render state.
  const itemsRef = useRef<CartItem[]>([]);
  // Guard against out-of-order GET responses clobbering newer state.
  const refreshSeqRef = useRef<number>(0);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const showToast = useCallback((message: string, variant: 'success' | 'info' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const id = ++toastIdRef.current;
    setToast({ id, message, variant });
    toastTimerRef.current = setTimeout(() => setToast(null), 2600);
  }, []);

  // Clean up debounce + toast timers when the provider unmounts.
  useEffect(() => {
    const timers = debounceTimersRef.current;
    return () => {
      Object.values(timers).forEach((t) => clearTimeout(t));
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Load the user's server cart whenever the authenticated user changes.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (sessionPending) return;

      setIsLoading(true);
      setCartError(null);

      if (!userId) {
        if (!cancelled) setItems([]);
        setIsLoading(false);
        return;
      }

      const res = await getUserCart(userId, userEmail);
      if (cancelled) return;

      if (res.success && res.data && 'items' in res.data && Array.isArray(res.data.items)) {
        const serverItems: CartItem[] = res.data.items.map((ci) => ({
          // The server cart doc uses `_id` for the line item and `foodId` for
          // the actual food. Override `foodItem._id` with the real food id so
          // update/remove/keys/dedupe all operate on the correct food id.
          foodItem: { ...(ci as unknown as IGlobalFoodItem), _id: ci.foodId },
          quantity: ci.quantity,
          addedAt: ci.createdAt ?? ci.updatedAt,
        }));
        setItems(serverItems);
      } else {
        setItems([]);
        if (res.message) setCartError(res.message);
      }
      setIsLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [userId, userEmail, sessionPending]);

  /**
   * Refetch the authoritative cart from the server and replace local state.
   * Used after every mutation so the navbar badge, sidebar drawer and cart
   * page always render the exact same server-synced list/count.
   */
  const refreshCart = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setCartError(null);
      return;
    }

    const seq = ++refreshSeqRef.current;
    const res = await getUserCart(userId, userEmail);
    // Ignore stale responses from an earlier request so a slow GET can't
    // overwrite a newer server state.
    if (seq !== refreshSeqRef.current) return;

    if (res.success && res.data && 'items' in res.data && Array.isArray(res.data.items)) {
      const serverItems: CartItem[] = res.data.items.map((ci) => ({
        // Override `foodItem._id` with the real food id (see load effect above).
        foodItem: { ...(ci as unknown as IGlobalFoodItem), _id: ci.foodId },
        quantity: ci.quantity,
        addedAt: ci.createdAt ?? ci.updatedAt,
      }));
      setItems(serverItems);
      setCartError(null);
    } else {
      if (res.message) setCartError(res.message);
    }
  }, [userId, userEmail]);

  const isCustomer = userRole.toLowerCase() === 'customer';
  // Not logged in (will redirect to login) or logged in as a customer may add items.
  const canAddToCart = !userId || isCustomer;

  const [conflictData, setConflictData] = useState<{
    foodItem: IGlobalFoodItem;
    quantity: number;
    existingRestaurantName: string;
    newRestaurantName: string;
  } | null>(null);

  const performAddItem = useCallback(
    (foodItem: IGlobalFoodItem, quantity: number = 1) => {
      const payload = toCartPayload(foodItem, quantity);

      // Optimistic local update
      const addedAt = Date.now();
      setItems((prev) => {
        const existing = prev.find((item) => item.foodItem._id === foodItem._id);
        if (existing && existing.foodItem._id !== '') {
          return prev.map((item) =>
            item.foodItem._id === foodItem._id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        }
        return [...prev, { foodItem, quantity, addedAt }];
      });

      void addToCartAction(userId, userEmail, payload)
        .then((res) => {
          if (!res.success) {
            setCartError(res.message || 'Failed to add item to cart.');
          } else {
            showToast(`Added ${foodItem.name} to cart.`);
          }
          return refreshCart();
        })
        .catch(() => {
          setCartError('Failed to add item to cart.');
        });
    },
    [userId, userEmail, refreshCart, showToast]
  );

  const guardedAddItem = useCallback(
    (foodItem: IGlobalFoodItem, quantity: number = 1) => {
      if (!userId) {
        router.push(`/auth/login?callbackUrl=${encodeURIComponent(pathname)}`);
        return;
      }

      // Only customer accounts may add items to the cart.
      if (!isCustomer) {
        setCartError('Only customer accounts can add items to the cart.');
        return;
      }

      // Single-restaurant cart policy check:
      // If the cart already contains items from a DIFFERENT restaurant, prompt for confirmation.
      if (items.length > 0) {
        const firstItem = items[0]?.foodItem;
        const existingRestId = firstItem?.restaurantId;
        const newRestId = foodItem.restaurantId;

        if (existingRestId && newRestId && existingRestId !== newRestId) {
          const existingRestName = firstItem?.restaurantName || 'another restaurant';
          const newRestName = foodItem.restaurantName || 'this restaurant';

          setConflictData({
            foodItem,
            quantity,
            existingRestaurantName: existingRestName,
            newRestaurantName: newRestName,
          });
          return;
        }
      }

      performAddItem(foodItem, quantity);
    },
    [userId, isCustomer, items, pathname, router, performAddItem]
  );

  const handleConfirmConflict = useCallback(async () => {
    if (!conflictData || !userId) return;
    const { foodItem, quantity, newRestaurantName } = conflictData;
    setConflictData(null);

    // Clear existing cart
    setItems([]);
    itemsRef.current = [];
    await clearCartAction(userId, userEmail);

    // Add new item
    performAddItem(foodItem, quantity);
    showToast(`Cart cleared & item added from ${newRestaurantName}.`);
  }, [conflictData, userId, userEmail, performAddItem, showToast]);

  const handleCancelConflict = useCallback(() => {
    setConflictData(null);
  }, []);

  const removeItem = useCallback(
    (foodId: string) => {
      if (!userId || !foodId) return;
      setItems((prev) => prev.filter((item) => item.foodItem._id !== foodId));

      void removeCartItemAction(userId, userEmail, foodId)
        .then((res) => {
          if (res.success) {
            showToast('Item removed from cart successfully.');
          } else {
            setCartError(res.message || 'Failed to remove cart item.');
          }
          return refreshCart();
        })
        .catch(() => {
          setCartError('Failed to remove cart item.');
        });
    },
    [userId, userEmail, refreshCart, showToast]
  );

  const changeQuantity = useCallback(
    (foodId: string, delta: number) => {
      if (!userId || !foodId) return;
      const change = Number(delta);
      if (Number.isNaN(change) || change === 0) return;

      // Track the current item quantity from the latest optimistic state.
      const currentQty =
        itemsRef.current.find((item) => item.foodItem._id === foodId)?.quantity ?? 0;
      const nextQty = currentQty + change;

      // Any new click invalidates an in-flight GET from a prior flush so a
      // stale response can't overwrite this newer optimistic state.
      refreshSeqRef.current += 1;

      // Dropping to/below zero removes the item.
      if (nextQty <= 0) {
        // Remove any pending debounce work for this item so the delete sticks.
        const timer = debounceTimersRef.current[foodId];
        if (timer) clearTimeout(timer);
        delete debounceTimersRef.current[foodId];
        delete pendingDeltasRef.current[foodId];
        removeItem(foodId);
        return;
      }

      // Optimistic UI update via a ref mirror so repeated clicks within the
      // same tick compose a running target (no stale render reads).
      if (!itemsRef.current) itemsRef.current = [];
      itemsRef.current = itemsRef.current.map((item) =>
        item.foodItem._id === foodId ? { ...item, quantity: nextQty } : item
      );
      setItems(itemsRef.current);

      // Accumulate the delta for this burst and debounce the server sync.
      pendingDeltasRef.current[foodId] =
        (pendingDeltasRef.current[foodId] ?? 0) + change;

      if (debounceTimersRef.current[foodId]) {
        clearTimeout(debounceTimersRef.current[foodId]);
      }
      debounceTimersRef.current[foodId] = setTimeout(() => {
        const accumulated = pendingDeltasRef.current[foodId] ?? change;
        delete pendingDeltasRef.current[foodId];
        delete debounceTimersRef.current[foodId];

        void updateCartQuantityAction(userId, userEmail, foodId, accumulated)
          .then((res) => {
            if (!res.success) {
              setCartError(res.message || 'Failed to update cart item.');
            }
            return refreshCart();
          })
          .catch(() => {
            setCartError('Failed to update cart item.');
          });
      }, 300);
    },
    [userId, userEmail, removeItem, refreshCart]
  );

  const clearCart = useCallback(() => {
    if (!userId) return;
    setItems([]);
    itemsRef.current = [];

    void clearCartAction(userId, userEmail)
      .then((res) => {
        if (res.success) {
          showToast('Cart cleared successfully.');
        } else {
          setCartError(res.message || 'Failed to clear cart.');
        }
        return refreshCart();
      })
      .catch(() => {
        setCartError('Failed to clear cart.');
      });
  }, [userId, userEmail, refreshCart, showToast]);

  const openCartDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeCartDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const totalPrice = items.reduce((sum, item) => {
    const price = item.foodItem.discountPrice || item.foodItem.price;
    return sum + price * item.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem: guardedAddItem,
        removeItem,
        changeQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isLoading,
        cartError,
        canAddToCart,
        isDrawerOpen,
        openCartDrawer,
        closeCartDrawer,
      }}
    >
      {children}
      <CartToast toast={toast} />
      <CartConflictModal
        isOpen={Boolean(conflictData)}
        existingRestaurantName={conflictData?.existingRestaurantName || ''}
        newRestaurantName={conflictData?.newRestaurantName || ''}
        onConfirm={handleConfirmConflict}
        onCancel={handleCancelConflict}
      />
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
