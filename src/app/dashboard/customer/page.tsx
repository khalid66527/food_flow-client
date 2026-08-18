"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  ShoppingBag,
  Heart,
  MapPin,
  CreditCard,
  Star,
  User,
  LogOut,
  ArrowRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Temporary placeholder dashboard so the post-login redirect resolves.
// The full Customer Dashboard (Page 09 of the project doc) will replace this.
// ---------------------------------------------------------------------------
const NAV_ITEMS = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "My Orders", icon: ShoppingBag },
  { label: "Favorites", icon: Heart },
  { label: "Addresses", icon: MapPin },
  { label: "Payments", icon: CreditCard },
  { label: "Reviews", icon: Star },
  { label: "Profile", icon: User },
];

export default function CustomerDashboardPage() {
  return (
    <div className="min-h-[80vh] bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <nav className="space-y-1">
                {NAV_ITEMS.map((item, idx) => {
                  const Icon = item.icon;
                  const active = idx === 0;
                  return (
                    <span
                      key={item.label}
                      className={`flex cursor-default items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                        active
                          ? "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
                          : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </span>
                  );
                })}
              </nav>

              <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                <button className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors dark:hover:bg-red-500/10">
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="space-y-6">
            {/* Welcome card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 p-8 text-white shadow-xl shadow-orange-500/20"
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />

              <div className="relative z-10">
                <p className="text-xs font-bold uppercase tracking-widest text-white/70">
                  Customer Dashboard
                </p>
                <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                  Welcome back, Foodie!
                </h1>
                <p className="mt-2 max-w-md text-sm leading-6 text-white/85">
                  Your customer dashboard is under construction. The full
                  experience with orders, favorites and live tracking is coming
                  soon.
                </p>
                <Link
                  href="/restaurants"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-orange-600 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-95"
                >
                  Browse Restaurants
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>

            {/* Coming soon stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Total Orders", value: "—" },
                { label: "Active Order", value: "—" },
                { label: "Favorites", value: "—" },
                { label: "Total Spent", value: "—" },
              ].map((stat, idx) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + idx * 0.05, duration: 0.4, ease: "easeOut" }}
                  className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
                >
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {stat.label}
                  </p>
                  <p className="mt-1.5 text-2xl font-extrabold text-gray-900 dark:text-gray-100">
                    {stat.value}
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="rounded-2xl border border-dashed border-orange-300 bg-orange-50/50 p-8 text-center dark:border-orange-500/30 dark:bg-orange-500/5">
              <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                Full dashboard features are being built by the team — check
                back soon!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}