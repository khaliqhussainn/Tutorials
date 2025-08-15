/** @type {import('next').NextConfig} */
const nextConfig = {
  // Experimental features
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

  // Webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Handle external packages
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    })

    // Fix for client-side builds
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      }
    }

    return config
  },

  // Build configuration
  productionBrowserSourceMaps: false,
  optimizeFonts: true,
  trailingSlash: false,
  
  // Force dynamic rendering for all pages (fixes static generation issues)
  output: 'standalone',
  
  // Disable static optimization
  generateStaticParams: false,
  
  // Environment variables
  env: {
    CUSTOM_KEY: 'my-value',
  },
}

module.exports = nextConfig