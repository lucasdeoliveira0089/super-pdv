import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

/** Configuração base do ESLint para todo o monorepo (TypeScript). */
export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/out/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/release/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/next-env.d.ts",
      // Arquivos temporários que o Vite/electron-vite criam e apagam ao carregar a
      // configuração (ex.: electron.vite.config.ts.<n>.mjs). Com lint e build em
      // paralelo, o ESLint os listaria e falharia ao abri-los (ENOENT).
      "**/*.config.ts.*.mjs",
      "**/*.config.*.timestamp-*.mjs",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
    },
  },
  prettier,
);
