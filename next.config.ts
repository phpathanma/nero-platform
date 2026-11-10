import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { remotePatterns: [] },
  // El formulario de eventos puede incluir un afiche de hasta 4 MB.
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
};

export default nextConfig;
