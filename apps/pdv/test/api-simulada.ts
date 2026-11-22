import { randomBytes, randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import {
  apiErroSchema,
  type CodigoErro,
  type EmpresaResumo,
  loginRequestSchema,
  meResponseSchema,
  type Papel,
  PERMISSOES_POR_PAPEL,
  refreshRequestSchema,
  tokensResponseSchema,
  trocarSenhaRequestSchema,
  validarSenha,
} from "@super-pdv/shared";
import type { z } from "zod";

// Servidor simulado da API (D6) para os testes do PDV, que rodam no Windows sem
// containers. Implementa só as rotas usadas pelo PDV e valida requisições e
// respostas com os mesmos schemas de `packages/shared` usados pela API real.
// Regras espelhadas da API: mensagem genérica de login, bloqueio após 5 falhas,
// rotação do token de renovação com detecção de reuso e sessão recusada para
// usuário desativado ou cliente suspenso.

export interface UsuarioSimulado {
  id: string;
  nome: string;
  email: string;
  senha: string;
  papel: Papel;
  senhaTemporaria: boolean;
  ativo: boolean;
  empresas: (EmpresaResumo & { ativa: boolean })[];
}

interface Sessao {
  id: string;
  email: string;
  refreshAtual: string;
  refreshAnteriores: Set<string>;
  revogada: boolean;
}

export interface RequisicaoRegistrada {
  metodo: string;
  caminho: string;
  autorizacao?: string;
}

export const CLIENTE_SIMULADO = { id: randomUUID(), nome: "Mercado Silva" };
const FALHAS_ATE_BLOQUEIO = 5;

/** Empresa de teste; o CNPJ padrão é válido (dígitos verificadores). */
export function empresaSimulada(
  nomeFantasia: string,
  dados: Partial<EmpresaResumo & { ativa: boolean }> = {},
): UsuarioSimulado["empresas"][number] {
  return {
    id: randomUUID(),
    cnpj: "11222333000181",
    razaoSocial: `${nomeFantasia} Ltda`,
    nomeFantasia,
    ativa: true,
    ...dados,
  };
}

export class ApiSimulada {
  readonly requisicoes: RequisicaoRegistrada[] = [];
  /** Respostas que não obedeceram aos contratos (os testes exigem lista vazia). */
  readonly violacoes: string[] = [];
  /** Atraso aplicado a todas as respostas (simula servidor lento). */
  atrasoMs = 0;
  clienteSuspenso = false;

  private readonly usuarios = new Map<string, UsuarioSimulado>();
  private readonly sessoes = new Map<string, Sessao>();
  private readonly acessos = new Map<string, string>(); // token de acesso -> sessão
  private readonly falhas = new Map<string, number>();

  private constructor(
    private readonly servidor: Server,
    readonly url: string,
  ) {}

  static async iniciar(): Promise<ApiSimulada> {
    const servidor = createServer();
    await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", ok));
    const { port } = servidor.address() as AddressInfo;
    const api = new ApiSimulada(servidor, `http://127.0.0.1:${port}`);
    servidor.on("request", (req, res) => void api.atender(req, res));
    return api;
  }

  async parar(): Promise<void> {
    this.servidor.closeAllConnections();
    await new Promise<void>((ok) => this.servidor.close(() => ok()));
  }

  // ------------------------------------------------------- controle nos testes

  adicionarUsuario(
    dados: Partial<UsuarioSimulado> & Pick<UsuarioSimulado, "email" | "senha">,
  ): UsuarioSimulado {
    const usuario: UsuarioSimulado = {
      id: randomUUID(),
      nome: "Usuário de Teste",
      papel: "operador",
      senhaTemporaria: false,
      ativo: true,
      empresas: [],
      ...dados,
      email: dados.email.toLowerCase(),
    };
    this.usuarios.set(usuario.email, usuario);
    return usuario;
  }

  usuario(email: string): UsuarioSimulado {
    const u = this.usuarios.get(email.toLowerCase());
    if (!u) throw new Error(`Usuário simulado inexistente: ${email}`);
    return u;
  }

  /** Revoga as sessões do usuário (como "encerrar sessões" na API). */
  revogarSessoesDe(email: string): void {
    for (const s of this.sessoes.values()) if (s.email === email.toLowerCase()) s.revogada = true;
  }

  /** Invalida todos os tokens de acesso emitidos (como se tivessem expirado). */
  expirarTokensDeAcesso(): void {
    this.acessos.clear();
  }

  sessoesAtivasDe(email: string): number {
    return [...this.sessoes.values()].filter((s) => s.email === email.toLowerCase() && !s.revogada)
      .length;
  }

  /** Todos os tokens já emitidos (para verificar que não vazam para a interface). */
  readonly tokensEmitidos = new Set<string>();

  contar(caminho: string): number {
    return this.requisicoes.filter((r) => r.caminho === caminho).length;
  }

  // ------------------------------------------------------------------- rotas

  private async atender(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const caminho = (req.url ?? "/").split("?")[0]!;
    const metodo = req.method ?? "GET";
    this.requisicoes.push({ metodo, caminho, autorizacao: req.headers.authorization });
    const corpo = await lerCorpo(req);
    if (this.atrasoMs) await new Promise((r) => setTimeout(r, this.atrasoMs));
    if (res.destroyed) return;

    try {
      const rota = `${metodo} ${caminho}`;
      switch (rota) {
        case "POST /v1/auth/login":
          return this.login(res, corpo);
        case "POST /v1/auth/refresh":
          return this.renovar(res, corpo);
        case "POST /v1/auth/logout":
          return this.sair(res, corpo);
        case "POST /v1/auth/senha":
          return this.trocarSenha(req, res, corpo);
        case "GET /v1/me":
          return this.me(req, res);
        default:
          return this.erro(res, 404, "NAO_ENCONTRADO", "Recurso não encontrado");
      }
    } catch (e) {
      this.violacoes.push(`Erro no servidor simulado: ${String(e)}`);
      this.erro(res, 500, "ERRO_INTERNO", "Erro interno");
    }
  }

  private login(res: ServerResponse, corpo: unknown): void {
    const req = this.validar(res, loginRequestSchema, corpo);
    if (!req) return;
    if ((this.falhas.get(req.email) ?? 0) >= FALHAS_ATE_BLOQUEIO) {
      return this.erro(
        res,
        429,
        "BLOQUEADO",
        "Muitas tentativas de login. Tente novamente em 15 minutos.",
      );
    }
    const u = this.usuarios.get(req.email);
    if (!u || u.senha !== req.senha || !u.ativo || this.clienteSuspenso) {
      this.falhas.set(req.email, (this.falhas.get(req.email) ?? 0) + 1);
      return this.erro(res, 401, "CREDENCIAIS_INVALIDAS", "E-mail ou senha inválidos");
    }
    this.falhas.delete(req.email);
    const sessao: Sessao = {
      id: randomUUID(),
      email: u.email,
      refreshAtual: "",
      refreshAnteriores: new Set(),
      revogada: false,
    };
    this.sessoes.set(sessao.id, sessao);
    this.emitir(res, sessao);
  }

  private renovar(res: ServerResponse, corpo: unknown): void {
    const req = this.validar(res, refreshRequestSchema, corpo);
    if (!req) return;
    const sessao = [...this.sessoes.values()].find(
      (s) => s.refreshAtual === req.refreshToken || s.refreshAnteriores.has(req.refreshToken),
    );
    if (!sessao || sessao.revogada || !this.titularAtivo(sessao)) {
      return this.erro(res, 401, "NAO_AUTENTICADO", "Sessão inválida ou expirada");
    }
    if (sessao.refreshAtual !== req.refreshToken) {
      // Reuso de um token já rotacionado: a API revoga a sessão inteira.
      sessao.revogada = true;
      return this.erro(res, 401, "NAO_AUTENTICADO", "Sessão inválida ou expirada");
    }
    sessao.refreshAnteriores.add(sessao.refreshAtual);
    this.emitir(res, sessao);
  }

  private sair(res: ServerResponse, corpo: unknown): void {
    const req = this.validar(res, refreshRequestSchema, corpo);
    if (!req) return;
    for (const s of this.sessoes.values())
      if (s.refreshAtual === req.refreshToken) s.revogada = true;
    this.enviar(res, 204);
  }

  private trocarSenha(req: IncomingMessage, res: ServerResponse, corpo: unknown): void {
    const sessao = this.autenticar(req, res);
    if (!sessao) return;
    const dados = this.validar(res, trocarSenhaRequestSchema, corpo);
    if (!dados) return;
    const u = this.usuario(sessao.email);
    if (dados.senhaAtual !== u.senha) {
      return this.erro(res, 400, "VALIDACAO", "Senha atual incorreta", {
        senhaAtual: ["Senha atual incorreta"],
      });
    }
    const problema = validarSenha(dados.novaSenha, u.email);
    if (problema) return this.erro(res, 400, "VALIDACAO", problema, { novaSenha: [problema] });
    u.senha = dados.novaSenha;
    u.senhaTemporaria = false;
    // Como a API: encerra as outras sessões do usuário, mantendo a atual.
    for (const s of this.sessoes.values()) {
      if (s.email === u.email && s.id !== sessao.id) s.revogada = true;
    }
    this.enviar(res, 204);
  }

  private me(req: IncomingMessage, res: ServerResponse): void {
    const sessao = this.autenticar(req, res);
    if (!sessao) return;
    const u = this.usuario(sessao.email);
    this.responder(res, 200, meResponseSchema, {
      id: u.id,
      nome: u.nome,
      email: u.email,
      papel: u.papel,
      senhaTemporaria: u.senhaTemporaria,
      permissoes: [...PERMISSOES_POR_PAPEL[u.papel]],
      cliente: CLIENTE_SIMULADO,
      empresas: u.empresas
        .filter((e) => e.ativa)
        .map(({ ativa: _ativa, ...e }) => e)
        .sort((a, b) => a.nomeFantasia.localeCompare(b.nomeFantasia)),
    });
  }

  // -------------------------------------------------------------- utilitários

  private titularAtivo(sessao: Sessao): boolean {
    return !!this.usuarios.get(sessao.email)?.ativo && !this.clienteSuspenso;
  }

  private autenticar(req: IncomingMessage, res: ServerResponse): Sessao | null {
    const [tipo, token] = (req.headers.authorization ?? "").split(" ");
    const sessao =
      tipo === "Bearer" && token ? this.sessoes.get(this.acessos.get(token) ?? "") : null;
    if (!sessao || sessao.revogada || !this.titularAtivo(sessao)) {
      this.erro(res, 401, "NAO_AUTENTICADO", "Não autenticado");
      return null;
    }
    return sessao;
  }

  private emitir(res: ServerResponse, sessao: Sessao): void {
    const accessToken = `at-${randomBytes(24).toString("base64url")}`;
    const refreshToken = `rt-${randomBytes(32).toString("base64url")}`;
    sessao.refreshAtual = refreshToken;
    this.acessos.set(accessToken, sessao.id);
    this.tokensEmitidos.add(accessToken).add(refreshToken);
    this.responder(res, 200, tokensResponseSchema, { accessToken, refreshToken, expiresIn: 900 });
  }

  private validar<T extends z.ZodType>(
    res: ServerResponse,
    schema: T,
    corpo: unknown,
  ): z.infer<T> | null {
    const r = schema.safeParse(corpo);
    if (r.success) return r.data;
    const fieldErrors: Record<string, string[]> = {};
    for (const i of r.error.issues) (fieldErrors[i.path.join(".") || "_"] ??= []).push(i.message);
    this.erro(res, 400, "VALIDACAO", "Dados inválidos", fieldErrors);
    return null;
  }

  private erro(
    res: ServerResponse,
    statusCode: number,
    code: CodigoErro,
    message: string,
    fieldErrors?: Record<string, string[]>,
  ): void {
    this.responder(res, statusCode, apiErroSchema, {
      statusCode,
      code,
      message,
      ...(fieldErrors ? { fieldErrors } : {}),
    });
  }

  private responder<T extends z.ZodType>(
    res: ServerResponse,
    status: number,
    schema: T,
    corpo: z.input<T>,
  ): void {
    const r = schema.safeParse(corpo);
    if (!r.success) {
      this.violacoes.push(`Resposta fora do contrato (${status}): ${r.error.message}`);
      return this.enviar(res, 500, { statusCode: 500, code: "ERRO_INTERNO", message: "Erro" });
    }
    this.enviar(res, status, corpo);
  }

  private enviar(res: ServerResponse, status: number, corpo?: unknown): void {
    if (corpo === undefined) {
      res.writeHead(status).end();
      return;
    }
    res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(corpo));
  }
}

async function lerCorpo(req: IncomingMessage): Promise<unknown> {
  const partes: Buffer[] = [];
  for await (const parte of req) partes.push(parte as Buffer);
  if (partes.length === 0) return undefined;
  try {
    return JSON.parse(Buffer.concat(partes).toString("utf8"));
  } catch {
    return undefined;
  }
}
