"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { Empresa } from "@super-pdv/shared";
import { Button } from "@super-pdv/ui/components/button";
import { AlertaErro, CampoSelecao, CampoTexto } from "@super-pdv/ui/components/campos";
import { FieldGroup, FieldLegend, FieldSet } from "@super-pdv/ui/components/field";
import { BotaoEnviar, SenhaTemporaria } from "@super-pdv/ui/components/formulario-cliente";
import { adicionarEmpresa, atualizarEmpresa, criarCliente, redefinirSenhaDono } from "./acoes";

export function FormNovoCliente() {
  const [estado, enviar] = useActionState(criarCliente, null);
  if (estado?.senhaTemporaria) {
    return (
      <div className="grid max-w-xl gap-4">
        <SenhaTemporaria senha={estado.senhaTemporaria} para={estado.para ?? "o Dono"} />
        <Button asChild>
          <Link href={`/clientes/${estado.id}`}>Ver cliente</Link>
        </Button>
      </div>
    );
  }
  const c = estado?.campos;
  const v = estado?.valores;
  return (
    <form action={enviar} noValidate className="max-w-xl">
      <FieldGroup>
        <AlertaErro mensagem={estado?.mensagem} />
        <CampoTexto
          name="nome"
          rotulo="Nome do cliente"
          autoFocus
          defaultValue={v?.nome}
          erros={c?.nome}
        />
        <FieldSet>
          <FieldLegend>Primeira empresa</FieldLegend>
          <FieldGroup>
            <CampoTexto
              name="cnpj"
              rotulo="CNPJ"
              descricao="Numérico ou alfanumérico, com ou sem máscara."
              defaultValue={v?.cnpj}
              erros={c?.["empresa.cnpj"]}
            />
            <CampoTexto
              name="razaoSocial"
              rotulo="Razão social"
              defaultValue={v?.razaoSocial}
              erros={c?.["empresa.razaoSocial"]}
            />
            <CampoTexto
              name="nomeFantasia"
              rotulo="Nome fantasia"
              defaultValue={v?.nomeFantasia}
              erros={c?.["empresa.nomeFantasia"]}
            />
          </FieldGroup>
        </FieldSet>
        <FieldSet>
          <FieldLegend>Dono</FieldLegend>
          <FieldGroup>
            <CampoTexto
              name="donoNome"
              rotulo="Nome do Dono"
              defaultValue={v?.donoNome}
              erros={c?.["dono.nome"]}
            />
            <CampoTexto
              name="donoEmail"
              rotulo="E-mail do Dono"
              type="email"
              defaultValue={v?.donoEmail}
              erros={c?.["dono.email"]}
            />
          </FieldGroup>
        </FieldSet>
        <BotaoEnviar pendente="Cadastrando…">Cadastrar cliente</BotaoEnviar>
      </FieldGroup>
    </form>
  );
}

export function FormEmpresa({ clienteId, empresa }: { clienteId: string; empresa?: Empresa }) {
  const [estado, enviar] = useActionState(empresa ? atualizarEmpresa : adicionarEmpresa, null);
  const c = estado?.campos;
  const v = estado?.valores;
  return (
    <form action={enviar} noValidate className="max-w-xl">
      <FieldGroup>
        <AlertaErro mensagem={estado?.mensagem} />
        <input type="hidden" name="clienteId" value={clienteId} />
        {empresa ? (
          <input type="hidden" name="empresaId" value={empresa.id} />
        ) : (
          <CampoTexto name="cnpj" rotulo="CNPJ" autoFocus defaultValue={v?.cnpj} erros={c?.cnpj} />
        )}
        <CampoTexto
          name="razaoSocial"
          rotulo="Razão social"
          autoFocus={!!empresa}
          defaultValue={v?.razaoSocial ?? empresa?.razaoSocial}
          erros={c?.razaoSocial}
        />
        <CampoTexto
          name="nomeFantasia"
          rotulo="Nome fantasia"
          defaultValue={v?.nomeFantasia ?? empresa?.nomeFantasia}
          erros={c?.nomeFantasia}
        />
        {empresa && (
          <CampoSelecao
            name="ativa"
            rotulo="Situação"
            defaultValue={String(empresa.ativa)}
            opcoes={[
              { valor: "true", rotulo: "Ativa" },
              { valor: "false", rotulo: "Inativa" },
            ]}
          />
        )}
        <BotaoEnviar pendente="Salvando…">
          {empresa ? "Salvar empresa" : "Adicionar empresa"}
        </BotaoEnviar>
      </FieldGroup>
    </form>
  );
}

export function BotaoRedefinirSenhaDono({ usuarioId, nome }: { usuarioId: string; nome: string }) {
  const [estado, enviar] = useActionState(redefinirSenhaDono, null);
  if (estado?.senhaTemporaria)
    return <SenhaTemporaria senha={estado.senhaTemporaria} para={nome} />;
  return (
    <form action={enviar} className="grid gap-2">
      <input type="hidden" name="usuarioId" value={usuarioId} />
      <input type="hidden" name="nome" value={nome} />
      <AlertaErro mensagem={estado?.mensagem} />
      <BotaoEnviar variant="outline" size="sm" pendente="Gerando…">
        Redefinir senha
      </BotaoEnviar>
    </form>
  );
}
