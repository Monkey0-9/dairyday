const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// Validate env on build
require('./lib/env.mjs');

const nextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',

  // Compression
  compress: true,

  // Production source maps (disable for smaller builds)
  productionBrowserSourceMaps: false,

  // Optimize imports
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{ member }}',
    },
  },

  // Images configuration
  images: {
    formats: ['image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      }
    ],
  },

  // Experimental features for performance
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'framer-motion',
      'date-fns',
      'sonner',
    ],
    turbo: {},
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
      {
        source: '/fonts/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/icons/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
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

const withNextIntl = require('next-intl/plugin')(
  './src/i18n/request.ts'
);

const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(
  withBundleAnalyzer(withPWA(withNextIntl(nextConfig))),
  {
    org: "dairy-os",
    project: "dairy-os-frontend",
    silent: !process.env.CI,
    widenClientFileUpload: true,
    reactComponentAnnotation: { enabled: true },
    tunnelRoute: "/monitoring",
    hideSourceMaps: true,
    disableLogger: true,
    automaticVercelMonitors: true,
  }
);

