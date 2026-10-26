// O Arquivo da Exposição (v3): uma APRESENTAÇÃO do cenário, não um lugar de consulta.
// Tela de título → um capítulo de cada vez (rolagem vertical, seções com composições de tela cheia) → o criador.
// A moldura de filigrana fica nos cantos da tela; o texto usa a largura toda, em colunas de leitura.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import "../jogo/jogo.css";
import "../jogo/jogo-ajustes.css";
import "../mesa/mesa.css";
import "./arquivo.css";
import { urlConteudo, type Conteudo } from "../conteudo";
import { CartaoFichaDemo, ColunaDiscernimento, ColunaFrenesi, useProgressoDaSecao } from "./Medidores";
import { CartaoCapitulo, Janela, MolduraTela, PlaceholderArte, Ramo, SeloExposicao } from "../jogo/componentes";
import { BotaoAmbiente, FundoVivo } from "../jogo/FundoVivo";
import { BotaoHextech } from "../jogo/hextech";
import { Icone } from "../jogo/icones";
import { recolorirSvgNoturno } from "../jogo/noturno";
import { carregarSvgInterno } from "../svg";
import { SessaoCtx, type Sessao } from "../db/sala";
import { SALA_VAZIA } from "../db/tipos";
import { MapaFundo, ProvedorMapa, useConfigurarMapa } from "../mesa/MapaFundo";
import { Markdown } from "../components/ui";
import { ArquivoCtx, ArtePeca, idArte, useArquivo, type Ctx } from "./base";
import { CartaPlaceholder, FichaClasse, useAmpliarCarta } from "./FichaClasse";
import { carregarArquivo, gravarPosicao, lerPosicao, secaoVisivel, type Capitulo, type DadosArquivo, type ItemGaleria, type Secao } from "./dados";
import { lerBlocos, type Bloco } from "./blocos";

// ---------- rota ----------
export interface RotaArquivo {
  cap: string | null;
  secao: string | null;
  /** a ficha de classe aberta, em tela cheia */
  classe: string | null;
  rascunho: boolean;
  /** "#/arquivo" ou "#/s/<sala>/arquivo" */
  prefixo: string;
  salaId: string | null;
}
export function irA(cap: string | null, secao: string | null, rascunho: boolean, prefixo = "#/arquivo") {
  location.hash = `${prefixo}${cap ? `/${cap}` : ""}${cap && secao ? `/${secao}` : ""}${rascunho ? "?rascunho=1" : ""}`;
}
/** Para onde vai "Criar meu personagem": o criador da sala, ou a explicação de como entrar. */
export function irParaCriador(salaId: string | null) {
  location.hash = salaId ? `#/s/${salaId}/criador` : "#/arquivo/criador";
}

const reduzMovimento = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function Arquivo({ conteudo, rota }: { conteudo: Conteudo | null; rota: RotaArquivo }) {
  const [dados, setDados] = useState<DadosArquivo | null>(null);
  useEffect(() => {
    carregarArquivo().then(setDados);
  }, []);
  if (!dados || !conteudo)
    return (
      <div className="jogo entrada-jogo" data-paleta="ardosia">
        <div className="carregando">Abrindo o Arquivo…</div>
      </div>
    );
  return <Apresentacao dados={dados} conteudo={conteudo} rota={rota} />;
}

