import type { NextConfig } from "next";

const formatBuildTimeJst = (date: Date): string => {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${getPart("year")}/${getPart("month")}/${getPart("day")} ${getPart("hour")}:${getPart("minute")}:${getPart("second")}`;
};

const buildTimeJst = formatBuildTimeJst(new Date());

const nextConfig: NextConfig = {
  /* PWA configuration without external dependencies */
  experimental: {
    webpackBuildWorker: true,
  },
  env: {
    NEXT_PUBLIC_BUILD_TIME: buildTimeJst,
  },
  /* Other config options here */
};

export default nextConfig;
