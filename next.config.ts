import type { NextConfig } from "next";

const backend = process.env.API_BACKEND_URL;
if (backend && (!backend.startsWith("https://") || new URL(backend).origin !== backend)) {
  throw new Error("API_BACKEND_URL must be an HTTPS origin without a trailing slash.");
}

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: backend ? [{ source: "/api/:path*", destination: `${backend}/api/:path*` }] : [],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
