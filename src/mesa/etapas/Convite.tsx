// Capítulo I · O convite. A Proposta como storylet (tom, temas e referências abrem no lugar)
// e o convite como objeto de papel: quando o mestre entrega, o envelope abre para todos.
// Quem chega depois vê o convite já aberto, sem repetir a animação.
import { useEffect, useMemo, useRef, useState } from "react";
import { useSessao } from "../../db/sala";
import { Canto, Ramo, Selo } from "../../jogo/componentes";
import { Icone } from "../../jogo/icones";
import { BrasaoCarimbo, SeloCera } from "../../jogo/BrasaoCarimbo";
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
  const { conteudo, sala, acoes, meuJid } = useSessao();
  const { mestre } = useVisao();
  // o canhoto do convite leva o nome de quem lê e o número da entrada
  const tripulacao = Object.entries(sala.jogadores).sort((a, b) => (a[1].ordem ?? 0) - (b[1].ordem ?? 0));
  const pos = meuJid ? tripulacao.findIndex(([j]) => j === meuJid) : -1;
  const convidado = meuJid ? sala.jogadores[meuJid]?.nome || "Convidado" : mestre ? "Mestre de cerimônias" : "Convidado de honra";
  const numero = String(pos >= 0 ? pos + 1 : 0).padStart(4, "0");
  const cidade = conteudo.paises.find((p) => p.id === "entremonts")?.capital || "Rouillac";
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
      {mostrar && <ConvitePapel texto={conteudo.convite} arte={conteudo.conviteArte} animar={mostrar === "animar"} fechar={() => setMostrar(null)} convidado={convidado} numero={numero} cidade={cidade} />}
    </>
  );
}

