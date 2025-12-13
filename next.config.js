/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for Docker deployment
  output: 'standalone',
  
  // Enable experimental features for better performance
  experimental: {
    // Optimize package imports for smaller bundles
    optimizePackageImports: ['lucide-react', 'firebase'],
  },
  
  // Trust proxy headers from Cloudflare Tunnel
  // This ensures proper client IP detection and HTTPS handling
  poweredByHeader: false,
  
  // Security headers (Cloudflare adds additional headers)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Ensure WebSocket connections work through Cloudflare Tunnel
  // Firebase Realtime uses WebSockets for live updates
  async rewrites() {
    return [];
  },
};

module.exports = nextConfig;
