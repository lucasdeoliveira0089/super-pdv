import base from "@super-pdv/config/eslint/base";

export default [
  ...base,
  {
    // A injeção de dependência do Nest lê os tipos dos parâmetros via metadata de
    // decorators: imports usados "só como tipo" no construtor são necessários em runtime.
    languageOptions: {
      parserOptions: { emitDecoratorMetadata: true, experimentalDecorators: true },
    },
  },
];
