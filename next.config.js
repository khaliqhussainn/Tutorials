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
  // Increase body size limit for file uploads
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
  // Increase max duration for upload API routes
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    }
    return config
  }
}

module.exports = nextConfig