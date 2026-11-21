import type { ConfigModuleOptions } from "@nestjs/config";
import { validateEnv } from "./env";

/** Opções do ConfigModule usadas pelo AppModule. */
export const configOptions: ConfigModuleOptions = {
  isGlobal: true,
  validate: validateEnv,
  // Em testes, apenas as variáveis definidas pelo próprio teste são usadas.
  ignoreEnvFile: process.env.NODE_ENV === "test",
};
