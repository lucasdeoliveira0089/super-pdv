import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { _electron as electron, expect, test, type ElectronApplication } from "@playwright/test";

const MAIN = join(__dirname, "..", "out", "main", "index.js");

let app: ElectronApplication;
let userDataDir: string;

test.beforeAll(async () => {
  userDataDir = mkdtempSync(join(tmpdir(), "super-pdv-e2e-"));

  // ELECTRON_RUN_AS_NODE (definida por alguns hosts, como o VS Code) faria o
  // Electron rodar como Node puro; removida para iniciar o app de verdade.
  const env: Record<string, string | undefined> = {
    ...process.env,
    SUPER_PDV_USER_DATA_DIR: userDataDir,
  };
  delete env.ELECTRON_RUN_AS_NODE;

  app = await electron.launch({ args: [MAIN], env: env as Record<string, string> });
});

test.afterAll(async () => {
  await app?.close();
  rmSync(userDataDir, { recursive: true, force: true });
});

test("abre a janela do PDV com os componentes de UI e o banco local operante", async () => {
  const page = await app.firstWindow();
  await expect(page).toHaveTitle("Super PDV");

  const card = page.getByTestId("pdv-welcome");
  await expect(card).toBeVisible();
  await expect(card.getByText("Super PDV — Caixa")).toBeVisible();

  const button = page.getByRole("button", { name: "Abrir caixa" });
  await expect(button).toBeVisible();
  await expect(button).toHaveClass(/bg-primary/);
  await expect(button).toBeFocused();

  const localDb = page.getByTestId("local-db-status");
  await expect(localDb).toHaveAttribute("data-status", "operante");
  await expect(localDb).toHaveText(/Banco local: operante \(SQLite 3\.\d+\.\d+\)/);

  expect(existsSync(join(userDataDir, "super-pdv.db"))).toBe(true);
});

test("o renderer não tem acesso ao Node.js (isolamento de contexto e sandbox)", async () => {
  const page = await app.firstWindow();
  const exposed = await page.evaluate(() => ({
    require: typeof (globalThis as { require?: unknown }).require,
    process: typeof (globalThis as { process?: unknown }).process,
    api: typeof (globalThis as { superPdv?: { localDb?: { status?: unknown } } }).superPdv?.localDb
      ?.status,
  }));
  expect(exposed).toEqual({ require: "undefined", process: "undefined", api: "function" });
});
