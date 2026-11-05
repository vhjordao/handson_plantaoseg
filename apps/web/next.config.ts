import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    // O "Aprovar e oferecer" não pode ser emoldurado por outro site, e o navegador não deve
    // adivinhar tipos. A CSP completa entra antes de haver login real (ficha do componente).
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  // O projeto criou a base sem o arquivo de instruções para agentes (ficha do componente):
  // sem esta linha, o `next dev` recria o AGENTS.md a cada execução.
  agentRules: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
