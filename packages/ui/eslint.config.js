import react from "@super-pdv/config/eslint/react";

export default [
  ...react,
  {
    // Componentes do shadcn exportam variantes (ex.: buttonVariants) junto do componente.
    files: ["src/components/**/*.tsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },
];
