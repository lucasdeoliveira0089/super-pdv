import { z } from "zod";

/** Estado de uma dependência verificada pelo endpoint de prontidão. */
export const dependencyStatusSchema = z.enum(["up", "down"]);
export type DependencyStatus = z.infer<typeof dependencyStatusSchema>;

/**
 * Resposta dos endpoints de saúde da API (`/health/live` e `/health/ready`).
 * Contém apenas o estado geral e o estado de cada dependência: nunca mensagens
 * de erro, hosts ou credenciais.
 */
export const healthResponseSchema = z
  .object({
    status: z.enum(["ok", "error"]),
    checks: z.record(z.string(), dependencyStatusSchema),
  })
  .strict();
export type HealthResponse = z.infer<typeof healthResponseSchema>;
