import { Global, Inject, Injectable, Module } from "@nestjs/common";
import { sql, type DbClient } from "@super-pdv/db";
import { ClsService } from "nestjs-cls";
import type { ContextoRequisicao } from "../contexto/contexto";
import { DatabaseModule, DB_CLIENT } from "./database.module";
import type { Transacao } from "./system-db";

export class SemContextoDeClienteError extends Error {
  constructor() {
    super("Acesso a dados de cliente sem cliente definido no contexto da requisição");
  }
}

/**
 * Acesso aos dados de UM cliente, com isolamento imposto pelo PostgreSQL (RLS).
 *
 * Cada chamada abre uma transação no papel restrito `superpdv_app` com
 * `app.tenant_id` = cliente da sessão autenticada. O cliente vem sempre do
 * contexto da requisição, nunca de parâmetros.
 */
@Injectable()
export class TenantDb {
  constructor(
    @Inject(DB_CLIENT) private readonly client: DbClient,
    private readonly cls: ClsService<ContextoRequisicao>,
  ) {}

  /** Identificador do cliente da requisição atual (falha se não houver). */
  get tenantId(): string {
    const tenantId = this.cls.get("tenantId");
    if (!tenantId) throw new SemContextoDeClienteError();
    return tenantId;
  }

  async transacao<T>(fn: (tx: Transacao) => Promise<T>): Promise<T> {
    const tenantId = this.tenantId;
    return this.client.db.transaction(async (tx) => {
      await tx.execute(sql`set local role superpdv_app`);
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
      return fn(tx);
    });
  }
}

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [TenantDb],
  exports: [TenantDb],
})
export class TenantDbModule {}
