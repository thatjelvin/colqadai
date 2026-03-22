/** @type {import('next').NextConfig} */
const nextConfig = { eslint: { ignoreDuringBuilds: true }, typescript: { ignoreBuildErrors: true }, experimental: { serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'] }, webpack: (config, { isServer }) => { if (isServer) { config.externals.push('@prisma/client'); } return config; } };
export default nextConfig;
