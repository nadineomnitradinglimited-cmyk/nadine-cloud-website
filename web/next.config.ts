import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // This app lives inside the existing Node.js site's repo (which has its
  // own package-lock.json at the parent level) during the migration —
  // pin the workspace root explicitly so Next.js doesn't guess wrong.
  turbopack: {
    root: path.join(__dirname),
  },
  // The ported pages/scripts call the same relative /api/* paths the
  // live site always has. During Phase 4 (this app isn't the production
  // frontend yet) those calls are proxied straight through to the real,
  // already-stable API surface rather than duplicating any backend
  // logic here -- whichever of Node/Rust serves a given path today.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://www.nadinecloud.com/api/:path*",
      },
    ];
  },
};

export default nextConfig;
