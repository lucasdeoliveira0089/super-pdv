import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { colunasDe, DataTable } from "@super-pdv/ui/components/data-table";

interface Pessoa {
  id: string;
  nome: string;
  email: string;
}

const c = colunasDe<Pessoa>();
const colunas = c.columns([
  c.accessor("nome", { header: "Nome", enableHiding: false }),
  c.accessor("email", { header: "E-mail", enableSorting: false }),
]);
const rotulos = { nome: "Nome", email: "E-mail" };

const pessoas = (n: number): Pessoa[] =>
  Array.from({ length: n }, (_, i) => ({
    id: String(i),
    nome: `Pessoa ${String(i + 1).padStart(2, "0")}`,
    email: `p${i + 1}@x.local`,
  }));

/** Nomes da primeira coluna, na ordem exibida. */
const nomesNaTela = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((linha) => within(linha).getAllByRole("cell")[0]!.textContent);

describe("DataTable", () => {
  it("ordena pela coluna e inverte no segundo clique", async () => {
    const dados = [
      { id: "1", nome: "Bruna", email: "b@x.local" },
      { id: "2", nome: "Ana", email: "a@x.local" },
      { id: "3", nome: "Carla", email: "c@x.local" },
    ];
    render(<DataTable colunas={colunas} dados={dados} rotulos={rotulos} />);
    expect(nomesNaTela()).toEqual(["Bruna", "Ana", "Carla"]);

    const botao = screen.getByRole("button", { name: "Nome" });
    await userEvent.click(botao);
    expect(nomesNaTela()).toEqual(["Ana", "Bruna", "Carla"]);
    expect(screen.getByRole("columnheader", { name: "Nome" })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );

    await userEvent.click(botao);
    expect(nomesNaTela()).toEqual(["Carla", "Bruna", "Ana"]);
    // Coluna sem ordenação não vira botão.
    expect(screen.queryByRole("button", { name: "E-mail" })).toBeNull();
  });

  it("esconde e mostra uma coluna pelo menu Colunas", async () => {
    render(<DataTable colunas={colunas} dados={pessoas(2)} rotulos={rotulos} />);
    expect(screen.getByRole("columnheader", { name: "E-mail" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Colunas" }));
    const opcoes = screen.getAllByRole("menuitemcheckbox");
    // "Nome" não pode ser escondida: só "E-mail" aparece no menu.
    expect(opcoes.map((o) => o.textContent)).toEqual(["E-mail"]);
    await userEvent.click(opcoes[0]!);
    expect(screen.queryByRole("columnheader", { name: "E-mail" })).toBeNull();
  });

  it("pagina de 10 em 10 com a contagem", async () => {
    render(
      <DataTable colunas={colunas} dados={pessoas(15)} rotulos={rotulos} nomeItens="pessoas" />,
    );
    expect(nomesNaTela()).toHaveLength(10);
    expect(screen.getByTestId("contagem")).toHaveTextContent("1–10 de 15 pessoas");
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(nomesNaTela()).toHaveLength(5);
    expect(nomesNaTela()[0]).toBe("Pessoa 11");
    expect(screen.getByTestId("contagem")).toHaveTextContent("11–15 de 15 pessoas");
    expect(screen.getByRole("button", { name: "Próximo" })).toBeDisabled();
  });

  it("informa quando não há resultados", () => {
    render(<DataTable colunas={colunas} dados={[]} rotulos={rotulos} vazio="Nenhuma pessoa." />);
    expect(screen.getByRole("cell", { name: "Nenhuma pessoa." })).toBeInTheDocument();
    expect(screen.getByTestId("contagem")).toHaveTextContent("0 resultados");
  });

  it("mostra a barra de busca e filtros ao lado do menu Colunas", () => {
    render(
      <DataTable
        colunas={colunas}
        dados={[]}
        rotulos={rotulos}
        barra={<input aria-label="Buscar" />}
      />,
    );
    expect(screen.getByRole("textbox", { name: "Buscar" })).toBeInTheDocument();
  });
});
