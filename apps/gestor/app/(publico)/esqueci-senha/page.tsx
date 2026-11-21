import Link from "next/link";
import { FormEsqueciSenha, TelaAutenticacao } from "@super-pdv/web-session/telas";
import { solicitarRecuperacao } from "../../acoes-auth";

export const metadata = { title: "Esqueci minha senha — Gestor Super PDV" };

export default function EsqueciSenhaPage() {
  return (
    <TelaAutenticacao
      titulo="Esqueci minha senha"
      descricao="Informe o seu e-mail para receber um link de redefinição."
      rodape={
        <Link href="/login" className="underline-offset-4 hover:underline">
          Voltar ao login
        </Link>
      }
    >
      <FormEsqueciSenha acao={solicitarRecuperacao} />
    </TelaAutenticacao>
  );
}
