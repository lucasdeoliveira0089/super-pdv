import { eq, schema } from "@super-pdv/db";
import { type Papel, usuarioCriadoResponseSchema, usuarioSchema } from "@super-pdv/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type AppDeTeste, bearer, criarAppDeTeste } from "./app-de-teste";

type Tokens = { accessToken: string; refreshToken: string };

describe("gestor: empresas, usuários e autorização (integração)", () => {
  let t: AppDeTeste;
  let clienteA: string;
  let clienteB: string;
  let centro: string;
  let norte: string;
  let empresaB: string;
  const tk: Record<string, Tokens> = {};
  const ids: Record<string, string> = {};

  const novoEmail = () => `u${Math.random().toString(36).slice(2, 10)}@silva.com.br`;

  async function usuario(nome: string, tenant: string, papel: Papel, empresaIds: string[] = []) {
    const u = await t.criarUsuario(tenant, { papel, nome, empresaIds });
    ids[nome] = u.id;
    tk[nome] = await t.entrar(u.email);
    return u;
  }

  beforeAll(async () => {
    t = await criarAppDeTeste();
    clienteA = await t.criarCliente({ nome: "Grupo Silva" });
    centro = await t.criarEmpresa(clienteA, { nomeFantasia: "Mercado Silva Centro" });
    norte = await t.criarEmpresa(clienteA, { nomeFantasia: "Mercado Silva Norte" });
    clienteB = await t.criarCliente({ nome: "Outro Grupo" });
    empresaB = await t.criarEmpresa(clienteB, { nomeFantasia: "Outra Empresa" });

    await usuario("dono", clienteA, "dono");
    await usuario("admin", clienteA, "administrador");
    await usuario("gerenteCentro", clienteA, "gerente", [centro]);
    await usuario("gerenteNorte", clienteA, "gerente", [norte]);
    await usuario("operadorCentro", clienteA, "operador", [centro]);
    await usuario("operadorNorte", clienteA, "operador", [norte]);
    await usuario("donoB", clienteB, "dono");
  }, 180_000);

  afterAll(async () => {
    await t?.fechar();
  });

  const get = (rota: string, quem: string) => t.http().get(rota).set(bearer(tk[quem]!));
  const post = (rota: string, quem: string, corpo: object = {}) =>
    t.http().post(rota).set(bearer(tk[quem]!)).send(corpo);
  const patch = (rota: string, quem: string, corpo: object) =>
    t.http().patch(rota).set(bearer(tk[quem]!)).send(corpo);

  describe("matriz papel × rota (access-control)", () => {
    const casos: [string, number, number, number, number][] = [
      // quem, GET empresas, GET usuarios, POST usuarios (operador no Centro), POST empresas
      ["dono", 200, 200, 201, 403],
      ["admin", 200, 200, 201, 403],
      ["gerenteCentro", 200, 200, 201, 403],
      ["operadorCentro", 403, 403, 403, 403],
    ];
    it.each(casos)("%s", async (quem, getEmpresas, getUsuarios, postUsuario, postEmpresa) => {
      expect((await get("/v1/empresas", quem)).status).toBe(getEmpresas);
      expect((await get("/v1/usuarios", quem)).status).toBe(getUsuarios);
      const corpo = {
        nome: "Novo Operador",
        email: novoEmail(),
        papel: "operador",
        empresaIds: [centro],
      };
      expect((await post("/v1/usuarios", quem, corpo)).status).toBe(postUsuario);
      expect((await post("/v1/empresas", quem, {})).status).toBe(postEmpresa);
    });
  });

  describe("escopo por empresa", () => {
    it("Gerente vê só as suas empresas", async () => {
      const lista = (await get("/v1/empresas", "gerenteCentro").expect(200)).body;
      expect(lista.map((e: { id: string }) => e.id)).toEqual([centro]);
      await get(`/v1/empresas/${norte}`, "gerenteCentro").expect(404);
      const todas = (await get("/v1/empresas", "dono").expect(200)).body;
      expect(todas.map((e: { id: string }) => e.id).sort()).toEqual([centro, norte].sort());
    });

    it("Listagem de usuários do Gerente não inclui quem atua só em outra empresa", async () => {
      const lista = (await get("/v1/usuarios", "gerenteCentro").expect(200)).body as {
        id: string;
      }[];
      const vistos = lista.map((u) => u.id);
      expect(vistos).toEqual(
        expect.arrayContaining([ids.dono, ids.admin, ids.gerenteCentro, ids.operadorCentro]),
      );
      expect(vistos).not.toContain(ids.gerenteNorte);
      expect(vistos).not.toContain(ids.operadorNorte);
      await get(`/v1/usuarios/${ids.operadorNorte}`, "gerenteCentro").expect(404);
    });

    it("Gerente não cadastra Operador em empresa não atribuída", async () => {
      await post("/v1/usuarios", "gerenteCentro", {
        nome: "X",
        email: novoEmail(),
        papel: "operador",
        empresaIds: [norte],
      }).expect(403);
    });
  });

  describe("empresas no gestor (somente leitura)", () => {
    it("Dono não cria nem altera empresas pela API", async () => {
      const r = await post("/v1/empresas", "dono", {
        cnpj: "11222333000181",
        razaoSocial: "X",
        nomeFantasia: "Y",
      }).expect(403);
      expect(r.body.message).toMatch(/equipe Super PDV/);
      await patch(`/v1/empresas/${centro}`, "dono", { nomeFantasia: "Hack" }).expect(403);
    });
  });

  describe("cadastro e manutenção de usuários", () => {
    it("Administrador cadastra Gerente com senha temporária; no 1º login é preciso trocar", async () => {
      const email = novoEmail();
      const r = await post("/v1/usuarios", "admin", {
        nome: "Ana",
        email,
        papel: "gerente",
        empresaIds: [centro],
      }).expect(201);
      const { usuario: u, senhaTemporaria } = usuarioCriadoResponseSchema.parse(r.body);
      expect(u).toMatchObject({
        nome: "Ana",
        email,
        papel: "gerente",
        ativo: true,
        senhaTemporaria: true,
        empresaIds: [centro],
      });
      expect(JSON.stringify(r.body)).not.toMatch(/argon2|senhaHash/);
      const s = await t.entrar(email, senhaTemporaria);
      expect((await t.http().get("/v1/usuarios").set(bearer(s))).body.code).toBe(
        "PASSWORD_CHANGE_REQUIRED",
      );
    });

    it("e-mail de usuário de outro cliente → 409", async () => {
      const outro = await t.criarUsuario(clienteB, { papel: "operador", empresaIds: [empresaB] });
      const r = await post("/v1/usuarios", "dono", {
        nome: "X",
        email: outro.email,
        papel: "administrador",
      }).expect(409);
      expect(r.body.fieldErrors.email).toEqual(["E-mail já está em uso"]);
    });

    it("Gerente sem empresa é recusado", async () => {
      const r = await post("/v1/usuarios", "dono", {
        nome: "X",
        email: novoEmail(),
        papel: "gerente",
        empresaIds: [],
      }).expect(400);
      expect(r.body.fieldErrors.empresaIds).toEqual(["Selecione ao menos uma empresa"]);
    });

    it("empresa inativa ou de outro cliente não pode ser atribuída", async () => {
      const inativa = await t.criarEmpresa(clienteA, { ativa: false });
      for (const empresa of [inativa, empresaB]) {
        await post("/v1/usuarios", "dono", {
          nome: "X",
          email: novoEmail(),
          papel: "operador",
          empresaIds: [empresa],
        }).expect(422);
      }
    });

    it("trocar as empresas de um Operador vale na próxima requisição", async () => {
      const op = await t.criarUsuario(clienteA, { papel: "operador", empresaIds: [centro] });
      const s = await t.entrar(op.email);
      const r = await patch(`/v1/usuarios/${op.id}`, "dono", { empresaIds: [norte] }).expect(200);
      expect(usuarioSchema.parse(r.body).empresaIds).toEqual([norte]);
      const me = (await t.http().get("/v1/me").set(bearer(s)).expect(200)).body;
      expect(me.empresas.map((e: { id: string }) => e.id)).toEqual([norte]);
    });

    it("desativar encerra as sessões; reativar permite entrar", async () => {
      const op = await t.criarUsuario(clienteA, { papel: "operador", empresaIds: [centro] });
      const s = await t.entrar(op.email);
      await patch(`/v1/usuarios/${op.id}`, "admin", { ativo: false }).expect(200);
      await t.http().post("/v1/auth/refresh").send({ refreshToken: s.refreshToken }).expect(401);
      await t.http().get("/v1/me").set(bearer(s)).expect(401);
      await t.http().post("/v1/auth/login").send({ email: op.email, senha: op.senha }).expect(401);
      await patch(`/v1/usuarios/${op.id}`, "admin", { ativo: true }).expect(200);
      await t.entrar(op.email, op.senha);
    });

    it("Gerente redefine a senha de um Operador da sua empresa", async () => {
      const op = await t.criarUsuario(clienteA, { papel: "operador", empresaIds: [centro] });
      const s = await t.entrar(op.email);
      const r = await post(`/v1/usuarios/${op.id}/redefinir-senha`, "gerenteCentro").expect(200);
      await t.http().get("/v1/me").set(bearer(s)).expect(401);
      const nova = await t.entrar(op.email, r.body.senhaTemporaria);
      expect((await t.http().get("/v1/me").set(bearer(nova))).body.senhaTemporaria).toBe(true);
      await post(`/v1/usuarios/${ids.operadorNorte}/redefinir-senha`, "gerenteCentro").expect(404);
    });

    it("filtros por empresa, papel e situação", async () => {
      const porEmpresa = (await get(`/v1/usuarios?empresaId=${norte}`, "dono").expect(200))
        .body as { id: string; papel: string }[];
      expect(porEmpresa.map((u) => u.id)).toEqual(
        expect.arrayContaining([ids.dono, ids.admin, ids.gerenteNorte, ids.operadorNorte]),
      );
      expect(porEmpresa.map((u) => u.id)).not.toContain(ids.gerenteCentro);
      const gerentes = (await get("/v1/usuarios?papel=gerente", "dono").expect(200)).body as {
        papel: string;
      }[];
      expect(new Set(gerentes.map((u) => u.papel))).toEqual(new Set(["gerente"]));
      const inativos = (await get("/v1/usuarios?ativo=false", "dono").expect(200)).body as {
        ativo: boolean;
      }[];
      expect(inativos.every((u) => !u.ativo)).toBe(true);
    });
  });

  describe("regras dos papéis", () => {
    it("Administrador não altera nem cria Dono", async () => {
      await patch(`/v1/usuarios/${ids.dono}`, "admin", { ativo: false }).expect(403);
      await post(`/v1/usuarios/${ids.dono}/redefinir-senha`, "admin").expect(403);
      await post("/v1/usuarios", "admin", { nome: "X", email: novoEmail(), papel: "dono" }).expect(
        403,
      );
    });

    it("Gerente não cadastra Administrador nem altera outro Gerente", async () => {
      await post("/v1/usuarios", "gerenteCentro", {
        nome: "X",
        email: novoEmail(),
        papel: "administrador",
      }).expect(403);
      await patch(`/v1/usuarios/${ids.gerenteCentro}`, "gerenteCentro", {
        nome: "Eu mesmo",
      }).expect(403);
    });

    it("ninguém desativa a si mesmo", async () => {
      const r = await patch(`/v1/usuarios/${ids.admin}`, "admin", { ativo: false }).expect(422);
      expect(r.body.message).toBe("Você não pode desativar a si mesmo");
    });

    it("o único Dono ativo não pode deixar de ser Dono", async () => {
      const r = await patch(`/v1/usuarios/${ids.dono}`, "dono", { papel: "administrador" }).expect(
        422,
      );
      expect(r.body.message).toBe("O cliente precisa de ao menos um Dono ativo");
    });

    it("com dois Donos, um pode desativar o outro", async () => {
      const segundo = await t.criarUsuario(clienteA, { papel: "dono" });
      await patch(`/v1/usuarios/${segundo.id}`, "dono", { ativo: false }).expect(200);
    });

    it("papel rebaixado vale na próxima requisição", async () => {
      const a = await t.criarUsuario(clienteA, { papel: "administrador" });
      const s = await t.entrar(a.email);
      await t
        .http()
        .post("/v1/usuarios")
        .set(bearer(s))
        .send({ nome: "X", email: novoEmail(), papel: "administrador" })
        .expect(201);
      await patch(`/v1/usuarios/${a.id}`, "dono", {
        papel: "gerente",
        empresaIds: [centro],
      }).expect(200);
      await t
        .http()
        .post("/v1/usuarios")
        .set(bearer(s))
        .send({ nome: "Y", email: novoEmail(), papel: "administrador" })
        .expect(403);
    });
  });

  describe("isolamento HTTP entre clientes", () => {
    it("cada Dono vê só as empresas do próprio cliente", async () => {
      const a = (await get("/v1/empresas", "dono").expect(200)).body.map(
        (e: { id: string }) => e.id,
      );
      const b = (await get("/v1/empresas", "donoB").expect(200)).body.map(
        (e: { id: string }) => e.id,
      );
      expect(a).not.toContain(empresaB);
      expect(b).toEqual([empresaB]);
    });

    it("registro de outro cliente responde 404 e não é alterado", async () => {
      await get(`/v1/usuarios/${ids.operadorCentro}`, "donoB").expect(404);
      await get(`/v1/empresas/${centro}`, "donoB").expect(404);
      await patch(`/v1/usuarios/${ids.operadorCentro}`, "donoB", { ativo: false }).expect(404);
      const [u] = await t.system.db
        .select()
        .from(schema.usuarios)
        .where(eq(schema.usuarios.id, ids.operadorCentro!));
      expect(u!.ativo).toBe(true);
    });

    it("cliente informado no corpo é ignorado", async () => {
      const email = novoEmail();
      await post("/v1/usuarios", "donoB", {
        nome: "X",
        email,
        papel: "administrador",
        tenantId: clienteA,
        clienteId: clienteA,
      }).expect(201);
      const [u] = await t.system.db
        .select()
        .from(schema.usuarios)
        .where(eq(schema.usuarios.email, email));
      expect(u!.tenantId).toBe(clienteB);
    });
  });
});
