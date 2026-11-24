import { describe, expect, it } from "vitest";
import { cnpjSchema, cnpjValido, formatarCnpj, mascararCnpj, normalizarCnpj } from "./cnpj";

describe("CNPJ", () => {
  it.each([
    ["11.222.333/0001-81", true],
    ["11222333000181", true],
    ["12.ABC.345/01DE-35", true],
    ["12abc34501de35", true],
    ["11.222.333/0001-82", false],
    ["12.ABC.345/01DE-36", false],
    ["00.000.000/0000-00", false],
    ["11111111111111", false],
    ["1122233300018", false],
    ["11.222.333/0001-8A", false],
    ["", false],
  ])("cnpjValido(%s) = %s", (valor, esperado) => {
    expect(cnpjValido(valor)).toBe(esperado);
  });

  it("normaliza removendo máscara e colocando em maiúsculas", () => {
    expect(normalizarCnpj(" 12.abc.345/01de-35 ")).toBe("12ABC34501DE35");
  });

  it("formata com máscara", () => {
    expect(formatarCnpj("11222333000181")).toBe("11.222.333/0001-81");
    expect(formatarCnpj("12ABC34501DE35")).toBe("12.ABC.345/01DE-35");
  });

  it("schema devolve o CNPJ normalizado", () => {
    expect(cnpjSchema.parse("11.222.333/0001-81")).toBe("11222333000181");
  });

  it("schema rejeita CNPJ inválido com mensagem", () => {
    const r = cnpjSchema.safeParse("11.222.333/0001-82");
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("CNPJ inválido");
  });
});

describe("mascararCnpj", () => {
  it.each([
    ["", ""],
    ["1", "1"],
    ["112", "11.2"],
    ["11222", "11.222"],
    ["112223", "11.222.3"],
    ["112223330", "11.222.333/0"],
    ["1122233300018", "11.222.333/0001-8"],
    ["11222333000181", "11.222.333/0001-81"],
    ["12abc34501de35", "12.ABC.345/01DE-35"],
    ["12.ABC.345/01DE-35", "12.ABC.345/01DE-35"],
    [" 12 abc-345 ", "12.ABC.345"],
    ["12ABC34501DEX3", "12.ABC.345/01DE-3"],
    ["11222333000181999", "11.222.333/0001-81"],
    ["ç@#", ""],
  ])("mascararCnpj(%j) = %j", (valor, esperado) => {
    expect(mascararCnpj(valor)).toBe(esperado);
  });

  it("aplicar a máscara de novo não muda o valor", () => {
    expect(mascararCnpj(mascararCnpj("12abc34501de35"))).toBe("12.ABC.345/01DE-35");
  });
});
