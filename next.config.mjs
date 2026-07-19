/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.18.117', 'localhost'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.supabase.co https://*.r2.dev https://assets.coverup.tech",
              "media-src 'self' blob: https://*.r2.dev https://assets.coverup.tech",
              "font-src 'self'",
              "connect-src 'self' https://*.supabase.co https://accept.paymob.com https://assets.coverup.tech",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/media/memo/:path*',
        destination: 'https://pub-a0488275d6334ef69e85bc2da063ea1b.r2.dev/Memo_The_Mascoot/:path*',
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rdxkrmcegrlgixnciyzz.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
