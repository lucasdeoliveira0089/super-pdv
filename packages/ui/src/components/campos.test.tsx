import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CampoSelecao, CampoTexto } from "@super-pdv/ui/components/campos";
import { SecaoFormulario } from "@super-pdv/ui/components/secao-formulario";

describe("campos obrigatórios", () => {
  it("campo obrigatório tem asterisco visual e é anunciado como obrigatório", () => {
    render(<CampoTexto name="cep" rotulo="CEP" obrigatorio />);
    const campo = screen.getByRole("textbox", { name: "CEP" });
    expect(campo).toHaveAttribute("aria-required", "true");
    const asterisco = screen.getByText("*");
    expect(asterisco).toHaveAttribute("aria-hidden", "true");
  });

  it("campo opcional não tem asterisco nem aria-required", () => {
    render(<CampoTexto name="complemento" rotulo="Complemento" />);
    expect(screen.getByRole("textbox", { name: "Complemento" })).not.toHaveAttribute(
      "aria-required",
    );
    expect(screen.queryByText("*")).toBeNull();
  });

  it("seleção obrigatória também é anunciada", () => {
    render(
      <CampoSelecao name="uf" rotulo="UF" obrigatorio opcoes={[{ valor: "SP", rotulo: "SP" }]} />,
    );
    expect(screen.getByRole("combobox", { name: "UF" })).toHaveAttribute("aria-required", "true");
  });
});

describe("SecaoFormulario", () => {
  it("é uma região nomeada pelo título, com descrição e conteúdo", () => {
    render(
      <SecaoFormulario titulo="Localização" descricao="Endereço do estabelecimento.">
        <CampoTexto name="cep" rotulo="CEP" />
      </SecaoFormulario>,
    );
    const secao = screen.getByRole("region", { name: "Localização" });
    expect(screen.getByRole("heading", { level: 2, name: "Localização" })).toBeInTheDocument();
    expect(secao).toHaveTextContent("Endereço do estabelecimento.");
    expect(screen.getByRole("textbox", { name: "CEP" })).toBeInTheDocument();
  });
});
