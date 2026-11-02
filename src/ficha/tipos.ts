// O contrato entre a ficha e quem a hospeda (a página de ensaio ou o módulo do Foundry).
//
// A ficha NÃO conhece o Foundry. Ela recebe um `FichaDados` (o que desenhar) e devolve eventos
// (`FichaAcoes`) quando alguém mexe em algo. Quem hospeda grava no ator e chama `atualizar` com os
// dados novos. Todo texto longo vem como HTML, que é o formato das descrições do Foundry.
//
// Os campos de carta (nome, dominio, nivel, tipo, recuperacao, html, imagem) espelham os de uma
// carta de domínio do sistema (domain, level, type, recallCost, description, img).

export type TipoHabilidade = "acao" | "reacao" | "esperanca" | "recurso" | "fundacao" | "passiva";

export interface Dominio {
  nome: string;
  /** SVG do domínio com fill="currentColor"; sem isso a ficha desenha um losango. */
  svg?: string;
}

export interface Traco {
  id: string;
  nome: string;
  /** o modificador, de −1 a +3 em geral */
  mod: number;
  /** o traço de conjuração da subclasse (só um) ganha o destaque de filigrana */
  conjuracao?: boolean;
}

export interface Experiencia {
  id: string;
  nome: string;
  bonus: number;
}

/** Recurso de classe que mora dentro de uma habilidade. */
export type RecursoHabilidade =
  | {
      tipo: "contadores"; // a bolsa de Princípios do Alquimista
      /** soma máxima entre os contadores (patamar + 6); omitido = sem teto conjunto */
      limiteTotal?: number;
      itens: { id: string; nome: string; valor: number; cor?: string }[];
    }
  | {
      tipo: "caixas"; // as ervas do Herbário: uma caixinha por uso por descanso
      itens: { id: string; nome: string; usada: boolean }[];
      /** texto da última caixa, vazia, ex.: "erva nova (patamar 3)" */
      vaga?: string;
    };

export interface Habilidade {
  id: string;
  nome: string;
  tipo: TipoHabilidade;
  html: string;
  /** texto do custo, ex.: "2 Princípios" */
  custo?: string;
  /** URL do ícone da habilidade (64 px). Sem isso a ficha desenha um selo com a inicial. */
  icone?: string;
  /** duas cores para o selo provisório */
  cores?: [string, string];
  recurso?: RecursoHabilidade;
}

export interface GrupoHabilidades {
  /** "Classe", "Subclasse", "Ancestralidade", "Comunidade" */
  origem: string;
  /** de onde vem, ex.: "Apotecária" */
  fonte: string;
  habilidades: Habilidade[];
}

export interface CartaDominio {
  id: string;
  nome: string;
  dominio: string;
  nivel: number;
  /** "Habilidade", "Feitiço" ou "Grimório" */
  tipo: string;
  recuperacao: number;
  html: string;
  /** a arte da carta pronta (do gerador). Sem isso a ficha desenha uma carta tipográfica. */
  imagem?: string | null;
  /** a carta já desenhada (HTML do renderizador de cartas), em 360×504. A ficha só a escala. */
  cartaHtml?: string;
}

export interface ItemInventario {
  id: string;
  nome: string;
  detalhe?: string;
  /** texto à direita, ex.: "d8 físico" ou "× 2" */
  direita?: string;
}

export interface SecaoInventario {
  titulo: string;
  itens: ItemInventario[];
}

export interface Condicao {
  id: string;
  nome: string;
  texto: string;
}

export interface Pergunta {
  id: string;
  pergunta: string;
  texto: string;
}

export interface MovimentoDescanso {
  id: string;
  nome: string;
  curto: string;
  longo: string;
  /** vem da classe */
  classe?: boolean;
  soLongo?: boolean;
}

