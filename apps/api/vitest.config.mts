import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // SWC preserva a metadata de decorators exigida pela injeção de dependência do Nest.
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    // Testes de integração sobem containers; o primeiro pull da imagem pode demorar.
    hookTimeout: 180_000,
    testTimeout: 30_000,
  },
});
