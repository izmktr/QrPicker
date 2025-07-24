import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* PWA configuration without external dependencies */
  experimental: {
    webpackBuildWorker: true,
  },
  /* Other config options here */
};

export default nextConfig;
