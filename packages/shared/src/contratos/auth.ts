import { z } from "zod";
import { PERMISSOES, papelSchema } from "../auth/permissoes";
import { emailSchema, senhaSchema } from "../auth/senha";

// Contratos de autenticação usados pelos dois domínios (clientes e equipe).

export const loginRequestSchema = z.object({
  email: emailSchema,
  senha: z.string({ error: "Informe a senha" }).min(1, "Informe a senha").max(1024),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const tokensResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  /** Segundos até o token de acesso expirar. */
  expiresIn: z.number().int().positive(),
});
export type TokensResponse = z.infer<typeof tokensResponseSchema>;

export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1).max(512),
});
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;

export const trocarSenhaRequestSchema = z.object({
  senhaAtual: z.string().min(1, "Informe a senha atual").max(1024),
  novaSenha: senhaSchema,
});
export type TrocarSenhaRequest = z.infer<typeof trocarSenhaRequestSchema>;

export const recuperacaoRequestSchema = z.object({ email: emailSchema });
export type RecuperacaoRequest = z.infer<typeof recuperacaoRequestSchema>;

export const recuperacaoConfirmarRequestSchema = z.object({
  token: z.string().min(1).max(512),
  novaSenha: senhaSchema,
});
export type RecuperacaoConfirmarRequest = z.infer<typeof recuperacaoConfirmarRequestSchema>;

export const empresaResumoSchema = z.object({
  id: z.uuid(),
  cnpj: z.string(),
  razaoSocial: z.string(),
  nomeFantasia: z.string(),
});
export type EmpresaResumo = z.infer<typeof empresaResumoSchema>;

/** `GET /v1/me` — usuário de cliente. */
export const meResponseSchema = z.object({
  id: z.uuid(),
  nome: z.string(),
  email: z.string(),
  papel: papelSchema,
  senhaTemporaria: z.boolean(),
  permissoes: z.array(z.enum(PERMISSOES)),
  cliente: z.object({ id: z.uuid(), nome: z.string() }),
  /** Empresas ativas em que o usuário pode atuar. */
  empresas: z.array(empresaResumoSchema),
});
export type MeResponse = z.infer<typeof meResponseSchema>;

/** `GET /v1/admin/me` — membro da equipe Super PDV. */
export const equipeMeResponseSchema = z.object({
  id: z.uuid(),
  nome: z.string(),
  email: z.string(),
  senhaTemporaria: z.boolean(),
});
export type EquipeMeResponse = z.infer<typeof equipeMeResponseSchema>;

/** Resposta de operações que geram senha temporária (exibida uma única vez). */
export const senhaTemporariaResponseSchema = z.object({ senhaTemporaria: z.string() });
export type SenhaTemporariaResponse = z.infer<typeof senhaTemporariaResponseSchema>;
