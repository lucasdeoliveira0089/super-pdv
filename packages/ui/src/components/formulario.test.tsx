import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Alert, AlertDescription } from "@super-pdv/ui/components/alert";
import { Button } from "@super-pdv/ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@super-pdv/ui/components/field";
import { Input } from "@super-pdv/ui/components/input";

/** Formulário base usado nas telas de login do admin, do gestor e do PDV. */
function FormularioLogin({ onSubmit, erro }: { onSubmit: () => void; erro?: string }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {erro && (
        <Alert variant="destructive">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}
      <FieldGroup>
        <Field data-invalid={!!erro}>
          <FieldLabel htmlFor="email">E-mail</FieldLabel>
          <Input id="email" type="email" autoFocus aria-invalid={!!erro} />
          {erro && <FieldError>Verifique o e-mail</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="senha">Senha</FieldLabel>
          <Input id="senha" type="password" />
        </Field>
        <Button type="submit">Entrar</Button>
      </FieldGroup>
    </form>
  );
}

describe("formulário base", () => {
  it("associa rótulos aos campos e envia com Enter pelo teclado", async () => {
    const onSubmit = vi.fn();
    render(<FormularioLogin onSubmit={onSubmit} />);
    const email = screen.getByLabelText("E-mail");
    expect(email).toHaveFocus();
    await userEvent.type(email, "ana@loja.com");
    await userEvent.tab();
    expect(screen.getByLabelText("Senha")).toHaveFocus();
    await userEvent.type(screen.getByLabelText("Senha"), "segredo{Enter}");
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("exibe erro geral e do campo", () => {
    render(<FormularioLogin onSubmit={() => undefined} erro="E-mail ou senha inválidos" />);
    const alertas = screen.getAllByRole("alert");
    expect(alertas.map((a) => a.textContent)).toEqual([
      "E-mail ou senha inválidos",
      "Verifique o e-mail",
    ]);
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Verifique o e-mail")).toBeInTheDocument();
  });
});
