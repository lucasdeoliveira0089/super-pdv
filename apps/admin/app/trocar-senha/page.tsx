import { FormTrocarSenha, TelaAutenticacao } from "@super-pdv/web-session/telas";
import { membroLogado } from "../../lib/sessao";
import { trocarSenha } from "../acoes-auth";

export const metadata = { title: "Trocar senha — Admin Super PDV" };

export default async function TrocarSenhaPage() {
  const membro = await membroLogado({ permitirSenhaTemporaria: true });
  return (
    <TelaAutenticacao
      titulo={membro.senhaTemporaria ? "Defina a sua senha" : "Trocar senha"}
      descricao={
        membro.senhaTemporaria
          ? "Você entrou com uma senha temporária. Defina uma nova senha para continuar."
          : undefined
      }
    >
      <FormTrocarSenha acao={trocarSenha} />
    </TelaAutenticacao>
  );
}
