// A ficha de classe, em tela cheia: um capítulo em miniatura.
// Abertura (arte, nome em T, a fantasia como contexto) → habilidades → as subclasses lado a lado, cada uma com a
// trilha de progressão (Fundação → Especialização → Maestria) → entradas extras → perguntas → cartas de domínio.
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { CartaDominio, Classe, NoTrilha, Subclasse } from "../conteudo";
import { Icone } from "../jogo/icones";
import { Markdown } from "../components/ui";
import { ArtePeca, CartaEsperanca, useArquivo } from "./base";

/** Carta de domínio: só o placeholder, na proporção 63 × 88, até a arte chegar do Figma. */
export function CartaPlaceholder({ carta, aoClicar }: { carta: Pick<CartaDominio, "nome" | "dominio" | "nivel" | "texto" | "imagem">; aoClicar?: () => void }) {
  const Tag = aoClicar ? "button" : "div";
  return (
    <Tag className="carta-placeholder" onClick={aoClicar} aria-label={`Carta ${carta.nome}, em produção`}>
      {carta.imagem ? (
        <img src={carta.imagem} alt={carta.nome} />
      ) : (
        <>
          <span className="n-L">
            {carta.dominio} · nível {carta.nivel}
          </span>
          <span className="n-S">{carta.nome}</span>
          {carta.texto && <span className="n-I">{carta.texto}</span>}
          <span className="carta-marca n-L">arte da carta em produção</span>
        </>
      )}
    </Tag>
  );
}

/** Uma carta ampliada, por cima de tudo. */
export function useAmpliarCarta() {
  const { detalhe } = useArquivo();
  return (c: CartaDominio) =>
    detalhe({
      titulo: c.nome,
      etiqueta: `${c.dominio} · nível ${c.nivel}`,
      corpo: (
        <div className="carta-ampliada">
          <CartaPlaceholder carta={c} />
        </div>
      ),
    });
}

