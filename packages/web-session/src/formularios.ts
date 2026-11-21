import type { z } from "zod";
import type { ResultadoAcao } from "./acoes";

/** Estado devolvido pelas Server Actions de formulário (`useActionState`). */
export type EstadoFormulario = {
  mensagem?: string;
  sucesso?: string;
  campos?: Record<string, string[]>;
  /** Valores enviados, para repreencher o formulário após erro. */
  valores?: Record<string, string>;
} | null;

/** Mensagens do zod por campo (caminho com pontos, igual ao `fieldErrors` da API). */
export function errosDoZod(error: z.ZodError): Record<string, string[]> {
  const campos: Record<string, string[]> = {};
  for (const issue of error.issues)
    (campos[issue.path.join(".") || "_"] ??= []).push(issue.message);
  return campos;
}

export function estadoDeFalha(
  r: Extract<ResultadoAcao, { ok: false }>,
  valores?: Record<string, string>,
): EstadoFormulario {
  return { mensagem: r.mensagem, campos: r.campos, valores };
}

/** Só permite voltar para caminhos internos (evita redirecionamento aberto). */
export function destinoSeguro(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

/** Converte FormData em objeto de strings (campos repetidos ficam como o último valor). */
export function textos(fd: FormData, ...nomes: string[]): Record<string, string> {
  return Object.fromEntries(nomes.map((n) => [n, String(fd.get(n) ?? "")]));
}
