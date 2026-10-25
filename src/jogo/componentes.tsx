import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { FILIGRANA, FLORAO, svgMolduraPesada, type TracoFiligrana } from "./filigrana";
import { Icone } from "./icones";
import "./cursores";

// a moldura vira uma variável CSS, uma vez só
if (typeof document !== "undefined") document.documentElement.style.setProperty("--moldura-pesada", svgMolduraPesada());

// ---------- Moldura e janela ----------
function Tracos({ lista }: { lista: TracoFiligrana[] }) {
  return (
    <>
      {lista.map((p, i) =>
        p.preenchido ? (
          <path key={i} className="joia" d={p.d} fill="currentColor" />
        ) : (
          <g key={i}>
          <path
            className={p.veu ? "folha" : "traco"}
            d={p.d}
            pathLength={1}
            fill={p.veu ? "currentColor" : "none"}
            fillOpacity={p.veu ? 0.18 : undefined}
            stroke="currentColor"
            strokeWidth={p.largura ?? 1.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {!p.veu && <path className="fluxo" d={p.d} pathLength={1} fill="none" strokeWidth={(p.largura ?? 1.2) + 0.6} strokeLinecap="round" style={{ animationDelay: `${-(i * 0.37) % 2.2}s` }} />}
          </g>
        ),
      )}
    </>
  );
}

function Canto({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  return (
    <svg className={`canto ${pos}`} viewBox="0 0 96 96" aria-hidden="true">
      <Tracos lista={FILIGRANA} />
    </svg>
  );
}

function Florao() {
  return (
    <svg className="florao" viewBox="0 0 120 30" aria-hidden="true">
      <Tracos lista={FLORAO} />
    </svg>
  );
}

export function Janela({
  tipo = "pesada",
  children,
  className = "",
  style,
  animar,
  topo,
  rolar,
  rodape,
}: {
  tipo?: "pesada" | "leve";
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  animar?: boolean;
  /** fica fixo no alto quando a janela rola */
  topo?: ReactNode;
  /** a moldura fica parada e só o miolo rola */
  rolar?: boolean;
  /** fica fixo embaixo, sempre visível, fora da rolagem */
  rodape?: ReactNode;
}) {
  return (
    <section className={`janela ${tipo} ${animar ? "anim-janela-abre" : ""} ${rolar ? "rolavel" : ""} ${className}`} style={style}>
      {tipo === "pesada" && (
        <div className="cantos" aria-hidden="true">
          <Canto pos="tl" />
          <Canto pos="tr" />
          <Canto pos="bl" />
          <Canto pos="br" />
          <Florao />
          <span className="rebite b" />
          <span className="rebite l" />
          <span className="rebite r" />
        </div>
      )}
      {topo}
      {rolar ? <div className="janela-rolagem">{children}</div> : children}
      {rodape && <div className="janela-rodape">{rodape}</div>}
    </section>
  );
}

export function Cabecalho({
  capitulo,
  nomeCap,
  titulo,
  contexto,
  refCapitulo,
}: {
  capitulo?: string;
  /** nome do capítulo, que vai junto da numeração na faixa; o título só aparece se for outra coisa */
  nomeCap?: string;
  titulo: string;
  contexto?: string;
  refCapitulo?: React.Ref<HTMLSpanElement>;
}) {
  const repete = !!nomeCap && nomeCap.trim().toLowerCase() === titulo.trim().toLowerCase();
  return (
    <header className="cabecalho">
      {capitulo && (
        <div className="faixa">
          <span className="n-L" ref={refCapitulo}>
            {capitulo}
            {nomeCap ? ` · ${nomeCap}` : ""}
          </span>
        </div>
      )}
      {!repete && <h2 className="n-C">{titulo}</h2>}
      {contexto && <p className="n-contexto">{contexto}</p>}
    </header>
  );
}

export function Divisoria() {
  return (
    <div className="divisoria" aria-hidden="true">
      <Icone id="losango" tamanho={12} />
    </div>
  );
}

// ---------- Arte e placeholder ----------
export function PlaceholderArte({ id, icone, monograma }: { id: string; icone?: string; monograma?: string }) {
  const pid = useId().replace(/:/g, "");
  return (
    <div className="placeholder-arte">
      <svg className="hachura" aria-hidden="true">
        <defs>
          <pattern id={`h${pid}`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M0 0v7M3.5 0v7" stroke="var(--brass-dark)" strokeWidth=".7" opacity=".25" />
          </pattern>
          <pattern id={`x${pid}`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <path d="M0 0v7" stroke="var(--brass-dark)" strokeWidth=".6" opacity=".18" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#h${pid})`} />
        <rect width="100%" height="100%" fill={`url(#x${pid})`} />
      </svg>
      <div className="centro">
        <div className="mono" style={{ width: "clamp(28px, 42%, 64px)" }}>
          {monograma ? (
            <span style={{ fontFamily: "var(--font-display)", fontSize: "clamp(13px, 1.6em, 26px)" }}>{monograma}</span>
          ) : (
            <Icone id={icone || "cap-5"} tamanho={30} />
          )}
        </div>
      </div>
      <span className="id n-L">{id}</span>
    </div>
  );
}

export function Vinheta({ id, arquivo, icone, monograma, tamanho = 176, proporcao = 1 }: { id: string; arquivo?: string | null; icone?: string; monograma?: string; tamanho?: number; proporcao?: number }) {
  return (
    <div className={`vinheta ${tamanho < 100 ? "pequena" : ""}`} style={{ width: tamanho, height: Math.round(tamanho / proporcao) }}>
      {arquivo ? <img src={arquivo} alt="" /> : <PlaceholderArte id={id} icone={icone} monograma={monograma} />}
    </div>
  );
}

// ---------- Ramos ----------
export type EstadoRamo = "normal" | "hover" | "foco" | "selecionado" | "bloqueado" | "feito";

export function Selo({ tipo, children }: { tipo?: "privado" | "vez" | "feito" | "gm"; children: ReactNode }) {
  return <span className={`selo ${tipo || ""}`}>{children}</span>;
}

export function Ramo({
  titulo,
  descricao,
  chamada,
  icone,
  estado = "normal",
  selo,
  aoClicar,
  aberto,
  children,
  corMedalhao,
  estilo,
}: {
  titulo: string;
  descricao?: ReactNode;
  chamada?: string;
  icone: string;
  estado?: EstadoRamo;
  selo?: ReactNode;
  aoClicar?: () => void;
  aberto?: boolean;
  children?: ReactNode;
  corMedalhao?: string;
  estilo?: CSSProperties;
}) {
  const [carimbo, setCarimbo] = useState(0);
  const [cintilar] = useState(() => ({ ["--atraso" as string]: `${(Math.random() * 3).toFixed(2)}s`, ["--dur" as string]: `${(3 + Math.random() * 1.6).toFixed(2)}s` }));
  const bloqueado = estado === "bloqueado";
  const ico = bloqueado ? "cadeado" : estado === "feito" ? "visto" : icone;
  return (
    <div>
      <button
        type="button"
        className={`ramo ${estado !== "normal" ? estado : ""}`}
        aria-disabled={bloqueado || undefined}
        aria-pressed={estado === "selecionado" ? true : undefined}
        aria-expanded={children ? !!aberto : undefined}
        onClick={() => {
          if (bloqueado) return;
          setCarimbo((n) => n + 1);
          aoClicar?.();
        }}
        style={estilo}
      >
        <div className="n-R">{titulo}</div>
        {(descricao || chamada) && (
          <p className="n-I">
            {descricao} {chamada && <span className="chamada">{chamada}</span>}
          </p>
        )}
        {selo && <div className="selo-linha">{selo}</div>}
        <span
          key={carimbo}
          className={`medalhao ${carimbo ? "anim-carimbo" : ""}`}
          style={corMedalhao ? { ...cintilar, background: `radial-gradient(circle at 40% 35%, ${corMedalhao}, #111617 120%)`, color: "#0e1213" } : cintilar}
        >
          <Icone id={ico} tamanho={22} />
        </span>
      </button>
      {children && aberto && <div className="ramo-aberto">{children}</div>}
    </div>
  );
}

export function AreaEscrita({ rotulo, valor, aoSalvar, linhas = 3, placeholder }: { rotulo: string; valor?: string; aoSalvar: (v: string) => void; linhas?: number; placeholder?: string }) {
  const [v, setV] = useState(valor || "");
  const [salvo, setSalvo] = useState(0);
  const id = useId();
  return (
    <div className="escrita">
      <label className="n-L" htmlFor={id}>
        {rotulo}
      </label>
      <textarea id={id} rows={linhas} value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} />
      <div className="rodape">
        <Placa onClick={() => { aoSalvar(v); setSalvo((n) => n + 1); }} disabled={!v.trim()}>
          Salvar
        </Placa>
        {salvo > 0 && (
          <span key={salvo} className="anim-selo-carimbo">
            <Selo tipo="feito">
              <Icone id="visto" tamanho={12} /> feito
            </Selo>
          </span>
        )}
      </div>
    </div>
  );
}

// ---------- Insígnia (ícone em quadro chanfrado) ----------
export function Insignia({ icone, ativa, tamanho = 38, titulo }: { icone: string; ativa?: boolean; tamanho?: number; titulo?: string }) {
  return (
    <span className={`insignia ${ativa ? "ativa" : ""}`} style={{ ["--t" as string]: `${tamanho}px` }} title={titulo}>
      <Icone id={icone} tamanho={tamanho} />
    </span>
  );
}

// ---------- Ação principal ----------
// Placa de latão: metal com faixa de luz, cantos chanfrados, filete gravado duplo e duas tachas.
const CHANFRO = 7;
function octogono(w: number, h: number, i: number) {
  const c = Math.max(1, CHANFRO - i * 0.6);
  return [
    [c + i, i],
    [w - c - i, i],
    [w - i, c + i],
    [w - i, h - c - i],
    [w - c - i, h - i],
    [c + i, h - i],
    [i, h - c - i],
    [i, c + i],
  ]
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
}

export function Placa({ children, onClick, disabled, tipo = "button" }: { children: ReactNode; onClick?: () => void; disabled?: boolean; tipo?: "button" | "submit" }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [t, setT] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current!;
    const medir = () => setT({ w: el.offsetWidth, h: el.offsetHeight });
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <span className={`placa-envolta ${disabled ? "desligada" : ""}`}>
      <button ref={ref} type={tipo} className="placa" onClick={onClick} disabled={disabled}>
        <span className="placa-reflexo" aria-hidden="true" />
        {t.w > 0 && (
          <svg className="placa-filete" width={t.w} height={t.h} aria-hidden="true">
            <polygon className="aresta" points={octogono(t.w, t.h, 0.75)} />
            <polygon className="gravado-escuro" points={octogono(t.w, t.h, 4)} />
            <polygon className="gravado-claro" points={octogono(t.w, t.h, 5)} />
            {[11, t.w - 11].map((x) => (
              <path key={x} className="tacha" d={`M${x} ${t.h / 2 - 4} L${x + 3.2} ${t.h / 2} L${x} ${t.h / 2 + 4} L${x - 3.2} ${t.h / 2} Z`} />
            ))}
          </svg>
        )}
        <span className="placa-texto">{children}</span>
      </button>
    </span>
  );
}

// ---------- Tooltip rico ----------
export function ComTooltip({ titulo, texto, icone, children }: { titulo: string; texto?: string; icone?: string; children: ReactNode }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const alvo = useRef<HTMLSpanElement>(null);
  const mostrar = () => {
    const r = alvo.current!.getBoundingClientRect();
    setPos({ x: Math.min(r.left, window.innerWidth - 320), y: r.bottom + 8 });
  };
  const agendar = (ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(mostrar, ms);
  };
  const esconder = () => {
    window.clearTimeout(timer.current);
    setPos(null);
  };
  return (
    <span
      ref={alvo}
      style={{ display: "inline-flex" }}
      onMouseEnter={() => agendar(250)}
      onMouseLeave={esconder}
      onFocus={() => agendar(250)}
      onBlur={esconder}
      onTouchStart={() => agendar(450)}
      onTouchEnd={() => window.setTimeout(esconder, 1600)}
    >
      {children}
      {pos && (
        <div className="tooltip janela leve" style={{ left: pos.x, top: pos.y }} role="tooltip">
          <div className="ico-grande">
            <Icone id={icone || "info"} tamanho={26} />
          </div>
          <div>
            <div className="n-S" style={{ fontSize: 18 }}>
              {titulo}
            </div>
            {texto && <p className="n-I" style={{ marginTop: 2 }}>{texto}</p>}
          </div>
        </div>
      )}
    </span>
  );
}

// ---------- Notificações ----------
type Notif = { id: number; icone: string; conteudo: ReactNode };
const NotifCtx = createContext<(icone: string, conteudo: ReactNode) => void>(() => {});
export const useNotificar = () => useContext(NotifCtx);
export function ProvedorNotificacoes({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Notif[]>([]);
  const n = useRef(0);
  const notificar = useCallback((icone: string, conteudo: ReactNode) => {
    const id = ++n.current;
    setLista((l) => [...l.slice(-2), { id, icone, conteudo }]);
    window.setTimeout(() => setLista((l) => l.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <NotifCtx.Provider value={notificar}>
      {children}
      <div className="notificacoes" aria-live="polite">
        {lista.map((x) => (
          <div key={x.id} className="notificacao">
            <Icone id={x.icone} tamanho={18} />
            <span>{x.conteudo}</span>
          </div>
        ))}
      </div>
    </NotifCtx.Provider>
  );
}

// ---------- HUD ----------
export interface Tripulante {
  id: string;
  nome: string;
  cor: string;
  online: boolean;
  papel?: string;
  classe?: string;
}
export function SeloExposicao({ tamanho = 38 }: { tamanho?: number }) {
  return (
    <svg className="selo-expo" width={tamanho} height={tamanho} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="18.5" fill="#0f1415" stroke="var(--brass)" strokeWidth="1.2" />
      <circle cx="20" cy="20" r="15" fill="none" stroke="var(--brass-dark)" strokeWidth=".8" strokeDasharray="1.5 2" />
      <g fill="none" stroke="var(--brass-hi)" strokeWidth="1.2" strokeLinejoin="round">
        <path d="M20 8.5v3M17.6 29 20 11.5 22.4 29M15 29l2.6-7.5h4.8L25 29M18.3 17h3.4M13 29h14" />
      </g>
    </svg>
  );
}

export interface PassoHUD {
  n: number;
  nome: string;
  icone: string;
  /** feito = já passou; mesa = onde a mesa está agora; aberto = liberado adiante; fechado = ainda trancado */
  estado: "feito" | "mesa" | "aberto" | "fechado";
  /** é o capítulo que esta pessoa está vendo agora */
  vendo: boolean;
  dica: string;
}

export function HUD({
  capitulo,
  nomeCapitulo,
  objetivo,
  tripulacao,
  vez,
  mestre,
  aoAbrirCapitulos,
  aoMesa,
  som,
  aoSom,
  refCapitulo,
  refVez,
  extra,
  passos,
  aoPasso,
}: {
  /** o caminho da noite: um círculo por capítulo, clicável para rever os que já foram abertos */
  passos?: PassoHUD[];
  aoPasso?: (n: number) => void;
  extra?: ReactNode;
  capitulo: string;
  nomeCapitulo: string;
  objetivo: string;
  tripulacao: Tripulante[];
  vez?: string | null;
  mestre?: boolean;
  aoAbrirCapitulos?: () => void;
  aoMesa?: () => void;
  som?: boolean;
  aoSom?: () => void;
  refCapitulo?: React.Ref<HTMLSpanElement>;
  refVez?: React.Ref<HTMLSpanElement>;
}) {
  return (
    <div className="hud">
      <button className="capitulo" onClick={aoAbrirCapitulos} aria-label="capítulos">
        <SeloExposicao />
        <span className="cap-texto">
          <span className="cap-num" ref={refCapitulo}>
            {capitulo === "0" || capitulo === "·" ? "PRÓLOGO" : `CAP. ${capitulo}`}
          </span>
          <span className="cap-nome">{nomeCapitulo}</span>
        </span>
      </button>
      {passos ? (
        <div className="objetivo com-passos">
          <ol className="stepper-hud" aria-label="capítulos da noite">
            {passos.map((q) => (
              <li key={q.n} className={q.estado}>
                <ComTooltip titulo={q.nome} texto={q.dica} icone={q.icone}>
                  <button
                    type="button"
                    className={`passo-hud ${q.estado} ${q.vendo ? "vendo" : ""}`}
                    aria-disabled={q.estado === "fechado" || undefined}
                    aria-current={q.vendo ? "step" : undefined}
                    aria-label={`${q.nome}. ${q.dica}`}
                    onClick={() => q.estado !== "fechado" && aoPasso?.(q.n)}
                  >
                    <Icone id={q.estado === "fechado" ? "cadeado" : q.icone} tamanho={18} />
                  </button>
                </ComTooltip>
              </li>
            ))}
          </ol>
          <div className="objetivo-bloco">
            <span className="n-L">objetivo</span>
            <span className="texto" title={objetivo}>
              {objetivo}
            </span>
          </div>
        </div>
      ) : (
        <div className="objetivo">
          <span className="seta" aria-hidden="true">
            ▸
          </span>
          <span className="n-L" style={{ color: "var(--gaslight)" }}>
            objetivo
          </span>
          <span className="texto">{objetivo}</span>
        </div>
      )}
      <div className="tripulacao" aria-label="tripulação">
        {tripulacao.map((t) => (
          <ComTooltip key={t.id} titulo={t.nome} texto={[t.papel, t.classe && `interesse: ${t.classe}`, t.online ? "a bordo" : "fora da sala"].filter(Boolean).join(" · ")} icone="pessoa">
            <span ref={t.id === vez ? refVez : undefined} className={`retrato ${t.id === vez ? "vez" : ""} ${t.online ? "" : "ausente"}`} style={{ background: t.cor }} tabIndex={0}>
              {t.nome.slice(0, 1)}
              <span className={`presenca ${t.online ? "on" : ""}`} />
            </span>
          </ComTooltip>
        ))}
        <span className="sep" />
        <ComTooltip titulo="O mestre" texto="Conduz a noite e abre os capítulos." icone="mesa">
          <span className="retrato retrato-mestre" tabIndex={0}>
            M
          </span>
        </ComTooltip>
      </div>
      {extra}
      <span className="sep" />
      {aoSom && (
        <button className="icone-btn" onClick={aoSom} aria-label={som ? "desligar som" : "ligar som"}>
          <Icone id={som ? "som" : "som-off"} tamanho={18} />
        </button>
      )}
      {mestre && (
        <button className="icone-btn gm" onClick={aoMesa} aria-label="Mesa do Mestre">
          <Icone id="mesa" tamanho={18} />
        </button>
      )}
    </div>
  );
}

// ---------- Carta e dados ----------
export function Dado({ lados, valor, girar }: { lados: 4 | 10; valor: number | string; girar?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mostrar, setMostrar] = useState<number | string>(valor);
  useEffect(() => {
    if (!girar) {
      setMostrar(valor);
      return;
    }
    const el = ref.current;
    const reduzir = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!el || reduzir) {
      setMostrar(valor);
      return;
    }
    const iv = window.setInterval(() => setMostrar(1 + Math.floor(Math.random() * lados)), 70);
    const a = el.animate(
      [
        { transform: "translate(-40px,-30px) rotate(-200deg)", opacity: 0.4 },
        { transform: "translate(0,0) rotate(-40deg)", offset: 0.55 },
        { transform: "translate(0,-12px) rotate(-10deg)", offset: 0.75 },
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
      ],
      { duration: 1000, easing: "cubic-bezier(.3,.7,.3,1)" },
    );
    a.onfinish = () => {
      window.clearInterval(iv);
      setMostrar(valor);
    };
    return () => {
      window.clearInterval(iv);
      a.cancel();
    };
  }, [girar, valor, lados]);
  return (
    <div ref={ref} className={`dado d${lados}`} aria-label={`d${lados}: ${valor}`}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id={`lat${lados}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#E3CC94" />
            <stop offset=".55" stopColor="#B69A60" />
            <stop offset="1" stopColor="#7a6438" />
          </linearGradient>
        </defs>
        {lados === 4 ? (
          <>
            <path d="M32 5 59 55H5z" fill={`url(#lat${lados})`} stroke="#3d311a" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M32 5 32 55" stroke="#3d311a" strokeWidth=".6" opacity=".4" />
          </>
        ) : (
          <>
            <path d="M32 3 59 27 32 61 5 27z" fill={`url(#lat${lados})`} stroke="#3d311a" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M5 27 32 37 59 27M32 37v24" stroke="#3d311a" strokeWidth=".7" fill="none" opacity=".45" />
          </>
        )}
      </svg>
      <span className="valor">{mostrar}</span>
    </div>
  );
}

// ---------- Neblina (ambiente sobre o mapa) ----------
export function Neblina({ ligada }: { ligada: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || !ligada || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = cv.getContext("2d")!;
    let raf = 0;
    let pausado = document.hidden;
    const nuvens = Array.from({ length: 7 }, () => ({ x: Math.random(), y: Math.random(), r: 0.18 + Math.random() * 0.22, v: 0.000012 + Math.random() * 0.00002 }));
    const desenhar = (t: number) => {
      if (!pausado) {
        const w = (cv.width = cv.clientWidth);
        const h = (cv.height = cv.clientHeight);
        ctx.clearRect(0, 0, w, h);
        for (const n of nuvens) {
          const x = ((n.x + t * n.v) % 1.4) * w - 0.2 * w;
          const g = ctx.createRadialGradient(x, n.y * h, 0, x, n.y * h, n.r * w);
          g.addColorStop(0, "rgba(200,210,205,0.08)");
          g.addColorStop(1, "rgba(200,210,205,0)");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
        }
      }
      raf = requestAnimationFrame(desenhar);
    };
    const vis = () => (pausado = document.hidden);
    document.addEventListener("visibilitychange", vis);
    raf = requestAnimationFrame(desenhar);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", vis);
      ctx.clearRect(0, 0, cv.width, cv.height);
    };
  }, [ligada]);
  return <canvas ref={ref} className="neblina" aria-hidden="true" />;
}

/** A moldura de filigrana nos cantos da TELA (fixa, por cima de tudo, sem pegar cliques). */
export function MolduraTela({ desenhando, topo = 0, base = 0 }: { desenhando?: boolean; topo?: number; base?: number }) {
  // a moldura enquadra o que fica ENTRE o cabeçalho e a faixa de baixo; ela não passa por cima deles
  return (
    <div className={`janela moldura-tela ${desenhando ? "anim-janela-abre" : ""}`} style={{ inset: `${topo}px 0 ${base}px 0` }} aria-hidden="true">
      <div className="cantos">
        <Canto pos="tl" />
        <Canto pos="tr" />
        <Canto pos="bl" />
        <Canto pos="br" />
        <Florao />
      </div>
    </div>
  );
}
