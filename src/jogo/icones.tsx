// Ícones do app: silhuetas cheias do game-icons.net (CC BY 3.0), extraídas por
// scripts/extrair-icones.mjs para icones-dados.ts. Todos em grade 512 × 512, centralizados,
// pintados com currentColor (latão por padrão). O losango é o único desenhado à mão (ornamento).
import { ICONES_DADOS } from "./icones-dados";

export const ICONES: Record<string, { nome: string }> = {
  ...ICONES_DADOS,
  losango: { nome: "Ornamento" },
};

export function Icone({ id, tamanho = 24, titulo }: { id: string; tamanho?: number; titulo?: string }) {
  const dados = ICONES_DADOS[id];
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox={dados ? "0 0 512 512" : "0 0 24 24"}
      className="ico"
      aria-hidden={titulo ? undefined : true}
      role={titulo ? "img" : undefined}
      fill="currentColor"
    >
      {titulo && <title>{titulo}</title>}
      {dados ? (
        <g dangerouslySetInnerHTML={{ __html: dados.corpo }} />
      ) : id === "losango" ? (
        <path d="M12 4l4 8-4 8-4-8z" />
      ) : (
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeDasharray="2 2" />
      )}
    </svg>
  );
}
