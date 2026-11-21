import { Controller, Get } from "@nestjs/common";
import { eq, schema } from "@super-pdv/db";
import { apiErroSchema, meResponseSchema, tokensResponseSchema } from "@super-pdv/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DIA, MINUTO } from "../src/auth/relogio";
import { type AppDeTeste, bearer, criarAppDeTeste, SENHA_PADRAO } from "./app-de-teste";

// Rota protegida comum (sem @PermiteSenhaTemporaria), para testar a senha temporária.
@Controller("teste-protegido")
class RotaProtegidaController {
  @Get()
  ok() {
    return { ok: true };
  }
}

const MENSAGEM_GENERICA = "E-mail ou senha inválidos";

describe("autenticação de usuários dos clientes (integração)", () => {
  let t: AppDeTeste;
  let tenantId: string;
  let empresaAtiva: string;
  let empresaInativa: string;

  beforeAll(async () => {
    t = await criarAppDeTeste({ controllers: [RotaProtegidaController] });
    tenantId = await t.criarCliente({ nome: "Grupo Silva" });
    empresaAtiva = await t.criarEmpresa(tenantId, { nomeFantasia: "Mercado Silva Centro" });
    empresaInativa = await t.criarEmpresa(tenantId, { nomeFantasia: "Antiga", ativa: false });
  }, 180_000);

  afterAll(async () => {
    await t?.fechar();
  });

  describe("login", () => {
    it("credenciais válidas devolvem tokens e nunca a senha ou o hash", async () => {
      const u = await t.criarUsuario(tenantId, { papel: "dono" });
      const res = await t
        .http()
        .post("/v1/auth/login")
        .send({ email: u.email, senha: u.senha })
        .expect(200);
      const tokens = tokensResponseSchema.parse(res.body);
      expect(tokens.expiresIn).toBe(15 * 60);
      expect(JSON.stringify(res.body)).not.toMatch(/argon2|senha/i);
    });

    it("e-mail com letras maiúsculas é aceito", async () => {
      const u = await t.criarUsuario(tenantId, {
        papel: "gerente",
        email: "ana@loja.com",
        empresaIds: [empresaAtiva],
      });
      await t
        .http()
        .post("/v1/auth/login")
        .send({ email: "Ana@Loja.com", senha: u.senha })
        .expect(200);
    });

    it.each([
      [
        "senha incorreta",
        async () => (await t.criarUsuario(tenantId, { papel: "dono" })).email,
        "Errada#123456",
      ],
      ["e-mail inexistente", async () => "ninguem@teste.com.br", SENHA_PADRAO],
      [
        "usuário desativado",
        async () => (await t.criarUsuario(tenantId, { papel: "dono", ativo: false })).email,
        SENHA_PADRAO,
      ],
      [
        "cliente suspenso",
        async () => {
          const suspenso = await t.criarCliente({ ativo: false });
          return (await t.criarUsuario(suspenso, { papel: "dono" })).email;
        },
        SENHA_PADRAO,
      ],
    ])("%s → 401 com a mesma mensagem genérica", async (_caso, email, senha) => {
      const res = await t
        .http()
        .post("/v1/auth/login")
        .send({ email: await email(), senha })
        .expect(401);
      expect(apiErroSchema.parse(res.body)).toEqual({
        statusCode: 401,
        code: "CREDENCIAIS_INVALIDAS",
        message: MENSAGEM_GENERICA,
      });
    });
  });

  describe("token de acesso e /me", () => {
    it("/me traz papel, permissões e apenas empresas ativas atribuídas", async () => {
      const u = await t.criarUsuario(tenantId, {
        papel: "gerente",
        nome: "Ana",
        empresaIds: [empresaAtiva, empresaInativa],
      });
      const tokens = await t.entrar(u.email);
      const res = await t.http().get("/v1/me").set(bearer(tokens)).expect(200);
      const me = meResponseSchema.parse(res.body);
      expect(me).toMatchObject({
        nome: "Ana",
        email: u.email,
        papel: "gerente",
        senhaTemporaria: false,
      });
      expect(me.cliente).toEqual({ id: tenantId, nome: "Grupo Silva" });
      expect(me.permissoes).toContain("usuario.gerenciar_operadores");
      expect(me.permissoes).not.toContain("usuario.gerenciar");
      expect(me.empresas.map((e) => e.nomeFantasia)).toEqual(["Mercado Silva Centro"]);
    });

    it("Dono vê todas as empresas ativas do cliente", async () => {
      const u = await t.criarUsuario(tenantId, { papel: "dono" });
      const me = (
        await t
          .http()
          .get("/v1/me")
          .set(bearer(await t.entrar(u.email)))
          .expect(200)
      ).body;
      expect(me.empresas.map((e: { id: string }) => e.id)).toEqual([empresaAtiva]);
    });

    it("token expirado → 401", async () => {
      const u = await t.criarUsuario(tenantId, { papel: "dono" });
      const tokens = await t.entrar(u.email);
      t.relogio.avancar(15 * MINUTO + 1000);
      await t.http().get("/v1/me").set(bearer(tokens)).expect(401);
    });

    it("token adulterado → 401", async () => {
      const u = await t.criarUsuario(tenantId, { papel: "dono" });
      const { accessToken } = await t.entrar(u.email);
      const [h, , s] = accessToken.split(".");
      const p = Buffer.from(
        JSON.stringify({ sub: "x", sid: "y", tid: tenantId, aud: "cliente" }),
      ).toString("base64url");
      await t
        .http()
        .get("/v1/me")
        .set(bearer({ accessToken: `${h}.${p}.${s}` }))
        .expect(401);
    });

    it("usuário desativado com token ainda válido → 401", async () => {
      const u = await t.criarUsuario(tenantId, { papel: "dono" });
      const tokens = await t.entrar(u.email);
      await t.system.db
        .update(schema.usuarios)
        .set({ ativo: false })
        .where(eq(schema.usuarios.id, u.id));
      await t.http().get("/v1/me").set(bearer(tokens)).expect(401);
    });
  });

  describe("renovação e logout", () => {
    it("renova com rotação: o token anterior deixa de valer", async () => {
      const u = await t.criarUsuario(tenantId, { papel: "dono" });
      const t1 = await t.entrar(u.email);
      const r = await t
        .http()
        .post("/v1/auth/refresh")
        .send({ refreshToken: t1.refreshToken })
        .expect(200);
      const t2 = tokensResponseSchema.parse(r.body);
      expect(t2.refreshToken).not.toBe(t1.refreshToken);
      await t.http().get("/v1/me").set(bearer(t2)).expect(200);
    });

    it("reuso de token já trocado → 401 e encerra a sessão inteira", async () => {
      const u = await t.criarUsuario(tenantId, { papel: "dono" });
      const t1 = await t.entrar(u.email);
      const t2 = (
        await t.http().post("/v1/auth/refresh").send({ refreshToken: t1.refreshToken }).expect(200)
      ).body;
      await t.http().post("/v1/auth/refresh").send({ refreshToken: t1.refreshToken }).expect(401);
      // A sessão foi revogada: o par novo também não vale mais.
      await t.http().post("/v1/auth/refresh").send({ refreshToken: t2.refreshToken }).expect(401);
      await t.http().get("/v1/me").set(bearer(t2)).expect(401);
    });

    it("sessão expira 30 dias após o login", async () => {
      const u = await t.criarUsuario(tenantId, { papel: "dono" });
      const t1 = await t.entrar(u.email);
      t.relogio.avancar(30 * DIA + MINUTO);
      await t.http().post("/v1/auth/refresh").send({ refreshToken: t1.refreshToken }).expect(401);
    });

    it("usuário desativado não renova", async () => {
      const u = await t.criarUsuario(tenantId, { papel: "dono" });
      const t1 = await t.entrar(u.email);
      await t.system.db
        .update(schema.usuarios)
        .set({ ativo: false })
        .where(eq(schema.usuarios.id, u.id));
      await t.http().post("/v1/auth/refresh").send({ refreshToken: t1.refreshToken }).expect(401);
    });

    it("após logout, não renova nem acessa", async () => {
      const u = await t.criarUsuario(tenantId, { papel: "dono" });
      const t1 = await t.entrar(u.email);
      await t.http().post("/v1/auth/logout").send({ refreshToken: t1.refreshToken }).expect(204);
      await t.http().post("/v1/auth/refresh").send({ refreshToken: t1.refreshToken }).expect(401);
      await t.http().get("/v1/me").set(bearer(t1)).expect(401);
    });
  });

  describe("senha temporária e troca de senha", () => {
    it("com senha temporária: /me liberado, demais rotas → 403 PASSWORD_CHANGE_REQUIRED", async () => {
      const u = await t.criarUsuario(tenantId, { papel: "dono", senhaTemporaria: true });
      const tokens = await t.entrar(u.email);
      const me = (await t.http().get("/v1/me").set(bearer(tokens)).expect(200)).body;
      expect(me.senhaTemporaria).toBe(true);
      const res = await t.http().get("/v1/teste-protegido").set(bearer(tokens)).expect(403);
      expect(res.body.code).toBe("PASSWORD_CHANGE_REQUIRED");
    });

    it("troca concluída libera as rotas", async () => {
      const u = await t.criarUsuario(tenantId, { papel: "dono", senhaTemporaria: true });
      const tokens = await t.entrar(u.email);
      await t
        .http()
        .post("/v1/auth/senha")
        .set(bearer(tokens))
        .send({ senhaAtual: u.senha, novaSenha: "Nova#Senha2026" })
        .expect(204);
      await t.http().get("/v1/teste-protegido").set(bearer(tokens)).expect(200);
      await t.entrar(u.email, "Nova#Senha2026");
    });

    it("senha atual incorreta não altera a senha", async () => {
      const u = await t.criarUsuario(tenantId, { papel: "dono" });
      const tokens = await t.entrar(u.email);
      const res = await t
        .http()
        .post("/v1/auth/senha")
        .set(bearer(tokens))
        .send({ senhaAtual: "Errada#2026", novaSenha: "Nova#Senha2026" })
        .expect(400);
      expect(res.body.fieldErrors.senhaAtual).toEqual(["Senha atual incorreta"]);
      await t.entrar(u.email, u.senha);
    });

    it.each([
      ["curta", "abc123", /ao menos 8/],
      ["igual ao e-mail", "EMAIL", /igual ao e-mail/],
    ])("política: senha %s é recusada", async (_c, nova, erro) => {
      const u = await t.criarUsuario(tenantId, { papel: "dono" });
      const tokens = await t.entrar(u.email);
      const res = await t
        .http()
        .post("/v1/auth/senha")
        .set(bearer(tokens))
        .send({ senhaAtual: u.senha, novaSenha: nova === "EMAIL" ? u.email : nova })
        .expect(400);
      expect(res.body.message ?? "").toMatch(/inválidos|ao menos|igual/);
      expect(JSON.stringify(res.body.fieldErrors)).toMatch(erro);
    });

    it("troca de senha encerra as outras sessões e mantém a atual", async () => {
      const u = await t.criarUsuario(tenantId, { papel: "dono" });
      const a = await t.entrar(u.email);
      const b = await t.entrar(u.email);
      await t
        .http()
        .post("/v1/auth/senha")
        .set(bearer(a))
        .send({ senhaAtual: u.senha, novaSenha: "Nova#Senha2026" })
        .expect(204);
      await t.http().post("/v1/auth/refresh").send({ refreshToken: b.refreshToken }).expect(401);
      await t.http().get("/v1/me").set(bearer(a)).expect(200);
    });
  });

  describe("bloqueio por tentativas", () => {
    it("após 5 falhas, a 6ª tentativa recebe 429 mesmo com a senha correta; libera após 15 min", async () => {
      const u = await t.criarUsuario(tenantId, { papel: "dono" });
      for (let i = 0; i < 5; i++) {
        await t
          .http()
          .post("/v1/auth/login")
          .send({ email: u.email, senha: "Errada#123456" })
          .expect(401);
      }
      const res = await t
        .http()
        .post("/v1/auth/login")
        .send({ email: u.email, senha: u.senha })
        .expect(429);
      expect(res.body.code).toBe("BLOQUEADO");
      t.relogio.avancar(15 * MINUTO + 1000);
      await t.http().post("/v1/auth/login").send({ email: u.email, senha: u.senha }).expect(200);
    });

    it("login bem-sucedido zera as falhas", async () => {
      const u = await t.criarUsuario(tenantId, { papel: "dono" });
      const errar = () =>
        t
          .http()
          .post("/v1/auth/login")
          .send({ email: u.email, senha: "Errada#123456" })
          .expect(401);
      for (let i = 0; i < 4; i++) await errar();
      await t.entrar(u.email);
      for (let i = 0; i < 4; i++) await errar();
      await t.entrar(u.email);
    });
  });

  describe("recuperação de senha", () => {
    it("e-mail cadastrado recebe link do gestor; e-mail inexistente tem a mesma resposta e nenhum envio", async () => {
      const u = await t.criarUsuario(tenantId, { papel: "dono", nome: "Ana" });
      const antes = t.mailer.enviados.length;
      await t
        .http()
        .post("/v1/auth/recuperacao")
        .send({ email: "nao.existe@teste.com.br" })
        .expect(202);
      expect(t.mailer.enviados.length).toBe(antes);

      await t
        .http()
        .post("/v1/auth/recuperacao")
        .send({ email: u.email.toUpperCase() })
        .expect(202);
      const mensagem = t.mailer.ultimoPara(u.email);
      expect(mensagem?.assunto).toBe("Redefinição de senha — Super PDV");
      expect(mensagem?.texto).toMatch(/http:\/\/gestor\.teste\/redefinir-senha\?token=/);
    });

    it("usuário desativado não recebe e-mail", async () => {
      const u = await t.criarUsuario(tenantId, { papel: "dono", ativo: false });
      await t.http().post("/v1/auth/recuperacao").send({ email: u.email }).expect(202);
      expect(t.mailer.ultimoPara(u.email)).toBeUndefined();
    });

    const tokenDoEmail = (email: string) => {
      const texto = t.mailer.ultimoPara(email)!.texto;
      return decodeURIComponent(/token=([^\s]+)/.exec(texto)![1]!);
    };

    it("link válido redefine a senha, encerra sessões e desbloqueia; não pode ser reutilizado", async () => {
      const u = await t.criarUsuario(tenantId, { papel: "dono" });
      const sessaoAntiga = await t.entrar(u.email);
      for (let i = 0; i < 5; i++) {
        await t
          .http()
          .post("/v1/auth/login")
          .send({ email: u.email, senha: "Errada#123456" })
          .expect(401);
      }
      await t.http().post("/v1/auth/recuperacao").send({ email: u.email }).expect(202);
      const token = tokenDoEmail(u.email);

      await t
        .http()
        .post("/v1/auth/recuperacao/confirmar")
        .send({ token, novaSenha: "Recuperada#2026" })
        .expect(204);
      await t
        .http()
        .post("/v1/auth/refresh")
        .send({ refreshToken: sessaoAntiga.refreshToken })
        .expect(401);
      await t.entrar(u.email, "Recuperada#2026");

      const reuso = await t
        .http()
        .post("/v1/auth/recuperacao/confirmar")
        .send({ token, novaSenha: "Outra#Senha2026" })
        .expect(400);
      expect(reuso.body.code).toBe("LINK_INVALIDO");
    });

    it("link expirado (mais de 1 hora) é recusado", async () => {
      const u = await t.criarUsuario(tenantId, { papel: "dono" });
      await t.http().post("/v1/auth/recuperacao").send({ email: u.email }).expect(202);
      const token = tokenDoEmail(u.email);
      t.relogio.avancar(61 * MINUTO);
      const res = await t
        .http()
        .post("/v1/auth/recuperacao/confirmar")
        .send({ token, novaSenha: "Recuperada#2026" })
        .expect(400);
      expect(res.body.message).toMatch(/inválido ou expirado/);
    });

    it("o tempo de resposta não depende do e-mail existir nem do servidor de e-mail", async () => {
      const u = await t.criarUsuario(tenantId, { papel: "dono" });
      const original = t.mailer.enviar.bind(t.mailer);
      // SMTP lento (3 s): a resposta não pode esperar o envio.
      t.mailer.enviar = (m) => new Promise((r) => setTimeout(() => r(original(m)), 3_000));
      try {
        const inicio = performance.now();
        await t.http().post("/v1/auth/recuperacao").send({ email: u.email }).expect(202);
        expect(performance.now() - inicio).toBeLessThan(1_000);
      } finally {
        t.mailer.enviar = original;
      }
    });

    it("falha no envio do e-mail não altera a resposta", async () => {
      const u = await t.criarUsuario(tenantId, { papel: "dono" });
      const original = t.mailer.enviar.bind(t.mailer);
      t.mailer.enviar = () => Promise.reject(new Error("SMTP fora do ar"));
      try {
        await t.http().post("/v1/auth/recuperacao").send({ email: u.email }).expect(202);
      } finally {
        t.mailer.enviar = original;
      }
    });

    it("só o link mais recente vale", async () => {
      const u = await t.criarUsuario(tenantId, { papel: "dono" });
      await t.http().post("/v1/auth/recuperacao").send({ email: u.email }).expect(202);
      const primeiro = tokenDoEmail(u.email);
      await t.http().post("/v1/auth/recuperacao").send({ email: u.email }).expect(202);
      await t
        .http()
        .post("/v1/auth/recuperacao/confirmar")
        .send({ token: primeiro, novaSenha: "Recuperada#2026" })
        .expect(400);
      await t
        .http()
        .post("/v1/auth/recuperacao/confirmar")
        .send({ token: tokenDoEmail(u.email), novaSenha: "Recuperada#2026" })
        .expect(204);
    });
  });
});
