import "server-only";
import { meResponseSchema, type MeResponse, type Permissao } from "@super-pdv/shared";
import { carregar, ClienteApi, CONFIG_GESTOR } from "@super-pdv/web-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/** Cliente da API com a sessão do gestor (somente no servidor). */
export async function api(): Promise<ClienteApi> {
  return new ClienteApi(CONFIG_GESTOR, await cookies());
}

/** Usuário logado; redireciona para a troca de senha se ela for temporária. */
export async function usuarioLogado(
  opcoes: { permitirSenhaTemporaria?: boolean } = {},
): Promise<MeResponse> {
  const cliente = await api();
  const usuario = await carregar(() =>
    cliente.requisitar("GET", "/v1/me", { schema: meResponseSchema }),
  );
  if (usuario.senhaTemporaria && !opcoes.permitirSenhaTemporaria) redirect("/trocar-senha");
  return usuario;
}

/** Exige uma das permissões; caso contrário, página de acesso negado. */
export function exigirPermissao(usuario: MeResponse, ...permissoes: Permissao[]): void {
  if (!permissoes.some((p) => usuario.permissoes.includes(p))) redirect("/acesso-negado");
}

/** Empresas atribuídas ao usuário (Gerente/Operador) ou todas (Dono/Administrador). */
export function idsDeEmpresas(usuario: MeResponse): string[] {
  return usuario.empresas.map((e) => e.id);
}
