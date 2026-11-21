import { clienteSchema, formatarCnpj } from "@super-pdv/shared";
import { carregar } from "@super-pdv/web-session";
import { CabecalhoPagina } from "@super-pdv/web-session/telas";
import { notFound } from "next/navigation";
import { api } from "../../../../../../lib/sessao";
import { FormEmpresa } from "../../../formularios";

export const metadata = { title: "Editar empresa — Admin Super PDV" };

export default async function EditarEmpresaPage({
  params,
}: {
  params: Promise<{ id: string; empresaId: string }>;
}) {
  const { id, empresaId } = await params;
  const cliente = await carregar(async () =>
    (await api()).requisitar("GET", `/v1/admin/clientes/${id}`, { schema: clienteSchema }),
  );
  const empresa = cliente.empresas.find((e) => e.id === empresaId);
  if (!empresa) notFound();
  return (
    <>
      <CabecalhoPagina
        titulo={empresa.nomeFantasia}
        descricao={`CNPJ ${formatarCnpj(empresa.cnpj)} (não pode ser alterado)`}
      />
      <FormEmpresa clienteId={id} empresa={empresa} />
    </>
  );
}
