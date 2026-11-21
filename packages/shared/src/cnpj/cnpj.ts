import { z } from "zod";

/**
 * CNPJ numérico e alfanumérico (IN RFB nº 2.229/2024).
 *
 * As 12 primeiras posições aceitam letras maiúsculas e números; os 2 dígitos
 * verificadores são sempre numéricos. Cada caractere vale (código ASCII − 48):
 * '0'..'9' → 0..9 e 'A'..'Z' → 17..42. Os dígitos são calculados por módulo 11.
 */
const FORMATO = /^[0-9A-Z]{12}[0-9]{2}$/;
const PESOS_DV1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_DV2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/** Remove máscara e espaços e coloca em maiúsculas. Não valida. */
export function normalizarCnpj(valor: string): string {
  return valor.replace(/[\s./-]/g, "").toUpperCase();
}

function digitoVerificador(base: string, pesos: number[]): number {
  let soma = 0;
  for (let i = 0; i < base.length; i++) {
    soma += (base.charCodeAt(i) - 48) * pesos[i]!;
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/** Indica se o CNPJ (com ou sem máscara) é válido. */
export function cnpjValido(valor: string): boolean {
  const cnpj = normalizarCnpj(valor);
  if (!FORMATO.test(cnpj)) return false;
  // Sequências de um único caractere (ex.: 00000000000000) passam no cálculo mas não existem.
  if (/^(.)\1{13}$/.test(cnpj)) return false;
  const dv1 = digitoVerificador(cnpj.slice(0, 12), PESOS_DV1);
  const dv2 = digitoVerificador(cnpj.slice(0, 12) + dv1, PESOS_DV2);
  return cnpj.endsWith(`${dv1}${dv2}`);
}

/** Formata um CNPJ normalizado como `XX.XXX.XXX/XXXX-XX`. */
export function formatarCnpj(valor: string): string {
  const c = normalizarCnpj(valor);
  if (c.length !== 14) return valor;
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}

/** Aceita CNPJ com ou sem máscara e produz a forma normalizada (sem pontuação). */
export const cnpjSchema = z
  .string({ error: "Informe o CNPJ" })
  .trim()
  .min(1, "Informe o CNPJ")
  .transform(normalizarCnpj)
  .refine(cnpjValido, "CNPJ inválido");
