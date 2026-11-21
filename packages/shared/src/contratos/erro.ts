import { z } from "zod";

/** Códigos de erro estáveis que as interfaces podem tratar. */
export const CODIGOS_ERRO = [
  "VALIDACAO",
  "NAO_AUTENTICADO",
  "CREDENCIAIS_INVALIDAS",
  "BLOQUEADO",
  "SEM_PERMISSAO",
  "PASSWORD_CHANGE_REQUIRED",
  "NAO_ENCONTRADO",
  "CONFLITO",
  "REGRA_NEGOCIO",
  "LINK_INVALIDO",
  "MUITAS_REQUISICOES",
  "ERRO_INTERNO",
] as const;
export type CodigoErro = (typeof CODIGOS_ERRO)[number];

/** Formato de todos os erros da API. */
export const apiErroSchema = z.object({
  statusCode: z.number().int(),
  code: z.enum(CODIGOS_ERRO),
  message: z.string(),
  /** Mensagens por campo (caminho com pontos, ex.: `empresa.cnpj`). */
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});
export type ApiErro = z.infer<typeof apiErroSchema>;
