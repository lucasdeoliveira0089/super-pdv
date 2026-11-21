import { empresaSchema, PAPEIS, ROTULO_PAPEL, usuarioSchema } from "@super-pdv/shared";
import { Badge } from "@super-pdv/ui/components/badge";
import { Button } from "@super-pdv/ui/components/button";
import { CampoSelecao } from "@super-pdv/ui/components/campos";
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
import Link from "next/link";
import { api, exigirPermissao, usuarioLogado } from "../../../lib/sessao";

export const metadata = { title: "Usuários — Gestor Super PDV" };

interface Filtros {
  papel?: string;
  empresaId?: string;
  ativo?: string;
}

export default async function UsuariosPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  const eu = await usuarioLogado();
  exigirPermissao(eu, "usuario.ler");
  const filtros = await searchParams;
  const query = new URLSearchParams(
    Object.entries(filtros).filter(([, v]) => typeof v === "string" && v !== "") as [
      string,
      string,
    ][],
  ).toString();

  const cliente = await api();
  const [usuarios, empresas] = await Promise.all([
    carregar(() =>
      cliente.requisitar("GET", `/v1/usuarios${query ? `?${query}` : ""}`, {
        schema: usuarioSchema.array(),
      }),
    ),
    carregar(() => cliente.requisitar("GET", "/v1/empresas", { schema: empresaSchema.array() })),
  ]);
  const nomeEmpresa = new Map(empresas.map((e) => [e.id, e.nomeFantasia]));
  const podeCadastrar =
    eu.permissoes.includes("usuario.gerenciar") ||
    eu.permissoes.includes("usuario.gerenciar_operadores");

  return (
    <>
      <CabecalhoPagina
        titulo="Usuários"
        descricao="Quem usa o gestor e o PDV."
        acoes={
          podeCadastrar && (
            <Button asChild>
              <Link href="/usuarios/novo">Novo usuário</Link>
            </Button>
          )
        }
      />
      <form className="mb-4 grid max-w-3xl gap-3 sm:grid-cols-4 sm:items-end" aria-label="Filtros">
        <CampoSelecao
          name="papel"
          rotulo="Papel"
          defaultValue={filtros.papel ?? ""}
          opcoes={[
            { valor: "", rotulo: "Todos" },
            ...PAPEIS.map((p) => ({ valor: p, rotulo: ROTULO_PAPEL[p] })),
          ]}
        />
        <CampoSelecao
          name="empresaId"
          rotulo="Empresa"
          defaultValue={filtros.empresaId ?? ""}
          opcoes={[
            { valor: "", rotulo: "Todas" },
            ...empresas.map((e) => ({ valor: e.id, rotulo: e.nomeFantasia })),
          ]}
        />
        <CampoSelecao
          name="ativo"
          rotulo="Situação"
          defaultValue={filtros.ativo ?? ""}
          opcoes={[
            { valor: "", rotulo: "Todas" },
            { valor: "true", rotulo: "Ativos" },
            { valor: "false", rotulo: "Inativos" },
          ]}
        />
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Papel</TableHead>
            <TableHead>Empresas</TableHead>
            <TableHead>Situação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usuarios.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground">
                Nenhum usuário encontrado.
              </TableCell>
            </TableRow>
          )}
          {usuarios.map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                <Link
                  href={`/usuarios/${u.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {u.nome}
                </Link>
              </TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{ROTULO_PAPEL[u.papel]}</TableCell>
              <TableCell>
                {u.papel === "dono" || u.papel === "administrador"
                  ? "Todas"
                  : u.empresaIds.map((id) => nomeEmpresa.get(id) ?? "—").join(", ")}
              </TableCell>
              <TableCell>
                <Badge variant={u.ativo ? "secondary" : "outline"}>
                  {u.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
