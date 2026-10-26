// Peças compartilhadas do Arquivo: o contexto da apresentação e a arte (imagem pronta ou placeholder em duotom).
import { createContext, useContext, type ReactNode } from "react";
import { urlConteudo, type Conteudo } from "../conteudo";
import { PlaceholderArte } from "../jogo/componentes";
import { Markdown } from "../components/ui";
import type { DadosArquivo, Secao } from "./dados";

export interface Ctx {
  dados: DadosArquivo;
  conteudo: Conteudo;
  rascunho: boolean;
  detalhe: (d: { titulo: string; etiqueta?: string; corpo: ReactNode } | null) => void;
  ir: (cap: string | null, secao?: string | null) => void;
  abrirMapa: (id: "continente" | "rouillac") => void;
  criar: () => void;
  abrirClasse: (id: string) => void;
}
export const ArquivoCtx = createContext<Ctx | null>(null);
export const useArquivo = () => useContext(ArquivoCtx)!;

/** O id da arte de um item de seleção: sempre no singular (comunidade-<id>, ancestralidade-<id>, classe-<id>…). */
export const idArte = (fonte: string, id: string) => `${{ comunidades: "comunidade", ancestralidades: "ancestralidade", classes: "classe", equipamento: "equipamento" }[fonte] || fonte}-${id}`;

// ---------- arte (a imagem pronta ou o placeholder bonito) ----------
export function ArtePeca({ id, placeholder, desc, nevoa, alta, foco, inteira }: { id?: string; placeholder?: Secao["placeholder"]; desc?: string; nevoa?: boolean; alta?: boolean; foco?: string; inteira?: boolean }) {
  const { conteudo } = useArquivo();
  const url = id ? conteudo.arte[id] : null;
  if (url)
    return (
      <img
        className={`arte-img ${inteira ? "inteira" : ""}`}
        src={url}
        srcSet={id ? conteudo.arteSet[id] : undefined}
        sizes="100vw"
        style={foco ? { objectPosition: foco } : undefined}
        alt={desc || ""}
        loading="lazy"
      />
    );
  const ph = placeholder;
  const arq = !ph ? null : ph.mapa === "continente" ? "mapas/continente.svg" : "mapas/rouillac/distritos.svg";
  return (
    <div className={`arte-ph ${alta ? "alta" : ""}`} role="img" aria-label={desc || "arte em produção"}>
      {arq ? (
        <img className="arte-ph-mapa" src={urlConteudo(arq)} alt="" style={{ width: `${(ph?.z ?? 2.5) * 100}%`, transform: `translate(-${ph?.x ?? 50}%, -${ph?.y ?? 50}%)` }} />
      ) : (
        <PlaceholderArte id={id || "arte"} icone="pavilhao" />
      )}
      <div className="arte-ph-grao" />
      {nevoa && <div className="nevoa" />}
      <span className="arte-ph-legenda n-L">arte em produção{desc ? ` · ${desc}` : ""}</span>
    </div>
  );
}


/** Os adjetivos (chips) e as habilidades de regra de uma opção: comunidade, ancestralidade ou classe. */
export function Habilidades({ habilidades, adjetivos, esperanca }: { habilidades?: { nome: string; texto: string }[]; adjetivos?: string[]; esperanca?: { nome: string; texto: string } }) {
  const lista = habilidades || [];
  if (!lista.length && !esperanca && !(adjetivos && adjetivos.length)) return null;
  return (
    <div className="painel-habilidades">
      {adjetivos && adjetivos.length > 0 && (
        <ul className="chips-adjetivos">
          {adjetivos.map((a) => (
            <li key={a} className="n-L">
              {a}
            </li>
          ))}
        </ul>
      )}
      {esperanca && (
        <div className="habilidade esperanca">
          <div className="n-L">Habilidade de Esperança</div>
          <div className="n-S">{esperanca.nome}</div>
          <Markdown texto={esperanca.texto} className="n-N" />
        </div>
      )}
      {lista.length > 0 && <div className="n-L titulo-habilidades">{lista.length > 1 || esperanca ? "Habilidades" : "Habilidade"}</div>}
      {lista.map((h) => (
        <div key={h.nome} className="habilidade">
          <div className="n-S">{h.nome}</div>
          <Markdown texto={h.texto} className="n-N" />
        </div>
      ))}
    </div>
  );
}
