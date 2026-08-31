import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/common/Navbar";
import Footer from "@/components/common/Footer";
import ScrollToHash from "@/components/common/ScrollToHash";
import AOSInit from "@/components/common/AOSInit";
import AIChatbot from "@/components/ai/AIChatbot";
import CartSidebar from "@/components/cart/CartSidebar";
import { CartProvider } from "@/contexts/CartContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Food Flow — Online Food Delivery System",
  description:
    "Order your favorite food from the best restaurants near you with Food Flow.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <AOSInit />
        <ScrollToHash />
        <CartProvider>
          <Navbar session={null} cartItemCount={0} />
          <main className="flex-grow">{children}</main>
          <Footer></Footer>
          <CartSidebar />
          <AIChatbot />
        </CartProvider>
      </body>
    </html>
  );
}
