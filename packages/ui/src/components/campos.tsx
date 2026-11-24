import type * as React from "react";
import { cn } from "cn";
import { Alert, AlertDescription, AlertTitle } from "@super-pdv/ui/components/alert";
import { Field, FieldDescription, FieldError, FieldLabel } from "@super-pdv/ui/components/field";
import { Input } from "@super-pdv/ui/components/input";

// Campos de formulário com rótulo e mensagens de erro acessíveis, usados com
// Server Actions (os valores vão no FormData pelo atributo `name`).

interface BaseCampo {
  name: string;
  rotulo: string;
  erros?: string[];
  descricao?: string;
  /** Marca o rótulo com asterisco e anuncia o campo como obrigatório (aria-required). */
  obrigatorio?: boolean;
}

/** Rótulo com o asterisco de obrigatório (só visual; o anúncio vem do aria-required). */
function Rotulo({
  id,
  rotulo,
  obrigatorio,
}: {
  id: string;
  rotulo: string;
  obrigatorio?: boolean;
}) {
  return (
    <FieldLabel htmlFor={id}>
      {rotulo}
      {obrigatorio && (
        <span aria-hidden="true" className="text-destructive">
          *
        </span>
      )}
    </FieldLabel>
  );
}

function Erros({ erros }: { erros?: string[] }) {
  if (!erros?.length) return null;
  return <FieldError>{erros.join(" ")}</FieldError>;
}

export function CampoTexto({
  name,
  rotulo,
  erros,
  descricao,
  obrigatorio,
  id = name,
  ...input
}: BaseCampo & Omit<React.ComponentProps<"input">, "name">) {
  const invalido = !!erros?.length;
  return (
    <Field data-invalid={invalido || undefined}>
      <Rotulo id={id} rotulo={rotulo} obrigatorio={obrigatorio} />
      <Input
        id={id}
        name={name}
        aria-invalid={invalido || undefined}
        aria-required={obrigatorio || undefined}
        {...input}
      />
      {descricao && <FieldDescription>{descricao}</FieldDescription>}
      <Erros erros={erros} />
    </Field>
  );
}

export function CampoSelecao({
  name,
  rotulo,
  erros,
  descricao,
  opcoes,
  obrigatorio,
  id = name,
  className,
  ...select
}: BaseCampo & {
  opcoes: { valor: string; rotulo: string }[];
} & Omit<React.ComponentProps<"select">, "name">) {
  const invalido = !!erros?.length;
  return (
    <Field data-invalid={invalido || undefined}>
      <Rotulo id={id} rotulo={rotulo} obrigatorio={obrigatorio} />
      <select
        id={id}
        name={name}
        aria-invalid={invalido || undefined}
        aria-required={obrigatorio || undefined}
        className={cn(
          "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3 disabled:opacity-50",
          className,
        )}
        {...select}
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
      {descricao && <FieldDescription>{descricao}</FieldDescription>}
      <Erros erros={erros} />
    </Field>
  );
}

/** Lista de caixas de seleção com o mesmo `name` (vários valores no FormData). */
export function CampoOpcoes({
  name,
  rotulo,
  erros,
  descricao,
  opcoes,
  selecionados = [],
}: BaseCampo & { opcoes: { valor: string; rotulo: string }[]; selecionados?: string[] }) {
  const invalido = !!erros?.length;
  return (
    <fieldset className="grid gap-2" aria-invalid={invalido || undefined}>
      <legend className="mb-1 text-sm font-medium">{rotulo}</legend>
      {opcoes.map((o) => (
        <label key={o.valor} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name={name}
            value={o.valor}
            defaultChecked={selecionados.includes(o.valor)}
            className="accent-primary size-4"
          />
          {o.rotulo}
        </label>
      ))}
      {descricao && <p className="text-muted-foreground text-sm">{descricao}</p>}
      <Erros erros={erros} />
    </fieldset>
  );
}

export function AlertaErro({ mensagem, titulo }: { mensagem?: string; titulo?: string }) {
  if (!mensagem) return null;
  return (
    <Alert variant="destructive">
      {titulo && <AlertTitle>{titulo}</AlertTitle>}
      <AlertDescription>{mensagem}</AlertDescription>
    </Alert>
  );
}

export function AlertaSucesso({ mensagem, titulo }: { mensagem?: string; titulo?: string }) {
  if (!mensagem) return null;
  return (
    <Alert>
      {titulo && <AlertTitle>{titulo}</AlertTitle>}
      <AlertDescription>{mensagem}</AlertDescription>
    </Alert>
  );
}
