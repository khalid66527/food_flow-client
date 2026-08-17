"use client";
import React from "react";
import Link from "next/link";
import {
  
  MapPin,
  Phone,
  Mail,
  ArrowUp,
} from "lucide-react";
import { FaFacebook } from "react-icons/fa";
import { BsInstagram, BsTwitter, BsYoutube } from "react-icons/bs";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-100 bg-white">
      {/* Main Footer */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand Section */}
          <div>
            <Link href="/" className="inline-block">
              <img
                src="https://i.ibb.co.com/jPhnCNFt/Food-Flow-Logo.png"
                alt="Food Flow Logo"
                className="h-10 w-auto object-contain"
              />
            </Link>

            <p className="mt-4 max-w-xs text-sm leading-6 text-gray-500">
              Delicious food delivered to your doorstep. Discover restaurants,
              explore offers, and enjoy your favorite meals with Food Flow.
            </p>

            {/* Social Icons */}
            <div className="mt-5 flex items-center gap-2">
              <a
                href="#"
                aria-label="Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-full
                bg-gray-50 text-gray-600 transition-all
                hover:bg-orange-50 hover:text-orange-500"
              >
                <FaFacebook className="h-4 w-4" />
              </a>

              <a
                href="#"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-full
                bg-gray-50 text-gray-600 transition-all
                hover:bg-orange-50 hover:text-orange-500"
              >
                <BsInstagram className="h-4 w-4" />
              </a>

              <a
                href="#"
                aria-label="Twitter"
                className="flex h-9 w-9 items-center justify-center rounded-full
                bg-gray-50 text-gray-600 transition-all
                hover:bg-orange-50 hover:text-orange-500"
              >
                <BsTwitter className="h-4 w-4" />
              </a>

              <a
                href="#"
                aria-label="YouTube"
                className="flex h-9 w-9 items-center justify-center rounded-full
                bg-gray-50 text-gray-600 transition-all
                hover:bg-orange-50 hover:text-orange-500"
              >
                <BsYoutube className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-800">
              Quick Links
            </h3>

            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link
                  href="/"
                  className="text-gray-500 transition-colors hover:text-orange-500"
                >
                  Home
                </Link>
              </li>

              <li>
                <Link
                  href="/restaurants"
                  className="text-gray-500 transition-colors hover:text-orange-500"
                >
                  Restaurants
                </Link>
              </li>

              <li>
                <Link
                  href="/offers"
                  className="text-gray-500 transition-colors hover:text-orange-500"
                >
                  Offers
                </Link>
              </li>

              <li>
                <Link
                  href="/track/sample-id"
                  className="text-gray-500 transition-colors hover:text-orange-500"
                >
                  Track Order
                </Link>
              </li>

              <li>
                <Link
                  href="/about"
                  className="text-gray-500 transition-colors hover:text-orange-500"
                >
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Support */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-800">
              Customer Support
            </h3>

            <ul className="mt-4 space-y-4 text-sm">

              <li>
                <Link
                  href="/contact"
                  className="text-gray-500 transition-colors hover:text-orange-500"
                >
                  Contact Us
                </Link>
              </li>

              <li>
                <Link
                  href="/faq"
                  className="text-gray-500 transition-colors hover:text-orange-500"
                >
                  FAQ
                </Link>
              </li>

              <li>
                <Link
                  href="/privacy"
                  className="text-gray-500 transition-colors hover:text-orange-500"
                >
                  Privacy Policy
                </Link>
              </li>

              <li>
                <Link
                  href="/terms"
                  className="text-gray-500 transition-colors hover:text-orange-500"
                >
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Section */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-800">
              Get In Touch
            </h3>

            <div className="mt-4 space-y-4">

              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-50">
                  <MapPin className="h-4 w-4 text-orange-500" />
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Location
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Chattogram, Bangladesh
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-50">
                  <Phone className="h-4 w-4 text-orange-500" />
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Phone
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    +880 1XXX-XXXXXX
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-50">
                  <Mail className="h-4 w-4 text-orange-500" />
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Email
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    support@foodflow.com
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-10 flex flex-col gap-4 rounded-2xl bg-orange-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h3 className="text-base font-semibold text-gray-800">
              Hungry? Let Food Flow deliver.
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Order your favorite food from the best restaurants around you.
            </p>
          </div>

          <Link
            href="/restaurants"
            className="inline-flex w-fit items-center gap-2 rounded-full
            bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white
            shadow-md shadow-orange-500/20 transition-all
            hover:bg-orange-600"
          >
            Order Now
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-gray-100">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5
        text-center sm:flex-row sm:items-center sm:justify-between
        sm:px-6 sm:text-left lg:px-8">

          <p className="text-xs text-gray-500">
            © {currentYear} Food Flow. All rights reserved.
          </p>

          <p className="text-xs text-gray-400">
            Made with ❤️ for food lovers.
          </p>

          <button
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
            className="mx-auto flex items-center gap-1.5 rounded-full
            bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600
            transition-all hover:bg-orange-50 hover:text-orange-500
            sm:mx-0"
          >
            Back to top
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

