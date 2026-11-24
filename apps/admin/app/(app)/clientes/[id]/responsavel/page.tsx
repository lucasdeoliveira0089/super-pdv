import { clienteSchema } from "@super-pdv/shared";
import { carregar } from "@super-pdv/web-session";
import { CabecalhoPagina, ConteudoFormulario } from "@super-pdv/web-session/telas";
import { api } from "../../../../../lib/sessao";
import { FormResponsavel } from "../../formularios";

export const metadata = { title: "Responsável — Admin Super PDV" };

export default async function ResponsavelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cliente = await carregar(async () =>
    (await api()).requisitar("GET", `/v1/admin/clientes/${id}`, { schema: clienteSchema }),
  );
  return (
    <ConteudoFormulario>
      <CabecalhoPagina
        titulo={cliente.responsavel ? "Editar responsável" : "Cadastrar responsável"}
        descricao={`Contato da equipe Super PDV com ${cliente.nome}. Não dá acesso ao sistema.`}
      />
      <FormResponsavel clienteId={cliente.id} responsavel={cliente.responsavel} />
    </ConteudoFormulario>
  );
}
