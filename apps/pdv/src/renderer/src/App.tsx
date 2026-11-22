import { useEffect, useState } from "react";
import type { CodigoErroPdv, SessaoPdv } from "../../shared/ipc";
import { Moldura } from "./componentes";
import { type Etapa, etapaDaSessao, trocarEmpresa } from "./fluxo";
import { TelaEscolherEmpresa, TelaSemEmpresa } from "./telas/empresa";
import { TelaLogin } from "./telas/login";
import { TelaPrincipal } from "./telas/principal";
import { TelaTrocarSenha } from "./telas/trocar-senha";

export function App() {
  const [etapa, setEtapa] = useState<Etapa>({ tela: "carregando" });

  useEffect(() => {
    window.superPdv.sessao
      .obter()
      .then(({ sessao, semConexao }) =>
        setEtapa(etapaDaSessao(sessao, semConexao ? "SEM_CONEXAO" : undefined)),
      )
      .catch(() => setEtapa({ tela: "login" }));
  }, []);

  const aoSessao = (sessao: SessaoPdv) => setEtapa(etapaDaSessao(sessao));
  const aoFalhaSessao = (codigo: CodigoErroPdv) =>
    setEtapa({ tela: "login", aviso: codigo === "SEM_CONEXAO" ? codigo : "SESSAO_EXPIRADA" });
  const sair = () => {
    void window.superPdv.auth.sair().finally(() => setEtapa({ tela: "login" }));
  };

  switch (etapa.tela) {
    case "carregando":
      return <Moldura titulo="Super PDV — Caixa" descricao="Carregando…" />;
    case "login":
      // `key`: cada volta ao login começa com o formulário limpo.
      return <TelaLogin key={etapa.aviso ?? "login"} aviso={etapa.aviso} aoEntrar={aoSessao} />;
    case "trocar-senha":
      return (
        <TelaTrocarSenha
          sessao={etapa.sessao}
          aoTrocar={aoSessao}
          aoFalhaSessao={aoFalhaSessao}
          aoSair={sair}
        />
      );
    case "sem-empresa":
      return <TelaSemEmpresa sessao={etapa.sessao} aoSair={sair} />;
    case "escolher-empresa":
      return (
        <TelaEscolherEmpresa
          sessao={etapa.sessao}
          podeVoltar={etapa.podeVoltar}
          aoEscolher={aoSessao}
          aoVoltar={() => setEtapa(etapaDaSessao(etapa.sessao))}
          aoFalhaSessao={aoFalhaSessao}
          aoSair={sair}
        />
      );
    case "principal":
      return (
        <TelaPrincipal
          sessao={etapa.sessao}
          empresa={etapa.empresa}
          aoTrocarEmpresa={() => setEtapa(trocarEmpresa(etapa))}
          aoSair={sair}
        />
      );
  }
}
