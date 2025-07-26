/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'res.cloudinary.com',
      'images.unsplash.com',
      'via.placeholder.com'
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs'],
  },
  
  // Configure for better upload performance
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...config.externals, 'canvas', 'jsdom']
    }
    
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }
    
    return config
  },

  // Handle large uploads with proper headers
  async headers() {
    return [
      {
        source: '/api/upload/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'POST, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400',
          },
        ],
      },
    ]
  },

  // Increase body size limits for video uploads
  async rewrites() {
    return []
  },

  // Add body size configuration
  serverRuntimeConfig: {
    // Increase the body size limit to 200MB
    maxFileSize: 200 * 1024 * 1024, // 200MB
  },
}

module.exports = nextConfig