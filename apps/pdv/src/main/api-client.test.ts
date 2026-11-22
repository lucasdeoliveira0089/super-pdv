import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ApiSimulada, empresaSimulada } from "../../test/api-simulada";
import { ApiClient, ErroApiPdv } from "./api-client";

const SENHA = "Senha#Forte2026";

async function codigoDe(promessa: Promise<unknown>): Promise<string> {
  try {
    await promessa;
  } catch (erro) {
    expect(erro).toBeInstanceOf(ErroApiPdv);
    return (erro as ErroApiPdv).codigo;
  }
  throw new Error("Era esperado um erro");
}

describe("cliente HTTP da API no PDV", () => {
  let api: ApiSimulada;
  let refreshs: (string | null)[];
  let cliente: ApiClient;

  beforeEach(async () => {
    api = await ApiSimulada.iniciar();
    api.adicionarUsuario({
      email: "operador@silva.local",
      senha: SENHA,
      nome: "Operador Silva",
      empresas: [empresaSimulada("Mercado Silva Centro")],
    });
    refreshs = [];
    cliente = new ApiClient({
      baseUrl: `${api.url}/`,
      aoMudarRefreshToken: (rt) => refreshs.push(rt),
    });
  });

  afterEach(async () => {
    expect(api.violacoes).toEqual([]);
    await api.parar();
  });

  it("entra, consulta o usuário e informa o token de renovação para ser guardado", async () => {
    await cliente.entrar("operador@silva.local", SENHA);
    const me = await cliente.me();

    expect(me.nome).toBe("Operador Silva");
    expect(me.empresas.map((e) => e.nomeFantasia)).toEqual(["Mercado Silva Centro"]);
    expect(refreshs).toHaveLength(1);
    expect(refreshs[0]).toMatch(/^rt-/);
    expect(cliente.autenticado).toBe(true);
  });

  it("credenciais inválidas viram CREDENCIAIS_INVALIDAS, e 5 falhas, BLOQUEADO", async () => {
    for (let i = 0; i < 5; i++) {
      expect(await codigoDe(cliente.entrar("operador@silva.local", "errada"))).toBe(
        "CREDENCIAIS_INVALIDAS",
      );
    }
    expect(await codigoDe(cliente.entrar("operador@silva.local", SENHA))).toBe("BLOQUEADO");
    expect(refreshs).toEqual([]);
  });

  it("em 401, renova o token de acesso uma única vez e repete a chamada", async () => {
    await cliente.entrar("operador@silva.local", SENHA);
    api.expirarTokensDeAcesso();

    const me = await cliente.me();
    expect(me.email).toBe("operador@silva.local");
    expect(api.contar("/v1/auth/refresh")).toBe(1);
    expect(api.contar("/v1/me")).toBe(2);
    // O token rotacionado foi informado para substituir o guardado.
    expect(refreshs).toHaveLength(2);
    expect(refreshs[1]).not.toBe(refreshs[0]);
  });

  it("chamadas simultâneas com o token expirado compartilham uma só renovação", async () => {
    await cliente.entrar("operador@silva.local", SENHA);
    api.expirarTokensDeAcesso();

    const [a, b, c] = await Promise.all([cliente.me(), cliente.me(), cliente.me()]);
    expect([a.id, b.id, c.id]).toEqual([a.id, a.id, a.id]);
    // Duas renovações com o mesmo token seriam tratadas como reuso pela API.
    expect(api.contar("/v1/auth/refresh")).toBe(1);
    expect(api.sessoesAtivasDe("operador@silva.local")).toBe(1);
  });

  it("restaura uma sessão salva a partir do token de renovação", async () => {
    await cliente.entrar("operador@silva.local", SENHA);
    const salvo = refreshs.at(-1)!;

    const reaberto = new ApiClient({ baseUrl: api.url });
    await reaberto.restaurar(salvo);
    expect((await reaberto.me()).nome).toBe("Operador Silva");
  });

  it("sessão recusada (usuário desativado) vira SESSAO_EXPIRADA e esquece os tokens", async () => {
    await cliente.entrar("operador@silva.local", SENHA);
    api.usuario("operador@silva.local").ativo = false;
    api.expirarTokensDeAcesso();

    expect(await codigoDe(cliente.me())).toBe("SESSAO_EXPIRADA");
    expect(cliente.autenticado).toBe(false);
    expect(refreshs.at(-1)).toBeNull();
  });

  it("sessão revogada na API impede a restauração", async () => {
    await cliente.entrar("operador@silva.local", SENHA);
    api.revogarSessoesDe("operador@silva.local");

    const reaberto = new ApiClient({ baseUrl: api.url });
    expect(await codigoDe(reaberto.restaurar(refreshs.at(-1)!))).toBe("SESSAO_EXPIRADA");
  });

  it("troca de senha: senha atual errada e política viram SENHA_INVALIDA com o campo", async () => {
    await cliente.entrar("operador@silva.local", SENHA);

    const errada = cliente.trocarSenha({ senhaAtual: "outra", novaSenha: "Nova#Senha2026" });
    await expect(errada).rejects.toMatchObject({
      codigo: "SENHA_INVALIDA",
      campos: { senhaAtual: "Senha atual incorreta" },
    });

    const igualEmail = cliente.trocarSenha({
      senhaAtual: SENHA,
      novaSenha: "operador@silva.local",
    });
    await expect(igualEmail).rejects.toMatchObject({
      codigo: "SENHA_INVALIDA",
      campos: { novaSenha: "A senha não pode ser igual ao e-mail" },
    });

    await cliente.trocarSenha({ senhaAtual: SENHA, novaSenha: "Nova#Senha2026" });
    expect(api.usuario("operador@silva.local").senha).toBe("Nova#Senha2026");
  });

  it("sair encerra a sessão na API e esquece os tokens", async () => {
    await cliente.entrar("operador@silva.local", SENHA);
    await cliente.sair();

    expect(api.sessoesAtivasDe("operador@silva.local")).toBe(0);
    expect(cliente.autenticado).toBe(false);
    expect(refreshs.at(-1)).toBeNull();
    expect(await codigoDe(cliente.me())).toBe("SESSAO_EXPIRADA");
  });

  it("API inacessível vira SEM_CONEXAO", async () => {
    await api.parar();
    api = await ApiSimulada.iniciar(); // para o afterEach
    const semApi = new ApiClient({ baseUrl: "http://127.0.0.1:9" });
    expect(await codigoDe(semApi.entrar("operador@silva.local", SENHA))).toBe("SEM_CONEXAO");
  });

  it("tempo esgotado vira SEM_CONEXAO", async () => {
    api.atrasoMs = 2_000;
    const lento = new ApiClient({ baseUrl: api.url, timeoutMs: 100 });
    expect(await codigoDe(lento.entrar("operador@silva.local", SENHA))).toBe("SEM_CONEXAO");
  });

  it("sair sem conexão apaga a sessão local mesmo assim", async () => {
    await cliente.entrar("operador@silva.local", SENHA);
    api.atrasoMs = 2_000;
    const lento = new ApiClient({ baseUrl: api.url, timeoutMs: 100 });
    await lento.restaurar(refreshs.at(-1)!).catch(() => {});
    await expect(lento.sair()).resolves.toBeUndefined();
    expect(lento.autenticado).toBe(false);
  });
});

