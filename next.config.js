/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static export completely
  // output: 'export',
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  swcMinify: true,
  // Completely disable static page optimization to allow client-side data fetching
  experimental: {
    // Disable static page generation completely
    disableStaticGeneration: true
  },
  // Allow importing images
  webpack(config) {
    config.module.rules.push({
      test: /\.(png|jpg|gif|svg|webp)$/i,
      use: [
        {
          loader: 'file-loader',
          options: {
            publicPath: '/_next/static/images/',
            outputPath: 'static/images/',
            name: '[name].[hash].[ext]',
          },
        },
      ],
    });

    return config;
  },
}

module.exports = nextConfig 