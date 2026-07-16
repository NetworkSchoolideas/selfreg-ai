import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.SELFREG_NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
