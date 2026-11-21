import { Inject, Injectable, Module } from "@nestjs/common";
import type { Database, DbClient } from "@super-pdv/db";
import { DatabaseModule, DB_CLIENT } from "./database.module";

export type Transacao = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Acesso PRIVILEGIADO ao banco (dono das tabelas: o RLS não se aplica).
 *
 * Permitido apenas em: autenticação (antes de saber o cliente), rotas do admin
 * (a equipe vê vários clientes) e comandos CLI. Garantido por test/modulos.test.ts.
 */
@Injectable()
export class SystemDb {
  constructor(@Inject(DB_CLIENT) private readonly client: DbClient) {}

  get db(): Database {
    return this.client.db;
  }

  transacao<T>(fn: (tx: Transacao) => Promise<T>): Promise<T> {
    return this.client.db.transaction(fn);
  }
}

@Module({
  imports: [DatabaseModule],
  providers: [SystemDb],
  exports: [SystemDb],
})
export class SystemDbModule {}
