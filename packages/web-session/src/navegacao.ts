import { notFound, redirect } from "next/navigation";
import { ErroDaApi } from "./cliente-api";

/**
 * Executa uma leitura da API numa página (Server Component) e trata os erros
 * de sessão: 401 → login; senha temporária → troca de senha; 403 → acesso
 * negado; 404 ou 400 (identificador inválido) → página "não encontrado".
 */
export async function carregar<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (erro) {
    if (erro instanceof ErroDaApi) {
      if (erro.status === 401) redirect("/login");
      if (erro.corpo.code === "PASSWORD_CHANGE_REQUIRED") redirect("/trocar-senha");
      if (erro.status === 403) redirect("/acesso-negado");
      // 400 numa leitura = identificador malformado na URL: tratado como inexistente.
      if (erro.status === 404 || erro.status === 400) notFound();
    }
    throw erro;
  }
}
