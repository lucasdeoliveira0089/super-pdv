import {
  apiErroSchema,
  type CodigoErro,
  meResponseSchema,
  tokensResponseSchema,
} from "@super-pdv/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ApiSimulada, empresaSimulada } from "./api-simulada";

// Teste de contrato: o servidor simulado usado nos testes do PDV responde nos
// formatos definidos em `packages/shared` (os mesmos da API real) e segue as
// regras de autenticação que o PDV depende.

const SENHA = "Senha#Forte2026";

describe("servidor simulado da API (contrato)", () => {
  let api: ApiSimulada;

  const chamar = async (metodo: string, caminho: string, corpo?: unknown, token?: string) => {
    const r = await fetch(`${api.url}${caminho}`, {
      method: metodo,
      headers: {
        ...(corpo === undefined ? {} : { "content-type": "application/json" }),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const texto = await r.text();
    return { status: r.status, json: texto ? (JSON.parse(texto) as unknown) : undefined };
  };

  const esperarErro = (
    resposta: { status: number; json: unknown },
    status: number,
    code: CodigoErro,
  ) => {
    expect(resposta.status).toBe(status);
    expect(apiErroSchema.parse(resposta.json)).toMatchObject({ statusCode: status, code });
  };

  const entrar = async (email = "ana@silva.local", senha = SENHA) => {
    const r = await chamar("POST", "/v1/auth/login", { email, senha });
    expect(r.status).toBe(200);
    return tokensResponseSchema.parse(r.json);
  };

  beforeEach(async () => {
    api = await ApiSimulada.iniciar();
    api.adicionarUsuario({
      email: "Ana@Silva.local",
      senha: SENHA,
      nome: "Ana",
      papel: "gerente",
      empresas: [
        empresaSimulada("Silva Norte"),
        empresaSimulada("Silva Centro"),
        empresaSimulada("Silva Inativa", { ativa: false }),
      ],
    });
  });

  afterEach(async () => {
    expect(api.violacoes).toEqual([]);
    await api.parar();
  });

  it("login devolve tokens no formato do contrato (e-mail sem distinção de maiúsculas)", async () => {
    const tokens = await entrar("  ANA@silva.local ");
    expect(tokens.expiresIn).toBeGreaterThan(0);
  });

  it("login inválido: mensagem genérica, tanto para senha errada quanto para e-mail inexistente", async () => {
    esperarErro(
      await chamar("POST", "/v1/auth/login", { email: "ana@silva.local", senha: "x" }),
      401,
      "CREDENCIAIS_INVALIDAS",
    );
    const inexistente = await chamar("POST", "/v1/auth/login", {
      email: "ninguem@silva.local",
      senha: "x",
    });
    esperarErro(inexistente, 401, "CREDENCIAIS_INVALIDAS");
    expect(apiErroSchema.parse(inexistente.json).message).toBe("E-mail ou senha inválidos");
  });

  it("requisição fora do contrato: 400 VALIDACAO com erros por campo", async () => {
    const r = await chamar("POST", "/v1/auth/login", { email: "nao-e-email" });
    esperarErro(r, 400, "VALIDACAO");
    expect(apiErroSchema.parse(r.json).fieldErrors).toHaveProperty("email");
  });

  it("bloqueia após 5 falhas", async () => {
    for (let i = 0; i < 5; i++) {
      await chamar("POST", "/v1/auth/login", { email: "ana@silva.local", senha: "x" });
    }
    esperarErro(
      await chamar("POST", "/v1/auth/login", { email: "ana@silva.local", senha: SENHA }),
      429,
      "BLOQUEADO",
    );
  });

  it("/v1/me no formato do contrato, só com empresas ativas, em ordem de nome", async () => {
    const { accessToken } = await entrar();
    const r = await chamar("GET", "/v1/me", undefined, accessToken);
    expect(r.status).toBe(200);
    const me = meResponseSchema.parse(r.json);
    expect(me.email).toBe("ana@silva.local");
    expect(me.permissoes).toContain("pdv.operar");
    expect(me.empresas.map((e) => e.nomeFantasia)).toEqual(["Silva Centro", "Silva Norte"]);
  });

  it("/v1/me sem token ou com token inválido: 401", async () => {
    esperarErro(await chamar("GET", "/v1/me"), 401, "NAO_AUTENTICADO");
    esperarErro(await chamar("GET", "/v1/me", undefined, "at-falso"), 401, "NAO_AUTENTICADO");
  });

  it("renovação rotaciona o token e detecta reuso, revogando a sessão", async () => {
    const t1 = await entrar();
    const r2 = await chamar("POST", "/v1/auth/refresh", { refreshToken: t1.refreshToken });
    const t2 = tokensResponseSchema.parse(r2.json);
    expect(t2.refreshToken).not.toBe(t1.refreshToken);

    // Reuso do token antigo: 401 e a sessão inteira deixa de valer.
    esperarErro(
      await chamar("POST", "/v1/auth/refresh", { refreshToken: t1.refreshToken }),
      401,
      "NAO_AUTENTICADO",
    );
    esperarErro(
      await chamar("POST", "/v1/auth/refresh", { refreshToken: t2.refreshToken }),
      401,
      "NAO_AUTENTICADO",
    );
  });

  it("usuário desativado ou cliente suspenso: renovação recusada", async () => {
    const t = await entrar();
    api.usuario("ana@silva.local").ativo = false;
    esperarErro(
      await chamar("POST", "/v1/auth/refresh", { refreshToken: t.refreshToken }),
      401,
      "NAO_AUTENTICADO",
    );

    api.usuario("ana@silva.local").ativo = true;
    const t2 = await entrar();
    api.clienteSuspenso = true;
    esperarErro(await chamar("GET", "/v1/me", undefined, t2.accessToken), 401, "NAO_AUTENTICADO");
  });

  it("logout responde 204 e encerra a sessão", async () => {
    const t = await entrar();
    expect((await chamar("POST", "/v1/auth/logout", { refreshToken: t.refreshToken })).status).toBe(
      204,
    );
    esperarErro(await chamar("GET", "/v1/me", undefined, t.accessToken), 401, "NAO_AUTENTICADO");
  });

  it("troca de senha: 204, valida a senha atual e a política, e limpa a senha temporária", async () => {
    api.usuario("ana@silva.local").senhaTemporaria = true;
    const { accessToken } = await entrar();

    const errada = await chamar(
      "POST",
      "/v1/auth/senha",
      { senhaAtual: "x", novaSenha: "Nova#Senha2026" },
      accessToken,
    );
    esperarErro(errada, 400, "VALIDACAO");
    expect(apiErroSchema.parse(errada.json).fieldErrors).toHaveProperty("senhaAtual");

    const curta = await chamar(
      "POST",
      "/v1/auth/senha",
      { senhaAtual: SENHA, novaSenha: "curta" },
      accessToken,
    );
    esperarErro(curta, 400, "VALIDACAO");
    expect(apiErroSchema.parse(curta.json).fieldErrors).toHaveProperty("novaSenha");

    const ok = await chamar(
      "POST",
      "/v1/auth/senha",
      { senhaAtual: SENHA, novaSenha: "Nova#Senha2026" },
      accessToken,
    );
    expect(ok.status).toBe(204);
    const me = meResponseSchema.parse((await chamar("GET", "/v1/me", undefined, accessToken)).json);
    expect(me.senhaTemporaria).toBe(false);
  });

  it("rota desconhecida: 404 no formato de erro", async () => {
    esperarErro(await chamar("GET", "/v1/nada"), 404, "NAO_ENCONTRADO");
  });
});
