import { z } from "zod";
import { papelExigeEmpresas, papelSchema } from "../auth/permissoes";
import { emailSchema } from "../auth/senha";
import { textoObrigatorio } from "./empresas";

export const usuarioSchema = z.object({
  id: z.uuid(),
  nome: z.string(),
  email: z.string(),
  papel: papelSchema,
  ativo: z.boolean(),
  senhaTemporaria: z.boolean(),
  empresaIds: z.array(z.uuid()),
});
export type Usuario = z.infer<typeof usuarioSchema>;

const empresaIdsSchema = z.array(z.uuid()).max(500);

const exigirEmpresas = <T extends { papel?: z.infer<typeof papelSchema>; empresaIds?: string[] }>(
  dados: T,
  ctx: z.RefinementCtx,
) => {
  if (dados.papel && papelExigeEmpresas(dados.papel) && dados.empresaIds?.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["empresaIds"],
      message: "Selecione ao menos uma empresa",
    });
  }
};

export const usuarioCriarSchema = z
  .object({
    nome: textoObrigatorio("o nome", 120),
    email: emailSchema,
    papel: papelSchema,
    empresaIds: empresaIdsSchema.default([]),
  })
  .superRefine(exigirEmpresas);
export type UsuarioCriar = z.infer<typeof usuarioCriarSchema>;

/** O e-mail não faz parte: é imutável. */
export const usuarioAtualizarSchema = z
  .object({
    nome: textoObrigatorio("o nome", 120),
    papel: papelSchema,
    empresaIds: empresaIdsSchema,
    ativo: z.boolean(),
  })
  .partial()
  .strict()
  .superRefine(exigirEmpresas);
export type UsuarioAtualizar = z.infer<typeof usuarioAtualizarSchema>;

const booleanoQuery = z.enum(["true", "false"]).transform((v) => v === "true");

export const usuarioFiltrosSchema = z.object({
  papel: papelSchema.optional(),
  empresaId: z.uuid().optional(),
  ativo: booleanoQuery.optional(),
});
export type UsuarioFiltros = z.infer<typeof usuarioFiltrosSchema>;

export const usuarioCriadoResponseSchema = z.object({
  usuario: usuarioSchema,
  senhaTemporaria: z.string(),
});
export type UsuarioCriadoResponse = z.infer<typeof usuarioCriadoResponseSchema>;
