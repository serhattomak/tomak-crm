import type { NextConfig } from "next";

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
    ];
  },
  transpilePackages: ["@workspace/ui"],
};

export default nextConfig;
