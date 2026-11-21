/** Extrai o erro do driver `pg` (o Drizzle o embrulha em `cause`). */
function erroPg(erro: unknown): { code?: string; constraint?: string } | undefined {
  let atual: unknown = erro;
  for (let i = 0; i < 3 && atual && typeof atual === "object"; i++) {
    const e = atual as { code?: unknown; constraint?: unknown; cause?: unknown };
    if (typeof e.code === "string") return { code: e.code, constraint: e.constraint as string };
    atual = e.cause;
  }
  return undefined;
}

/** Indica se o erro é violação da restrição de unicidade informada. */
export function violouUnicidade(erro: unknown, restricao: string): boolean {
  const pg = erroPg(erro);
  return pg?.code === "23505" && pg.constraint === restricao;
}
