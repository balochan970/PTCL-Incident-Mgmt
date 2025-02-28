/** @type {import('next').NextConfig} */
// Trigger GitHub Actions workflow
const nextConfig = {
  images: {
    unoptimized: true
  },
  trailingSlash: false,
  distDir: '.next',
  basePath: '',
  assetPrefix: ''
}

module.exports = nextConfig 