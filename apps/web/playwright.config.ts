import { defineConfig, devices } from "@playwright/test";

/**
 * Jornada e acessibilidade em dois tamanhos: computador (1440) e celular (390).
 *
 * Localmente, sobe (ou reaproveita) o servidor de desenvolvimento na porta 3100 e usa o Edge do
 * Windows (`PW_CHANNEL=msedge`), sem baixar navegador. Na CI, usa o build de produção e o
 * Chromium do Playwright.
 */
const PORTA = Number(process.env.PORT ?? 3100);
const canal = process.env.PW_CHANNEL || undefined;
const emCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: emCI,
  retries: emCI ? 1 : 0,
  reporter: emCI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORTA}`,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    channel: canal,
  },
  projects: [
    { name: "computador", use: { ...devices["Desktop Chrome"], channel: canal, viewport: { width: 1440, height: 900 } } },
    { name: "celular", use: { ...devices["Pixel 7"], channel: canal, viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: emCI ? `npm run start -- -p ${PORTA}` : `npm run dev -- -p ${PORTA}`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: !emCI,
    timeout: 180_000,
    env: { NEXT_TELEMETRY_DISABLED: "1" },
  },
});
