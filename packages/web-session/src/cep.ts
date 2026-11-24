import { cepValido, normalizarCep } from "@super-pdv/shared";
import { z } from "zod";

/** Serviço público de CEP usado quando `CEP_API_URL` não está definido. */
export const CEP_API_URL_PADRAO = "https://viacep.com.br/ws";
const TIMEOUT_PADRAO_MS = 3000;

export interface EnderecoDoCep {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export type ResultadoCep =
  | { ok: true; endereco: EnderecoDoCep }
  | { ok: false; motivo: "invalido" | "nao_encontrado" | "falha" };

// Formato do ViaCEP: `{ logradouro, bairro, localidade, uf, ... }` ou `{ erro: true }`
// (versões recentes devolvem `"erro": "true"`, como texto).
const respostaSchema = z.union([
  z.object({ erro: z.union([z.literal(true), z.literal("true")]) }),
  z.object({
    logradouro: z.string().default(""),
    bairro: z.string().default(""),
    localidade: z.string().min(1),
    uf: z.string().length(2),
  }),
]);

export interface OpcoesConsultaCep {
  /** URL base do serviço (padrão: `CEP_API_URL` ou ViaCEP). */
  baseUrl?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

/**
 * Consulta o endereço de um CEP. Nunca lança: falhas do serviço (fora do ar,
 * timeout, resposta inesperada) viram `motivo: "falha"`, para a tela seguir
 * com o preenchimento manual.
 */
export async function consultarCep(
  cep: string,
  {
    baseUrl = process.env.CEP_API_URL || CEP_API_URL_PADRAO,
    fetchFn = fetch,
    timeoutMs = TIMEOUT_PADRAO_MS,
  }: OpcoesConsultaCep = {},
): Promise<ResultadoCep> {
  if (!cepValido(cep)) return { ok: false, motivo: "invalido" };
  const digitos = normalizarCep(cep);
  try {
    const resposta = await fetchFn(`${baseUrl.replace(/\/$/, "")}/${digitos}/json/`, {
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!resposta.ok) return { ok: false, motivo: "falha" };
    const dados = respostaSchema.safeParse(await resposta.json());
    if (!dados.success) return { ok: false, motivo: "falha" };
    if ("erro" in dados.data) return { ok: false, motivo: "nao_encontrado" };
    const { logradouro, bairro, localidade, uf } = dados.data;
    return {
      ok: true,
      endereco: { logradouro, bairro, cidade: localidade, uf: uf.toUpperCase() },
    };
  } catch {
    return { ok: false, motivo: "falha" };
  }
}
