import { describe, expect, it } from "vitest";
import { celularSchema, celularValido, formatarCelular, normalizarCelular } from "./celular";

describe("Celular", () => {
  it.each([
    ["(11) 98765-4321", true],
    ["11987654321", true],
    ["11 9 8765 4321", true],
    ["+55 11 98765-4321", true],
    ["(21) 99876-5432", true],
    ["(11) 3456-7890", false], // fixo, sem o 9
    ["(11) 88765-4321", false], // não começa por 9
    ["(23) 98765-4321", false], // DDD inexistente
    ["(01) 98765-4321", false], // DDD inválido
    ["1198765432", false], // dígito a menos
    ["119876543210", false], // dígito a mais
    ["", false],
  ])("celularValido(%s) = %s", (valor, esperado) => {
    expect(celularValido(valor)).toBe(esperado);
  });

  it("normaliza removendo máscara e o +55", () => {
    expect(normalizarCelular("+55 (11) 98765-4321")).toBe("11987654321");
  });

  it("schema devolve só os dígitos", () => {
    expect(celularSchema.parse("(11) 98765-4321")).toBe("11987654321");
  });

  it("schema informa celular inválido", () => {
    const r = celularSchema.safeParse("(11) 3456-7890");
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toMatch(/^Celular inválido/);
  });

  it("formata com máscara", () => {
    expect(formatarCelular("11987654321")).toBe("(11) 98765-4321");
    expect(formatarCelular("123")).toBe("123");
  });
});
