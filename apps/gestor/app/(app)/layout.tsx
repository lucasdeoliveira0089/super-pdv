import { ROTULO_PAPEL } from "@super-pdv/shared";
import { BotaoEnviar } from "@super-pdv/ui/components/formulario-cliente";
import { COOKIE_MENU } from "@super-pdv/web-session";
import { CascaApp, type ItemMenu, TelaAutenticacao } from "@super-pdv/web-session/telas";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { usuarioLogado } from "../../lib/sessao";
import { sair } from "../acoes-auth";

export default async function LayoutAutenticado({ children }: { children: ReactNode }) {
  const [usuario, jar] = await Promise.all([usuarioLogado(), cookies()]);

  if (!usuario.permissoes.includes("gestor.acessar")) {
    return (
      <TelaAutenticacao
        contexto="Gestor das suas empresas"
        titulo="Acesso pelo PDV"
        descricao={`O seu perfil (${ROTULO_PAPEL[usuario.papel]}) não tem acesso ao gestor. Use o PDV para operar o caixa.`}
      >
        <form action={sair}>
          <BotaoEnviar variant="outline" pendente="Saindo…">
            Sair
          </BotaoEnviar>
        </form>
      </TelaAutenticacao>
    );
  }

  const itens: ItemMenu[] = [
    ...(usuario.permissoes.includes("empresa.ler")
      ? [{ href: "/empresas", rotulo: "Empresas", icone: "empresas" as const }]
      : []),
    ...(usuario.permissoes.includes("usuario.ler")
      ? [{ href: "/usuarios", rotulo: "Usuários", icone: "usuarios" as const }]
      : []),
  ];
  return (
    <CascaApp
      produto="Gestor"
      contexto={usuario.cliente.nome}
      usuario={{
        nome: usuario.nome,
        email: usuario.email,
        detalhe: ROTULO_PAPEL[usuario.papel],
      }}
      itens={itens}
      acaoSair={sair}
      menuAberto={jar.get(COOKIE_MENU)?.value !== "false"}
    >
      {children}
    </CascaApp>
  );
}
