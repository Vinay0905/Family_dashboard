import type { NextConfig } from "next";

const allowedOrigins = [
  'localhost:3000',
  '192.168.29.82:3000',
  '192.168.0.167:3000'
];

if (process.env.VERCEL_URL) {
  allowedOrigins.push(process.env.VERCEL_URL);
}
if (process.env.NEXT_PUBLIC_APP_URL) {
  const host = process.env.NEXT_PUBLIC_APP_URL.replace(/^https?:\/\//, '');
  allowedOrigins.push(host);
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.29.82', '192.168.29.82:3000', '192.168.0.167', '192.168.0.167:3000'],
  devIndicators: false,
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
};

export default nextConfig;
