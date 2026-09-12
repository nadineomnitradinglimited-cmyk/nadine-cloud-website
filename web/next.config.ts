import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // This app lives inside the existing Node.js site's repo (which has its
  // own package-lock.json at the parent level) during the migration —
  // pin the workspace root explicitly so Next.js doesn't guess wrong.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
