"use client";

import { mascararCnpj } from "@super-pdv/shared";
import { CampoTexto } from "@super-pdv/ui/components/campos";
import { useState } from "react";

/**
 * CNPJ com máscara `XX.XXX.XXX/XXXX-XX` durante a digitação: letras e números
 * nas 12 primeiras posições (letras em maiúsculas) e números nos 2 dígitos
 * verificadores (spec organization-structure). A validação continua no zod/API.
 */
export function CampoCnpj({
  defaultValue = "",
  ...props
}: {
  name: string;
  defaultValue?: string;
  erros?: string[];
  obrigatorio?: boolean;
  autoFocus?: boolean;
}) {
  const [valor, setValor] = useState(() => mascararCnpj(defaultValue));
  return (
    <CampoTexto
      rotulo="CNPJ"
      inputMode="text"
      autoCapitalize="characters"
      autoComplete="off"
      spellCheck={false}
      placeholder="00.000.000/0000-00"
      value={valor}
      onChange={(e) => setValor(mascararCnpj(e.target.value))}
      {...props}
    />
  );
}
