/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static optimization for pages that use session/dynamic content
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
    esmExternals: 'loose'
  },
  
  // Image configuration
  images: {
    domains: [
      'lh3.googleusercontent.com',
      'avatars.githubusercontent.com',
      'images.unsplash.com',
      'via.placeholder.com'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Webpack configuration to handle chunking issues
  webpack: (config, { dev, isServer }) => {
    // Handle external packages
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    })

    // Optimize chunks for production
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      }
    }

    return config
  },

  // Force dynamic for pages that use session
  output: undefined, // Remove standalone for now to fix build issues
  
  // Disable static generation for dynamic pages
  trailingSlash: false,
  
  // Build configuration
  productionBrowserSourceMaps: false,
  optimizeFonts: true,
  
  // Disable static optimization for problematic routes
  generateStaticParams: false,
}

module.exports = nextConfig