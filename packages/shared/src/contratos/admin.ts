import { z } from "zod";
import { emailSchema } from "../auth/senha";
import { celularSchema } from "../telefone/celular";
import { empresaCriarSchema, empresaSchema, textoObrigatorio } from "./empresas";

// Contratos das rotas do admin (equipe Super PDV).

export const donoResumoSchema = z.object({
  id: z.uuid(),
  nome: z.string(),
  email: z.string(),
  ativo: z.boolean(),
});

/** Contato do cliente para a equipe Super PDV. Não é usuário: não entra no sistema. */
export const responsavelSchema = z.object({
  nome: z.string(),
  celular: z.string(),
  email: z.string(),
});
export type Responsavel = z.infer<typeof responsavelSchema>;

export const responsavelEntradaSchema = z.object({
  nome: textoObrigatorio("o nome do responsável", 120),
  celular: celularSchema,
  email: emailSchema,
});
export type ResponsavelEntrada = z.input<typeof responsavelEntradaSchema>;

export const clienteSchema = z.object({
  id: z.uuid(),
  nome: z.string(),
  ativo: z.boolean(),
  /** `null` nos clientes cadastrados antes do responsável existir. */
  responsavel: responsavelSchema.nullable(),
  empresas: z.array(empresaSchema),
  donos: z.array(donoResumoSchema),
});
export type Cliente = z.infer<typeof clienteSchema>;

/**
 * Cadastro de cliente: primeira empresa e responsável. O nome do cliente vem do
 * nome fantasia da empresa, e nenhum usuário é criado (o Dono é cadastrado depois).
 * A resposta é o próprio `Cliente`.
 */
export const clienteCriarSchema = z.object({
  empresa: empresaCriarSchema,
  responsavel: responsavelEntradaSchema,
});
export type ClienteCriar = z.infer<typeof clienteCriarSchema>;

/** Cadastro de um usuário Dono no detalhe do cliente. */
export const donoCriarSchema = z.object({
  nome: textoObrigatorio("o nome do Dono", 120),
  email: emailSchema,
});
export type DonoCriar = z.infer<typeof donoCriarSchema>;

export const donoCriadoResponseSchema = z.object({
  dono: donoResumoSchema,
  /** Exibida uma única vez à equipe. */
  senhaTemporaria: z.string(),
});
export type DonoCriadoResponse = z.infer<typeof donoCriadoResponseSchema>;

export const clienteAtualizarSchema = z
  .object({
    nome: textoObrigatorio("o nome do cliente", 120),
    ativo: z.boolean(),
    responsavel: responsavelEntradaSchema,
  })
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
