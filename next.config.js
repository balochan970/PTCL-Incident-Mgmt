/** @type {import('next').NextConfig} */
// Trigger GitHub Actions workflow
const nextConfig = {
  images: {
    unoptimized: true
  },
  output: 'standalone',
  trailingSlash: false,
  distDir: '.next',
  basePath: '',
  assetPrefix: '',
  experimental: {
    serverActions: true
  }
}

module.exports = nextConfig 