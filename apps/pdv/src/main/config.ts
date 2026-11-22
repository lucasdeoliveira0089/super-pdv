import { z } from "zod";

// Endereços da API e do gestor usados pelo processo principal (D5). Definidos no
// build pelas variáveis MAIN_VITE_* do electron-vite (veja .env.example).

const url = (nome: string) =>
  z
    .url({ protocol: /^https?$/, error: `${nome} deve ser uma URL http(s) válida` })
    .transform((valor) => valor.replace(/\/+$/, ""));

const configSchema = z.object({
  MAIN_VITE_API_URL: url("MAIN_VITE_API_URL").default("http://localhost:3333"),
  MAIN_VITE_GESTOR_URL: url("MAIN_VITE_GESTOR_URL").default("http://localhost:3000"),
});

export interface ConfigPdv {
  /** URL base da API, sem barra final (ex.: `http://localhost:3333`). */
  apiUrl: string;
  /** URL base do gestor, usada para a recuperação de senha. */
  gestorUrl: string;
}

export class ConfigInvalidaError extends Error {
  constructor(public readonly problemas: string[]) {
    super(`Configuração do PDV inválida: ${problemas.join("; ")}`);
    this.name = "ConfigInvalidaError";
  }
}

type Fonte = Partial<Record<keyof z.input<typeof configSchema>, string | undefined>>;

/** Valida a configuração; valores vazios usam o padrão de desenvolvimento. */
export function lerConfig(fonte: Fonte): ConfigPdv {
  const limpa = Object.fromEntries(
    Object.entries(fonte).filter(([, valor]) => valor !== undefined && valor.trim() !== ""),
  );
  const resultado = configSchema.safeParse(limpa);
  if (!resultado.success) {
    throw new ConfigInvalidaError(resultado.error.issues.map((i) => i.message));
  }
  return {
    apiUrl: resultado.data.MAIN_VITE_API_URL,
    gestorUrl: resultado.data.MAIN_VITE_GESTOR_URL,
  };
}
