import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Export as a static site for GitHub Pages
  output: "export",
  // Helps GitHub Pages serve directories as index.html
  trailingSlash: true,
  // Avoid image optimization server dependency
  images: { unoptimized: true },
};

export default nextConfig;
