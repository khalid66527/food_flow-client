'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
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

export interface CartItem {
  foodItem: IGlobalFoodItem;
  quantity: number;
  addedAt?: number | string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (foodItem: IGlobalFoodItem, quantity?: number) => void;
  removeItem: (foodId: string) => void;
  updateQuantity: (foodId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isLoading: boolean;
  cartError: string | null;
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

  const userId = session?.user?.id || '';

  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

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

      const res = await getUserCart(userId);
      if (cancelled) return;

      if (res.success && res.data && 'items' in res.data && Array.isArray(res.data.items)) {
        const serverItems: CartItem[] = res.data.items.map((ci) => ({
          foodItem: ci as unknown as IGlobalFoodItem,
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
  }, [userId, sessionPending]);

  const guardedAddItem = useCallback(
    (foodItem: IGlobalFoodItem, quantity: number = 1) => {
      if (!userId) {
        router.push(`/auth/login?callbackUrl=${encodeURIComponent(pathname)}`);
        return;
      }

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

      void addToCartAction(userId, payload)
        .then((res) => {
          if (!res.success) setCartError(res.message || 'Failed to add item to cart.');
        })
        .catch(() => {
          setCartError('Failed to add item to cart.');
        });
    },
    [userId, pathname, router]
  );

  const removeItem = useCallback(
    (foodId: string) => {
      if (!userId || !foodId) return;
      setItems((prev) => prev.filter((item) => item.foodItem._id !== foodId));

      void removeCartItemAction(userId, foodId)
        .then((res) => {
          if (!res.success) setCartError(res.message || 'Failed to remove cart item.');
        })
        .catch(() => {
          setCartError('Failed to remove cart item.');
        });
    },
    [userId]
  );

  const updateQuantity = useCallback(
    (foodId: string, quantity: number) => {
      if (!userId || !foodId) return;

      if (quantity <= 0) {
        removeItem(foodId);
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.foodItem._id === foodId ? { ...item, quantity } : item
        )
      );

      void updateCartQuantityAction(userId, foodId, quantity)
        .then((res) => {
          if (!res.success) setCartError(res.message || 'Failed to update cart item.');
        })
        .catch(() => {
          setCartError('Failed to update cart item.');
        });
    },
    [userId, removeItem]
  );

  const clearCart = useCallback(() => {
    if (!userId) return;
    setItems([]);

    void clearCartAction(userId)
      .then((res) => {
        if (!res.success) setCartError(res.message || 'Failed to clear cart.');
      })
      .catch(() => {
        setCartError('Failed to clear cart.');
      });
  }, [userId]);

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
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isLoading,
        cartError,
        isDrawerOpen,
        openCartDrawer,
        closeCartDrawer,
      }}
    >
      {children}
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
