import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Integration tests use a separate build directory and disposable database.
  distDir: process.env.CNPM_TEST_BUILD_DIR || '.next',
  typescript: { tsconfigPath: process.env.CNPM_TEST_TSCONFIG || 'tsconfig.json' },
};

export default nextConfig;
