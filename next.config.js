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
    serverComponentsExternalPackages: ['bcryptjs', '@prisma/client'],
  },
  
  // Configure for better upload performance and Vercel compatibility
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...config.externals, 
        'canvas', 
        'jsdom',
        // Add these for Vercel compatibility
        {
          'utf-8-validate': 'commonjs utf-8-validate',
          'bufferutil': 'commonjs bufferutil',
        }
      ]
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
  
  // Add these for Vercel build stability
  poweredByHeader: false,
  trailingSlash: false,
  
  // Ensure proper TypeScript handling
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Handle edge cases in production
  swcMinify: true,
  
  // Optimize for Vercel deployment
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
}

module.exports = nextConfig