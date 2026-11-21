import { useEffect, useState } from "react";
import { Badge } from "@super-pdv/ui/components/badge";
import { Button } from "@super-pdv/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@super-pdv/ui/components/card";
import type { LocalDbStatus } from "../../shared/ipc";

export function App() {
  const [localDb, setLocalDb] = useState<LocalDbStatus | null>(null);

  useEffect(() => {
    window.superPdv.localDb
      .status()
      .then(setLocalDb)
      .catch(() => setLocalDb({ status: "indisponivel" }));
  }, []);

  return (
    <main className="flex min-h-svh items-center justify-center p-6 font-sans">
      <Card className="w-full max-w-md" data-testid="pdv-welcome">
        <CardHeader>
          <CardTitle>Super PDV — Caixa</CardTitle>
          <CardDescription>Ponto de venda.</CardDescription>
        </CardHeader>
        <CardContent>
          <LocalDbIndicator status={localDb} />
        </CardContent>
        <CardFooter>
          <Button autoFocus>Abrir caixa</Button>
        </CardFooter>
      </Card>
    </main>
  );
}

function LocalDbIndicator({ status }: { status: LocalDbStatus | null }) {
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
