import { useEffect, useRef } from "react";
import type { Resultado, SessaoPdv } from "../../shared/ipc";

/** Executa `acao` quando a tecla é pressionada em qualquer lugar da janela. */
export function useTecla(tecla: string, acao: (() => void) | undefined): void {
  const ref = useRef(acao);
  useEffect(() => {
    ref.current = acao;
  });
  useEffect(() => {
    const ouvir = (e: KeyboardEvent) => {
      if (e.key === tecla && ref.current) {
        e.preventDefault();
        ref.current();
      }
    };
    window.addEventListener("keydown", ouvir);
    return () => window.removeEventListener("keydown", ouvir);
  }, [tecla]);
}

/** Converte falhas inesperadas do IPC em um resultado de erro. */
export async function chamar(acao: () => Promise<Resultado<SessaoPdv>>) {
  try {
    return await acao();
  } catch {
    return { ok: false, erro: { codigo: "ERRO_INESPERADO" } } as const;
  }
}
