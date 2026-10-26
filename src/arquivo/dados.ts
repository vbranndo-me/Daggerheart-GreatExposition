// O Arquivo (v3): uma apresentação. Manifesto de capítulos, seções em Markdown (frontmatter + diretivas)
// e glossário. Tudo é estático: vem de content/arquivo e não precisa de sala nem de Firebase.
import { urlConteudo, type CartaDominio } from "../conteudo";

export type Layout = "abertura" | "texto-arte" | "arte-cheia" | "efemera" | "mapa" | "galeria" | "regras" | "citacao" | "chamada";
export type StatusSecao = "esqueleto" | "rascunho" | "pronto";

export interface Capitulo {
  id: string;
  num: string;
  nome: string;
  secoes: string[];
}
export interface ManifestoArquivo {
  titulo: string;
  subtitulo?: string;
  /** a pergunta do cenário, embaixo do subtítulo da tela de título */
  conceito?: string;
  complexidade?: number;
  capitulos: Capitulo[];
}
export interface Secao {
  id: string;
  wf?: number;
  layout: Layout;
  titulo: string;
  contexto?: string;
  arte?: { id?: string; tipo: string; desc?: string };
  /** onde o recorte do mapa em duotom aparece enquanto a arte não fica pronta */
  placeholder?: { mapa: string; x: number; y: number; z: number };
  lado: "esquerda" | "direita";
  /** object-position da abertura (padrão center 25%), para não cortar cabeças */
  foco?: string;
  status: StatusSecao;
  corpo: string;
}
export interface TermoGlossario {
  termo: string;
  alias: string[];
  texto: string;
  secao: string;
}
export interface ItemGaleria {
  id: string;
  nome: string;
  descricao?: string;
  grupo?: string;
  etiqueta?: string;
  original?: string;
  imagem?: string | null;
  detalhes?: { rotulo: string; valor: string }[];
}
export interface DadosArquivo {
  manifesto: ManifestoArquivo;
  secoes: Record<string, Secao>;
  glossario: TermoGlossario[];
  ancestralidades: ItemGaleria[];
  equipamento: ItemGaleria[];
  /** textos das peças de papel (convite, cartaz…), de content/arquivo/efemera-<id>.md */
  efemeras: Record<string, string>;
  cartas: CartaDominio[];
}

function objeto(s: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!s) return out;
  for (const m of s.matchAll(/(\w+):\s*("[^"]*"|[^,}\s]+)/g)) out[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  return out;
}

/** Lê o frontmatter simples (chave: valor e objetos de uma linha, como `arte: { id: "x", tipo: I }`). */
export function lerSecao(id: string, bruto: string): Secao {
  const m = bruto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const meta: Record<string, string> = {};
  let corpo = bruto;
  if (m) {
    corpo = m[2];
    for (const linha of m[1].split(/\r?\n/)) {
      const k = linha.match(/^([\w-]+):\s*(.*)$/);
      if (k) meta[k[1]] = k[2].replace(/\s+#.*$/, "").trim();
    }
  }
  const sem = (v?: string) => (v ?? "").replace(/^"(.*)"$/, "$1");
  const arte = objeto(meta.arte);
  const ph = objeto(meta.placeholder);
  const layouts = ["abertura", "texto-arte", "arte-cheia", "efemera", "mapa", "galeria", "regras", "citacao", "chamada"];
  return {
    id: sem(meta.id) || id,
    wf: meta.wf ? Number(meta.wf) : undefined,
    layout: (layouts.includes(meta.layout) ? meta.layout : "regras") as Layout,
    titulo: sem(meta.titulo) || id,
    contexto: sem(meta.contexto) || undefined,
    arte: arte.tipo ? { id: arte.id, tipo: arte.tipo, desc: arte.desc } : undefined,
    placeholder: ph.mapa ? { mapa: ph.mapa, x: Number(ph.x ?? 50), y: Number(ph.y ?? 50), z: Number(ph.z ?? 2.5) } : undefined,
    lado: meta.lado === "esquerda" ? "esquerda" : "direita",
    foco: sem(meta.foco) || undefined,
    status: (["esqueleto", "rascunho", "pronto"].includes(meta.status) ? meta.status : "esqueleto") as StatusSecao,
    corpo: corpo.trim(),
  };
}

async function json<T>(arq: string, padrao: T): Promise<T> {
  try {
    const r = await fetch(urlConteudo(arq), { cache: "no-cache" });
    return r.ok ? ((await r.json()) as T) : padrao;
  } catch {
    return padrao;
  }
}

let cache: Promise<DadosArquivo> | null = null;
export function carregarArquivo(): Promise<DadosArquivo> {
  if (!cache) {
    cache = (async () => {
      const manifesto = await json<ManifestoArquivo>("arquivo/arquivo.json", { titulo: "A Exposição Universal", capitulos: [] });
      const ids = manifesto.capitulos.flatMap((c) => c.secoes);
      const secoes: Record<string, Secao> = {};
      await Promise.all(
        ids.map(async (id) => {
          try {
            const r = await fetch(urlConteudo(`arquivo/${id}.md`), { cache: "no-cache" });
            if (r.ok) secoes[id] = lerSecao(id, await r.text());
          } catch {
            /* a seção fica de fora */
          }
        }),
      );
      const [glossario, ancestralidades, equipamento, cartas] = await Promise.all([
        json<TermoGlossario[]>("glossario.json", []),
        json<ItemGaleria[]>("ancestralidades.json", []),
        json<ItemGaleria[]>("equipamento.json", []),
        json<CartaDominio[]>("cartas.json", []),
      ]);
      const efemeras: Record<string, string> = {};
      await Promise.all(
        ["convite", "cartaz"].map(async (e) => {
          try {
            const r = await fetch(urlConteudo(`arquivo/efemera-${e}.md`), { cache: "no-cache" });
            if (r.ok) efemeras[e] = await r.text();
          } catch {
            /* sem texto: a peça mostra linhas */
          }
        }),
      );
      return { manifesto, secoes, glossario, ancestralidades, equipamento, efemeras, cartas };
    })();
  }
  return cache;
}

/** Quem vê a seção: todos, se estiver pronta; só com ?rascunho=1, se não. */
export const secaoVisivel = (s: Secao | undefined, rascunho: boolean) => !!s && (s.status === "pronto" || rascunho);

// ---------- "continuar de onde parei" (localStorage, sempre protegido) ----------
const CHAVE = "sz-arquivo-posicao";
export function lerPosicao(): { cap: string; secao?: string } | null {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) || "null");
  } catch {
    return null;
  }
}
export function gravarPosicao(cap: string, secao?: string) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ cap, secao }));
  } catch {
    /* sem localStorage a leitura funciona igual */
  }
}
