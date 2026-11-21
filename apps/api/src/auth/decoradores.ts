import { createParamDecorator, type ExecutionContext, SetMetadata } from "@nestjs/common";
import { ClsServiceManager } from "nestjs-cls";
import type {
  ContextoRequisicao,
  MembroAutenticado,
  UsuarioAutenticado,
} from "../contexto/contexto";
import { naoAutenticado } from "../comum/erros";

export const META_PUBLICO = "auth:publico";
export const META_DOMINIO_EQUIPE = "auth:dominio-equipe";
export const META_PERMITE_SENHA_TEMPORARIA = "auth:permite-senha-temporaria";

/** Rota sem autenticação (a API é fechada por padrão). */
export const Publico = () => SetMetadata(META_PUBLICO, true);

/** Rotas da equipe Super PDV (admin): aceita apenas tokens do domínio `equipe`. */
export const DominioEquipe = () => SetMetadata(META_DOMINIO_EQUIPE, true);

/** Rota acessível mesmo com senha temporária (troca de senha, `me`, logout). */
export const PermiteSenhaTemporaria = () => SetMetadata(META_PERMITE_SENHA_TEMPORARIA, true);

/** Usuário de cliente autenticado (definido pelo guard). */
export const UsuarioAtual = createParamDecorator(
  (_: unknown, _ctx: ExecutionContext): UsuarioAutenticado => {
    const usuario = ClsServiceManager.getClsService<ContextoRequisicao>().get("usuario");
    if (!usuario) throw naoAutenticado();
    return usuario;
  },
);

/** Membro da equipe autenticado (definido pelo guard). */
export const MembroAtual = createParamDecorator(
  (_: unknown, _ctx: ExecutionContext): MembroAutenticado => {
    const membro = ClsServiceManager.getClsService<ContextoRequisicao>().get("membro");
    if (!membro) throw naoAutenticado();
    return membro;
  },
);
