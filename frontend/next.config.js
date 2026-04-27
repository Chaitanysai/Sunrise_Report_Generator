/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // App Router is stable in Next 14, no flag needed; nothing experimental yet.
  },
};

module.exports = nextConfig;
