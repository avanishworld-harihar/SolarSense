import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

/** Hostnames only (no protocol/port), comma-separated — e.g. `192.168.31.148` for iPad on LAN. */
const allowedDevOrigins =
  process.env.ALLOWED_DEV_ORIGINS?.split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean) ?? [];

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  scope: "/",
  fallbacks: {
    document: "/offline"
  }
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  images: {
    formats: ["image/avif", "image/webp"]
  },
  async rewrites() {
    return [{ source: "/manifest.json", destination: "/manifest.webmanifest" }];
  }
};

export default withPWA(nextConfig);
