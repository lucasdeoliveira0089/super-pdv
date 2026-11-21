import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { healthResponseSchema } from "@super-pdv/shared";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Integração dos endpoints de saúde contra um PostgreSQL real e efêmero.
 * Os testes rodam em ordem: primeiro com o banco ativo, depois com o container parado.
 */
describe("Endpoints de saúde (integração)", () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:18")
      .withUsername("usuario_secreto")
      .withPassword("senha_secreta")
      .withDatabase("superpdv_test")
      .start();

    process.env.DATABASE_URL = container.getConnectionUri();

    // Importado depois de definir o ambiente: o ConfigModule valida na carga do módulo.
    const { AppModule } = await import("../src/app.module.js");
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await container?.stop().catch(() => undefined);
  });

  describe("com o banco ativo", () => {
    it("GET /health/live responde 200", async () => {
      const res = await request(app.getHttpServer()).get("/health/live").expect(200);
      expect(healthResponseSchema.parse(res.body)).toEqual({ status: "ok", checks: {} });
    });

    it("GET /health/ready responde 200 com o banco disponível", async () => {
      const res = await request(app.getHttpServer()).get("/health/ready").expect(200);
      expect(healthResponseSchema.parse(res.body)).toEqual({
        status: "ok",
        checks: { database: "up" },
      });
    });
  });

  describe("com o banco parado", () => {
    beforeAll(async () => {
      await container.stop();
    });

    it("GET /health/ready responde 503 com o banco indisponível", async () => {
      const res = await request(app.getHttpServer()).get("/health/ready").expect(503);
      expect(healthResponseSchema.parse(res.body)).toEqual({
        status: "error",
        checks: { database: "down" },
      });
    });

    it("GET /health/live continua respondendo 200", async () => {
      await request(app.getHttpServer()).get("/health/live").expect(200);
    });

    it("a resposta de prontidão não expõe host, porta, usuário, senha nem mensagens do driver", async () => {
      const res = await request(app.getHttpServer()).get("/health/ready").expect(503);
      const body = JSON.stringify(res.body);
      const url = new URL(process.env.DATABASE_URL!);

      for (const secret of [url.hostname, url.port, "usuario_secreto", "senha_secreta"]) {
        expect(body).not.toContain(secret);
      }
      expect(body).not.toMatch(/ECONNREFUSED|timeout|connect|error:/i);
    });
  });
});
