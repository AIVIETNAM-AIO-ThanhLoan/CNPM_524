import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Integration tests use a separate build directory and disposable database.
  distDir: process.env.CNPM_TEST_BUILD_DIR || '.next',
  typescript: { tsconfigPath: process.env.CNPM_TEST_TSCONFIG || 'tsconfig.json' },
  async headers() {
    return [{ source: '/sw.js', headers: [
      { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
      { key: 'Service-Worker-Allowed', value: '/' },
      { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
    ] }];
  },
};

export default nextConfig;
