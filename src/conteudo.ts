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
}
export interface Opcao {
  id: string;
  nome: string;
  descricao?: string;
}
export interface Classe {
  id: string;
  nome: string;
  nova?: boolean;
  fantasia: string;
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
  nome: string;
  linha: string;
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
  geral: Geral;
  abertura: string;
  convite: string;
  conviteArte: string | null;
  seguranca: Seguranca;
  paises: Pais[];
  origens: Opcao[];
  comunidades: Opcao[];
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
      json<Opcao[]>("comunidades.json"),
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
  for (const v of manifesto) if (v.arquivo) arte[v.id] = urlConteudo(`arte/${v.arquivo}`);
  const conviteArte = geral.conviteArte ? urlConteudo(geral.conviteArte) : null;
  return { objetivos, arte, geral, abertura, convite, conviteArte, seguranca, paises, origens, comunidades, classes, compulsao, builder, continente, rouillac };
}

export function perguntaBuilder(c: Conteudo, cat: number, num: number) {
  const categoria = c.builder.categorias.find((x) => x.d4 === cat);
  const pergunta = categoria?.perguntas.find((p) => p.d10 === num);
  return { categoria, pergunta };
}
