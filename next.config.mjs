/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  poweredByHeader: false,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vfcnqnuryabfemqbzsug.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/images/**",
      },
    ],
  },

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
