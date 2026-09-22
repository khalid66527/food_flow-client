"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { Store, ShoppingBag, Bike, Users } from "lucide-react";
import {
  getPublicStatsApi,
  getRestaurantsCountApi,
  getOrdersDeliveredCountApi,
  getRidersCountApi,
  getHappyCustomersCountApi,
} from "@/lib/api/stats";
import { formatNumber } from "@/lib/utils/formatNumber";

function useCountUp(end: number, duration: number, inView: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView || end <= 0) {
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
  }, [end, duration, inView]);

  return count;
}

const StatItemCard = ({
  label,
  icon: Icon,
  rawValue,
  inView,
  loading,
}: {
  label: string;
  icon: any;
  rawValue: number;
  inView: boolean;
  loading: boolean;
}) => {
  const animatedValue = useCountUp(rawValue, 2000, inView);
  const formatted = formatNumber(animatedValue);

  return (
    <motion.div
      variants={statVariants}
      className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white px-6 py-8 text-center shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Icon */}
      <motion.div
        variants={iconVariants}
        className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-50"
      >
        <Icon className="h-7 w-7 text-orange-500" />
      </motion.div>

      {/* Number */}
      <p className="mt-5 text-4xl font-extrabold text-orange-500 sm:text-5xl min-h-[48px] flex items-center justify-center">
        {loading && rawValue === 0 ? (
          <span className="inline-block h-10 w-24 animate-pulse rounded-lg bg-orange-100" />
        ) : (
          formatted
        )}
      </p>

      {/* Label */}
      <p className="mt-2 text-sm font-medium text-slate-500 sm:text-base">
        {label}
      </p>
    </motion.div>
  );
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const statVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
    },
  },
};

const iconVariants = {
  hidden: { scale: 0 },
  visible: {
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 260,
      damping: 20,
      delay: 0.2,
    },
  },
};

const StatsCounter = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: false, amount: 0.3 });
  const [statsData, setStatsData] = useState({
    partnerRestaurants: 0,
    successfulOrders: 0,
    activeRiders: 0,
    happyCustomers: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchAllStats() {
      try {
        setLoading(true);
        // Primary overall stats call
        const mainRes = await getPublicStatsApi();

        if (isMounted && mainRes.success && mainRes.data) {
          const d = mainRes.data;
          setStatsData({
            partnerRestaurants: d.partnerRestaurants || 0,
            successfulOrders: d.successfulOrders || 0,
            activeRiders: d.activeRiders || 0,
            happyCustomers: d.happyCustomers || 0,
          });
          setLoading(false);
          return;
        }

        // Secondary individual endpoints fallback
        const [rCount, oCount, rdCount, hCount] = await Promise.all([
          getRestaurantsCountApi(),
          getOrdersDeliveredCountApi(),
          getRidersCountApi(),
          getHappyCustomersCountApi(),
        ]);

        if (isMounted) {
          setStatsData({
            partnerRestaurants: rCount || 0,
            successfulOrders: oCount || 0,
            activeRiders: rdCount || 0,
            happyCustomers: hCount || 0,
          });
        }
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchAllStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const statCards = [
    {
      label: "Partner Restaurants",
      icon: Store,
      rawValue: statsData.partnerRestaurants,
    },
    {
      label: "Orders Delivered",
      icon: ShoppingBag,
      rawValue: statsData.successfulOrders,
    },
    {
      label: "Active Riders",
      icon: Bike,
      rawValue: statsData.activeRiders,
    },
    {
      label: "Happy Customers",
      icon: Users,
      rawValue: statsData.happyCustomers,
    },
  ];

  return (
    <section
      ref={ref}
      className="relative bg-slate-50 py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Trusted by Thousands
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-slate-500 sm:text-base">
            Real numbers, real customers, real fast deliveries — every day.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-4"
        >
          {statCards.map((stat) => (
            <StatItemCard
              key={stat.label}
              label={stat.label}
              icon={stat.icon}
              rawValue={stat.rawValue}
              inView={inView}
              loading={loading}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default StatsCounter;
