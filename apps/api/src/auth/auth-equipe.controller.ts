import { Body, Controller, Get, Headers, HttpCode, Post, UseGuards } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import {
  type EquipeMeResponse,
  loginRequestSchema,
  type LoginRequest,
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
import type { MembroAutenticado } from "../contexto/contexto";
import { AuthCore } from "./auth-core.service";
import { DominioEquipe, MembroAtual, PermiteSenhaTemporaria, Publico } from "./decoradores";

/** Autenticação da equipe Super PDV (admin). Credenciais e sessões separadas dos clientes. */
@Controller("admin/auth")
@DominioEquipe()
@UseGuards(ThrottlerGuard)
export class AuthEquipeController {
  constructor(private readonly auth: AuthCore) {}

  @Post("login")
  @Publico()
  @HttpCode(200)
  login(
    @Body(new ZodPipe(loginRequestSchema)) corpo: LoginRequest,
    @Headers("user-agent") userAgent?: string,
  ): Promise<TokensResponse> {
    return this.auth.login("equipe", corpo, userAgent);
  }

  @Post("refresh")
  @Publico()
  @HttpCode(200)
  renovar(@Body(new ZodPipe(refreshRequestSchema)) corpo: RefreshRequest): Promise<TokensResponse> {
    return this.auth.renovar("equipe", corpo.refreshToken);
  }

  @Post("logout")
  @Publico()
  @HttpCode(204)
  sair(@Body(new ZodPipe(refreshRequestSchema)) corpo: RefreshRequest): Promise<void> {
    return this.auth.sair("equipe", corpo.refreshToken);
  }

  @Post("senha")
  @PermiteSenhaTemporaria()
  @HttpCode(204)
  trocarSenha(
    @MembroAtual() membro: MembroAutenticado,
    @Body(new ZodPipe(trocarSenhaRequestSchema)) corpo: TrocarSenhaRequest,
  ): Promise<void> {
    return this.auth.trocarSenha("equipe", membro.id, membro.sessaoId, corpo);
  }

  @Post("recuperacao")
  @Publico()
  @HttpCode(202)
  async solicitarRecuperacao(
    @Body(new ZodPipe(recuperacaoRequestSchema)) corpo: RecuperacaoRequest,
  ): Promise<void> {
    await this.auth.solicitarRecuperacao("equipe", corpo.email);
  }

  @Post("recuperacao/confirmar")
  @Publico()
  @HttpCode(204)
  confirmarRecuperacao(
    @Body(new ZodPipe(recuperacaoConfirmarRequestSchema)) corpo: RecuperacaoConfirmarRequest,
  ): Promise<void> {
    return this.auth.confirmarRecuperacao("equipe", corpo);
  }
}

@Controller("admin/me")
@DominioEquipe()
export class EquipeMeController {
  @Get()
  @PermiteSenhaTemporaria()
  me(@MembroAtual() m: MembroAutenticado): EquipeMeResponse {
    return { id: m.id, nome: m.nome, email: m.email, senhaTemporaria: m.senhaTemporaria };
  }
}
