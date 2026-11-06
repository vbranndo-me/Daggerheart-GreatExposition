import type { Jogador } from "./tipos";

/** Uma desconexão pendente pode recriar só `online` após remover um jogador. */
export function normalizarJogadores(valor: unknown): Record<string, Jogador> {
  if (!valor || typeof valor !== "object") return {};
  return Object.fromEntries(
    Object.entries(valor).flatMap(([id, jogador]) => {
      if (!jogador || typeof jogador !== "object") return [];
      const j = jogador as Jogador;
      if (typeof j.nome !== "string" || !j.nome.trim()) return [];
      return [[id, { ...j, cor: typeof j.cor === "string" && j.cor.trim() ? j.cor : "#7FA6E0" }]];
    }),
  );
}
