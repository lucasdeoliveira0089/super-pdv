import { FormTrocarSenha, TelaAutenticacao } from "@super-pdv/web-session/telas";
import { usuarioLogado } from "../../lib/sessao";
import { trocarSenha } from "../acoes-auth";

export const metadata = { title: "Trocar senha — Gestor Super PDV" };

export default async function TrocarSenhaPage() {
  const usuario = await usuarioLogado({ permitirSenhaTemporaria: true });
  return (
    <TelaAutenticacao
      titulo={usuario.senhaTemporaria ? "Defina a sua senha" : "Trocar senha"}
      descricao={
        usuario.senhaTemporaria
          ? "Você entrou com uma senha temporária. Defina uma nova senha para continuar."
          : undefined
      }
    >
      <FormTrocarSenha acao={trocarSenha} />
    </TelaAutenticacao>
  );
}
