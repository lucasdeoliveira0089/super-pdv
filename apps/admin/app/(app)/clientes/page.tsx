import Link from "next/link";
import { clienteSchema } from "@super-pdv/shared";
import { Button } from "@super-pdv/ui/components/button";
import { carregar } from "@super-pdv/web-session";
import { CabecalhoPagina } from "@super-pdv/web-session/telas";
import { api } from "../../../lib/sessao";
import { TabelaClientes } from "../tabelas";

export const metadata = { title: "Clientes — Admin Super PDV" };

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string }>;
}) {
  const { busca = "" } = await searchParams;
  const cliente = await api();
  const clientes = await carregar(() =>
    cliente.requisitar("GET", `/v1/admin/clientes?busca=${encodeURIComponent(busca)}`, {
      schema: clienteSchema.array(),
    }),
  );
  return (
    <>
      <CabecalhoPagina
        titulo="Clientes"
        descricao="Clientes e as empresas (CNPJs) que usam o Super PDV."
        acoes={
          <Button asChild>
            <Link href="/clientes/novo">Novo cliente</Link>
          </Button>
        }
      />
      <TabelaClientes clientes={clientes} />
    </>
  );
}
