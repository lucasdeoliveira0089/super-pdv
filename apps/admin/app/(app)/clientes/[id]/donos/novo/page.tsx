import { clienteSchema } from "@super-pdv/shared";
import { carregar } from "@super-pdv/web-session";
import { CabecalhoPagina } from "@super-pdv/web-session/telas";
import { api } from "../../../../../../lib/sessao";
import { FormDono } from "../../../formularios";

export const metadata = { title: "Novo Dono — Admin Super PDV" };

export default async function NovoDonoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cliente = await carregar(async () =>
    (await api()).requisitar("GET", `/v1/admin/clientes/${id}`, { schema: clienteSchema }),
  );
  return (
    <>
      <CabecalhoPagina titulo="Cadastrar Dono" descricao={cliente.nome} />
      <FormDono clienteId={cliente.id} />
    </>
  );
}
