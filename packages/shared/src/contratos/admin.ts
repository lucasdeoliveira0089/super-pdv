import { z } from "zod";
import { emailSchema } from "../auth/senha";
import { empresaCriarSchema, empresaSchema, textoObrigatorio } from "./empresas";

// Contratos das rotas do admin (equipe Super PDV).

export const donoResumoSchema = z.object({
  id: z.uuid(),
  nome: z.string(),
  email: z.string(),
  ativo: z.boolean(),
});

export const clienteSchema = z.object({
  id: z.uuid(),
  nome: z.string(),
  ativo: z.boolean(),
  empresas: z.array(empresaSchema),
  donos: z.array(donoResumoSchema),
});
export type Cliente = z.infer<typeof clienteSchema>;

export const clienteCriarSchema = z.object({
  nome: textoObrigatorio("o nome do cliente", 120),
  empresa: empresaCriarSchema,
  dono: z.object({
    nome: textoObrigatorio("o nome do Dono", 120),
    email: emailSchema,
  }),
});
export type ClienteCriar = z.infer<typeof clienteCriarSchema>;

export const clienteCriadoResponseSchema = z.object({
  cliente: clienteSchema,
  senhaTemporaria: z.string(),
});
export type ClienteCriadoResponse = z.infer<typeof clienteCriadoResponseSchema>;

export const clienteAtualizarSchema = z
  .object({ nome: textoObrigatorio("o nome do cliente", 120), ativo: z.boolean() })
  .partial()
  .strict();
export type ClienteAtualizar = z.infer<typeof clienteAtualizarSchema>;

export const clienteFiltrosSchema = z.object({
  busca: z.string().trim().max(120).optional(),
});
export type ClienteFiltros = z.infer<typeof clienteFiltrosSchema>;

export const membroEquipeSchema = z.object({
  id: z.uuid(),
  nome: z.string(),
  email: z.string(),
  ativo: z.boolean(),
  senhaTemporaria: z.boolean(),
});
export type MembroEquipe = z.infer<typeof membroEquipeSchema>;

export const membroEquipeCriarSchema = z.object({
  nome: textoObrigatorio("o nome", 120),
  email: emailSchema,
});
export type MembroEquipeCriar = z.infer<typeof membroEquipeCriarSchema>;

export const membroEquipeAtualizarSchema = z
  .object({ nome: textoObrigatorio("o nome", 120), ativo: z.boolean() })
  .partial()
  .strict();
export type MembroEquipeAtualizar = z.infer<typeof membroEquipeAtualizarSchema>;

export const membroEquipeCriadoResponseSchema = z.object({
  membro: membroEquipeSchema,
  senhaTemporaria: z.string(),
});
export type MembroEquipeCriadoResponse = z.infer<typeof membroEquipeCriadoResponseSchema>;
