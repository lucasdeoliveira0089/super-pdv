import { defineConfig } from "@playwright/test";

// Testa o app construído (out/): o Turborepo executa `build` antes de `test:e2e`.
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { trace: "retain-on-failure" },
});
