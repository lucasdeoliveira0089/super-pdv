"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@super-pdv/ui/components/alert";
import { Button } from "@super-pdv/ui/components/button";

/** Botão de envio que fica desabilitado enquanto a Server Action executa. */
export function BotaoEnviar({
  children,
  pendente = "Enviando…",
  ...props
}: React.ComponentProps<typeof Button> & { pendente?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending ? pendente : children}
    </Button>
  );
}

/** Exibe uma senha temporária UMA vez, com botão de copiar. */
export function SenhaTemporaria({ senha, para }: { senha: string; para: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <Alert data-testid="senha-temporaria">
      <AlertTitle>Senha temporária de {para}</AlertTitle>
      <AlertDescription className="grid gap-2">
        <div className="flex items-center gap-2">
          <code
            className="bg-muted rounded px-2 py-1 font-mono text-base"
            data-testid="senha-valor"
          >
            {senha}
          </code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(senha);
              setCopiado(true);
            }}
          >
            {copiado ? <CheckIcon /> : <CopyIcon />}
            {copiado ? "Copiada" : "Copiar"}
          </Button>
        </div>
        <span>
          Ela não será exibida novamente. No primeiro acesso, será pedido que {para} defina uma nova
          senha.
        </span>
      </AlertDescription>
    </Alert>
  );
}
