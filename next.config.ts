import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // output: 'export',
  images: { unoptimized: true },

  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },

  turbopack: {
    // Set the root to the current directory to silence multiple lockfile warnings
    root: path.join(__dirname),
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
};

export default nextConfig;
