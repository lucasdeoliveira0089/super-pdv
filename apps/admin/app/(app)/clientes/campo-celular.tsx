"use client";

import { mascararCelular } from "@super-pdv/shared";
import { CampoTexto } from "@super-pdv/ui/components/campos";
import { useState } from "react";

/**
 * Celular com máscara `(XX) XXXXX-XXXX` durante a digitação, como o CNPJ:
 * só números (até 11 dígitos), ignorando o `+55` de um número colado
 * (spec client-provisioning). A validação continua no zod/API.
 */
export function CampoCelular({
  defaultValue = "",
  ...props
}: {
  name: string;
  defaultValue?: string;
  erros?: string[];
  obrigatorio?: boolean;
}) {
  const [valor, setValor] = useState(() => mascararCelular(defaultValue));
  return (
    <CampoTexto
      rotulo="Celular"
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder="(11) 98765-4321"
      value={valor}
      onChange={(e) => setValor(mascararCelular(e.target.value))}
      {...props}
    />
  );
}
