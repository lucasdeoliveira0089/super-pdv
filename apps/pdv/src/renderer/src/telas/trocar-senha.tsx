import { type FormEvent, useState } from "react";
import { Button } from "@super-pdv/ui/components/button";
import { AlertaErro, CampoTexto } from "@super-pdv/ui/components/campos";
import { FieldGroup } from "@super-pdv/ui/components/field";
import { validarSenha } from "@super-pdv/shared";
import type { CodigoErroPdv, SessaoPdv } from "../../../shared/ipc";
import { Moldura } from "../componentes";
import { chamar, useTecla } from "../util";
import { MENSAGEM_ERRO } from "../fluxo";

type Campo = "senhaAtual" | "novaSenha" | "confirmacao";

export function TelaTrocarSenha({
  sessao,
  aoTrocar,
  aoFalhaSessao,
  aoSair,
}: {
  sessao: SessaoPdv;
  aoTrocar: (sessao: SessaoPdv) => void;
  aoFalhaSessao: (codigo: CodigoErroPdv) => void;
  aoSair: () => void;
}) {
  const [valores, setValores] = useState<Record<Campo, string>>({
    senhaAtual: "",
    novaSenha: "",
    confirmacao: "",
  });
  const [erros, setErros] = useState<Partial<Record<Campo, string>>>({});
  const [erro, setErro] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  // Esc: desiste e volta ao login.
  useTecla("Escape", enviando ? undefined : aoSair);

  const campo = (nome: Campo) => ({
    name: nome,
    type: "password" as const,
    value: valores[nome],
    onChange: (e: { target: { value: string } }) =>
      setValores((v) => ({ ...v, [nome]: e.target.value })),
    erros: erros[nome] ? [erros[nome]] : undefined,
  });

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (enviando) return;
    const novos: Partial<Record<Campo, string>> = {};
    if (!valores.senhaAtual) novos.senhaAtual = "Informe a senha atual";
    const politica = validarSenha(valores.novaSenha, sessao.usuario.email);
    if (politica) novos.novaSenha = politica;
    else if (valores.novaSenha === valores.senhaAtual) {
      novos.novaSenha = "A nova senha deve ser diferente da atual";
    }
    if (valores.confirmacao !== valores.novaSenha) novos.confirmacao = "As senhas não conferem";
    setErros(novos);
    setErro(undefined);
    if (Object.keys(novos).length) return;

    setEnviando(true);
    const r = await chamar(() =>
      window.superPdv.auth.trocarSenha(valores.senhaAtual, valores.novaSenha),
    );
    setEnviando(false);
    if (r.ok) return aoTrocar(r.valor);
    if (r.erro.codigo === "SENHA_INVALIDA") {
      setErros({ senhaAtual: r.erro.campos?.senhaAtual, novaSenha: r.erro.campos?.novaSenha });
      if (!r.erro.campos?.senhaAtual && !r.erro.campos?.novaSenha) {
        setErro(MENSAGEM_ERRO.SENHA_INVALIDA);
      }
      return;
    }
    if (r.erro.codigo === "SESSAO_EXPIRADA") return aoFalhaSessao(r.erro.codigo);
    setErro(MENSAGEM_ERRO[r.erro.codigo]);
  }

  return (
    <Moldura
      testId="tela-trocar-senha"
      titulo="Defina uma nova senha"
      descricao={`Olá, ${sessao.usuario.nome}. A sua senha é temporária: defina uma nova senha para continuar.`}
    >
      <form onSubmit={enviar} noValidate className="grid gap-4">
        <AlertaErro mensagem={erro} />
        <FieldGroup>
          <CampoTexto
            rotulo="Senha atual"
            autoComplete="current-password"
            autoFocus
            {...campo("senhaAtual")}
          />
          <CampoTexto
            rotulo="Nova senha"
            autoComplete="new-password"
            descricao="Ao menos 8 caracteres, diferente do e-mail."
            {...campo("novaSenha")}
          />
          <CampoTexto
            rotulo="Confirme a nova senha"
            autoComplete="new-password"
            {...campo("confirmacao")}
          />
        </FieldGroup>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar nova senha"}
        </Button>
        <Button type="button" variant="ghost" onClick={aoSair} disabled={enviando}>
          Sair (Esc)
        </Button>
      </form>
    </Moldura>
  );
}
