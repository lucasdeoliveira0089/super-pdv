import { type KeyboardEvent, useState } from "react";
import { Button } from "@super-pdv/ui/components/button";
import { AlertaErro } from "@super-pdv/ui/components/campos";
import { formatarCnpj } from "@super-pdv/shared";
import type { CodigoErroPdv, SessaoPdv } from "../../../shared/ipc";
import { Moldura } from "../componentes";
import { chamar, useTecla } from "../util";
import { MENSAGEM_ERRO } from "../fluxo";

/** Escolha da empresa (CNPJ) de operação, por setas, Tab e Enter. */
export function TelaEscolherEmpresa({
  sessao,
  podeVoltar,
  aoEscolher,
  aoVoltar,
  aoFalhaSessao,
  aoSair,
}: {
  sessao: SessaoPdv;
  podeVoltar: boolean;
  aoEscolher: (sessao: SessaoPdv) => void;
  aoVoltar: () => void;
  aoFalhaSessao: (codigo: CodigoErroPdv) => void;
  aoSair: () => void;
}) {
  const [erro, setErro] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  useTecla("Escape", podeVoltar && !enviando ? aoVoltar : undefined);

  async function escolher(id: string) {
    if (enviando) return;
    setEnviando(true);
    setErro(undefined);
    const r = await chamar(() => window.superPdv.empresa.escolher(id));
    setEnviando(false);
    if (r.ok) return aoEscolher(r.valor);
    if (r.erro.codigo === "SESSAO_EXPIRADA") return aoFalhaSessao(r.erro.codigo);
    setErro(MENSAGEM_ERRO[r.erro.codigo]);
  }

  /** Setas para cima e para baixo movem o foco entre as empresas. */
  function navegar(evento: KeyboardEvent<HTMLUListElement>) {
    if (evento.key !== "ArrowDown" && evento.key !== "ArrowUp") return;
    evento.preventDefault();
    const botoes = [...evento.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
    const atual = botoes.indexOf(document.activeElement as HTMLButtonElement);
    const passo = evento.key === "ArrowDown" ? 1 : -1;
    botoes[(atual + passo + botoes.length) % botoes.length]?.focus();
  }

  const atual = sessao.empresaId;
  return (
    <Moldura
      testId="tela-escolher-empresa"
      titulo="Escolha a empresa"
      descricao="Em qual empresa você vai operar este caixa?"
      rodape={
        <>
          {podeVoltar && (
            <Button variant="outline" onClick={aoVoltar} disabled={enviando}>
              Voltar (Esc)
            </Button>
          )}
          <Button variant="ghost" onClick={aoSair} disabled={enviando}>
            Sair
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <AlertaErro mensagem={erro} />
        <ul className="grid gap-2" aria-label="Empresas" onKeyDown={navegar}>
          {sessao.empresas.map((empresa, i) => (
            <li key={empresa.id}>
              <Button
                variant={empresa.id === atual ? "secondary" : "outline"}
                className="h-auto w-full flex-col items-start gap-0.5 py-2 text-left"
                autoFocus={atual ? empresa.id === atual : i === 0}
                disabled={enviando}
                aria-current={empresa.id === atual || undefined}
                onClick={() => void escolher(empresa.id)}
              >
                <span className="font-medium">{empresa.nomeFantasia}</span>
                <span className="text-muted-foreground text-xs">
                  CNPJ {formatarCnpj(empresa.cnpj)}
                </span>
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </Moldura>
  );
}

export function TelaSemEmpresa({ sessao, aoSair }: { sessao: SessaoPdv; aoSair: () => void }) {
  return (
    <Moldura
      testId="tela-sem-empresa"
      titulo="Nenhuma empresa disponível"
      descricao={`${sessao.usuario.nome}, não há empresa disponível para você operar.`}
      rodape={
        <Button autoFocus onClick={aoSair}>
          Sair
        </Button>
      }
    >
      <p className="text-muted-foreground text-sm">
        Peça ao responsável pela sua empresa para verificar o seu acesso no gestor.
      </p>
    </Moldura>
  );
}
