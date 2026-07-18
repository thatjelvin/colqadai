/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
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
