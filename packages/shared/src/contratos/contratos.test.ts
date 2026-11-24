import { describe, expect, it } from "vitest";
import { validarSenha } from "../auth/senha";
import { clienteAtualizarSchema, clienteCriarSchema, donoCriarSchema } from "./admin";
import { loginRequestSchema, trocarSenhaRequestSchema } from "./auth";
import { empresaAtualizarSchema, empresaCriarSchema } from "./empresas";
import { usuarioAtualizarSchema, usuarioCriarSchema, usuarioFiltrosSchema } from "./usuarios";

const UUID = "0190a4b2-7c3d-7e8f-9a0b-1c2d3e4f5a6b";

const ENDERECO = {
  cep: "01310-100",
  logradouro: "Avenida Paulista",
  numero: "1000",
  complemento: "",
  bairro: "Bela Vista",
  cidade: "São Paulo",
  uf: "sp",
};
const EMPRESA = {
  cnpj: "11.222.333/0001-81",
  razaoSocial: "Mercado Silva Ltda",
  nomeFantasia: "Mercado Silva",
  endereco: ENDERECO,
};
const CLIENTE = {
  empresa: EMPRESA,
  responsavel: { nome: "Maria", celular: "(11) 98765-4321", email: "maria@silva.com.br" },
};

/** Caminho do primeiro erro, ou `null` quando os dados são aceitos. */
function caminhoDoErro(r: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) {
  return r.success ? null : r.error!.issues[0]!.path;
}

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
      ...EMPRESA,
      cnpj: "12.ABC.345/01DE-35",
      razaoSocial: " Mercado Silva Ltda ",
    });
    expect(r.cnpj).toBe("12ABC34501DE35");
    expect(r.razaoSocial).toBe("Mercado Silva Ltda");
  });
  it("normaliza o endereço (CEP sem máscara, UF maiúscula, complemento vazio vira null)", () => {
    expect(empresaCriarSchema.parse(EMPRESA).endereco).toEqual({
      cep: "01310100",
      logradouro: "Avenida Paulista",
      numero: "1000",
      complemento: null,
      bairro: "Bela Vista",
      cidade: "São Paulo",
      uf: "SP",
    });
  });
  it("aceita número S/N", () => {
    const r = empresaCriarSchema.parse({ ...EMPRESA, endereco: { ...ENDERECO, numero: "S/N" } });
    expect(r.endereco.numero).toBe("S/N");
  });
  it("exige o endereço na criação", () => {
    const { endereco: _, ...semEndereco } = EMPRESA;
    expect(caminhoDoErro(empresaCriarSchema.safeParse(semEndereco))).toEqual(["endereco"]);
  });
  it.each(["cep", "logradouro", "numero", "bairro", "cidade", "uf"] as const)(
    "exige %s no endereço",
    (campo) => {
      const r = empresaCriarSchema.safeParse({
        ...EMPRESA,
        endereco: { ...ENDERECO, [campo]: "" },
      });
      expect(caminhoDoErro(r)).toEqual(["endereco", campo]);
    },
  );
  it("na edição, o endereço é opcional mas completo quando enviado", () => {
    expect(empresaAtualizarSchema.safeParse({ ativa: false }).success).toBe(true);
    expect(
      caminhoDoErro(empresaAtualizarSchema.safeParse({ endereco: { ...ENDERECO, numero: "" } })),
    ).toEqual(["endereco", "numero"]);
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
  it("aceita cliente completo, sem nome do cliente", () => {
    const r = clienteCriarSchema.parse(CLIENTE);
    expect(r).not.toHaveProperty("nome");
    expect(r.responsavel.celular).toBe("11987654321");
  });
  it("cadastro de Dono normaliza o e-mail e exige o nome", () => {
    expect(donoCriarSchema.parse({ nome: "João", email: " Joao@Silva.com.br " }).email).toBe(
      "joao@silva.com.br",
    );
    expect(donoCriarSchema.safeParse({ nome: "", email: "joao@silva.com.br" }).success).toBe(false);
  });
  it("o cadastro de cliente ignora um Dono enviado", () => {
    expect(clienteCriarSchema.parse({ ...CLIENTE, dono: { nome: "João" } })).not.toHaveProperty(
      "dono",
    );
  });
  it("ignora um nome do cliente enviado", () => {
    expect(clienteCriarSchema.parse({ ...CLIENTE, nome: "Grupo Silva" })).not.toHaveProperty(
      "nome",
    );
  });
  it("aponta o CNPJ inválido da empresa", () => {
    const r = clienteCriarSchema.safeParse({
      ...CLIENTE,
      empresa: { ...EMPRESA, cnpj: "11.222.333/0001-82" },
    });
    expect(caminhoDoErro(r)).toEqual(["empresa", "cnpj"]);
  });
  it.each(["nome", "celular", "email"] as const)("exige %s do responsável", (campo) => {
    const r = clienteCriarSchema.safeParse({
      ...CLIENTE,
      responsavel: { ...CLIENTE.responsavel, [campo]: "" },
    });
    expect(caminhoDoErro(r)).toEqual(["responsavel", campo]);
  });
  it("recusa telefone fixo como celular do responsável", () => {
    const r = clienteCriarSchema.safeParse({
      ...CLIENTE,
      responsavel: { ...CLIENTE.responsavel, celular: "(11) 3456-7890" },
    });
    expect(caminhoDoErro(r)).toEqual(["responsavel", "celular"]);
  });
  it("permite alterar só o responsável", () => {
    const r = clienteAtualizarSchema.parse({
      responsavel: { ...CLIENTE.responsavel, celular: "(21) 99876-5432" },
    });
    expect(r.responsavel?.celular).toBe("21998765432");
  });
});
