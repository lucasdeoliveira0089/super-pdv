import { type FormEvent, useRef, useState } from "react";
import { Button } from "@super-pdv/ui/components/button";
import { AlertaErro, CampoTexto } from "@super-pdv/ui/components/campos";
import { FieldGroup } from "@super-pdv/ui/components/field";
import { loginRequestSchema } from "@super-pdv/shared";
import type { SessaoPdv } from "../../../shared/ipc";
import { Moldura } from "../componentes";
import { chamar } from "../util";
import { type AvisoLogin, MENSAGEM_ERRO } from "../fluxo";

type ErrosCampos = { email?: string[]; senha?: string[] };

export function TelaLogin({
  aviso,
  aoEntrar,
}: {
  aviso?: AvisoLogin;
  aoEntrar: (sessao: SessaoPdv) => void;
}) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | undefined>(aviso && MENSAGEM_ERRO[aviso]);
  const [erros, setErros] = useState<ErrosCampos>({});
  const [enviando, setEnviando] = useState(false);
  const campoSenha = useRef<HTMLInputElement>(null);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (enviando) return;
    const validacao = loginRequestSchema.safeParse({ email, senha });
    if (!validacao.success) {
      const porCampo: ErrosCampos = {};
      for (const i of validacao.error.issues) {
        const campo = i.path[0] as keyof ErrosCampos;
        (porCampo[campo] ??= []).push(i.message);
      }
      setErros(porCampo);
      return;
    }
    setErros({});
    setErro(undefined);
    setEnviando(true);
    const resultado = await chamar(() => window.superPdv.auth.entrar(email, senha));
    setEnviando(false);
    if (resultado.ok) {
      aoEntrar(resultado.valor);
      return;
    }
    // Mantém o e-mail e volta o foco para a senha.
    setErro(MENSAGEM_ERRO[resultado.erro.codigo]);
    setSenha("");
    campoSenha.current?.focus();
  }

  return (
    <Moldura
      testId="tela-login"
      titulo="Super PDV — Caixa"
      descricao="Entre com o mesmo e-mail e senha do gestor."
    >
      <form onSubmit={enviar} noValidate className="grid gap-4">
        <AlertaErro mensagem={erro} />
        <FieldGroup>
          <CampoTexto
            name="email"
            rotulo="E-mail"
            type="email"
            autoComplete="username"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            erros={erros.email}
          />
          <CampoTexto
            name="senha"
            rotulo="Senha"
            type="password"
            autoComplete="current-password"
            ref={campoSenha}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            erros={erros.senha}
          />
        </FieldGroup>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </Button>
        <Button
          type="button"
          variant="link"
          onClick={() => void window.superPdv.auth.abrirRecuperacaoSenha()}
        >
          Esqueci minha senha
        </Button>
      </form>
    </Moldura>
  );
}
