import { COOKIE_MENU } from "@super-pdv/web-session";
import { CascaApp, type ItemMenu } from "@super-pdv/web-session/telas";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { membroLogado } from "../../lib/sessao";
import { sair } from "../acoes-auth";

const MENU: ItemMenu[] = [
  { href: "/clientes", rotulo: "Clientes", icone: "clientes" },
  { href: "/equipe", rotulo: "Equipe", icone: "equipe" },
];

export default async function LayoutAutenticado({ children }: { children: ReactNode }) {
  const [membro, jar] = await Promise.all([membroLogado(), cookies()]);
  return (
    <CascaApp
      produto="Admin"
      contexto="Equipe Super PDV"
      usuario={{ nome: membro.nome, email: membro.email }}
      itens={MENU}
      acaoSair={sair}
      menuAberto={jar.get(COOKIE_MENU)?.value !== "false"}
    >
      {children}
    </CascaApp>
  );
}
