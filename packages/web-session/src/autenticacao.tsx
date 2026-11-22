"use client";

import type * as React from "react";
import { useActionState } from "react";
import { StoreIcon } from "lucide-react";
import { AlertaErro, AlertaSucesso, CampoTexto } from "@super-pdv/ui/components/campos";
import { Card, CardContent } from "@super-pdv/ui/components/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@super-pdv/ui/components/field";
import { BotaoEnviar } from "@super-pdv/ui/components/formulario-cliente";
import { Input } from "@super-pdv/ui/components/input";
import type { EstadoFormulario } from "./formularios";

// Telas de autenticação do admin e do gestor no estilo do bloco `login-04` do
// shadcn (spec web-layout): formulário à esquerda e painel da marca à direita.
// Sem login social nem cadastro público, que o sistema não tem.

type Acao = (estado: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>;

/** Painel da marca (D5): só CSS, sem arquivo de imagem. */
export function PainelMarca({ contexto }: { contexto?: string }) {
  return (
    <div
      data-testid="painel-marca"
      aria-hidden
      className="from-primary relative hidden flex-col justify-between overflow-hidden bg-linear-to-br to-violet-900 p-8 text-white md:flex"
    >
      <div className="absolute -top-16 -right-16 size-64 rounded-full bg-white/10" />
      <div className="absolute -bottom-24 -left-10 size-72 rounded-full bg-white/5" />
      <div className="relative flex items-center gap-2 font-semibold">
        <span className="flex size-8 items-center justify-center rounded-lg bg-white/15">
          <StoreIcon className="size-4" />
        </span>
        Super PDV
      </div>
      <div className="relative grid gap-2">
        <p className="text-2xl leading-tight font-semibold text-balance">
          Ponto de venda e gestão para o varejo brasileiro.
        </p>
        {contexto && <p className="text-sm text-white/80">{contexto}</p>}
      </div>
    </div>
  );
}

export function TelaAutenticacao({
  titulo,
  descricao,
  children,
  rodape,
  contexto,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
  rodape?: React.ReactNode;
  /** Texto curto no painel da marca (ex.: "Gestor do cliente"). */
  contexto?: string;
}) {
  return (
    <main className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="grid w-full max-w-sm gap-6 md:max-w-4xl">
        <Card className="overflow-hidden p-0">
          <CardContent className="grid p-0 md:grid-cols-2">
            <div className="grid content-center gap-6 p-6 md:p-10">
              <div className="grid gap-1 text-center">
                <h1 className="text-2xl font-bold">{titulo}</h1>
                {descricao && (
                  <p className="text-muted-foreground text-sm text-balance">{descricao}</p>
                )}
              </div>
              {children}
            </div>
            <PainelMarca contexto={contexto} />
          </CardContent>
        </Card>
        {rodape && (
          <div className="text-muted-foreground text-center text-sm text-balance">{rodape}</div>
        )}
      </div>
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
  const errosSenha = estado?.campos?.senha;
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
          placeholder="voce@empresa.com.br"
          autoFocus
          required
          defaultValue={estado?.valores?.email}
          erros={estado?.campos?.email}
        />
        <Field data-invalid={errosSenha?.length ? true : undefined}>
          <div className="flex items-center">
            <FieldLabel htmlFor="senha">Senha</FieldLabel>
            <a
              href="/esqueci-senha"
              className="text-muted-foreground hover:text-foreground ml-auto text-sm underline-offset-4 hover:underline"
            >
              Esqueci minha senha
            </a>
          </div>
          <Input
            id="senha"
            name="senha"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={errosSenha?.length ? true : undefined}
          />
          {errosSenha?.length ? <FieldError>{errosSenha.join(" ")}</FieldError> : null}
        </Field>
        <BotaoEnviar pendente="Entrando…">Entrar</BotaoEnviar>
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
          placeholder="voce@empresa.com.br"
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
