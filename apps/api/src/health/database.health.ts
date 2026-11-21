import { Inject, Injectable, Logger } from "@nestjs/common";
import { HealthIndicatorService } from "@nestjs/terminus";
import { sql, type DbClient } from "@super-pdv/db";
import { DB_CLIENT } from "../database/database.module";

/** Tempo máximo para o banco responder à verificação de prontidão. */
export const DATABASE_CHECK_TIMEOUT_MS = 2_000;

/** Verifica se o PostgreSQL responde a `select 1` dentro do tempo limite. */
@Injectable()
export class DatabaseHealthIndicator {
  private readonly logger = new Logger(DatabaseHealthIndicator.name);

  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    @Inject(DB_CLIENT) private readonly client: DbClient,
  ) {}

  async isHealthy(key: string) {
    const indicator = this.healthIndicatorService.check(key);
    try {
      await withTimeout(this.client.db.execute(sql`select 1`), DATABASE_CHECK_TIMEOUT_MS);
      return indicator.up();
    } catch (error) {
      // O detalhe do erro vai apenas para o log; a resposta HTTP só informa "down".
      this.logger.warn(
        `Banco indisponível: ${error instanceof Error ? error.message : String(error)}`,
      );
      return indicator.down();
    }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout de ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
