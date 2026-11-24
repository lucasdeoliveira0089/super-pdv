import { z } from "zod";

/** As 27 unidades federativas (26 estados e o Distrito Federal). */
export const UFS = [
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
] as const;
export type Uf = (typeof UFS)[number];

/** Remove tudo que não é dígito. Não valida. */
export function normalizarCep(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** Indica se o CEP (com ou sem máscara) tem 8 dígitos. */
export function cepValido(valor: string): boolean {
  return /^\d{5}-?\d{3}$/.test(valor.trim()) && normalizarCep(valor).length === 8;
}

/** Formata um CEP normalizado como `00000-000`. */
export function formatarCep(valor: string): string {
  const c = normalizarCep(valor);
  if (c.length !== 8) return valor;
  return `${c.slice(0, 5)}-${c.slice(5)}`;
}

/** Aceita CEP com ou sem máscara e produz os 8 dígitos. */
export const cepSchema = z
  .string({ error: "Informe o CEP" })
  .trim()
  .min(1, "Informe o CEP")
  .refine(cepValido, "CEP inválido")
  .transform(normalizarCep);

/** Aceita a UF em maiúsculas ou minúsculas e produz a sigla em maiúsculas. */
export const ufSchema = z
  .string({ error: "Informe a UF" })
  .trim()
  .min(1, "Informe a UF")
  .transform((v) => v.toUpperCase())
  .refine((v): v is Uf => (UFS as readonly string[]).includes(v), "UF inválida");
