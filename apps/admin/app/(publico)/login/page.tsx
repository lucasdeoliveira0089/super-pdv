import { destinoSeguro } from "@super-pdv/web-session";
import { FormLogin, TelaAutenticacao } from "@super-pdv/web-session/telas";
import { entrar } from "../../acoes-auth";

export const metadata = { title: "Entrar — Admin Super PDV" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; redefinida?: string }>;
}) {
  const { next, redefinida } = await searchParams;
  return (
    <TelaAutenticacao
      contexto="Admin da equipe Super PDV"
      titulo="Admin Super PDV"
      descricao="Acesso da equipe Super PDV."
    >
      <FormLogin
        acao={entrar}
        destino={destinoSeguro(next)}
        aviso={redefinida ? "Senha redefinida. Entre com a nova senha." : undefined}
      />
    </TelaAutenticacao>
  );
}
