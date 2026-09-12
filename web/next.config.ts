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
  // live site always has -- those calls are proxied straight through to
  // the real, already-stable API surface (Node, which itself proxies
  // some paths to Rust per the USE_RUST_* flags) rather than duplicating
  // any backend logic here. Uses Railway's private network rather than
  // the public hostname: once this app is what www.nadinecloud.com
  // points to, rewriting to that same public hostname would just point
  // at itself.
  async rewrites() {
    const apiHost = process.env.API_INTERNAL_HOST || "nadine-cloud-website.railway.internal:8080";
    return [
      {
        source: "/api/:path*",
        destination: `http://${apiHost}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
