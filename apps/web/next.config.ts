import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Next matches these against the request's hostname only (no port, no scheme) —
  // see next/dist/server/lib/router-utils/block-cross-site-dev.js:105. `localhost`
  // is already allowed by default, so only 127.0.0.1 needs to be listed here.
  // Port-suffixed entries never match and silently disable the entry.
  allowedDevOrigins: ["*.trycloudflare.com", "127.0.0.1"],
  async headers() {
    return [
      {
        headers: [
          {
            key: "Permissions-Policy",
            value: "identity-credentials-get=()",
          },
        ],
        source: "/:path*",
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        hostname: "127.0.0.1",
        pathname: "/**",
        port: "54321",
        protocol: "http",
      },
      {
        hostname: "localhost",
        pathname: "/**",
        port: "54321",
        protocol: "http",
      },
      {
        hostname: "*.supabase.co",
        pathname: "/**",
        protocol: "https",
      },
      {
        hostname: "*.supabase.in",
        pathname: "/**",
        protocol: "https",
      },
    ],
  },
  async rewrites() {
    return [
      {
        destination: "http://127.0.0.1:54321/:path*",
        source: "/supabase/:path*",
      },
      {
        destination: "http://localhost:5000/api/:path*",
        source: "/api/:path*",
      },
      {
        destination: "http://localhost:5000/hubs/:path*",
        source: "/hubs/:path*",
      },
    ];
  },
  transpilePackages: ["@workspace/ui"],
};

export default withNextIntl(nextConfig);
