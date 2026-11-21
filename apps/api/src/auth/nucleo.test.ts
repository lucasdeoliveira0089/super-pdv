import { ConfigService } from "@nestjs/config";
import { describe, expect, it } from "vitest";
import { ENV_TESTE } from "../../test/ambiente";
import type { Env } from "../config/env";
import { MINUTO, RelogioControlado } from "./relogio";
import {
  gerarSenhaTemporaria,
  hashSenha,
  TAMANHO_SENHA_TEMPORARIA,
  verificarSenha,
  verificarSenhaFicticia,
} from "./senhas";
import { gerarTokenOpaco, hashToken, TokensAcesso } from "./tokens";

describe("senhas", () => {
  it("guarda apenas o hash argon2id e verifica corretamente", async () => {
    const h = await hashSenha("Segredo#2026");
    expect(h).toMatch(/^\$argon2id\$/);
    expect(h).not.toContain("Segredo#2026");
    expect(await verificarSenha(h, "Segredo#2026")).toBe(true);
    expect(await verificarSenha(h, "segredo#2026")).toBe(false);
  });

  it("hash inválido não quebra a verificação", async () => {
    expect(await verificarSenha("lixo", "x")).toBe(false);
  });

  it("verificação fictícia leva tempo comparável e sempre falha", async () => {
    const h = await hashSenha("qualquer-senha");
    await verificarSenhaFicticia("aquecimento");
    const t0 = performance.now();
    await verificarSenha(h, "errada");
    const real = performance.now() - t0;
    const t1 = performance.now();
    expect(await verificarSenhaFicticia("errada")).toBe(false);
    const ficticia = performance.now() - t1;
    expect(ficticia).toBeGreaterThan(real * 0.3);
  });

  it("senha temporária tem 16 caracteres sem ambíguos e é aleatória", () => {
    const senhas = new Set(Array.from({ length: 50 }, gerarSenhaTemporaria));
    expect(senhas.size).toBe(50);
    for (const s of senhas) {
      expect(s).toHaveLength(TAMANHO_SENHA_TEMPORARIA);
      expect(s).not.toMatch(/[0O1lI]/);
    }
  });
});

describe("tokens", () => {
  const config = new ConfigService(ENV_TESTE) as unknown as ConfigService<Env, true>;

  it("token opaco: só o hash é guardado", () => {
    const { token, hash } = gerarTokenOpaco();
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(hash).toBe(hashToken(token));
    expect(hash).not.toContain(token);
  });

  it("token de acesso expira em 15 minutos", async () => {
    const relogio = new RelogioControlado();
    const tokens = new TokensAcesso(config, relogio);
    const jwt = await tokens.assinar({ aud: "cliente", sub: "u1", sid: "s1", tid: "t1" });
    expect(await tokens.verificar(jwt, "cliente")).toEqual({
      aud: "cliente",
      sub: "u1",
      sid: "s1",
      tid: "t1",
    });
    relogio.avancar(15 * MINUTO + 1000);
    expect(await tokens.verificar(jwt, "cliente")).toBeNull();
  });

  it("rejeita token adulterado e de outro domínio", async () => {
    const tokens = new TokensAcesso(config, new RelogioControlado());
    const jwt = await tokens.assinar({ aud: "equipe", sub: "m1", sid: "s1" });
    expect(await tokens.verificar(jwt, "cliente")).toBeNull();
    const [h, p, s] = jwt.split(".");
    const adulterado = `${h}.${Buffer.from(JSON.stringify({ sub: "outro" })).toString("base64url")}.${s}`;
    expect(p).toBeDefined();
    expect(await tokens.verificar(adulterado, "equipe")).toBeNull();
  });

  it("rejeita token assinado com outro segredo", async () => {
    const outro = new TokensAcesso(
      new ConfigService({
        ...ENV_TESTE,
        JWT_SECRET: "outro-segredo-com-mais-de-32-caracteres!!",
      }) as unknown as ConfigService<Env, true>,
      new RelogioControlado(),
    );
    const jwt = await outro.assinar({ aud: "cliente", sub: "u1", sid: "s1", tid: "t1" });
    const tokens = new TokensAcesso(config, new RelogioControlado());
    expect(await tokens.verificar(jwt, "cliente")).toBeNull();
  });
});
