import { ROTULO_PAPEL } from "@super-pdv/shared";
import { BotaoEnviar } from "@super-pdv/ui/components/formulario-cliente";
import { CascaApp, TelaAutenticacao } from "@super-pdv/web-session/telas";
import type { ReactNode } from "react";
import { usuarioLogado } from "../../lib/sessao";
import { sair } from "../acoes-auth";

export default async function LayoutAutenticado({ children }: { children: ReactNode }) {
  const usuario = await usuarioLogado();

  if (!usuario.permissoes.includes("gestor.acessar")) {
    return (
      <TelaAutenticacao
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

  const itens = [
    ...(usuario.permissoes.includes("empresa.ler")
      ? [{ href: "/empresas", rotulo: "Empresas" }]
      : []),
    ...(usuario.permissoes.includes("usuario.ler")
      ? [{ href: "/usuarios", rotulo: "Usuários" }]
      : []),
  ];
  return (
    <CascaApp
      produto={usuario.cliente.nome}
      usuario={usuario.nome}
      detalhe={ROTULO_PAPEL[usuario.papel]}
      itens={itens}
      acaoSair={sair}
    >
      {children}
    </CascaApp>
  );
}
