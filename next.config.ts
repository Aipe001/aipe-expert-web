import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Static export for Netlify */
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,

  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },

  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
};

export default nextConfig;
