"use server";

import {
  clienteCriadoResponseSchema,
  clienteCriarSchema,
  empresaAtualizarSchema,
  empresaCriarSchema,
  senhaTemporariaResponseSchema,
} from "@super-pdv/shared";
import { errosDoZod, type EstadoFormulario, falha, textos } from "@super-pdv/web-session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "../../../lib/sessao";

export type EstadoComSenha =
  (EstadoFormulario & { senhaTemporaria?: string; para?: string; id?: string }) | null;

const erro = (e: unknown, valores?: Record<string, string>) => {
  const r = falha(e);
  return r.ok ? null : { mensagem: r.mensagem, campos: r.campos, valores };
};

export async function criarCliente(_: EstadoComSenha, fd: FormData): Promise<EstadoComSenha> {
  const v = textos(fd, "nome", "cnpj", "razaoSocial", "nomeFantasia", "donoNome", "donoEmail");
  const dados = clienteCriarSchema.safeParse({
    nome: v.nome,
    empresa: { cnpj: v.cnpj, razaoSocial: v.razaoSocial, nomeFantasia: v.nomeFantasia },
    dono: { nome: v.donoNome, email: v.donoEmail },
  });
  if (!dados.success) return { campos: errosDoZod(dados.error), valores: v };
  try {
    const r = await (
      await api()
    ).requisitar("POST", "/v1/admin/clientes", {
      corpo: dados.data,
      schema: clienteCriadoResponseSchema,
    });
    revalidatePath("/clientes");
    return { senhaTemporaria: r.senhaTemporaria, para: dados.data.dono.nome, id: r.cliente.id };
  } catch (e) {
    return erro(e, v);
  }
}

export async function alterarSituacaoCliente(fd: FormData): Promise<void> {
  const { id, ativo } = textos(fd, "id", "ativo");
  await (
    await api()
  ).requisitar("PATCH", `/v1/admin/clientes/${id}`, { corpo: { ativo: ativo === "true" } });
  revalidatePath(`/clientes/${id}`);
}

export async function adicionarEmpresa(
  _: EstadoFormulario,
  fd: FormData,
): Promise<EstadoFormulario> {
  const v = textos(fd, "clienteId", "cnpj", "razaoSocial", "nomeFantasia");
  const dados = empresaCriarSchema.safeParse(v);
  if (!dados.success) return { campos: errosDoZod(dados.error), valores: v };
  try {
    await (
      await api()
    ).requisitar("POST", `/v1/admin/clientes/${v.clienteId}/empresas`, { corpo: dados.data });
  } catch (e) {
    return erro(e, v);
  }
  revalidatePath(`/clientes/${v.clienteId}`);
  redirect(`/clientes/${v.clienteId}`);
}

export async function atualizarEmpresa(
  _: EstadoFormulario,
  fd: FormData,
): Promise<EstadoFormulario> {
  const v = textos(fd, "clienteId", "empresaId", "razaoSocial", "nomeFantasia", "ativa");
  const dados = empresaAtualizarSchema.safeParse({
    razaoSocial: v.razaoSocial,
    nomeFantasia: v.nomeFantasia,
    ativa: v.ativa === "true",
  });
  if (!dados.success) return { campos: errosDoZod(dados.error), valores: v };
  try {
    await (
      await api()
    ).requisitar("PATCH", `/v1/admin/empresas/${v.empresaId}`, { corpo: dados.data });
  } catch (e) {
    return erro(e, v);
  }
  revalidatePath(`/clientes/${v.clienteId}`);
  redirect(`/clientes/${v.clienteId}`);
}

export async function redefinirSenhaDono(_: EstadoComSenha, fd: FormData): Promise<EstadoComSenha> {
  const { usuarioId, nome } = textos(fd, "usuarioId", "nome");
  try {
    const r = await (
      await api()
    ).requisitar("POST", `/v1/admin/usuarios/${usuarioId}/redefinir-senha`, {
      schema: senhaTemporariaResponseSchema,
    });
    return { senhaTemporaria: r.senhaTemporaria, para: nome };
  } catch (e) {
    return erro(e);
  }
}
