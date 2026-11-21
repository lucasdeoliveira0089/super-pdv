/** Variáveis de ambiente válidas para testes (sem segredos reais). */
export const ENV_TESTE = {
  NODE_ENV: "test",
  JWT_SECRET: "segredo-de-teste-com-mais-de-32-caracteres!!",
  GESTOR_URL: "http://gestor.teste",
  ADMIN_URL: "http://admin.teste",
  SMTP_URL: "smtp://localhost:1025",
  MAIL_FROM: "Super PDV <teste@superpdv.local>",
  // Alto nos testes; o limite por IP tem teste próprio.
  LIMITE_AUTH_POR_MINUTO: "10000",
} as const;

/** Aplica ENV_TESTE + DATABASE_URL em process.env (antes de importar o AppModule). */
export function aplicarAmbienteDeTeste(databaseUrl: string): void {
  Object.assign(process.env, ENV_TESTE, { DATABASE_URL: databaseUrl });
}
