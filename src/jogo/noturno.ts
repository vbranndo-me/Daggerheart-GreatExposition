// Recolore as plantas claras de Rouillac para o tema noturno.
// Não é inversão: a terra fica numa ardósia CLARA o bastante para se separar do mar e do fundo da UI,
// água e jardins ganham tons próprios, tinta escura vira marfim e os distritos viram tintas suaves.
// Os rótulos recebem uma regra à parte: nenhum texto escuro, todos em marfim com halo escuro.

function hexParaRgb(h: string): [number, number, number] {
  let s = h.replace("#", "");
  if (s.length === 3) s = s.split("").map((c) => c + c).join("");
  const n = parseInt(s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbParaHsl(r: number, g: number, b: number): [number, number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const croma = max - min;
  if (max === min) return [0, 0, l, 0];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l, croma];
}
function hslParaHex(h: number, s: number, l: number) {
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Três propostas de cor para a terra, a água e os jardins; o mestre escolhe no kit (#/kit). */
export interface PerfilNoturno {
  id: string;
  nome: string;
  /** luminosidade da terra (o papel) */
  terra: number;
  /** matiz e saturação do papel já escurecido */
  tomTerra: [number, number];
  agua: number;
  verde: number;
  /** luminosidade dos distritos tingidos */
  distrito: number;
}
export const PERFIS: PerfilNoturno[] = [
  { id: "ardosia", nome: "A · Ardósia clara", terra: 0.31, tomTerra: [215, 0.1], agua: 0.17, verde: 0.26, distrito: 0.4 },
  { id: "bronze", nome: "B · Bronze velho", terra: 0.29, tomTerra: [38, 0.16], agua: 0.19, verde: 0.25, distrito: 0.38 },
  { id: "luar", nome: "C · Luar contrastado", terra: 0.37, tomTerra: [222, 0.12], agua: 0.15, verde: 0.28, distrito: 0.46 },
];
export const PERFIL_PADRAO = PERFIS[0];

export function corNoturna(hex: string, perfil: PerfilNoturno = PERFIL_PADRAO, dados = false): string {
  const [h, s, l, croma] = rgbParaHsl(...hexParaRgb(hex));
  if (l <= 0.28) {
    // tinta escura (traços, filetes) → marfim
    if (dados && croma > 0.13) return hslParaHex(h, Math.min(s, 0.6), Math.max(l, 0.3));
    return hslParaHex(42, 0.2, 0.64 + (0.28 - l) * 0.5);
  }
  if (dados && croma > 0.13) {
    // cores que significam algo (a carta da pobreza): mantém o matiz, só acalma
    return hslParaHex(h, Math.min(s, 0.62) * 0.9, Math.min(Math.max(l, 0.34), 0.64));
  }
  if (l >= 0.55) {
    if (croma < 0.13) {
      // papel, quadras claras → a terra
      return hslParaHex(perfil.tomTerra[0], perfil.tomTerra[1], perfil.terra + (1 - l) * 0.35);
    }
    if (h >= 190 && h <= 213) return hslParaHex(h, 0.4, perfil.agua);
    if (h >= 75 && h <= 165) return hslParaHex(h, 0.24, perfil.verde);
    // tintas dos distritos: tons distintos, suaves
    return hslParaHex(h, 0.34, perfil.distrito);
  }
  // tons médios (rios fortes, jardins fortes) → mais frios e um pouco mais claros que a terra
  return hslParaHex(h, Math.min(s, 0.5) * 0.6, perfil.terra - 0.02 + (l - 0.28) * 0.5);
}

// marcadores trocados DEPOIS do recolorido, para as cores dos rótulos não passarem pelo mapeamento
const MARFIM = "@marfim@";
const AZUL_AGUA = "@agua@";
const HALO = "@halo@";

/** Tira a legenda embutida e as listas laterais do SVG: a legenda passa a ser componente da UI. */
export function semLegendaEmbutida(svg: string): string {
  const linhas = svg.split("\n");
  const fora = new Set<number>();
  const abre = (re: RegExp) => linhas.findIndex((x) => re.test(x));
  // quadro da legenda (vias, ponte, rios…, escala) até a rosa dos ventos
  const iLeg = abre(/^<rect x="24" y="110"/);
  const iRosa = abre(/^<g transform="translate\(3950/);
  if (iLeg >= 0 && iRosa > iLeg) for (let i = iLeg; i < iRosa; i++) fora.add(i);
  // lista de monumentos na borda direita (monumentos.svg)
  const iLista = abre(/^<rect x="3620\.0" y="330"/);
  if (iLista >= 0) {
    let fim = iLista;
    while (fim + 1 < linhas.length && !/^<\/g>/.test(linhas[fim + 1])) fim++;
    for (let i = iLista; i <= fim; i++) fora.add(i);
  }
  return linhas.filter((_, i) => !fora.has(i)).join("\n");
}

export interface OpcoesPlanta {
  perfil?: PerfilNoturno;
  /** a carta da pobreza usa cores que significam algo */
  dados?: boolean;
  /** lugares sempre rotulados, mesmo no zoom inicial */
  principais?: string[];
  /** pixels de tela por unidade do mapa em que este desenho será visto (para o tamanho mínimo dos rótulos) */
  ppu?: number;
  /** mostra também os rótulos menores (segundo nível de zoom em diante) */
  todos?: boolean;
}

const decodificar = (t: string) => t.replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/<[^>]*>/g, "").trim();

/** Todos os rótulos em marfim com halo escuro, no tamanho mínimo de 12 px; os menores só no zoom mais perto. */
function ajustarRotulos(svg: string, o: OpcoesPlanta): string {
  const ppu = o.ppu || 0.3;
  const minimo = 12 / ppu;
  const principais = new Set((o.principais || []).map((x) => x.toLowerCase()));
  return svg.replace(/<text\b([^>]*)>([\s\S]*?)<\/text>/g, (_m, attrs: string, conteudo: string) => {
    const tam = parseFloat(/font-size="([\d.]+)"/.exec(attrs)?.[1] || "16");
    const texto = decodificar(conteudo);
    const agua = /fill="(#[0-9a-fA-F]{3,6})"/.test(attrs) && (() => {
      const [h, , , c] = rgbParaHsl(...hexParaRgb(/fill="(#[0-9a-fA-F]{3,6})"/.exec(attrs)![1]));
      return c > 0.2 && h >= 190 && h <= 240;
    })();
    // grandes (distritos, rios, título) aparecem sempre; os de 17 são lugares; o resto é legenda de números e afins
    const grande = tam >= 22 || tam === 15 || tam === 18 || tam === 12;
    const principal = !grande && principais.has(texto.toLowerCase());
    if (!grande && !principal && !o.todos) return "";
    const novo = tam >= 22 || !grande ? Math.max(tam, minimo) : tam;
    const limpo = attrs
      .replace(/\s(fill|stroke|stroke-width|stroke-linejoin|paint-order|font-size)="[^"]*"/g, "")
      .replace(/\s+$/, "");
    return `<text${limpo} font-size="${novo.toFixed(1)}" fill="${agua ? AZUL_AGUA : MARFIM}" stroke="${HALO}" stroke-width="${(novo * 0.2).toFixed(1)}" stroke-linejoin="round" paint-order="stroke">${conteudo}</text>`;
  });
}

export function recolorirSvgNoturno(svg: string, o: OpcoesPlanta = {}): string {
  const perfil = o.perfil || PERFIL_PADRAO;
  const cache = new Map<string, string>();
  const rotulado = ajustarRotulos(semLegendaEmbutida(svg), o);
  return rotulado
    .replace(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g, (m) => {
      if (!cache.has(m)) cache.set(m, corNoturna(m, perfil, o.dados));
      return cache.get(m)!;
    })
    .replace(/@marfim@/g, "#ece4cf")
    .replace(/@agua@/g, "#9cc4de")
    .replace(/@halo@/g, "#0b0e16");
}
