import { expect, type Page } from "@playwright/test";
import { createDb, type DbClient, schema } from "@super-pdv/db";

export const EQUIPE = { email: "equipe@superpdv.local", senha: "Equipe#Demo2026" };
export const DONO_DEMO = { email: "dono@demo.local", senha: "Demo#Senha2026" };

/** Sufixo único para os dados criados por cada execução. */
export const unico = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** CNPJ numérico válido e aleatório, já com máscara. */
export function gerarCnpj(): string {
  const base = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join("") + "0001";
  const dv = (b: string, pesos: number[]) => {
    const r = [...b].reduce((s, c, i) => s + Number(c) * pesos[i]!, 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = dv(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = dv(base + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const c = `${base}${d1}${d2}`;
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}

export async function entrar(page: Page, email: string, senha: string): Promise<void> {
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
}

export async function entrarComoEquipe(page: Page): Promise<void> {
  await page.goto("/login");
  await entrar(page, EQUIPE.email, EQUIPE.senha);
  await expect(page).toHaveURL(/\/clientes$/);
}

export async function sair(page: Page): Promise<void> {
  // Páginas autenticadas: "Sair" fica no menu do usuário, no rodapé do menu lateral.
  // Telas sem menu (ex.: "Acesso pelo PDV") têm o botão direto.
  const botao = page.getByRole("button", { name: "Sair", exact: true });
  if (await botao.isVisible()) {
    await botao.click();
  } else {
    await page.getByRole("button", { name: /^Menu do usuário/ }).click();
    await page.getByRole("menuitem", { name: "Sair" }).click();
  }
  await expect(page).toHaveURL(/\/login/);
}

/** Menu lateral principal (evita confundir com os links da trilha de navegação). */
export const menu = (page: Page) => page.getByRole("navigation", { name: "Menu principal" });

// ---------------------------------------------------------------- banco
// Só para simular registros antigos (sem endereço ou sem responsável), que o
// admin e a API não criam mais.

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://superpdv:superpdv@localhost:5432/superpdv";

async function noBanco<T>(fn: (db: DbClient["db"]) => Promise<T>): Promise<T> {
  const cliente = createDb(DATABASE_URL);
  try {
    return await fn(cliente.db);
  } finally {
    await cliente.close();
  }
}

/** Empresa como as cadastradas antes do endereço existir. */
export function criarEmpresaSemEndereco(clienteId: string, nomeFantasia: string, cnpj: string) {
  return noBanco((db) =>
    db.insert(schema.empresas).values({
      tenantId: clienteId,
      cnpj: cnpj.replace(/\D/g, ""),
      razaoSocial: `${nomeFantasia} Ltda`,
      nomeFantasia,
    }),
  );
}

/** Cliente como os cadastrados antes do responsável existir; devolve o id. */
export function criarClienteSemResponsavel(nome: string): Promise<string> {
  return noBanco(async (db) => {
    const [c] = await db.insert(schema.clientes).values({ nome }).returning();
    return c!.id;
  });
}
