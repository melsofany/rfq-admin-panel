/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  generateBuildId: () => 'build-' + Date.now(),
};

module.exports = nextConfig;
