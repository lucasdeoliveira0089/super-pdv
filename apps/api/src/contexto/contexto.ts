import type { Papel, Permissao } from "@super-pdv/shared";
import type { ClsStore } from "nestjs-cls";

/** Usuário de cliente autenticado na requisição atual. */
export interface UsuarioAutenticado {
  id: string;
  tenantId: string;
  clienteNome: string;
  sessaoId: string;
  nome: string;
  email: string;
  papel: Papel;
  permissoes: readonly Permissao[];
  senhaTemporaria: boolean;
  /** Empresas atribuídas (Gerente/Operador). Vazio para Dono/Administrador. */
  empresaIds: string[];
}

/** Membro da equipe Super PDV autenticado na requisição atual. */
export interface MembroAutenticado {
  id: string;
  sessaoId: string;
  nome: string;
  email: string;
  senhaTemporaria: boolean;
}

/** Dados guardados no contexto (AsyncLocalStorage) de cada requisição. */
export interface ContextoRequisicao extends ClsStore {
  tenantId?: string;
  usuario?: UsuarioAutenticado;
  membro?: MembroAutenticado;
}
