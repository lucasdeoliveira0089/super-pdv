"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@super-pdv/ui/components/button";
import { AlertaErro, CampoTexto } from "@super-pdv/ui/components/campos";
import { FieldGroup } from "@super-pdv/ui/components/field";
import { BotaoEnviar, SenhaTemporaria } from "@super-pdv/ui/components/formulario-cliente";
import { alterarSituacaoMembro, criarMembro, redefinirSenhaMembro } from "./acoes";

export function FormNovoMembro() {
  const [estado, enviar] = useActionState(criarMembro, null);
  if (estado?.senhaTemporaria) {
    return (
      <div className="grid max-w-xl gap-3">
        <SenhaTemporaria senha={estado.senhaTemporaria} para={estado.para ?? "o novo membro"} />
        <Button asChild variant="outline" className="w-fit">
          <Link href="/equipe">Cadastrar outro membro</Link>
        </Button>
      </div>
    );
  }
  return (
    <form action={enviar} noValidate className="max-w-xl">
      <FieldGroup>
        <AlertaErro mensagem={estado?.mensagem} />
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            name="nome"
            rotulo="Nome"
            defaultValue={estado?.valores?.nome}
            erros={estado?.campos?.nome}
          />
          <CampoTexto
            name="email"
            rotulo="E-mail"
            type="email"
            defaultValue={estado?.valores?.email}
            erros={estado?.campos?.email}
          />
        </div>
        <BotaoEnviar className="w-fit" pendente="Cadastrando…">
          Cadastrar membro
        </BotaoEnviar>
      </FieldGroup>
    </form>
  );
}

export function AcoesMembro({
  id,
  nome,
  ativo,
  euMesmo,
}: {
  id: string;
  nome: string;
  ativo: boolean;
  euMesmo: boolean;
}) {
  const [situacao, alterar] = useActionState(alterarSituacaoMembro, null);
  const [senha, redefinir] = useActionState(redefinirSenhaMembro, null);
  if (senha?.senhaTemporaria) return <SenhaTemporaria senha={senha.senhaTemporaria} para={nome} />;
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <AlertaErro mensagem={situacao?.mensagem ?? senha?.mensagem} />
      {!euMesmo && (
        <form action={alterar}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="ativo" value={String(!ativo)} />
          <BotaoEnviar variant="outline" size="sm" pendente="Salvando…">
            {ativo ? "Desativar" : "Reativar"}
          </BotaoEnviar>
        </form>
      )}
      {!euMesmo && ativo && (
        <form action={redefinir}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="nome" value={nome} />
          <BotaoEnviar variant="outline" size="sm" pendente="Gerando…">
            Redefinir senha
          </BotaoEnviar>
        </form>
      )}
    </div>
  );
}
