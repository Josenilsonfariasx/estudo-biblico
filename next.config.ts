import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Muda a cada build: o service worker usa para renovar o cache offline.
  env: { NEXT_PUBLIC_BUILD_ID: String(Date.now()) },
  poweredByHeader: false,
  async headers() {
    return [
      {
        // App pessoal: não deve aparecer em buscadores.
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
