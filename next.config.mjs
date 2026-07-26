/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: { serverActions: { bodySizeLimit: '20mb' } },
  poweredByHeader: false,
  images: { remotePatterns: [] }
};
export default nextConfig;
