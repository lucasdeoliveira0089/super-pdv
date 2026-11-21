"use server";

import {
  senhaTemporariaResponseSchema,
  usuarioAtualizarSchema,
  usuarioCriadoResponseSchema,
  usuarioCriarSchema,
} from "@super-pdv/shared";
import { errosDoZod, type EstadoFormulario, falha, textos } from "@super-pdv/web-session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "../../../lib/sessao";

export type EstadoUsuario =
  (EstadoFormulario & { senhaTemporaria?: string; para?: string; id?: string }) | null;

const erro = (e: unknown, valores?: Record<string, string>): EstadoUsuario => {
  const r = falha(e);
  return r.ok ? null : { mensagem: r.mensagem, campos: r.campos, valores };
};

const empresaIds = (fd: FormData) => fd.getAll("empresaIds").map(String);

export async function criarUsuario(_: EstadoUsuario, fd: FormData): Promise<EstadoUsuario> {
  const v = textos(fd, "nome", "email", "papel");
  const dados = usuarioCriarSchema.safeParse({ ...v, empresaIds: empresaIds(fd) });
  if (!dados.success) return { campos: errosDoZod(dados.error), valores: v };
  try {
    const r = await (
      await api()
    ).requisitar("POST", "/v1/usuarios", {
      corpo: dados.data,
      schema: usuarioCriadoResponseSchema,
    });
    revalidatePath("/usuarios");
    return { senhaTemporaria: r.senhaTemporaria, para: r.usuario.nome, id: r.usuario.id };
  } catch (e) {
    return erro(e, v);
  }
}

export async function atualizarUsuario(_: EstadoUsuario, fd: FormData): Promise<EstadoUsuario> {
  const v = textos(fd, "id", "nome", "papel");
  const dados = usuarioAtualizarSchema.safeParse({
    nome: v.nome,
    papel: v.papel,
    empresaIds: empresaIds(fd),
  });
  if (!dados.success) return { campos: errosDoZod(dados.error), valores: v };
  try {
    await (await api()).requisitar("PATCH", `/v1/usuarios/${v.id}`, { corpo: dados.data });
  } catch (e) {
    return erro(e, v);
  }
  revalidatePath("/usuarios");
  redirect(`/usuarios/${v.id}`);
}

export async function alterarSituacao(_: EstadoUsuario, fd: FormData): Promise<EstadoUsuario> {
  const { id, ativo } = textos(fd, "id", "ativo");
  try {
    await (
      await api()
    ).requisitar("PATCH", `/v1/usuarios/${id}`, { corpo: { ativo: ativo === "true" } });
  } catch (e) {
    return erro(e);
  }
  revalidatePath(`/usuarios/${id}`);
  return null;
}

export async function redefinirSenha(_: EstadoUsuario, fd: FormData): Promise<EstadoUsuario> {
  const { id, nome } = textos(fd, "id", "nome");
  try {
    const r = await (
      await api()
    ).requisitar("POST", `/v1/usuarios/${id}/redefinir-senha`, {
      schema: senhaTemporariaResponseSchema,
    });
    return { senhaTemporaria: r.senhaTemporaria, para: nome };
  } catch (e) {
    return erro(e);
  }
}
