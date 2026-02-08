/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Production optimizations
  swcMinify: true,
  
  // Enable React strict mode
  reactStrictMode: true,
  
  // Images configuration
  images: {
    unoptimized: true, // Required for standalone output
  },
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/consumption',
        permanent: true,
      },
      {
        source: '/user',
        destination: '/user/dashboard',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;

