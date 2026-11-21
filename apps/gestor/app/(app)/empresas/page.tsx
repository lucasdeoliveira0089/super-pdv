import { empresaSchema, formatarCnpj } from "@super-pdv/shared";
import { Badge } from "@super-pdv/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@super-pdv/ui/components/table";
import { carregar } from "@super-pdv/web-session";
import { CabecalhoPagina } from "@super-pdv/web-session/telas";
import { api, exigirPermissao, usuarioLogado } from "../../../lib/sessao";

export const metadata = { title: "Empresas — Gestor Super PDV" };

export default async function EmpresasPage() {
  exigirPermissao(await usuarioLogado(), "empresa.ler");
  const empresas = await carregar(async () =>
    (await api()).requisitar("GET", "/v1/empresas", { schema: empresaSchema.array() }),
  );
  return (
    <>
      <CabecalhoPagina
        titulo="Empresas"
        descricao="Para adicionar ou alterar empresas, fale com a equipe Super PDV."
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome fantasia</TableHead>
            <TableHead>CNPJ</TableHead>
            <TableHead>Razão social</TableHead>
            <TableHead>Situação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {empresas.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="font-medium">{e.nomeFantasia}</TableCell>
              <TableCell>{formatarCnpj(e.cnpj)}</TableCell>
              <TableCell>{e.razaoSocial}</TableCell>
              <TableCell>
                <Badge variant={e.ativa ? "secondary" : "outline"}>
                  {e.ativa ? "Ativa" : "Inativa"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
