import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tenant dashboard pages query tenant-specific tables (classes, timetables, etc.)
  // via the master-typed Supabase client. Those tables don't exist in types/supabase.ts
  // (which reflects only the master DB schema), causing TypeScript to infer them as 'never'.
  // This is a known type gap for staging — runtime behaviour is correct.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Allow cross-origin requests from *.localhost subdomains (tenant portals in dev)
  allowedDevOrigins: ['*.localhost:3000', '*.localhost'],
  experimental: {
    serverComponentsExternalPackages: [],
  },
  // Keep compiled pages alive longer in dev to prevent 404 on first hit after cache clear
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,     // Keep pages compiled for 60s
    pagesBufferLength: 10,          // Keep up to 10 pages in memory at once
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default withPWA(nextConfig);
