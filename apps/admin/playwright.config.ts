import { defineConfig, devices } from "@playwright/test";

// Porta própria dos E2E (o admin de desenvolvimento usa a 3001): os testes nunca
// reaproveitam um admin iniciado sem a configuração deles (ex.: sem o CEP falso).
const PORT = 3101;
/** API própria dos E2E do admin (a de desenvolvimento usa a 3333 e pode estar desatualizada). */
const PORTA_API = 3433;
/** Serviço de CEP falso (e2e/cep-falso.mjs): nenhum teste acessa o ViaCEP real. */
const PORTA_CEP = 3901;

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
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm --filter @super-pdv/api build && pnpm --filter @super-pdv/api start",
      url: `http://localhost:${PORTA_API}/health/ready`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      // Os E2E fazem muitos logins seguidos a partir do mesmo IP.
      env: { PORT: String(PORTA_API), LIMITE_AUTH_POR_MINUTO: "1000" },
    },
    {
      command: "node e2e/cep-falso.mjs",
      url: `http://localhost:${PORTA_CEP}/saude`,
      reuseExistingServer: !process.env.CI,
      env: { PORTA: String(PORTA_CEP) },
    },
    {
      // Build de produção (`next build` é executado antes pelo Turborepo).
      command: `pnpm exec next start --port ${PORT}`,
      port: PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        API_URL: `http://localhost:${PORTA_API}`,
        CEP_API_URL: `http://localhost:${PORTA_CEP}/ws`,
      },
    },
  ],
});
