import { type ApiErro, apiErroSchema, tokensResponseSchema } from "@super-pdv/shared";
import type { z } from "zod";
import { apiUrl, type ConfigSessao } from "./config";
import { type ArmazemCookies, gravarTokens, limparTokens } from "./cookies";

/** Erro devolvido pela API (formato padrão `{ statusCode, code, message, fieldErrors? }`). */
export class ErroDaApi extends Error {
  constructor(
    readonly status: number,
    readonly corpo: ApiErro,
  ) {
    super(corpo.message);
  }
}

export interface OpcoesRequisicao<S extends z.ZodType | undefined> {
  corpo?: unknown;
  /** Valida a resposta com o schema de @super-pdv/shared. */
  schema?: S;
  /** Envia sem token (rotas públicas). */
  publica?: boolean;
}

type Retorno<S> = S extends z.ZodType ? z.output<S> : unknown;

/**
 * Cliente da API para uso no SERVIDOR do Next (Server Components, Server Actions,
 * Route Handlers). Os tokens ficam em cookies `httpOnly`; o navegador nunca fala
 * com a API. Em 401, renova a sessão uma vez e repete a chamada.
 */
export class ClienteApi {
  constructor(
    private readonly config: ConfigSessao,
    private readonly cookies: ArmazemCookies,
    private readonly fetchFn: typeof fetch = fetch,
    private readonly baseUrl: string = apiUrl(),
  ) {}

  async requisitar<S extends z.ZodType | undefined = undefined>(
    metodo: "GET" | "POST" | "PATCH",
    caminho: string,
    opcoes: OpcoesRequisicao<S> = {},
  ): Promise<Retorno<S>> {
    let res = await this.enviar(metodo, caminho, opcoes);
    if (res.status === 401 && !opcoes.publica && (await this.renovar())) {
      res = await this.enviar(metodo, caminho, opcoes);
    }
    const texto = await res.text();
    const json: unknown = texto ? JSON.parse(texto) : undefined;
    if (!res.ok) {
      const erro = apiErroSchema.safeParse(json);
      throw new ErroDaApi(
        res.status,
        erro.success
          ? erro.data
          : { statusCode: res.status, code: "ERRO_INTERNO", message: "Erro inesperado da API" },
      );
    }
    return (opcoes.schema ? opcoes.schema.parse(json) : json) as Retorno<S>;
  }

  /** Troca o token de renovação por um par novo. Devolve `false` se a sessão acabou. */
  async renovar(): Promise<boolean> {
    const refreshToken = this.cookies.get(this.config.cookies.renovacao)?.value;
    if (!refreshToken) return false;
    const res = await this.fetchFn(`${this.baseUrl}${this.config.rotasAuth}/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    if (!res.ok) {
      this.tentar(() => limparTokens(this.cookies, this.config));
      return false;
    }
    const tokens = tokensResponseSchema.parse(await res.json());
    // Em Server Components os cookies são somente leitura; o proxy.ts cuida da renovação ali.
    this.tentar(() => gravarTokens(this.cookies, this.config, tokens));
    this.acessoEmMemoria = tokens.accessToken;
    return true;
  }

  private acessoEmMemoria?: string;

  private enviar(metodo: string, caminho: string, opcoes: OpcoesRequisicao<z.ZodType | undefined>) {
    const token = this.acessoEmMemoria ?? this.cookies.get(this.config.cookies.acesso)?.value;
    const headers: Record<string, string> = {};
    if (opcoes.corpo !== undefined) headers["Content-Type"] = "application/json";
    if (token && !opcoes.publica) headers.Authorization = `Bearer ${token}`;
    return this.fetchFn(`${this.baseUrl}${caminho}`, {
      method: metodo,
      headers,
      body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
      cache: "no-store",
    });
  }

  private tentar(fn: () => void): void {
    try {
      fn();
    } catch {
      // cookies() somente leitura (Server Component): ignorado.
    }
  }
}
