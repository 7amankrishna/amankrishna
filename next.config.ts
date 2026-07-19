import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // GitHub avatars for the live GitHub section
    remotePatterns: [{ protocol: "https", hostname: "avatars.githubusercontent.com" }],
  },
};

export default nextConfig;
