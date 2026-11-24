import { z } from "zod";
import { cnpjSchema } from "../cnpj/cnpj";
import { cepSchema, ufSchema } from "../endereco/endereco";

const texto = (campo: string, max = 150) =>
  z
    .string({ error: `Informe ${campo}` })
    .trim()
    .min(1, `Informe ${campo}`)
    .max(max, `${campo[0]!.toUpperCase()}${campo.slice(1)} muito longo`);

/** Texto opcional: vazio vira `null`. */
const textoOpcional = (campo: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${campo[0]!.toUpperCase()}${campo.slice(1)} muito longo`)
    .nullish()
    .transform((v) => v || null);

/** Endereço como é lido (CEP só com dígitos e UF em maiúsculas). */
export const enderecoSchema = z.object({
  cep: z.string(),
  logradouro: z.string(),
  numero: z.string(),
  complemento: z.string().nullable(),
  bairro: z.string(),
  cidade: z.string(),
  uf: z.string(),
});
export type Endereco = z.infer<typeof enderecoSchema>;

/** Endereço informado no cadastro ou na edição: completo, só o complemento é opcional. */
export const enderecoEntradaSchema = z.object({
  cep: cepSchema,
  logradouro: texto("o logradouro"),
  numero: texto("o número", 20),
  complemento: textoOpcional("o complemento", 60),
  bairro: texto("o bairro", 80),
  cidade: texto("a cidade", 80),
  uf: ufSchema,
});
export type EnderecoEntrada = z.input<typeof enderecoEntradaSchema>;

export const empresaSchema = z.object({
  id: z.uuid(),
  clienteId: z.uuid(),
  cnpj: z.string(),
  razaoSocial: z.string(),
  nomeFantasia: z.string(),
  ativa: z.boolean(),
  /** `null` nas empresas cadastradas antes do endereço existir. */
  endereco: enderecoSchema.nullable(),
});
export type Empresa = z.infer<typeof empresaSchema>;

export const empresaCriarSchema = z.object({
  cnpj: cnpjSchema,
  razaoSocial: texto("a razão social"),
  nomeFantasia: texto("o nome fantasia"),
  endereco: enderecoEntradaSchema,
});
export type EmpresaCriar = z.infer<typeof empresaCriarSchema>;

/** O CNPJ não faz parte: é imutável. */
export const empresaAtualizarSchema = z
  .object({
    razaoSocial: texto("a razão social"),
    nomeFantasia: texto("o nome fantasia"),
    endereco: enderecoEntradaSchema,
    ativa: z.boolean(),
  })
  .partial()
  .strict();
export type EmpresaAtualizar = z.infer<typeof empresaAtualizarSchema>;

export { texto as textoObrigatorio };
