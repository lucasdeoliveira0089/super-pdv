import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import * as schema from "./schema";

export type Schema = typeof schema;
export type Database = NodePgDatabase<Schema>;

export interface DbClient {
  db: Database;
  pool: Pool;
  /** Encerra todas as conexões do pool. */
  close: () => Promise<void>;
}

export interface CreateDbOptions extends Omit<PoolConfig, "connectionString"> {
  /**
   * Chamado quando uma conexão ociosa do pool falha (ex.: o banco reiniciou).
   * Sem um listener, o `pg` lança o erro e derruba o processo; por isso ele é
   * sempre registrado. Padrão: ignora (a próxima consulta abre nova conexão).
   */
  onPoolError?: (error: Error) => void;
}

/**
 * Cria o cliente Drizzle para o PostgreSQL da nuvem.
 * @param url string de conexão (ex.: `DATABASE_URL`)
 */
export function createDb(url: string, options: CreateDbOptions = {}): DbClient {
  const { onPoolError = () => undefined, ...poolOptions } = options;
  const pool = new Pool({ connectionString: url, ...poolOptions });
  pool.on("error", onPoolError);
  const db = drizzle(pool, { schema, casing: "snake_case" });
  return { db, pool, close: () => pool.end() };
}
