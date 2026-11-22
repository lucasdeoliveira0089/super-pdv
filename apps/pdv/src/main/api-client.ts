import {
  apiErroSchema,
  type MeResponse,
  meResponseSchema,
  type TokensResponse,
  tokensResponseSchema,
  type TrocarSenhaRequest,
} from "@super-pdv/shared";
import type { z } from "zod";
import type { CodigoErroPdv, ErroPdv } from "../shared/ipc";

// Cliente HTTP da API no processo principal (D1). Guarda o token de acesso só em
// memória, renova uma única vez em 401 e converte toda falha em um código.

export class ErroApiPdv extends Error implements ErroPdv {
  constructor(
    readonly codigo: CodigoErroPdv,
    readonly campos?: ErroPdv["campos"],
  ) {
    super(codigo);
    this.name = "ErroApiPdv";
  }
}

export interface OpcoesApiClient {
  baseUrl: string;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
  /** Chamado a cada novo token de renovação (rotação) e com `null` ao encerrar. */
  aoMudarRefreshToken?: (refreshToken: string | null) => void;
}

type Contexto = "login" | "autenticado" | "renovacao" | "senha";

export class ApiClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetch: typeof globalThis.fetch;
  private readonly aoMudarRefreshToken: (rt: string | null) => void;

  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  /** Renovação em andamento: chamadas simultâneas reaproveitam a mesma. */
  private renovando: Promise<void> | null = null;

  constructor(opcoes: OpcoesApiClient) {
    this.baseUrl = opcoes.baseUrl.replace(/\/+$/, "");
    this.timeoutMs = opcoes.timeoutMs ?? 10_000;
    this.fetch = opcoes.fetch ?? globalThis.fetch;
    this.aoMudarRefreshToken = opcoes.aoMudarRefreshToken ?? (() => {});
  }

  get autenticado(): boolean {
    return this.refreshToken !== null;
  }

  /** Login com e-mail e senha; guarda os tokens. */
  async entrar(email: string, senha: string): Promise<void> {
    const tokens = await this.requisitar(
      "POST",
      "/v1/auth/login",
      { email, senha },
      tokensResponseSchema,
      "login",
    );
    this.guardar(tokens);
  }

  /** Retoma uma sessão salva: renova os tokens a partir do token de renovação. */
  async restaurar(refreshToken: string): Promise<void> {
    this.refreshToken = refreshToken;
    this.accessToken = null;
    await this.renovar();
  }

  me(): Promise<MeResponse> {
    return this.comAutenticacao(() => [
      "GET",
      "/v1/me",
      undefined,
      meResponseSchema,
      "autenticado",
    ]);
  }

  async trocarSenha(req: TrocarSenhaRequest): Promise<void> {
    await this.comAutenticacao(() => ["POST", "/v1/auth/senha", req, null, "senha"]);
  }

  /** Encerra a sessão na API (melhor esforço) e esquece os tokens. */
  async sair(): Promise<void> {
    const rt = this.refreshToken;
    this.limpar();
    if (!rt) return;
    try {
      await this.requisitar("POST", "/v1/auth/logout", { refreshToken: rt }, null, "renovacao");
    } catch {
      // Sem conexão: a sessão local já foi apagada; a da API expira sozinha.
    }
  }

  /** Esquece os tokens sem chamar a API. */
  limpar(): void {
    const tinha = this.refreshToken !== null;
    this.accessToken = null;
    this.refreshToken = null;
    if (tinha) this.aoMudarRefreshToken(null);
  }

  // ------------------------------------------------------------ interno

  private guardar(tokens: TokensResponse): void {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.aoMudarRefreshToken(tokens.refreshToken);
  }

  private renovar(): Promise<void> {
    this.renovando ??= (async () => {
      const rt = this.refreshToken;
      if (!rt) throw new ErroApiPdv("SESSAO_EXPIRADA");
      try {
        const tokens = await this.requisitar(
          "POST",
          "/v1/auth/refresh",
          { refreshToken: rt },
          tokensResponseSchema,
          "renovacao",
        );
        this.guardar(tokens);
      } catch (erro) {
        if (erro instanceof ErroApiPdv && erro.codigo === "SESSAO_EXPIRADA") this.limpar();
        throw erro;
      }
    })().finally(() => {
      this.renovando = null;
    });
    return this.renovando;
  }

  /** Executa uma chamada autenticada, renovando o token uma vez em 401. */
  private async comAutenticacao<T>(
    montar: () => [string, string, unknown, z.ZodType<T> | null, Contexto],
  ): Promise<T> {
    if (!this.refreshToken) throw new ErroApiPdv("SESSAO_EXPIRADA");
    if (!this.accessToken) await this.renovar();
    const usado = this.accessToken;
    try {
      return await this.requisitar(...montar());
    } catch (erro) {
      if (!(erro instanceof NaoAutorizado)) throw erro;
    }
    // Se outra chamada já renovou enquanto esta aguardava, basta repetir.
    if (this.accessToken === usado) await this.renovar();
    try {
      return await this.requisitar(...montar());
    } catch (erro) {
      if (!(erro instanceof NaoAutorizado)) throw erro;
      this.limpar();
      throw new ErroApiPdv("SESSAO_EXPIRADA");
    }
  }

  private async requisitar<T>(
    metodo: string,
    caminho: string,
    corpo: unknown,
    schema: z.ZodType<T> | null,
    contexto: Contexto,
  ): Promise<T> {
    const headers: Record<string, string> = { accept: "application/json" };
    if (corpo !== undefined) headers["content-type"] = "application/json";
    if ((contexto === "autenticado" || contexto === "senha") && this.accessToken) {
      headers.authorization = `Bearer ${this.accessToken}`;
    }

    let resposta: Response;
    try {
      resposta = await this.fetch(`${this.baseUrl}${caminho}`, {
        method: metodo,
        headers,
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      // Falha de rede, DNS, recusa de conexão ou tempo esgotado.
      throw new ErroApiPdv("SEM_CONEXAO");
    }

    const json: unknown = await resposta.json().catch(() => undefined);
    if (resposta.ok) {
      if (!schema) return undefined as T;
      const r = schema.safeParse(json);
      if (!r.success) throw new ErroApiPdv("ERRO_INESPERADO");
      return r.data;
    }
    throw mapearErro(resposta.status, json, contexto);
  }
}

/** 401 em chamada autenticada: sinal interno para renovar e repetir. */
class NaoAutorizado extends Error {}

function mapearErro(status: number, json: unknown, contexto: Contexto): Error {
  const erro = apiErroSchema.safeParse(json);
  const code = erro.success ? erro.data.code : undefined;

  if (code === "BLOQUEADO" || code === "MUITAS_REQUISICOES" || status === 429) {
    return new ErroApiPdv("BLOQUEADO");
  }
  if (contexto === "login" && (status === 401 || status === 400)) {
    return new ErroApiPdv("CREDENCIAIS_INVALIDAS");
  }
  if (contexto === "renovacao" && (status === 401 || status === 400)) {
    return new ErroApiPdv("SESSAO_EXPIRADA");
  }
  if (contexto === "senha" && status === 400 && erro.success) {
    const f = erro.data.fieldErrors ?? {};
    return new ErroApiPdv("SENHA_INVALIDA", {
      senhaAtual: f.senhaAtual?.[0],
      novaSenha: f.novaSenha?.[0] ?? (f.senhaAtual ? undefined : erro.data.message),
    });
  }
  if (contexto === "autenticado" || contexto === "senha") {
    if (status === 401) return new NaoAutorizado();
    if (status === 403 && code === "SEM_PERMISSAO") return new ErroApiPdv("SEM_PERMISSAO");
  }
  // Proxy ou balanceador sem a API por trás: equivale a estar sem conexão.
  if (status === 502 || status === 503 || status === 504) return new ErroApiPdv("SEM_CONEXAO");
  return new ErroApiPdv("ERRO_INESPERADO");
}
