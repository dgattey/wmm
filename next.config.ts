import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  reactCompiler: true,
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/portfolio/uploading",
        destination: "/",
        permanent: false,
      },
    ];
  },
  experimental: {
    turbopackFileSystemCacheForDev: true,
    viewTransition: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "financialmodelingprep.com",
        pathname: "/image-stock/**",
      },
    ],
  },
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
