import { empresaSchema } from "@super-pdv/shared";
import { carregar } from "@super-pdv/web-session";
import { CabecalhoPagina } from "@super-pdv/web-session/telas";
import { api, exigirPermissao, usuarioLogado } from "../../../lib/sessao";
import { TabelaEmpresas } from "../tabelas";

export const metadata = { title: "Empresas — Gestor Super PDV" };

export default async function EmpresasPage() {
  exigirPermissao(await usuarioLogado(), "empresa.ler");
  const empresas = await carregar(async () =>
    (await api()).requisitar("GET", "/v1/empresas", { schema: empresaSchema.array() }),
  );
  return (
    <>
      <CabecalhoPagina
        titulo="Empresas"
        descricao="Para adicionar ou alterar empresas, fale com a equipe Super PDV."
      />
      <TabelaEmpresas empresas={empresas} />
    </>
  );
}
