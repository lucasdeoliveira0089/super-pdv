import { Inject, Logger, Module, type OnApplicationShutdown } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createDb, type DbClient } from "@super-pdv/db";
import type { Env } from "../config/env";

/** Token de injeção do cliente do banco (`DbClient`), conectado como dono das tabelas. */
export const DB_CLIENT = Symbol("DB_CLIENT");

/**
 * Conexão bruta com o banco. NÃO é global: só pode ser importado por
 * `TenantDbModule`, `SystemDbModule` e `HealthModule` (ver test/modulos.test.ts).
 * O restante da aplicação acessa dados por `TenantDb` (com RLS) ou `SystemDb`.
 */
@Module({
  providers: [
    {
      provide: DB_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): DbClient => {
        const logger = new Logger("Database");
        return createDb(config.get("DATABASE_URL", { infer: true }), {
          connectionTimeoutMillis: 2_000,
          onPoolError: (error) =>
            logger.warn(`Conexão ociosa com o banco falhou: ${error.message}`),
        });
      },
    },
  ],
  exports: [DB_CLIENT],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DB_CLIENT) private readonly client: DbClient) {}

  async onApplicationShutdown(): Promise<void> {
    await this.client.close();
  }
}
