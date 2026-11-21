import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { and, eq, gt, isNull, ne, schema } from "@super-pdv/db";
import {
  type LoginRequest,
  type RecuperacaoConfirmarRequest,
  type TokensResponse,
  type TrocarSenhaRequest,
  validarSenha,
} from "@super-pdv/shared";
import { ErroApi, naoAutenticado } from "../comum/erros";
import type { Env } from "../config/env";
import { SystemDb, type Transacao } from "../database/system-db";
import { Mailer } from "../email/mailer";
import { DIA, HORA, MINUTO, Relogio } from "./relogio";
import { gerarSenhaTemporaria, hashSenha, verificarSenha, verificarSenhaFicticia } from "./senhas";
import {
  ACESSO_SEGUNDOS,
  type ClaimsAcesso,
  type Dominio,
  gerarTokenOpaco,
  hashToken,
  TokensAcesso,
} from "./tokens";

export const SESSAO_DURACAO_MS = 30 * DIA;
export const RECUPERACAO_DURACAO_MS = 1 * HORA;
export const MAX_FALHAS_LOGIN = 5;
export const JANELA_FALHAS_MS = 15 * MINUTO;
export const BLOQUEIO_MS = 15 * MINUTO;

const credenciaisInvalidas = () =>
  new ErroApi(401, "CREDENCIAIS_INVALIDAS", "E-mail ou senha inválidos");

/** Dados de autenticação de um usuário de cliente ou membro da equipe. */
export interface Sujeito {
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
  senhaTemporaria: boolean;
  /** Para clientes: usuário ativo E cliente ativo. */
  ativo: boolean;
  tenantId?: string;
}

/**
 * Núcleo de autenticação, compartilhado pelos domínios `cliente` (gestor/PDV)
 * e `equipe` (admin). Usa o acesso privilegiado: atua antes de o cliente ser conhecido.
 */
@Injectable()
export class AuthCore {
  private readonly logger = new Logger(AuthCore.name);

