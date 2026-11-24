// Trilha de navegação derivada do endereço (design D3).
// Ex.: /usuarios/<id>/editar → Usuários › Detalhes › Editar.

export interface EtapaTrilha {
  rotulo: string;
  /** Endereço da etapa; ausente na etapa atual (última). */
  href?: string;
}

export interface ItemDeMenu {
  href: string;
  rotulo: string;
}

const ROTULOS_FIXOS: Record<string, string> = {
  novo: "Novo",
  nova: "Nova",
  editar: "Editar",
  responsavel: "Responsável",
  "acesso-negado": "Acesso negado",
};

/** Segmentos que agrupam sub-recursos e não têm página própria. */
const INTERMEDIARIOS: Record<string, { item: string; nova: string }> = {
  empresas: { item: "Empresa", nova: "Nova empresa" },
  donos: { item: "Dono", nova: "Novo Dono" },
};

const pareceId = (s: string) => /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(s);

export function etapasDoCaminho(caminho: string, itens: ItemDeMenu[]): EtapaTrilha[] {
  const segmentos = caminho.split("?")[0]!.split("/").filter(Boolean);
  const etapas: EtapaTrilha[] = [];
  let acumulado = "";
  let intermediario: (typeof INTERMEDIARIOS)[string] | undefined;

  segmentos.forEach((segmento, i) => {
    acumulado += `/${segmento}`;
    const anterior = intermediario;
    intermediario = undefined;

    let rotulo: string;
    if (i === 0) {
      rotulo =
        itens.find((item) => item.href === acumulado)?.rotulo ??
        ROTULOS_FIXOS[segmento] ??
        segmento;
    } else if (INTERMEDIARIOS[segmento]) {
      intermediario = INTERMEDIARIOS[segmento];
      return; // sem página própria: o próximo segmento leva o nome
    } else if (anterior) {
      rotulo = segmento === "nova" || segmento === "novo" ? anterior.nova : anterior.item;
    } else if (pareceId(segmento)) {
      rotulo = "Detalhes";
    } else {
      rotulo = ROTULOS_FIXOS[segmento] ?? segmento;
    }
    etapas.push({ rotulo, href: acumulado });
  });

  const ultima = etapas.at(-1);
  if (ultima) delete ultima.href;
  return etapas;
}
