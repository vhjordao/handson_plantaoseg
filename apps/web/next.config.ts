import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
