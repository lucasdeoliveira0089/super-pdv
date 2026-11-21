import { Body, Controller, Get, Headers, HttpCode, Post, UseGuards } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { and, eq, inArray, schema } from "@super-pdv/db";
import {
  loginRequestSchema,
  type LoginRequest,
  type MeResponse,
  PAPEIS_GLOBAIS,
  recuperacaoConfirmarRequestSchema,
  type RecuperacaoConfirmarRequest,
  recuperacaoRequestSchema,
  type RecuperacaoRequest,
  refreshRequestSchema,
  type RefreshRequest,
  type TokensResponse,
  trocarSenhaRequestSchema,
  type TrocarSenhaRequest,
} from "@super-pdv/shared";
import { ZodPipe } from "../comum/zod.pipe";
import type { UsuarioAutenticado } from "../contexto/contexto";
import { TenantDb } from "../database/tenant-db";
import { AuthCore } from "./auth-core.service";
import { PermiteSenhaTemporaria, Publico, UsuarioAtual } from "./decoradores";

/** Autenticação dos usuários dos clientes (gestor e PDV). */
@Controller("auth")
@UseGuards(ThrottlerGuard)
export class AuthClienteController {
  constructor(private readonly auth: AuthCore) {}

  @Post("login")
  @Publico()
  @HttpCode(200)
  login(
    @Body(new ZodPipe(loginRequestSchema)) corpo: LoginRequest,
    @Headers("user-agent") userAgent?: string,
  ): Promise<TokensResponse> {
    return this.auth.login("cliente", corpo, userAgent);
  }

  @Post("refresh")
  @Publico()
  @HttpCode(200)
  renovar(@Body(new ZodPipe(refreshRequestSchema)) corpo: RefreshRequest): Promise<TokensResponse> {
    return this.auth.renovar("cliente", corpo.refreshToken);
  }

  @Post("logout")
  @Publico()
  @HttpCode(204)
  sair(@Body(new ZodPipe(refreshRequestSchema)) corpo: RefreshRequest): Promise<void> {
    return this.auth.sair("cliente", corpo.refreshToken);
  }

  @Post("senha")
  @PermiteSenhaTemporaria()
  @HttpCode(204)
  trocarSenha(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body(new ZodPipe(trocarSenhaRequestSchema)) corpo: TrocarSenhaRequest,
  ): Promise<void> {
    return this.auth.trocarSenha("cliente", usuario.id, usuario.sessaoId, corpo);
  }

  @Post("recuperacao")
  @Publico()
  @HttpCode(202)
  async solicitarRecuperacao(
    @Body(new ZodPipe(recuperacaoRequestSchema)) corpo: RecuperacaoRequest,
  ): Promise<void> {
    await this.auth.solicitarRecuperacao("cliente", corpo.email);
  }

  @Post("recuperacao/confirmar")
  @Publico()
  @HttpCode(204)
  confirmarRecuperacao(
    @Body(new ZodPipe(recuperacaoConfirmarRequestSchema)) corpo: RecuperacaoConfirmarRequest,
  ): Promise<void> {
    return this.auth.confirmarRecuperacao("cliente", corpo);
  }
}

/** Dados de acesso do usuário logado (gestor e PDV). */
@Controller("me")
export class MeController {
  constructor(private readonly tenantDb: TenantDb) {}

  @Get()
  @PermiteSenhaTemporaria()
  async me(@UsuarioAtual() u: UsuarioAutenticado): Promise<MeResponse> {
    const global = PAPEIS_GLOBAIS.includes(u.papel);
    const empresas =
      !global && u.empresaIds.length === 0
        ? []
        : await this.tenantDb.transacao((tx) =>
            tx
              .select({
                id: schema.empresas.id,
                cnpj: schema.empresas.cnpj,
                razaoSocial: schema.empresas.razaoSocial,
                nomeFantasia: schema.empresas.nomeFantasia,
              })
              .from(schema.empresas)
              .where(
                and(
                  eq(schema.empresas.ativa, true),
                  ...(global ? [] : [inArray(schema.empresas.id, u.empresaIds)]),
                ),
              )
              .orderBy(schema.empresas.nomeFantasia),
          );
    return {
      id: u.id,
      nome: u.nome,
      email: u.email,
      papel: u.papel,
      senhaTemporaria: u.senhaTemporaria,
      permissoes: [...u.permissoes],
      cliente: { id: u.tenantId, nome: u.clienteNome },
      empresas,
    };
  }
}
