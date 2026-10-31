export type MapaId = "continente" | "rouillac";

export interface EtapaEstado {
  aberta?: boolean;
  trancada?: boolean;
}

export interface Meta {
  etapaAtual?: number;
  etapas?: Record<string, EtapaEstado>;
  criadaEm?: number;
  conviteAberto?: boolean;
  /** o mestre congelou as escolhas do criador de personagem */
  criadorTrancado?: boolean;
  ensaio?: boolean;
}

export interface Jogador {
  nome: string;
  cor: string;
  uid?: string | null;
  online?: boolean;
  ordem?: number;
}

export interface Pin {
  u: number;
  v: number;
  tipo: string;
  titulo: string;
  texto?: string;
  autor: string; // jid, ou "mestre"
  criadoEm: number;
  resposta?: string; // id da resposta do builder, se veio dela
}

export interface Personagem {
  pais?: string;
  papel?: string;
  papelOutro?: string;
  comunidade?: string;
  ancestralidade?: string;
  /** a segunda, quando a ancestralidade é mista */
  ancestralidade2?: string;
  classe?: string;
  /** a classe escolhida é do livro básico (só o nome) */
  classeLivro?: boolean;
  /** campo livre: playtest ou homebrew */
  classeOutra?: string;
  subclasse?: string;
  /** o jogador fechou o criador ("Pronto") */
  criadorPronto?: boolean;
  registroConfirmado?: boolean;
  /** retrato opcional, já reduzido (data URL JPEG, ~3:4) */
  retrato?: string;
  origem?: Record<string, Record<string, string>>; // classe -> índice -> resposta
  compulsao?: string;
  oculto?: string;
}

export interface Privado {
  segredo?: string;
  morte?: string;
  seguranca?: Record<string, true>; // ids dos itens de segurança que esta pessoa escreveu
}

export interface ItemSeguranca {
  lista: "linha" | "veu";
  texto: string;
  criadoEm: number;
}

export interface BuilderAtual {
  d4: number;
  d10: number;
  cat: number;
  num: number;
  jid: string;
  ts: number;
  desvio?: string;
  texto?: string;
  enviada?: boolean;
  pin?: string | null;
}

export interface BuilderResposta {
  n: number;
  cat: number;
  num: number;
  jid: string;
  texto: string;
  pin?: string | null;
  criadoEm: number;
}

export interface Builder {
  ordem?: string[];
  rodadas?: number;
  rodada?: number;
  vez?: number;
  vezJid?: string | null;
  iniciado?: boolean;
  terminado?: boolean;
  sorteadas?: Record<string, "aceita" | "vetada">;
  atual?: BuilderAtual | null;
  respostas?: Record<string, BuilderResposta>;
}

export interface Laco {
  de: string;
  para: string;
  pergunta: string;
  resposta?: string;
  criadoEm: number;
}

export interface Sala {
  meta: Meta;
  jogadores: Record<string, Jogador>;
  pins: Partial<Record<MapaId, Record<string, Pin>>>;
  personagens: Record<string, Personagem>;
  privado: Record<string, Privado>;
  seguranca: { itens?: Record<string, ItemSeguranca> };
  builder: Builder;
  lacos: Record<string, Laco>;
}

export const SALA_VAZIA: Sala = {
  meta: {},
  jogadores: {},
  pins: {},
  personagens: {},
  privado: {},
  seguranca: {},
  builder: {},
  lacos: {},
};

export const ETAPAS = [
  { n: 0, nome: "Registro de chegada", curto: "Chegada" },
  { n: 1, nome: "O convite", curto: "Convite" },
  { n: 3, nome: "Ficha de registro", curto: "Ficha" },
  { n: 4, nome: "O continente", curto: "Continente" },
  { n: 5, nome: "A Exposição", curto: "Exposição" },
  { n: 6, nome: "Laços", curto: "Laços" },
  { n: 7, nome: "Fecho do registro", curto: "Fecho" },
] as const;

export const ROMANOS = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

// O `n` de cada capítulo é um id estável (é o que fica guardado nas salas e nos conteúdos).
// Capítulos removidos deixam um buraco nos ids, então a ordem e o número romano vêm da posição.
export const posEtapa = (n: number) => ETAPAS.findIndex((e) => e.n === n);
export const etapaDe = (n: number) => ETAPAS[Math.max(0, posEtapa(n))];
export const romanoDe = (n: number) => ROMANOS[Math.max(0, posEtapa(n))];
/** salas antigas podem estar num capítulo que não existe mais: vão para o seguinte */
export const normalizarEtapa = (n: number): number => (ETAPAS.find((e) => e.n >= n) ?? ETAPAS[ETAPAS.length - 1]).n;
export const proximaEtapa = (n: number): number => ETAPAS[Math.min(ETAPAS.length - 1, posEtapa(normalizarEtapa(n)) + 1)].n;
export const etapaAnterior = (n: number): number => ETAPAS[Math.max(0, posEtapa(normalizarEtapa(n)) - 1)].n;
