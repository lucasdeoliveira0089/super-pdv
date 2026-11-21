import { z } from "zod";

const obrigatoria =
  (descricao: string) =>
  (issue: { input: unknown }): string =>
    issue.input === undefined || issue.input === "" ? "obrigatória" : descricao;

const urlHttp = z.url({
  protocol: /^https?$/,
  error: obrigatoria("deve ser uma URL http(s) válida"),
});

/** Variáveis de ambiente aceitas pela API. */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3333),
  DATABASE_URL: z.url({
    protocol: /^postgres(ql)?$/,
    error: obrigatoria("deve ser uma URL postgres:// válida"),
  }),
  /** Segredo de assinatura dos tokens de acesso (HS256). */
  JWT_SECRET: z
    .string({ error: obrigatoria("inválida") })
    .min(32, "deve ter ao menos 32 caracteres"),
  /** URL pública do gestor (links de recuperação de senha dos clientes). */
  GESTOR_URL: urlHttp,
  /** URL pública do admin (links de recuperação de senha da equipe). */
  ADMIN_URL: urlHttp,
  /** Servidor SMTP, ex.: smtp://localhost:1025 ou smtps://usuario:senha@host:465. */
  SMTP_URL: z.url({ protocol: /^smtps?$/, error: obrigatoria("deve ser uma URL smtp(s)://") }),
  /** Remetente dos e-mails, ex.: "Super PDV <nao-responda@superpdv.com.br>". */
  MAIL_FROM: z.string({ error: obrigatoria("inválida") }).min(3, "obrigatória"),
  /** Requisições por minuto, por IP, nas rotas de autenticação. */
  LIMITE_AUTH_POR_MINUTO: z.coerce.number().int().min(1).default(20),
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