describe("respostas fora do esperado", () => {
  async function servidor(status: number, corpo: string) {
    const s = createServer((_req, res) => {
      res.writeHead(status, { "content-type": "application/json" }).end(corpo);
    });
    await new Promise<void>((ok) => s.listen(0, "127.0.0.1", ok));
    const url = `http://127.0.0.1:${(s.address() as AddressInfo).port}`;
    return { url, parar: () => new Promise<void>((ok) => s.close(() => ok())) };
  }

  it.each([
    [200, '{"accessToken":1}', "ERRO_INESPERADO"],
    [200, "não é json", "ERRO_INESPERADO"],
    [500, '{"statusCode":500,"code":"ERRO_INTERNO","message":"falha"}', "ERRO_INESPERADO"],
    [502, "<html>Bad Gateway</html>", "SEM_CONEXAO"],
    [503, "", "SEM_CONEXAO"],
  ])("HTTP %i com corpo %j vira %s, sem expor a mensagem", async (status, corpo, codigo) => {
    const s = await servidor(status, corpo);
    try {
      const erro = await new ApiClient({ baseUrl: s.url }).entrar("a@b.local", "x").then(
        () => null,
        (e: unknown) => e,
      );
      expect(erro).toBeInstanceOf(ErroApiPdv);
      expect((erro as ErroApiPdv).codigo).toBe(codigo);
      expect((erro as ErroApiPdv).message).toBe(codigo);
    } finally {
      await s.parar();
    }
  });
});
