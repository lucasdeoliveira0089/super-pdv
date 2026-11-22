import { loginRequestSchema, type MeResponse } from "@super-pdv/shared";
import type { InicioPdv, Resultado, SessaoPdv } from "../shared/ipc";
import { ApiClient, ErroApiPdv } from "./api-client";
import type { SessionStore } from "./session-store";

// Sessão do PDV no processo principal: combina o cliente da API (tokens em
// memória) e o armazenamento cifrado (token de renovação e empresa escolhida).
// Tudo o que sai daqui para a interface é um `SessaoPdv`, sem tokens.

export interface OpcoesSessao {
  apiUrl: string;
  store: SessionStore;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
}

export class ServicoSessao {
  private readonly api: ApiClient;
  private readonly store: SessionStore;
  private refreshToken: string | null = null;
  private me: MeResponse | null = null;
  private empresaId: string | null = null;
  private semConexao = false;
  private inicio: Promise<void> | null = null;

  constructor(opcoes: OpcoesSessao) {
    this.store = opcoes.store;
    this.api = new ApiClient({
      baseUrl: opcoes.apiUrl,
      timeoutMs: opcoes.timeoutMs,
      fetch: opcoes.fetch,
      aoMudarRefreshToken: (rt) => {
        this.refreshToken = rt;
        this.persistir();
      },
    });
  }

  /** Sessão atual; na primeira chamada, restaura a sessão salva (D4). */
  async obter(): Promise<InicioPdv> {
    await (this.inicio ??= this.iniciar());
    return { sessao: this.visao(), semConexao: this.semConexao };
  }

  entrar(email: unknown, senha: unknown): Promise<Resultado<SessaoPdv>> {
    return this.executar(async () => {
      await (this.inicio ??= this.iniciar());
      const req = loginRequestSchema.safeParse({ email, senha });
      if (!req.success) throw new ErroApiPdv("CREDENCIAIS_INVALIDAS");
      this.empresaId = null;
      await this.api.entrar(req.data.email, req.data.senha);
      await this.carregarUsuario();
      this.semConexao = false;
    });
  }

  trocarSenha(senhaAtual: unknown, novaSenha: unknown): Promise<Resultado<SessaoPdv>> {
    return this.executar(async () => {
      if (typeof senhaAtual !== "string" || typeof novaSenha !== "string") {
        throw new ErroApiPdv("SENHA_INVALIDA");
      }
      if (!this.me) throw new ErroApiPdv("SESSAO_EXPIRADA");
      await this.api.trocarSenha({ senhaAtual, novaSenha });
      await this.carregarUsuario();
    });
  }

  escolherEmpresa(empresaId: unknown): Promise<Resultado<SessaoPdv>> {
    return this.executar(async () => {
      if (!this.me) throw new ErroApiPdv("SESSAO_EXPIRADA");
      try {
        // Lista atualizada: a empresa pode ter sido inativada desde o login.
        await this.carregarUsuario();
      } catch (erro) {
        if (!(erro instanceof ErroApiPdv && erro.codigo === "SEM_CONEXAO")) throw erro;
      }
      if (this.me.senhaTemporaria || !this.me.empresas.some((e) => e.id === empresaId)) {
        throw new ErroApiPdv("ERRO_INESPERADO");
      }
      this.empresaId = empresaId as string;
      this.persistir();
    });
  }

  /** Encerra a sessão na API (se houver conexão) e apaga a sessão do computador. */
  async sair(): Promise<void> {
    await this.api.sair();
    this.limpar();
  }

  // ------------------------------------------------------------ interno

  private async iniciar(): Promise<void> {
    const salva = this.store.carregar();
    if (!salva) return;
    this.empresaId = salva.empresaId;
    try {
      await this.api.restaurar(salva.refreshToken);
      await this.carregarUsuario();
    } catch (erro) {
      const codigo = erro instanceof ErroApiPdv ? erro.codigo : "ERRO_INESPERADO";
      if (codigo === "SEM_CONEXAO") {
        // Mantém a sessão salva para a próxima abertura com conexão.
        this.semConexao = true;
        this.me = null;
        return;
      }
      // Sessão recusada pela API (usuário desativado, cliente suspenso, revogada).
      this.api.limpar();
      this.limpar();
    }
  }

  /** Atualiza o usuário e mantém a empresa escolhida coerente com a lista. */
  private async carregarUsuario(): Promise<void> {
    const me = await this.api.me();
    if (!me.permissoes.includes("pdv.operar")) {
      await this.api.sair();
      this.limpar();
      throw new ErroApiPdv("SEM_PERMISSAO");
    }
    this.me = me;
    if (!me.empresas.some((e) => e.id === this.empresaId)) this.empresaId = null;
    if (me.empresas.length === 1) this.empresaId = me.empresas[0]!.id;
    this.persistir();
  }

  private persistir(): void {
    if (this.refreshToken) {
      this.store.salvar({ refreshToken: this.refreshToken, empresaId: this.empresaId });
    } else {
      this.store.apagar();
    }
  }

  private limpar(): void {
    this.me = null;
    this.empresaId = null;
    this.refreshToken = null;
    this.store.apagar();
  }

  private visao(): SessaoPdv | null {
    const me = this.me;
    if (!me) return null;
    return {
      usuario: {
        nome: me.nome,
        email: me.email,
        papel: me.papel,
        senhaTemporaria: me.senhaTemporaria,
      },
      cliente: { nome: me.cliente.nome },
      empresas: me.empresas.map(({ id, cnpj, razaoSocial, nomeFantasia }) => ({
        id,
        cnpj,
        razaoSocial,
        nomeFantasia,
      })),
      empresaId: this.empresaId,
    };
  }

  private async executar(acao: () => Promise<void>): Promise<Resultado<SessaoPdv>> {
    try {
      await acao();
      const sessao = this.visao();
      if (!sessao) return { ok: false, erro: { codigo: "SESSAO_EXPIRADA" } };
      return { ok: true, valor: sessao };
    } catch (erro) {
      if (!(erro instanceof ErroApiPdv)) {
        console.error("Erro inesperado na sessão do PDV:", erro);
        return { ok: false, erro: { codigo: "ERRO_INESPERADO" } };
      }
      if (erro.codigo === "SESSAO_EXPIRADA") this.limpar();
      return {
        ok: false,
        erro: { codigo: erro.codigo, ...(erro.campos ? { campos: erro.campos } : {}) },
      };
    }
  }
}