function Apresentacao({ dados, conteudo, rota }: { dados: DadosArquivo; conteudo: Conteudo; rota: RotaArquivo }) {
  const [det, setDet] = useState<{ titulo: string; etiqueta?: string; corpo: ReactNode } | null>(null);
  const [menu, setMenu] = useState(false);
  const [texto, setTexto] = useState<0 | 1 | 2>(1);
  const [cartao, setCartao] = useState<Capitulo | null>(null);
  const [mapaAberto, setMapaAberto] = useState<"continente" | "rouillac" | null>(null);
  const [progresso, setProgresso] = useState(0);
  const rolagem = useRef<HTMLDivElement>(null);
  const antes = useRef<string | null>(null);

  // capítulos que os jogadores podem ver: os que têm alguma seção pronta (ou todos, com ?rascunho=1)
  const visiveis = useMemo(
    () =>
      dados.manifesto.capitulos.map((c) => ({
        ...c,
        secoesVisiveis: c.secoes.filter((id) => secaoVisivel(dados.secoes[id], rota.rascunho)),
      })),
    [dados, rota.rascunho],
  );
  const liberados = visiveis.filter((c) => c.secoesVisiveis.length > 0);
  const atual = rota.cap ? visiveis.find((c) => c.id === rota.cap && c.secoesVisiveis.length > 0) || null : null;
  const indice = atual ? liberados.findIndex((c) => c.id === atual.id) : -1;
  const proximo = indice >= 0 ? liberados[indice + 1] : undefined;
  const anterior = indice > 0 ? liberados[indice - 1] : undefined;

  const ctx: Ctx = useMemo(
    () => ({ dados, conteudo, rascunho: rota.rascunho, detalhe: setDet, ir: (c, s) => irA(c, s ?? null, rota.rascunho, rota.prefixo), abrirMapa: setMapaAberto, criar: () => irParaCriador(rota.salaId), abrirClasse: (id) => (location.hash = `${rota.prefixo}/classe/${id}${rota.rascunho ? "?rascunho=1" : ""}`) }),
    [dados, conteudo, rota.rascunho, rota.prefixo, rota.salaId],
  );

  // troca de capítulo: cartão de capítulo (~800 ms), volta ao topo (ou à seção pedida) e guarda a posição
  useEffect(() => {
    setDet(null);
    setMenu(false);
    if (!atual) {
      antes.current = null;
      return;
    }
    gravarPosicao(atual.id, rota.secao ?? undefined);
    const mudou = antes.current !== null && antes.current !== atual.id;
    antes.current = atual.id;
    const rolar = () => {
      const el = rota.secao ? document.getElementById(`sec-${rota.secao}`) : null;
      if (el) el.scrollIntoView();
      else rolagem.current?.scrollTo({ top: 0 });
    };
    rolar();
    window.setTimeout(rolar, 60);
    if (mudou && !reduzMovimento()) {
      setCartao(atual);
      const t = window.setTimeout(() => setCartao(null), 2500);
      return () => window.clearTimeout(t);
    }
  }, [atual?.id, rota.secao]);

  // a linha da faixa de capítulos enche conforme se rola
  useEffect(() => {
    const el = rolagem.current;
    if (!el) return;
    const f = () => setProgresso(el.scrollHeight - el.clientHeight > 0 ? el.scrollTop / (el.scrollHeight - el.clientHeight) : 0);
    f();
    el.addEventListener("scroll", f, { passive: true });
    return () => el.removeEventListener("scroll", f);
  }, [atual?.id]);

  // teclado: ← e → trocam de capítulo, Esc fecha o que estiver aberto
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMapaAberto(null);
        setDet(null);
        setMenu(false);
      }
      if (!atual || det || (e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowRight" && proximo) ctx.ir(proximo.id);
      if (e.key === "ArrowLeft" && anterior) ctx.ir(anterior.id);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [atual?.id, proximo?.id, anterior?.id, det]);

  return (
    <ArquivoCtx.Provider value={ctx}>
      <div className="jogo arquivo-raiz" data-paleta="ardosia" data-texto={texto}>
        <FiltroDuotom />
        <div className="fundo-gestao" aria-hidden="true" />
        <FundoVivo />
        {!atual ? (
          <TelaTitulo liberados={liberados} />
        ) : (
          <div className="apr-rolagem" ref={rolagem}>
            <SecoesDoCapitulo cap={atual} />
            <BlocoProximo proximo={proximo} />
          </div>
        )}
        <MolduraTela desenhando={!atual} base={atual ? 56 : 0} />
        <HudMinimo aoMenu={() => setMenu(true)} aoTexto={() => setTexto(((texto + 1) % 3) as 0 | 1 | 2)} />
        {atual && <FaixaCapitulos capitulos={visiveis} atual={atual.id} progresso={progresso} />}
        {cartao && <CartaoCapitulo rotulo={`Capítulo ${cartao.num}`} nome={cartao.nome} />}
        {menu && <Consulta capitulos={visiveis} fechar={() => setMenu(false)} />}
        {rota.classe && (
          <div className="ficha-classe-tela">
            <FichaClasse classeId={rota.classe} sair={() => (history.length > 1 ? history.back() : irA("quem", "classes", rota.rascunho, rota.prefixo))} />
          </div>
        )}
        {det && <DetalheSobreposto d={det} fechar={() => setDet(null)} />}
        {mapaAberto && <TelaMapa mapa={mapaAberto} conteudo={conteudo} fechar={() => setMapaAberto(null)} />}
      </div>
    </ArquivoCtx.Provider>
  );
}

/** O duotom (latão e azul-petróleo escuro) dos placeholders: um filtro SVG, aplicado uma vez, nunca animado. */
function FiltroDuotom() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <filter id="duotom-arquivo" colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 1 0" />
        <feComponentTransfer>
          <feFuncR type="table" tableValues="0.09 0.5" />
          <feFuncG type="table" tableValues="0.03 0.4" />
          <feFuncB type="table" tableValues="0.05 0.27" />
        </feComponentTransfer>
      </filter>
    </svg>
  );
}

// ---------- HUD mínimo e faixa de capítulos ----------
function HudMinimo({ aoMenu, aoTexto }: { aoMenu: () => void; aoTexto: () => void }) {
  const { ir } = useArquivo();
  return (
    <div className="apr-hud">
      <button className="apr-selo" onClick={() => ir(null)} aria-label="Tela de título do Arquivo" title="Tela de título">
        <SeloExposicao />
      </button>
      <div className="apr-hud-dir">
        <BotaoAmbiente />
        <button className="btn-hud" onClick={aoTexto} title="Tamanho do texto" aria-label="Tamanho do texto">
          Aa
        </button>
        <button className="btn-hud" onClick={aoMenu} title="Índice e consulta" aria-label="Índice e consulta">
          ☰
        </button>
      </div>
    </div>
  );
}

