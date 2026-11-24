import { describe, expect, it } from "vitest";
import { cepSchema, cepValido, formatarCep, ufSchema } from "./endereco";

describe("CEP", () => {
  it.each([
    ["01310-100", true],
    ["01310100", true],
    [" 01310-100 ", true],
    ["1234", false],
    ["013101000", false],
    ["01310-10A", false],
    ["0131-0100", false],
    ["", false],
  ])("cepValido(%s) = %s", (valor, esperado) => {
    expect(cepValido(valor)).toBe(esperado);
  });

  it("schema devolve só os dígitos", () => {
    expect(cepSchema.parse("01310-100")).toBe("01310100");
  });

  it("schema recusa CEP curto informando que é inválido", () => {
    const r = cepSchema.safeParse("1234");
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("CEP inválido");
  });

  it("formata com máscara", () => {
    expect(formatarCep("01310100")).toBe("01310-100");
    expect(formatarCep("123")).toBe("123");
  });
});

describe("UF", () => {
  it("aceita minúsculas e devolve em maiúsculas", () => {
    expect(ufSchema.parse(" sp ")).toBe("SP");
  });

  it("aceita o Distrito Federal", () => {
    expect(ufSchema.parse("DF")).toBe("DF");
  });

  it.each(["XX", "S", "SPP", ""])("recusa %s", (uf) => {
    expect(ufSchema.safeParse(uf).success).toBe(false);
  });

  it("informa UF inválida", () => {
    expect(ufSchema.safeParse("XX").error?.issues[0]?.message).toBe("UF inválida");
  });
});
