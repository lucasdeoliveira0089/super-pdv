import { ConfigModule } from "@nestjs/config";
import { afterEach, describe, expect, it } from "vitest";
import { configOptions } from "./config.options";
import { ENV_TESTE } from "../../test/ambiente";
import { validateEnv } from "./env";

const VALID_URL = "postgres://user:pass@localhost:5432/db";
const BASE = { ...ENV_TESTE, NODE_ENV: undefined, DATABASE_URL: VALID_URL };

describe("validateEnv", () => {
  it("aceita um ambiente válido e aplica os padrões", () => {
    expect(validateEnv(BASE)).toEqual({
      ...ENV_TESTE,
      NODE_ENV: "development",
      PORT: 3333,
      DATABASE_URL: VALID_URL,
      LIMITE_AUTH_POR_MINUTO: 10000,
    });
  });

  it("nomeia a variável obrigatória ausente", () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL: obrigatória/);
  });

  it("rejeita URL que não é do PostgreSQL", () => {
    expect(() => validateEnv({ ...BASE, DATABASE_URL: "mysql://localhost/db" })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("rejeita porta inválida", () => {
    expect(() => validateEnv({ ...BASE, PORT: "abc" })).toThrow(/PORT/);
  });

  it.each([
    ["JWT_SECRET", { JWT_SECRET: "curto" }, /JWT_SECRET: deve ter ao menos 32/],
    ["JWT_SECRET", { JWT_SECRET: undefined }, /JWT_SECRET: obrigatória/],
    ["GESTOR_URL", { GESTOR_URL: "ftp://x" }, /GESTOR_URL: deve ser uma URL http/],
    ["ADMIN_URL", { ADMIN_URL: undefined }, /ADMIN_URL: obrigatória/],
    ["SMTP_URL", { SMTP_URL: "http://x" }, /SMTP_URL: deve ser uma URL smtp/],
    ["MAIL_FROM", { MAIL_FROM: undefined }, /MAIL_FROM: obrigatória/],
  ])("valida %s", (_nome, alteracao, erro) => {
    expect(() => validateEnv({ ...BASE, ...alteracao })).toThrow(erro);
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
