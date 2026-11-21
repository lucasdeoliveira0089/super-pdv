import Link from "next/link";
import { clienteSchema, formatarCnpj } from "@super-pdv/shared";
import { Badge } from "@super-pdv/ui/components/badge";
import { Button } from "@super-pdv/ui/components/button";
import { Input } from "@super-pdv/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@super-pdv/ui/components/table";
import { carregar } from "@super-pdv/web-session";
import { CabecalhoPagina } from "@super-pdv/web-session/telas";
import { api } from "../../../lib/sessao";

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
      <form role="search" className="mb-4 flex max-w-md gap-2">
        <Input
          name="busca"
          aria-label="Buscar por nome ou CNPJ"
          placeholder="Buscar por nome ou CNPJ"
          defaultValue={busca}
        />
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Empresas</TableHead>
            <TableHead>Dono</TableHead>
            <TableHead>Situação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientes.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                Nenhum cliente encontrado.
              </TableCell>
            </TableRow>
          )}
          {clientes.map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                <Link
                  href={`/clientes/${c.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {c.nome}
                </Link>
              </TableCell>
              <TableCell>
                {c.empresas.map((e) => (
                  <div key={e.id}>
                    {e.nomeFantasia}{" "}
                    <span className="text-muted-foreground">({formatarCnpj(e.cnpj)})</span>
                  </div>
                ))}
              </TableCell>
              <TableCell>{c.donos.map((d) => d.email).join(", ")}</TableCell>
              <TableCell>
                <Badge variant={c.ativo ? "secondary" : "destructive"}>
                  {c.ativo ? "Ativo" : "Suspenso"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
