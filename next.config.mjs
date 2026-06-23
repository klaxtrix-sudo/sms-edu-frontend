import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow cross-origin requests from *.localhost subdomains (tenant portals in dev)
  allowedDevOrigins: [
    'localhost:3000',
    'glorydays.localhost:3000',
    'glorydays.localhost',
    'localhost',
    '*.localhost:3000',
    '*.localhost',
    'http://localhost:3000',
    'http://glorydays.localhost:3000'
  ],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              `connect-src 'self' ${process.env.NEXT_PUBLIC_BACKEND_URL?.endsWith('/') ? process.env.NEXT_PUBLIC_BACKEND_URL : `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/`} https://*.supabase.co https://api.paystack.co https://api.termii.com`,
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self' https://paystack.com",
            ].join('; '),
          },
        ],
      },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: [],
    serverActions: {
      allowedOrigins: [
        '*.localhost:3000', 'localhost:3000', '*.localhost',  // dev
        'klaxtrix.site', '*.klaxtrix.site',                  // production
      ],
    },
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
