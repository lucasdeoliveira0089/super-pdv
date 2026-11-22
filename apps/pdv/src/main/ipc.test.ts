import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ApiSimulada, empresaSimulada } from "../../test/api-simulada";
import { cifradorDeTeste } from "../../test/cifrador";
import { type InicioPdv, IpcChannel, type Resultado, type SessaoPdv } from "../shared/ipc";
import { type DependenciasIpc, registrarIpc } from "./ipc";
import { ServicoSessao } from "./sessao";
import { type Cifrador, SessionStore } from "./session-store";

const SENHA = "Senha#Forte2026";

type Handler = (evento: unknown, ...args: unknown[]) => unknown;

/** Simula o PDV: processo principal com os canais IPC registrados. */
class PdvDeTeste {
  readonly handlers = new Map<string, Handler>();
  readonly respostas: unknown[] = [];
  readonly store: SessionStore;
  aberturasRecuperacao = 0;

  constructor(apiUrl: string, dir: string, cifrador: Cifrador) {
    this.store = new SessionStore(dir, cifrador);
    const deps: DependenciasIpc = {
      sessao: new ServicoSessao({ apiUrl, store: this.store, timeoutMs: 500 }),
      localDbStatus: () => ({ status: "operante", sqliteVersion: "3.0.0" }),
      abrirRecuperacaoSenha: async () => {
        this.aberturasRecuperacao++;
      },
    };
    registrarIpc({ handle: (canal, h) => this.handlers.set(canal, h) }, deps);
  }

  /** Chama um canal como o renderer faria e guarda a resposta serializada. */
  async invocar<T>(canal: string, ...args: unknown[]): Promise<T> {
    const handler = this.handlers.get(canal);
    if (!handler) throw new Error(`Canal não registrado: ${canal}`);
    // O IPC serializa as respostas (structured clone): o mesmo vale aqui.
    const resposta = structuredClone(await handler({}, ...args)) as T;
    this.respostas.push(resposta);
    return resposta;
  }

  obter = () => this.invocar<InicioPdv>(IpcChannel.SessaoObter);
  entrar = (email: string, senha = SENHA) =>
    this.invocar<Resultado<SessaoPdv>>(IpcChannel.AuthEntrar, email, senha);
  escolher = (id: string) => this.invocar<Resultado<SessaoPdv>>(IpcChannel.EmpresaEscolher, id);
  trocarSenha = (atual: string, nova: string) =>
    this.invocar<Resultado<SessaoPdv>>(IpcChannel.AuthTrocarSenha, atual, nova);
  sair = () => this.invocar<void>(IpcChannel.AuthSair);
}

function valor(r: Resultado<SessaoPdv>): SessaoPdv {
  if (!r.ok) throw new Error(`Falhou: ${r.erro.codigo}`);
  return r.valor;
}

