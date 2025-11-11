/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@nura-js/core', '@nura-js/dom', '@nura-js/react'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
