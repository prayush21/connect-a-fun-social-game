import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Handle Firebase SDK properly
  transpilePackages: ['firebase'],
  
  // Optimize for production deployment (uncomment for Docker/container deployments)
  // output: 'standalone',
  
  // Turbopack configuration
  turbopack: {
    root: process.cwd(),
  },
  
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
  
  // Security headers (additional to vercel.json)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          }
        ],
      },
    ];
  },
  
  // Redirects for better SEO
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
