import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";

// Carrega o `.env` da raiz do monorepo, se existir. Os scripts do drizzle-kit
// rodam a partir de packages/db (o config é carregado como CJS, sem import.meta).
const rootEnv = resolve(process.cwd(), "../../.env");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

// Padrão: banco local do docker-compose.yml (mesmos valores do .env.example).
const url = process.env.DATABASE_URL ?? "postgres://superpdv:superpdv@localhost:5432/superpdv";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
