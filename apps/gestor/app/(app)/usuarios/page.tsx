import { empresaSchema, usuarioSchema } from "@super-pdv/shared";
import { Button } from "@super-pdv/ui/components/button";
import { carregar } from "@super-pdv/web-session";
import { CabecalhoPagina } from "@super-pdv/web-session/telas";
import Link from "next/link";
import { api, exigirPermissao, usuarioLogado } from "../../../lib/sessao";
import { TabelaUsuarios } from "../tabelas";

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
      <TabelaUsuarios usuarios={usuarios} empresas={empresas} />
    </>
  );
}
