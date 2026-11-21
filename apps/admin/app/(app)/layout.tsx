import { CascaApp } from "@super-pdv/web-session/telas";
import type { ReactNode } from "react";
import { membroLogado } from "../../lib/sessao";
import { sair } from "../acoes-auth";

const MENU = [
  { href: "/clientes", rotulo: "Clientes" },
  { href: "/equipe", rotulo: "Equipe" },
];

export default async function LayoutAutenticado({ children }: { children: ReactNode }) {
  const membro = await membroLogado();
  return (
    <CascaApp
      produto="Admin Super PDV"
      usuario={membro.nome}
      detalhe={membro.email}
      itens={MENU}
      acaoSair={sair}
    >
      {children}
    </CascaApp>
  );
}
