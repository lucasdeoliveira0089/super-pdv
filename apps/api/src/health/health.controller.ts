import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { Publico } from "../auth/decoradores";
import { HealthCheckService, type HealthCheckResult } from "@nestjs/terminus";
import { healthResponseSchema, type HealthResponse } from "@super-pdv/shared";
import { DatabaseHealthIndicator } from "./database.health";

/** Endpoints públicos de saúde (sem autenticação). */
@Controller("health")
@Publico()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DatabaseHealthIndicator,
  ) {}

  /** Vida: responde enquanto o processo estiver de pé, sem consultar dependências. */
  @Get("live")
  live(): HealthResponse {
    return { status: "ok", checks: {} };
  }

  /** Prontidão: verifica o banco; 503 quando alguma dependência está indisponível. */
  @Get("ready")
  async ready(): Promise<HealthResponse> {
    try {
      const result = await this.health.check([() => this.database.isHealthy("database")]);
      return toHealthResponse(result);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw new ServiceUnavailableException(
          toHealthResponse(error.getResponse() as HealthCheckResult),
        );
      }
      throw error;
    }
  }
}

/** Converte o resultado do Terminus no formato público, descartando qualquer detalhe extra. */
function toHealthResponse(result: HealthCheckResult): HealthResponse {
  const checks = Object.fromEntries(
    Object.entries(result.details).map(([name, detail]) => [
      name,
      detail.status === "up" ? "up" : "down",
    ]),
  );
  return healthResponseSchema.parse({
    status: result.status === "ok" ? "ok" : "error",
    checks,
  });
}
