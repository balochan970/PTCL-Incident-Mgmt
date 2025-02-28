/** @type {import('next').NextConfig} */
// Trigger GitHub Actions workflow
const nextConfig = {
  images: {
    unoptimized: true
  },
  output: 'export',
  distDir: '.next',
  trailingSlash: false
}

module.exports = nextConfig 