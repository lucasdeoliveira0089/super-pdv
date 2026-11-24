import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@super-pdv/ui/components/card";
import { FieldGroup } from "@super-pdv/ui/components/field";

/**
 * Seção de formulário em cartão: título (h2), descrição curta e os campos.
 * Leitores de tela anunciam a seção pelo título (`<section aria-labelledby>`).
 */
function SecaoFormulario({
  titulo,
  descricao,
  children,
  ...props
}: Omit<React.ComponentProps<"section">, "title"> & {
  titulo: string;
  descricao?: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <section aria-labelledby={id} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 id={id} className="text-base font-semibold">
              {titulo}
            </h2>
          </CardTitle>
          {descricao && <CardDescription>{descricao}</CardDescription>}
        </CardHeader>
        <CardContent>
          <FieldGroup>{children}</FieldGroup>
        </CardContent>
      </Card>
    </section>
  );
}

export { SecaoFormulario };
