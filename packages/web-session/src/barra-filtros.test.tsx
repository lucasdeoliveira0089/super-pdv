// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Endereço simulado: o `router.replace` do Next atualiza estes parâmetros.
const navegacao = vi.hoisted(() => ({
  query: "",
  substituicoes: [] as string[],
  aoMudar: () => {},
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/usuarios",
  useSearchParams: () => new URLSearchParams(navegacao.query),
  useRouter: () => ({
    replace: (url: string) => {
      navegacao.substituicoes.push(url);
      navegacao.query = url.split("?")[1] ?? "";
      navegacao.aoMudar();
    },
  }),
}));

const { BarraFiltros } = await import("./barra-filtros");

const filtros = [
  {
    nome: "papel",
    rotulo: "Papel",
    opcoes: [
      { valor: "", rotulo: "Todos" },
      { valor: "gerente", rotulo: "Gerente" },
      { valor: "operador", rotulo: "Operador de caixa" },
    ],
  },
];
const busca = { nome: "busca", rotulo: "Buscar" };

function montar(query = "") {
  navegacao.query = query;
  const tela = render(<BarraFiltros busca={busca} filtros={filtros} />);
  navegacao.aoMudar = () => tela.rerender(<BarraFiltros busca={busca} filtros={filtros} />);
  return tela;
}

describe("BarraFiltros", () => {
  beforeEach(() => {
    navegacao.substituicoes = [];
  });
  afterEach(cleanup);

  it("busca: atualiza o endereço depois que a pessoa para de digitar", async () => {
    montar();
    await userEvent.type(screen.getByRole("searchbox", { name: "Buscar" }), "Ana");
    expect(navegacao.substituicoes).toEqual([]);
    await waitFor(() => expect(navegacao.substituicoes).toEqual(["/usuarios?busca=Ana"]));
  });

  it("filtro: escolher uma opção grava o parâmetro e mantém os demais", async () => {
    montar("busca=Ana");
    await userEvent.click(screen.getByRole("button", { name: "Filtrar por papel" }));
    await userEvent.click(screen.getByRole("menuitemradio", { name: "Gerente" }));
    expect(navegacao.substituicoes.at(-1)).toBe("/usuarios?busca=Ana&papel=gerente");
    expect(screen.getByRole("button", { name: "Filtrar por papel: Gerente" })).toBeVisible();
  });

  it("filtro: 'Todos' remove o parâmetro", async () => {
    montar("papel=gerente");
    await userEvent.click(screen.getByRole("button", { name: "Filtrar por papel: Gerente" }));
    await userEvent.click(screen.getByRole("menuitemradio", { name: "Todos" }));
    expect(navegacao.substituicoes.at(-1)).toBe("/usuarios");
  });

  it("valores do endereço aparecem nos campos e 'Limpar filtros' remove todos", async () => {
    montar("busca=Ana&papel=gerente&outro=1");
    expect(screen.getByRole("searchbox", { name: "Buscar" })).toHaveValue("Ana");

    await userEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    // Parâmetros que não são da barra continuam.
    expect(navegacao.substituicoes.at(-1)).toBe("/usuarios?outro=1");
    expect(screen.getByRole("searchbox", { name: "Buscar" })).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Limpar filtros" })).toBeNull();
    // Limpar não dispara uma busca atrasada.
    await act(() => new Promise((r) => setTimeout(r, 400)));
    expect(navegacao.substituicoes).toHaveLength(1);
  });

  it("sem filtro ativo, não mostra 'Limpar filtros'", () => {
    montar();
    expect(screen.queryByRole("button", { name: "Limpar filtros" })).toBeNull();
  });
});
