import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the root so Turbopack never picks up a parent folder's lockfile.
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    // Common old-site paths, so links people saved still land somewhere.
    return [
      { source: "/giving", destination: "/give", permanent: true },
      { source: "/donate", destination: "/give", permanent: true },
      { source: "/services", destination: "/visit", permanent: true },
    ];
  },
};

export default nextConfig;
