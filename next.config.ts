import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Pin the project root, so a stray lockfile in a parent folder can't change what gets traced.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
