import {
  empresaSchema,
  podeGerenciarUsuario,
  ROTULO_PAPEL,
  usuarioSchema,
} from "@super-pdv/shared";
import { Badge } from "@super-pdv/ui/components/badge";
import { carregar } from "@super-pdv/web-session";
import { CabecalhoPagina } from "@super-pdv/web-session/telas";
import { api, idsDeEmpresas, usuarioLogado } from "../../../../lib/sessao";
import { AcoesUsuario } from "../formularios";

export default async function UsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const eu = await usuarioLogado();
  const cliente = await api();
  const [usuario, empresas] = await Promise.all([
    carregar(() => cliente.requisitar("GET", `/v1/usuarios/${id}`, { schema: usuarioSchema })),
    carregar(() => cliente.requisitar("GET", "/v1/empresas", { schema: empresaSchema.array() })),
  ]);
  const nomes = new Map(empresas.map((e) => [e.id, e.nomeFantasia]));
  const pode =
    usuario.id !== eu.id &&
    podeGerenciarUsuario({ papel: eu.papel, empresaIds: idsDeEmpresas(eu) }, usuario);

  return (
    <>
      <CabecalhoPagina
        titulo={usuario.nome}
        descricao={usuario.email}
        acoes={
          <Badge variant={usuario.ativo ? "secondary" : "outline"}>
            {usuario.ativo ? "Ativo" : "Inativo"}
          </Badge>
        }
      />
      <dl className="mb-6 grid max-w-xl grid-cols-[8rem_1fr] gap-2 text-sm">
        <dt className="text-muted-foreground">Papel</dt>
        <dd>{ROTULO_PAPEL[usuario.papel]}</dd>
        <dt className="text-muted-foreground">Empresas</dt>
        <dd>
          {usuario.papel === "dono" || usuario.papel === "administrador"
            ? "Todas as empresas"
            : usuario.empresaIds.map((e) => nomes.get(e) ?? "—").join(", ")}
        </dd>
        <dt className="text-muted-foreground">Senha</dt>
        <dd>
          {usuario.senhaTemporaria ? "Temporária (ainda não trocada)" : "Definida pelo usuário"}
        </dd>
      </dl>
      {pode && <AcoesUsuario usuario={usuario} />}
    </>
  );
}
