import { type ReactNode, useEffect, useState } from "react";
import { Badge } from "@super-pdv/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@super-pdv/ui/components/card";
import type { LocalDbStatus } from "../../shared/ipc";

/** Cartão centralizado usado pelas telas de acesso. */
export function Moldura({
  titulo,
  descricao,
  rodape,
  children,
  testId,
}: {
  titulo: string;
  descricao?: ReactNode;
  rodape?: ReactNode;
  children?: ReactNode;
  testId?: string;
}) {
  return (
    <main className="flex min-h-svh items-center justify-center p-6 font-sans">
      <Card className="w-full max-w-md" data-testid={testId}>
        <CardHeader>
          <CardTitle>
            <h1>{titulo}</h1>
          </CardTitle>
          {descricao && <CardDescription>{descricao}</CardDescription>}
        </CardHeader>
        {children && <CardContent>{children}</CardContent>}
        {rodape && <CardFooter className="flex flex-wrap gap-2">{rodape}</CardFooter>}
      </Card>
    </main>
  );
}

export function IndicadorBancoLocal() {
  const [status, setStatus] = useState<LocalDbStatus | null>(null);

  useEffect(() => {
    window.superPdv.localDb
      .status()
      .then(setStatus)
      .catch(() => setStatus({ status: "indisponivel" }));
  }, []);

  if (!status) {
    return <Badge variant="outline">Banco local: verificando…</Badge>;
  }
  if (status.status === "operante") {
    return (
      <Badge data-testid="local-db-status" data-status="operante">
        Banco local: operante (SQLite {status.sqliteVersion})
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" data-testid="local-db-status" data-status="indisponivel">
      Banco local: indisponível
    </Badge>
  );
}
