'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Star, ShoppingCart, Check, Utensils, Eye } from 'lucide-react';
import { IGlobalFoodItem } from '@/types/restaurant';

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

interface FoodCardProps {
  item: IGlobalFoodItem;
  index?: number;
  viewMode?: 'grid' | 'list';
  onAddToCart?: (item: IGlobalFoodItem, e: React.MouseEvent) => void;
  addedFeedbackId?: string | null;
}

export default function FoodCard({
  item,
  index = 0,
  viewMode = 'grid',
  onAddToCart,
  addedFeedbackId,
}: FoodCardProps) {
  const isAdded = addedFeedbackId === item._id;
  const hasDiscount = !!item.discountPrice && item.discountPrice < item.price;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToCart?.(item, e);
  };

  // -----------------------------------------------------------------------
  // LIST VIEW
  // -----------------------------------------------------------------------
  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: index * 0.04 }}
        className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] transition-all duration-300 group flex flex-col sm:flex-row border border-gray-100/80"
      >
        {/* Image */}
        <div className="relative sm:w-52 h-44 sm:h-auto shrink-0 overflow-hidden bg-gray-100">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : null}
          {!item.image && (
            <div className="w-full h-full bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 flex items-center justify-center">
              <Utensils className="w-9 h-9 text-orange-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

          {/* Availability badge */}
          <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm ${
            item.isAvailable ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'
          }`}>
            {item.isAvailable ? 'Available' : 'Unavailable'}
          </span>
          {/* Rating badge */}
          {item.restaurantRating > 0 && (
            <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-white/90 backdrop-blur-md text-[11px] font-bold text-gray-800 shadow-sm">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              {item.restaurantRating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-900 text-[15px] group-hover:text-[#FF6B35] transition-colors line-clamp-1">
              {item.name}
            </h3>
            <p className="text-xs text-gray-400 mt-1 font-medium">From {item.restaurantName}</p>
            <div className="mt-2.5">
              {hasDiscount ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-extrabold text-[#FF6B35]">{formatPrice(item.discountPrice!)}</span>
                  <span className="text-xs text-gray-400 line-through font-medium">{formatPrice(item.price)}</span>
                </div>
              ) : (
                <span className="text-lg font-extrabold text-[#FF6B35]">{formatPrice(item.price)}</span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5">
            <Link
              href={`/restaurants/${item._id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border-2 border-gray-200 text-gray-600 hover:border-[#FF6B35] hover:text-[#FF6B35] bg-white transition-all cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              View Details
            </Link>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!item.isAvailable}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isAdded
                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                  : item.isAvailable
                  ? 'bg-[#FF6B35] text-white hover:bg-[#e85b27] shadow-sm shadow-[#FF6B35]/25'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isAdded ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Added
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Add to Cart
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // -----------------------------------------------------------------------
  // GRID VIEW
  // -----------------------------------------------------------------------
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 group flex flex-col border border-gray-100/80"
    >
      {/* Image */}
      <div className="relative h-48 w-full overflow-hidden bg-gray-100">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : null}
        {!item.image && (
          <div className="w-full h-full bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 flex items-center justify-center">
            <Utensils className="w-11 h-11 text-orange-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300" />

        {/* Availability badge */}
        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm ${
          item.isAvailable ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'
        }`}>
          {item.isAvailable ? 'Available' : 'Unavailable'}
        </span>

        {/* Rating badge */}
        {item.restaurantRating > 0 && (
          <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-white/90 backdrop-blur-md text-[11px] font-bold text-gray-800 shadow-sm">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            {item.restaurantRating.toFixed(1)}
          </span>
        )}

        {/* Discount badge */}
        {hasDiscount && (
          <span className="absolute bottom-3 left-3 text-[10px] font-bold bg-gradient-to-r from-[#FF6B35] to-amber-500 text-white px-2.5 py-1 rounded-lg shadow-sm">
            {Math.round(((item.price - item.discountPrice!) / item.price) * 100)}% OFF
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-900 text-[15px] group-hover:text-[#FF6B35] transition-colors line-clamp-1">
            {item.name}
          </h3>
          <p className="text-xs text-gray-400 mt-1 font-medium">From {item.restaurantName}</p>
          <div className="mt-2.5">
            {hasDiscount ? (
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-extrabold text-[#FF6B35]">{formatPrice(item.discountPrice!)}</span>
                <span className="text-xs text-gray-400 line-through font-medium">{formatPrice(item.price)}</span>
              </div>
            ) : (
              <span className="text-lg font-extrabold text-[#FF6B35]">{formatPrice(item.price)}</span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5">
          <Link
            href={`/restaurants/${item._id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border-2 border-gray-200 text-gray-600 hover:border-[#FF6B35] hover:text-[#FF6B35] bg-white transition-all cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            View Details
          </Link>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!item.isAvailable}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isAdded
                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                : item.isAvailable
                ? 'bg-[#FF6B35] text-white hover:bg-[#e85b27] shadow-sm shadow-[#FF6B35]/25'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isAdded ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Added
              </>
            ) : (
              <>
                <ShoppingCart className="w-3.5 h-3.5" />
                Add to Cart
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
