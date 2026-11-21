// Executa um binário Node (ex.: vitest) usando o runtime do Electron
// (ELECTRON_RUN_AS_NODE), para testar módulos nativos exatamente como em produção.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const electronBinary = require("electron");
const [tool, ...args] = process.argv.slice(2);

const entries = {
  vitest: () => join(dirname(require.resolve("vitest/package.json")), "vitest.mjs"),
};
if (!tool || !entries[tool]) {
  console.error(`Uso: run-in-electron.mjs <${Object.keys(entries).join("|")}> [args]`);
  process.exit(2);
}

const result = spawnSync(electronBinary, [entries[tool](), ...args], {
  stdio: "inherit",
  env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
});
process.exit(result.status ?? 1);
