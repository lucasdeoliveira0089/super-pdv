"use client";

import { type Endereco, formatarCep, normalizarCep, UFS } from "@super-pdv/shared";
import { CampoSelecao, CampoTexto } from "@super-pdv/ui/components/campos";
import { FieldGroup, FieldLegend, FieldSet } from "@super-pdv/ui/components/field";
import { SecaoFormulario } from "@super-pdv/ui/components/secao-formulario";
import { useEffect, useReducer, useRef, useState } from "react";

type Campo = "cep" | "logradouro" | "numero" | "complemento" | "bairro" | "cidade" | "uf";
type Valores = Record<Campo, string>;
/** Campos que a busca por CEP preenche. */
type CampoDoCep = "logradouro" | "bairro" | "cidade" | "uf";

const VAZIO: Valores = {
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
};

/** Valores iniciais a partir do endereço salvo (com máscara no CEP). */
export function valoresDoEndereco(e: Endereco | null | undefined): Partial<Valores> {
  if (!e) return {};
  return { ...e, cep: formatarCep(e.cep), complemento: e.complemento ?? "" };
}

/**
 * Campos de endereço de uma empresa. Ao completar 8 dígitos no CEP, consulta
 * `/api/cep` e preenche logradouro, bairro, cidade e UF — sem sobrescrever o
 * que a equipe já digitou — e leva o foco para o número. Se a busca falhar,
 * os campos seguem livres para preenchimento manual.
 *
 * Os valores vão no FormData com os nomes `cep`, `logradouro`, `numero`, etc.
 */
export function CamposEndereco({
  valores,
  erros,
  legenda = "Endereço da empresa",
  cartao = false,
}: {
  valores?: Partial<Valores>;
  /** Erros por campo do endereço (chaves `cep`, `logradouro`...). */
  erros?: Partial<Record<Campo, string[]>>;
  /** Legenda da apresentação em fieldset (ignorada no cartão). */
  legenda?: string;
  /** Apresenta em cartão "Localização", com os campos obrigatórios marcados. */
  cartao?: boolean;
}) {
  const [v, setV] = useState<Valores>({ ...VAZIO, ...valores });
  // Campos que a equipe editou à mão: a busca por CEP não os sobrescreve.
  const editados = useRef(new Set<Campo>());
  const ultimoCep = useRef(normalizarCep(valores?.cep ?? ""));
  const numero = useRef<HTMLInputElement>(null);
  // Elemento comum às duas apresentações, para achar o formulário.
  const grupo = useRef<HTMLDivElement>(null);

  // Depois de cada envio, o React 19 chama `form.reset()`. Inputs controlados
  // resistem (o React sincroniza o atributo value), mas o <select> da UF volta à
  // primeira opção: uma nova renderização reaplica a opção do estado. O evento
  // "reset" dispara antes de o formulário ser limpo, daí o setTimeout.
  const [, renderizar] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const form = grupo.current?.closest("form");
    if (!form) return;
    const aoLimpar = () => setTimeout(renderizar, 0);
    form.addEventListener("reset", aoLimpar);
    return () => form.removeEventListener("reset", aoLimpar);
  }, []);

  /** Edição manual: o campo vem do `name` do input. */
  function aoMudar(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const campo = e.target.name as Campo;
    editados.current.add(campo);
    setV((atual) => ({ ...atual, [campo]: e.target.value }));
  }

  /** Sem mensagens: se o CEP não for encontrado ou a busca falhar, a equipe preenche à mão. */
  async function buscar(cep: string) {
    let resposta: Response;
    try {
      resposta = await fetch(`/api/cep/${cep}`, { cache: "no-store" });
    } catch {
      return;
    }
    if (!resposta.ok) return;
    const achado = (await resposta.json()) as Record<CampoDoCep, string>;
    setV((atual) => {
      const novo = { ...atual };
      for (const campo of ["logradouro", "bairro", "cidade", "uf"] as const) {
        const podeTrocar = !editados.current.has(campo) || !atual[campo].trim();
        if (podeTrocar && achado[campo]) novo[campo] = achado[campo];
      }
      return novo;
    });
    numero.current?.focus();
  }

  function mudarCep(e: React.ChangeEvent<HTMLInputElement>) {
    const texto = e.target.value;
    setV((atual) => ({ ...atual, cep: texto }));
    const digitos = normalizarCep(texto);
    if (digitos.length !== 8) {
      ultimoCep.current = "";
      return;
    }
    if (digitos === ultimoCep.current) return;
    ultimoCep.current = digitos;
    void buscar(digitos);
  }

  // No cartão, os obrigatórios ganham asterisco e o complemento dispensa o "(opcional)".
  const obrigatorio = cartao;
  const campos = (
    <div ref={grupo} className="contents">
      {/* Em telas largas, duas linhas: CEP, logradouro e número; complemento, bairro, cidade e UF. */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-[10rem_1fr_8rem]">
        <div className="grid content-start gap-1">
          <CampoTexto
            name="cep"
            rotulo="CEP"
            obrigatorio={obrigatorio}
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={9}
            value={v.cep}
            onChange={mudarCep}
            onBlur={() => setV((atual) => ({ ...atual, cep: formatarCep(atual.cep) }))}
            erros={erros?.cep}
          />
        </div>
        <CampoTexto
          name="logradouro"
          rotulo="Logradouro"
          obrigatorio={obrigatorio}
          autoComplete="address-line1"
          value={v.logradouro}
          onChange={aoMudar}
          erros={erros?.logradouro}
        />
        <CampoTexto
          ref={numero}
          name="numero"
          rotulo="Número"
          obrigatorio={obrigatorio}
          value={v.numero}
          onChange={aoMudar}
          erros={erros?.numero}
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_8rem]">
        <CampoTexto
          name="complemento"
          rotulo={cartao ? "Complemento" : "Complemento (opcional)"}
          autoComplete="address-line2"
          value={v.complemento}
          onChange={aoMudar}
          erros={erros?.complemento}
        />
        <CampoTexto
          name="bairro"
          rotulo="Bairro"
          obrigatorio={obrigatorio}
          value={v.bairro}
          onChange={aoMudar}
          erros={erros?.bairro}
        />
        <CampoTexto
          name="cidade"
          rotulo="Cidade"
          obrigatorio={obrigatorio}
          autoComplete="address-level2"
          value={v.cidade}
          onChange={aoMudar}
          erros={erros?.cidade}
        />
        <CampoSelecao
          name="uf"
          rotulo="UF"
          obrigatorio={obrigatorio}
          value={v.uf}
          onChange={aoMudar}
          erros={erros?.uf}
          opcoes={[
            { valor: "", rotulo: "Selecione" },
            ...UFS.map((uf) => ({ valor: uf, rotulo: uf })),
          ]}
        />
      </div>
    </div>
  );

  if (cartao) {
    return <SecaoFormulario titulo="Localização">{campos}</SecaoFormulario>;
  }
  return (
    <FieldSet>
      <FieldLegend>{legenda}</FieldLegend>
      <FieldGroup>{campos}</FieldGroup>
    </FieldSet>
  );
}

/** Erros de endereço do formulário a partir das chaves da API/zod (ex.: `empresa.endereco.cep`). */
export function errosDoEndereco(
  campos: Record<string, string[]> | undefined,
  prefixo: string,
): Partial<Record<Campo, string[]>> {
  const saida: Partial<Record<Campo, string[]>> = {};
  for (const campo of Object.keys(VAZIO) as Campo[]) {
    const e = campos?.[`${prefixo}${campo}`];
    if (e) saida[campo] = e;
  }
  return saida;
}