  constructor(
    private readonly system: SystemDb,
    private readonly tokens: TokensAcesso,
    private readonly relogio: Relogio,
    private readonly mailer: Mailer,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // ---------------------------------------------------------------- sujeitos

  async buscarPorEmail(
    dominio: Dominio,
    email: string,
    tx?: Transacao,
  ): Promise<Sujeito | undefined> {
    const db = tx ?? this.system.db;
    if (dominio === "equipe") {
      const [m] = await db
        .select()
        .from(schema.equipeMembros)
        .where(eq(schema.equipeMembros.email, email));
      return m;
    }
    const [u] = await db
      .select({ usuario: schema.usuarios, clienteAtivo: schema.clientes.ativo })
      .from(schema.usuarios)
      .innerJoin(schema.clientes, eq(schema.clientes.id, schema.usuarios.tenantId))
      .where(eq(schema.usuarios.email, email));
    return u && { ...u.usuario, ativo: u.usuario.ativo && u.clienteAtivo };
  }

  async buscarPorId(dominio: Dominio, id: string, tx?: Transacao): Promise<Sujeito | undefined> {
    const db = tx ?? this.system.db;
    if (dominio === "equipe") {
      const [m] = await db
        .select()
        .from(schema.equipeMembros)
        .where(eq(schema.equipeMembros.id, id));
      return m;
    }
    const [u] = await db
      .select({ usuario: schema.usuarios, clienteAtivo: schema.clientes.ativo })
      .from(schema.usuarios)
      .innerJoin(schema.clientes, eq(schema.clientes.id, schema.usuarios.tenantId))
      .where(eq(schema.usuarios.id, id));
    return u && { ...u.usuario, ativo: u.usuario.ativo && u.clienteAtivo };
  }

  private async gravarSenha(
    dominio: Dominio,
    id: string,
    senha: string,
    temporaria: boolean,
    tx: Transacao,
  ) {
    const senhaHash = await hashSenha(senha);
    const tabela = dominio === "equipe" ? schema.equipeMembros : schema.usuarios;
    await tx
      .update(tabela)
      .set({ senhaHash, senhaTemporaria: temporaria })
      .where(eq(tabela.id, id));
  }

  // ------------------------------------------------------------------- login

  async login(
    dominio: Dominio,
    { email, senha }: LoginRequest,
    userAgent?: string,
  ): Promise<TokensResponse> {
    await this.exigirNaoBloqueado(dominio, email);

    const sujeito = await this.buscarPorEmail(dominio, email);
    const senhaConfere = sujeito
      ? await verificarSenha(sujeito.senhaHash, senha)
      : await verificarSenhaFicticia(senha);

    if (!sujeito || !senhaConfere || !sujeito.ativo) {
      await this.registrarFalha(dominio, email);
      throw credenciaisInvalidas();
    }

    await this.limparFalhas(dominio, email);
    return this.system.transacao(async (tx) => {
      const [sessao] = await tx
        .insert(schema.sessoes)
        .values({
          dominio,
          ...(dominio === "equipe" ? { membroId: sujeito.id } : { usuarioId: sujeito.id }),
          expiraEm: new Date(this.relogio.agora().getTime() + SESSAO_DURACAO_MS),
          userAgent: userAgent?.slice(0, 300),
        })
        .returning();
      return this.emitirTokens(tx, dominio, sujeito, sessao!.id);
    });
  }

  private async emitirTokens(
    tx: Transacao,
    dominio: Dominio,
    sujeito: Sujeito,
    sessaoId: string,
  ): Promise<TokensResponse> {
    const { token, hash } = gerarTokenOpaco();
    await tx.insert(schema.refreshTokens).values({ sessaoId, tokenHash: hash });
    const claims: ClaimsAcesso = {
      aud: dominio,
      sub: sujeito.id,
      sid: sessaoId,
      ...(sujeito.tenantId ? { tid: sujeito.tenantId } : {}),
    };
    return {
      accessToken: await this.tokens.assinar(claims),
      refreshToken: token,
      expiresIn: ACESSO_SEGUNDOS,
    };
  }

  // ------------------------------------------------------- bloqueio por e-mail

  private async exigirNaoBloqueado(dominio: Dominio, email: string): Promise<void> {
    const [linha] = await this.system.db
      .select()
      .from(schema.loginThrottle)
      .where(and(eq(schema.loginThrottle.dominio, dominio), eq(schema.loginThrottle.email, email)));
    if (linha?.bloqueadoAte && linha.bloqueadoAte > this.relogio.agora()) {
      throw new ErroApi(
        429,
        "BLOQUEADO",
        "Muitas tentativas de login. Tente novamente em 15 minutos.",
      );
    }
  }

  private async registrarFalha(dominio: Dominio, email: string): Promise<void> {
    const agora = this.relogio.agora();
    await this.system.transacao(async (tx) => {
      const [linha] = await tx
        .select()
        .from(schema.loginThrottle)
        .where(
          and(eq(schema.loginThrottle.dominio, dominio), eq(schema.loginThrottle.email, email)),
        )
        .for("update");
      const janelaVencida =
        !linha || agora.getTime() - linha.janelaInicio.getTime() > JANELA_FALHAS_MS;
      const falhas = janelaVencida ? 1 : linha.falhas + 1;
      const valores = {
        falhas,
        janelaInicio: janelaVencida ? agora : linha.janelaInicio,
        bloqueadoAte: falhas >= MAX_FALHAS_LOGIN ? new Date(agora.getTime() + BLOQUEIO_MS) : null,
      };
      await tx
        .insert(schema.loginThrottle)
        .values({ dominio, email, ...valores })
        .onConflictDoUpdate({
          target: [schema.loginThrottle.dominio, schema.loginThrottle.email],
          set: valores,
        });
    });
  }

  private async limparFalhas(dominio: Dominio, email: string, tx?: Transacao): Promise<void> {
    await (tx ?? this.system.db)
      .delete(schema.loginThrottle)
      .where(and(eq(schema.loginThrottle.dominio, dominio), eq(schema.loginThrottle.email, email)));
  }

  // --------------------------------------------------------- sessão/renovação

  async renovar(dominio: Dominio, refreshToken: string): Promise<TokensResponse> {
    const agora = this.relogio.agora();
    type Resultado =
      { tokens: TokensResponse } | { erro: "invalido" } | { erro: "reuso"; sessaoId: string };
    const resultado = await this.system.transacao<Resultado>(async (tx) => {
      const [linha] = await tx
        .select({ token: schema.refreshTokens, sessao: schema.sessoes })
        .from(schema.refreshTokens)
        .innerJoin(schema.sessoes, eq(schema.sessoes.id, schema.refreshTokens.sessaoId))
        .where(eq(schema.refreshTokens.tokenHash, hashToken(refreshToken)))
        .for("update");
      if (!linha || linha.sessao.dominio !== dominio) return { erro: "invalido" as const };
      const { token, sessao } = linha;
      // Reuso de um token já trocado: possível roubo. Encerra a sessão inteira.
      if (token.usadoEm) return { erro: "reuso" as const, sessaoId: sessao.id };
      if (sessao.revogadaEm || sessao.expiraEm <= agora) return { erro: "invalido" as const };

      const sujeitoId = dominio === "equipe" ? sessao.membroId! : sessao.usuarioId!;
      const sujeito = await this.buscarPorId(dominio, sujeitoId, tx);
      if (!sujeito?.ativo) return { erro: "invalido" as const };

      await tx
        .update(schema.refreshTokens)
        .set({ usadoEm: agora })
        .where(eq(schema.refreshTokens.id, token.id));
      return { tokens: await this.emitirTokens(tx, dominio, sujeito, sessao.id) };
    });

    if ("tokens" in resultado) return resultado.tokens;
    if (resultado.erro === "reuso") {
      this.logger.warn(`Reuso de token de renovação: sessão ${resultado.sessaoId} encerrada`);
      await this.revogarSessao(resultado.sessaoId);
    }
    throw naoAutenticado();
  }

  async sair(dominio: Dominio, refreshToken: string): Promise<void> {
    const [linha] = await this.system.db
      .select({ sessaoId: schema.sessoes.id })
      .from(schema.refreshTokens)
      .innerJoin(schema.sessoes, eq(schema.sessoes.id, schema.refreshTokens.sessaoId))
      .where(
        and(
          eq(schema.refreshTokens.tokenHash, hashToken(refreshToken)),
          eq(schema.sessoes.dominio, dominio),
        ),
      );
    if (linha) await this.revogarSessao(linha.sessaoId);
  }

  async revogarSessao(sessaoId: string, tx?: Transacao): Promise<void> {
    await (tx ?? this.system.db)
      .update(schema.sessoes)
      .set({ revogadaEm: this.relogio.agora() })
      .where(and(eq(schema.sessoes.id, sessaoId), isNull(schema.sessoes.revogadaEm)));
  }

  /** Encerra todas as sessões de um sujeito (opcionalmente mantendo uma). */
  async revogarSessoesDoSujeito(
    dominio: Dominio,
    sujeitoId: string,
    exceto?: string,
    tx?: Transacao,
  ): Promise<void> {
    const coluna = dominio === "equipe" ? schema.sessoes.membroId : schema.sessoes.usuarioId;
    await (tx ?? this.system.db)
      .update(schema.sessoes)
      .set({ revogadaEm: this.relogio.agora() })
      .where(
        and(
          eq(coluna, sujeitoId),
          isNull(schema.sessoes.revogadaEm),
          ...(exceto ? [ne(schema.sessoes.id, exceto)] : []),
        ),
      );
  }

  /** Confere se a sessão do token de acesso continua válida. */
  async sessaoValida(claims: ClaimsAcesso): Promise<boolean> {
    const coluna = claims.aud === "equipe" ? schema.sessoes.membroId : schema.sessoes.usuarioId;
    const [sessao] = await this.system.db
      .select({ id: schema.sessoes.id })
      .from(schema.sessoes)
      .where(
        and(
          eq(schema.sessoes.id, claims.sid),
          eq(schema.sessoes.dominio, claims.aud),
          eq(coluna, claims.sub),
          isNull(schema.sessoes.revogadaEm),
          gt(schema.sessoes.expiraEm, this.relogio.agora()),
        ),
      );
    return !!sessao;
  }

  // ------------------------------------------------------------------- senha

  async trocarSenha(
    dominio: Dominio,
    sujeitoId: string,
    sessaoId: string,
    req: TrocarSenhaRequest,
  ): Promise<void> {
    const sujeito = await this.buscarPorId(dominio, sujeitoId);
    if (!sujeito) throw naoAutenticado();
    if (!(await verificarSenha(sujeito.senhaHash, req.senhaAtual))) {
      throw new ErroApi(400, "VALIDACAO", "Senha atual incorreta", {
        senhaAtual: ["Senha atual incorreta"],
      });
    }
    this.exigirPolitica(req.novaSenha, sujeito.email);
    await this.system.transacao(async (tx) => {
      await this.gravarSenha(dominio, sujeitoId, req.novaSenha, false, tx);
      await this.revogarSessoesDoSujeito(dominio, sujeitoId, sessaoId, tx);
    });
  }

  /** Gera uma nova senha temporária, grava-a e encerra as sessões do sujeito. */
  async redefinirSenhaTemporaria(dominio: Dominio, sujeitoId: string): Promise<string> {
    const senha = gerarSenhaTemporaria();
    await this.system.transacao((tx) => this.definirSenhaTemporaria(dominio, sujeitoId, senha, tx));
    return senha;
  }

  /** Define uma senha temporária (gerada) e encerra as sessões do sujeito. */
  async definirSenhaTemporaria(
    dominio: Dominio,
    sujeitoId: string,
    senha: string,
    tx: Transacao,
  ): Promise<void> {
    await this.gravarSenha(dominio, sujeitoId, senha, true, tx);
    await this.revogarSessoesDoSujeito(dominio, sujeitoId, undefined, tx);
  }

  private exigirPolitica(senha: string, email: string): void {
    const erro = validarSenha(senha, email);
    if (erro) throw new ErroApi(400, "VALIDACAO", erro, { novaSenha: [erro] });
  }

  // ------------------------------------------------------------- recuperação

  async solicitarRecuperacao(dominio: Dominio, email: string): Promise<void> {
    const sujeito = await this.buscarPorEmail(dominio, email);
    if (!sujeito?.ativo) return; // mesma resposta para qualquer e-mail

    const agora = this.relogio.agora();
    const { token, hash } = gerarTokenOpaco();
    const coluna =
      dominio === "equipe" ? schema.passwordResets.membroId : schema.passwordResets.usuarioId;
    await this.system.transacao(async (tx) => {
      // Só o link mais recente vale.
      await tx
        .update(schema.passwordResets)
        .set({ usadoEm: agora })
        .where(and(eq(coluna, sujeito.id), isNull(schema.passwordResets.usadoEm)));
      await tx.insert(schema.passwordResets).values({
        dominio,
        ...(dominio === "equipe" ? { membroId: sujeito.id } : { usuarioId: sujeito.id }),
        tokenHash: hash,
        expiraEm: new Date(agora.getTime() + RECUPERACAO_DURACAO_MS),
      });
    });

    const base = this.config.get(dominio === "equipe" ? "ADMIN_URL" : "GESTOR_URL", {
      infer: true,
    });
    const link = `${base.replace(/\/$/, "")}/redefinir-senha?token=${encodeURIComponent(token)}`;
    const app = dominio === "equipe" ? "Admin Super PDV" : "Super PDV";
    // Envio em segundo plano: o tempo de resposta não pode depender do e-mail existir
    // (não revela quais e-mails estão cadastrados) nem da lentidão do servidor SMTP.
    void this.mailer
      .enviar({
        para: sujeito.email,
        assunto: `Redefinição de senha — ${app}`,
        texto:
          `Olá, ${sujeito.nome}.\n\nRecebemos um pedido para redefinir a sua senha no ${app}.\n` +
          `Para criar uma nova senha, acesse o link abaixo (válido por 1 hora e para um único uso):\n\n${link}\n\n` +
          `Se não foi você, ignore este e-mail: a sua senha atual continua valendo.`,
        html:
          `<p>Olá, ${escaparHtml(sujeito.nome)}.</p>` +
          `<p>Recebemos um pedido para redefinir a sua senha no ${app}.</p>` +
          `<p><a href="${link}">Criar uma nova senha</a> (link válido por 1 hora e para um único uso).</p>` +
          `<p>Se não foi você, ignore este e-mail: a sua senha atual continua valendo.</p>`,
      })
      .catch((erro: unknown) =>
        this.logger.error(
          `Falha ao enviar e-mail de recuperação: ${erro instanceof Error ? erro.message : String(erro)}`,
        ),
      );
  }

  async confirmarRecuperacao(dominio: Dominio, req: RecuperacaoConfirmarRequest): Promise<void> {
    const agora = this.relogio.agora();
    const linkInvalido = () =>
      new ErroApi(
        400,
        "LINK_INVALIDO",
        "Link de redefinição inválido ou expirado. Solicite um novo.",
      );

    const [reset] = await this.system.db
      .select()
      .from(schema.passwordResets)
      .where(
        and(
          eq(schema.passwordResets.tokenHash, hashToken(req.token)),
          eq(schema.passwordResets.dominio, dominio),
        ),
      );
    if (!reset || reset.usadoEm || reset.expiraEm <= agora) throw linkInvalido();

    const sujeitoId = dominio === "equipe" ? reset.membroId! : reset.usuarioId!;
    const sujeito = await this.buscarPorId(dominio, sujeitoId);
    if (!sujeito?.ativo) throw linkInvalido();
    this.exigirPolitica(req.novaSenha, sujeito.email);

    await this.system.transacao(async (tx) => {
      const marcados = await tx
        .update(schema.passwordResets)
        .set({ usadoEm: agora })
        .where(and(eq(schema.passwordResets.id, reset.id), isNull(schema.passwordResets.usadoEm)))
        .returning();
      if (marcados.length === 0) throw linkInvalido(); // uso concorrente
      await this.gravarSenha(dominio, sujeitoId, req.novaSenha, false, tx);
      await this.revogarSessoesDoSujeito(dominio, sujeitoId, undefined, tx);
      await this.limparFalhas(dominio, sujeito.email, tx);
    });
  }
}

function escaparHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
