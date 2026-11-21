import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";
import base from "./base.js";

/** Configuração para apps Next.js. */
export default tseslint.config(...base, {
  files: ["**/*.{ts,tsx}"],
  languageOptions: {
    globals: { ...globals.browser },
  },
  plugins: {
    "@next/next": nextPlugin,
    "react-hooks": reactHooks,
  },
  rules: {
    ...nextPlugin.configs.recommended.rules,
    ...nextPlugin.configs["core-web-vitals"].rules,
    ...reactHooks.configs.recommended.rules,
  },
});
