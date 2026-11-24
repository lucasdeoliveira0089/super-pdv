"use client";

import Link from "next/link";
import { type Cliente, formatarCep, formatarCnpj, type MembroEquipe } from "@super-pdv/shared";
import { Badge } from "@super-pdv/ui/components/badge";
import { colunasDe, DataTable } from "@super-pdv/ui/components/data-table";
import { BarraFiltros } from "@super-pdv/web-session/telas";
import { AcoesMembro } from "./equipe/formularios";

// Listagens do admin (spec web-layout). As colunas ficam no cliente porque
// definem funções de renderização; os dados vêm das páginas (servidor).

const linkClasse = "font-medium underline-offset-4 hover:underline";

const situacao = (ativo: boolean, sim: string, nao: string, destrutivo = false) => (
  <Badge variant={ativo ? "secondary" : destrutivo ? "destructive" : "outline"}>
    {ativo ? sim : nao}
  </Badge>
);

// ------------------------------------------------------------------ clientes

const cc = colunasDe<Cliente>();
const colunasClientes = cc.columns([
  cc.accessor("nome", {
    header: "Cliente",
    enableHiding: false,
    cell: ({ row }) => (
      <Link href={`/clientes/${row.original.id}`} className={linkClasse}>
        {row.original.nome}
      </Link>
    ),
  }),
  cc.accessor((c) => c.empresas.length, {
    id: "empresas",
    header: "Empresas",
    cell: ({ row }) => (
      <div className="grid gap-0.5">
        {row.original.empresas.map((e) => (
          <span key={e.id}>
            {e.nomeFantasia} <span className="text-muted-foreground">({formatarCnpj(e.cnpj)})</span>
          </span>
        ))}
      </div>
    ),
  }),
  cc.accessor((c) => c.donos.map((d) => d.email).join(", "), {
    id: "donos",
    header: "Dono",
  }),
  cc.accessor("ativo", {
    header: "Situação",
    cell: ({ row }) => situacao(row.original.ativo, "Ativo", "Suspenso", true),
  }),
]);

export function TabelaClientes({ clientes }: { clientes: Cliente[] }) {
  return (
    <DataTable
      aria-label="Clientes"
      colunas={colunasClientes}
      dados={clientes}
      idDaLinha={(c) => c.id}
      rotulos={{ nome: "Cliente", empresas: "Empresas", donos: "Dono", ativo: "Situação" }}
      ordenacaoInicial={[{ id: "nome", desc: false }]}
      nomeItens="clientes"
      vazio="Nenhum cliente encontrado."
      barra={
        <BarraFiltros
          busca={{
            nome: "busca",
            rotulo: "Buscar por nome ou CNPJ",
            placeholder: "Buscar por nome ou CNPJ…",
          }}
        />
      }
    />
  );
}

// -------------------------------------------------------------------- equipe

const ce = colunasDe<MembroEquipe>();

export function TabelaEquipe({ membros, euId }: { membros: MembroEquipe[]; euId: string }) {
  const colunas = ce.columns([
    ce.accessor("nome", { header: "Nome", enableHiding: false, cell: (i) => i.getValue() }),
    ce.accessor("email", { header: "E-mail" }),
    ce.accessor("ativo", {
      header: "Situação",
      cell: ({ row }) => situacao(row.original.ativo, "Ativo", "Inativo"),
    }),
    ce.display({
      id: "acoes",
      header: () => <span className="sr-only">Ações</span>,
      enableHiding: false,
      cell: ({ row }) => (
        <AcoesMembro
          id={row.original.id}
          nome={row.original.nome}
          ativo={row.original.ativo}
          euMesmo={row.original.id === euId}
        />
      ),
    }),
  ]);
  return (
    <DataTable
      aria-label="Membros da equipe"
      colunas={colunas}
      dados={membros}
      idDaLinha={(m) => m.id}
      rotulos={{ nome: "Nome", email: "E-mail", ativo: "Situação" }}
      ordenacaoInicial={[{ id: "nome", desc: false }]}
      nomeItens="membros"
      vazio="Nenhum membro cadastrado."
    />
  );
}

// ------------------------------------------------------- empresas do cliente

type EmpresaDoCliente = Cliente["empresas"][number];

/** Ex.: "Avenida Paulista, 1000 — São Paulo/SP · 01310-100". */
function resumoDoEndereco(e: EmpresaDoCliente["endereco"]): string | null {
  if (!e) return null;
  const complemento = e.complemento ? ` (${e.complemento})` : "";
  return `${e.logradouro}, ${e.numero}${complemento} — ${e.cidade}/${e.uf} · ${formatarCep(e.cep)}`;
}
const cm = colunasDe<EmpresaDoCliente>();

export function TabelaEmpresasDoCliente({
  clienteId,
  empresas,
}: {
  clienteId: string;
  empresas: EmpresaDoCliente[];
}) {
  const colunas = cm.columns([
    cm.accessor("nomeFantasia", {
      header: "Nome fantasia",
      enableHiding: false,
      cell: (i) => <span className="font-medium">{i.getValue()}</span>,
    }),
    cm.accessor("cnpj", { header: "CNPJ", cell: (i) => formatarCnpj(i.getValue()) }),
    cm.accessor("razaoSocial", { header: "Razão social" }),
    cm.accessor((e) => resumoDoEndereco(e.endereco), {
      id: "endereco",
      header: "Endereço",
      enableSorting: false,
      cell: (i) => i.getValue() ?? <span className="text-muted-foreground">Não cadastrado</span>,
    }),
    cm.accessor("ativa", {
      header: "Situação",
      cell: ({ row }) => situacao(row.original.ativa, "Ativa", "Inativa"),
    }),
    cm.display({
      id: "acoes",
      header: () => <span className="sr-only">Ações</span>,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="text-right">
          <Link
            href={`/clientes/${clienteId}/empresas/${row.original.id}`}
            className="text-sm underline-offset-4 hover:underline"
          >
            Editar
          </Link>
        </div>
      ),
    }),
  ]);
  return (
    <DataTable
      aria-label="Empresas do cliente"
      colunas={colunas}
      dados={empresas}
      idDaLinha={(e) => e.id}
      rotulos={{
        nomeFantasia: "Nome fantasia",
        cnpj: "CNPJ",
        razaoSocial: "Razão social",
        endereco: "Endereço",
        ativa: "Situação",
      }}
      ordenacaoInicial={[{ id: "nomeFantasia", desc: false }]}
      nomeItens="empresas"
      vazio="Nenhuma empresa cadastrada."
    />
  );
}
