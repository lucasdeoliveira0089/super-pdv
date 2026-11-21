import { z } from "zod";

/** Variáveis de ambiente aceitas pela API. */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3333),
  DATABASE_URL: z.url({
    protocol: /^postgres(ql)?$/,
    error: (issue) =>
      issue.input === undefined ? "obrigatória" : "deve ser uma URL postgres:// válida",
  }),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Valida as variáveis de ambiente. Lança um erro que nomeia cada variável
 * ausente ou inválida, impedindo a API de iniciar.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Variáveis de ambiente inválidas:\n${problems}`);
  }
  return result.data;
}
