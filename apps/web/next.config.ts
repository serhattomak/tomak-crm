import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "localhost:3000",
    "127.0.0.1:3000",
  ],
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
