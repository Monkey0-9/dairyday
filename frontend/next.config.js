const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
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
        source: '/customer',
        destination: '/customer/dashboard',
        permanent: true,
      },
      {
        source: '/user/:path*',
        destination: '/customer/:path*',
        permanent: true,
      },
    ];
  },
};

module.exports = withPWA(nextConfig);

