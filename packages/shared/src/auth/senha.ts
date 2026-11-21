import { z } from "zod";

export const SENHA_MIN = 8;
export const SENHA_MAX = 128;

/** Política de tamanho de senha (spec user-auth). */
export const senhaSchema = z
  .string({ error: "Informe a senha" })
  .min(SENHA_MIN, `A senha deve ter ao menos ${SENHA_MIN} caracteres`)
  .max(SENHA_MAX, `A senha deve ter no máximo ${SENHA_MAX} caracteres`);

/**
 * Valida a política completa, incluindo regras que dependem do e-mail.
 * Retorna a mensagem de erro ou `null` quando a senha é aceita.
 */
export function validarSenha(senha: string, email: string): string | null {
  const r = senhaSchema.safeParse(senha);
  if (!r.success) return r.error.issues[0]!.message;
  if (senha.trim().toLowerCase() === email.trim().toLowerCase()) {
    return "A senha não pode ser igual ao e-mail";
  }
  return null;
}

/** E-mail normalizado (sem espaços, minúsculo). */
export const emailSchema = z
  .string({ error: "Informe o e-mail" })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "E-mail inválido" }));
