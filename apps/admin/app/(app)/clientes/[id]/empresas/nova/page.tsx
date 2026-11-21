import { CabecalhoPagina } from "@super-pdv/web-session/telas";
import { FormEmpresa } from "../../../formularios";

export const metadata = { title: "Nova empresa — Admin Super PDV" };

export default async function NovaEmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <CabecalhoPagina titulo="Nova empresa" descricao="Cada estabelecimento tem o seu CNPJ." />
      <FormEmpresa clienteId={id} />
    </>
  );
}
