// Capítulo I · O convite. A Proposta como storylet (tom, temas e referências abrem no lugar)
// e o convite como objeto de papel: quando o mestre entrega, o envelope abre para todos.
// Quem chega depois vê o convite já aberto, sem repetir a animação.
import { useEffect, useMemo, useRef, useState } from "react";
import { useSessao } from "../../db/sala";
import { Ramo, Selo } from "../../jogo/componentes";
import { BotaoHextech } from "../../jogo/hextech";
import { Markdown } from "../../components/ui";
import { Escolhas, Gestao, Painel } from "../pecas";
import { useVisao } from "../Casca";
import { useAmbientePelaMetade } from "../../jogo/FundoVivo";

function dividir(md: string) {
  const partes = md.split(/\n(?=## )/);
  const proposta = (partes.shift() || "").replace(/^#\s.*\n/, "");
  const blocos = partes.map((p) => {
    const [cab, ...resto] = p.split("\n");
    return { titulo: cab.replace(/^##\s*/, ""), corpo: resto.join("\n") };
  });
  return { proposta, blocos };
}
const ICONE_BLOCO: Record<string, string> = { tom: "boato", temas: "memoria", referências: "escrever", referencias: "escrever" };

export function Convite({ trancada: _ }: { trancada: boolean }) {
  const { conteudo, sala, acoes } = useSessao();
  const { mestre } = useVisao();
  const { proposta, blocos } = useMemo(() => dividir(conteudo.abertura), [conteudo.abertura]);
  const [aberto, setAberto] = useState<string | null>(null);
  const entregue = !!sala.meta.conviteAberto;
  const [mostrar, setMostrar] = useState<"animar" | "parado" | null>(null);
  const antes = useRef(entregue);
  useAmbientePelaMetade(!!mostrar);
  useEffect(() => {
    if (entregue && !antes.current) setMostrar("animar");
    antes.current = entregue;
  }, [entregue]);

  return (
    <>
      <Gestao n={1} titulo="A Proposta" colunas="minmax(0, 1.35fr) minmax(300px, 1fr)">
        <Painel titulo="O que vamos fazer esta noite">
          <div className="n-N proposta">
            <Markdown texto={proposta} />
          </div>
        </Painel>
        <Painel titulo="Tom, temas e referências">
          <div className="ramos" style={{ marginTop: 0 }}>
            {blocos.map((b) => (
              <Ramo
                key={b.titulo}
                titulo={b.titulo}
                descricao={aberto === b.titulo ? undefined : "Abre aqui mesmo."}
                icone={ICONE_BLOCO[b.titulo.toLowerCase()] || "info"}
                aberto={aberto === b.titulo}
                aoClicar={() => setAberto(aberto === b.titulo ? null : b.titulo)}
              >
                <Markdown texto={b.corpo} className="n-I bloco-md" />
              </Ramo>
            ))}
            <Ramo
              titulo="O convite"
              descricao={entregue ? "Reler o convite da Exposição." : "Lacrado. O mestre vai entregar."}
              icone="cap-1"
              estado={entregue ? "normal" : "bloqueado"}
              selo={entregue ? <Selo tipo="feito">entregue</Selo> : <Selo>o mestre decide</Selo>}
              aoClicar={() => setMostrar("parado")}
            />
          </div>
          {mestre && (
            <Escolhas
              acao={
                entregue ? (
                  <button className="link" onClick={() => acoes.abrirConvite(false)}>
                    lacrar de novo
                  </button>
                ) : (
                  <BotaoHextech onClick={() => acoes.abrirConvite(true)}>Entregar o convite</BotaoHextech>
                )
              }
            />
          )}
        </Painel>
      </Gestao>
      {mostrar && <ConvitePapel texto={conteudo.convite} arte={conteudo.conviteArte} animar={mostrar === "animar"} fechar={() => setMostrar(null)} />}
    </>
  );
}

function ConvitePapel({ texto, arte, animar, fechar }: { texto: string; arte: string | null; animar: boolean; fechar: () => void }) {
  const env = useRef<HTMLDivElement>(null);
  const [lendo, setLendo] = useState(!animar);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [fechar]);
  useEffect(() => {
    const el = env.current;
    if (!animar || !el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setLendo(true);
      return;
    }
    const q = (s: string) => el.querySelector(s) as HTMLElement;
    const a = [
      el.animate([{ transform: "translateY(60px) rotate(-6deg)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 450, easing: "cubic-bezier(.2,.8,.3,1)", fill: "both" }),
      q(".lacre-a").animate([{ transform: "none", opacity: 1 }, { transform: "translate(-22px,70px) rotate(-40deg)", opacity: 0 }], { duration: 450, delay: 650, easing: "ease-in", fill: "both" }),
      q(".lacre-b").animate([{ transform: "none", opacity: 1 }, { transform: "translate(22px,76px) rotate(35deg)", opacity: 0 }], { duration: 450, delay: 650, easing: "ease-in", fill: "both" }),
      q(".aba").animate([{ transform: "rotateX(0deg)" }, { transform: "rotateX(180deg)" }], { duration: 450, delay: 950, easing: "ease-in-out", fill: "both" }),
      q(".carta-c").animate([{ transform: "translateY(0)" }, { transform: "translateY(-62%)" }], { duration: 550, delay: 1350, easing: "cubic-bezier(.2,.8,.3,1)", fill: "both" }),
    ];
    const t = window.setTimeout(() => setLendo(true), 2050);
    return () => {
      window.clearTimeout(t);
      a.forEach((x) => x.cancel());
    };
  }, [animar]);
  return (
    <div className="convite-veu" onMouseDown={(e) => e.target === e.currentTarget && lendo && fechar()}>
      {!lendo ? (
        <div className="envelope-jogo" ref={env} style={{ perspective: 1000 }}>
          <div className="carta-c">
            <div className="mini-convite">
              <div className="n-L" style={{ color: "#6b2320" }}>Royaume d'Entremonts</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 26, margin: "8px 0" }}>Exposition Universelle</div>
              <div style={{ fontFamily: "var(--font-narrative)", fontStyle: "italic" }}>pour la Paix des Nations</div>
            </div>
          </div>
          <div className="env-corpo" />
          <div className="aba" />
          <div className="lacre">
            <span className="lacre-a" />
            <span className="lacre-b" />
          </div>
        </div>
      ) : (
        <div className="convite-lido">
          {arte && <img src={arte} alt="" style={{ maxWidth: "100%", marginBottom: 14 }} />}
          <Markdown texto={texto} />
          <button className="link fechar-convite" onClick={fechar}>
            guardar o convite
          </button>
        </div>
      )}
    </div>
  );
}