function FaixaCapitulos({
  capitulos,
  atual,
  progresso,
}: {
  capitulos: (Capitulo & { secoesVisiveis: string[] })[];
  atual: string;
  progresso: number;
}) {
  const { ir } = useArquivo();
  const iAtual = capitulos.findIndex((c) => c.id === atual);
  return (
    <nav className="faixa-capitulos" aria-label="Capítulos">
      <ol>
        {capitulos.map((c, i) => {
          const trancado = c.secoesVisiveis.length === 0;
          const estado = i < iAtual ? "passado" : i === iAtual ? "atual" : "futuro";
          return (
            <li key={c.id} className={`marco ${estado} ${trancado ? "trancado" : ""}`}>
              <button disabled={trancado} onClick={() => ir(c.id)} title={trancado ? "Ainda sendo escrito" : c.nome} aria-current={estado === "atual" ? "step" : undefined}>
                <span className="marco-ponto">{trancado ? <Icone id="cadeado" tamanho={10} /> : null}</span>
                <span className="marco-nome">
                  <span className="marco-num">{c.num}</span> {c.nome}
                </span>
              </button>
              {i < capitulos.length - 1 && (
                <span className="marco-linha" aria-hidden="true">
                  <span className="marco-enche" style={{ width: `${estado === "passado" ? 100 : estado === "atual" ? Math.round(progresso * 100) : 0}%` }} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ---------- tela de título ----------
function TelaTitulo({ liberados }: { liberados: (Capitulo & { secoesVisiveis: string[] })[] }) {
  const { dados, conteudo, ir, criar } = useArquivo();
  const pos = lerPosicao();
  const posOk = pos && liberados.some((c) => c.id === pos.cap);
  return (
    <div className="arquivo-titulo">
      <div className="titulo-arte">
        <ArtePeca id="abertura-titulo" placeholder={{ mapa: "rouillac", x: 52, y: 45, z: 2.6 }} desc="A Exposição à noite, vista de longe" nevoa />
        <div className="degrade-baixo" />
      </div>
      <div className="titulo-miolo">
        <div className="n-L" style={{ color: "var(--brass)" }}>
          Exposition Universelle
        </div>
        <h1 className="n-T titulo-grande">{dados.manifesto.titulo}</h1>
        {dados.manifesto.subtitulo && <p className="n-contexto">{dados.manifesto.subtitulo}</p>}
        {dados.manifesto.conceito && <p className="n-I conceito-titulo">{dados.manifesto.conceito}</p>}
        <div className="complexidade" aria-label={`complexidade ${dados.manifesto.complexidade ?? 0} de 4`}>
          <span className="n-L">complexidade</span>
          {[1, 2, 3, 4].map((n) => (
            <i key={n} className={n <= (dados.manifesto.complexidade ?? 0) ? "cheia" : ""} />
          ))}
        </div>
        <div className="titulo-acoes">
          <BotaoHextech grande onClick={() => liberados[0] && ir(liberados[0].id)} disabled={!liberados.length}>
            Começar
          </BotaoHextech>
          {posOk && (
            <button className="link" onClick={() => ir(pos!.cap, pos!.secao)}>
              Continuar de onde parei
            </button>
          )}
          <button className="link" onClick={criar}>
            Criar meu personagem
          </button>
        </div>
        {!liberados.length && <p className="n-I">Nenhum capítulo está pronto ainda. Para o rascunho, acrescente ?rascunho=1 ao endereço.</p>}
      </div>
      <span className="oculto">{conteudo.geral.titulo}</span>
    </div>
  );
}

// ---------- o capítulo: uma página de seções ----------
function SecoesDoCapitulo({ cap }: { cap: Capitulo & { secoesVisiveis: string[] } }) {
  const { dados } = useArquivo();
  return (
    <>
      {cap.secoesVisiveis.map((id) => {
        const s = dados.secoes[id];
        return (
          <Aparece key={id} id={`sec-${id}`}>
            <SecaoView s={s} cap={cap} primeira={cap.secoesVisiveis[0] === id} />
          </Aparece>
        );
      })}
    </>
  );
}

/** A seção entra com um fade curto quando aparece na tela, uma vez só. */
function Aparece({ id, children }: { id: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [entrou, setEntrou] = useState(() => reduzMovimento() || typeof IntersectionObserver === "undefined");
  useEffect(() => {
    if (entrou || !ref.current) return;
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setEntrou(true);
          io.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    io.observe(ref.current);
    const t = window.setTimeout(() => setEntrou(true), 2500);
    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, [entrou]);
  return (
    <div id={id} ref={ref} className={`apr-secao ${entrou ? "entrou" : ""}`}>
      {children}
    </div>
  );
}

function SecaoView({ s, cap, primeira }: { s: Secao; cap: Capitulo; primeira: boolean }) {
  const blocos = useMemo(() => {
    // o primeiro "##" que repete o título da seção não aparece
    const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const corpo = s.corpo.replace(/^\s*##\s+(.+)\n+/, (todo, h: string) => (norm(h) === norm(s.titulo) ? "" : todo));
    return lerBlocos(corpo);
  }, [s.corpo, s.titulo]);
  const faixa = s.status !== "pronto" && <div className={`faixa-status ${s.status}`}>{s.status === "esqueleto" ? "em escrita" : "rascunho"}</div>;
  switch (s.layout) {
    case "abertura":
      return <Abertura s={s} cap={cap} blocos={blocos} faixa={faixa} />;
    case "texto-arte":
      return <TextoArte s={s} blocos={blocos} faixa={faixa} />;
    case "arte-cheia":
      return (
        <section className="cmp cmp-arte-cheia">
          <ArtePeca id={s.arte?.id} placeholder={s.placeholder} desc={s.arte?.desc} />
          {s.contexto && <p className="n-contexto arte-cheia-frase">{s.contexto}</p>}
        </section>
      );
    case "efemera":
      return (
        <section className="cmp cmp-efemera">
          <div className="efemera-texto">
            {faixa}
            <h2 className="n-C">{s.titulo}</h2>
            {s.contexto && <p className="n-contexto">{s.contexto}</p>}
            <Blocos blocos={blocos.filter((b) => !(b.tipo === "dir" && b.nome === "efemera"))} />
          </div>
          <Efemera id={(blocos.find((b) => b.tipo === "dir" && b.nome === "efemera") as { attrs: Record<string, string> } | undefined)?.attrs.id || ""} />
        </section>
      );
    case "mapa":
      return <SecaoMapa s={s} blocos={blocos} faixa={faixa} />;
    case "galeria":
      return (
        <section className="cmp cmp-galeria">
          <div className="cmp-cabeca">
            {faixa}
            <h2 className="n-C">{s.titulo}</h2>
            {s.contexto && <p className="n-contexto">{s.contexto}</p>}
            <Blocos blocos={blocos.filter((b) => !(b.tipo === "dir" && b.nome === "galeria"))} />
          </div>
          <Blocos blocos={blocos.filter((b) => b.tipo === "dir" && b.nome === "galeria")} />
        </section>
      );
    case "citacao":
      return (
        <section className="cmp cmp-citacao">
          <blockquote>
            <Markdown texto={s.corpo} />
          </blockquote>
        </section>
      );
    case "chamada":
      return <Chamada s={s} cap={cap} />;
    default:
      return <Regras s={s} blocos={blocos} faixa={faixa} />;
  }
  void primeira;
}

/** Regras: o texto numa coluna de leitura e, em Discernimento e Frenesi, o medidor fixo ao lado. */
function Regras({ s, blocos, faixa }: { s: Secao; blocos: Bloco[]; faixa: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const progresso = useProgressoDaSecao(ref);
  const lateral = s.id === "discernimento" ? <ColunaDiscernimento progresso={progresso} /> : s.id === "frenesi" ? <ColunaFrenesi progresso={progresso} /> : null;
  return (
    <section ref={ref} className={`cmp cmp-regras ${lateral ? "com-medidor" : ""}`}>
      <div className="regras-miolo">
        {faixa}
        <h2 className="n-C">{s.titulo}</h2>
        {s.contexto && <p className="n-contexto">{s.contexto}</p>}
        <div className="regras-corpo">
          <Blocos blocos={blocos} />
        </div>
      </div>
      {lateral}
    </section>
  );
}

function Abertura({ s, cap, blocos, faixa }: { s: Secao; cap: Capitulo; blocos: Bloco[]; faixa: ReactNode }) {
  const lateral = blocos.find((b) => b.tipo === "dir" && b.nome === "lateral") as Extract<Bloco, { tipo: "dir" }> | undefined;
  const principal = blocos.filter((b) => b !== lateral);
  return (
    <section className="cmp cmp-abertura">
      <div className="abertura-arte">
        <ArtePeca id={s.arte?.id} placeholder={s.placeholder} desc={s.arte?.desc} nevoa foco={s.foco || "center 25%"} />
        <div className="degrade-baixo" />
      </div>
      <div className="abertura-conteudo">
        <header className="abertura-titulo">
          <span className="barra-latao" aria-hidden="true" />
          <div>
            <div className="n-L" style={{ color: "var(--brass)" }}>
              Capítulo {cap.num}
            </div>
            <h1 className="n-T">{s.titulo}</h1>
            {s.contexto && <p className="n-contexto contexto-grande">{s.contexto}</p>}
          </div>
        </header>
        <div className="abertura-colunas">
          <div className="col-principal">
            {faixa}
            <Blocos blocos={principal} />
          </div>
          {lateral && (
            <aside className="col-lateral">
              <Blocos blocos={lerBlocos(lateral.filho || "")} />
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}

function TextoArte({ s, blocos, faixa }: { s: Secao; blocos: Bloco[]; faixa: ReactNode }) {
  const { conteudo } = useArquivo();
  return (
    <section className={`cmp cmp-texto-arte lado-${s.lado}`}>
      <div className="ta-texto">
        {faixa}
        <h2 className="n-C">{s.titulo}</h2>
        {s.contexto && <p className="n-contexto">{s.contexto}</p>}
        <Blocos blocos={blocos} />
      </div>
      {s.id === "modulo-ficha" ? (
        <CartaoFichaDemo />
      ) : (
      <figure className={`ta-arte tipo-${s.arte?.tipo || "A"} ${s.arte?.id && conteudo.arte[s.arte.id] ? "com-imagem" : ""}`} style={s.arte?.id && conteudo.arteInfo[s.arte.id] ? { aspectRatio: String(conteudo.arteInfo[s.arte.id].proporcao) } : undefined}>
        <ArtePeca id={s.arte?.id} placeholder={s.placeholder} desc={s.arte?.desc} alta inteira />
      </figure>
      )}
    </section>
  );
}

function SecaoMapa({ s, blocos, faixa }: { s: Secao; blocos: Bloco[]; faixa: ReactNode }) {
  const { conteudo, abrirMapa } = useArquivo();
  const mapa = (blocos.find((b) => b.tipo === "dir" && b.nome === "mapa") as { attrs: Record<string, string> } | undefined)?.attrs.id || "continente";
  const url = useImagemMapa(mapa, conteudo);
  const resto = blocos.filter((b) => !(b.tipo === "dir" && b.nome === "mapa"));
  return (
    <section className="cmp cmp-mapa">
      <div className="cmp-cabeca">
        {faixa}
        <h2 className="n-C">{s.titulo}</h2>
        {s.contexto && <p className="n-contexto">{s.contexto}</p>}
      </div>
      <div className="mapa-grade">
        <figure className="mapa-imagem">
          {mapa === "continente" ? <MapaContinente /> : url ? <img src={url} alt={`Mapa: ${s.titulo}`} /> : <div className="carregando">Desenhando o mapa…</div>}
          <figcaption>
            <Ramo titulo={mapa === "rouillac" ? "Explorar Rouillac" : "Explorar o mapa"} descricao="Aproxime, arraste, meça distâncias." icone="lugar" aoClicar={() => abrirMapa(mapa as "continente" | "rouillac")} />
          </figcaption>
          {mapa === "continente" && <GradeBandeiras />}
        </figure>
        <div className="mapa-lado">
          <Blocos blocos={resto} />
        </div>
      </div>
    </section>
  );
}

/** O continente é desenhado inline, para as regras de cor noturna da UI valerem. */
function MapaContinente() {
  const { conteudo } = useArquivo();
  const m = conteudo.continente;
  const [interno, setInterno] = useState("");
  useEffect(() => {
    if (m.arquivo) carregarSvgInterno(m.arquivo).then(setInterno);
  }, [m.arquivo]);
  const [x, y, w, h] = m.viewBox;
  return (
    <div className="mapa-noturno mapa-estatico">
      <svg viewBox={`${x} ${y} ${w} ${h}`} role="img" aria-label={m.titulo} dangerouslySetInnerHTML={{ __html: interno }} />
    </div>
  );
}

/** A imagem do mapa: o continente já é escuro; Rouillac é a planta pública recolorida (a mesma da sessão). */
function useImagemMapa(mapa: string, conteudo: Conteudo) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    let criada: string | null = null;
    if (mapa === "continente") return;
    fetch(urlConteudo("mapas/rouillac/distritos.svg"))
      .then((r) => r.text())
      .then((t) => {
        criada = URL.createObjectURL(new Blob([recolorirSvgNoturno(t, { principais: conteudo.rouillac.principais || [], ppu: 0.25 })], { type: "image/svg+xml" }));
        if (vivo) setUrl(criada);
      });
    return () => {
      vivo = false;
      if (criada) URL.revokeObjectURL(criada);
    };
  }, [mapa]);
  return url;
}

function Chamada({ s, cap }: { s: Secao; cap: Capitulo }) {
  const { ir, criar } = useArquivo();
  return (
    <section className="cmp cmp-chamada">
      <div className="chamada-arte">
        <ArtePeca id={s.arte?.id} placeholder={s.placeholder} desc={s.arte?.desc} nevoa />
        <div className="degrade-baixo forte" />
      </div>
      <div className="chamada-miolo">
        <div className="n-L" style={{ color: "var(--brass)" }}>
          {cap.nome}
        </div>
        <h1 className="n-T">{s.titulo}</h1>
        <div className="n-N chamada-texto">
          <Markdown texto={s.corpo} />
        </div>
        <div className="titulo-acoes">
          <BotaoHextech grande onClick={criar}>
            Criar meu personagem
          </BotaoHextech>
          <button className="link" onClick={() => ir(null)}>
            Voltar ao início
          </button>
        </div>
      </div>
    </section>
  );
}

/** Fim de cada capítulo: um recorte do próximo, o nome dele e a ação principal. */
function BlocoProximo({ proximo }: { proximo?: Capitulo }) {
  const { dados, ir } = useArquivo();
  if (!proximo) return <div className="proximo-vazio" />;
  const primeira = dados.secoes[proximo.secoes[0]];
  return (
    <section className="bloco-proximo">
      <div className="proximo-arte">
        <ArtePeca id={primeira?.arte?.id} placeholder={primeira?.placeholder} desc={primeira?.arte?.desc} />
        <div className="degrade-baixo forte" />
      </div>
      <div className="proximo-miolo">
        <div className="n-L" style={{ color: "var(--brass)" }}>
          Próximo · Capítulo {proximo.num}
        </div>
        <div className="n-T proximo-nome">{proximo.nome}</div>
        <BotaoHextech grande onClick={() => ir(proximo.id)}>
          Seguir ▸
        </BotaoHextech>
      </div>
    </section>
  );
}

// ---------- Consulta (☰): índice sem estado ----------
function Consulta({ capitulos, fechar }: { capitulos: (Capitulo & { secoesVisiveis: string[] })[]; fechar: () => void }) {
  const { dados, ir } = useArquivo();
  return (
    <div className="sobreposicao" onMouseDown={(e) => e.target === e.currentTarget && fechar()}>
      <Janela tipo="pesada" className="consulta">
        <div className="consulta-cab">
          <div className="n-S">Índice</div>
          <button className="icone-btn" onClick={fechar} aria-label="fechar">
            <Icone id="fechar" tamanho={14} />
          </button>
        </div>
        <div className="consulta-corpo">
          {capitulos.map((c) => (
            <section key={c.id} className={c.secoesVisiveis.length ? "" : "trancado"}>
              <h3 className="n-L">
                {c.num} · {c.nome} {!c.secoesVisiveis.length && <Icone id="cadeado" tamanho={11} />}
              </h3>
              <ul>
                {c.secoesVisiveis.map((id) => (
                  <li key={id}>
                    <button className="link" onClick={() => ir(c.id, id)}>
                      {dados.secoes[id].titulo || dados.secoes[id].arte?.desc || id}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Janela>
    </div>
  );
}

function DetalheSobreposto({ d, fechar }: { d: { titulo: string; etiqueta?: string; corpo: ReactNode }; fechar: () => void }) {
  return (
    <div className="sobreposicao" onMouseDown={(e) => e.target === e.currentTarget && fechar()}>
      <Janela tipo="pesada" className="detalhe-grande">
        <div className="consulta-cab">
          <div>
            {d.etiqueta && <div className="n-L">{d.etiqueta}</div>}
            <div className="n-S">{d.titulo}</div>
          </div>
          <button className="icone-btn" onClick={fechar} aria-label="fechar">
            <Icone id="fechar" tamanho={14} />
          </button>
        </div>
        {d.corpo}
      </Janela>
    </div>
  );
}

// ---------- blocos e diretivas ----------
function Blocos({ blocos }: { blocos: Bloco[] }) {
  return (
    <>
      {blocos.map((b, k) => (
        <BlocoView key={k} bloco={b} />
      ))}
    </>
  );
}

function dividirAbertura(md: string) {
  const partes = md.split(/\n(?=## )/);
  const proposta = (partes.shift() || "").replace(/^#\s.*\n/, "");
  const blocos = partes.map((p) => {
    const [cab, ...resto] = p.split("\n");
    return { titulo: cab.replace(/^##\s*/, ""), corpo: resto.join("\n") };
  });
  return { proposta, blocos };
}

function BlocoView({ bloco }: { bloco: Bloco }) {
  const { dados, conteudo, ir, rascunho } = useArquivo();
  if (bloco.tipo === "md") return <TextoComTermos texto={bloco.texto} />;
  const { nome, attrs, filho } = bloco;
  switch (nome) {
    case "proposta": {
      const { proposta } = dividirAbertura(conteudo.abertura);
      return (
        <div className="proposta-bloco">
          <div className="n-L" style={{ color: "var(--brass)" }}>
            A Proposta
          </div>
          <Markdown texto={proposta} className="n-N proposta" />
        </div>
      );
    }
    case "abertura-blocos": {
      const { blocos } = dividirAbertura(conteudo.abertura);
      return (
        <>
          {blocos.map((b) => (
            <div key={b.titulo} className="lateral-bloco">
              <div className="n-L" style={{ color: "var(--brass)" }}>
                {b.titulo}
              </div>
              <Markdown texto={b.corpo} className="n-N" />
            </div>
          ))}
        </>
      );
    }
    case "lateral":
      return <Blocos blocos={lerBlocos(filho || "")} />;
    case "nota":
      return (
        <aside className="md-nota">
          <span className="insignia" style={{ ["--t" as string]: "26px" }}>
            <Icone id="info" tamanho={14} />
          </span>
          <div>
            {attrs.titulo && <div className="n-L">{attrs.titulo}</div>}
            <TextoComTermos texto={filho || ""} classe="n-I" />
          </div>
        </aside>
      );
    case "exemplo":
      return (
        <div className="md-exemplo">
          <TextoComTermos texto={filho || ""} />
        </div>
      );
    case "citacao":
      return (
        <blockquote className="md-citacao">
          <Markdown texto={filho || ""} />
          {attrs.autor && <cite>{attrs.autor}</cite>}
        </blockquote>
      );
    case "efemera":
      return <Efemera id={attrs.id || ""} />;
    case "tabela-paises":
      return <TabelaPaises />;
    case "pais": {
      const p = conteudo.paises.find((x) => x.id === attrs.id);
      return p ? (
        <div className="ficha-catalogo">
          <div>
            <div className="n-L">{p.lado}</div>
            <div className="n-S">{p.nome}</div>
            <p className="n-I">{p.publico}</p>
          </div>
        </div>
      ) : null;
    }
    case "galeria":
      return <Galeria fonte={attrs.fonte || ""} />;
    case "carta":
    case "cartas":
      return (
        <CartasDiretiva id={attrs.id} dominio={attrs.dominio} />
      );
    case "mapa":
      return null;
    case "ramo": {
      void dados;
      return (
        <div className="ramos">
          <Ramo titulo={attrs.titulo || "Seguir"} chamada={attrs.cta} icone="cap-1" aoClicar={() => attrs.para && ir(attrs.para)} />
        </div>
      );
    }
    default:
      return rascunho ? <div className="dir-erro">Diretiva desconhecida: {nome}</div> : null;
  }
}

function CartasDiretiva({ id, dominio }: { id?: string; dominio?: string }) {
  const { dados } = useArquivo();
  const ampliar = useAmpliarCarta();
  const lista = dados.cartas.filter((c) => (id ? c.id === id : dominio ? c.dominio === dominio : true)).slice(0, id ? 1 : 6);
  const mostrar = lista.length ? lista : [{ id: "ph", nome: id || dominio || "Carta", dominio: dominio || "a definir", nivel: 1, texto: "", imagem: null }];
  return (
    <div className="cartas-fileira">
      {mostrar.map((k) => (
        <CartaPlaceholder key={k.id} carta={k} aoClicar={() => ampliar(k as never)} />
      ))}
    </div>
  );
}

/** Markdown com :termo[...] virando o termo sublinhado, com a definição na dica. */
function TextoComTermos({ texto, classe = "n-N" }: { texto: string; classe?: string }) {
  const { dados } = useArquivo();
  const html = useMemo(
    () =>
      texto.replace(/:termo\[([^\]]+)\]/g, (_m, t: string) => {
        const g = dados.glossario.find((x) => x.termo === t || x.alias.includes(t));
        return `<span class="termo" title="${(g?.texto || "").replace(/"/g, "&quot;")}">${t}</span>`;
      }),
    [texto, dados.glossario],
  );
  return <Markdown texto={html} className={classe} />;
}

/** As bandeiras dos países, 2 × 4, embaixo do mapa do continente; clicar abre a ficha do país. */
function GradeBandeiras() {
  const { conteudo, detalhe } = useArquivo();
  const paises = conteudo.paises.filter((p) => p.bandeira);
  return (
    <ul className="grade-bandeiras">
      {paises.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            className="bandeira-cartao"
            onClick={() =>
              detalhe({
                titulo: p.nome,
                etiqueta: p.lado,
                corpo: (
                  <div className="ficha-pais-corpo">
                    <div className="pais-emblemas">
                      {p.brasao && conteudo.arte[p.brasao] && <img className="pais-brasao" src={conteudo.arte[p.brasao]} alt="" />}
                      <img className="pais-bandeira" src={`${import.meta.env.BASE_URL}arte/${p.bandeira}`} alt={`Bandeira de ${p.nome}`} />
                    </div>
                    <div className="ficha-pais-texto">
                      <p className="n-I">Capital: {p.capital}</p>
                      <p className="n-N">{p.publico}</p>
                    </div>
                  </div>
                ),
              })
            }
          >
            <img src={`${import.meta.env.BASE_URL}arte/${p.bandeira}`} alt="" loading="lazy" />
            <span className="bandeira-nome n-S">{p.nome}</span>
            <span className="bandeira-lado n-L">{p.lado}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function TabelaPaises() {
  const { conteudo } = useArquivo();
  return (
    <table className="tabela-ui">
      <thead>
        <tr>
          <th>País</th>
          <th>Lado</th>
          <th>Capital</th>
        </tr>
      </thead>
      <tbody>
        {conteudo.paises.map((p) => (
          <tr key={p.id}>
            <td>{p.nome}</td>
            <td>{p.lado}</td>
            <td>{p.capital}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** A tela de mapa de consulta: o mesmo mapa da sessão (zoom, camadas, régua), sem alfinetes da mesa. */
function TelaMapa({ mapa, conteudo, fechar }: { mapa: "continente" | "rouillac"; conteudo: Conteudo; fechar: () => void }) {
  const [pais, setPais] = useState<string | null>(null);
  // uma "sessão" vazia: o mapa só precisa do conteúdo; sem sala, sem alfinetes, sem edição
  const falsa = useMemo(
    () =>
      ({
        sala: SALA_VAZIA,
        conteudo,
        meuJid: null,
        mestre: false,
        acoes: { salvarPin: async () => "", apagarPin: async () => undefined },
      }) as unknown as Sessao,
    [conteudo],
  );
  const p = pais ? conteudo.paises.find((x) => x.id === pais) : null;
  return (
    <div className="tela-mapa-consulta" style={{ ["--mesa-w" as string]: "0px" }}>
      <SessaoCtx.Provider value={falsa}>
        <ProvedorMapa>
          <MapaDeConsulta mapa={mapa} aoPais={setPais} paisSel={pais} />
        </ProvedorMapa>
      </SessaoCtx.Provider>
      <button className="btn-hud fechar-mapa" onClick={fechar}>
        ✕ Voltar à leitura
      </button>
      {p && (
        <aside className="ficha-pais-consulta">
          <button className="icone-btn" onClick={() => setPais(null)} aria-label="fechar a ficha">
            <Icone id="fechar" tamanho={14} />
          </button>
          {(p.bandeira || (p.brasao && conteudo.arte[p.brasao])) && (
            <div className="pais-emblemas">
              {p.brasao && conteudo.arte[p.brasao] && <img className="pais-brasao" src={conteudo.arte[p.brasao]} alt="" />}
              {p.bandeira && <img className="pais-bandeira" src={`${import.meta.env.BASE_URL}arte/${p.bandeira}`} alt={`Bandeira de ${p.nome}`} />}
            </div>
          )}
          <div className="n-L">{p.lado}</div>
          <div className="n-S">{p.nome}</div>
          <dl className="dados-ficha">
            <div>
              <dt className="n-L">capital</dt>
              <dd>{p.capital}</dd>
            </div>
          </dl>
          <p className="n-N">{p.publico}</p>

        </aside>
      )}
    </div>
  );
}
function MapaDeConsulta({ mapa, aoPais, paisSel }: { mapa: "continente" | "rouillac"; aoPais: (id: string | null) => void; paisSel: string | null }) {
  useConfigurarMapa({ interativo: true, bloqueado: true, paisSelecionado: paisSel, aoClicarPais: aoPais }, [paisSel]);
  return <MapaFundo mapa={mapa} />;
}

/** Objeto de papel: pousa levemente girado sobre a tela escura; clicar amplia e endireita. */
function Efemera({ id }: { id: string }) {
  const { conteudo, detalhe, dados } = useArquivo();
  const nome = id === "cartaz" ? "O cartaz da Exposição" : id === "convite" ? "O convite" : "Peça de época";
  const lido = dados.efemeras[id] || (id === "convite" ? conteudo.convite : null);
  return (
    <button
      type="button"
      className="efemera"
      title="Inspecionar"
      onClick={() =>
        detalhe({
          titulo: nome,
          corpo: (
            <div className="efemera-aberta">
              {lido ? (
                <Markdown texto={lido} />
              ) : (
                <>
                  <span className="efemera-linha" />
                  <span className="efemera-linha" />
                  <span className="efemera-linha curta" />
                  <p className="n-I">O texto desta peça ainda está sendo escrito.</p>
                </>
              )}
            </div>
          ),
        })
      }
    >
      <span className="n-L">{nome}</span>
      <span className="efemera-linha" />
      <span className="efemera-linha" />
      <span className="efemera-linha curta" />
      <span className="efemera-dica n-I">clique para ler</span>
    </button>
  );
}

// ---------- galeria (cartões grandes com retrato 3:4) ----------
function itensDe(fonte: string, conteudo: Conteudo, dados: DadosArquivo): { itens: ItemGaleria[]; vazio: string } {
  if (fonte === "comunidades")
    return {
      itens: conteudo.comunidades.map((c) => ({ id: c.id, nome: c.nome, original: c.original, descricao: c.descricao || "", grupo: c.grupo, detalhes: [{ rotulo: "Habilidade", valor: c.habilidade || "em tradução" }] })),
      vazio: "As comunidades ainda estão sendo escritas.",
    };
  if (fonte === "classes")
    return {
      itens: conteudo.classes
        .filter((c) => c.nova)
        .map((c) => ({ id: c.id, nome: c.nome, descricao: c.fantasia, detalhes: [{ rotulo: "Domínios", valor: c.dominios.join(" · ") }, ...(c.evasao != null ? [{ rotulo: "Evasão", valor: String(c.evasao) }] : []), ...(c.pv != null ? [{ rotulo: "Pontos de vida", valor: String(c.pv) }] : [])] })),
      vazio: "As classes ainda estão sendo escritas.",
    };
  if (fonte === "ancestralidades") return { itens: dados.ancestralidades, vazio: "As ancestralidades ainda estão sendo escritas." };
  if (fonte === "equipamento") return { itens: dados.equipamento, vazio: "O catálogo de equipamento ainda está sendo escrito." };
  return { itens: [], vazio: "Fonte desconhecida." };
}
const NOMES_GRUPO: Record<string, string> = { basico: "Livro básico", "hope-fear": "Hope & Fear" };

const LARG_CARTAO = 260;
const VAO = 22;

/** Carrossel de verdade: páginas de cartões inteiros, sem rolagem. As setas ficam nas laterais (nunca sobre os cartões) e só existem quando há mais cartões do que cabem. */
function Galeria({ fonte }: { fonte: string }) {
  const { conteudo, dados, detalhe, abrirClasse } = useArquivo();
  const { itens, vazio } = itensDe(fonte, conteudo, dados);
  const janela = useRef<HTMLDivElement>(null);
  const [porPagina, setPorPagina] = useState(3);
  const [larg, setLarg] = useState(LARG_CARTAO);
  const [pagina, setPagina] = useState(0);
  const toque = useRef<number | null>(null);
  useEffect(() => {
    const el = janela.current;
    if (!el) return;
    const medir = () => {
      const w = el.querySelector<HTMLElement>(".cartao-galeria")?.offsetWidth || LARG_CARTAO;
      setLarg(w);
      const disponivel = (el.parentElement?.clientWidth || el.clientWidth) - 116; // menos as duas colunas das setas
      setPorPagina(Math.max(1, Math.floor((disponivel + VAO) / (w + VAO))));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el.parentElement || el);
    return () => ro.disconnect();
  }, [itens.length]);
  if (!itens.length) return <p className="n-I galeria-vazia">{vazio}</p>;
  const total = Math.max(1, Math.ceil(itens.length / porPagina));
  const cabe = itens.length <= porPagina;
  const atual = Math.min(pagina, total - 1);
  // a última página mostra os últimos cartões inteiros, sem espaço vazio
  const primeiro = Math.min(atual * porPagina, Math.max(0, itens.length - porPagina));
  const ir = (d: number) => setPagina(Math.max(0, Math.min(total - 1, atual + d)));
  const abrir = (it: ItemGaleria) =>
    detalhe({
      titulo: it.nome,
      etiqueta: `${it.grupo ? NOMES_GRUPO[it.grupo] || it.grupo : fonte}${it.original ? ` · ${it.original}` : ""}`,
      corpo: (
        <div className="detalhe-grade">
          <div className="detalhe-retrato">
            <Retrato fonte={fonte} it={it} />
          </div>
          <div className="detalhe-texto">
            {it.descricao ? <p className="n-N">{it.descricao}</p> : fonte === "ancestralidades" ? <p className="n-I">descrição e habilidades em produção</p> : fonte === "comunidades" ? <p className="n-I">descrição em produção</p> : null}
            {it.detalhes && (
              <dl className="dados-ficha">
                {it.detalhes.map((d) => (
                  <div key={d.rotulo}>
                    <dt className="n-L">{d.rotulo}</dt>
                    <dd>{d.valor}</dd>
                  </div>
                ))}
              </dl>
            )}
            {fonte === "classes" && (
              <button className="link" onClick={() => abrirClasse(it.id)}>
                Ver a ficha completa ▸
              </button>
            )}
            <p className="n-I">É no criador de personagem que você escolhe.</p>
          </div>
        </div>
      ),
    });
  return (
    <div className={`galeria ${cabe ? "cabe" : ""}`}>
      {!cabe && (
        <button className="seta-galeria" disabled={atual === 0} onClick={() => ir(-1)} aria-label="anterior">
          ◂
        </button>
      )}
      <div
        className="galeria-janela"
        ref={janela}
        style={{ width: Math.min(itens.length, porPagina) * larg + (Math.min(itens.length, porPagina) - 1) * VAO, justifySelf: "center", maxWidth: "100%" }}
        onPointerDown={(e) => (toque.current = e.clientX)}
        onPointerUp={(e) => {
          if (toque.current !== null && !cabe && Math.abs(e.clientX - toque.current) > 60) ir(e.clientX < toque.current ? 1 : -1);
          toque.current = null;
        }}
      >
        <div className="galeria-trilho" style={{ transform: `translateX(-${primeiro * (larg + VAO)}px)` }}>
          {itens.map((it) => (
            <button key={it.id} className={`cartao-galeria ${fonte === "classes" ? "so-arte" : ""}`} title={it.nome} onClick={() => abrir(it)}>
              <Retrato fonte={fonte} it={it} />
              {fonte !== "classes" && <span className="cartao-nome n-S">{it.nome}</span>}
              {fonte !== "classes" && it.descricao && <span className="cartao-linha n-I">{it.descricao}</span>}
            </button>
          ))}
        </div>
      </div>
      {!cabe && (
        <button className="seta-galeria" disabled={atual >= total - 1} onClick={() => ir(1)} aria-label="próximo">
          ▸
        </button>
      )}
      {!cabe && (
        <div className="galeria-pontos" role="tablist" aria-label="páginas">
          {Array.from({ length: total }, (_, i) => (
            <button key={i} className={i === atual ? "ativo" : ""} onClick={() => setPagina(i)} aria-label={`página ${i + 1}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function Retrato({ fonte, it }: { fonte: string; it: ItemGaleria }) {
  const { conteudo } = useArquivo();
  const aid = idArte(fonte, it.id);
  const url = it.imagem || conteudo.arte[aid];
  return (
    <span className="retrato-34" style={conteudo.arteInfo[aid] && url && !it.imagem ? { aspectRatio: String(conteudo.arteInfo[aid].proporcao) } : undefined}>
      {url ? <img src={url} srcSet={it.imagem ? undefined : conteudo.arteSet[aid]} sizes="260px" alt="" loading="lazy" /> : <PlaceholderArte id={idArte(fonte, it.id)} monograma={it.nome.slice(0, 1)} />}
    </span>
  );
}
