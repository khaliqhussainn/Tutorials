/** @type {import('next').NextConfig} */
const nextConfig = {
  // Experimental features
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"],
    esmExternals: "loose",
  },

  // Image configuration
  images: {
    domains: [
      "lh3.googleusercontent.com",
      "avatars.githubusercontent.com",
      "images.unsplash.com",
      "via.placeholder.com",
      "res.cloudinary.com",
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Webpack configuration
  webpack: (config, { dev, isServer }) => {
    config.externals.push({
      "utf-8-validate": "commonjs utf-8-validate",
      bufferutil: "commonjs bufferutil",
    });

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },

  productionBrowserSourceMaps: false,
  optimizeFonts: true,
  trailingSlash: false,
  output: "standalone",
  generateStaticParams: false,

  env: {
    CUSTOM_KEY: "my-value",
    NEXT_PUBLIC_HAS_OPENAI: process.env.OPENAI_API_KEY ? "true" : "false",
    NEXT_PUBLIC_HAS_CLOUDINARY:
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
        ? "true"
        : "false",
  },

  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },
};

// Public config for components
const publicConfig = {
  hasOpenAI: !!process.env.OPENAI_API_KEY,
  hasCloudinary: !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ),
};

module.exports = { ...nextConfig, publicConfig };
