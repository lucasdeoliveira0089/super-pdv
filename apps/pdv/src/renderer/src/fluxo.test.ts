import { describe, expect, it } from "vitest";
import type { SessaoPdv } from "../../shared/ipc";
import { etapaDaSessao, trocarEmpresa } from "./fluxo";

const centro = { id: "c", cnpj: "11222333000181", razaoSocial: "C Ltda", nomeFantasia: "Centro" };
const norte = { id: "n", cnpj: "12ABC34501DE35", razaoSocial: "N Ltda", nomeFantasia: "Norte" };

const sessao = (dados: Partial<SessaoPdv> = {}, senhaTemporaria = false): SessaoPdv => ({
  usuario: { nome: "Ana", email: "ana@x.local", papel: "operador", senhaTemporaria },
  cliente: { nome: "Mercado" },
  empresas: [centro],
  empresaId: "c",
  ...dados,
});

describe("fluxo de telas do PDV", () => {
  it("sem sessão: login, com o aviso quando houver", () => {
    expect(etapaDaSessao(null)).toEqual({ tela: "login" });
    expect(etapaDaSessao(null, "SEM_CONEXAO")).toEqual({ tela: "login", aviso: "SEM_CONEXAO" });
  });

  it("senha temporária vem antes de qualquer outra tela", () => {
    expect(etapaDaSessao(sessao({}, true)).tela).toBe("trocar-senha");
    expect(etapaDaSessao(sessao({ empresas: [] }, true)).tela).toBe("trocar-senha");
  });

  it("sem empresas: não prossegue", () => {
    expect(etapaDaSessao(sessao({ empresas: [], empresaId: null })).tela).toBe("sem-empresa");
  });

  it("empresa ainda não escolhida: escolha, sem voltar", () => {
    const e = etapaDaSessao(sessao({ empresas: [centro, norte], empresaId: null }));
    expect(e).toMatchObject({ tela: "escolher-empresa", podeVoltar: false });
  });

  it("empresa escolhida: principal", () => {
    expect(etapaDaSessao(sessao())).toMatchObject({ tela: "principal", empresa: centro });
  });

  it("trocar empresa só com mais de uma empresa, podendo voltar", () => {
    const varias = etapaDaSessao(sessao({ empresas: [centro, norte] }));
    expect(trocarEmpresa(varias)).toMatchObject({ tela: "escolher-empresa", podeVoltar: true });
    const uma = etapaDaSessao(sessao());
    expect(trocarEmpresa(uma)).toBe(uma);
  });
});
