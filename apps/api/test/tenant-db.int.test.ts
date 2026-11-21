import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { schema, sql } from "@super-pdv/db";
import { iniciarPostgresDeTeste, type PostgresDeTeste } from "@super-pdv/db/testing";
import { ClsService } from "nestjs-cls";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SystemDb, SystemDbModule } from "../src/database/system-db";
import { SemContextoDeClienteError, TenantDb } from "../src/database/tenant-db";
import { aplicarAmbienteDeTeste } from "./ambiente";

describe("TenantDb (integração)", () => {
  let pg: PostgresDeTeste;
  let ref: TestingModule;
  let tenantDb: TenantDb;
  let cls: ClsService;
  const clientes: Record<"a" | "b", string> = { a: "", b: "" };

  beforeAll(async () => {
    pg = await iniciarPostgresDeTeste();
    aplicarAmbienteDeTeste(pg.url);
    const { AppModule } = await import("../src/app.module.js");
    ref = await Test.createTestingModule({ imports: [AppModule, SystemDbModule] }).compile();
    tenantDb = ref.get(TenantDb);
    cls = ref.get(ClsService);

    const system = ref.get(SystemDb);
    for (const [chave, cnpj] of [
      ["a", "11222333000181"],
      ["b", "12ABC34501DE35"],
    ] as const) {
      const [c] = await system.db
        .insert(schema.clientes)
        .values({ nome: `Cliente ${chave}` })
        .returning();
      clientes[chave] = c!.id;
      await system.db.insert(schema.empresas).values({
        tenantId: c!.id,
        cnpj,
        razaoSocial: "Razão",
        nomeFantasia: `Empresa ${chave}`,
      });
    }
  }, 180_000);

  afterAll(async () => {
    await ref?.close();
    await pg?.parar();
  });

  it("enxerga apenas as empresas do cliente do contexto", async () => {
    const nomes = await cls.run(async () => {
      cls.set("tenantId", clientes.a);
      return tenantDb.transacao(async (tx) =>
        (await tx.select().from(schema.empresas)).map((e) => e.nomeFantasia),
      );
    });
    expect(nomes).toEqual(["Empresa a"]);
  });

  it("roda no papel restrito da aplicação", async () => {
    const papel = await cls.run(async () => {
      cls.set("tenantId", clientes.b);
      return tenantDb.transacao(
        async (tx) => (await tx.execute<{ r: string }>(sql`select current_user as r`)).rows[0]?.r,
      );
    });
    expect(papel).toBe("superpdv_app");
  });

  it("falha sem cliente no contexto", async () => {
    await expect(
      cls.run(() => tenantDb.transacao(async (tx) => tx.select().from(schema.empresas))),
    ).rejects.toThrow(SemContextoDeClienteError);
  });
});
