"use client";

import Link from "next/link";
import { useActionState } from "react";
import { type Empresa, formatarCelular, type Responsavel } from "@super-pdv/shared";
import { Alert, AlertDescription, AlertTitle } from "@super-pdv/ui/components/alert";
import { Button } from "@super-pdv/ui/components/button";
import { AlertaErro, CampoSelecao, CampoTexto } from "@super-pdv/ui/components/campos";
import { FieldGroup } from "@super-pdv/ui/components/field";
import { BotaoEnviar, SenhaTemporaria } from "@super-pdv/ui/components/formulario-cliente";
import { SecaoFormulario } from "@super-pdv/ui/components/secao-formulario";
import {
  adicionarEmpresa,
  atualizarEmpresa,
  atualizarResponsavel,
  criarCliente,
  redefinirSenhaDono,
} from "./acoes";
import { CamposEndereco, errosDoEndereco, valoresDoEndereco } from "./campos-endereco";

/** Formata o celular ao sair do campo, sem impedir a digitação livre. */
const mascararCelular = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.value = formatarCelular(e.currentTarget.value);
};

function CampoCelular(props: {
  name: string;
  defaultValue?: string;
  erros?: string[];
  rotulo?: string;
  obrigatorio?: boolean;
}) {
  return (
    <CampoTexto
      rotulo="Celular"
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder="(11) 98765-4321"
      onBlur={mascararCelular}
      {...props}
    />
  );
}

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
    <form action={enviar} noValidate className="grid max-w-3xl gap-6">
      <AlertaErro mensagem={estado?.mensagem} />
      <p className="text-muted-foreground text-sm">
        Campos marcados com <span className="text-destructive">*</span> são obrigatórios.
      </p>
      <SecaoFormulario titulo="Empresa">
        <CampoTexto
          name="cnpj"
          rotulo="CNPJ"
          obrigatorio
          className="sm:w-64"
          autoFocus
          defaultValue={v?.cnpj}
          erros={c?.["empresa.cnpj"]}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoTexto
            name="razaoSocial"
            rotulo="Razão social"
            obrigatorio
            defaultValue={v?.razaoSocial}
            erros={c?.["empresa.razaoSocial"]}
          />
          <CampoTexto
            name="nomeFantasia"
            rotulo="Nome fantasia"
            obrigatorio
            defaultValue={v?.nomeFantasia}
            erros={c?.["empresa.nomeFantasia"]}
          />
        </div>
      </SecaoFormulario>
      <CamposEndereco cartao valores={v} erros={errosDoEndereco(c, "empresa.endereco.")} />
      <SecaoFormulario titulo="Responsável">
        <CampoTexto
          name="responsavelNome"
          rotulo="Nome do responsável"
          obrigatorio
          autoComplete="name"
          defaultValue={v?.responsavelNome}
          erros={c?.["responsavel.nome"]}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoCelular
            name="responsavelCelular"
            obrigatorio
            defaultValue={v?.responsavelCelular}
            erros={c?.["responsavel.celular"]}
          />
          <CampoTexto
            name="responsavelEmail"
            rotulo="E-mail do responsável"
            obrigatorio
            type="email"
            autoComplete="email"
            defaultValue={v?.responsavelEmail}
            erros={c?.["responsavel.email"]}
          />
        </div>
      </SecaoFormulario>
      <SecaoFormulario
        titulo="Dono"
        descricao="Quem acessa o gestor e o PDV. Recebe uma senha temporária, exibida uma única vez."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoTexto
            name="donoNome"
            rotulo="Nome do Dono"
            obrigatorio
            defaultValue={v?.donoNome}
            erros={c?.["dono.nome"]}
          />
          <CampoTexto
            name="donoEmail"
            rotulo="E-mail do Dono"
            obrigatorio
            type="email"
            descricao="Login no gestor e no PDV."
            defaultValue={v?.donoEmail}
            erros={c?.["dono.email"]}
          />
        </div>
      </SecaoFormulario>
      <div>
        <BotaoEnviar pendente="Cadastrando…">Cadastrar cliente</BotaoEnviar>
      </div>
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
        {empresa && !empresa.endereco && (
          <Alert>
            <AlertTitle>Endereço não cadastrado</AlertTitle>
            <AlertDescription>
              Esta empresa foi cadastrada antes do endereço existir. Preencha o endereço para
              salvar.
            </AlertDescription>
          </Alert>
        )}
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
        <CamposEndereco
          legenda="Endereço"
          valores={v ?? valoresDoEndereco(empresa?.endereco)}
          erros={errosDoEndereco(c, "endereco.")}
        />
        {empresa && (
          <CampoSelecao
            name="ativa"
            rotulo="Situação"
            defaultValue={v?.ativa ?? String(empresa.ativa)}
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

export function FormResponsavel({
  clienteId,
  responsavel,
}: {
  clienteId: string;
  responsavel: Responsavel | null;
}) {
  const [estado, enviar] = useActionState(atualizarResponsavel, null);
  const c = estado?.campos;
  const v = estado?.valores;
  return (
    <form action={enviar} noValidate className="max-w-xl">
      <FieldGroup>
        <AlertaErro mensagem={estado?.mensagem} />
        <input type="hidden" name="clienteId" value={clienteId} />
        <CampoTexto
          name="nome"
          rotulo="Nome do responsável"
          autoFocus
          autoComplete="name"
          defaultValue={v?.nome ?? responsavel?.nome}
          erros={c?.["responsavel.nome"]}
        />
        <CampoCelular
          name="celular"
          defaultValue={
            v?.celular ?? (responsavel ? formatarCelular(responsavel.celular) : undefined)
          }
          erros={c?.["responsavel.celular"]}
        />
        <CampoTexto
          name="email"
          rotulo="E-mail do responsável"
          type="email"
          autoComplete="email"
          defaultValue={v?.email ?? responsavel?.email}
          erros={c?.["responsavel.email"]}
        />
        <BotaoEnviar pendente="Salvando…">Salvar responsável</BotaoEnviar>
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
