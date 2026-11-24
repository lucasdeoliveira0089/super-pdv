import { defineConfig, devices } from "@playwright/test";
import { PORTA_API, PORTA_GESTOR, URL_API, URL_GESTOR } from "./e2e/portas";

// E2E contra a API e o banco reais. Pré-requisito: `pnpm db:up` (PostgreSQL + Mailpit).
// O global-setup aplica as migrations e os dados de demonstração (pnpm db:seed).
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: URL_GESTOR,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm --filter @super-pdv/api build && pnpm --filter @super-pdv/api start",
      url: `${URL_API}/health/ready`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        PORT: String(PORTA_API),
        // Links de recuperação de senha apontam para o gestor dos testes.
        GESTOR_URL: URL_GESTOR,
        // Os E2E fazem muitos logins seguidos a partir do mesmo IP.
        LIMITE_AUTH_POR_MINUTO: "1000",
      },
    },
    {
      // Build de produção (`next build` é executado antes pelo Turborepo).
      command: `pnpm exec next start --port ${PORTA_GESTOR}`,
      port: PORTA_GESTOR,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { API_URL: URL_API },
    },
  ],
});
