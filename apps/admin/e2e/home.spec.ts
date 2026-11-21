import { expect, test } from "@playwright/test";

test.describe("Página inicial do admin", () => {
  test("exibe os componentes do pacote de UI com o tema aplicado", async ({ page }) => {
    await page.goto("/");

    const card = page.getByTestId("admin-welcome");
    await expect(card).toBeVisible();
    await expect(card.getByText("Super PDV — Administração")).toBeVisible();
    await expect(card.getByText("Em construção")).toBeVisible();

    const button = page.getByRole("button", { name: "Começar" });
    await expect(button).toBeVisible();
    await expect(button).toHaveClass(/bg-primary/);

    // O CSS do tema (packages/ui/globals.css) precisa estar carregado:
    // a cor de fundo do botão vem do token --primary e não pode ser transparente.
    const background = await button.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(background).not.toBe("rgba(0, 0, 0, 0)");
    const primary = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),
    );
    expect(primary).not.toBe("");
  });
});
