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

export default function HomePage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md" data-testid="admin-welcome">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Super PDV — Administração</CardTitle>
            <Badge variant="secondary">Em construção</Badge>
          </div>
          <CardDescription>Painel de gestão do negócio.</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          A estrutura do monorepo está pronta. As telas de gestão chegam nas próximas mudanças.
        </CardContent>
        <CardFooter>
          <Button>Começar</Button>
        </CardFooter>
      </Card>
    </main>
  );
}
