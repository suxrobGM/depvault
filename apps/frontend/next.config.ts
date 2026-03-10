import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  reactCompiler: true,
  typedRoutes: true,
  rewrites: async () => {
    return [
      {
        source: "/uploads/:path*",
        destination: `${API_URL}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