/** "## Título" e "### Subtítulo" do convite viram o cabeçalho gravado; o resto é o corpo. */
function partesConvite(md: string) {
  let titulo = "";
  let subtitulo = "";
  const corpo = md
    .split("\n")
    .filter((l) => {
      if (!titulo && /^##\s/.test(l)) return (titulo = l.replace(/^##\s*/, "").trim()), false;
      if (!subtitulo && /^###\s/.test(l)) return (subtitulo = l.replace(/^###\s*/, "").trim()), false;
      return true;
    })
    .join("\n");
  return { titulo, subtitulo, corpo };
}

const FAISCAS = Array.from({ length: 14 }, (_, i) => ({ a: (i * 360) / 14 + (i % 2 ? 9 : -6), d: 62 + (i % 3) * 16 }));

function ConvitePapel({
  texto,
  arte,
  animar,
  fechar,
  convidado,
  numero,
  cidade,
}: {
  texto: string;
  arte: string | null;
  animar: boolean;
  fechar: () => void;
  convidado: string;
  numero: string;
  cidade: string;
}) {
  const env = useRef<HTMLDivElement>(null);
  const palco = useRef<HTMLDivElement>(null);
  const [lendo, setLendo] = useState(!animar);
  const { titulo, subtitulo, corpo } = useMemo(() => partesConvite(texto), [texto]);
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
      el.animate([{ transform: "translateY(90px) rotate(-8deg) scale(.9)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 600, easing: "cubic-bezier(.2,.8,.3,1)", fill: "both" }),
      // o lacre esquenta antes de partir
      q(".lacre").animate(
        [
          { filter: "brightness(1) drop-shadow(0 0 0 #ffb36600)", transform: "translate(-50%,-50%) scale(1)" },
          { filter: "brightness(1.35) drop-shadow(0 0 14px #ffb366cc)", transform: "translate(-50%,-50%) scale(1.12)" },
          { filter: "brightness(1.1) drop-shadow(0 0 6px #ffb36688)", transform: "translate(-50%,-50%) scale(1)" },
        ],
        { duration: 700, delay: 500, easing: "ease-in-out", fill: "both" },
      ),
      q(".lacre-a").animate([{ transform: "none", opacity: 1 }, { transform: "translate(-30px,90px) rotate(-50deg)", opacity: 0 }], { duration: 520, delay: 1250, easing: "cubic-bezier(.5,0,.8,.4)", fill: "both" }),
      q(".lacre-b").animate([{ transform: "none", opacity: 1 }, { transform: "translate(30px,98px) rotate(44deg)", opacity: 0 }], { duration: 520, delay: 1250, easing: "cubic-bezier(.5,0,.8,.4)", fill: "both" }),
      q(".aba").animate([{ transform: "rotateX(0deg)", zIndex: 4 }, { transform: "rotateX(90deg)", zIndex: 4, offset: 0.5 }, { transform: "rotateX(90deg)", zIndex: 0, offset: 0.5 }, { transform: "rotateX(180deg)", zIndex: 0 }], { duration: 520, delay: 1550, easing: "ease-in-out", fill: "both" }),
      q(".carta-c").animate([{ transform: "translateY(0)" }, { transform: "translateY(-70%)" }], { duration: 650, delay: 2000, easing: "cubic-bezier(.2,.8,.3,1)", fill: "both" }),
      el.animate([{ transform: "none", opacity: 1 }, { transform: "scale(1.25)", opacity: 0 }], { duration: 380, delay: 2750, easing: "ease-in", fill: "forwards" }),
    ];
    const t = window.setTimeout(() => setLendo(true), 3050);
    return () => {
      window.clearTimeout(t);
      a.forEach((x) => x.cancel());
    };
  }, [animar]);

  // o cartão acompanha o mouse, de leve, e o brilho do dourado corre junto
  const inclinar = (e: React.MouseEvent) => {
    const el = palco.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--ry", `${(x * 7).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${(-y * 5).toFixed(2)}deg`);
    el.style.setProperty("--mx", `${((x + 0.5) * 100).toFixed(1)}%`);
  };
  const endireitar = () => {
    const el = palco.current;
    if (!el) return;
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--rx", "0deg");
  };

  let l = 0;
  return (
    <div className="convite-veu" onMouseDown={(e) => e.target === e.currentTarget && lendo && fechar()}>
      {!lendo ? (
        <div key="envelope" className="envelope-jogo" ref={env} style={{ perspective: 1000 }}>
          <div className="env-fundo" />
          <div className="carta-c">
            <div className="mini-convite">
              <BrasaoCarimbo variante="marca" className="mini-brasao" />
              <div className="n-L" style={{ color: "#6b2320" }}>Royaume d'Entremonts</div>
              <div className="mini-titulo">Exposition Universelle</div>
              <div className="mini-sub">pour la Paix des Nations</div>
            </div>
          </div>
          <div className="env-corpo" />
          <div className="aba" />
          <div className="lacre">
            <span className="lacre-a">
              <SeloCera />
            </span>
            <span className="lacre-b">
              <SeloCera />
            </span>
          </div>
        </div>
      ) : (
        <div key="cartao" className="convite-palco" ref={palco} onMouseMove={inclinar} onMouseLeave={endireitar}>
          <article className={`convite-lido ${animar ? "cerimonia" : "reaberto"}`} aria-label="O convite da Exposição">
            <span className="convite-moldura" aria-hidden="true" />
            {(["tl", "tr", "bl", "br"] as const).map((p) => (
              <span key={p} className={`convite-canto ${p}`} aria-hidden="true">
                <Canto pos="tl" />
              </span>
            ))}
            <BrasaoCarimbo variante="marca" className="convite-marca" />

            <div className="convite-eyebrow">
              <span>Royaume d'Entremonts</span>
            </div>
            {arte && <img className="convite-arte" src={arte} alt="" />}
            <h1 className="convite-titulo" aria-label={titulo}>
              {titulo.split(" ").map((palavra, w) => (
                <span key={w} className="convite-palavra" aria-hidden="true">
                  {[...palavra].map((ch, i) => (
                    <span key={i} className="convite-letra" style={{ ["--l" as string]: l++ }}>
                      {ch}
                    </span>
                  ))}
                </span>
              ))}
            </h1>
            {subtitulo && <p className="convite-sub">{subtitulo}</p>}
            <div className="convite-ornamento" aria-hidden="true">
              <span />
              <Icone id="losango" tamanho={12} />
              <span />
            </div>

            <Markdown texto={corpo} className="convite-texto" />

            <dl className="convite-detalhes">
              <div>
                <dt>Lieu</dt>
                <dd>{cidade}</dd>
              </div>
              <div>
                <dt>Entrée</dt>
                <dd>sur présentation</dd>
              </div>
              <div>
                <dt>Tenue</dt>
                <dd>de gala</dd>
              </div>
            </dl>

            <div className="convite-carimbo" aria-hidden="true">
              <span className="carimbo-sombra" />
              <span className="carimbo-respingo" />
              {FAISCAS.map((f, i) => (
                <span key={i} className="carimbo-faisca" style={{ ["--a" as string]: `${f.a}deg`, ["--d" as string]: `${f.d}px` }} />
              ))}
              <BrasaoCarimbo variante="tinta" />
              <span className="carimbo-3d" />
            </div>

            <button className="link fechar-convite" onClick={fechar}>
              guardar o convite
            </button>

            <footer className="convite-canhoto">
              <span className="canhoto-lado">
                <span className="n-L">Entrée</span>
                <span>admit one</span>
              </span>
              <span className="canhoto-nome">{convidado}</span>
              <span className="canhoto-lado direita">
                <span className="n-L">Nº</span>
                <span>{numero}</span>
              </span>
            </footer>

          </article>
        </div>
      )}
    </div>
  );
}
