import { apiErroSchema } from "@super-pdv/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type AppDeTeste, criarAppDeTeste } from "./app-de-teste";

describe("limite de requisições por IP nas rotas de autenticação", () => {
  let t: AppDeTeste;

  beforeAll(async () => {
    t = await criarAppDeTeste({ env: { LIMITE_AUTH_POR_MINUTO: "3" } });
  }, 180_000);

  afterAll(async () => {
    await t?.fechar();
  });

  it("a partir do limite, responde 429 MUITAS_REQUISICOES", async () => {
    const tentar = () =>
      t.http().post("/v1/auth/recuperacao").send({ email: "alguem@teste.com.br" });
    for (let i = 0; i < 3; i++) expect((await tentar()).status).toBe(202);
    const res = await tentar();
    expect(res.status).toBe(429);
    expect(apiErroSchema.parse(res.body).code).toBe("MUITAS_REQUISICOES");
  });

  it("rotas fora da autenticação não são limitadas", async () => {
    for (let i = 0; i < 5; i++) await t.http().get("/health/live").expect(200);
  });
});
