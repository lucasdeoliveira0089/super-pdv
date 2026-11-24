import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { iniciarPostgresDeTeste, type PostgresDeTeste } from "./testing";

// CHECKs do endereço das empresas e do responsável dos clientes (migration 0003),
// exercitados diretamente no PostgreSQL.
describe("dados cadastrais de clientes e empresas", () => {
  let pg: PostgresDeTeste;
  let pool: Pool;
  let clienteId: string;

  const ENDERECO = {
    endereco_cep: "01310100",
    endereco_logradouro: "Avenida Paulista",
    endereco_numero: "1000",
    endereco_complemento: null as string | null,
    endereco_bairro: "Bela Vista",
    endereco_cidade: "São Paulo",
    endereco_uf: "SP",
  };
  const CNPJS = ["11222333000181", "12ABC34501DE35", "11444777000161", "45723174000110"];
  let proximoCnpj = 0;

  beforeAll(async () => {
    pg = await iniciarPostgresDeTeste();
    pool = new Pool({ connectionString: pg.url });
    const c = await pool.query(`insert into clientes (nome) values ('Cliente') returning id`);
    clienteId = c.rows[0].id;
  }, 180_000);

  afterAll(async () => {
    await pool?.end();
    await pg?.parar();
  });

  /** Insere uma empresa com as colunas de endereço informadas (as demais ficam nulas). */
  async function inserirEmpresa(endereco: Partial<typeof ENDERECO>) {
    const colunas = Object.keys(endereco);
    const valores = Object.values(endereco);
    const cnpj = CNPJS[proximoCnpj++ % CNPJS.length]!;
    await pool.query(`delete from empresas where cnpj = $1`, [cnpj]);
    return pool.query(
      `insert into empresas (tenant_id, cnpj, razao_social, nome_fantasia${colunas.map((c) => `, ${c}`).join("")})
       values ($1, $2, 'Razão', 'Fantasia'${valores.map((_, i) => `, $${i + 3}`).join("")})`,
      [clienteId, cnpj, ...valores],
    );
  }

  /** Grava o responsável do cliente com as colunas informadas (as demais ficam nulas). */
  function gravarResponsavel(r: { nome?: string; celular?: string; email?: string }) {
    return pool.query(
      `update clientes set responsavel_nome = $2, responsavel_celular = $3, responsavel_email = $4
       where id = $1`,
      [clienteId, r.nome ?? null, r.celular ?? null, r.email ?? null],
    );
  }

  describe("endereço da empresa", () => {
    it("aceita empresa sem endereço (registros antigos)", async () => {
      await expect(inserirEmpresa({})).resolves.toBeDefined();
    });

    it("aceita endereço completo, com e sem complemento", async () => {
      await expect(inserirEmpresa(ENDERECO)).resolves.toBeDefined();
      await expect(
        inserirEmpresa({ ...ENDERECO, endereco_complemento: "Sala 2" }),
      ).resolves.toBeDefined();
    });

    it("recusa endereço parcial", async () => {
      const { endereco_numero: _, ...semNumero } = ENDERECO;
      await expect(inserirEmpresa(semNumero)).rejects.toThrow(/empresas_endereco_completo/);
    });

    it("recusa só o complemento", async () => {
      await expect(inserirEmpresa({ endereco_complemento: "Sala 2" })).rejects.toThrow(
        /empresas_endereco_completo/,
      );
    });

    it.each(["01310-100", "1234", "0131010A"])("recusa o CEP %s", async (cep) => {
      await expect(inserirEmpresa({ ...ENDERECO, endereco_cep: cep })).rejects.toThrow(
        /empresas_endereco_cep_formato/,
      );
    });

    it.each(["XX", "sp"])("recusa a UF %s", async (uf) => {
      await expect(inserirEmpresa({ ...ENDERECO, endereco_uf: uf })).rejects.toThrow(
        /empresas_endereco_uf_valida/,
      );
    });
  });

  describe("responsável do cliente", () => {
    const RESPONSAVEL = { nome: "Maria", celular: "11987654321", email: "maria@silva.com.br" };

    it("aceita cliente sem responsável (registros antigos)", async () => {
      await expect(gravarResponsavel({})).resolves.toBeDefined();
    });

    it("aceita responsável completo", async () => {
      await expect(gravarResponsavel(RESPONSAVEL)).resolves.toBeDefined();
    });

    it("recusa responsável parcial", async () => {
      await expect(gravarResponsavel({ nome: "Maria", email: "m@x.com" })).rejects.toThrow(
        /clientes_responsavel_completo/,
      );
    });

    it.each(["(11) 98765-4321", "1134567890", "11887654321"])(
      "recusa o celular %s",
      async (celular) => {
        await expect(gravarResponsavel({ ...RESPONSAVEL, celular })).rejects.toThrow(
          /clientes_responsavel_celular_formato/,
        );
      },
    );
  });
});
