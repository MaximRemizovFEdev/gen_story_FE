const developmentApiTarget = (process.env.DEV_API_TARGET || "http://localhost:3000").replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    return [
      {
        source: "/api/:path*",
        destination: `${developmentApiTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
