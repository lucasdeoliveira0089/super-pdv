import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@super-pdv\/ui\/(components|hooks)\/(.*)$/,
        replacement: fileURLToPath(new URL("./src/$1/$2.tsx", import.meta.url)),
      },
      {
        find: /^@super-pdv\/ui\/lib\/(.*)$/,
        replacement: fileURLToPath(new URL("./src/lib/$1.ts", import.meta.url)),
      },
    ],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
