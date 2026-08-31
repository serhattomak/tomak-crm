import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "localhost:3001",
    "127.0.0.1:3001",
    "localhost:3000",
  ],
  // biome-ignore lint/suspicious/useAwait: Next.js expects async headers
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
  // biome-ignore lint/suspicious/useAwait: Next.js expects async rewrites
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
