import { z } from "zod";

/** DDDs em uso no Brasil (plano de numeração da Anatel). */
const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43,
  44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77,
  79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/** Remove máscara (espaços, parênteses, hífen, ponto e o +55 opcional). Não valida. */
export function normalizarCelular(valor: string): string {
  const digitos = valor.replace(/\D/g, "");
  return valor.trim().startsWith("+55") ? digitos.slice(2) : digitos;
}

/** Celular brasileiro: DDD válido + 9 dígitos começando por 9 (11 dígitos no total). */
export function celularValido(valor: string): boolean {
  const c = normalizarCelular(valor);
  return /^\d{2}9\d{8}$/.test(c) && DDDS.has(Number(c.slice(0, 2)));
}

/** Formata um celular normalizado como `(11) 98765-4321`. */
export function formatarCelular(valor: string): string {
  const c = normalizarCelular(valor);
  if (c.length !== 11) return valor;
  return `(${c.slice(0, 2)}) ${c.slice(2, 7)}-${c.slice(7)}`;
}

/**
 * Máscara progressiva para digitação: `(XX) XXXXX-XXXX`. Só números (até 11
 * dígitos); um `+55` no início é ignorado. Não valida.
 */
export function mascararCelular(valor: string): string {
  const d = normalizarCelular(valor).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Aceita celular com ou sem máscara e produz os 11 dígitos. */
export const celularSchema = z
  .string({ error: "Informe o celular" })
  .trim()
  .min(1, "Informe o celular")
  .refine(celularValido, "Celular inválido: informe DDD e número começando por 9")
  .transform(normalizarCelular);
