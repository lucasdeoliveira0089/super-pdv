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
  cadastrarDono,
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
  // Sucesso: a ação redireciona para o detalhe do cliente.
  const [estado, enviar] = useActionState(criarCliente, null);
  const c = estado?.campos;
  const v = estado?.valores;
  return (
    <form action={enviar} noValidate className="grid gap-6">
      <AlertaErro mensagem={estado?.mensagem} />
      <p className="text-muted-foreground text-sm">
        Campos marcados com <span className="text-destructive">*</span> são obrigatórios.
      </p>
      <SecaoFormulario titulo="Empresa">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <CampoTexto
            name="cnpj"
            rotulo="CNPJ"
            obrigatorio
            autoFocus
            defaultValue={v?.cnpj}
            erros={c?.["empresa.cnpj"]}
          />
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
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <CampoTexto
            name="responsavelNome"
            rotulo="Nome do responsável"
            obrigatorio
            autoComplete="name"
            defaultValue={v?.responsavelNome}
            erros={c?.["responsavel.nome"]}
          />
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
    <form action={enviar} noValidate>
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
        {empresa && <input type="hidden" name="empresaId" value={empresa.id} />}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {!empresa && (
            <CampoTexto
              name="cnpj"
              rotulo="CNPJ"
              autoFocus
              defaultValue={v?.cnpj}
              erros={c?.cnpj}
            />
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
              defaultValue={v?.ativa ?? String(empresa.ativa)}
              opcoes={[
                { valor: "true", rotulo: "Ativa" },
                { valor: "false", rotulo: "Inativa" },
              ]}
            />
          )}
        </div>
        <CamposEndereco
          legenda="Endereço"
          valores={v ?? valoresDoEndereco(empresa?.endereco)}
          erros={errosDoEndereco(c, "endereco.")}
        />
        <BotaoEnviar className="w-fit" pendente="Salvando…">
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
    <form action={enviar} noValidate>
      <FieldGroup>
        <AlertaErro mensagem={estado?.mensagem} />
        <input type="hidden" name="clienteId" value={clienteId} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
        </div>
        <BotaoEnviar className="w-fit" pendente="Salvando…">
          Salvar responsável
        </BotaoEnviar>
      </FieldGroup>
    </form>
  );
}

/** Cadastro de Dono no detalhe do cliente; mostra a senha temporária uma única vez. */
export function FormDono({ clienteId }: { clienteId: string }) {
  const [estado, enviar] = useActionState(cadastrarDono, null);
  if (estado?.senhaTemporaria) {
    return (
      <div className="grid gap-4">
        <SenhaTemporaria senha={estado.senhaTemporaria} para={estado.para ?? "o Dono"} />
        <Button asChild className="w-fit">
          <Link href={`/clientes/${clienteId}`}>Voltar ao cliente</Link>
        </Button>
      </div>
    );
  }
  const c = estado?.campos;
  const v = estado?.valores;
  return (
    <form action={enviar} noValidate className="grid gap-6">
      <AlertaErro mensagem={estado?.mensagem} />
      <input type="hidden" name="clienteId" value={clienteId} />
      <SecaoFormulario titulo="Dono">
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoTexto
            name="nome"
            rotulo="Nome do Dono"
            obrigatorio
            autoFocus
            autoComplete="name"
            defaultValue={v?.nome}
            erros={c?.nome}
          />
          <CampoTexto
            name="email"
            rotulo="E-mail do Dono"
            obrigatorio
            type="email"
            autoComplete="email"
            defaultValue={v?.email}
            erros={c?.email}
          />
        </div>
      </SecaoFormulario>
      <div>
        <BotaoEnviar pendente="Cadastrando…">Cadastrar Dono</BotaoEnviar>
      </div>
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
