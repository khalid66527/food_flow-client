"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, Map, DollarSign, History, User, Settings, LogOut, Bike } from "lucide-react";

const navItems = [
  { label: "Home", href: "/rider/dashboard", icon: Home },
  { label: "Map", href: "/rider/map", icon: Map },
  { label: "Earnings", href: "/rider/earnings", icon: DollarSign },
  { label: "History", href: "/rider/history", icon: History },
  { label: "Profile", href: "/rider/profile", icon: User },
];

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/rider/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <Bike className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">Food Flow</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/rider/settings" className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto pb-24 md:pb-6">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-50 md:hidden">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${
                  active ? "text-orange-600" : "text-gray-500"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "text-orange-600" : ""}`} />
                <span className={`text-[10px] font-medium ${active ? "text-orange-600" : ""}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-14 bottom-0 w-56 bg-white border-r border-gray-100 flex-col p-4 z-40">
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? "bg-orange-50 text-orange-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/rider/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <Settings className="w-5 h-5" />
          Settings
        </Link>
      </aside>

      {/* Desktop content offset */}
      <div className="hidden md:block ml-56" />
    </div>
  );
}
