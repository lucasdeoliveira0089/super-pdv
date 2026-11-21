import { describe, expect, it } from "vitest";
import {
  PERMISSOES,
  podeGerenciarUsuario,
  papeisAtribuiveis,
  papelExigeEmpresas,
  temPermissao,
  type Papel,
  type Permissao,
} from "./permissoes";

// Matriz da spec access-control: ✓ = permitido.
const MATRIZ: Record<Permissao, Record<Papel, boolean>> = {
  "gestor.acessar": { dono: true, administrador: true, gerente: true, operador: false },
  "pdv.operar": { dono: true, administrador: true, gerente: true, operador: true },
  "empresa.ler": { dono: true, administrador: true, gerente: true, operador: false },
  "usuario.ler": { dono: true, administrador: true, gerente: true, operador: false },
  "usuario.gerenciar": { dono: true, administrador: true, gerente: false, operador: false },
  "usuario.gerenciar_operadores": {
    dono: true,
    administrador: true,
    gerente: true,
    operador: false,
  },
};

describe("matriz de permissões", () => {
  it("cobre todas as permissões", () => {
    expect(Object.keys(MATRIZ).sort()).toEqual([...PERMISSOES].sort());
  });

  for (const [permissao, porPapel] of Object.entries(MATRIZ)) {
    for (const [papel, esperado] of Object.entries(porPapel)) {
      it(`${papel} ${esperado ? "pode" : "não pode"} ${permissao}`, () => {
        expect(temPermissao(papel as Papel, permissao as Permissao)).toBe(esperado);
      });
    }
  }
});

describe("regras de papel", () => {
  it("Gerente e Operador exigem empresas; Dono e Administrador não", () => {
    expect(papelExigeEmpresas("gerente")).toBe(true);
    expect(papelExigeEmpresas("operador")).toBe(true);
    expect(papelExigeEmpresas("dono")).toBe(false);
    expect(papelExigeEmpresas("administrador")).toBe(false);
  });

  it("papéis atribuíveis", () => {
    expect(papeisAtribuiveis("dono")).toEqual(["dono", "administrador", "gerente", "operador"]);
    expect(papeisAtribuiveis("administrador")).toEqual(["administrador", "gerente", "operador"]);
    expect(papeisAtribuiveis("gerente")).toEqual(["operador"]);
    expect(papeisAtribuiveis("operador")).toEqual([]);
  });
});

describe("podeGerenciarUsuario", () => {
  const centro = ["c"];
  it.each([
    ["dono", "dono", centro, true],
    ["administrador", "dono", [], false],
    ["administrador", "gerente", centro, true],
    ["gerente", "operador", centro, true],
    ["gerente", "operador", ["n"], false],
    ["gerente", "gerente", centro, false],
    ["operador", "operador", centro, false],
  ] as const)("%s → %s %j = %s", (ator, alvo, empresas, esperado) => {
    expect(
      podeGerenciarUsuario(
        { papel: ator, empresaIds: centro },
        { papel: alvo, empresaIds: [...empresas] },
      ),
    ).toBe(esperado);
  });
});
