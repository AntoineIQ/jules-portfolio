import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const origin = process.env.F1_API_ORIGIN;
    if (!origin) return [];
    return [
      {
        source: "/api/f1/:path*",
        destination: `${origin}/:path*`,
      },
    ];
  },
};

export default nextConfig;
