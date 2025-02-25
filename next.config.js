/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  trailingSlash: false,
  distDir: '.next',
  basePath: '',
  assetPrefix: ''
}

module.exports = nextConfig 