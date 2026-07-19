/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverComponentsExternalPackages: ["bcryptjs"],
  },
  async redirects() {
    return [
      {
        source: "/explore",
        destination: "/topics",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
