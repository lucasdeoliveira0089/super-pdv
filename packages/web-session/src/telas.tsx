"use client";

import type * as React from "react";

// Ponto de entrada das telas compartilhadas por admin e gestor (`@super-pdv/web-session/telas`).
export {
  FormEsqueciSenha,
  FormLogin,
  FormRedefinirSenha,
  FormTrocarSenha,
  PainelMarca,
  TelaAutenticacao,
} from "./autenticacao";
export { type BuscaBarra, BarraFiltros, type FiltroBarra } from "./barra-filtros";
export {
  CabecalhoApp,
  CascaApp,
  type ChaveIcone,
  type ItemMenu,
  MenuUsuario,
  type UsuarioCasca,
} from "./casca";

/** Cabeçalho padrão de página com ações à direita. */
/** Coluna centralizada de até 768 px para páginas de formulário (spec web-layout). */
export function ConteudoFormulario({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">{children}</div>;
}

export function CabecalhoPagina({
  titulo,
  descricao,
  acoes,
}: {
  titulo: string;
  descricao?: string;
  acoes?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descricao && <p className="text-muted-foreground text-sm">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}
