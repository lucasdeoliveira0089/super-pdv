import { CabecalhoPagina } from "@super-pdv/web-session/telas";
import { FormNovoCliente } from "../formularios";

export const metadata = { title: "Novo cliente — Admin Super PDV" };

export default function NovoClientePage() {
  return (
    <>
      <CabecalhoPagina
        titulo="Novo cliente"
        descricao="Cadastre o cliente que acabou de contratar o Super PDV. O acesso do Dono é criado em seguida, no detalhe do cliente."
      />
      <FormNovoCliente />
    </>
  );
}
