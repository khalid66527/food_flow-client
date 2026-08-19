import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/common/Navbar";
import Footer from "@/components/common/Footer";

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
  const user = null;

  return (
    <html
      lang="en"
      className={`${inter.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Navbar user={user} cartItemCount={0} />
        <main className="flex-grow">{children}</main>
        <Footer></Footer>
      </body>
    </html>
  );
}
