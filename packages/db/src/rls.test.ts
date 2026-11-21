import { Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { iniciarPostgresDeTeste, type PostgresDeTeste } from "./testing";

// Testes executados diretamente no banco, no papel restrito da aplicação.
describe("Row Level Security entre clientes", () => {
  let pg: PostgresDeTeste;
  let pool: Pool;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    pg = await iniciarPostgresDeTeste();
    pool = new Pool({ connectionString: pg.url });
    // Dados criados pelo dono das tabelas (caminho privilegiado).
    for (const [cliente, cnpj] of [
      ["a", "11222333000181"],
      ["b", "12ABC34501DE35"],
    ] as const) {
      const c = await pool.query(`insert into clientes (nome) values ($1) returning id`, [
        `Cliente ${cliente}`,
      ]);
      ids[cliente] = c.rows[0].id;
      const e = await pool.query(
        `insert into empresas (tenant_id, cnpj, razao_social, nome_fantasia)
         values ($1, $2, 'Razão', 'Fantasia ' || $3) returning id`,
        [ids[cliente], cnpj, cliente],
      );
      ids[`empresa_${cliente}`] = e.rows[0].id;
    }
  }, 180_000);

  afterAll(async () => {
    await pool?.end();
    await pg?.parar();
  });

  /** Executa `fn` como `superpdv_app`, opcionalmente no contexto de um cliente. */
  async function comoApp<T>(tenantId: string | null, fn: (c: PoolClient) => Promise<T>) {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("set local role superpdv_app");
      if (tenantId) await client.query("select set_config('app.tenant_id', $1, true)", [tenantId]);
      return await fn(client);
    } finally {
      await client.query("rollback");
      client.release();
    }
  }

  it("com contexto, uma consulta sem filtro vê só o próprio cliente", async () => {
    const rows = await comoApp(
      ids.a!,
      async (c) => (await c.query("select id from empresas")).rows,
    );
    expect(rows.map((r) => r.id)).toEqual([ids.empresa_a]);
  });

  it("sem contexto, nada é visível", async () => {
    const rows = await comoApp(null, async (c) => (await c.query("select id from empresas")).rows);
    expect(rows).toEqual([]);
  });

  it("não insere registro em outro cliente", async () => {
    await expect(
      comoApp(ids.a!, (c) =>
        c.query(
          `insert into usuarios (tenant_id, nome, email, senha_hash, papel)
           values ($1, 'Intruso', 'intruso@x.com', 'h', 'dono')`,
          [ids.b],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("não altera registro de outro cliente", async () => {
    const r = await comoApp(ids.a!, (c) =>
      c.query("update empresas set nome_fantasia = 'Hackeado' where id = $1", [ids.empresa_b]),
    );
    expect(r.rowCount).toBe(0);
  });

  it("não move um registro para outro cliente", async () => {
    await expect(
      comoApp(ids.a!, (c) =>
        c.query("update empresas set tenant_id = $1 where id = $2", [ids.b, ids.empresa_a]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("não acessa tabelas sem RLS (dados da plataforma)", async () => {
    await expect(comoApp(ids.a!, (c) => c.query("select * from clientes"))).rejects.toThrow(
      /permission denied/,
    );
    await expect(comoApp(ids.a!, (c) => c.query("select * from sessoes"))).rejects.toThrow(
      /permission denied/,
    );
  });

  it("FK composta impede vincular usuário a empresa de outro cliente", async () => {
    const u = await pool.query(
      `insert into usuarios (tenant_id, nome, email, senha_hash, papel)
       values ($1, 'Gerente A', 'gerente.a@x.com', 'h', 'gerente') returning id`,
      [ids.a],
    );
    await expect(
      pool.query(
        "insert into usuario_empresas (tenant_id, usuario_id, empresa_id) values ($1, $2, $3)",
        [ids.a, u.rows[0].id, ids.empresa_b],
      ),
    ).rejects.toThrow(/usuario_empresas_empresa_fk/);
  });

  it("toda tabela com tenant_id tem RLS habilitado e política", async () => {
    const { rows } = await pool.query(`
      select c.relname as tabela, c.relrowsecurity as rls,
             (select count(*) from pg_policies p where p.tablename = c.relname)::int as politicas
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
      join pg_attribute a on a.attrelid = c.oid and a.attname = 'tenant_id' and not a.attisdropped
      where c.relkind = 'r'
      order by 1`);
    expect(rows.length).toBeGreaterThan(0);
    const desprotegidas = rows.filter((r) => !r.rls || r.politicas === 0).map((r) => r.tabela);
    expect(desprotegidas, `tabelas com tenant_id sem RLS/política`).toEqual([]);
  });
});
