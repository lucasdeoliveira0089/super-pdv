import { membroEquipeSchema } from "@super-pdv/shared";
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
import { api, membroLogado } from "../../../lib/sessao";
import { AcoesMembro, FormNovoMembro } from "./formularios";

export const metadata = { title: "Equipe — Admin Super PDV" };

export default async function EquipePage() {
  const [eu, membros] = await Promise.all([
    membroLogado(),
    carregar(async () =>
      (await api()).requisitar("GET", "/v1/admin/equipe", { schema: membroEquipeSchema.array() }),
    ),
  ]);
  return (
    <>
      <CabecalhoPagina titulo="Equipe Super PDV" descricao="Quem tem acesso a este admin." />
      <section className="mb-8">
        <h2 className="mb-3 font-semibold">Novo membro</h2>
        <FormNovoMembro />
      </section>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {membros.map((m) => (
            <TableRow key={m.id} data-testid={`membro-${m.email}`}>
              <TableCell className="font-medium">{m.nome}</TableCell>
              <TableCell>{m.email}</TableCell>
              <TableCell>
                <Badge variant={m.ativo ? "secondary" : "outline"}>
                  {m.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </TableCell>
              <TableCell>
                <AcoesMembro id={m.id} nome={m.nome} ativo={m.ativo} euMesmo={m.id === eu.id} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
