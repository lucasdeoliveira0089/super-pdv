"use client";

import Link from "next/link";
import {
  type Empresa,
  formatarCnpj,
  PAPEIS,
  PAPEIS_GLOBAIS,
  ROTULO_PAPEL,
  type Usuario,
} from "@super-pdv/shared";
import { Badge } from "@super-pdv/ui/components/badge";
import { colunasDe, DataTable } from "@super-pdv/ui/components/data-table";
import { BarraFiltros } from "@super-pdv/web-session/telas";

// Listagens do gestor (spec web-layout). As colunas ficam no cliente porque
// definem funções de renderização; os dados vêm das páginas (servidor).

const situacao = (ativo: boolean, sim: string, nao: string) => (
  <Badge variant={ativo ? "secondary" : "outline"}>{ativo ? sim : nao}</Badge>
);

// ------------------------------------------------------------------ empresas

const ce = colunasDe<Empresa>();
const colunasEmpresas = ce.columns([
  ce.accessor("nomeFantasia", {
    header: "Nome fantasia",
    enableHiding: false,
    cell: (i) => <span className="font-medium">{i.getValue()}</span>,
  }),
  ce.accessor("cnpj", { header: "CNPJ", cell: (i) => formatarCnpj(i.getValue()) }),
  ce.accessor("razaoSocial", { header: "Razão social" }),
  ce.accessor("ativa", {
    header: "Situação",
    cell: ({ row }) => situacao(row.original.ativa, "Ativa", "Inativa"),
  }),
]);

export function TabelaEmpresas({ empresas }: { empresas: Empresa[] }) {
  return (
    <DataTable
      aria-label="Empresas"
      colunas={colunasEmpresas}
      dados={empresas}
      idDaLinha={(e) => e.id}
      rotulos={{
        nomeFantasia: "Nome fantasia",
        cnpj: "CNPJ",
        razaoSocial: "Razão social",
        ativa: "Situação",
      }}
      ordenacaoInicial={[{ id: "nomeFantasia", desc: false }]}
      nomeItens="empresas"
      vazio="Nenhuma empresa disponível."
    />
  );
}

// ------------------------------------------------------------------ usuários

const cu = colunasDe<Usuario>();

export function TabelaUsuarios({
  usuarios,
  empresas,
}: {
  usuarios: Usuario[];
  empresas: Pick<Empresa, "id" | "nomeFantasia">[];
}) {
  const nomeEmpresa = new Map(empresas.map((e) => [e.id, e.nomeFantasia]));
  const empresasDe = (u: Usuario) =>
    PAPEIS_GLOBAIS.includes(u.papel)
      ? "Todas"
      : u.empresaIds.map((id) => nomeEmpresa.get(id) ?? "—").join(", ");

  const colunas = cu.columns([
    cu.accessor("nome", {
      header: "Nome",
      enableHiding: false,
      cell: ({ row }) => (
        <Link
          href={`/usuarios/${row.original.id}`}
          className="font-medium underline-offset-4 hover:underline"
        >
          {row.original.nome}
        </Link>
      ),
    }),
    cu.accessor("email", { header: "E-mail" }),
    cu.accessor((u) => ROTULO_PAPEL[u.papel], { id: "papel", header: "Papel" }),
    cu.accessor(empresasDe, { id: "empresas", header: "Empresas" }),
    cu.accessor("ativo", {
      header: "Situação",
      cell: ({ row }) => situacao(row.original.ativo, "Ativo", "Inativo"),
    }),
  ]);

  return (
    <DataTable
      aria-label="Usuários"
      colunas={colunas}
      dados={usuarios}
      idDaLinha={(u) => u.id}
      rotulos={{
        nome: "Nome",
        email: "E-mail",
        papel: "Papel",
        empresas: "Empresas",
        ativo: "Situação",
      }}
      ordenacaoInicial={[{ id: "nome", desc: false }]}
      nomeItens="usuários"
      vazio="Nenhum usuário encontrado."
      barra={
        <BarraFiltros
          filtros={[
            {
              nome: "papel",
              rotulo: "Papel",
              opcoes: [
                { valor: "", rotulo: "Todos" },
                ...PAPEIS.map((p) => ({ valor: p, rotulo: ROTULO_PAPEL[p] })),
              ],
            },
            {
              nome: "empresaId",
              rotulo: "Empresa",
              opcoes: [
                { valor: "", rotulo: "Todas" },
                ...empresas.map((e) => ({ valor: e.id, rotulo: e.nomeFantasia })),
              ],
            },
            {
              nome: "ativo",
              rotulo: "Situação",
              opcoes: [
                { valor: "", rotulo: "Todas" },
                { valor: "true", rotulo: "Ativos" },
                { valor: "false", rotulo: "Inativos" },
              ],
            },
          ]}
        />
      }
    />
  );
}
