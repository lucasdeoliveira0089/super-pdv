import { CONFIG_ADMIN } from "@super-pdv/web-session";
import { criarProxy } from "@super-pdv/web-session/proxy";

/** Sessão do admin: exige login e renova o acesso antes de expirar. */
export const proxy = criarProxy(CONFIG_ADMIN);

export const config = {
  matcher: ["/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|ico|css|js|woff2?)$).*)"],
};
