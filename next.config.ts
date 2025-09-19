import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep trailing slash for consistent URLs if desired
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
