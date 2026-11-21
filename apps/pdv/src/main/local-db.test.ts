import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LOCAL_DB_FILENAME, openLocalDb, type LocalDb } from "./local-db";

describe("banco local do caixa", () => {
  let dir: string;
  let localDb: LocalDb | undefined;

  afterEach(() => {
    localDb?.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("cria o arquivo na pasta informada e informa a versão do SQLite", () => {
    dir = mkdtempSync(join(tmpdir(), "super-pdv-"));
    localDb = openLocalDb(join(dir, "userData"));

    expect(localDb.path).toBe(join(dir, "userData", LOCAL_DB_FILENAME));
    expect(existsSync(localDb.path)).toBe(true);

    const status = localDb.status();
    expect(status.status).toBe("operante");
    expect(status.status === "operante" && status.sqliteVersion).toMatch(/^3\.\d+\.\d+$/);
  });

  it("executa no runtime do Electron (mesmo binário nativo de produção)", () => {
    dir = mkdtempSync(join(tmpdir(), "super-pdv-"));
    expect(process.versions.electron).toBeDefined();
  });

  it("informa indisponível quando o banco foi fechado", () => {
    dir = mkdtempSync(join(tmpdir(), "super-pdv-"));
    localDb = openLocalDb(dir);
    localDb.close();
    expect(localDb.status()).toEqual({ status: "indisponivel" });
    localDb = undefined;
  });
});
