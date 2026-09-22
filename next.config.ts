import "./src/lib/setup-dns";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.110.110",
    "192.168.68.100",
    "169.254.83.107",
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "*.local",
  ],
  serverExternalPackages: ["jsonwebtoken"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;

