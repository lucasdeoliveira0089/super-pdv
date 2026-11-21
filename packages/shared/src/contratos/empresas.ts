import { z } from "zod";
import { cnpjSchema } from "../cnpj/cnpj";

const texto = (campo: string, max = 150) =>
  z
    .string({ error: `Informe ${campo}` })
    .trim()
    .min(1, `Informe ${campo}`)
    .max(max, `${campo[0]!.toUpperCase()}${campo.slice(1)} muito longo`);

export const empresaSchema = z.object({
  id: z.uuid(),
  clienteId: z.uuid(),
  cnpj: z.string(),
  razaoSocial: z.string(),
  nomeFantasia: z.string(),
  ativa: z.boolean(),
});
export type Empresa = z.infer<typeof empresaSchema>;

export const empresaCriarSchema = z.object({
  cnpj: cnpjSchema,
  razaoSocial: texto("a razão social"),
  nomeFantasia: texto("o nome fantasia"),
});
export type EmpresaCriar = z.infer<typeof empresaCriarSchema>;

/** O CNPJ não faz parte: é imutável. */
export const empresaAtualizarSchema = z
  .object({
    razaoSocial: texto("a razão social"),
    nomeFantasia: texto("o nome fantasia"),
    ativa: z.boolean(),
  })
  .partial()
  .strict();
export type EmpresaAtualizar = z.infer<typeof empresaAtualizarSchema>;

export { texto as textoObrigatorio };
