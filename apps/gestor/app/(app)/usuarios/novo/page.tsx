import { empresaSchema, papeisAtribuiveis } from "@super-pdv/shared";
import { carregar } from "@super-pdv/web-session";
import { CabecalhoPagina, ConteudoFormulario } from "@super-pdv/web-session/telas";
import { api, exigirPermissao, usuarioLogado } from "../../../../lib/sessao";
import { FormNovoUsuario } from "../formularios";

export const metadata = { title: "Novo usuário — Gestor Super PDV" };

export default async function NovoUsuarioPage() {
  const eu = await usuarioLogado();
  exigirPermissao(eu, "usuario.gerenciar", "usuario.gerenciar_operadores");
  const empresas = await carregar(async () =>
    (await api()).requisitar("GET", "/v1/empresas", { schema: empresaSchema.array() }),
  );
  return (
    <ConteudoFormulario>
      <CabecalhoPagina
        titulo="Novo usuário"
        descricao="O usuário recebe uma senha temporária e define a própria senha no primeiro acesso."
      />
      <FormNovoUsuario
        papeis={papeisAtribuiveis(eu.papel)}
        empresas={empresas.filter((e) => e.ativa)}
      />
    </ConteudoFormulario>
  );
}
