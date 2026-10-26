// Carrega os arquivos de /content. Os formatos estão documentados no README.

export interface TipoPin {
  id: string;
  rotulo: string;
  icone: string; // ícone do Foundry (icons/svg/...)
}
export interface Camada {
  id: string;
  rotulo: string;
  ligada: boolean;
}
export interface ItemLegenda {
  tipo: "linha" | "area" | "tracejado" | "hachura";
  cor?: string;
  texto: string;
}
export interface BaseMapa {
  id: string;
  rotulo: string;
  arquivo: string;
  /** a legenda que antes vinha dentro do desenho; agora é um painel da UI */
  legenda?: ItemLegenda[];
}
export interface ManifestoMapa {
  titulo: string;
  viewBox: [number, number, number, number];
  arquivo?: string; // SVG desenhado inline (camadas por <g id>)
  camadas?: Camada[];
  bases?: BaseMapa[]; // plantas alternativas (uma de cada vez)
  sobreposicoes?: BaseMapa[]; // SVGs extras com o mesmo viewBox, ligados como camadas
  tiposPin: TipoPin[];
  /** ponto (x, y) e zoom em que o mapa abre e para onde "Centralizar" volta */
  centro?: [number, number, number];
  /** lugares rotulados mesmo no zoom inicial (os outros rótulos aparecem de perto) */
  principais?: string[];
  /** quanto vale uma unidade do viewBox, para a régua e a escala gráfica */
  escala?: { porUnidade: number; unidade: "km" | "m"; viagem?: { rotulo: string; kmh: number } };
}
export interface Pais {
  id: string;
  nome: string;
  sabor: string;
  capital: string;
  lado: string;
  publico: string;
  boatos: string[];
  viajante: string;
  svgId?: string;
  distante?: boolean;
  /** id da arte do brasão (pais-<id>) e arquivo da bandeira (SVG), quando existem */
  brasao?: string | null;
  bandeira?: string | null;
}
export interface Opcao {
  id: string;
  nome: string;
  descricao?: string;
}
export interface ComunidadeConteudo extends Opcao {
  original?: string;
  /** "basico" ou "hope-fear" */
  grupo?: string;
  adjetivos?: string[];
  habilidade?: string;
}
export interface Classe {
  id: string;
  nome: string;
  nova?: boolean;
  /** "cenario" (as 5 novas), "livro" (livro básico e Hope & Fear) ou "void" (The Void) */
  grupo?: "cenario" | "livro" | "void";
  fantasia: string;
  /** a introdução da classe no cenário (só as novas) */
  intro?: string;
  dominios: string[];
  subclasses: Subclasse[];
  origem: string[];
  conexao: string[];
  imagem?: string | null;
  /** Ficha completa (só as classes novas): Evasão, PV, itens iniciais, Esperança, habilidades e entradas extras */
  evasao?: number;
  pv?: number;
  itens?: string[];
  esperanca?: { nome: string; texto: string };
  habilidades?: { nome: string; texto: string }[];
  extras?: { id: string; nome: string; texto: string }[];
}
export interface NoTrilha {
  nome: string;
  texto: string;
}
export interface Subclasse {
  id?: string;
  nome: string;
  linha: string;
  imagem?: string | null;
  conjuracao?: string;
  /** a trilha de progressão: Fundação → Especialização → Maestria */
  fundacao?: NoTrilha[];
  especializacao?: NoTrilha[];
  maestria?: NoTrilha[];
}
export interface CartaDominio {
  id: string;
  nome: string;
  dominio: string;
  nivel: number;
  texto?: string;
  imagem?: string | null;
}
export interface Seguranca {
  linhas: string;
  veus: string;
  morte: { pergunta: string; explicacao?: string; opcoes: Opcao[] };
  ferramentas: { nome: string; texto: string }[];
}
export interface Compulsao {
  explicacao: string;
  exemplos: string[];
  pergunta?: string;
}
export interface BuilderConteudo {
  titulo?: string;
  categorias: { d4: number; nome: string; perguntas: { d10: number; texto: string; pin?: string }[] }[];
}
export interface Geral {
  titulo: string;
  subtitulo: string;
  ano?: string;
  perguntaOculto: string;
  ajudaOculto?: string;
  ajudaSegredo?: string;
  rodadasPadrao?: number;
  conviteArte?: string | null; // ex.: "convite.png" (opcional)
}
export type Objetivos = Record<string, { jogador?: string; mestre?: string; vez?: string }>;
export interface VagaArte {
  id: string;
  arquivo: string | null;
}

