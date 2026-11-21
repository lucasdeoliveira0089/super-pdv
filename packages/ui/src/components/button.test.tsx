import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@super-pdv/ui/components/button";

describe("Button", () => {
  it("renderiza com o texto e as classes do tema", () => {
    render(<Button>Finalizar venda</Button>);
    const button = screen.getByRole("button", { name: "Finalizar venda" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-primary", "text-primary-foreground");
  });

  it("aplica a variante informada", () => {
    render(<Button variant="destructive">Cancelar</Button>);
    expect(screen.getByRole("button", { name: "Cancelar" }).className).toContain("destructive");
  });

  it("é acionável pelo teclado", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Confirmar</Button>);
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Confirmar" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledOnce();
  });
});
