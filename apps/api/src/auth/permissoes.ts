import { type CanActivate, type ExecutionContext, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PAPEIS_GLOBAIS, type Permissao } from "@super-pdv/shared";
import { ClsService } from "nestjs-cls";
import { semPermissao } from "../comum/erros";
import type { ContextoRequisicao, UsuarioAutenticado } from "../contexto/contexto";

export const META_PERMISSOES = "auth:permissoes";

/**
 * Exige que o usuário do cliente tenha AO MENOS UMA das permissões informadas
 * (matriz PERMISSOES_POR_PAPEL de @super-pdv/shared).
 */
export const RequerPermissao = (...permissoes: [Permissao, ...Permissao[]]) =>
  SetMetadata(META_PERMISSOES, permissoes);

/** Guard global executado após a autenticação. */
@Injectable()
export class PermissoesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cls: ClsService<ContextoRequisicao>,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const exigidas = this.reflector.getAllAndOverride<Permissao[] | undefined>(META_PERMISSOES, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!exigidas?.length) return true;
    const usuario = this.cls.get("usuario");
    if (!usuario || !exigidas.some((p) => usuario.permissoes.includes(p))) throw semPermissao();
    return true;
  }
}

/** Empresas em que o usuário pode atuar: `"todas"` para Dono/Administrador. */
export function escopoDeEmpresas(usuario: UsuarioAutenticado): "todas" | string[] {
  return PAPEIS_GLOBAIS.includes(usuario.papel) ? "todas" : usuario.empresaIds;
}

/** Indica se a empresa está no escopo do usuário. */
export function podeAtuarNaEmpresa(usuario: UsuarioAutenticado, empresaId: string): boolean {
  const escopo = escopoDeEmpresas(usuario);
  return escopo === "todas" || escopo.includes(empresaId);
}
