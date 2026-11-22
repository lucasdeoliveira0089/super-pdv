"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListFilterIcon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@super-pdv/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@super-pdv/ui/components/dropdown-menu";
import { Input } from "@super-pdv/ui/components/input";

// Barra de busca e filtros das listagens (spec web-layout, design D4): os valores
// ficam no endereço (?busca=...&papel=...) e a página, no servidor, consulta a
// API com eles. Recarregar ou compartilhar o link mantém o resultado.

export interface FiltroBarra {
  /** Parâmetro no endereço (ex.: "papel"). */
  nome: string;
  rotulo: string;
  opcoes: { valor: string; rotulo: string }[];
}

export interface BuscaBarra {
  /** Parâmetro no endereço (ex.: "busca"). */
  nome: string;
  rotulo: string;
  placeholder?: string;
}

export const ATRASO_BUSCA_MS = 300;

export function BarraFiltros({
  busca,
  filtros = [],
}: {
  busca?: BuscaBarra;
  filtros?: FiltroBarra[];
}) {
  const router = useRouter();
  const caminho = usePathname();
  const params = useSearchParams();
  const [, iniciar] = useTransition();

  const textoNoEndereco = busca ? (params.get(busca.nome) ?? "") : "";
  const [texto, setTexto] = useState(textoNoEndereco);
  const ultimoEnviado = useRef(textoNoEndereco);

  // Endereço mudou por fora (ex.: "Limpar filtros", voltar): acompanha o campo.
  useEffect(() => {
    if (textoNoEndereco !== ultimoEnviado.current) {
      ultimoEnviado.current = textoNoEndereco;
      setTexto(textoNoEndereco);
    }
  }, [textoNoEndereco]);

  function navegar(mudancas: Record<string, string | null>) {
    const novos = new URLSearchParams(params.toString());
    for (const [nome, valor] of Object.entries(mudancas)) {
      if (valor) novos.set(nome, valor);
      else novos.delete(nome);
    }
    const query = novos.toString();
    iniciar(() => router.replace(query ? `${caminho}?${query}` : caminho, { scroll: false }));
  }

  // Busca com atraso: só consulta depois que a pessoa para de digitar.
  useEffect(() => {
    if (!busca) return;
    const valor = texto.trim();
    if (valor === ultimoEnviado.current) return;
    const t = setTimeout(() => {
      ultimoEnviado.current = valor;
      navegar({ [busca.nome]: valor || null });
    }, ATRASO_BUSCA_MS);
    return () => clearTimeout(t);
    // `navegar` usa o endereço atual; o efeito só reage ao texto digitado.
  }, [texto, busca?.nome]);

  const nomes = [...(busca ? [busca.nome] : []), ...filtros.map((f) => f.nome)];
  const algumAtivo = nomes.some((n) => params.get(n));

  return (
    <>
      {busca && (
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          />
          <Input
            type="search"
            aria-label={busca.rotulo}
            placeholder={busca.placeholder ?? busca.rotulo}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="pl-8"
          />
        </div>
      )}
      {filtros.map((filtro) => {
        const atual = params.get(filtro.nome) ?? "";
        const escolhida = filtro.opcoes.find((o) => o.valor === atual && o.valor !== "");
        return (
          <DropdownMenu key={filtro.nome}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                aria-label={`Filtrar por ${filtro.rotulo.toLowerCase()}${escolhida ? `: ${escolhida.rotulo}` : ""}`}
                data-ativo={escolhida ? "" : undefined}
                className="data-ativo:border-primary/60"
              >
                <ListFilterIcon />
                {filtro.rotulo}
                {escolhida && (
                  <span className="bg-primary/10 text-primary rounded px-1.5 text-xs font-medium">
                    {escolhida.rotulo}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-48">
              <DropdownMenuLabel>{filtro.rotulo}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={atual}
                onValueChange={(valor) => navegar({ [filtro.nome]: valor || null })}
              >
                {filtro.opcoes.map((opcao) => (
                  <DropdownMenuRadioItem key={opcao.valor} value={opcao.valor}>
                    {opcao.rotulo}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
      {algumAtivo && (
        <Button
          variant="ghost"
          onClick={() => {
            ultimoEnviado.current = "";
            setTexto("");
            navegar(Object.fromEntries(nomes.map((n) => [n, null])));
          }}
        >
          <XIcon />
          Limpar filtros
        </Button>
      )}
    </>
  );
}
