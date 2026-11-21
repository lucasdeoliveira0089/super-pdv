import { z } from "zod";

/** Papéis fixos dos usuários dos clientes. */
export const PAPEIS = ["dono", "administrador", "gerente", "operador"] as const;
export const papelSchema = z.enum(PAPEIS, { error: "Papel inválido" });
export type Papel = z.infer<typeof papelSchema>;

export const ROTULO_PAPEL: Record<Papel, string> = {
  dono: "Dono",
  administrador: "Administrador",
  gerente: "Gerente",
  operador: "Operador de caixa",
};

/** Papéis que atuam em todas as empresas do cliente. */
export const PAPEIS_GLOBAIS: readonly Papel[] = ["dono", "administrador"];

/** Papéis que precisam de ao menos uma empresa atribuída. */
export function papelExigeEmpresas(papel: Papel): boolean {
  return !PAPEIS_GLOBAIS.includes(papel);
}

export const PERMISSOES = [
  "gestor.acessar",
  "pdv.operar",
  "empresa.ler",
  "usuario.ler",
  "usuario.gerenciar",
  "usuario.gerenciar_operadores",
] as const;
export type Permissao = (typeof PERMISSOES)[number];

/** Matriz papel → permissões (spec access-control). */
export const PERMISSOES_POR_PAPEL: Record<Papel, readonly Permissao[]> = {
  dono: PERMISSOES,
  administrador: PERMISSOES,
  gerente: [
    "gestor.acessar",
    "pdv.operar",
    "empresa.ler",
    "usuario.ler",
    "usuario.gerenciar_operadores",
  ],
  operador: ["pdv.operar"],
};

export function temPermissao(papel: Papel, permissao: Permissao): boolean {
  return PERMISSOES_POR_PAPEL[papel].includes(permissao);
}

/** Papéis que um usuário pode atribuir a outros (sem considerar regras dependentes de dados). */
export function papeisAtribuiveis(papel: Papel): Papel[] {
  if (papel === "dono") return [...PAPEIS];
  if (papel === "administrador") return ["administrador", "gerente", "operador"];
  if (papel === "gerente") return ["operador"];
  return [];
}

/**
 * Indica se `ator` pode gerenciar (editar, desativar, redefinir senha) o usuário
 * `alvo`. Espelha a regra aplicada pela API (spec access-control):
 * Dono — todos; Administrador — todos exceto Donos; Gerente — apenas Operadores
 * de caixa cujas empresas estejam todas no seu escopo; Operador — ninguém.
 */
export function podeGerenciarUsuario(
  ator: { papel: Papel; empresaIds: readonly string[] },
  alvo: { papel: Papel; empresaIds: readonly string[] },
): boolean {
  if (ator.papel === "dono") return true;
  if (ator.papel === "administrador") return alvo.papel !== "dono";
  if (ator.papel === "gerente") {
    return alvo.papel === "operador" && alvo.empresaIds.every((e) => ator.empresaIds.includes(e));
  }
  return false;
}
