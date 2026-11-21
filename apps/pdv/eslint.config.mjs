import react from "@super-pdv/config/eslint/react";

export default [
  ...react,
  {
    files: [
      "src/main/**/*.ts",
      "src/preload/**/*.ts",
      "scripts/**/*.mjs",
      "*.config.ts",
      "e2e/**/*.ts",
    ],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
];