describe("canais IPC e sessão do PDV", () => {
  let api: ApiSimulada;
  let dir: string;
  let cifrador: Cifrador;
  const centro = empresaSimulada("Mercado Silva Centro");
  const norte = empresaSimulada("Mercado Silva Norte", { cnpj: "12ABC34501DE35" });
  const sul = empresaSimulada("Mercado Silva Sul");
  const pdvs: PdvDeTeste[] = [];

  /** Abre o PDV (de novo) sobre a mesma pasta de dados: simula um reinício. */
  const abrirPdv = (apiUrl = api.url) => {
    const pdv = new PdvDeTeste(apiUrl, dir, cifrador);
    pdvs.push(pdv);
    return pdv;
  };

  beforeEach(async () => {
    api = await ApiSimulada.iniciar();
    dir = mkdtempSync(join(tmpdir(), "super-pdv-ipc-"));
    cifrador = cifradorDeTeste();
    api.adicionarUsuario({
      email: "operador@silva.local",
      senha: SENHA,
      nome: "Operador Silva",
      empresas: [centro],
    });
    api.adicionarUsuario({
      email: "dono@silva.local",
      senha: SENHA,
      nome: "Dono Silva",
      papel: "dono",
      empresas: [centro, norte, sul],
    });
  });

  afterEach(async () => {
    // Nenhuma resposta entregue à interface contém um token emitido pela API.
    const tudo = JSON.stringify(pdvs.flatMap((p) => p.respostas));
    for (const token of api.tokensEmitidos) expect(tudo).not.toContain(token);
    expect(tudo).not.toMatch(/token/i);
    expect(api.violacoes).toEqual([]);
    pdvs.length = 0;
    await api.parar();
    rmSync(dir, { recursive: true, force: true });
  });

  it("registra todos os canais do preload", () => {
    const pdv = abrirPdv();
    expect([...pdv.handlers.keys()].sort()).toEqual(Object.values(IpcChannel).sort());
  });

  describe("inicialização (D4)", () => {
    it("sem sessão salva: login", async () => {
      expect(await abrirPdv().obter()).toEqual({ sessao: null, semConexao: false });
    });

    it("sessão salva válida: principal na empresa escolhida", async () => {
      const pdv = abrirPdv();
      await pdv.obter();
      valor(await pdv.entrar("dono@silva.local"));
      valor(await pdv.escolher(norte.id));

      const reaberto = await abrirPdv().obter();
      expect(reaberto.semConexao).toBe(false);
      expect(reaberto.sessao?.usuario.nome).toBe("Dono Silva");
      expect(reaberto.sessao?.empresaId).toBe(norte.id);
    });

    it("empresa salva não mais disponível: volta à escolha de empresa", async () => {
      const pdv = abrirPdv();
      valor(await pdv.entrar("dono@silva.local"));
      valor(await pdv.escolher(norte.id));
      api.usuario("dono@silva.local").empresas = [centro, { ...norte, ativa: false }, sul];

      const reaberto = await abrirPdv().obter();
      expect(reaberto.sessao?.empresaId).toBeNull();
      expect(reaberto.sessao?.empresas.map((e) => e.nomeFantasia)).toEqual([
        "Mercado Silva Centro",
        "Mercado Silva Sul",
      ]);
    });

    it("sessão recusada pela API (401): apaga a sessão salva e mostra o login", async () => {
      const pdv = abrirPdv();
      valor(await pdv.entrar("operador@silva.local"));
      api.usuario("operador@silva.local").ativo = false;

      expect(await abrirPdv().obter()).toEqual({ sessao: null, semConexao: false });
      expect(existsSync(pdv.store.path)).toBe(false);
    });

    it("cliente suspenso: também volta ao login", async () => {
      valor(await abrirPdv().entrar("operador@silva.local"));
      api.clienteSuspenso = true;
      expect((await abrirPdv().obter()).sessao).toBeNull();
    });

    it("sem conexão: login com aviso, mantendo a sessão salva para depois", async () => {
      const pdv = abrirPdv();
      valor(await pdv.entrar("operador@silva.local"));

      const offline = await abrirPdv("http://127.0.0.1:9").obter();
      expect(offline).toEqual({ sessao: null, semConexao: true });
      expect(existsSync(pdv.store.path)).toBe(true);

      // Com a conexão de volta, a sessão é restaurada.
      expect((await abrirPdv().obter()).sessao?.usuario.nome).toBe("Operador Silva");
    });
  });

  describe("login e empresa", () => {
    it("uma empresa: escolhida automaticamente", async () => {
      const s = valor(await abrirPdv().entrar("operador@silva.local"));
      expect(s.empresaId).toBe(centro.id);
      expect(s.cliente.nome).toBe("Mercado Silva");
    });

    it("várias empresas: nenhuma escolhida até o usuário escolher", async () => {
      const pdv = abrirPdv();
      const s = valor(await pdv.entrar("dono@silva.local"));
      expect(s.empresaId).toBeNull();
      expect(s.empresas).toHaveLength(3);
      expect(valor(await pdv.escolher(sul.id)).empresaId).toBe(sul.id);
    });

    it("não aceita empresa fora da lista do usuário", async () => {
      const pdv = abrirPdv();
      valor(await pdv.entrar("operador@silva.local"));
      const r = await pdv.escolher(norte.id);
      expect(r).toEqual({ ok: false, erro: { codigo: "ERRO_INESPERADO" } });
    });

    it("credenciais inválidas e argumentos malformados do renderer", async () => {
      const pdv = abrirPdv();
      expect(await pdv.entrar("operador@silva.local", "errada")).toEqual({
        ok: false,
        erro: { codigo: "CREDENCIAIS_INVALIDAS" },
      });
      expect(await pdv.invocar(IpcChannel.AuthEntrar, { email: 1 }, null)).toEqual({
        ok: false,
        erro: { codigo: "CREDENCIAIS_INVALIDAS" },
      });
      expect(await pdv.invocar(IpcChannel.AuthTrocarSenha, 1, 2)).toMatchObject({ ok: false });
      expect(await pdv.invocar(IpcChannel.EmpresaEscolher, { id: 1 })).toMatchObject({
        ok: false,
      });
    });

    it("API inacessível no login: SEM_CONEXAO", async () => {
      const pdv = abrirPdv("http://127.0.0.1:9");
      expect(await pdv.entrar("operador@silva.local")).toEqual({
        ok: false,
        erro: { codigo: "SEM_CONEXAO" },
      });
    });
  });

  it("senha temporária: troca antes de seguir, com erros por campo", async () => {
    api.usuario("operador@silva.local").senhaTemporaria = true;
    const pdv = abrirPdv();
    const s = valor(await pdv.entrar("operador@silva.local"));
    expect(s.usuario.senhaTemporaria).toBe(true);
    // Não escolhe empresa com a senha temporária.
    expect((await pdv.escolher(centro.id)).ok).toBe(false);

    expect(await pdv.trocarSenha("errada", "Nova#Senha2026")).toEqual({
      ok: false,
      erro: { codigo: "SENHA_INVALIDA", campos: { senhaAtual: "Senha atual incorreta" } },
    });
    const trocada = valor(await pdv.trocarSenha(SENHA, "Nova#Senha2026"));
    expect(trocada.usuario.senhaTemporaria).toBe(false);
    expect(trocada.empresaId).toBe(centro.id);
  });

  it("sair encerra a sessão na API e, ao reabrir, não a restaura", async () => {
    const pdv = abrirPdv();
    valor(await pdv.entrar("operador@silva.local"));
    await pdv.sair();

    expect(api.sessoesAtivasDe("operador@silva.local")).toBe(0);
    expect(existsSync(pdv.store.path)).toBe(false);
    expect(await abrirPdv().obter()).toEqual({ sessao: null, semConexao: false });
  });

  it("sessão revogada durante o uso: SESSAO_EXPIRADA e sessão apagada", async () => {
    const pdv = abrirPdv();
    valor(await pdv.entrar("dono@silva.local"));
    api.revogarSessoesDe("dono@silva.local");
    api.expirarTokensDeAcesso();

    expect(await pdv.escolher(norte.id)).toEqual({
      ok: false,
      erro: { codigo: "SESSAO_EXPIRADA" },
    });
    expect(existsSync(pdv.store.path)).toBe(false);
    expect((await pdv.obter()).sessao).toBeNull();
  });

  it("abre a recuperação de senha pelo canal próprio", async () => {
    const pdv = abrirPdv();
    await pdv.invocar(IpcChannel.AbrirRecuperacaoSenha);
    expect(pdv.aberturasRecuperacao).toBe(1);
  });
});
