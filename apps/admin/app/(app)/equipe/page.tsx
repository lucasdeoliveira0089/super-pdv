import { membroEquipeSchema } from "@super-pdv/shared";
import { carregar } from "@super-pdv/web-session";
import { CabecalhoPagina } from "@super-pdv/web-session/telas";
import { api, membroLogado } from "../../../lib/sessao";
import { TabelaEquipe } from "../tabelas";
import { FormNovoMembro } from "./formularios";

export const metadata = { title: "Equipe — Admin Super PDV" };

export default async function EquipePage() {
  const [eu, membros] = await Promise.all([
    membroLogado(),
    carregar(async () =>
      (await api()).requisitar("GET", "/v1/admin/equipe", { schema: membroEquipeSchema.array() }),
    ),
  ]);
  return (
    <>
      <CabecalhoPagina titulo="Equipe Super PDV" descricao="Quem tem acesso a este admin." />
      <section className="mb-8">
        <h2 className="mb-3 font-semibold">Novo membro</h2>
        <FormNovoMembro />
      </section>
      <TabelaEquipe membros={membros} euId={eu.id} />
    </>
  );
}
