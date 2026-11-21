"use server";

import {
  membroEquipeCriadoResponseSchema,
  membroEquipeCriarSchema,
  senhaTemporariaResponseSchema,
} from "@super-pdv/shared";
import { errosDoZod, falha, textos } from "@super-pdv/web-session";
import { revalidatePath } from "next/cache";
import { api } from "../../../lib/sessao";
import type { EstadoComSenha } from "../clientes/acoes";

export async function criarMembro(_: EstadoComSenha, fd: FormData): Promise<EstadoComSenha> {
  const v = textos(fd, "nome", "email");
  const dados = membroEquipeCriarSchema.safeParse(v);
  if (!dados.success) return { campos: errosDoZod(dados.error), valores: v };
  try {
    const r = await (
      await api()
    ).requisitar("POST", "/v1/admin/equipe", {
      corpo: dados.data,
      schema: membroEquipeCriadoResponseSchema,
    });
    revalidatePath("/equipe");
    return { senhaTemporaria: r.senhaTemporaria, para: r.membro.nome };
  } catch (e) {
    const r = falha(e);
    return r.ok ? null : { mensagem: r.mensagem, campos: r.campos, valores: v };
  }
}

export async function alterarSituacaoMembro(
  _: EstadoComSenha,
  fd: FormData,
): Promise<EstadoComSenha> {
  const { id, ativo } = textos(fd, "id", "ativo");
  try {
    await (
      await api()
    ).requisitar("PATCH", `/v1/admin/equipe/${id}`, { corpo: { ativo: ativo === "true" } });
  } catch (e) {
    const r = falha(e);
    return r.ok ? null : { mensagem: r.mensagem };
  }
  revalidatePath("/equipe");
  return null;
}

export async function redefinirSenhaMembro(
  _: EstadoComSenha,
  fd: FormData,
): Promise<EstadoComSenha> {
  const { id, nome } = textos(fd, "id", "nome");
  try {
    const r = await (
      await api()
    ).requisitar("POST", `/v1/admin/equipe/${id}/redefinir-senha`, {
      schema: senhaTemporariaResponseSchema,
    });
    return { senhaTemporaria: r.senhaTemporaria, para: nome };
  } catch (e) {
    const r = falha(e);
    return r.ok ? null : { mensagem: r.mensagem };
  }
}
