import { describe, expect, it } from "vitest";
import { validarSenha } from "../auth/senha";
import { clienteCriarSchema } from "./admin";
import { loginRequestSchema, trocarSenhaRequestSchema } from "./auth";
import { empresaAtualizarSchema, empresaCriarSchema } from "./empresas";
import { usuarioAtualizarSchema, usuarioCriarSchema, usuarioFiltrosSchema } from "./usuarios";

const UUID = "0190a4b2-7c3d-7e8f-9a0b-1c2d3e4f5a6b";

describe("política de senha", () => {
  it("recusa senha curta", () => {
    expect(validarSenha("abc123", "ana@loja.com")).toMatch(/ao menos 8/);
  });
  it("recusa senha igual ao e-mail", () => {
    expect(validarSenha("Ana@Loja.com", "ana@loja.com")).toMatch(/igual ao e-mail/);
  });
  it("aceita senha válida", () => {
    expect(validarSenha("Segredo#2026", "ana@loja.com")).toBeNull();
  });
  it("troca de senha aplica o tamanho mínimo", () => {
    expect(
      trocarSenhaRequestSchema.safeParse({ senhaAtual: "x", novaSenha: "curta" }).success,
    ).toBe(false);
  });
});

describe("login", () => {
  it("normaliza o e-mail", () => {
    expect(loginRequestSchema.parse({ email: " Ana@Loja.COM ", senha: "x" }).email).toBe(
      "ana@loja.com",
    );
  });
  it("recusa e-mail inválido", () => {
    expect(loginRequestSchema.safeParse({ email: "ana", senha: "x" }).success).toBe(false);
  });
});

describe("empresas", () => {
  it("normaliza o CNPJ na criação", () => {
    const r = empresaCriarSchema.parse({
      cnpj: "12.ABC.345/01DE-35",
      razaoSocial: " Mercado Silva Ltda ",
      nomeFantasia: "Mercado Silva",
    });
    expect(r).toEqual({
      cnpj: "12ABC34501DE35",
      razaoSocial: "Mercado Silva Ltda",
      nomeFantasia: "Mercado Silva",
    });
  });
  it("não permite alterar o CNPJ", () => {
    expect(empresaAtualizarSchema.safeParse({ cnpj: "11222333000181" }).success).toBe(false);
  });
});

describe("usuários", () => {
  it("Gerente exige empresas", () => {
    const r = usuarioCriarSchema.safeParse({ nome: "Ana", email: "ana@x.com", papel: "gerente" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(["empresaIds"]);
  });
  it("Administrador não exige empresas", () => {
    const r = usuarioCriarSchema.parse({ nome: "Ana", email: "ana@x.com", papel: "administrador" });
    expect(r.empresaIds).toEqual([]);
  });
  it("e-mail não pode ser alterado", () => {
    expect(usuarioAtualizarSchema.safeParse({ email: "novo@x.com" }).success).toBe(false);
  });
  it("filtros convertem booleano da query", () => {
    expect(usuarioFiltrosSchema.parse({ ativo: "false", empresaId: UUID })).toEqual({
      ativo: false,
      empresaId: UUID,
    });
  });
});

describe("clientes", () => {
  it("valida cliente com empresa e Dono", () => {
    const r = clienteCriarSchema.safeParse({
      nome: "Grupo Silva",
      empresa: { cnpj: "11.222.333/0001-82", razaoSocial: "X", nomeFantasia: "Y" },
      dono: { nome: "João", email: "joao@silva.com.br" },
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(["empresa", "cnpj"]);
  });
});
