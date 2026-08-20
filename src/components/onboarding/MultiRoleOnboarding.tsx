"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChefHat,
  Bike,
  Store,
  Clock,
  TrendingUp,
  BarChart3,
  IndianRupee,
  CalendarCheck,
  Headphones,
  ArrowRight,
  Zap,
  Shield,
  Star,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type ActiveRole = "restaurant" | "rider";

interface Benefit {
  icon: React.ReactNode;
  text: string;
}

interface RoleCard {
  role: ActiveRole;
  title: string;
  subtitle: string;
  description: string;
  ctaLabel: string;
  href: string;
  icon: React.ReactNode;
  accentColor: string;
  glowColor: string;
  borderHoverColor: string;
  benefits: Benefit[];
}

/* -------------------------------------------------------------------------- */
/*                                  Data                                      */
/* -------------------------------------------------------------------------- */

const roleCards: RoleCard[] = [
  {
    role: "restaurant",
    title: "Partner with Us",
    subtitle: "For Restaurants",
    description:
      "Expand your reach and serve thousands of hungry customers daily. FoodFlow handles the delivery while you focus on crafting delicious meals.",
    ctaLabel: "Register Your Restaurant",
    href: "/auth/register?role=restaurant",
    icon: <Store className="h-7 w-7" />,
    accentColor: "orange",
    glowColor: "shadow-orange-500/25",
    borderHoverColor: "hover:border-orange-400",
    benefits: [
      { icon: <TrendingUp className="h-4 w-4" />, text: "Boost Orders Daily" },
      { icon: <BarChart3 className="h-4 w-4" />, text: "Easy Menu Management" },
      { icon: <IndianRupee className="h-4 w-4" />, text: "Zero Commission for First Month" },
      { icon: <Headphones className="h-4 w-4" />, text: "24/7 Partner Support" },
    ],
  },
  {
    role: "rider",
    title: "Join as a Rider",
    subtitle: "For Delivery Partners",
    description:
      "Be your own boss and earn on your schedule. Deliver food, earn rewards, and grow with Bangladesh's fastest delivery network.",
    ctaLabel: "Apply Now",
    href: "/auth/register?role=delivery",
    icon: <Bike className="h-7 w-7" />,
    accentColor: "orange",
    glowColor: "shadow-orange-500/25",
    borderHoverColor: "hover:border-orange-400",
    benefits: [
      { icon: <Clock className="h-4 w-4" />, text: "Flexible Work Hours" },
      { icon: <CalendarCheck className="h-4 w-4" />, text: "Get Paid Daily" },
      { icon: <Zap className="h-4 w-4" />, text: "Fast-Track Onboarding" },
      { icon: <Shield className="h-4 w-4" />, text: "Rider Insurance Coverage" },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*                          Animated SVG Icon                                 */
/* -------------------------------------------------------------------------- */

function AnimatedIcon({ role }: { role: ActiveRole }) {
  if (role === "restaurant") {
    return (
      <motion.div
        className="relative"
        whileHover={{ rotate: [0, -8, 8, -4, 0] }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-lg shadow-orange-500/30 sm:h-20 sm:w-20">
          <ChefHat className="h-8 w-8 sm:h-10 sm:w-10" />
        </div>
        {/* Orbiting dots */}
        <motion.div
          className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-amber-400"
          animate={{ y: [0, -6, 0], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-1 -left-1 h-2.5 w-2.5 rounded-full bg-orange-300"
          animate={{ y: [0, 5, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="relative"
      whileHover={{ x: [0, 4, -4, 2, 0] }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-lg shadow-orange-500/30 sm:h-20 sm:w-20">
        <Bike className="h-8 w-8 sm:h-10 sm:w-10" />
      </div>
      {/* Speed lines */}
      <motion.div
        className="absolute left-0 top-1/2 h-0.5 w-4 -translate-y-1/2 -translate-x-3 rounded-full bg-orange-300"
        animate={{ opacity: [0, 1, 0], x: [-8, -14, -20] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
      />
      <motion.div
        className="absolute left-1 top-[60%] h-0.5 w-3 -translate-x-3 rounded-full bg-orange-200"
        animate={{ opacity: [0, 0.8, 0], x: [-6, -12, -18] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
      />
      <motion.div
        className="absolute right-0 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400"
        animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Role Card                                     */
/* -------------------------------------------------------------------------- */

function RoleCardComponent({ card, index }: { card: RoleCard; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
        delay: index * 0.12,
      }}
      whileHover={{ y: -8 }}
      className="group relative"
    >
      {/* Glow effect behind card */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-orange-400/0 via-orange-400/0 to-orange-400/0 opacity-0 blur-lg transition-all duration-500 group-hover:from-orange-400/20 group-hover:via-orange-300/15 group-hover:to-amber-400/20 group-hover:opacity-100" />

      <div
        className={`relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 group-hover:border-orange-300 group-hover:shadow-xl group-hover:${card.glowColor} sm:p-8`}
      >
        {/* Top decorative gradient bar */}
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Icon */}
        <AnimatedIcon role={card.role} />

        {/* Badge */}
        <span className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-[11px] font-semibold text-orange-600 sm:text-xs">
          <Star className="h-3 w-3 fill-orange-400 text-orange-400" />
          {card.subtitle}
        </span>

        {/* Title */}
        <h3 className="mt-3 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
          {card.title}
        </h3>

        {/* Description */}
        <p className="mt-2 text-sm leading-relaxed text-gray-500">{card.description}</p>

        {/* Benefits */}
        <ul className="mt-5 flex-1 space-y-3">
          {card.benefits.map((benefit, i) => (
            <motion.li
              key={benefit.text}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.35,
                ease: [0.25, 0.46, 0.45, 0.94],
                delay: 0.15 + i * 0.06,
              }}
              className="flex items-center gap-2.5 text-sm text-gray-700"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-500 transition-colors group-hover:bg-orange-100">
                {benefit.icon}
              </span>
              {benefit.text}
            </motion.li>
          ))}
        </ul>

        {/* CTA Button */}
        <Link
          href={card.href}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-all duration-200 hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5 active:scale-[0.98]"
        >
          {card.ctaLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             Mobile Tab Switcher                            */
/* -------------------------------------------------------------------------- */

function MobileTabSwitcher({
  active,
  onChange,
}: {
  active: ActiveRole;
  onChange: (role: ActiveRole) => void;
}) {
  return (
    <div className="mb-6 flex rounded-full border border-gray-200 bg-gray-50 p-1 sm:hidden">
      {roleCards.map((card) => (
        <button
          key={card.role}
          onClick={() => onChange(card.role)}
          className={`relative flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold transition-all duration-200 ${
            active === card.role
              ? "text-white"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {active === card.role && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 rounded-full bg-orange-500 shadow-md shadow-orange-500/20"
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            {card.icon}
            {card.role === "restaurant" ? "Restaurant" : "Rider"}
          </span>
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             Main Section                                    */
/* -------------------------------------------------------------------------- */

export default function MultiRoleOnboarding() {
  const [mobileActive, setMobileActive] = useState<ActiveRole>("restaurant");

  return (
    <section className="relative overflow-hidden bg-white py-16 sm:py-20 lg:py-24">
      {/* Decorative blurs */}
      <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-orange-100/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-orange-50/60 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-100 bg-orange-50 px-3.5 py-1.5 text-xs font-semibold text-orange-600 sm:text-sm">
            <Zap className="h-3.5 w-3.5" />
            Grow with FoodFlow
          </span>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Partner with Us or <span className="text-orange-500">Ride & Earn</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-gray-500 sm:text-base">
            Whether you run a restaurant or love riding the open road — FoodFlow
            has a place for you. Join thousands of partners already growing with us.
          </p>
        </motion.div>

        {/* Mobile Tab Switcher */}
        <MobileTabSwitcher active={mobileActive} onChange={setMobileActive} />

        {/* Cards Container */}
        <div className="mt-10 sm:mt-12">
          {/* Mobile: Show single card based on tab */}
          <div className="sm:hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={mobileActive}
                initial={{ opacity: 0, x: mobileActive === "restaurant" ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mobileActive === "restaurant" ? 20 : -20 }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <RoleCardComponent
                  card={roleCards.find((c) => c.role === mobileActive)!}
                  index={0}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Desktop: Show both cards side by side */}
          <div className="hidden gap-6 sm:grid sm:grid-cols-2 lg:gap-8">
            {roleCards.map((card, i) => (
              <RoleCardComponent key={card.role} card={card} index={i} />
            ))}
          </div>
        </div>

        {/* Trust bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400 sm:mt-12 sm:text-sm"
        >
          <span className="flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-emerald-500" />
            Verified Partners
          </span>
          <span className="h-1 w-1 rounded-full bg-gray-300" />
          <span className="flex items-center gap-1.5">
            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            4.8 Partner Rating
          </span>
          <span className="h-1 w-1 rounded-full bg-gray-300" />
          <span className="flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-orange-500" />
            10,000+ Active Partners
          </span>
        </motion.div>
      </div>
    </section>
  );
}
