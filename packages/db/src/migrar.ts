import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

/** Pasta das migrations do pacote (funciona a partir de `src/` e de `dist/`). */
export const PASTA_MIGRATIONS = fileURLToPath(new URL("../migrations", import.meta.url));

/** Aplica as migrations pendentes no banco informado. */
export async function migrar(url: string): Promise<void> {
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: PASTA_MIGRATIONS });
  } finally {
    await pool.end();
  }
}
