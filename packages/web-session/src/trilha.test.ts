import { describe, expect, it } from "vitest";
import { etapasDoCaminho } from "./trilha";

const ID = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b";
const ID2 = "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5c";
const itens = [
  { href: "/usuarios", rotulo: "Usuários" },
  { href: "/clientes", rotulo: "Clientes" },
];

describe("trilha de navegação", () => {
  it("lista: uma etapa, sem link", () => {
    expect(etapasDoCaminho("/usuarios", itens)).toEqual([{ rotulo: "Usuários" }]);
  });

  it("novo", () => {
    expect(etapasDoCaminho("/usuarios/novo", itens)).toEqual([
      { rotulo: "Usuários", href: "/usuarios" },
      { rotulo: "Novo" },
    ]);
  });

  it("detalhe e edição", () => {
    expect(etapasDoCaminho(`/usuarios/${ID}`, itens)).toEqual([
      { rotulo: "Usuários", href: "/usuarios" },
      { rotulo: "Detalhes" },
    ]);
    expect(etapasDoCaminho(`/usuarios/${ID}/editar`, itens)).toEqual([
      { rotulo: "Usuários", href: "/usuarios" },
      { rotulo: "Detalhes", href: `/usuarios/${ID}` },
      { rotulo: "Editar" },
    ]);
  });

  it("novo Dono do cliente", () => {
    expect(etapasDoCaminho(`/clientes/${ID}/donos/novo`, itens)).toEqual([
      { rotulo: "Clientes", href: "/clientes" },
      { rotulo: "Detalhes", href: `/clientes/${ID}` },
      { rotulo: "Novo Dono" },
    ]);
  });

  it("responsável do cliente", () => {
    expect(etapasDoCaminho(`/clientes/${ID}/responsavel`, itens)).toEqual([
      { rotulo: "Clientes", href: "/clientes" },
      { rotulo: "Detalhes", href: `/clientes/${ID}` },
      { rotulo: "Responsável" },
    ]);
  });

  it("empresas do cliente: o segmento intermediário não vira etapa", () => {
    expect(etapasDoCaminho(`/clientes/${ID}/empresas/nova`, itens)).toEqual([
      { rotulo: "Clientes", href: "/clientes" },
      { rotulo: "Detalhes", href: `/clientes/${ID}` },
      { rotulo: "Nova empresa" },
    ]);
    expect(etapasDoCaminho(`/clientes/${ID}/empresas/${ID2}`, itens)).toEqual([
      { rotulo: "Clientes", href: "/clientes" },
      { rotulo: "Detalhes", href: `/clientes/${ID}` },
      { rotulo: "Empresa" },
    ]);
  });

  it("páginas fora do menu e parâmetros de busca", () => {
    expect(etapasDoCaminho("/acesso-negado", itens)).toEqual([{ rotulo: "Acesso negado" }]);
    expect(etapasDoCaminho("/usuarios?papel=gerente", itens)).toEqual([{ rotulo: "Usuários" }]);
    expect(etapasDoCaminho("/", itens)).toEqual([]);
  });
});
