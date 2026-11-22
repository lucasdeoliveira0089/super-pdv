import { Button } from "@super-pdv/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@super-pdv/ui/components/card";
import { type EmpresaResumo, formatarCnpj, ROTULO_PAPEL } from "@super-pdv/shared";
import type { SessaoPdv } from "../../../shared/ipc";
import { IndicadorBancoLocal } from "../componentes";

/** Tela principal: empresa em operação, operador e estado do caixa. */
export function TelaPrincipal({
  sessao,
  empresa,
  aoTrocarEmpresa,
  aoSair,
}: {
  sessao: SessaoPdv;
  empresa: EmpresaResumo;
  aoTrocarEmpresa: () => void;
  aoSair: () => void;
}) {
  const variasEmpresas = sessao.empresas.length > 1;
  return (
    <div className="flex min-h-svh flex-col font-sans">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold" data-testid="empresa-nome">
            {empresa.nomeFantasia}
          </h1>
          <p className="text-muted-foreground text-sm" data-testid="empresa-cnpj">
            CNPJ {formatarCnpj(empresa.cnpj)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm" data-testid="usuario-logado">
            {sessao.usuario.nome}
            <span className="text-muted-foreground"> · {ROTULO_PAPEL[sessao.usuario.papel]}</span>
          </span>
          {variasEmpresas && (
            <Button variant="outline" onClick={aoTrocarEmpresa}>
              Trocar empresa
            </Button>
          )}
          <Button variant="ghost" onClick={aoSair}>
            Sair
          </Button>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md" data-testid="pdv-principal">
          <CardHeader>
            <CardTitle>Super PDV — Caixa</CardTitle>
            <CardDescription>
              {sessao.cliente.nome} · {empresa.razaoSocial}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <IndicadorBancoLocal />
            <p className="text-muted-foreground text-sm">
              A abertura de caixa e as vendas chegam nas próximas versões.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
