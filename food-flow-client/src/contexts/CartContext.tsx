'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { IGlobalFoodItem } from '@/types/restaurant';

const CART_STORAGE_KEY = 'foodflow-cart';

export interface CartItem {
  foodItem: IGlobalFoodItem;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (foodItem: IGlobalFoodItem, quantity?: number) => void;
  removeItem: (foodId: string) => void;
  updateQuantity: (foodId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch {
      // Ignore parse errors
    }
    setIsLoaded(true);
  }, []);

  // Persist cart to localStorage on every change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } catch {
        // Ignore storage errors
      }
    }
  }, [items, isLoaded]);

  const addItem = useCallback((foodItem: IGlobalFoodItem, quantity: number = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.foodItem._id === foodItem._id);
      if (existing) {
        return prev.map((item) =>
          item.foodItem._id === foodItem._id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { foodItem, quantity }];
    });
  }, []);

  const removeItem = useCallback((foodId: string) => {
    setItems((prev) => prev.filter((item) => item.foodItem._id !== foodId));
  }, []);

  const updateQuantity = useCallback((foodId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.foodItem._id !== foodId));
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.foodItem._id === foodId ? { ...item, quantity } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const totalPrice = items.reduce((sum, item) => {
    const price = item.foodItem.discountPrice || item.foodItem.price;
    return sum + price * item.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
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
