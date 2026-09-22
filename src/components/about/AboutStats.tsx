"use client";

import React, { useEffect, useState } from "react";
import { getPublicStatsApi, IPublicStatsData } from "@/lib/api/stats";
import { formatNumber } from "@/lib/utils/formatNumber";

function useCountUp(end: number, duration: number = 1800) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (end <= 0) {
      setCount(0);
      return;
    }

    let startTime: number | null = null;
    let animationFrame: number;

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOut(progress);

      setCount(Math.floor(easedProgress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
}

const AnimatedStatBox = ({ rawValue, label }: { rawValue: number; label: string }) => {
  const count = useCountUp(rawValue, 1800);
  return (
    <div className="bg-white px-4 py-8 text-center">
      <p className="text-2xl font-extrabold text-orange-500 sm:text-3xl">
        {formatNumber(count > 0 ? count : rawValue)}
      </p>
      <p className="mt-1 text-xs font-medium text-gray-500 sm:text-sm">
        {label}
      </p>
    </div>
  );
};

export default function AboutStats() {
  const [statsData, setStatsData] = useState<IPublicStatsData>({
    partnerRestaurants: 0,
    successfulOrders: 0,
    activeRiders: 0,
    happyCustomers: 0,
    avgRating: 4.8,
    totalReviews: 0,
  });

  useEffect(() => {
    let isMounted = true;
    getPublicStatsApi()
      .then((res) => {
        if (isMounted && res.success && res.data) {
          setStatsData(res.data);
        }
      })
      .catch((err) => console.warn("Failed to fetch stats for about page:", err));

    return () => {
      isMounted = false;
    };
  }, []);

  const items = [
    {
      rawValue: statsData.partnerRestaurants,
      label: "Partner restaurants",
    },
    {
      rawValue: statsData.successfulOrders,
      label: "Orders delivered",
    },
    {
      rawValue: statsData.activeRiders,
      label: "Active riders",
    },
    {
      rawValue: statsData.happyCustomers,
      label: "Happy customers",
    },
  ];

  return (
    <section className="border-b border-gray-100">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden bg-gray-100 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
        {items.map((stat) => (
          <AnimatedStatBox key={stat.label} rawValue={stat.rawValue} label={stat.label} />
        ))}
      </div>
    </section>
  );
}
