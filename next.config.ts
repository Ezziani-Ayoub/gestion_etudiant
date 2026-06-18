import type { NextConfig } from "next";

const nextConfig = {
  // Ensure Turbopack uses this project folder as the root
  turbopack: {
    root: "./",
  },
  /* config options here */
} as unknown as NextConfig;

export default nextConfig;
