/** @type {import('next').NextConfig} */
// Trigger GitHub Actions workflow
const nextConfig = {
  images: {
    unoptimized: true
  },
  distDir: '.next',
  trailingSlash: false,
  basePath: '',
  assetPrefix: ''
}

module.exports = nextConfig 