import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.29.82', '192.168.29.82:3000'],
  devIndicators: false,
  experimental: {
    serverActions: {
      allowedOrigins: ['192.168.29.82:3000', 'localhost:3000'],
    },
  },
};

export default nextConfig;
