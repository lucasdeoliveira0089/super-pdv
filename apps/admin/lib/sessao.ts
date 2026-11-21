import "server-only";
import { equipeMeResponseSchema } from "@super-pdv/shared";
import { carregar, ClienteApi, CONFIG_ADMIN } from "@super-pdv/web-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/** Cliente da API com a sessão do admin (somente no servidor). */
export async function api(): Promise<ClienteApi> {
  return new ClienteApi(CONFIG_ADMIN, await cookies());
}

/** Membro da equipe logado; redireciona para a troca de senha se ela for temporária. */
export async function membroLogado(opcoes: { permitirSenhaTemporaria?: boolean } = {}) {
  const cliente = await api();
  const membro = await carregar(() =>
    cliente.requisitar("GET", "/v1/admin/me", { schema: equipeMeResponseSchema }),
  );
  if (membro.senhaTemporaria && !opcoes.permitirSenhaTemporaria) redirect("/trocar-senha");
  return membro;
}
