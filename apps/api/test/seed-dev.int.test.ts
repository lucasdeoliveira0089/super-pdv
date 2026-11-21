import { meResponseSchema } from "@super-pdv/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { executarSeedDev, SEED } from "../src/cli/seed-dev";
import { type AppDeTeste, bearer, criarAppDeTeste } from "./app-de-teste";

describe("comando seed:dev", () => {
  let t: AppDeTeste;

  beforeAll(async () => {
    t = await criarAppDeTeste();
  }, 180_000);

  afterAll(async () => {
    await t?.fechar();
  });

  it("cria equipe, cliente com duas empresas e um usuário de cada papel", async () => {
    const r = await executarSeedDev(t.app);
    expect(r.codigo).toBe(0);
    expect(r.saida).toContain(SEED.equipe.email);

    await t.entrar(SEED.equipe.email, SEED.equipe.senha, "equipe");
    const papeis = [];
    for (const u of SEED.usuarios) {
      const me = meResponseSchema.parse(
        (
          await t
            .http()
            .get("/v1/me")
            .set(bearer(await t.entrar(u.email, SEED.senhaUsuarios)))
            .expect(200)
        ).body,
      );
      papeis.push(me.papel);
      expect(me.cliente.nome).toBe("Demonstração");
      expect(me.empresas).toHaveLength(u.empresas.length === 0 ? 2 : u.empresas.length);
    }
    expect(papeis).toEqual(["dono", "administrador", "gerente", "operador"]);
  });

  it("é idempotente", async () => {
    expect(await executarSeedDev(t.app)).toEqual({
      codigo: 0,
      saida: "Dados de demonstração já existem; nada foi alterado.",
    });
  });
});
