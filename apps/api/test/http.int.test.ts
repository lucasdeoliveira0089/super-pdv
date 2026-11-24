import { Body, Controller, type INestApplication, Post } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { apiErroSchema, empresaCriarSchema } from "@super-pdv/shared";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { configurarApp } from "../src/app.setup";
import { Publico } from "../src/auth/decoradores";
import { ZodPipe } from "../src/comum/zod.pipe";
import { aplicarAmbienteDeTeste } from "./ambiente";

// Só os campos simples da empresa: basta para exercitar o pipe de validação.
const ecoSchema = empresaCriarSchema.omit({ endereco: true });

@Controller("eco")
@Publico()
class EcoController {
  @Post()
  eco(@Body(new ZodPipe(ecoSchema)) corpo: unknown) {
    return corpo;
  }

  @Post("falha")
  falha(): never {
    throw new Error("detalhe interno: senha=123 host=10.0.0.5");
  }
}

@Controller("protegido")
class ProtegidoController {
  @Post()
  ok() {
    return { ok: true };
  }
}

describe("convenções HTTP da API", () => {
  let app: INestApplication;

  beforeAll(async () => {
    aplicarAmbienteDeTeste("postgres://x:y@localhost:1/nenhum");
    const { AppModule } = await import("../src/app.module.js");
    const ref = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [EcoController, ProtegidoController],
    }).compile();
    app = configurarApp(ref.createNestApplication({ logger: false }));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it("rotas de negócio ficam sob /v1", async () => {
    const res = await request(app.getHttpServer())
      .post("/v1/eco")
      .send({ cnpj: "11.222.333/0001-81", razaoSocial: "Razão", nomeFantasia: "Fantasia" })
      .expect(201);
    expect(res.body.cnpj).toBe("11222333000181");
  });

  it("erro de validação traz mensagens por campo", async () => {
    const res = await request(app.getHttpServer())
      .post("/v1/eco")
      .send({ cnpj: "11.222.333/0001-82", razaoSocial: "" })
      .expect(400);
    const erro = apiErroSchema.parse(res.body);
    expect(erro.code).toBe("VALIDACAO");
    expect(erro.fieldErrors?.cnpj).toEqual(["CNPJ inválido"]);
    expect(Object.keys(erro.fieldErrors ?? {}).sort()).toEqual([
      "cnpj",
      "nomeFantasia",
      "razaoSocial",
    ]);
  });

  it("rota inexistente responde 404 no formato padrão", async () => {
    const res = await request(app.getHttpServer()).get("/v1/nao-existe").expect(404);
    expect(apiErroSchema.parse(res.body).code).toBe("NAO_ENCONTRADO");
  });

  it("erro inesperado vira 500 sem detalhes internos", async () => {
    const res = await request(app.getHttpServer()).post("/v1/eco/falha").expect(500);
    expect(res.body).toEqual({
      statusCode: 500,
      code: "ERRO_INTERNO",
      message: "Erro interno. Tente novamente.",
    });
  });

  it("rotas são fechadas por padrão: sem token, 401", async () => {
    const res = await request(app.getHttpServer()).post("/v1/protegido").expect(401);
    expect(apiErroSchema.parse(res.body).code).toBe("NAO_AUTENTICADO");
    await request(app.getHttpServer())
      .post("/v1/protegido")
      .set("Authorization", "Bearer token-falso")
      .expect(401);
  });

  it("saúde continua pública e sem prefixo", async () => {
    await request(app.getHttpServer()).get("/health/live").expect(200);
    await request(app.getHttpServer()).get("/v1/health/live").expect(404);
  });
});
