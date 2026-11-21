import { destinoSeguro } from "@super-pdv/web-session";
import { FormLogin, TelaAutenticacao } from "@super-pdv/web-session/telas";
import { entrar } from "../../acoes-auth";

export const metadata = { title: "Entrar — Gestor Super PDV" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; redefinida?: string }>;
}) {
  const { next, redefinida } = await searchParams;
  return (
    <TelaAutenticacao titulo="Gestor Super PDV" descricao="Gestão das suas empresas e usuários.">
      <FormLogin
        acao={entrar}
        destino={destinoSeguro(next)}
        aviso={redefinida ? "Senha redefinida. Entre com a nova senha." : undefined}
      />
    </TelaAutenticacao>
  );
}
