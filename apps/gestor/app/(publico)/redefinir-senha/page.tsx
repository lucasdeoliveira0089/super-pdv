import { FormRedefinirSenha, TelaAutenticacao } from "@super-pdv/web-session/telas";
import { confirmarRecuperacao } from "../../acoes-auth";

export const metadata = { title: "Redefinir senha — Gestor Super PDV" };

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return (
    <TelaAutenticacao contexto="Gestor das suas empresas" titulo="Criar nova senha">
      <FormRedefinirSenha acao={confirmarRecuperacao} token={token} />
    </TelaAutenticacao>
  );
}
