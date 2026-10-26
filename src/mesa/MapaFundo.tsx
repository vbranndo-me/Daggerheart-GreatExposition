// A camada 0: o mapa em tela cheia, atrás de tudo. Continente (carta náutica escura) ou
// Rouillac à noite (capítulo V). Interativo só quando o capítulo pede; nos outros fica parado
// e escurecido pelo véu. Os alfinetes são medalhões esmaltados; clicar abre a janela do alfinete.
import { BotaoFechar } from "../jogo/BotaoFechar";
import { createContext, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import "d3-transition";
import { easeCubicInOut } from "d3-ease";
import { useSessao } from "../db/sala";
import { urlConteudo, type ItemLegenda } from "../conteudo";
import type { MapaId, Pin } from "../db/tipos";
import { carregarSvgInterno } from "../svg";
import { PERFIS, PERFIL_PADRAO, recolorirSvgNoturno } from "../jogo/noturno";
import { Alfinete } from "../jogo/alfinete";
import { Janela, Insignia, Placa, Selo } from "../jogo/componentes";
import { Icone } from "../jogo/icones";
import { FILIGRANA } from "../jogo/filigrana";

// ---------- estado do mapa, controlado pela etapa ----------
export interface EstadoMapa {
  interativo: boolean;
  fixando: boolean;
  tipoSugerido?: string;
  paisSelecionado?: string | null;
  aoClicarPais?: (id: string | null) => void;
  aoCriarPin?: (pid: string) => void;
  aoSairDoFixar?: () => void;
  destaque?: string | null;
  bloqueado?: boolean;
  /** largura (px) do painel da etapa, à esquerda; o cartão do mapa se encaixa ao lado dele quando há espaço */
  painel?: number;
}
const PADRAO: EstadoMapa = { interativo: false, fixando: false };
const MapaCtx = createContext<{ estado: EstadoMapa; definir: (e: Partial<EstadoMapa>) => void }>({ estado: PADRAO, definir: () => {} });
export const useMapa = () => useContext(MapaCtx);
export function ProvedorMapa({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoMapa>(PADRAO);
  const valor = useMemo(() => ({ estado, definir: (e: Partial<EstadoMapa>) => setEstado((s) => ({ ...s, ...e })) }), [estado]);
  return <MapaCtx.Provider value={valor}>{children}</MapaCtx.Provider>;
}
/** A etapa diz o que quer do mapa enquanto está montada. */
export function useConfigurarMapa(e: Partial<EstadoMapa>, deps: unknown[]) {
  const { definir } = useMapa();
  useEffect(() => {
    definir({ ...PADRAO, ...e });
    return () => definir(PADRAO);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// Rouillac noturna: recolorida e guardada, uma versão por nível de zoom (os rótulos menores só aparecem de perto)
const cacheNoturno = new Map<string, Promise<string>>();
const perfilEscolhido = () => {
  try {
    return PERFIS.find((p) => p.id === localStorage.getItem("sz-perfil-mapa")) || PERFIL_PADRAO;
  } catch {
    return PERFIL_PADRAO;
  }
};
function plantaNoturna(arquivo: string, nivel: 0 | 1, ppu: number, principais: string[], dados: boolean) {
  const perfil = perfilEscolhido();
  const chave = `${arquivo}|${nivel}|${perfil.id}|${Math.round(ppu * 1000)}`;
  if (!cacheNoturno.has(chave))
    cacheNoturno.set(
      chave,
      fetch(urlConteudo(arquivo))
        .then((r) => r.text())
        .then((t) => URL.createObjectURL(new Blob([recolorirSvgNoturno(t, { perfil, dados, principais, ppu: nivel ? ppu * 2.4 : ppu, todos: nivel === 1 })], { type: "image/svg+xml" }))),
    );
  return cacheNoturno.get(chave)!;
}

/** A legenda é da UI, não do desenho: cada planta/lente diz o que as suas marcas significam. */
const LEGENDA_LENTES: Record<string, ItemLegenda[]> = {
  politica: [{ tipo: "area", cor: "#6e7f95", texto: "Fronteiras e países" }],
  guerra: [{ tipo: "tracejado", cor: "#c4584c", texto: "Frentes de guerra" }],
  ferrovias: [{ tipo: "linha", cor: "#d7bc80", texto: "Ferrovias (cortadas em cruz = linha interrompida)" }],
  cidades: [{ tipo: "area", cor: "#e9d29a", texto: "Cidades" }],
};

const LENTES: { id: string; rotulo: string; icone: string; camadas: string[] }[] = [
  { id: "politica", rotulo: "Político", icone: "lente-politica", camadas: ["paises", "rotulos"] },
  { id: "guerra", rotulo: "Guerra", icone: "lente-guerra", camadas: ["frentes"] },
  { id: "ferrovias", rotulo: "Ferrovias", icone: "lente-ferrovias", camadas: ["ferrovias"] },
  { id: "cidades", rotulo: "Cidades", icone: "lente-cidades", camadas: ["cidades"] },
];

type Pop = { tipo: "novo"; x: number; y: number; u: number; v: number } | { tipo: "ver"; x: number; y: number; pid: string; editando?: boolean };

// O mapa com a moldura é UM objeto físico sobre a mesa. Zoom e arrastar movem o objeto inteiro
// (mapa, moldura, cantos, cartucho e escala), como quem chega mais perto dele. A mesa é a tela
// toda ao lado do painel; o zoom mínimo mostra o objeto inteiro e dá para chegar bem perto.
export function MapaFundo({ mapa }: { mapa: MapaId }) {
  const { sala, conteudo, meuJid, mestre, acoes } = useSessao();
  const { estado } = useMapa();
  const uid = useId().replace(/:/g, "");
  const manifesto = mapa === "continente" ? conteudo.continente : conteudo.rouillac;
  const [vx, vy, vw, vh] = manifesto.viewBox;
  const caixa = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const camada = useRef<SVGGElement>(null);
  const conteudoRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [t, setT] = useState<ZoomTransform>(zoomIdentity);
  const [dim, setDim] = useState({ W: 0, H: 0 });
  const [interno, setInterno] = useState("");
  const [planta, setPlanta] = useState<string | null>(null);
  const [base, setBase] = useState(manifesto.bases?.[0]?.id ?? null);
  const [lentes, setLentes] = useState<Record<string, boolean>>({ politica: true, guerra: true, ferrovias: true, cidades: true });
  const [pop, setPop] = useState<Pop | null>(null);
  const [regua, setRegua] = useState(false);
  const [pontos, setPontos] = useState<{ x: number; y: number }[]>([]);
  const modoRef = useRef({ regua: false, fixando: false });
  modoRef.current = { regua, fixando: estado.fixando };
  const pins = sala.pins[mapa] || {};
  const autor = mestre ? "mestre" : meuJid;

  // ---- geometria do objeto: o mapa (vx..) mais a moldura em volta, em unidades do mapa ----
  const u = vw / 2100; // unidade de desenho: 1 no continente, ~1,9 em Rouillac
  const F = 30 * u; // espessura da moldura
  const obj = { x: vx - F, y: vy - F, w: vw + 2 * F, h: vh + 2 * F };
  const ocx = obj.x + obj.w / 2;
  const ocy = obj.y + obj.h / 2;
  // escala base: o objeto inteiro cabe na mesa, com folga
  const s = dim.W > 0 ? Math.min(dim.W / (obj.w * 1.12), dim.H / (obj.h * 1.12)) : 1;
  const vbw = dim.W > 0 ? dim.W / s : obj.w;
  const vbh = dim.H > 0 ? dim.H / s : obj.h;
  const viewBox = `${ocx - vbw / 2} ${ocy - vbh / 2} ${vbw} ${vbh}`;
  const upx = 1 / s; // unidades do mapa por pixel de tela (com zoom 1)

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const medir = () => {
      const r = svg.getBoundingClientRect();
      if (r.width && r.height) setDim({ W: r.width, H: r.height });
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(svg);
    return () => ro.disconnect();
  }, []);

  // desenho do mapa
  useEffect(() => {
    if (manifesto.arquivo) carregarSvgInterno(manifesto.arquivo).then(setInterno);
  }, [manifesto.arquivo]);
  // a planta é refeita por nível: de longe só distritos e lugares principais; de perto, todos os rótulos
  const ppuAgora = s * t.k;
  const ppuBase = s * 1.3;
  const nivelAgora: 0 | 1 = ppuAgora >= ppuBase * 2.2 ? 1 : 0;
  useEffect(() => {
    if (dim.W <= 0) return;
    const b = manifesto.bases?.find((x) => x.id === base) || manifesto.bases?.[0];
    if (!b) return;
    let vivo = true;
    plantaNoturna(b.arquivo, nivelAgora, ppuBase, manifesto.principais || [], b.id === "pobreza").then((u) => vivo && setPlanta(u));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifesto.bases, base, nivelAgora, dim.W > 0]);

  // lentes (camadas do continente)
  useEffect(() => {
    const g = conteudoRef.current;
    if (!g) return;
    const lig: Record<string, boolean> = {};
    for (const c of manifesto.camadas || []) lig[c.id] = c.ligada;
    for (const l of LENTES) for (const c of l.camadas) lig[c] = lentes[l.id];
    for (const [id, v] of Object.entries(lig)) {
      const el = g.querySelector<SVGElement>(`#${CSS.escape(id)}`);
      if (el) el.style.display = v ? "" : "none";
    }
  }, [lentes, interno, manifesto.camadas]);

  // país selecionado
  useEffect(() => {
    const g = conteudoRef.current;
    if (!g) return;
    g.querySelectorAll("[data-pais].selecionado").forEach((e) => e.classList.remove("selecionado"));
    if (estado.paisSelecionado) g.querySelector(`[data-pais="${estado.paisSelecionado}"]`)?.classList.add("selecionado");
  }, [estado.paisSelecionado, interno]);

  // ---- câmera: a "área livre" é a parte da mesa que o painel da etapa não cobre ----
  const esqLivre = () => {
    const svg = svgRef.current;
    const painel = document.querySelector(".janela-principal.painel")?.getBoundingClientRect();
    if (!svg || !painel) return 0;
    return Math.max(0, painel.right - svg.getBoundingClientRect().left + 14);
  };
  // transformação que põe o ponto do mundo (wx, wy) no meio da área livre, com zoom k
  const pontoNoMeio = (wx: number, wy: number, k: number, esq: number, dir = 0) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const r = svg.getBoundingClientRect();
    const px = r.left + (esq + r.width - dir) / 2;
    const py = r.top + r.height / 2;
    return zoomIdentity.translate((px - ctm.e) / ctm.a - k * wx, (py - ctm.f) / ctm.d - k * wy).scale(k);
  };
  const ajustar = () => {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const esq = esqLivre();
    const lat = document.querySelector(".janela-lateral")?.getBoundingClientRect();
    const barra = svg.parentElement?.querySelector(".barra-mapa")?.getBoundingClientRect();
    // o mapa se enquadra no espaço que sobra entre os painéis, não atrás deles
    const dir = Math.max(lat ? r.right - lat.left + 14 : 0, barra ? r.right - barra.left + 14 : 0);
    const k = Math.min(((r.width - esq - dir) * 0.94) / (obj.w * s), (r.height * 0.94) / (obj.h * s));
    return pontoNoMeio(ocx, ocy, k, esq, dir);
  };
  const focar = () => {
    const c = manifesto.centro;
    return pontoNoMeio(c ? c[0] : ocx, c ? c[1] : ocy, c ? c[2] : 1, esqLivre());
  };
  const irPara = (alvo: ZoomTransform | null, animar: boolean) => {
    const svg = svgRef.current;
    const z = zoomRef.current;
    if (!svg || !z || !alvo) return;
    if (animar) select(svg).transition().duration(650).ease(easeCubicInOut).call(z.transform, alvo);
    else select(svg).call(z.transform, alvo);
  };
  const verTudo = () => irPara(ajustar(), true);
  const centralizar = () => irPara(focar(), true);
  const zoomPor = (f: number) => {
    const svg = svgRef.current;
    const z = zoomRef.current;
    if (svg && z) select(svg).transition().duration(280).call(z.scaleBy, f);
  };

  // zoom e arrastar: só quando interativo
  useEffect(() => {
    const svg = svgRef.current!;
    if (!estado.interativo) {
      select(svg).on(".zoom", null);
      setPop(null);
      setRegua(false);
      return;
    }
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.45, 16])
      // o mapa nunca se perde: o centro da área livre fica sempre sobre o objeto
      .constrain((tr) => {
        const el = svgRef.current;
        const ctm = el?.getScreenCTM();
        if (!el || !ctm) return tr;
        const r = el.getBoundingClientRect();
        const px = r.left + (esqLivre() + r.width) / 2;
        const py = r.top + r.height / 2;
        const pv: [number, number] = [(px - ctm.e) / ctm.a, (py - ctm.f) / ctm.d];
        const [wx, wy] = tr.invert(pv);
        const nx = Math.min(Math.max(wx, obj.x), obj.x + obj.w);
        const ny = Math.min(Math.max(wy, obj.y), obj.y + obj.h);
        if (nx === wx && ny === wy) return tr;
        return zoomIdentity.translate(pv[0] - tr.k * nx, pv[1] - tr.k * ny).scale(tr.k);
      })
      .filter((e: Event) => {
        const ev = e as MouseEvent;
        if (ev.type === "dblclick" && (modoRef.current.regua || modoRef.current.fixando)) return false;
        return (!ev.ctrlKey || ev.type === "wheel") && !ev.button;
      })
      .clickDistance(4)
      .on("zoom", (e) => {
        camada.current?.setAttribute("transform", e.transform.toString());
        setT(e.transform);
        setPop(null);
      });
    zoomRef.current = z;
    select(svg).call(z);
    return () => {
      select(svg).on(".zoom", null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado.interativo, vx, vy, vw, vh]);

  // posição inicial: interativo = foco em Entremonts; parado = o mapa INTEIRO, centrado no vão
  // entre o painel do capítulo (esquerda) e a janela lateral (direita), onde houver
  const medido = dim.W > 0;
  const fundoRef = useRef<() => void>(() => {});
  fundoRef.current = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const pr = document.querySelector(".janela-principal")?.getBoundingClientRect();
    const lat = document.querySelector(".janela-lateral")?.getBoundingClientRect();
    let esq = pr ? Math.max(0, pr.right - r.left + 18) : 0;
    let dir = lat ? Math.max(0, r.right - lat.left + 18) : 0;
    // vão apertado (tela pequena ou painéis empilhados): centra na mesa inteira
    if (r.width - esq - dir < 260) {
      esq = 0;
      dir = 0;
    }
    // encaixa o mapa inteiro no vão e dá 25% a mais de zoom, para ele ocupar bem o espaço entre os painéis
    const k = Math.min(((r.width - esq - dir) * 0.94) / (obj.w * s), (r.height * 0.9) / (obj.h * s)) * 1.25;
    const alvo = pontoNoMeio(ocx, ocy, k, esq, dir);
    if (alvo) {
      camada.current?.setAttribute("transform", alvo.toString());
      setT(alvo);
    }
  };
  useEffect(() => {
    if (!medido) return;
    if (estado.interativo) {
      irPara(focar(), false);
      return;
    }
    let quadro: number | undefined;
    const agendar = () => {
      window.clearTimeout(quadro);
      quadro = window.setTimeout(() => fundoRef.current(), 30);
    };
    agendar();
    // as janelas aparecem e somem (a lateral, por exemplo): recentra quando mudarem
    const camadaJanelas = document.querySelector(".camada-janelas");
    const mo = new MutationObserver(agendar);
    if (camadaJanelas) mo.observe(camadaJanelas, { childList: true });
    const ro = new ResizeObserver(agendar);
    document.querySelectorAll(".janela-principal, .janela-lateral").forEach((el) => ro.observe(el));
    return () => {
      window.clearTimeout(quadro);
      mo.disconnect();
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medido, estado.interativo, dim.W, dim.H, mapa]);

  // Esc sai do modo fixar, da régua e fecha janelas
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setPop(null);
      setPontos([]);
      setRegua(false);
      estado.aoSairDoFixar?.();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [estado.aoSairDoFixar]);
  useEffect(() => {
    if (estado.fixando) setRegua(false);
  }, [estado.fixando]);

  const pontoMapa = (ev: React.MouseEvent) => {
    const svg = svgRef.current!;
    const p = svg.createSVGPoint();
    p.x = ev.clientX;
    p.y = ev.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const q = p.matrixTransform(ctm.inverse());
    const [mx, my] = t.invert([q.x, q.y]);
    return { u: (mx - vx) / vw, v: (my - vy) / vh };
  };
  const posTela = (ev: React.MouseEvent) => {
    const r = caixa.current!.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  };
  const aoClicar = (ev: React.MouseEvent) => {
    if (!estado.interativo || ev.defaultPrevented) return;
    const pm = pontoMapa(ev);
    if (!pm) return;
    if (regua) {
      if (pm.u < 0 || pm.u > 1 || pm.v < 0 || pm.v > 1) return;
      const ponto = { x: vx + pm.u * vw, y: vy + pm.v * vh };
      setPontos((p) => (p.length >= 2 ? [ponto] : [...p, ponto]));
      return;
    }
    if (estado.fixando && autor && !estado.bloqueado) {
      if (pm.u < 0 || pm.u > 1 || pm.v < 0 || pm.v > 1) return;
      setPop({ tipo: "novo", ...posTela(ev), ...pm });
      return;
    }
    if (pop) return setPop(null);
    const alvo = (ev.target as Element).closest?.("[data-pais]");
    estado.aoClicarPais?.(alvo ? alvo.getAttribute("data-pais") : null);
  };

  const e1 = upx / t.k; // unidades do mapa por pixel de tela, com o zoom de agora
  const escala = e1 * 0.95;
  const medida = pontos.length === 2 ? medirDistancia(Math.hypot(pontos[1].x - pontos[0].x, pontos[1].y - pontos[0].y), manifesto.escala) : null;
  const lista = Object.entries(pins)
    .filter(([, p]) => p)
    .sort((a, b) => a[1].v - b[1].v);
  const tipos = manifesto.tiposPin;
  const cor = (a: string) => (a === "mestre" ? "#a5463c" : sala.jogadores[a]?.cor || "#9a9c92");
  const legendaAtiva: ItemLegenda[] =
    mapa === "continente"
      ? LENTES.filter((l) => lentes[l.id]).flatMap((l) => LEGENDA_LENTES[l.id] || [])
      : manifesto.bases?.find((x) => x.id === base)?.legenda || [];
  const X1 = obj.x + obj.w;
  const Y1 = obj.y + obj.h;
  const barra = manifesto.escala ? barraDeEscala(vw * 0.1, manifesto.escala) : null;

  return (
    <div
      ref={caixa}
      className={`mapa-fundo mapa-noturno ${estado.interativo ? "interativo" : ""} ${estado.fixando ? "fixando" : ""} ${regua ? "regua-ativa" : ""}`}
      style={{ ["--painel-px" as string]: `${estado.interativo ? estado.painel || 0 : 0}px` }}
    >
      <svg ref={svgRef} viewBox={viewBox} onClick={aoClicar} role="img" aria-label={manifesto.titulo}>
        <defs>
          <clipPath id={`${uid}-cartao`}>
            <rect x={vx} y={vy} width={vw} height={vh} />
          </clipPath>
          <linearGradient id={`${uid}-latao`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f0dba4" />
            <stop offset=".5" stopColor="#c4a467" />
            <stop offset="1" stopColor="#7a6438" />
          </linearGradient>
          <radialGradient id={`${uid}-vinheta`} cx=".5" cy=".5" r=".75">
            <stop offset=".55" stopColor="#04060a" stopOpacity="0" />
            <stop offset="1" stopColor="#04060a" stopOpacity=".55" />
          </radialGradient>
        </defs>
        <g ref={camada}>
          {/* a peça sobre a mesa: sombra, passe-partout e filetes de latão */}
          <rect x={obj.x + 7 * u} y={obj.y + 12 * u} width={obj.w} height={obj.h} fill="#000" opacity=".55" />
          <path fillRule="evenodd" d={`M${obj.x} ${obj.y}h${obj.w}v${obj.h}h${-obj.w}Z M${vx} ${vy}h${vw}v${vh}h${-vw}Z`} fill="#0b0e16" />
          <rect x={obj.x + 3 * u} y={obj.y + 3 * u} width={obj.w - 6 * u} height={obj.h - 6 * u} fill="none" stroke={`url(#${uid}-latao)`} strokeWidth={2.2 * u} />
          <rect x={obj.x + 9 * u} y={obj.y + 9 * u} width={obj.w - 18 * u} height={obj.h - 18 * u} fill="none" stroke="#b69a60" strokeOpacity=".5" strokeWidth={0.9 * u} />
          <rect x={vx - 1.2 * u} y={vy - 1.2 * u} width={vw + 2.4 * u} height={vh + 2.4 * u} fill="none" stroke="#d7bc80" strokeWidth={1.6 * u} />

          {/* o mapa propriamente dito, recortado no cartão */}
          <g clipPath={`url(#${uid}-cartao)`}>
            {manifesto.bases && <rect x={vx} y={vy} width={vw} height={vh} fill="#141b26" />}
            {manifesto.bases && planta && <image href={planta} x={vx} y={vy} width={vw} height={vh} />}
            {manifesto.arquivo && <g ref={conteudoRef} dangerouslySetInnerHTML={{ __html: interno }} />}
            <rect x={vx} y={vy} width={vw} height={vh} fill={`url(#${uid}-vinheta)`} pointerEvents="none" />
          </g>

          {lista.map(([pid, p]) => (
            <Alfinete
              key={pid}
              x={vx + p.u * vw}
              y={vy + p.v * vh}
              cor={cor(p.autor)}
              icone={p.tipo}
              escala={escala}
              titulo={p.titulo}
              destaque={estado.destaque === pid || (pop?.tipo === "ver" && pop.pid === pid)}
              cravar={Date.now() - p.criadoEm < 4000}
              onClick={(ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                setPop({ tipo: "ver", ...posTela(ev), pid });
              }}
            />
          ))}

          {/* cantos ornamentados, cartucho e escala: fazem parte do objeto */}
          {([
            [obj.x + 2 * u, obj.y + 2 * u, 1, 1],
            [X1 - 2 * u, obj.y + 2 * u, -1, 1],
            [obj.x + 2 * u, Y1 - 2 * u, 1, -1],
            [X1 - 2 * u, Y1 - 2 * u, -1, -1],
          ] as const).map(([cx, cy, sx, sy], i) => (
            <g key={i} transform={`translate(${cx} ${cy}) scale(${sx * 1.55 * u} ${sy * 1.55 * u})`} color="#c4a467" pointerEvents="none">
              {FILIGRANA.filter((p) => !p.preenchido)
                .slice(2, 9)
                .map((p, k) => (
                  <path key={k} d={p.d} fill={p.veu ? "currentColor" : "none"} fillOpacity={p.veu ? 0.2 : undefined} stroke="currentColor" strokeWidth={(p.largura ?? 1.2) * 1.15} strokeLinecap="round" />
                ))}
            </g>
          ))}
          <g transform={`translate(${ocx} ${obj.y + F / 2}) scale(${u})`} pointerEvents="none">
            <path d="M-170 0 L-156 -30 L156 -30 L170 0 L156 30 L-156 30 Z" fill="#141826" stroke={`url(#${uid}-latao)`} strokeWidth="2" />
            <path d="M-160 0 L-149 -24 L149 -24 L160 0 L149 24 L-149 24 Z" fill="none" stroke="#b69a60" strokeOpacity=".5" strokeWidth=".8" />
            <text y="-9" textAnchor="middle" fontFamily="'Source Sans 3', sans-serif" fontWeight="700" fontSize="9" letterSpacing="2.6" fill="#c4a467">
              CARTA DE ENTREMONTS
            </text>
            <text y="14" textAnchor="middle" fontFamily="'Libre Baskerville', Georgia, serif" fontSize="22" fill="#dcd5c6">
              {manifesto.titulo}
            </text>
          </g>
          {barra && (
            <g transform={`translate(${vx + 56 * u} ${vy + vh - 52 * u})`} pointerEvents="none">
              <rect x="0" y="0" width={barra.unidades / 2} height={7 * u} fill="#e9d29a" />
              <rect x={barra.unidades / 2} y="0" width={barra.unidades / 2} height={7 * u} fill="#0b0d14" />
              <rect x="0" y="0" width={barra.unidades} height={7 * u} fill="none" stroke="#e9d29a" strokeWidth={1.4 * u} />
              <text x="0" y={-8 * u} fontFamily="'Source Sans 3', sans-serif" fontWeight="700" fontSize={11 * u} letterSpacing={1.6 * u} fill="#dcd5c6">
                {barra.rotulo}
              </text>
            </g>
          )}

          {regua && pontos.length > 0 && <ReguaNoMapa pontos={pontos} e={e1} texto={medida?.distancia} />}
        </g>
      </svg>
      <div className="veu-vinheta" />
      <div className={`veu-escuro ${estado.interativo ? "" : "ligado"}`} />

      {estado.interativo && (
        <>
          <nav className="barra-mapa" aria-label="camadas e ferramentas do mapa">
            <div className="barra-grupo" role="group" aria-label="camadas">
              {mapa === "continente"
                ? LENTES.map((l) => (
                    <BotaoBarra
                      key={l.id}
                      icone={l.icone}
                      dica={`${lentes[l.id] ? "Esconder" : "Mostrar"}: ${l.rotulo}`}
                      ligado={!!lentes[l.id]}
                      aoClicar={() => setLentes((s) => ({ ...s, [l.id]: !s[l.id] }))}
                    />
                  ))
                : (manifesto.bases || []).map((b) => (
                    <BotaoBarra
                      key={b.id}
                      icone={b.id === "monumentos" ? "pavilhao" : b.id === "distritos" ? "lente-cidades" : "refugiado"}
                      dica={b.rotulo}
                      ligado={base === b.id}
                      aoClicar={() => setBase(b.id)}
                    />
                  ))}
            </div>
            <div className="barra-grupo" role="group" aria-label="ferramentas">
              <BotaoBarra simbolo="+" dica="Ampliar" aoClicar={() => zoomPor(1.6)} />
              <BotaoBarra simbolo="−" dica="Reduzir" aoClicar={() => zoomPor(1 / 1.6)} />
              <BotaoBarra icone="ver-tudo" dica="Ver tudo" aoClicar={verTudo} />
              <BotaoBarra icone="cap-3" dica={manifesto.centro ? "Voltar ao foco da mesa" : "Centralizar"} aoClicar={centralizar} />
              <BotaoBarra
                icone="regua"
                dica="Régua: medir entre dois pontos"
                ligado={regua}
                aoClicar={() => {
                  setRegua(!regua);
                  setPontos([]);
                }}
              />
            </div>
          </nav>

          <LegendaMapa itens={legendaAtiva} />

          {regua && (
            <div className="faixa-regua">
              <Icone id="regua" tamanho={16} />
              {medida ? (
                <>
                  <strong>{medida.distancia}</strong>
                  {medida.tempo && <span> · {medida.tempo}</span>}
                  <span className="fraco"> · clique para medir de novo</span>
                </>
              ) : pontos.length === 1 ? (
                "Agora clique no segundo ponto"
              ) : (
                "Clique no primeiro ponto"
              )}{" "}
              · <kbd>Esc</kbd> sai
            </div>
          )}
        </>
      )}

      {estado.interativo && estado.fixando && (
        <div className="faixa-fixar">
          <Icone id="lugar" tamanho={16} /> Clique no mapa para fixar · <kbd>Esc</kbd> cancela
        </div>
      )}

      {pop && (
        <JanelaAlfinete
          mapa={mapa}
          pop={pop}
          largura={caixa.current?.clientWidth || 1200}
          altura={caixa.current?.clientHeight || 800}
          pins={pins}
          tipos={tipos}
          tipoSugerido={estado.tipoSugerido}
          autor={autor}
          mestre={mestre}
          bloqueado={!!estado.bloqueado}
          fechar={() => setPop(null)}
          editar={() => pop.tipo === "ver" && setPop({ ...pop, editando: true })}
          salvar={async (pid, pin) => {
            const id = await acoes.salvarPin(mapa, pid, pin);
            if (!pid) {
              estado.aoCriarPin?.(id);
              estado.aoSairDoFixar?.();
            }
            setPop(null);
          }}
          apagar={async (pid) => {
            await acoes.apagarPin(mapa, pid);
            setPop(null);
          }}
        />
      )}
    </div>
  );
}

// comprimento "redondo" (1, 2 ou 5 × 10ⁿ) para a escala gráfica, perto do alvo em unidades do mapa
function barraDeEscala(alvoUnidades: number, esc: NonNullable<Escala>) {
  const alvo = alvoUnidades * esc.porUnidade;
  const pot = Math.pow(10, Math.floor(Math.log10(alvo)));
  const valor = [1, 2, 5, 10].map((m) => m * pot).reduce((a, b) => (Math.abs(b - alvo) < Math.abs(a - alvo) ? b : a));
  return { unidades: valor / esc.porUnidade, rotulo: `${valor.toLocaleString("pt-BR")} ${esc.unidade}` };
}

function JanelaAlfinete(p: {
  mapa: MapaId;
  pop: Pop;
  largura: number;
  altura: number;
  pins: Record<string, Pin>;
  tipos: { id: string; rotulo: string }[];
  tipoSugerido?: string;
  autor: string | null;
  mestre: boolean;
  bloqueado: boolean;
  fechar: () => void;
  editar: () => void;
  salvar: (pid: string | null, pin: Pin) => Promise<void>;
  apagar: (pid: string) => Promise<void>;
}) {
  const { sala } = useSessao();
  const existente = p.pop.tipo === "ver" ? p.pins[p.pop.pid] : null;
  const [tipo, setTipo] = useState(existente?.tipo || p.tipoSugerido || p.tipos[0].id);
  const [titulo, setTitulo] = useState(existente?.titulo || "");
  const [texto, setTexto] = useState(existente?.texto || "");
  const [confirmando, setConfirmando] = useState(false);
  const left = Math.min(Math.max(12, p.pop.x + 18), p.largura - 372);
  const top = Math.max(12, Math.min(p.pop.y - 40, p.altura - 360));
  const podeEditar = !!existente && !p.bloqueado && (p.mestre || existente.autor === p.autor);
  const nomeAutor = (a: string) => (a === "mestre" ? "o mestre" : sala.jogadores[a]?.nome || "alguém");
  const corAutor = (a: string) => (a === "mestre" ? "#a5463c" : sala.jogadores[a]?.cor || "#9a9c92");

  if (p.pop.tipo === "ver" && !p.pop.editando && existente) {
    const rot = p.tipos.find((x) => x.id === existente.tipo)?.rotulo || existente.tipo;
    return (
      <div className="pop-alfinete" style={{ left, top }}>
        <Janela tipo="leve">
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
            <Insignia icone={existente.tipo} tamanho={40} />
            <div style={{ flex: 1 }}>
              <div className="n-L">
                {rot} · {nomeAutor(existente.autor)}
              </div>
              <div className="n-S">{existente.titulo}</div>
            </div>
            <BotaoFechar aoClicar={p.fechar} rotulo="fechar" />
          </div>
          {existente.texto && (
            <p className="n-J" style={{ ["--autor" as string]: corAutor(existente.autor), fontSize: 16 }}>
              {existente.texto}
            </p>
          )}
          {podeEditar && (
            <div style={{ display: "flex", gap: 16, marginTop: 14, alignItems: "center" }}>
              <button className="link" onClick={p.editar}>
                editar
              </button>
              {confirmando ? (
                <button className="link perigo" onClick={() => p.apagar(p.pop.tipo === "ver" ? p.pop.pid : "")}>
                  confirmar: apagar
                </button>
              ) : (
                <button className="link perigo" onClick={() => setConfirmando(true)}>
                  apagar
                </button>
              )}
              {p.mestre && existente.autor !== "mestre" && <Selo tipo="gm">mestre</Selo>}
            </div>
          )}
        </Janela>
      </div>
    );
  }

  return (
    <div className="pop-alfinete" style={{ left, top }}>
      <Janela tipo="leve">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!titulo.trim()) return;
            const pin: Pin =
              existente && p.pop.tipo === "ver"
                ? { ...existente, tipo, titulo: titulo.trim(), texto: texto.trim() }
                : { u: (p.pop as any).u, v: (p.pop as any).v, tipo, titulo: titulo.trim(), texto: texto.trim(), autor: p.autor!, criadoEm: Date.now() };
            p.salvar(p.pop.tipo === "ver" ? p.pop.pid : null, pin);
          }}
        >
          <div className="n-L" style={{ marginBottom: 10 }}>
            {existente ? "editar alfinete" : "novo alfinete"}
          </div>
          <div className="tipos-alfinete" role="radiogroup" aria-label="tipo">
            {p.tipos.map((tp) => (
              <button type="button" key={tp.id} role="radio" aria-checked={tipo === tp.id} className={`tipo-alfinete ${tipo === tp.id ? "escolhido" : ""}`} onClick={() => setTipo(tp.id)}>
                <Insignia icone={tp.id} tamanho={32} ativa={tipo === tp.id} />
                <span className="n-L">{tp.rotulo}</span>
              </button>
            ))}
          </div>
          <div className="escrita" style={{ marginTop: 12 }}>
            <label className="n-L" htmlFor="pin-titulo">
              título
            </label>
            <input id="pin-titulo" autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={80} />
            <label className="n-L" htmlFor="pin-texto" style={{ marginTop: 10 }}>
              texto curto
            </label>
            <textarea id="pin-texto" rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={600} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 18, marginTop: 14 }}>
            <button type="button" className="link" onClick={p.fechar}>
              cancelar
            </button>
            <Placa disabled={!titulo.trim()} tipo="submit">
              {existente ? "Salvar" : "Fixar"}
            </Placa>
          </div>
        </form>
      </Janela>
    </div>
  );
}