/** A trilha de progressão: nós em sequência que acendem ao entrar na tela. */
function Trilha({ sub }: { sub: Subclasse }) {
  const ref = useRef<HTMLOListElement>(null);
  const [acesa, setAcesa] = useState(() => typeof IntersectionObserver === "undefined" || !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    if (acesa || !ref.current) return;
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setAcesa(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(ref.current);
    const t = window.setTimeout(() => setAcesa(true), 3000);
    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, [acesa]);
  const camadas: [string, NoTrilha[] | undefined][] = [
    ["Fundação", sub.fundacao],
    ["Especialização", sub.especializacao],
    ["Maestria", sub.maestria],
  ];
  let n = 0;
  return (
    <ol ref={ref} className={`trilha ${acesa ? "acesa" : ""}`}>
      {camadas.map(([camada, nos]) =>
        (nos || []).map((no) => {
          const i = n++;
          return (
            <li key={`${camada}-${no.nome}`} style={{ ["--i" as string]: i }}>
              <span className="trilha-no" aria-hidden="true" />
              <div>
                <div className="n-L">{camada}</div>
                <div className="n-S">{no.nome}</div>
                <Markdown texto={no.texto} className="n-N" />
              </div>
            </li>
          );
        }),
      )}
    </ol>
  );
}

/** A trilha de uma subclasse, para o painel de detalhes do criador. */
export function TrilhaDetalhe({ sub }: { sub: Subclasse }) {
  return <Trilha sub={sub} />;
}

const SECOES = (c: Classe) => [
  { id: "visao", rotulo: "Visão geral" },
  { id: "habilidades", rotulo: "Habilidades" },
  { id: "subclasses", rotulo: "Subclasses" },
  ...(c.extras || []).map((e) => ({ id: `extra-${e.id}`, rotulo: e.nome.replace(/\s*\(a definir\)/, "") })),
  ...((c.origem || []).length + (c.conexao || []).length ? [{ id: "perguntas", rotulo: "Perguntas" }] : []),
  { id: "cartas", rotulo: "Cartas" },
];

export function FichaClasse({ classeId, sair }: { classeId: string; sair: () => void }) {
  const { conteudo, dados, criar } = useArquivo();
  const c = conteudo.classes.find((x) => x.id === classeId);
  const ampliar = useAmpliarCarta();
  const rolagem = useRef<HTMLDivElement>(null);
  const [ativa, setAtiva] = useState("visao");
  useEffect(() => {
    rolagem.current?.scrollTo({ top: 0 });
  }, [classeId]);
  // o menu da lateral acompanha a rolagem
  useEffect(() => {
    const el = rolagem.current;
    if (!el || !c) return;
    const f = () => {
      let cur = "visao";
      for (const s of SECOES(c)) {
        const alvo = document.getElementById(`fc-${s.id}`);
        if (alvo && alvo.offsetTop - 120 <= el.scrollTop) cur = s.id;
      }
      setAtiva(cur);
    };
    el.addEventListener("scroll", f, { passive: true });
    return () => el.removeEventListener("scroll", f);
  }, [c?.id]);

  if (!c)
    return (
      <div className="ficha-classe">
        <div className="ficha-topo">
          <button className="btn-hud" onClick={sair}>
            ◂ Voltar
          </button>
        </div>
        <p className="n-N" style={{ padding: 40 }}>
          Esta classe ainda não existe no Arquivo.
        </p>
      </div>
    );

  const secoes = SECOES(c);
  const ir = (id: string) => document.getElementById(`fc-${id}`)?.scrollIntoView({ behavior: "smooth" });
  const cartas = dados.cartas.slice(0, 4);
  const qual = (rotulo: string, valor: ReactNode, icone: string) => (
    <div className="qualidade">
      <span className="insignia" style={{ ["--t" as string]: "32px" }}>
        <Icone id={icone} tamanho={18} />
      </span>
      <span className="nome">{rotulo}</span>
      <span className="valor">{valor}</span>
    </div>
  );

  return (
    <div className="ficha-classe">
      <div className="ficha-topo">
        <button className="btn-hud" onClick={sair}>
          ◂ Voltar
        </button>
      </div>
      <nav className="ficha-menu" aria-label="Seções da ficha">
        {secoes.map((s) => (
          <button key={s.id} className={ativa === s.id ? "atual" : ""} onClick={() => ir(s.id)}>
            {s.rotulo}
          </button>
        ))}
      </nav>
      <div className="ficha-rolagem" ref={rolagem}>
        {/* abertura */}
        <section id="fc-visao" className="cmp cmp-abertura">
          <div className="abertura-arte">
            <ArtePeca id={`abertura-classe-${c.id}`} placeholder={{ mapa: "rouillac", x: 30 + (c.id.length % 5) * 10, y: 40 + (c.id.length % 3) * 10, z: 3 }} desc={`Retrato da classe ${c.nome}`} nevoa />
          </div>
          <div className="abertura-conteudo">
            <header className="abertura-titulo">
              <span className="barra-latao" aria-hidden="true" />
              <div>
                <div className="n-L">{c.nova ? "Classe nova" : "Classe do livro"}</div>
                <h1 className="n-T">{c.nome}</h1>
                <p className="n-contexto contexto-grande">{c.fantasia.replace(/^\[Exemplo\]\s*/, "")}</p>
              </div>
            </header>
            <div className="abertura-colunas">
              <div className="col-principal">
                <h2>Visão geral</h2>
                {c.intro ? <Markdown texto={c.intro} className="n-N" /> : <p className="n-I">A introdução desta classe está em produção.</p>}
              </div>
              <aside className="col-lateral">
                <div className="qualidades" style={{ paddingLeft: 0 }}>
                  {qual("Domínios", c.dominios.join(" · "), "memoria")}
                  {qual("Evasão", c.evasao ?? "—", "cap-2")}
                  {qual("Pontos de vida", c.pv ?? "—", "selar")}
                </div>
                {c.itens && c.itens.length > 0 && (
                  <div className="lateral-bloco">
                    <div className="n-L" style={{ color: "var(--brass)" }}>
                      Itens iniciais
                    </div>
                    <ul className="n-N">
                      {c.itens.map((i) => (
                        <li key={i}>{i}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <button className="link" onClick={criar}>
                  Escolher esta classe no criador
                </button>
              </aside>
            </div>
          </div>
        </section>

        {/* habilidades */}
        <section id="fc-habilidades" className="cmp cmp-regras">
          <div className="regras-miolo">
            <h2 className="n-C">Habilidades</h2>
            {c.esperanca && (
              <CartaEsperanca esperanca={c.esperanca} />
            )}
            <div className="regras-corpo">
              {(c.habilidades || []).map((h) => (
                <div key={h.nome} className="habilidade">
                  <div className="n-S">{h.nome}</div>
                  <Markdown texto={h.texto} className="n-N" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* subclasses */}
        <section id="fc-subclasses" className="cmp cmp-subclasses">
          <h2 className="n-C">Subclasses</h2>
          <div className="subclasses-lado">
            {c.subclasses.map((sc) => (
              <article key={sc.nome + sc.linha} className="subclasse">
                <header>
                  <div className="n-L">Subclasse{sc.conjuracao ? ` · conjuração: ${sc.conjuracao}` : ""}</div>
                  <div className="n-S titulo-sub">{sc.nome}</div>
                  <p className="n-I">{sc.linha.replace(/^\[Exemplo\]\s*/, "")}</p>
                </header>
                <Trilha sub={sc} />
              </article>
            ))}
          </div>
        </section>

        {/* extras */}
        {(c.extras || []).map((e) => (
          <section key={e.id} id={`fc-extra-${e.id}`} className="cmp cmp-regras">
            <div className="regras-miolo">
              <h2 className="n-C">{e.nome}</h2>
              <Markdown texto={e.texto} className="n-N" />
            </div>
          </section>
        ))}

        {/* perguntas */}
        {((c.origem || []).length + (c.conexao || []).length) > 0 && (
        <section id="fc-perguntas" className="cmp cmp-regras">
          <div className="regras-miolo">
            <h2 className="n-C">Perguntas</h2>
            <div className="regras-corpo">
              <div>
                <div className="n-L" style={{ color: "var(--brass)" }}>
                  De origem
                </div>
                <ol className="n-N">
                  {(c.origem || []).map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ol>
              </div>
              <div>
                <div className="n-L" style={{ color: "var(--brass)" }}>
                  De conexão
                </div>
                <ol className="n-N">
                  {(c.conexao || []).map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>
        )}

        {/* cartas */}
        <section id="fc-cartas" className="cmp cmp-cartas">
          <h2 className="n-C">Cartas de domínio</h2>
          <p className="n-I">A arte das cartas está em produção. Clique numa carta para vê-la ampliada.</p>
          <div className="cartas-fileira">
            {cartas.map((k) => (
              <CartaPlaceholder key={k.id} carta={k} aoClicar={() => ampliar(k)} />
            ))}
          </div>
        </section>
        <div className="proximo-vazio" />
      </div>
    </div>
  );
}
