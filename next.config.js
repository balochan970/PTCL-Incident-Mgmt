/** @type {import('next').NextConfig} */
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