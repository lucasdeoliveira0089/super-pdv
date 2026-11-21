import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** Garante o schema e os dados de demonstração no banco local antes dos testes. */
export default function globalSetup(): void {
  const raiz = fileURLToPath(new URL("../../..", import.meta.url));
  execSync("pnpm db:migrate", { cwd: raiz, stdio: "inherit" });
  execSync("pnpm db:seed", { cwd: raiz, stdio: "inherit" });
}
