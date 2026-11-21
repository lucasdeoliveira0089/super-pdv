import { mkdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { sql } from "drizzle-orm";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { LocalDbStatus } from "../shared/ipc";

export const LOCAL_DB_FILENAME = "super-pdv.db";

export interface LocalDb {
  db: BetterSQLite3Database;
  path: string;
  status: () => LocalDbStatus;
  close: () => void;
}

/**
 * Abre (ou cria) o banco SQLite local do caixa dentro de `directory`
 * (em produção, a pasta de dados do usuário).
 */
export function openLocalDb(directory: string): LocalDb {
  mkdirSync(directory, { recursive: true });
  const path = join(directory, LOCAL_DB_FILENAME);
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite);

  return {
    db,
    path,
    status: () => {
      try {
        const row = db.get<{ version: string }>(sql`select sqlite_version() as version`);
        return { status: "operante", sqliteVersion: row.version };
      } catch {
        return { status: "indisponivel" };
      }
    },
    close: () => sqlite.close(),
  };
}
