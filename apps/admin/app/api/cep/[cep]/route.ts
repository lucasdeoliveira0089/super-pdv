import { equipeMeResponseSchema } from "@super-pdv/shared";
import { consultarCep } from "@super-pdv/web-session";
import { NextResponse } from "next/server";
import { api } from "../../../../lib/sessao";

const STATUS = { invalido: 400, nao_encontrado: 404, falha: 502 } as const;
const MENSAGEM = {
  invalido: "CEP inválido",
  nao_encontrado: "CEP não encontrado",
  falha: "Não foi possível buscar o endereço",
} as const;

/**
 * Busca de endereço pelo CEP para os formulários de empresa (somente equipe logada).
 * A consulta ao serviço externo é feita aqui, no servidor do admin.
 */
export async function GET(_: Request, { params }: { params: Promise<{ cep: string }> }) {
  try {
    await (await api()).requisitar("GET", "/v1/admin/me", { schema: equipeMeResponseSchema });
  } catch {
    return NextResponse.json({ message: "Sessão expirada" }, { status: 401 });
  }
  const r = await consultarCep((await params).cep);
  if (r.ok) return NextResponse.json(r.endereco);
  return NextResponse.json({ message: MENSAGEM[r.motivo] }, { status: STATUS[r.motivo] });
}
