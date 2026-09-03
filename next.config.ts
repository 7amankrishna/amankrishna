import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Pin the workspace root to this repository.
   *
   * A stray `package-lock.json` sits in the Windows home directory, and Next
   * picked *that* as the root — so file tracing walked the whole user profile
   * instead of the project. Nothing outside the repo is touched to fix it; the
   * root is simply stated explicitly, which is what the warning asks for.
   *
   * `process.cwd()` rather than `import.meta.dirname`: Next loads this config
   * from the project directory in every command, and the value survives however
   * the config is transpiled.
   */
  outputFileTracingRoot: process.cwd(),
  images: {
    // GitHub avatars for the live GitHub section
    remotePatterns: [{ protocol: "https", hostname: "avatars.githubusercontent.com" }],
  },
};

export default nextConfig;
