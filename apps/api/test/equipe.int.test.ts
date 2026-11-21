import { eq, schema } from "@super-pdv/db";
import {
  equipeMeResponseSchema,
  membroEquipeCriadoResponseSchema,
  senhaTemporariaResponseSchema,
} from "@super-pdv/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { executarEquipeCriar } from "../src/cli/equipe-criar";
import { type AppDeTeste, bearer, criarAppDeTeste } from "./app-de-teste";

describe("equipe Super PDV (integração)", () => {
  let t: AppDeTeste;

  beforeAll(async () => {
    t = await criarAppDeTeste();
  }, 180_000);

  afterAll(async () => {
    await t?.fechar();
  });

  describe("autenticação da equipe", () => {
    it("membro ativo entra no admin e consulta /admin/me", async () => {
      const m = await t.criarMembro({ nome: "Carla" });
      const tokens = await t.entrar(m.email, m.senha, "equipe");
      const me = equipeMeResponseSchema.parse(
        (await t.http().get("/v1/admin/me").set(bearer(tokens)).expect(200)).body,
      );
      expect(me).toMatchObject({ nome: "Carla", email: m.email, senhaTemporaria: false });
    });

    it("senha temporária: só /admin/me e troca de senha até concluir", async () => {
      const m = await t.criarMembro({ senhaTemporaria: true });
      const tokens = await t.entrar(m.email, m.senha, "equipe");
      await t.http().get("/v1/admin/me").set(bearer(tokens)).expect(200);
      const r = await t.http().get("/v1/admin/equipe").set(bearer(tokens)).expect(403);
      expect(r.body.code).toBe("PASSWORD_CHANGE_REQUIRED");
      await t
        .http()
        .post("/v1/admin/auth/senha")
        .set(bearer(tokens))
        .send({ senhaAtual: m.senha, novaSenha: "Equipe#Nova2026" })
        .expect(204);
      await t.http().get("/v1/admin/equipe").set(bearer(tokens)).expect(200);
    });

    it("bloqueio por tentativas também vale para a equipe", async () => {
      const m = await t.criarMembro();
      for (let i = 0; i < 5; i++) {
        await t
          .http()
          .post("/v1/admin/auth/login")
          .send({ email: m.email, senha: "Errada#123456" })
          .expect(401);
      }
      await t
        .http()
        .post("/v1/admin/auth/login")
        .send({ email: m.email, senha: m.senha })
        .expect(429);
    });

    it("recuperação envia link do admin", async () => {
      const m = await t.criarMembro();
      await t.http().post("/v1/admin/auth/recuperacao").send({ email: m.email }).expect(202);
      const msg = t.mailer.ultimoPara(m.email);
      expect(msg?.assunto).toBe("Redefinição de senha — Admin Super PDV");
      expect(msg?.texto).toMatch(/http:\/\/admin\.teste\/redefinir-senha\?token=/);
    });
  });

  describe("separação entre equipe e clientes", () => {
    it("Dono de cliente não entra no admin (mensagem genérica)", async () => {
      const cliente = await t.criarCliente();
      const dono = await t.criarUsuario(cliente, { papel: "dono" });
      const r = await t
        .http()
        .post("/v1/admin/auth/login")
        .send({ email: dono.email, senha: dono.senha })
        .expect(401);
      expect(r.body.message).toBe("E-mail ou senha inválidos");
    });

    it("tokens de um domínio não valem no outro", async () => {
      const m = await t.criarMembro();
      const tEquipe = await t.entrar(m.email, m.senha, "equipe");
      const cliente = await t.criarCliente();
      const dono = await t.criarUsuario(cliente, { papel: "dono" });
      const tCliente = await t.entrar(dono.email);

      await t.http().get("/v1/me").set(bearer(tEquipe)).expect(401);
      await t.http().get("/v1/admin/me").set(bearer(tCliente)).expect(401);
      await t.http().get("/v1/admin/equipe").set(bearer(tCliente)).expect(401);
      await t
        .http()
        .post("/v1/auth/refresh")
        .send({ refreshToken: tEquipe.refreshToken })
        .expect(401);
      await t
        .http()
        .post("/v1/admin/auth/refresh")
        .send({ refreshToken: tCliente.refreshToken })
        .expect(401);
    });
  });

  describe("gestão da equipe", () => {
    let admin: { accessToken: string };
    let adminId: string;

    beforeAll(async () => {
      const m = await t.criarMembro({ nome: "Administradora" });
      adminId = m.id;
      admin = await t.entrar(m.email, m.senha, "equipe");
    });

    it("cadastra membro com senha temporária exibida uma vez e lista", async () => {
      const res = await t
        .http()
        .post("/v1/admin/equipe")
        .set(bearer(admin))
        .send({ nome: "Carla", email: "Carla@SuperPDV.com.br" })
        .expect(201);
      const { membro, senhaTemporaria } = membroEquipeCriadoResponseSchema.parse(res.body);
      expect(membro).toMatchObject({
        email: "carla@superpdv.com.br",
        ativo: true,
        senhaTemporaria: true,
      });
      expect(senhaTemporaria).toHaveLength(16);

      const novo = await t.entrar(membro.email, senhaTemporaria, "equipe");
      const me = (await t.http().get("/v1/admin/me").set(bearer(novo)).expect(200)).body;
      expect(me.senhaTemporaria).toBe(true);

      const lista = (await t.http().get("/v1/admin/equipe").set(bearer(admin)).expect(200)).body;
      expect(lista.map((x: { email: string }) => x.email)).toContain("carla@superpdv.com.br");
      expect(JSON.stringify(lista)).not.toMatch(/argon2|senhaHash/);
    });

    it("e-mail repetido → 409 no campo email", async () => {
      const m = await t.criarMembro();
      const r = await t
        .http()
        .post("/v1/admin/equipe")
        .set(bearer(admin))
        .send({ nome: "Outro", email: m.email })
        .expect(409);
      expect(r.body.fieldErrors.email).toEqual(["E-mail já está em uso"]);
    });

    it("desativar encerra as sessões do membro; reativar permite entrar de novo", async () => {
      const m = await t.criarMembro();
      const sessao = await t.entrar(m.email, m.senha, "equipe");
      await t
        .http()
        .patch(`/v1/admin/equipe/${m.id}`)
        .set(bearer(admin))
        .send({ ativo: false })
        .expect(200);
      await t.http().get("/v1/admin/me").set(bearer(sessao)).expect(401);
      await t
        .http()
        .post("/v1/admin/auth/login")
        .send({ email: m.email, senha: m.senha })
        .expect(401);
      await t
        .http()
        .patch(`/v1/admin/equipe/${m.id}`)
        .set(bearer(admin))
        .send({ ativo: true })
        .expect(200);
      await t.entrar(m.email, m.senha, "equipe");
    });

    it("ninguém pode desativar a si mesmo", async () => {
      const r = await t
        .http()
        .patch(`/v1/admin/equipe/${adminId}`)
        .set(bearer(admin))
        .send({ ativo: false })
        .expect(422);
      expect(r.body.message).toBe("Você não pode desativar a si mesmo");
    });

    it("redefinir senha gera nova senha temporária e encerra sessões", async () => {
      const m = await t.criarMembro();
      const sessao = await t.entrar(m.email, m.senha, "equipe");
      const r = await t
        .http()
        .post(`/v1/admin/equipe/${m.id}/redefinir-senha`)
        .set(bearer(admin))
        .expect(200);
      const { senhaTemporaria } = senhaTemporariaResponseSchema.parse(r.body);
      await t.http().get("/v1/admin/me").set(bearer(sessao)).expect(401);
      const nova = await t.entrar(m.email, senhaTemporaria, "equipe");
      await t.http().get("/v1/admin/equipe").set(bearer(nova)).expect(403);
    });

    it("membro inexistente → 404", async () => {
      await t
        .http()
        .post(`/v1/admin/equipe/0190a4b2-7c3d-7e8f-9a0b-1c2d3e4f5a6b/redefinir-senha`)
        .set(bearer(admin))
        .expect(404);
    });
  });

  describe("comando equipe:criar", () => {
    it("cria o membro com senha temporária e exibe a senha", async () => {
      const r = await executarEquipeCriar(t.app, [
        "--nome",
        "Primeira",
        "--email",
        "primeira@superpdv.com.br",
      ]);
      expect(r.codigo).toBe(0);
      const senha = /Senha temporária \(exibida apenas agora\): (\S+)/.exec(r.saida)?.[1];
      expect(senha).toHaveLength(16);
      const [m] = await t.system.db
        .select()
        .from(schema.equipeMembros)
        .where(eq(schema.equipeMembros.email, "primeira@superpdv.com.br"));
      expect(m?.senhaTemporaria).toBe(true);
      await t.entrar("primeira@superpdv.com.br", senha!, "equipe");
    });

    it("e-mail repetido não cria nada", async () => {
      const r = await executarEquipeCriar(t.app, [
        "--nome",
        "De novo",
        "--email",
        "primeira@superpdv.com.br",
      ]);
      expect(r).toEqual({ codigo: 1, saida: "Erro: E-mail já está em uso" });
    });

    it("argumentos inválidos mostram o uso", async () => {
      const r = await executarEquipeCriar(t.app, ["--nome", "Sem email"]);
      expect(r.codigo).toBe(2);
      expect(r.saida).toMatch(/--email/);
    });
  });
});
