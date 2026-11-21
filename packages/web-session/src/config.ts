/** Configuração da sessão de cada app web (admin e gestor). */
export interface ConfigSessao {
  app: "admin" | "gestor";
  /** Prefixo das rotas de autenticação na API. */
  rotasAuth: string;
  /** Rota de dados do usuário logado na API. */
  rotaMe: string;
  cookies: { acesso: string; renovacao: string };
  /** Páginas acessíveis sem sessão. */
  paginasPublicas: string[];
}

const PAGINAS_PUBLICAS = ["/login", "/esqueci-senha", "/redefinir-senha"];

export const CONFIG_GESTOR: ConfigSessao = {
  app: "gestor",
  rotasAuth: "/v1/auth",
  rotaMe: "/v1/me",
  cookies: { acesso: "spdv_gestor_at", renovacao: "spdv_gestor_rt" },
  paginasPublicas: PAGINAS_PUBLICAS,
};

export const CONFIG_ADMIN: ConfigSessao = {
  app: "admin",
  rotasAuth: "/v1/admin/auth",
  rotaMe: "/v1/admin/me",
  cookies: { acesso: "spdv_admin_at", renovacao: "spdv_admin_rt" },
  paginasPublicas: PAGINAS_PUBLICAS,
};

/** URL da API (variável de servidor `API_URL`), validada na primeira leitura. */
export function apiUrl(): string {
  const valor = process.env.API_URL;
  if (!valor || !/^https?:\/\//.test(valor)) {
    throw new Error(
      "Variável de ambiente API_URL ausente ou inválida (ex.: http://localhost:3333)",
    );
  }
  return valor.replace(/\/$/, "");
}
