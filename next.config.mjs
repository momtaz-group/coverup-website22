/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.18.117', 'localhost'],
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
