import { CabecalhoPagina } from "@super-pdv/web-session/telas";
import Link from "next/link";

export const metadata = { title: "Acesso negado — Gestor Super PDV" };

export default function AcessoNegadoPage() {
  return (
    <>
      <CabecalhoPagina
        titulo="Acesso negado"
        descricao="O seu perfil não tem permissão para acessar esta página."
      />
      <Link href="/" className="text-sm underline-offset-4 hover:underline">
        Voltar ao início
      </Link>
    </>
  );
}
