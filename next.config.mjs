/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.18.117', 'localhost'],
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
