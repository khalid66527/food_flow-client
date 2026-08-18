"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ShoppingCart, 
  MapPin, 
  User, 
  LogOut, 
  LayoutDashboard, 
  ShoppingBag, 
  Bike, 
  ShieldCheck, 
  Menu, 
  X 
} from "lucide-react";

// Better Auth session ba user object-er type definition (Real implementation er jonno)
type UserRole = "customer" | "restaurant" | "rider" | "admin" | null;

interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  image?: string;
}

interface NavbarProps {
  // Better Auth er useSession() ba auth client theke pawa real session data ekhane pass hobe
  session?: {
    user: UserSession;
  } | null;
  user?: UserSession | null;
  onLogout?: () => Promise<void> | void;
  cartItemCount?: number;
  userLocation?: string; // Real location tracking er jonno prop
}

export default function Navbar({ 
  session, 
  user: userProp,
  onLogout, 
  cartItemCount = 0,
  userLocation = "Chattogram" 
}: NavbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  
  const pathname = usePathname();
  const user = userProp || session?.user || null;

  // Better Auth role onujayi dashboard ebong management routes gulo define kora
  const getRoleBasedLinks = (role: UserRole) => {
    switch (role) {
      case "customer":
        return [
          { label: "Dashboard", href: "/customer/dashboard", icon: LayoutDashboard },
          { label: "My Orders", href: "/customer/orders", icon: ShoppingBag },
          { label: "Profile", href: "/customer/profile", icon: User },
        ];
      case "restaurant":
        return [
          { label: "Restaurant Dashboard", href: "/restaurant/dashboard", icon: LayoutDashboard },
          { label: "Menu Management", href: "/restaurant/menu", icon: ShoppingBag },
        ];
      case "rider":
        return [
          { label: "Rider Dashboard", href: "/rider/dashboard", icon: LayoutDashboard },
          { label: "Delivery History", href: "/rider/history", icon: Bike },
        ];
      case "admin":
        return [
          { label: "Admin Panel", href: "/admin/dashboard", icon: ShieldCheck },
        ];
      default:
        return [];
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        
        {/* 1. Logo Section */}
        <div className="flex items-center">
          <div className="flex items-center group">
            <img 
              src="https://i.ibb.co.com/jPhnCNFt/Food-Flow-Logo.png" 
              alt="Food Flow Logo" 
              className="h-9 sm:h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105" 
            />
          </div>
        </div>

        {/* 2. Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-gray-50/80 p-1.5 rounded-full border border-gray-200/60 text-sm font-medium text-gray-600">
          <Link 
            href="/" 
            className={`px-4 py-1.5 rounded-full transition-all ${pathname === "/" ? "bg-white text-orange-600 shadow-xs font-semibold" : "hover:bg-white hover:text-orange-600"}`}
          >
            Home
          </Link>
          <Link 
            href="/restaurants" 
            className={`px-4 py-1.5 rounded-full transition-all ${pathname === "/restaurants" ? "bg-white text-orange-600 shadow-xs font-semibold" : "hover:bg-white hover:text-orange-600"}`}
          >
            Restaurants
          </Link>
          <Link 
            href="/offers" 
            className={`px-4 py-1.5 rounded-full transition-all ${pathname === "/offers" ? "bg-white text-orange-600 shadow-xs font-semibold" : "hover:bg-white hover:text-orange-600"}`}
          >
            Offers
          </Link>
          <Link 
            href="/track/sample-id" 
            className={`px-4 py-1.5 rounded-full transition-all ${pathname.startsWith("/track") ? "bg-white text-orange-600 shadow-xs font-semibold" : "hover:bg-white hover:text-orange-600"}`}
          >
            Track Order
          </Link>
          <Link 
            href="/about" 
            className={`px-4 py-1.5 rounded-full transition-all ${pathname.startsWith("/about") ? "bg-white text-orange-600 shadow-xs font-semibold" : "hover:bg-white hover:text-orange-600"}`}
          >
            About
          </Link>
        </nav>

        {/* 3. Right Section: Location, Cart & Better Auth User Session */}
        
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Real/Dynamic Location Display */}

          {/* <div className="hidden lg:flex items-center gap-1.5 text-xs text-gray-600 bg-orange-50/60 border border-orange-100 px-3.5 py-2 rounded-full">
            <MapPin className="h-3.5 w-3.5 text-orange-500" />
            <span className="font-semibold text-gray-700">{userLocation}</span>
          </div> */}

          {/* Cart Link */}
          <Link 
            href="/cart" 
            className={`relative p-2 sm:p-2.5 rounded-full transition-all ${pathname === "/cart" ? "bg-orange-50 text-orange-600" : "text-gray-600 hover:text-orange-600 hover:bg-gray-50"}`}
            aria-label="Cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartItemCount > 0 && (
              <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white shadow-xs">
                {cartItemCount}
              </span>
            )}
          </Link>

          {/* Better Auth User Authentication State */}
          {user ? (
            <div className="relative">
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all"
              >
                {user.image ? (
                  <img src={user.image} alt={user.name} className="h-9 w-9 sm:h-10 sm:w-10 rounded-full object-cover border-2 border-orange-400 shadow-xs" />
                ) : (
                  <div className="h-9 w-9 sm:h-10 sm:w-10 overflow-hidden rounded-full bg-orange-100 flex items-center justify-center border-2 border-orange-400 text-orange-600 font-bold shadow-xs">
                    {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
              </button>

              {/* User Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-3 w-56 origin-top-right rounded-2xl bg-white shadow-xl ring-1 ring-black/5 py-2 z-50">
                  <div className="px-4 py-2.5 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
                    <p className="text-xs text-orange-600 font-medium capitalize">Role: {user.role}</p>
                  </div>

                  <div className="py-1">
                    {user.role && getRoleBasedLinks(user.role).map((link, idx) => {
                      const IconComponent = link.icon;
                      return (
                        <Link 
                          key={idx}
                          href={link.href}
                          onClick={() => setIsDropdownOpen(false)}
                          className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${pathname === link.href ? "bg-orange-50 text-orange-600 font-semibold" : "text-gray-700 hover:bg-orange-50 hover:text-orange-600"}`}
                        >
                          <IconComponent className="h-4 w-4 text-orange-500" />
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>

                  <div className="border-t border-gray-100 pt-1 mt-1">
                    <button 
                      onClick={async () => {
                        setIsDropdownOpen(false);
                        if (onLogout) await onLogout();
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2.5">
              <Link 
                href="/auth/login" 
                className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-orange-600 transition-colors"
              >
                Login
              </Link>
              <Link 
                href="/auth/register" 
                className="rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 transition-all"
              >
                Register
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

        </div>
      </div>

      {/* Fully Responsive Mobile Drawer/Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 pt-3 pb-6 space-y-2 shadow-xl">
          <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-orange-50/60 border border-orange-100 px-3.5 py-2 rounded-lg mb-3 lg:hidden">
            <MapPin className="h-3.5 w-3.5 text-orange-500" />
            <span className="font-semibold text-gray-700">{userLocation}</span>
          </div>

          <Link 
            href="/" 
            onClick={() => setIsMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-lg text-base font-medium transition-colors ${pathname === "/" ? "bg-orange-50 text-orange-600" : "text-gray-700 hover:bg-orange-50 hover:text-orange-600"}`}
          >
            Home
          </Link>
          <Link 
            href="/restaurants" 
            onClick={() => setIsMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-lg text-base font-medium transition-colors ${pathname === "/restaurants" ? "bg-orange-50 text-orange-600" : "text-gray-700 hover:bg-orange-50 hover:text-orange-600"}`}
          >
            Restaurants
          </Link>
          <Link 
            href="/offers" 
            onClick={() => setIsMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-lg text-base font-medium transition-colors ${pathname === "/offers" ? "bg-orange-50 text-orange-600" : "text-gray-700 hover:bg-orange-50 hover:text-orange-600"}`}
          >
            Offers
          </Link>
          <Link 
            href="/track/sample-id" 
            onClick={() => setIsMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-lg text-base font-medium transition-colors ${pathname.startsWith("/track") ? "bg-orange-50 text-orange-600" : "text-gray-700 hover:bg-orange-50 hover:text-orange-600"}`}
          >
            Track Order
          </Link>

          {!user && (
            <div className="pt-3 border-t border-gray-100 flex gap-2">
              <Link 
                href="/auth/login" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex-1 text-center rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Login
              </Link>
              <Link 
                href="/auth/register" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex-1 text-center rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 transition-colors"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}