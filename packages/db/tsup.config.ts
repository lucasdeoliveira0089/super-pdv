import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/testing.ts"],
  // import.meta.url também no build CJS (usado para achar a pasta de migrations).
  shims: true,
  external: ["@testcontainers/postgresql"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2023",
});
