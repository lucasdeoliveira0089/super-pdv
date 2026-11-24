import Link from "next/link";
import { clienteSchema, formatarCelular } from "@super-pdv/shared";
import { Badge } from "@super-pdv/ui/components/badge";
import { Button } from "@super-pdv/ui/components/button";
import { BotaoEnviar } from "@super-pdv/ui/components/formulario-cliente";
import { carregar } from "@super-pdv/web-session";
import { CabecalhoPagina } from "@super-pdv/web-session/telas";
import { api } from "../../../../lib/sessao";
import { TabelaEmpresasDoCliente } from "../../tabelas";
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

      <section className="mb-8" aria-labelledby="titulo-responsavel">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="titulo-responsavel" className="font-semibold">
            Responsável
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link href={`/clientes/${cliente.id}/responsavel`}>
              {cliente.responsavel ? "Editar responsável" : "Cadastrar responsável"}
            </Link>
          </Button>
        </div>
        {cliente.responsavel ? (
          <dl className="grid gap-x-6 gap-y-1 rounded-lg border p-3 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-muted-foreground">Nome</dt>
            <dd className="font-medium">{cliente.responsavel.nome}</dd>
            <dt className="text-muted-foreground">Celular</dt>
            <dd>{formatarCelular(cliente.responsavel.celular)}</dd>
            <dt className="text-muted-foreground">E-mail</dt>
            <dd>{cliente.responsavel.email}</dd>
          </dl>
        ) : (
          <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-sm">
            Responsável não cadastrado.
          </p>
        )}
      </section>

      <section className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Empresas</h2>
          <Button asChild variant="outline" size="sm">
            <Link href={`/clientes/${cliente.id}/empresas/nova`}>Nova empresa</Link>
          </Button>
        </div>
        <TabelaEmpresasDoCliente clienteId={cliente.id} empresas={cliente.empresas} />
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
