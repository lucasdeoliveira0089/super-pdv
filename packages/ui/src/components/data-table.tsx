"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnVisibilityState,
  columnVisibilityFeature,
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  type PaginationState,
  type RowData,
  rowPaginationFeature,
  rowSortingFeature,
  type SortingState,
  sortFn_alphanumeric,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, Columns3Icon } from "lucide-react";
import { Button } from "@super-pdv/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@super-pdv/ui/components/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@super-pdv/ui/components/table";

// Tabela de listagem padrão (spec web-layout): ordenação, colunas visíveis,
// paginação e estado vazio no navegador. Busca e filtros ficam na barra
// (`barra`), que é de responsabilidade de quem usa a tabela.

/** Recursos usados por todas as tabelas (o resto do TanStack fica fora do bundle). */
export const recursosTabela = tableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text, datetime: sortFn_datetime },
});

export type RecursosTabela = typeof recursosTabela;
export type ColunaTabela<T extends RowData> = ColumnDef<RecursosTabela, T, unknown>;

/** Cria as colunas de uma tabela com tipos (ver `createColumnHelper` do TanStack). */
export function colunasDe<T extends RowData>() {
  return createColumnHelper<RecursosTabela, T>();
}

export const ITENS_POR_PAGINA = 10;

export interface DataTableProps<T extends RowData> {
  colunas: ColunaTabela<T>[];
  dados: T[];
  /** Rótulo de cada coluna no menu "Colunas" e na ordenação (por id da coluna). */
  rotulos: Record<string, string>;
  /** Busca e filtros, exibidos à esquerda do botão "Colunas". */
  barra?: React.ReactNode;
  /** Mensagem quando não há linhas. */
  vazio?: string;
  /** Nome no plural para a contagem (ex.: "usuários"). */
  nomeItens?: string;
  /** Ordenação inicial (ex.: `[{ id: "nome", desc: false }]`). */
  ordenacaoInicial?: SortingState;
  /** Identificador estável da linha (padrão: índice). */
  idDaLinha?: (linha: T) => string;
  "aria-label"?: string;
}

export function DataTable<T extends RowData>({
  colunas,
  dados,
  rotulos,
  barra,
  vazio = "Nenhum resultado.",
  nomeItens = "resultados",
  ordenacaoInicial = [],
  idDaLinha,
  "aria-label": rotuloTabela,
}: DataTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>(ordenacaoInicial);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({});
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: ITENS_POR_PAGINA,
  });

  // Dados novos (busca ou filtro no servidor) voltam para a primeira página.
  React.useEffect(() => {
    setPagination((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }));
  }, [dados]);

  const table = useTable({
    features: recursosTabela,
    data: dados,
    columns: colunas,
    getRowId: idDaLinha ? (linha) => idDaLinha(linha) : undefined,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    state: { sorting, columnVisibility, pagination },
  });

  const linhas = table.getRowModel().rows;
  const total = dados.length;
  const inicio = total === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
  const fim = Math.min(total, (pagination.pageIndex + 1) * pagination.pageSize);
  const ocultaveis = table.getAllColumns().filter((c) => c.getCanHide());

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-1 flex-wrap items-center gap-2">{barra}</div>
        {ocultaveis.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Columns3Icon />
                Colunas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Colunas visíveis</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ocultaveis.map((coluna) => (
                <DropdownMenuCheckboxItem
                  key={coluna.id}
                  checked={coluna.getIsVisible()}
                  onCheckedChange={(valor) => coluna.toggleVisibility(!!valor)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {rotulos[coluna.id] ?? coluna.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table aria-label={rotuloTabela}>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((grupo) => (
              <TableRow key={grupo.id}>
                {grupo.headers.map((header) => {
                  const coluna = header.column;
                  const ordem = coluna.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={
                        ordem === "asc" ? "ascending" : ordem === "desc" ? "descending" : undefined
                      }
                    >
                      {header.isPlaceholder ? null : coluna.getCanSort() ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-2.5 h-8"
                          onClick={coluna.getToggleSortingHandler()}
                        >
                          <table.FlexRender header={header} />
                          {ordem === "asc" ? (
                            <ArrowUpIcon aria-hidden />
                          ) : ordem === "desc" ? (
                            <ArrowDownIcon aria-hidden />
                          ) : (
                            <ArrowUpDownIcon aria-hidden className="opacity-50" />
                          )}
                        </Button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {linhas.length ? (
              linhas.map((linha) => (
                <TableRow key={linha.id}>
                  {linha.getVisibleCells().map((celula) => (
                    <TableCell key={celula.id}>
                      <table.FlexRender cell={celula} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length || 1}
                  className="text-muted-foreground h-24 text-center"
                >
                  {vazio}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm" aria-live="polite" data-testid="contagem">
          {total === 0 ? `0 ${nomeItens}` : `${inicio}–${fim} de ${total} ${nomeItens}`}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Próximo
          </Button>
        </div>
      </div>
    </div>
  );
}
