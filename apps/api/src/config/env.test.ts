import { ConfigModule } from "@nestjs/config";
import { afterEach, describe, expect, it } from "vitest";
import { configOptions } from "./config.options";
import { validateEnv } from "./env";

const VALID_URL = "postgres://user:pass@localhost:5432/db";

describe("validateEnv", () => {
  it("aceita um ambiente válido e aplica os padrões", () => {
    expect(validateEnv({ DATABASE_URL: VALID_URL })).toEqual({
      NODE_ENV: "development",
      PORT: 3333,
      DATABASE_URL: VALID_URL,
    });
  });

  it("nomeia a variável obrigatória ausente", () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL: obrigatória/);
  });

  it("rejeita URL que não é do PostgreSQL", () => {
    expect(() => validateEnv({ DATABASE_URL: "mysql://localhost/db" })).toThrow(/DATABASE_URL/);
  });

  it("rejeita porta inválida", () => {
    expect(() => validateEnv({ DATABASE_URL: VALID_URL, PORT: "abc" })).toThrow(/PORT/);
  });
});

describe("inicialização da API", () => {
  const original = process.env.DATABASE_URL;

  afterEach(() => {
    if (original === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = original;
  });

  it("não carrega a configuração sem DATABASE_URL e informa a variável ausente", async () => {
    delete process.env.DATABASE_URL;
    await expect(ConfigModule.forRoot(configOptions)).rejects.toThrow(/DATABASE_URL: obrigatória/);
  });
});
