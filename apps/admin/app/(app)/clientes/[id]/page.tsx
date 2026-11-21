import Link from "next/link";
import { clienteSchema, formatarCnpj } from "@super-pdv/shared";
import { Badge } from "@super-pdv/ui/components/badge";
import { Button } from "@super-pdv/ui/components/button";
import { BotaoEnviar } from "@super-pdv/ui/components/formulario-cliente";
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
import { api } from "../../../../lib/sessao";
import { alterarSituacaoCliente } from "../acoes";
import { BotaoRedefinirSenhaDono } from "../formularios";

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cliente = await carregar(async () =>
    (await api()).requisitar("GET", `/v1/admin/clientes/${id}`, { schema: clienteSchema }),
  );
  return (
    <>
      <CabecalhoPagina
        titulo={cliente.nome}
        acoes={
          <form action={alterarSituacaoCliente} className="flex items-center gap-3">
            <Badge variant={cliente.ativo ? "secondary" : "destructive"}>
              {cliente.ativo ? "Ativo" : "Suspenso"}
            </Badge>
            <input type="hidden" name="id" value={cliente.id} />
            <input type="hidden" name="ativo" value={String(!cliente.ativo)} />
            <BotaoEnviar variant={cliente.ativo ? "destructive" : "default"} pendente="Salvando…">
              {cliente.ativo ? "Suspender cliente" : "Reativar cliente"}
            </BotaoEnviar>
          </form>
        }
      />

      <section className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Empresas</h2>
          <Button asChild variant="outline" size="sm">
            <Link href={`/clientes/${cliente.id}/empresas/nova`}>Nova empresa</Link>
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome fantasia</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Razão social</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cliente.empresas.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.nomeFantasia}</TableCell>
                <TableCell>{formatarCnpj(e.cnpj)}</TableCell>
                <TableCell>{e.razaoSocial}</TableCell>
                <TableCell>
                  <Badge variant={e.ativa ? "secondary" : "outline"}>
                    {e.ativa ? "Ativa" : "Inativa"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/clientes/${cliente.id}/empresas/${e.id}`}
                    className="text-sm underline-offset-4 hover:underline"
                  >
                    Editar
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Donos</h2>
        <ul className="grid gap-3">
          {cliente.donos.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-start justify-between gap-4 rounded-lg border p-3"
            >
              <div>
                <div className="font-medium">{d.nome}</div>
                <div className="text-muted-foreground text-sm">{d.email}</div>
              </div>
              <BotaoRedefinirSenhaDono usuarioId={d.id} nome={d.nome} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
