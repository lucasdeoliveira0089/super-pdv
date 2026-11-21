"use client";

import type * as React from "react";
import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { AlertaErro, AlertaSucesso, CampoTexto } from "@super-pdv/ui/components/campos";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@super-pdv/ui/components/card";
import { FieldGroup } from "@super-pdv/ui/components/field";
import { BotaoEnviar } from "@super-pdv/ui/components/formulario-cliente";
import type { EstadoFormulario } from "./formularios";

type Acao = (estado: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>;

export function TelaAutenticacao({
  titulo,
  descricao,
  children,
  rodape,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
  rodape?: React.ReactNode;
}) {
  return (
    <main className="bg-muted/40 flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1>{titulo}</h1>
          </CardTitle>
          {descricao && <CardDescription>{descricao}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
        {rodape && <CardFooter className="text-sm">{rodape}</CardFooter>}
      </Card>
    </main>
  );
}

export function FormLogin({
  acao,
  destino,
  aviso,
}: {
  acao: Acao;
  destino: string;
  aviso?: string;
}) {
  const [estado, enviar] = useActionState(acao, null);
  return (
    <form action={enviar} noValidate>
      <FieldGroup>
        <AlertaSucesso mensagem={aviso} />
        <AlertaErro mensagem={estado?.mensagem} />
        <input type="hidden" name="next" value={destino} />
        <CampoTexto
          name="email"
          rotulo="E-mail"
          type="email"
          autoComplete="username"
          autoFocus
          required
          defaultValue={estado?.valores?.email}
          erros={estado?.campos?.email}
        />
        <CampoTexto
          name="senha"
          rotulo="Senha"
          type="password"
          autoComplete="current-password"
          required
          erros={estado?.campos?.senha}
        />
        <BotaoEnviar pendente="Entrando…">Entrar</BotaoEnviar>
        <a
          href="/esqueci-senha"
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          Esqueci minha senha
        </a>
      </FieldGroup>
    </form>
  );
}

export function FormTrocarSenha({ acao }: { acao: Acao }) {
  const [estado, enviar] = useActionState(acao, null);
  return (
    <form action={enviar} noValidate>
      <FieldGroup>
        <AlertaErro mensagem={estado?.mensagem} />
        <CampoTexto
          name="senhaAtual"
          rotulo="Senha atual"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          erros={estado?.campos?.senhaAtual}
        />
        <CampoTexto
          name="novaSenha"
          rotulo="Nova senha"
          type="password"
          autoComplete="new-password"
          descricao="Entre 8 e 128 caracteres, diferente do seu e-mail."
          required
          erros={estado?.campos?.novaSenha}
        />
        <CampoTexto
          name="confirmacao"
          rotulo="Confirme a nova senha"
          type="password"
          autoComplete="new-password"
          required
          erros={estado?.campos?.confirmacao}
        />
        <BotaoEnviar pendente="Salvando…">Salvar nova senha</BotaoEnviar>
      </FieldGroup>
    </form>
  );
}

export function FormEsqueciSenha({ acao }: { acao: Acao }) {
  const [estado, enviar] = useActionState(acao, null);
  if (estado?.sucesso)
    return <AlertaSucesso titulo="Verifique o seu e-mail" mensagem={estado.sucesso} />;
  return (
    <form action={enviar} noValidate>
      <FieldGroup>
        <AlertaErro mensagem={estado?.mensagem} />
        <CampoTexto
          name="email"
          rotulo="E-mail"
          type="email"
          autoComplete="username"
          autoFocus
          required
          defaultValue={estado?.valores?.email}
          erros={estado?.campos?.email}
        />
        <BotaoEnviar pendente="Enviando…">Enviar link de redefinição</BotaoEnviar>
      </FieldGroup>
    </form>
  );
}

export function FormRedefinirSenha({ acao, token }: { acao: Acao; token: string }) {
  const [estado, enviar] = useActionState(acao, null);
  return (
    <form action={enviar} noValidate>
      <FieldGroup>
        <AlertaErro mensagem={estado?.mensagem} />
        <input type="hidden" name="token" value={token} />
        <CampoTexto
          name="novaSenha"
          rotulo="Nova senha"
          type="password"
          autoComplete="new-password"
          descricao="Entre 8 e 128 caracteres, diferente do seu e-mail."
          autoFocus
          required
          erros={estado?.campos?.novaSenha}
        />
        <CampoTexto
          name="confirmacao"
          rotulo="Confirme a nova senha"
          type="password"
          autoComplete="new-password"
          required
          erros={estado?.campos?.confirmacao}
        />
        <BotaoEnviar pendente="Salvando…">Definir nova senha</BotaoEnviar>
      </FieldGroup>
    </form>
  );
}

export interface ItemMenu {
  href: string;
  rotulo: string;
}

/** Casca das páginas autenticadas: menu lateral, usuário logado e botão Sair. */
export function CascaApp({
  produto,
  usuario,
  detalhe,
  itens,
  acaoSair,
  children,
}: {
  produto: string;
  usuario: string;
  detalhe?: string;
  itens: ItemMenu[];
  acaoSair: () => Promise<void>;
  children: React.ReactNode;
}) {
  const caminho = usePathname();
  return (
    <div className="flex min-h-svh">
      <aside className="bg-muted/40 flex w-60 shrink-0 flex-col border-r p-4">
        <p className="mb-6 text-sm font-semibold">{produto}</p>
        <nav aria-label="Menu principal" className="grid gap-1">
          {itens.map((item) => {
            const ativo = caminho === item.href || caminho.startsWith(`${item.href}/`);
            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className="hover:bg-muted aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground rounded-md px-3 py-2 text-sm"
              >
                {item.rotulo}
              </a>
            );
          })}
        </nav>
        <div className="mt-auto grid gap-2 border-t pt-4 text-sm">
          <span className="font-medium" data-testid="usuario-logado">
            {usuario}
          </span>
          {detalhe && <span className="text-muted-foreground">{detalhe}</span>}
          <form action={acaoSair}>
            <BotaoEnviar variant="outline" size="sm" pendente="Saindo…">
              Sair
            </BotaoEnviar>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

/** Cabeçalho padrão de página com ações à direita. */
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
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold">{titulo}</h1>
        {descricao && <p className="text-muted-foreground text-sm">{descricao}</p>}
      </div>
      {acoes && <div className="flex gap-2">{acoes}</div>}
    </div>
  );
}
