import { CabecalhoPagina } from "@super-pdv/web-session/telas";
import { FormNovoCliente } from "../formularios";

export const metadata = { title: "Novo cliente — Admin Super PDV" };

export default function NovoClientePage() {
  return (
    <>
      <CabecalhoPagina titulo="Novo cliente" descricao="Cadastre um novo cliente" />
      <FormNovoCliente />
    </>
  );
}
