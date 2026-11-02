// Comportamento de ensaio: o que a ficha faz sozinha quando o host NÃO fornece `aoRolar` ou
// `aoDescansar`. No Foundry nada disso é usado: lá quem rola e quem descansa é o sistema.
import type { FichaDados, PedidoDescanso, PedidoRolagem } from "./tipos";

export const d = (n: number) => 1 + Math.floor(Math.random() * n);
export const lim = (v: number, max: number) => Math.max(0, Math.min(max, v));
export const nOff = (a: boolean[]) => a.filter(Boolean).length;

export interface ResultadoRolagem {
  esp: number;
  med: number;
  adv: number;
  total: number;
  quem: "esp" | "med" | "crit";
}

export function rolarLocal(dados: FichaDados, p: PedidoRolagem): { novo: FichaDados; resultado: ResultadoRolagem; resumo: string } {
  const t = dados.tracos.find((x) => x.id === p.traco)!;
  const exp = p.experiencia ? dados.experiencias.find((x) => x.id === p.experiencia) : undefined;
  const esp = d(12);
  const med = d(12);
  const adv = p.vantagem ? d(6) : 0;
  const total = esp + med + t.mod + (exp?.bonus ?? 0) + adv;
  const quem = esp === med ? "crit" : esp > med ? "esp" : "med";
  const novo = structuredClone(dados);
  const E = novo.recursos.esperanca;
  const teto = E.max - nOff(E.desabilitados);
  if (exp) E.valor = lim(E.valor - 1, teto);
  if (quem !== "med") E.valor = lim(E.valor + 1, teto);
  const sinal = t.mod >= 0 ? "+" : "−";
  const resumo = `rola ${t.nome}: ${esp} (Esperança) + ${med} (Medo) ${sinal} ${Math.abs(t.mod)}${exp ? ` + ${exp.bonus}` : ""}${adv ? ` + d6 (${adv})` : ""} = <b>${total}</b> ${
    quem === "crit" ? "· Sucesso crítico!" : quem === "esp" ? "· com Esperança" : "· com Medo"
  }`;
  return { novo, resultado: { esp, med, adv, total, quem }, resumo };
}

export function descansoLocal(dados: FichaDados, p: PedidoDescanso): { novo: FichaDados; linhas: string[] } {
  const n = structuredClone(dados);
  const R = n.recursos;
  const longo = p.tipo === "longo";
  const linhas: string[] = [];
  const nome = (id: string) => n.movimentosDescanso.find((m) => m.id === id)?.nome ?? id;
  for (const id of p.movimentos) {
    const cura = d(4) + n.patamar;
    if (id === "ferimentos") {
      R.pv.marcados = longo ? 0 : lim(R.pv.marcados - cura, R.pv.max);
      linhas.push(`${nome(id)} (${longo ? "limpa todos os PV" : `limpa ${cura} PV`})`);
    } else if (id === "folego") {
      R.fadiga.marcados = longo ? 0 : lim(R.fadiga.marcados - cura, R.fadiga.max);
      linhas.push(`${nome(id)} (${longo ? "limpa toda a Fadiga" : `limpa ${cura} de Fadiga`})`);
    } else if (id === "armadura") {
      R.armadura.marcados = longo ? 0 : lim(R.armadura.marcados - cura, R.armadura.max);
      linhas.push(`${nome(id)} (${longo ? "repara toda a armadura" : `repara ${cura}`})`);
    } else if (id === "preparar") {
      R.esperanca.valor = lim(R.esperanca.valor + 1, R.esperanca.max - nOff(R.esperanca.desabilitados));
      linhas.push(`${nome(id)} (+1 Esperança)`);
    } else if (id === "remendar") {
      const r = longo ? 4 : 2;
      R.discernimento.valor = lim(R.discernimento.valor - r, R.discernimento.max);
      linhas.push(`${nome(id)} (Discernimento −${r})`);
    } else if (id === "destilar") {
      // a primeira habilidade com contadores é a bolsa de Princípios
      const rec = n.grupos.flatMap((g) => g.habilidades).map((h) => h.recurso).find((r) => r?.tipo === "contadores");
      if (rec && rec.tipo === "contadores") {
        const teto = rec.limiteTotal ?? 99;
        if (longo) {
          const base = Math.floor(teto / rec.itens.length);
          rec.itens.forEach((it, i) => (it.valor = base + (i < teto - base * rec.itens.length ? 1 : 0)));
        } else {
          let sobra = n.patamar + 1;
          while (sobra-- > 0 && rec.itens.reduce((a, b) => a + b.valor, 0) < teto) {
            const menor = rec.itens.reduce((a, b) => (a.valor <= b.valor ? a : b));
            menor.valor++;
          }
        }
      }
      linhas.push(`${nome(id)} (${longo ? "a bolsa enche" : `+${n.patamar + 1} Princípios`})`);
    } else {
      linhas.push(nome(id));
    }
  }
  // o que todo descanso renova
  for (const h of n.grupos.flatMap((g) => g.habilidades)) if (h.recurso?.tipo === "caixas") h.recurso.itens.forEach((i) => (i.usada = false));
  if (longo) R.frenesi.valor = 0;
  R.frenesi.surto = false;
  return { novo: n, linhas };
}