// ---------- régua ----------
type Escala = { porUnidade: number; unidade: "km" | "m"; viagem?: { rotulo: string; kmh: number } } | undefined;
function medirDistancia(unidades: number, esc: Escala) {
  if (!esc) return { distancia: `${Math.round(unidades)} u`, tempo: null as string | null };
  const v = unidades * esc.porUnidade;
  const km = esc.unidade === "km" ? v : v / 1000;
  const num = (n: number, casas: number) => n.toFixed(casas).replace(".", ",");
  const distancia = esc.unidade === "km" ? (v >= 100 ? `${Math.round(v).toLocaleString("pt-BR")} km` : `${num(v, 1)} km`) : v >= 1000 ? `${num(v / 1000, 2)} km` : `${Math.round(v)} m`;
  let tempo: string | null = null;
  if (esc.viagem) {
    const min = Math.round((km / esc.viagem.kmh) * 60);
    const txt = min < 60 ? `${Math.max(1, min)} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${String(min % 60).padStart(2, "0")} min` : ""}`;
    tempo = `≈ ${txt} ${esc.viagem.rotulo}`;
  }
  return { distancia, tempo };
}

function ReguaNoMapa({ pontos, e, texto }: { pontos: { x: number; y: number }[]; e: number; texto?: string }) {
  const [a, b] = pontos;
  const ponta = (p: { x: number; y: number }, i: number) => (
    <g key={i} transform={`translate(${p.x} ${p.y}) scale(${e})`}>
      <circle r="7" fill="#141826" stroke="#d7bc80" strokeWidth="1.6" />
      <circle r="2.6" fill="#f3e3b5" />
    </g>
  );
  return (
    <g className="regua-mapa" pointerEvents="none">
      {b && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#0b0d14" strokeWidth={5 * e} strokeLinecap="round" opacity=".7" />}
      {b && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#e9d29a" strokeWidth={2 * e} strokeDasharray={`${8 * e} ${5 * e}`} strokeLinecap="round" />}
      {pontos.map(ponta)}
      {b && texto && (
        <g transform={`translate(${(a.x + b.x) / 2} ${(a.y + b.y) / 2 - 16 * e}) scale(${e})`}>
          <rect x={-(texto.length * 4.2 + 12)} y="-13" width={texto.length * 8.4 + 24} height="26" rx="2" fill="#141826" stroke="#b69a60" strokeWidth="1" />
          <text textAnchor="middle" y="5" fontFamily="'Source Sans 3', sans-serif" fontWeight="700" fontSize="14" fill="#f3e3b5">
            {texto}
          </text>
        </g>
      )}
    </g>
  );
}

// ---------- a barra vertical de camadas e ferramentas (como os modos de mapa de um jogo de estratégia) ----------
function BotaoBarra({
  icone,
  simbolo,
  dica,
  ligado,
  aoClicar,
}: {
  icone?: string;
  simbolo?: string;
  dica: string;
  ligado?: boolean;
  aoClicar: () => void;
}) {
  return (
    <button type="button" className={`botao-barra ${ligado === true ? "ligado" : ""} ${ligado === false ? "apagado" : ""}`} onClick={aoClicar} data-dica={dica} aria-label={dica} aria-pressed={ligado === undefined ? undefined : ligado}>
      {simbolo ? <span className="simbolo-barra">{simbolo}</span> : <Icone id={icone!} tamanho={20} />}
    </button>
  );
}

/** O que as marcas do mapa significam: um painel pequeno, ícones em latão e texto em L. */
function LegendaMapa({ itens }: { itens: ItemLegenda[] }) {
  const [aberta, setAberta] = useState(true);
  if (!itens.length) return null;
  return (
    <aside className={`legenda-mapa ${aberta ? "" : "fechada"}`} aria-label="legenda">
      <button type="button" className="legenda-cab" onClick={() => setAberta(!aberta)} aria-expanded={aberta}>
        <span className="n-L">legenda</span>
        <span aria-hidden="true">{aberta ? "▾" : "▸"}</span>
      </button>
      {aberta && (
        <ul>
          {itens.map((it) => (
            <li key={it.texto}>
              <svg width="30" height="14" viewBox="0 0 30 14" aria-hidden="true">
                {it.tipo === "area" && <rect x="2" y="2" width="26" height="10" fill={it.cor} stroke="#b69a60" strokeWidth="1" />}
                {it.tipo === "hachura" && (
                  <>
                    <rect x="2" y="2" width="26" height="10" fill="none" stroke={it.cor} strokeWidth="1" />
                    <path d="M4 12 L12 2 M10 12 L18 2 M16 12 L24 2 M22 12 L28 4" stroke={it.cor} strokeWidth="1" />
                  </>
                )}
                {it.tipo === "linha" && <line x1="1" y1="7" x2="29" y2="7" stroke={it.cor} strokeWidth="2.6" strokeLinecap="round" />}
                {it.tipo === "tracejado" && <line x1="1" y1="7" x2="29" y2="7" stroke={it.cor} strokeWidth="2.4" strokeDasharray="5 3" />}
              </svg>
              <span className="n-L">{it.texto}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
