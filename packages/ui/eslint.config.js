import react from "@super-pdv/config/eslint/react";

export default [
  ...react,
  {
    // Código gerado pelo shadcn: exporta variantes junto do componente e o hook
    // use-mobile sincroniza estado no efeito.
    files: ["src/components/**/*.tsx", "src/hooks/**/*.ts"],
    rules: {
      "react-refresh/only-export-components": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
];
