import { CabecalhoPagina } from "@super-pdv/web-session/telas";
import { FormNovoCliente } from "../formularios";

export const metadata = { title: "Novo cliente — Admin Super PDV" };

export default function NovoClientePage() {
  return (
    <>
      <CabecalhoPagina
        titulo="Novo cliente"
        descricao="Cadastra a primeira empresa com o endereço e o responsável pelo cliente. O Dono é cadastrado depois, no detalhe do cliente."
      />
      <FormNovoCliente />
    </>
  );
}
