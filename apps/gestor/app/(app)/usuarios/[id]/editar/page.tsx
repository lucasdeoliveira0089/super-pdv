import {
  empresaSchema,
  papeisAtribuiveis,
  podeGerenciarUsuario,
  usuarioSchema,
} from "@super-pdv/shared";
import { carregar } from "@super-pdv/web-session";
import { CabecalhoPagina } from "@super-pdv/web-session/telas";
import { redirect } from "next/navigation";
import { api, idsDeEmpresas, usuarioLogado } from "../../../../../lib/sessao";
import { FormEditarUsuario } from "../../formularios";

export const metadata = { title: "Editar usuário — Gestor Super PDV" };

export default async function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const eu = await usuarioLogado();
  const cliente = await api();
  const usuario = await carregar(() =>
    cliente.requisitar("GET", `/v1/usuarios/${id}`, { schema: usuarioSchema }),
  );
  // Endereço reservado: só quem pode gerenciar este usuário (spec access-control).
  if (!podeGerenciarUsuario({ papel: eu.papel, empresaIds: idsDeEmpresas(eu) }, usuario)) {
    redirect("/acesso-negado");
  }
  const empresas = await carregar(() =>
    cliente.requisitar("GET", "/v1/empresas", { schema: empresaSchema.array() }),
  );
  return (
    <>
      <CabecalhoPagina
        titulo={`Editar ${usuario.nome}`}
        descricao={`${usuario.email} (não pode ser alterado)`}
      />
      <FormEditarUsuario
        usuario={usuario}
        papeis={papeisAtribuiveis(eu.papel)}
        empresas={empresas.filter((e) => e.ativa || usuario.empresaIds.includes(e.id))}
      />
    </>
  );
}
