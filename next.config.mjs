/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  poweredByHeader: false,
  images: {
    domains: ["cloud.appwrite.io"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cloud.appwrite.io",
        port: "",
        pathname: "/**",
      },
    ],
  },
  // Force dynamic rendering for all pages
  staticPageGenerationTimeout: 0,
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  staticPageGenerationTimeout: 120,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, must-revalidate",
          },
          {
            key: "x-middleware-cache",
            value: "no-cache",
          },
        ],
      },
    ];
  },
  // Explicitly set which pages should be dynamically rendered
  pageExtensions: ["tsx", "ts", "jsx", "js"],
};

export default nextConfig;
