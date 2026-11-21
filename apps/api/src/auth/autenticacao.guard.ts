import { type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { and, eq, schema } from "@super-pdv/db";
import { PERMISSOES_POR_PAPEL } from "@super-pdv/shared";
import type { Request } from "express";
import { ClsService } from "nestjs-cls";
import { ErroApi, naoAutenticado } from "../comum/erros";
import type { ContextoRequisicao } from "../contexto/contexto";
import { SystemDb } from "../database/system-db";
import { AuthCore } from "./auth-core.service";
import { META_DOMINIO_EQUIPE, META_PERMITE_SENHA_TEMPORARIA, META_PUBLICO } from "./decoradores";
import { type Dominio, TokensAcesso } from "./tokens";

/**
 * Guard global: toda rota exige token de acesso válido do domínio correto,
 * exceto as marcadas com `@Publico()`. A cada requisição, recarrega do banco o
 * sujeito e a sessão (mudanças de papel, desativação e suspensão valem na hora)
 * e preenche o contexto (cliente e usuário) usado pelo `TenantDb`.
 */
@Injectable()
export class AutenticacaoGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokensAcesso,
    private readonly auth: AuthCore,
    private readonly system: SystemDb,
    private readonly cls: ClsService<ContextoRequisicao>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const alvos = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(META_PUBLICO, alvos)) return true;

    const dominio: Dominio = this.reflector.getAllAndOverride<boolean>(META_DOMINIO_EQUIPE, alvos)
      ? "equipe"
      : "cliente";

    const cabecalho = ctx.switchToHttp().getRequest<Request>().headers.authorization ?? "";
    const [tipo, token] = cabecalho.split(" ");
    if (tipo !== "Bearer" || !token) throw naoAutenticado();

    const claims = await this.tokens.verificar(token, dominio);
    if (!claims || !(await this.auth.sessaoValida(claims))) throw naoAutenticado();

    const senhaTemporaria =
      dominio === "equipe"
        ? await this.carregarMembro(claims.sub, claims.sid)
        : await this.carregarUsuario(claims.sub, claims.sid);

    if (
      senhaTemporaria &&
      !this.reflector.getAllAndOverride<boolean>(META_PERMITE_SENHA_TEMPORARIA, alvos)
    ) {
      throw new ErroApi(403, "PASSWORD_CHANGE_REQUIRED", "Defina uma nova senha para continuar");
    }
    return true;
  }

  private async carregarUsuario(id: string, sessaoId: string): Promise<boolean> {
    const [linha] = await this.system.db
      .select({ usuario: schema.usuarios, cliente: schema.clientes })
      .from(schema.usuarios)
      .innerJoin(schema.clientes, eq(schema.clientes.id, schema.usuarios.tenantId))
      .where(
        and(
          eq(schema.usuarios.id, id),
          eq(schema.usuarios.ativo, true),
          eq(schema.clientes.ativo, true),
        ),
      );
    if (!linha) throw naoAutenticado();
    const { usuario, cliente } = linha;

    const empresas = await this.system.db
      .select({ empresaId: schema.usuarioEmpresas.empresaId })
      .from(schema.usuarioEmpresas)
      .where(eq(schema.usuarioEmpresas.usuarioId, usuario.id));

    this.cls.set("tenantId", usuario.tenantId);
    this.cls.set("usuario", {
      id: usuario.id,
      tenantId: usuario.tenantId,
      clienteNome: cliente.nome,
      sessaoId,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
      permissoes: PERMISSOES_POR_PAPEL[usuario.papel],
      senhaTemporaria: usuario.senhaTemporaria,
      empresaIds: empresas.map((e) => e.empresaId),
    });
    return usuario.senhaTemporaria;
  }

  private async carregarMembro(id: string, sessaoId: string): Promise<boolean> {
    const [membro] = await this.system.db
      .select()
      .from(schema.equipeMembros)
      .where(and(eq(schema.equipeMembros.id, id), eq(schema.equipeMembros.ativo, true)));
    if (!membro) throw naoAutenticado();
    this.cls.set("membro", {
      id: membro.id,
      sessaoId,
      nome: membro.nome,
      email: membro.email,
      senhaTemporaria: membro.senhaTemporaria,
    });
    return membro.senhaTemporaria;
  }
}
