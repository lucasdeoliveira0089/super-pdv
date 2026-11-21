import { count, eq, schema } from "@super-pdv/db";
import { clienteCriadoResponseSchema, clienteSchema, empresaSchema } from "@super-pdv/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type AppDeTeste, bearer, criarAppDeTeste, gerarCnpj } from "./app-de-teste";

const mascara = (c: string) =>
  `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;

describe("admin: clientes e empresas (integração)", () => {
  let t: AppDeTeste;
  let equipe: { accessToken: string };

  const novoCliente = (sobrescrever: Record<string, unknown> = {}) => ({
    nome: "Grupo Silva",
    empresa: {
      cnpj: mascara(gerarCnpj()),
      razaoSocial: "Mercado Silva Ltda",
      nomeFantasia: "Mercado Silva",
    },
    dono: {
      nome: "João Silva",
      email: `joao${Math.random().toString(36).slice(2, 8)}@silva.com.br`,
    },
    ...sobrescrever,
  });

  const totalClientes = async () =>
    (await t.system.db.select({ n: count() }).from(schema.clientes))[0]!.n;

  beforeAll(async () => {
    t = await criarAppDeTeste();
    const m = await t.criarMembro();
    equipe = await t.entrar(m.email, m.senha, "equipe");
  }, 180_000);

  afterAll(async () => {
    await t?.fechar();
  });

  describe("cadastro de cliente", () => {
    it("cria cliente, 1ª empresa e Dono com senha temporária exibida uma vez", async () => {
      const dados = novoCliente();
      const res = await t
        .http()
        .post("/v1/admin/clientes")
        .set(bearer(equipe))
        .send(dados)
        .expect(201);
      const { cliente, senhaTemporaria } = clienteCriadoResponseSchema.parse(res.body);
      expect(cliente).toMatchObject({ nome: "Grupo Silva", ativo: true });
      expect(cliente.empresas).toHaveLength(1);
      expect(cliente.empresas[0]).toMatchObject({
        nomeFantasia: "Mercado Silva",
        ativa: true,
        cnpj: dados.empresa.cnpj.replace(/\D/g, ""),
      });
      expect(cliente.donos).toEqual([
        expect.objectContaining({ email: dados.dono.email, ativo: true }),
      ]);

      // O Dono entra com a senha temporária e precisa trocá-la.
      const tokens = await t.entrar(dados.dono.email, senhaTemporaria);
      const me = (await t.http().get("/v1/me").set(bearer(tokens)).expect(200)).body;
      expect(me).toMatchObject({ papel: "dono", senhaTemporaria: true });
    });

    it("CNPJ inválido: nada é criado e o erro aponta o campo", async () => {
      const antes = await totalClientes();
      const res = await t
        .http()
        .post("/v1/admin/clientes")
        .set(bearer(equipe))
        .send(
          novoCliente({
            empresa: { cnpj: "11.222.333/0001-82", razaoSocial: "X", nomeFantasia: "Y" },
          }),
        )
        .expect(400);
      expect(res.body.fieldErrors["empresa.cnpj"]).toEqual(["CNPJ inválido"]);
      expect(await totalClientes()).toBe(antes);
    });

    it("CNPJ já cadastrado: 409 e nada é criado (transação desfeita)", async () => {
      const primeiro = novoCliente();
      await t.http().post("/v1/admin/clientes").set(bearer(equipe)).send(primeiro).expect(201);
      const antes = await totalClientes();
      const res = await t
        .http()
        .post("/v1/admin/clientes")
        .set(bearer(equipe))
        .send(novoCliente({ empresa: primeiro.empresa }))
        .expect(409);
      expect(res.body.fieldErrors["empresa.cnpj"]).toEqual(["CNPJ já cadastrado"]);
      expect(await totalClientes()).toBe(antes);
    });

    it("e-mail do Dono já usado em outro cliente: 409 e nada é criado", async () => {
      const outro = await t.criarCliente();
      const existente = await t.criarUsuario(outro, {
        papel: "operador",
        empresaIds: [await t.criarEmpresa(outro)],
      });
      const antes = await totalClientes();
      const res = await t
        .http()
        .post("/v1/admin/clientes")
        .set(bearer(equipe))
        .send(novoCliente({ dono: { nome: "Fulano", email: existente.email } }))
        .expect(409);
      expect(res.body.fieldErrors["dono.email"]).toEqual(["E-mail já está em uso"]);
      expect(await totalClientes()).toBe(antes);
    });

    it("usuário de cliente não acessa o cadastro de clientes (401)", async () => {
      const c = await t.criarCliente();
      const dono = await t.criarUsuario(c, { papel: "dono" });
      await t
        .http()
        .post("/v1/admin/clientes")
        .set(bearer(await t.entrar(dono.email)))
        .send(novoCliente())
        .expect(401);
      await t.http().post("/v1/admin/clientes").send(novoCliente()).expect(401);
    });
  });

  describe("consulta, suspensão e suporte", () => {
    let clienteId: string;
    let cnpj: string;
    let donoEmail: string;
    let donoSenha: string;

    beforeAll(async () => {
      const dados = novoCliente({ nome: "Supermercado Beta" });
      cnpj = dados.empresa.cnpj;
      donoEmail = dados.dono.email;
      const r = clienteCriadoResponseSchema.parse(
        (await t.http().post("/v1/admin/clientes").set(bearer(equipe)).send(dados).expect(201))
          .body,
      );
      clienteId = r.cliente.id;
      const tokens = await t.entrar(donoEmail, r.senhaTemporaria);
      donoSenha = "Dono#Senha2026";
      await t
        .http()
        .post("/v1/auth/senha")
        .set(bearer(tokens))
        .send({ senhaAtual: r.senhaTemporaria, novaSenha: donoSenha })
        .expect(204);
    });

    it("busca por CNPJ (com ou sem máscara) e por nome", async () => {
      for (const busca of [cnpj, cnpj.replace(/\D/g, ""), "beta"]) {
        const lista = (
          await t.http().get("/v1/admin/clientes").query({ busca }).set(bearer(equipe)).expect(200)
        ).body;
        expect(lista.map((c: { id: string }) => c.id)).toContain(clienteId);
      }
      const nada = (
        await t
          .http()
          .get("/v1/admin/clientes")
          .query({ busca: "zzz-inexistente" })
          .set(bearer(equipe))
          .expect(200)
      ).body;
      expect(nada).toEqual([]);
    });

    it("detalhe do cliente traz empresas e Donos", async () => {
      const c = clienteSchema.parse(
        (await t.http().get(`/v1/admin/clientes/${clienteId}`).set(bearer(equipe)).expect(200))
          .body,
      );
      expect(c.donos[0]!.email).toBe(donoEmail);
    });

    it("suspender derruba login e tokens já emitidos; reativar libera", async () => {
      const sessao = await t.entrar(donoEmail, donoSenha);
      await t
        .http()
        .patch(`/v1/admin/clientes/${clienteId}`)
        .set(bearer(equipe))
        .send({ ativo: false })
        .expect(200);

      await t.http().get("/v1/me").set(bearer(sessao)).expect(401);
      const r = await t
        .http()
        .post("/v1/auth/login")
        .send({ email: donoEmail, senha: donoSenha })
        .expect(401);
      expect(r.body.message).toBe("E-mail ou senha inválidos");

      await t
        .http()
        .patch(`/v1/admin/clientes/${clienteId}`)
        .set(bearer(equipe))
        .send({ ativo: true })
        .expect(200);
      await t.entrar(donoEmail, donoSenha);
    });

    it("redefinir senha do Dono: nova senha temporária e sessões encerradas", async () => {
      const sessao = await t.entrar(donoEmail, donoSenha);
      const [dono] = await t.system.db
        .select()
        .from(schema.usuarios)
        .where(eq(schema.usuarios.email, donoEmail));
      const r = await t
        .http()
        .post(`/v1/admin/usuarios/${dono!.id}/redefinir-senha`)
        .set(bearer(equipe))
        .expect(200);
      await t.http().get("/v1/me").set(bearer(sessao)).expect(401);
      const nova = await t.entrar(donoEmail, r.body.senhaTemporaria);
      expect(
        (await t.http().get("/v1/me").set(bearer(nova)).expect(200)).body.senhaTemporaria,
      ).toBe(true);
    });

    it("pelo admin só se redefine senha de Dono", async () => {
      const operador = await t.criarUsuario(clienteId, {
        papel: "operador",
        empresaIds: [await t.criarEmpresa(clienteId)],
      });
      await t
        .http()
        .post(`/v1/admin/usuarios/${operador.id}/redefinir-senha`)
        .set(bearer(equipe))
        .expect(422);
    });
  });

  describe("empresas", () => {
    let clienteId: string;

    beforeAll(async () => {
      const r = (
        await t
          .http()
          .post("/v1/admin/clientes")
          .set(bearer(equipe))
          .send(novoCliente())
          .expect(201)
      ).body;
      clienteId = r.cliente.id;
    });

    it("adiciona empresa com CNPJ alfanumérico", async () => {
      const res = await t
        .http()
        .post(`/v1/admin/clientes/${clienteId}/empresas`)
        .set(bearer(equipe))
        .send({
          cnpj: "12.ABC.345/01DE-35",
          razaoSocial: "Filial Ltda",
          nomeFantasia: "Mercado Silva Filial",
        })
        .expect(201);
      expect(empresaSchema.parse(res.body)).toMatchObject({
        cnpj: "12ABC34501DE35",
        ativa: true,
        clienteId,
      });
    });

    it("CNPJ de empresa de outro cliente → 409", async () => {
      const outro = await t.criarCliente();
      const cnpj = gerarCnpj();
      await t.criarEmpresa(outro, { cnpj });
      const r = await t
        .http()
        .post(`/v1/admin/clientes/${clienteId}/empresas`)
        .set(bearer(equipe))
        .send({ cnpj, razaoSocial: "X", nomeFantasia: "Y" })
        .expect(409);
      expect(r.body.fieldErrors.cnpj).toEqual(["CNPJ já cadastrado"]);
    });

    it("CNPJ não pode ser alterado; nomes e situação sim", async () => {
      const cnpj = gerarCnpj();
      const empresa = (
        await t
          .http()
          .post(`/v1/admin/clientes/${clienteId}/empresas`)
          .set(bearer(equipe))
          .send({ cnpj, razaoSocial: "Antiga", nomeFantasia: "Antiga" })
          .expect(201)
      ).body;
      await t
        .http()
        .patch(`/v1/admin/empresas/${empresa.id}`)
        .set(bearer(equipe))
        .send({ cnpj: gerarCnpj() })
        .expect(400);
      const atualizada = (
        await t
          .http()
          .patch(`/v1/admin/empresas/${empresa.id}`)
          .set(bearer(equipe))
          .send({ razaoSocial: "Nova Razão", nomeFantasia: "Nova", ativa: false })
          .expect(200)
      ).body;
      expect(atualizada).toMatchObject({
        cnpj,
        razaoSocial: "Nova Razão",
        nomeFantasia: "Nova",
        ativa: false,
      });
    });

    it("cliente inexistente → 404", async () => {
      await t
        .http()
        .post(`/v1/admin/clientes/0190a4b2-7c3d-7e8f-9a0b-1c2d3e4f5a6b/empresas`)
        .set(bearer(equipe))
        .send({ cnpj: gerarCnpj(), razaoSocial: "X", nomeFantasia: "Y" })
        .expect(404);
    });
  });
});
