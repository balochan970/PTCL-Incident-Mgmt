/** @type {import('next').NextConfig} */
// Trigger GitHub Actions workflow
const nextConfig = {
  images: {
    unoptimized: true
  },
  output: 'export',
  distDir: 'out',
  trailingSlash: false,
  basePath: '',
  assetPrefix: '',
  experimental: {
    serverActions: true
  }
}

module.exports = nextConfig 