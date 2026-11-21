"use client";

import { useActionState } from "react";
import Link from "next/link";
import { type Papel, ROTULO_PAPEL, type Usuario } from "@super-pdv/shared";
import { Button } from "@super-pdv/ui/components/button";
import { AlertaErro, CampoOpcoes, CampoSelecao, CampoTexto } from "@super-pdv/ui/components/campos";
import { FieldGroup } from "@super-pdv/ui/components/field";
import { BotaoEnviar, SenhaTemporaria } from "@super-pdv/ui/components/formulario-cliente";
import { alterarSituacao, atualizarUsuario, criarUsuario, redefinirSenha } from "./acoes";

interface Opcoes {
  papeis: Papel[];
  empresas: { id: string; nomeFantasia: string }[];
}

const opcoesPapel = (papeis: Papel[]) => papeis.map((p) => ({ valor: p, rotulo: ROTULO_PAPEL[p] }));
const opcoesEmpresa = (empresas: Opcoes["empresas"]) =>
  empresas.map((e) => ({ valor: e.id, rotulo: e.nomeFantasia }));

const DESCRICAO_EMPRESAS =
  "Obrigatório para Gerente e Operador de caixa. Dono e Administrador atuam em todas as empresas.";

export function FormNovoUsuario({ papeis, empresas }: Opcoes) {
  const [estado, enviar] = useActionState(criarUsuario, null);
  if (estado?.senhaTemporaria) {
    return (
      <div className="grid max-w-xl gap-3">
        <SenhaTemporaria senha={estado.senhaTemporaria} para={estado.para ?? "o usuário"} />
        <div className="flex gap-2">
          <Button asChild>
            <Link href={`/usuarios/${estado.id}`}>Ver usuário</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/usuarios">Voltar para usuários</Link>
          </Button>
        </div>
      </div>
    );
  }
  const c = estado?.campos;
  const v = estado?.valores;
  return (
    <form action={enviar} noValidate className="max-w-xl">
      <FieldGroup>
        <AlertaErro mensagem={estado?.mensagem} />
        <CampoTexto name="nome" rotulo="Nome" autoFocus defaultValue={v?.nome} erros={c?.nome} />
        <CampoTexto
          name="email"
          rotulo="E-mail"
          type="email"
          defaultValue={v?.email}
          erros={c?.email}
        />
        <CampoSelecao
          name="papel"
          rotulo="Papel"
          opcoes={opcoesPapel(papeis)}
          defaultValue={v?.papel ?? papeis.at(-1)}
          erros={c?.papel}
        />
        <CampoOpcoes
          name="empresaIds"
          rotulo="Empresas"
          descricao={DESCRICAO_EMPRESAS}
          opcoes={opcoesEmpresa(empresas)}
          erros={c?.empresaIds}
        />
        <BotaoEnviar className="w-fit" pendente="Cadastrando…">
          Cadastrar usuário
        </BotaoEnviar>
      </FieldGroup>
    </form>
  );
}

export function FormEditarUsuario({ usuario, papeis, empresas }: Opcoes & { usuario: Usuario }) {
  const [estado, enviar] = useActionState(atualizarUsuario, null);
  const c = estado?.campos;
  return (
    <form action={enviar} noValidate className="max-w-xl">
      <FieldGroup>
        <AlertaErro mensagem={estado?.mensagem} />
        <input type="hidden" name="id" value={usuario.id} />
        <CampoTexto
          name="nome"
          rotulo="Nome"
          autoFocus
          defaultValue={usuario.nome}
          erros={c?.nome}
        />
        <CampoSelecao
          name="papel"
          rotulo="Papel"
          opcoes={opcoesPapel(papeis.includes(usuario.papel) ? papeis : [usuario.papel, ...papeis])}
          defaultValue={usuario.papel}
          erros={c?.papel}
        />
        <CampoOpcoes
          name="empresaIds"
          rotulo="Empresas"
          descricao={DESCRICAO_EMPRESAS}
          opcoes={opcoesEmpresa(empresas)}
          selecionados={usuario.empresaIds}
          erros={c?.empresaIds}
        />
        <BotaoEnviar className="w-fit" pendente="Salvando…">
          Salvar alterações
        </BotaoEnviar>
      </FieldGroup>
    </form>
  );
}

export function AcoesUsuario({ usuario }: { usuario: Usuario }) {
  const [situacao, alterar] = useActionState(alterarSituacao, null);
  const [senha, redefinir] = useActionState(redefinirSenha, null);
  return (
    <div className="grid max-w-xl gap-3">
      <AlertaErro mensagem={situacao?.mensagem ?? senha?.mensagem} />
      {senha?.senhaTemporaria && (
        <SenhaTemporaria senha={senha.senhaTemporaria} para={usuario.nome} />
      )}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href={`/usuarios/${usuario.id}/editar`}>Editar</Link>
        </Button>
        <form action={alterar}>
          <input type="hidden" name="id" value={usuario.id} />
          <input type="hidden" name="ativo" value={String(!usuario.ativo)} />
          <BotaoEnviar variant={usuario.ativo ? "destructive" : "default"} pendente="Salvando…">
            {usuario.ativo ? "Desativar" : "Reativar"}
          </BotaoEnviar>
        </form>
        {usuario.ativo && !senha?.senhaTemporaria && (
          <form action={redefinir}>
            <input type="hidden" name="id" value={usuario.id} />
            <input type="hidden" name="nome" value={usuario.nome} />
            <BotaoEnviar variant="outline" pendente="Gerando…">
              Redefinir senha
            </BotaoEnviar>
          </form>
        )}
      </div>
    </div>
  );
}
