import { CabecalhoPagina } from "@super-pdv/web-session/telas";
import { FormNovoCliente } from "../formularios";

export const metadata = { title: "Novo cliente — Admin Super PDV" };

export default function NovoClientePage() {
  return (
    <>
      <CabecalhoPagina
        titulo="Novo cliente"
        descricao="Cadastra a primeira empresa com o endereço, o responsável pelo cliente e o usuário Dono, que recebe uma senha temporária."
      />
      <FormNovoCliente />
    </>
  );
}