/** Tudo o que muda a cada cena. */
export interface Recursos {
  pv: { marcados: number; max: number };
  fadiga: { marcados: number; max: number };
  armadura: { marcados: number; max: number };
  esperanca: { valor: number; max: number; desabilitados: boolean[] };
  discernimento: { valor: number; max: number; marcos: number[]; /** pontos queimados: não contam para os limiares, mas contam para o véu te tocar */ queimados?: number };
  frenesi: { valor: number; max: number; desabilitados: boolean[]; surto: boolean; /** declarou Entregar-se antes da próxima rolagem */ entregue?: boolean };
}

export interface FichaDados {
  nome: string;
  classe: string;
  subclasse: string;
  /** "Erudita · Humana": comunidade e ancestralidade, sem rótulos */
  origem: string;
  nivel: number;
  patamar: number;
  dominios: Dominio[];

  recursos: Recursos;
  evasao: number;
  limiares: { maior: number; grave: number };
  habilidadeEsperanca?: { nome: string; html: string; custo: number };
  /** nome da compulsão ativa, ou null */
  compulsao?: string | null;
  experiencias: Experiencia[];
  tracos: Traco[];

  grupos: GrupoHabilidades[];
  /** habilidades que o personagem ainda não tem (Especialização, Maestria): aparecem apagadas */
  futuras?: { titulo: string; nomes: string[]; nota?: string };

  loadout: CartaDominio[];
  loadoutMax: number;
  cofre: CartaDominio[];

  inventario: SecaoInventario[];
  moedas?: { nome: string; valor: number }[];
  perguntas: Pergunta[];

  condicoes: Condicao[];
  /** ids das condições ativas */
  efeitos: string[];

  movimentosDescanso: MovimentoDescanso[];
}

export interface PedidoRolagem {
  traco: string;
  /** id da Experiência gasta (custa 1 Esperança), se houver */
  experiencia: string | null;
  vantagem: boolean;
}

export interface PedidoDescanso {
  tipo: "curto" | "longo";
  /** ids dos 2 movimentos escolhidos; o mesmo id pode repetir */
  movimentos: string[];
}

export interface FichaAcoes {
  /**
   * Qualquer mudança de estado vira uma chamada aqui, com os dados novos inteiros.
   * O host grava no ator. `desfazer` também passa por aqui.
   */
  aoMudar?: (novo: FichaDados, anterior: FichaDados) => void;
  /** Sem isto, a ficha rola sozinha (modo de ensaio). */
  aoRolar?: (pedido: PedidoRolagem) => void;
  /** Sem isto, a ficha aplica o descanso sozinha (modo de ensaio). */
  aoDescansar?: (pedido: PedidoDescanso) => void;
  aoUsarHabilidade?: (id: string) => void;
  aoUsarHabilidadeEsperanca?: () => void;
  /** clicou na vaga de uma erva ainda por escolher (id da habilidade com o recurso) */
  aoEscolherErva?: (habilidadeId: string) => void;
  /** Clicou no nome da carta: o host pode abrir a ficha do item. */
  aoAbrirCarta?: (id: string) => void;
  /** Mandar a carta (do loadout) ao chat, sem usar. */
  aoCartaNoChat?: (id: string) => void;
  /** Confirmou subir de nível: o host abre o fluxo de level up. */
  aoSubirNivel?: () => void;
  /** Mandar uma experiência ao chat. */
  aoExperienciaNoChat?: (id: string) => void;
}

export interface FichaOpcoes {
  /** mostra a faixa de rodapé com o "chat" e o botão Desfazer (padrão: true) */
  rodape?: boolean;
  /** clicar num traço rola na hora, sem a janelinha de experiência e vantagem (o host pergunta) */
  rolarDireto?: boolean;
}

/** O que o host recebe ao montar. */
export interface FichaHandle {
  atualizar: (dados: FichaDados) => void;
  /** posta uma linha na faixa do rodapé (HTML) */
  mensagem: (html: string) => void;
  destruir: () => void;
}