export interface Conteudo {
  objetivos: Objetivos;
  arte: Record<string, string>; // id da vaga -> url da imagem (só as que têm arquivo)
  /** id -> srcset (as larguras que o `npm run arte` gerou) */
  arteSet: Record<string, string>;
  /** id -> proporção real e cor média, para o placeholder enquanto carrega */
  arteInfo: Record<string, { larguras: number[]; proporcao: number; cor: string }>;
  geral: Geral;
  abertura: string;
  convite: string;
  conviteArte: string | null;
  seguranca: Seguranca;
  paises: Pais[];
  origens: Opcao[];
  comunidades: ComunidadeConteudo[];
  classes: Classe[];
  compulsao: Compulsao;
  builder: BuilderConteudo;
  continente: ManifestoMapa;
  rouillac: ManifestoMapa;
}

export const urlConteudo = (arq: string) => `./content/${arq}`;

async function texto(arq: string, opcional = false): Promise<string> {
  const r = await fetch(urlConteudo(arq), { cache: "no-cache" });
  if (!r.ok) {
    if (opcional) return "";
    throw new Error(`Não achei content/${arq} (${r.status})`);
  }
  return r.text();
}
async function json<T>(arq: string): Promise<T> {
  const t = await texto(arq);
  try {
    return JSON.parse(t) as T;
  } catch (e) {
    throw new Error(`content/${arq} não é um JSON válido: ${(e as Error).message}`);
  }
}
export async function carregarConteudo(): Promise<Conteudo> {
  const [geral, abertura, convite, seguranca, paises, origens, comunidades, classes, compulsao, builder, continente, rouillac] =
    await Promise.all([
      json<Geral>("geral.json"),
      texto("abertura.md"),
      texto("convite.md"),
      json<Seguranca>("seguranca.json"),
      json<Pais[]>("paises.json"),
      json<Opcao[]>("origens.json"),
      json<ComunidadeConteudo[]>("comunidades.json"),
      json<Classe[]>("classes.json"),
      json<Compulsao>("compulsao.json"),
      json<BuilderConteudo>("builder.json"),
      json<ManifestoMapa>("mapas/continente.json"),
      json<ManifestoMapa>("mapas/rouillac.json"),
    ]);
  const [objetivos, manifesto] = await Promise.all([
    json<Objetivos>("objetivos.json").catch(() => ({}) as Objetivos),
    json<VagaArte[]>("arte/manifest.json").catch(() => [] as VagaArte[]),
  ]);
  const arte: Record<string, string> = {};
  void manifesto; // o manifest.json agora só lista as vagas; as imagens vêm do mapa-arte.json (npm run arte)
  // as artes geradas pelo `npm run arte` (WebP em várias larguras, pedidas sempre pelo id)
  const arteInfo = await fetch("./arte/arte.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  const arteSet: Record<string, string> = {};
  for (const [id, i] of Object.entries(arteInfo as Conteudo["arteInfo"])) {
    const ws = [...i.larguras].sort((x, y) => x - y);
    arte[id] = `./arte/${id}-${ws[ws.length - 1]}.webp`;
    arteSet[id] = ws.map((w) => `./arte/${id}-${w}.webp ${w}w`).join(", ");
  }
  const conviteArte = geral.conviteArte ? urlConteudo(geral.conviteArte) : null;
  return { objetivos, arte, arteSet, arteInfo: arteInfo as Conteudo["arteInfo"], geral, abertura, convite, conviteArte, seguranca, paises, origens, comunidades, classes, compulsao, builder, continente, rouillac };
}

export function perguntaBuilder(c: Conteudo, cat: number, num: number) {
  const categoria = c.builder.categorias.find((x) => x.d4 === cat);
  const pergunta = categoria?.perguntas.find((p) => p.d10 === num);
  return { categoria, pergunta };
}
