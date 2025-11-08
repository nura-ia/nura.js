/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@nura/core', '@nura/dom', '@nura/react'],
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
