// As regras do fim do criador (traços, Experiências, equipamento, cartas, números derivados).
// Funções puras: usadas pelas páginas da ficha e pelos jogadores de ensaio.
import type { CartaDominio, Classe, Conteudo } from "../conteudo";
import { comoLista } from "./backend";
import type { Derivados, Experiencia, Personagem } from "./tipos";

/** A subclasse escolhida e o traço com que ela conjura (null para quem não conjura). */
export function conjuracaoDe(c: Conteudo, p: Personagem): { classe?: Classe; traco: string | null } {
  const classe = c.classes.find((x) => x.id === p.classe);
  const sub = classe?.subclasses.find((s) => s.nome === p.subclasse);
  const nome = sub?.conjuracao || null;
  const traco = nome ? c.criacao.tracos.find((t) => t.nome === nome)?.id || null : null;
  return { classe, traco };
}

/** Os seis valores usados uma vez cada? */
export function tracosCompletos(c: Conteudo, t: Personagem["tracos"]): boolean {
  if (!t || !c.criacao.tracos.length) return false;
  const usados = c.criacao.tracos.map((x) => t[x.id]);
  if (usados.some((v) => v == null)) return false;
  const a = [...(usados as number[])].sort();
  const b = [...c.criacao.valores].sort();
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export const experienciasDe = (p: Personagem): Experiencia[] => {
  const l = comoLista<Experiencia>(p.experiencias);
  return [l[0] || { texto: "", bonus: 2 }, l[1] || { texto: "", bonus: 2 }];
};
export const experienciasCompletas = (p: Personagem) => experienciasDe(p).every((x) => !!x.texto?.trim());

/** As opções de "Escolha 1: a, ou b." do item de classe. */
export function opcoesItemClasse(classe?: Classe): string[] {
  const linha = classe?.itens?.find((x) => /^escolha/i.test(x)) || classe?.itens?.[0];
  if (!linha) return [];
  const corpo = linha.replace(/^escolha\s*\d*\s*:\s*/i, "").replace(/\.\s*$/, "");
  return corpo.split(/,?\s+ou\s+/).map((x) => x.trim()).filter(Boolean).map((x) => x[0].toUpperCase() + x.slice(1));
}

export const equipamentoCompleto = (c: Conteudo, p: Personagem) => {
  const e = p.equipamento || {};
  const precisaItem = opcoesItemClasse(c.classes.find((x) => x.id === p.classe)).length > 0;
  return !!e.principal && !!e.armadura && !!e.pocao && (!precisaItem || !!e.itemClasse);
};

/** As cartas de nível 1 que este personagem pode escolher: as do SRD dos dois domínios + as nossas da classe. */
export function cartasDisponiveis(c: Conteudo, p: Personagem): CartaDominio[] {
  const classe = c.classes.find((x) => x.id === p.classe);
  if (!classe) return [];
  return c.cartas.filter((k) => k.nivel === 1 && classe.dominios.includes(k.dominio) && (!k.classe || k.classe === classe.id));
}
export const cartasCompletas = (p: Personagem) => comoLista<string>(p.cartas).length === 2;

/** Evasão, PV, limiares e o resto, no nível 1, a partir da classe e da armadura. */
export function calcularDerivados(c: Conteudo, p: Personagem): Derivados {
  const classe = c.classes.find((x) => x.id === p.classe);
  const arm = c.equipamento.find((x) => x.id === p.equipamento?.armadura);
  const nivel = c.criacao.derivados.nivel;
  const notas: string[] = [];
  let evasao = classe?.evasao ?? null;
  const car = arm?.caracteristica || "";
  const mEv = car.match(/([+−-])\s*(\d+)\s+na Evasão/);
  if (evasao != null && mEv) evasao += (mEv[1] === "+" ? 1 : -1) * Number(mEv[2]);
  const mAg = car.match(/([+−-])\s*(\d+)\s+na Agilidade/);
  if (mAg) notas.push(`${mAg[1] === "+" ? "+" : "−"}${mAg[2]} na Agilidade (armadura)`);
  const lim = arm?.limiares?.match(/(\d+)\s*\/\s*(\d+)/);
  return {
    nivel,
    evasao,
    pv: classe?.pv ?? null,
    fadiga: c.criacao.derivados.fadiga,
    esperanca: c.criacao.derivados.esperanca,
    proficiencia: c.criacao.derivados.proficiencia,
    armadura: arm?.armadura ?? null,
    limiares: lim ? { maior: Number(lim[1]) + nivel, grave: Number(lim[2]) + nivel } : null,
    ...(notas.length ? { notas } : {}),
  };
}

