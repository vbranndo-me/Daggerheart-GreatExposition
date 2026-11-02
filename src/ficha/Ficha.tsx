// Ficha de personagem do módulo do Foundry.
// Componente de apresentação: recebe `dados` e devolve eventos em `acoes` (ver tipos.ts).
// Não lê sala, Firebase nem arquivos do projeto, para poder ser empacotado e montado no Foundry.
import { useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FILIGRANA } from "../jogo/filigrana";
import { descansoLocal, lim, nOff, rolarLocal, type ResultadoRolagem } from "./padrao";
import { BotaoHextech } from "../jogo/hextech";
import type { CartaDominio, FichaAcoes, FichaDados, FichaOpcoes, Habilidade, PedidoDescanso, Traco } from "./tipos";
import "./ficha.css";

const ROMANOS = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const TIPO_NOME: Record<Habilidade["tipo"], string> = { acao: "Ação", reacao: "Reação", esperanca: "Esperança", recurso: "Recurso", fundacao: "Fundação", passiva: "Passiva" };
const COR_DOMINIO: Record<string, string> = {
  Arcano: "#8a6fd0",
  Códice: "#5b86c9",
  Dread: "#9a3a52",
  Esplendor: "#d4b24f",
  Falange: "#b0653a",
  Graça: "#d08aa8",
  Sábio: "#4fa56a",
  Valor: "#c4503f",
};

type Aba = "hab" | "load" | "inv" | "his" | "des" | "efe";
const ABAS: { id: Aba; nome: string }[] = [
  { id: "hab", nome: "Habilidades" },
  { id: "load", nome: "Loadout" },
  { id: "inv", nome: "Inventário" },
  { id: "his", nome: "História e notas" },
  { id: "des", nome: "Descanso" },
  { id: "efe", nome: "Efeitos" },
];

type Aplicar = (fn: (d: FichaDados) => FichaDados, historico?: boolean) => void;

// ---------- peças ----------
// tentáculos sombrios que sobem pelas bordas do card do Véu quando o Frenesi está a um passo do limite
function Tentaculos() {
  return (
    <svg className="fp-tent" viewBox="0 0 300 260" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <g className="t t1">
        <path pathLength="1" className="l1" d="M-8 270C20 240-4 210 26 192C56 174 74 150 56 126C40 104 56 84 76 90C92 95 90 112 78 110" />
        <path pathLength="1" className="l2" d="M-8 270C20 240-4 210 26 192C56 174 74 150 56 126C40 104 56 84 76 90C92 95 90 112 78 110" />
        <path pathLength="1" className="l3" d="M-8 270C20 240-4 210 26 192C56 174 74 150 56 126C40 104 56 84 76 90C92 95 90 112 78 110" />
        <path pathLength="1" className="l4" d="M-8 270C20 240-4 210 26 192C56 174 74 150 56 126C40 104 56 84 76 90C92 95 90 112 78 110" />
        <path pathLength="1" className="v" d="M-8 270C20 240-4 210 26 192C56 174 74 150 56 126C40 104 56 84 76 90C92 95 90 112 78 110" />
      </g>
      <g className="t t2">
        <path pathLength="1" className="l1" d="M308 270C280 244 304 214 274 196C244 178 228 154 246 130C262 108 246 88 228 94C212 100 214 116 226 114" />
        <path pathLength="1" className="l2" d="M308 270C280 244 304 214 274 196C244 178 228 154 246 130C262 108 246 88 228 94C212 100 214 116 226 114" />
        <path pathLength="1" className="l3" d="M308 270C280 244 304 214 274 196C244 178 228 154 246 130C262 108 246 88 228 94C212 100 214 116 226 114" />
        <path pathLength="1" className="l4" d="M308 270C280 244 304 214 274 196C244 178 228 154 246 130C262 108 246 88 228 94C212 100 214 116 226 114" />
        <path pathLength="1" className="v" d="M308 270C280 244 304 214 274 196C244 178 228 154 246 130C262 108 246 88 228 94C212 100 214 116 226 114" />
      </g>
      <g className="t t3">
        <path pathLength="1" className="l1" d="M308 190C288 180 284 160 298 144C308 132 296 116 282 120" />
        <path pathLength="1" className="l2" d="M308 190C288 180 284 160 298 144C308 132 296 116 282 120" />
        <path pathLength="1" className="l3" d="M308 190C288 180 284 160 298 144C308 132 296 116 282 120" />
        <path pathLength="1" className="l4" d="M308 190C288 180 284 160 298 144C308 132 296 116 282 120" />
        <path pathLength="1" className="v" d="M308 190C288 180 284 160 298 144C308 132 296 116 282 120" />
      </g>
      <g className="t t4">
        <path pathLength="1" className="l1" d="M-8 160C14 152 22 134 8 118C-2 108 10 94 24 100" />
        <path pathLength="1" className="l2" d="M-8 160C14 152 22 134 8 118C-2 108 10 94 24 100" />
        <path pathLength="1" className="l3" d="M-8 160C14 152 22 134 8 118C-2 108 10 94 24 100" />
        <path pathLength="1" className="l4" d="M-8 160C14 152 22 134 8 118C-2 108 10 94 24 100" />
        <path pathLength="1" className="v" d="M-8 160C14 152 22 134 8 118C-2 108 10 94 24 100" />
      </g>
    </svg>
  );
}

// fios de energia correndo dentro da marcação cheia (a mesma ideia do botão hextech, em miniatura)
function Fios() {
  return (
    <svg className="fp-fio" viewBox="0 0 20 20" preserveAspectRatio="none" aria-hidden>
      <g className="r1">
        <path className="a" d="M-20 11Q-15 5-10 11T0 11T10 11T20 11T30 11T40 11" />
      </g>
      <g className="r2">
        <path className="b" d="M-10 8Q-7.5 3-5 8T0 8T5 8T10 8T15 8T20 8T25 8T30 8" />
      </g>
      <g className="r3">
        <path className="c" d="M-20 14Q-15 18-10 14T0 14T10 14T20 14T30 14T40 14" />
      </g>
    </svg>
  );
}

function Marcador({ n, valor, forma, cor, onSet, off, onToggleOff, rotulo, marcos, queimados = 0 }: { queimados?: number; n: number; valor: number; forma: string; cor: string; onSet: (v: number) => void; off?: boolean[]; onToggleOff?: (i: number) => void; rotulo: string; marcos?: number[] }) {
  // os espaços desabilitados não contam: o valor preenche só os que restam, da esquerda para a direita
  let ordem = -1;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const perdido = !!off?.[i];
        if (!perdido) ordem++;
        const meu = ordem;
        const on = !perdido && meu < valor;
        const marco = marcos?.includes(i + 1);
        const queimado = on && meu >= valor - queimados;
        return (
          <button
            key={i}
            type="button"
            className={`fp-pipb ${marco ? "marco" : ""}`}
            style={{ ["--k" as string]: i }}
            aria-label={`${rotulo} ${i + 1}${perdido ? " (desabilitado)" : ""}`}
            aria-pressed={on}
            title={queimado ? `${rotulo}: ${i + 1} · queimado (não conta para os limiares, mas conta para o véu te tocar)` : perdido ? "Desabilitado. Botão direito para reabilitar." : `${rotulo}: ${i + 1}${onToggleOff ? " · botão direito desabilita o espaço" : ""}`}
            onClick={() => !perdido && onSet(valor === meu + 1 ? meu : meu + 1)}
            onContextMenu={(e) => {
              if (!onToggleOff) return;
              e.preventDefault();
              onToggleOff(i);
            }}
          >
            <span className={`fp-pip ${forma} ${cor}`} data-on={on ? "" : undefined} data-perdido={perdido ? "" : undefined} data-queimado={queimado ? "" : undefined}>
              {on && !queimado && <Fios />}
            </span>
          </button>
        );
      })}
    </>
  );
}

// habilidade recolhida; a estrela deixa a carta aberta por padrão (guardado neste navegador)
function CartaHab({ h, usavel, cores, usar, children }: { h: Habilidade; usavel: boolean; cores: [string, string]; usar: () => void; children?: ReactNode }) {
  const chave = `fp-hab-aberta:${h.id}`;
  const [fixa, setFixa] = useState(() => {
    try {
      return localStorage.getItem(chave) === "1";
    } catch {
      return false;
    }
  });
  const [aberta, setAberta] = useState(fixa);
  const alterna = () => setAberta((a) => !a);
  const fixar = () => {
    const v = !fixa;
    setFixa(v);
    if (v) setAberta(true);
    try {
      if (v) localStorage.setItem(chave, "1");
      else localStorage.removeItem(chave);
    } catch {
      /* sem armazenamento: a estrela vale só nesta janela */
    }
  };
  // o ícone é clicável em todas: as usáveis rolam/gastam; as passivas vão direto ao chat
  const extra = {
    "data-usavel": "",
    role: "button",
    tabIndex: 0,
    title: usavel ? `Usar ${h.nome}` : `Mostrar ${h.nome} no chat`,
    onClick: (e: { stopPropagation(): void }) => {
      e.stopPropagation();
      usar();
    },
    onKeyDown: (e: { key: string; preventDefault(): void; stopPropagation(): void }) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        usar();
      }
    },
  };
  return (
    <article className="fp-habc" data-aberta={aberta ? "" : undefined} data-usavel={usavel ? "" : undefined} style={{ ["--h1" as string]: cores[0], ["--h2" as string]: cores[1] }}>
      <div
        className="fp-habc-topo"
        role="button"
        tabIndex={0}
        aria-expanded={aberta}
        onClick={alterna}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            alterna();
          }
        }}
      >
        {h.icone ? <img className="fp-ico img" src={h.icone} alt="" {...extra} /> : <div className="fp-ico" {...extra}>{h.nome[0]}</div>}
        <h4>{h.nome}</h4>
        {usavel && <span className={`fp-tipo ${h.tipo}`}>{TIPO_NOME[h.tipo]}</span>}
        {h.custo && <span className="fp-hab-custo">{h.custo}</span>}
        <button
          type="button"
          className="fp-estrela"
          data-fixa={fixa ? "" : undefined}
          aria-pressed={fixa}
          title={fixa ? "Aberta por padrão. Clique para deixar de fixar." : "Deixar aberta por padrão"}
          onClick={(e) => {
            e.stopPropagation();
            fixar();
          }}
        >
          ★
        </button>
        <span className="fp-mais" aria-hidden />
      </div>
      <div className="fp-habc-corpo">
        <div className="fp-habc-int">
          <Html className="fp-texto" html={h.html} />
          {children}
          {usavel && (
            <div className="fp-usar-linha">
              <BotaoHextech tema="ambar" onClick={usar}>
                Usar{h.custo ? ` · ${h.custo}` : ""}
              </BotaoHextech>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

// explosão de brasas quando um ponto de Discernimento é queimado
function Chamas() {
  const brasas = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        x: 8 + Math.random() * 84,
        dx: (Math.random() - 0.5) * 70,
        dy: 50 + Math.random() * 120,
        t: 0.8 + Math.random() * 0.9,
        d: Math.random() * 0.25,
        s: 3 + Math.random() * 5,
        k: i,
      })),
    [],
  );
  return (
    <div className="fp-chamas" aria-hidden>
      <span className="fp-chamas-clarao" />
      {brasas.map((b) => (
        <i key={b.k} style={{ ["--x" as string]: `${b.x}%`, ["--dx" as string]: `${b.dx}px`, ["--dy" as string]: `-${b.dy}px`, ["--t" as string]: `${b.t}s`, ["--d" as string]: `${b.d}s`, ["--s" as string]: `${b.s}px` }} />
      ))}
    </div>
  );
}

function Rotulo({ nome, resumo }: { nome: string; resumo?: ReactNode }) {
  return (
    <div className="fp-rot">
      {nome}
      {resumo !== undefined && <b>{resumo}</b>}
    </div>
  );
}

function IconeDominio({ svg }: { svg?: string }) {
  if (svg) return <span className="fp-svg" dangerouslySetInnerHTML={{ __html: svg }} />;
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden>
      <path d="M16 4l9 12-9 12-9-12z" />
    </svg>
  );
}

function Canto({ pos, mini }: { pos: "nw" | "ne" | "sw" | "se"; mini?: boolean }) {
  return (
    <div className={`fp-canto ${pos}${mini ? " mini" : ""}`} aria-hidden>
      <svg viewBox="0 0 96 96">
        {FILIGRANA.map((t, i) => (
          <path key={i} d={t.d} pathLength={1} strokeWidth={t.largura ?? 1} data-cheio={t.preenchido ? "" : undefined} data-veu={t.veu ? "" : undefined} />
        ))}
        {mini &&
          FILIGRANA.map((t, i) =>
            t.preenchido ? null : <path key={`e${i}`} className="energia" d={t.d} pathLength={1} strokeWidth={3.4} style={{ animationDelay: `${(i % 7) * 0.11}s` }} />,
          )}
      </svg>
    </div>
  );
}

const Html = ({ html, className }: { html: string; className?: string }) => <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;

// ---------- a ficha ----------
interface Rolagem {
  traco: Traco;
  exp: string | null;
  vantagem: boolean;
  resultado?: ResultadoRolagem;
}
export interface Ponte {
  mensagem?: (html: string) => void;
}

export default function Ficha({ dados, acoes = {}, opcoes = {}, ponte, topo, embutida }: { dados: FichaDados; acoes?: FichaAcoes; opcoes?: FichaOpcoes; ponte?: MutableRefObject<Ponte | null>; topo?: ReactNode; embutida?: boolean }) {
  const [d, setD] = useState<FichaDados>(dados);
  const dRef = useRef(d);
  const acoesRef = useRef(acoes);
  acoesRef.current = acoes;
  const [hist, setHist] = useState<FichaDados[]>([]);
  const [aba, setAba] = useState<Aba>("hab");
  const [chat, setChat] = useState<{ id: number; html: string }[]>([]);
  const [rolagem, setRolagem] = useState<Rolagem | null>(null);
  const [aberto, setAberto] = useState(false);
  const [subindo, setSubindo] = useState(false);
  const [confirmaQueima, setConfirmaQueima] = useState(false);
  const [chamas, setChamas] = useState(0);
  const idMsg = useRef(0);

  // o host manda dados novos: eles valem
  useEffect(() => {
    dRef.current = dados;
    setD(dados);
  }, [dados]);

  const falar = (html: string) => setChat((c) => [...c.slice(-4), { id: ++idMsg.current, html }]);
  useEffect(() => {
    if (!ponte) return;
    ponte.current = { mensagem: falar };
    return () => {
      ponte.current = null;
    };
  }, [ponte]);

  /** Toda mudança passa por aqui: desfazível e avisada ao host. */
  const aplicar: Aplicar = (fn, historico = true) => {
    const ant = dRef.current;
    const novo = fn(ant);
    if (novo === ant) return;
    if (historico) setHist((h) => [...h.slice(-30), ant]);
    dRef.current = novo;
    setD(novo);
    acoesRef.current.aoMudar?.(novo, ant);
  };
  const desfazer = () => {
    const ant = hist[hist.length - 1];
    if (!ant) return;
    const atual = dRef.current;
    setHist((h) => h.slice(0, -1));
    dRef.current = ant;
    setD(ant);
    acoesRef.current.aoMudar?.(ant, atual);
  };
  /** Edita uma cópia dos recursos. */
  const recursos = (fn: (r: FichaDados["recursos"]) => void): void =>
    aplicar((x) => {
      const n = structuredClone(x);
      fn(n.recursos);
      return n;
    });

  const R = d.recursos;
  const espMax = R.esperanca.max - nOff(R.esperanca.desabilitados);
  const frenMax = R.frenesi.max - nOff(R.frenesi.desabilitados);
  const fadigaCheia = R.fadiga.marcados >= R.fadiga.max;

  const setFrenesi = (v: number) =>
    recursos((r) => {
      const max = r.frenesi.max - nOff(r.frenesi.desabilitados);
      r.frenesi.valor = lim(v, max);
      r.frenesi.surto = max > 0 && r.frenesi.valor >= max;
    });
  const alternaFren = (i: number) =>
    recursos((r) => {
      r.frenesi.desabilitados[i] = !r.frenesi.desabilitados[i];
      const max = r.frenesi.max - nOff(r.frenesi.desabilitados);
      r.frenesi.valor = lim(r.frenesi.valor, max);
      r.frenesi.surto = max > 0 && r.frenesi.valor >= max;
    });
  const alternaEsp = (i: number) =>
    recursos((r) => {
      r.esperanca.desabilitados[i] = !r.esperanca.desabilitados[i];
      r.esperanca.valor = lim(r.esperanca.valor, r.esperanca.max - nOff(r.esperanca.desabilitados));
    });
  const aceitarSurto = () => {
    recursos((r) => {
      const k = r.frenesi.desabilitados.lastIndexOf(false); // o espaço perdido é o último de pé
      if (k >= 0) r.frenesi.desabilitados[k] = true;
      r.frenesi.valor = 0;
      r.frenesi.surto = false;
      r.discernimento.valor = Math.max(0, r.discernimento.valor - 3);
      r.discernimento.queimados = Math.min(r.discernimento.queimados ?? 0, r.discernimento.valor);
    });
    falar(`<b>${d.nome}</b> sofre um <b>Surto</b>. O Frenesi zera, um espaço se perde para sempre e o Discernimento cai 3.`);
  };

  const rolar = () => {
    if (!rolagem) return;
    const pedido = { traco: rolagem.traco.id, experiencia: rolagem.exp, vantagem: rolagem.vantagem };
    if (acoes.aoRolar) {
      acoes.aoRolar(pedido);
      setRolagem(null);
      return;
    }
    const { novo, resultado, resumo } = rolarLocal(dRef.current, pedido);
    aplicar(() => novo);
    setRolagem({ ...rolagem, resultado });
    falar(`<b>${d.nome}</b> ${resumo}`);
  };

  const ultimo = chat[chat.length - 1];
  const rodape = opcoes.rodape !== false;

  return (
    <div className={`fp-pagina${embutida ? " fp-embutida" : ""}`}>
      {topo}
      <main className="fp" aria-label={`Ficha de ${d.nome}`}>
        <Canto pos="nw" />
        <Canto pos="ne" />
        <Canto pos="sw" />
        <Canto pos="se" />

        {/* ===== cabeçalho duplo ===== */}
        <header className="fp-cab">
          <div className="fp-cab-esq">
            <div className="fp-cab-classe">
              <strong>{d.subclasse}</strong>
              <em>{d.classe}</em>
            </div>
            <div className="fp-cab-dom" aria-label={`Domínios: ${d.dominios.map((x) => x.nome).join(" e ")}`}>
              {d.dominios.map((dm) => (
                <span key={dm.nome} className="fp-dom" title={dm.nome}>
                  <IconeDominio svg={dm.svg} />
                </span>
              ))}
            </div>
          </div>
          <div className="fp-cab-dir">
            <h2 className="fp-nome">{d.nome}</h2>
            <div className="fp-origem">{d.origem}</div>
          </div>
          <button type="button" className="fp-nivel" aria-label={`Nível ${d.nivel}. Subir de nível`} title="Subir de nível" onClick={() => setSubindo(true)}>
            <span>
              <small>Nível</small>
              <b>{d.nivel}</b>
            </span>
          </button>
        </header>
        {subindo && (
          <ConfirmaNivel
            nome={d.nome}
            nivel={d.nivel}
            fechar={() => setSubindo(false)}
            confirmar={() => {
              setSubindo(false);
              if (acoes.aoSubirNivel) acoes.aoSubirNivel();
              else falar(`<b>${d.nome}</b> sobe para o nível ${d.nivel + 1}.`);
            }}
          />
        )}

        <div className="fp-corpo">
          {/* ===== coluna esquerda: o corpo e a alma ===== */}
          <aside className="fp-esq" data-aberto={aberto ? "" : undefined} aria-label="Recursos">
            <button type="button" className="fp-mais" onClick={() => setAberto((a) => !a)}>
              {aberto ? "recolher" : "Esperança e experiências"}
            </button>

            <section className="fp-bloco" style={{ ["--i" as string]: 0 }}>
              <Rotulo nome="Pontos de Vida" resumo={`${R.pv.max - R.pv.marcados} / ${R.pv.max}`} />
              <div className="fp-trilha">
                <Marcador n={R.pv.max} valor={R.pv.marcados} forma="fp-f-coracao" cor="fp-pv" rotulo="PV marcado" onSet={(v) => recursos((r) => (r.pv.marcados = v))} />
              </div>
            </section>

            <section className="fp-bloco fp-defesa" style={{ ["--i" as string]: 1 }} aria-label="Defesa">
              <Rotulo nome="Defesa" />
              <div className="fp-def-topo">
                <div className="fp-evasao" title="Evasão">
                  <b>{d.evasao}</b>
                  <small>Evasão</small>
                </div>
                <div className="fp-def-arm">
                  <div className="fp-def-sub">
                    Armadura <b>{R.armadura.max - R.armadura.marcados} / {R.armadura.max}</b>
                  </div>
                  <div className="fp-trilha">
                    <Marcador n={R.armadura.max} valor={R.armadura.marcados} forma="fp-f-escudo" cor="fp-arm" rotulo="Armadura marcada" onSet={(v) => recursos((r) => (r.armadura.marcados = v))} />
                  </div>
                </div>
              </div>
              <div className="fp-def-sub fp-def-sub-lim">Limiares de dano</div>
              <div className="fp-regua" role="group" aria-label="Limiares de dano">
                <span className="seg">1 PV</span>
                <span className="lim" data-nome="maior">
                  <b>{d.limiares.maior}</b>
                </span>
                <span className="seg">2 PV</span>
                <span className="lim" data-nome="grave">
                  <b>{d.limiares.grave}</b>
                </span>
                <span className="seg">3 PV</span>
              </div>
            </section>

            <section className="fp-bloco" style={{ ["--i" as string]: 3 }}>
              <Rotulo nome="Fadiga" resumo={`${R.fadiga.max - R.fadiga.marcados} / ${R.fadiga.max}`} />
              <div className="fp-trilha">
                <Marcador n={R.fadiga.max} valor={R.fadiga.marcados} forma="fp-f-gema" cor="fp-fad" rotulo="Fadiga marcada" onSet={(v) => recursos((r) => (r.fadiga.marcados = v))} />
              </div>
              {fadigaCheia && <div className="fp-cheia">Cheia · o excesso vira dano</div>}
            </section>

            <section className="fp-bloco fp-recolhe fp-esp" style={{ ["--i" as string]: 5 }}>
              <Rotulo nome="Esperança" resumo={`${R.esperanca.valor} / ${espMax}`} />
              <div className="fp-trilha">
                <Marcador n={R.esperanca.max} valor={R.esperanca.valor} forma="fp-f-estrela" cor="fp-esp" off={R.esperanca.desabilitados} onToggleOff={alternaEsp} rotulo="Esperança" onSet={(v) => recursos((r) => (r.esperanca.valor = v))} />
              </div>
              {d.habilidadeEsperanca && (
                <div className="fp-hab-esp">
                  <strong>{d.habilidadeEsperanca.nome}</strong>
                  <Html html={d.habilidadeEsperanca.html} />
                  <div className="fp-custo">
                    <button
                      type="button"
                      disabled={R.esperanca.valor < d.habilidadeEsperanca.custo}
                      onClick={() => {
                        if (acoes.aoUsarHabilidadeEsperanca) return acoes.aoUsarHabilidadeEsperanca();
                        const c = d.habilidadeEsperanca!.custo;
                        recursos((r) => (r.esperanca.valor -= c));
                        falar(`<b>${d.nome}</b> gasta ${c} Esperança em <b>${d.habilidadeEsperanca!.nome}</b>.`);
                      }}
                    >
                      Usar · {d.habilidadeEsperanca.custo} ✦
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section className="fp-bloco fp-veu" style={{ ["--i" as string]: 4 }} data-alerta={frenMax > 0 && R.frenesi.valor === frenMax - 1 ? "" : undefined} data-surto={R.frenesi.surto ? "" : undefined}>
              <Tentaculos />
              <Rotulo nome="O Véu" />
              <div className="fp-subrot" style={{ color: "#7aa39b", marginTop: 0 }}>
                Discernimento · {R.discernimento.valor} / {R.discernimento.max}
                {(R.discernimento.queimados ?? 0) > 0 && ` · ${R.discernimento.queimados ?? 0} queimado${(R.discernimento.queimados ?? 0) > 1 ? "s" : ""}`}
              </div>
              <div className="fp-disc-trilha fp-disc">
                <Marcador n={R.discernimento.max} valor={R.discernimento.valor} forma="fp-f-circ" cor="fp-disc" rotulo="Discernimento" marcos={R.discernimento.marcos} queimados={R.discernimento.queimados ?? 0} onSet={(v) => recursos((r) => { r.discernimento.valor = v; r.discernimento.queimados = Math.min(r.discernimento.queimados ?? 0, v); })} />
                {Array.from({ length: R.discernimento.max }, (_, i) => (
                  <span key={i} className="rom" data-passou={R.discernimento.marcos.includes(i + 1) && R.discernimento.valor - (R.discernimento.queimados ?? 0) >= i + 1 ? "" : undefined}>
                    {R.discernimento.marcos.includes(i + 1) ? ROMANOS[i + 1] : ""}
                  </span>
                ))}
              </div>
              <div className="fp-subrot">
                Frenesi · {R.frenesi.valor} / {frenMax}
                {nOff(R.frenesi.desabilitados) > 0 && ` · ${nOff(R.frenesi.desabilitados)} perdido${nOff(R.frenesi.desabilitados) > 1 ? "s" : ""}`}
              </div>
              <div className="fp-fren-linha fp-fren">
                <Marcador n={R.frenesi.max} valor={R.frenesi.valor} forma="fp-f-espinho" cor="fp-fren" off={R.frenesi.desabilitados} onToggleOff={alternaFren} rotulo="Frenesi" onSet={setFrenesi} />
              </div>
              <div className="fp-veu-acoes">
                <div className="fp-queima-chip" data-aberto={confirmaQueima ? "" : undefined}>
                  <button
                    type="button"
                    className="fp-entrega fp-queima"
                    disabled={(R.discernimento.queimados ?? 0) >= R.discernimento.valor}
                    aria-expanded={confirmaQueima}
                    title="Queimar 1 ponto de Discernimento: faça uma pergunta ao mestre, cause dano extra num horror ou veja através de ilusões até o fim da cena. O ponto deixa de contar para os limiares, mas continua contando para o véu te tocar."
                    onClick={() => setConfirmaQueima((v) => !v)}
                  >
                    Queimar
                  </button>
                  <div className="fp-queima-conf" aria-hidden={!confirmaQueima}>
                    <div className="fp-queima-conf-int">
                      <button
                        type="button"
                        className="fp-queima-sim"
                        tabIndex={confirmaQueima ? 0 : -1}
                        aria-label="Confirmar: queimar 1 ponto de Discernimento"
                        onClick={() => {
                          recursos((r) => (r.discernimento.queimados = (r.discernimento.queimados ?? 0) + 1));
                          setConfirmaQueima(false);
                          setChamas((n) => n + 1);
                        }}
                      >
                        <svg viewBox="0 0 20 20" aria-hidden><path d="M4 10.5l4 4 8-9" /></svg>
                      </button>
                      <button type="button" className="fp-queima-nao" tabIndex={confirmaQueima ? 0 : -1} aria-label="Cancelar" onClick={() => setConfirmaQueima(false)}>
                        <svg viewBox="0 0 20 20" aria-hidden><path d="M5 5l10 10M15 5L5 15" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {chamas > 0 && <Chamas key={chamas} />}
              {R.frenesi.surto && (
                <div className="fp-surto" role="alert">
                  <strong>Surto</strong>O Frenesi encheu. A trilha zera, você perde 1 espaço para sempre e 3 de Discernimento.
                  <br />
                  <button type="button" onClick={aceitarSurto}>
                    Aceitar o Surto
                  </button>
                </div>
              )}
              {frenMax <= 0 && (
                <div className="fp-surto" role="alert">
                  <strong>Sem espaços</strong>O Véu levou tudo. O personagem está perdido.
                </div>
              )}
              <div className="fp-veu-sel">
                Compulsão: <i>{d.compulsao || "nenhuma"}</i>
              </div>
            </section>

            <section className="fp-bloco fp-recolhe" style={{ ["--i" as string]: 6 }}>
              <Rotulo nome="Experiências" />
              <ul className="fp-exp">
                {d.experiencias.map((x) => (
                  <li key={x.id}>
                    {x.nome} <b>+{x.bonus}</b>
                    <button
                      type="button"
                      className="fp-exp-chat"
                      aria-label={`Enviar ${x.nome} ao chat`}
                      title="Enviar ao chat"
                      onClick={() => (acoes.aoExperienciaNoChat ? acoes.aoExperienciaNoChat(x.id) : falar(`<b>${d.nome}</b> · ${x.nome} +${x.bonus}`))}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 5h16v11H9l-5 4z" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </aside>

          {/* ===== área principal ===== */}
          <section className="fp-main">
            <div style={{ position: "relative" }}>
              <div className="fp-tracos" role="group" aria-label="Traços">
                {d.tracos.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="fp-traco"
                    data-conj={t.conjuracao ? "" : undefined}
                    title={t.conjuracao ? "Traço de conjuração da subclasse" : `Rolar ${t.nome}`}
                    onClick={() => (opcoes.rolarDireto ? acoesRef.current.aoRolar?.({ traco: t.id, experiencia: null, vantagem: false }) : setRolagem({ traco: t, exp: null, vantagem: false }))}
                  >
                    {t.conjuracao && (
                      <>
                        <Canto pos="nw" mini />
                        <Canto pos="ne" mini />
                        <Canto pos="sw" mini />
                        <Canto pos="se" mini />
                      </>
                    )}
                    <small>{t.nome}</small>
                    <b>{t.mod > 0 ? `+${t.mod}` : t.mod < 0 ? `−${Math.abs(t.mod)}` : "0"}</b>
                  </button>
                ))}
              </div>
              {rolagem && (
                <div className="fp-rolagem" role="dialog" aria-label={`Rolar ${rolagem.traco.nome}`}>
                  <h4>
                    {rolagem.traco.nome} · Dualidade ({rolagem.traco.mod >= 0 ? "+" : "−"}
                    {Math.abs(rolagem.traco.mod)})
                  </h4>
                  {!rolagem.resultado ? (
                    <>
                      <div className="chips">
                        {d.experiencias.map((x) => (
                          <button
                            key={x.id}
                            type="button"
                            className="fp-chip"
                            aria-pressed={rolagem.exp === x.id}
                            disabled={R.esperanca.valor < 1 && rolagem.exp !== x.id}
                            onClick={() => setRolagem({ ...rolagem, exp: rolagem.exp === x.id ? null : x.id })}
                            title="Gasta 1 Esperança"
                          >
                            {x.nome} +{x.bonus} · 1 ✦
                          </button>
                        ))}
                        <button type="button" className="fp-chip" aria-pressed={rolagem.vantagem} onClick={() => setRolagem({ ...rolagem, vantagem: !rolagem.vantagem })}>
                          Vantagem (+d6)
                        </button>
                      </div>
                      <div className="fp-acoes">
                        <button type="button" className="fp-btn mudo" onClick={() => setRolagem(null)}>
                          Cancelar
                        </button>
                        <button type="button" className="fp-btn" onClick={rolar}>
                          Rolar
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="fp-resultado">
                        <div className="fp-dado esp">{rolagem.resultado.esp}</div>
                        <div className="fp-dado med">{rolagem.resultado.med}</div>
                        <div className="fp-total">{rolagem.resultado.total}</div>
                      </div>
                      <div className="fp-veredito">
                        {rolagem.resultado.quem === "crit" ? <b className="esp">Sucesso crítico</b> : rolagem.resultado.quem === "esp" ? <b className="esp">Com Esperança</b> : <b className="med">Com Medo</b>}
                        {rolagem.resultado.quem !== "med" ? " · +1 Esperança" : " · o mestre ganha 1 Medo"}
                      </div>
                      <div className="fp-acoes">
                        <button type="button" className="fp-btn" onClick={() => setRolagem(null)}>
                          Fechar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="fp-abas" role="tablist" aria-label="Seções da ficha">
              {ABAS.map((a, i) => (
                <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} className="fp-aba" style={{ ["--i" as string]: i }} onClick={() => setAba(a.id)}>
                  {a.nome}
                  {a.id === "efe" && d.efeitos.length > 0 && <span className="n">{d.efeitos.length}</span>}
                </button>
              ))}
            </div>

            <div className="fp-conteudo" role="tabpanel">
              {aba === "hab" && <AbaHabilidades d={d} aplicar={aplicar} escolherErva={acoes.aoEscolherErva} usar={(h) => (acoes.aoUsarHabilidade ? acoes.aoUsarHabilidade(h.id) : falar(`<b>${d.nome}</b> usa <b>${h.nome}</b>${h.custo ? ` (${h.custo})` : ""}.`))} />}
              {aba === "load" && <AbaLoadout d={d} aplicar={aplicar} usar={(id) => { const c = d.loadout.find((k) => k.id === id); if (acoes.aoUsarHabilidade) acoes.aoUsarHabilidade(id); else falar(`<b>${d.nome}</b> usa <b>${c?.nome ?? ""}</b>.`); }} noChat={(id) => { const c = [...d.loadout, ...d.cofre].find((k) => k.id === id); if (acoes.aoCartaNoChat) acoes.aoCartaNoChat(id); else falar(`<b>${c?.nome ?? ""}</b> · ${c?.dominio ?? ""} nível ${c?.nivel ?? ""}`); }} />}
              {aba === "inv" && <AbaInventario d={d} />}
              {aba === "his" && <AbaHistoria d={d} aplicar={aplicar} />}
              {aba === "des" && (
                <AbaDescanso
                  d={d}
                  confirmar={(p) => {
                    if (acoes.aoDescansar) return acoes.aoDescansar(p);
                    const { novo, linhas } = descansoLocal(dRef.current, p);
                    aplicar(() => novo);
                    falar(`<b>${d.nome}</b> faz um descanso <b>${p.tipo}</b>: ${linhas.join("; ")}. O mestre ganha ${p.tipo === "curto" ? "1d4" : "1d4 + 1"} Medo.`);
                  }}
                />
              )}
              {aba === "efe" && <AbaEfeitos d={d} aplicar={aplicar} />}
            </div>

            {rodape && (
              <div className="fp-pe">
                <div className="msg" key={ultimo?.id} data-nova="">
                  {ultimo ? <span dangerouslySetInnerHTML={{ __html: ultimo.html }} /> : <i>O chat recebe aqui o que a ficha faz.</i>}
                </div>
                <button type="button" disabled={hist.length === 0} onClick={desfazer}>
                  ↶ Desfazer
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

// ---------- abas ----------
function AbaHabilidades({ d, aplicar, usar, escolherErva }: { d: FichaDados; aplicar: Aplicar; usar: (h: Habilidade) => void; escolherErva?: (id: string) => void }) {
  const mexeContador = (hid: string, iid: string, dlt: number) =>
    aplicar((x) => {
      const n = structuredClone(x);
      const rec = n.grupos.flatMap((g) => g.habilidades).find((h) => h.id === hid)?.recurso;
      if (rec?.tipo !== "contadores") return x;
      const it = rec.itens.find((i) => i.id === iid)!;
      const v = Math.max(0, it.valor + dlt);
      const total = rec.itens.reduce((a, b) => a + b.valor, 0) - it.valor + v;
      if (rec.limiteTotal !== undefined && total > rec.limiteTotal) return x;
      it.valor = v;
      return n;
    });
  const alternaCaixa = (hid: string, iid: string) =>
    aplicar((x) => {
      const n = structuredClone(x);
      const rec = n.grupos.flatMap((g) => g.habilidades).find((h) => h.id === hid)?.recurso;
      if (rec?.tipo !== "caixas") return x;
      const it = rec.itens.find((i) => i.id === iid)!;
      it.usada = !it.usada;
      return n;
    });
  const cor = (h: Habilidade) => h.cores ?? ["#6b5a3a", "#d7bc80"];
  return (
    <>
      {d.grupos.map((g, gi) => {
        const ativas = g.habilidades.filter((h) => h.tipo !== "passiva");
        const passivas = g.habilidades.filter((h) => h.tipo === "passiva");
        return (
          <section key={g.origem} className="fp-grupo" style={{ ["--i" as string]: gi }}>
            <div className="fp-grupo-cab">
              {g.origem} <span>· {g.fonte}</span>
            </div>
            {[...ativas, ...passivas].map((h) => {
              const rec = h.recurso;
              const total = rec?.tipo === "contadores" ? rec.itens.reduce((a, b) => a + b.valor, 0) : 0;
              const usavel = h.tipo === "acao" || h.tipo === "reacao" || h.tipo === "esperanca";
              return (
                <CartaHab key={h.id} h={h} usavel={usavel} cores={cor(h)} usar={() => usar(h)}>
                  {rec?.tipo === "contadores" && (
                    <div className="fp-bolsa">
                      {rec.itens.map((it) => (
                        <div key={it.id} className="fp-princ">
                          <span className="gema" style={{ background: it.cor ?? "radial-gradient(circle at 35% 30%, #d4dbe3, #7a8795)" }} />
                          <small>{it.nome}</small>
                          <button type="button" disabled={it.valor <= 0} onClick={() => mexeContador(h.id, it.id, -1)} aria-label={`Menos ${it.nome}`}>
                            −
                          </button>
                          <output>{it.valor}</output>
                          <button type="button" disabled={rec.limiteTotal !== undefined && total >= rec.limiteTotal} onClick={() => mexeContador(h.id, it.id, 1)} aria-label={`Mais ${it.nome}`}>
                            +
                          </button>
                        </div>
                      ))}
                      {rec.limiteTotal !== undefined && (
                        <span className="fp-bolsa-total">
                          Bolsa <b style={{ color: "var(--texto)" }}>{total}</b> / {rec.limiteTotal}
                        </span>
                      )}
                    </div>
                  )}
                  {rec?.tipo === "caixas" && (
                    <div className="fp-ervas">
                      {rec.itens.map((it) => (
                        <button key={it.id} type="button" className="fp-erva" data-usada={it.usada ? "" : undefined} aria-pressed={it.usada} title={it.usada ? "Usada neste descanso. Clique para desfazer." : "Clique para usar"} onClick={() => alternaCaixa(h.id, it.id)}>
                          <span className="cx" />
                          {it.nome}
                        </button>
                      ))}
                      {rec.vaga && (
                        <button type="button" className="fp-erva" data-vazia="" disabled={!escolherErva} title="Escolher uma erva" onClick={() => escolherErva?.(h.id)}>
                          <span className="cx" style={{ opacity: 0.25 }} />
                          {rec.vaga}
                        </button>
                      )}
                    </div>
                  )}
                </CartaHab>
              );
            })}
          </section>
        );
      })}
      {d.futuras && (
        <section className="fp-grupo" style={{ ["--i" as string]: 4, opacity: 0.55 }}>
          <div className="fp-grupo-cab">{d.futuras.titulo}</div>
          <details className="fp-passiva">
            <summary>
              <span className="mini" style={{ ["--h1" as string]: "#444", ["--h2" as string]: "#666" }}>
                ?
              </span>
              {d.futuras.nomes.join(" · ")}
            </summary>
            <div className="fp-texto">{d.futuras.nota ?? "Aparecem apagadas até serem escolhidas."}</div>
          </details>
        </section>
      )}
    </>
  );
}

/** Pergunta, em janela sobre a ficha, se o personagem sobe de nível. */
function ConfirmaNivel({ nome, nivel, fechar, confirmar }: { nome: string; nivel: number; fechar: () => void; confirmar: () => void }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      fechar();
    };
    window.addEventListener("keydown", tecla, true);
    return () => window.removeEventListener("keydown", tecla, true);
  }, [fechar]);
  return (
    <div className="fp-cm fp-cm-nivel" onClick={fechar} role="dialog" aria-modal="true" aria-label="Subir de nível">
      <div className="fp-cm-corpo fp-nv-caixa" onClick={(e) => e.stopPropagation()}>
        <div className="fp-nv-marca" aria-hidden="true">
          <small>Nível</small>
          <b>{nivel}</b>
          <i>→</i>
          <b className="novo">{nivel + 1}</b>
        </div>
        <h3>Subir de nível?</h3>
        <p>
          <strong>{nome}</strong> avança do nível {nivel} para o nível {nivel + 1}. Ao aceitar, abrimos o fluxo de level up para escolher os avanços.
        </p>
        <div className="fp-nv-botoes">
          <BotaoHextech tema="ambar" onClick={confirmar}>
            Subir de nível
          </BotaoHextech>
          <BotaoHextech tema="noite" onClick={fechar}>
            Agora não
          </BotaoHextech>
        </div>
      </div>
    </div>
  );
}

// ---- Loadout: as cartas de domínio ----
function CartaVisual({ c, selecionada, aoClicar, arrastar }: { c: CartaDominio; selecionada?: boolean; aoClicar?: () => void; arrastar?: { aoComecar: () => void } }) {
  const cor = COR_DOMINIO[c.dominio] ?? "#8a8f9c";
  const caixa = useRef<HTMLButtonElement>(null);
  const [escala, setEscala] = useState(0);
  // a carta renderizada tem 360×504: a escala acompanha a largura do espaço (grade de 3 colunas)
  useEffect(() => {
    const el = caixa.current;
    if (!el || !c.cartaHtml) return;
    const mede = () => setEscala(el.clientWidth / 360);
    mede();
    const ro = new ResizeObserver(mede);
    ro.observe(el);
    return () => ro.disconnect();
  }, [c.cartaHtml]);
  if (c.cartaHtml) {
    return (
      <button
        ref={caixa}
        type="button"
        className="fp-carta"
        data-viva=""
        data-sel={selecionada ? "" : undefined}
        style={{ ["--h1" as string]: cor }}
        draggable={!!arrastar}
        onDragStart={arrastar?.aoComecar}
        onClick={aoClicar}
        aria-pressed={selecionada}
        aria-label={`${c.nome}, ${c.dominio} nível ${c.nivel}`}
      >
        <div className="fp-carta-escala" style={{ zoom: escala || 0.5, visibility: escala ? "visible" : "hidden" }} dangerouslySetInnerHTML={{ __html: c.cartaHtml }} />
      </button>
    );
  }
  return (
    <button
      type="button"
      className="fp-carta"
      data-cheia=""
      data-sel={selecionada ? "" : undefined}
      data-imagem={c.imagem ? "" : undefined}
      style={{ ["--h1" as string]: cor }}
      draggable={!!arrastar}
      onDragStart={arrastar?.aoComecar}
      onClick={aoClicar}
      aria-pressed={selecionada}
      aria-label={`${c.nome}, ${c.dominio} nível ${c.nivel}`}
    >
      {c.imagem ? (
        <img src={c.imagem} alt="" draggable={false} />
      ) : (
        <>
          <span className="nv">{c.nivel}</span>
          <small>{c.dominio}</small>
          <b>{c.nome}</b>
          <span className="tp">
            {c.tipo}
            {c.recuperacao > 0 && ` · rec. ${c.recuperacao}`}
          </span>
        </>
      )}
    </button>
  );
}

const ICO_CARTA: Record<string, string> = {
  usar: "M13 2 4 14h7l-1 8 9-12h-7z",
  chat: "M4 5h16v11H9l-5 4z",
  guardar: "M4 8h16v11H4zM4 8l2-4h12l2 4M12 11v5M9.5 13.5 12 16l2.5-2.5",
  equipar: "M4 8h16v11H4zM4 8l2-4h12l2 4M12 16v-5M9.5 13.5 12 11l2.5 2.5",
  fechar: "M6 6l12 12M18 6 6 18",
};
function IcoCarta({ n }: { n: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICO_CARTA[n]} />
    </svg>
  );
}

/** Desenha os filhos direto na moldura da ficha (.fp), para o fundo escuro cobrir a janela inteira e ficar acima do cabeçalho. */
function SobreFicha({ children }: { children: ReactNode }) {
  const ancora = useRef<HTMLSpanElement>(null);
  const [alvo, setAlvo] = useState<Element | null>(null);
  useEffect(() => setAlvo(ancora.current?.closest(".fp") ?? null), []);
  return (
    <>
      <span ref={ancora} hidden />
      {alvo && createPortal(children, alvo)}
    </>
  );
}

/** A carta aberta em janela sobre a ficha: a carta inteira e três ações só com ícone. */
function CartaModal({ c, noLoadout, cheio, fechar, mover, usar, noChat }: { c: CartaDominio; noLoadout: boolean; cheio: boolean; fechar: () => void; mover: () => void; usar: () => void; noChat: () => void }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(0);
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const mede = () => setEscala(Math.max(0.4, Math.min(1.15, (el.clientHeight - 110) / 504, (el.clientWidth - 40) / 360)));
    mede();
    const ro = new ResizeObserver(mede);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      fechar();
    };
    window.addEventListener("keydown", tecla, true);
    return () => window.removeEventListener("keydown", tecla, true);
  }, [fechar]);
  const acao = (f: () => void) => () => {
    f();
    fechar();
  };
  const rotMover = noLoadout ? "Guardar no cofre" : cheio ? "Loadout cheio" : "Equipar";
  return (
    <div className="fp-cm" ref={caixa} onClick={fechar} role="dialog" aria-modal="true" aria-label={c.nome} style={{ ["--h1" as string]: COR_DOMINIO[c.dominio] ?? "#8a8f9c" }}>
      <div className="fp-cm-corpo" onClick={(e) => e.stopPropagation()}>
        {c.cartaHtml ? (
          <div className="fp-cm-carta" style={{ zoom: escala || 0.5, visibility: escala ? "visible" : "hidden" }}>
            <div className="fp-carta-escala" dangerouslySetInnerHTML={{ __html: c.cartaHtml }} />
          </div>
        ) : (
          <div className="fp-carta-det">
            <div className="cab">
              <h4>{c.nome}</h4>
              <span className="meta">
                {c.dominio} · nível {c.nivel} · {c.tipo}
                {c.recuperacao > 0 && ` · recuperação ${c.recuperacao}`}
              </span>
            </div>
            <Html className="fp-texto" html={c.html} />
          </div>
        )}
        <div className="fp-cm-acoes">
          <button type="button" className="fp-cm-b usar" data-rot="Usar" aria-label="Usar" title={noLoadout ? "Usar" : "Equipe a carta para usar"} disabled={!noLoadout} onClick={acao(usar)}>
            <IcoCarta n="usar" />
          </button>
          <button type="button" className="fp-cm-b" data-rot="Enviar ao chat" aria-label="Enviar ao chat" title="Enviar ao chat" onClick={acao(noChat)}>
            <IcoCarta n="chat" />
          </button>
          <button type="button" className="fp-cm-b" data-rot={rotMover} aria-label={rotMover} title={rotMover} disabled={!noLoadout && cheio} onClick={acao(mover)}>
            <IcoCarta n={noLoadout ? "guardar" : "equipar"} />
          </button>
        </div>
        <button type="button" className="fp-cm-x" aria-label="Fechar" title="Fechar" onClick={fechar}>
          <IcoCarta n="fechar" />
        </button>
      </div>
    </div>
  );
}

function AbaLoadout({ d, aplicar, usar, noChat }: { d: FichaDados; aplicar: Aplicar; usar: (id: string) => void; noChat: (id: string) => void }) {
  const [sel, setSel] = useState<string | null>(null);
  const arrastando = useRef<string | null>(null);
  const todas = useMemo(() => [...d.loadout, ...d.cofre], [d.loadout, d.cofre]);
  const carta = todas.find((c) => c.id === sel) ?? null;
  const noLoadout = !!carta && d.loadout.some((c) => c.id === carta.id);
  const cheio = d.loadout.length >= d.loadoutMax;

  const mover = (id: string, para: "loadout" | "cofre") =>
    aplicar((x) => {
      const c = [...x.loadout, ...x.cofre].find((k) => k.id === id);
      if (!c) return x;
      const jaEsta = para === "loadout" ? x.loadout.some((k) => k.id === id) : x.cofre.some((k) => k.id === id);
      if (jaEsta || (para === "loadout" && x.loadout.length >= x.loadoutMax)) return x;
      return {
        ...x,
        loadout: para === "loadout" ? [...x.loadout, c] : x.loadout.filter((k) => k.id !== id),
        cofre: para === "cofre" ? [...x.cofre, c] : x.cofre.filter((k) => k.id !== id),
      };
    });
  const solta = (para: "loadout" | "cofre") => (e: React.DragEvent) => {
    e.preventDefault();
    if (arrastando.current) mover(arrastando.current, para);
    arrastando.current = null;
  };

  return (
    <>
      <section onDragOver={(e) => e.preventDefault()} onDrop={solta("loadout")}>
        <h3 className="fp-tit">
          Equipadas · {d.loadout.length} / {d.loadoutMax}
        </h3>
        <div className="fp-slots">
          {d.loadout.map((c) => (
            <CartaVisual key={c.id} c={c} selecionada={sel === c.id} aoClicar={() => setSel(sel === c.id ? null : c.id)} arrastar={{ aoComecar: () => (arrastando.current = c.id) }} />
          ))}
          {Array.from({ length: Math.max(0, d.loadoutMax - d.loadout.length) }, (_, i) => (
            <div key={i} className="fp-carta vazia">
              vazio
            </div>
          ))}
        </div>
      </section>
      <section onDragOver={(e) => e.preventDefault()} onDrop={solta("cofre")}>
        <h3 className="fp-tit">Cofre · {d.cofre.length}</h3>
        <div className="fp-slots">
          {d.cofre.map((c) => (
            <CartaVisual key={c.id} c={c} selecionada={sel === c.id} aoClicar={() => setSel(sel === c.id ? null : c.id)} arrastar={{ aoComecar: () => (arrastando.current = c.id) }} />
          ))}
          {d.cofre.length === 0 && <div className="fp-carta vazia">vazio</div>}
        </div>
      </section>
      {carta && <SobreFicha><CartaModal c={carta} noLoadout={noLoadout} cheio={cheio} fechar={() => setSel(null)} mover={() => mover(carta.id, noLoadout ? "cofre" : "loadout")} usar={() => usar(carta.id)} noChat={() => noChat(carta.id)} /></SobreFicha>}
    </>
  );
}

function AbaInventario({ d }: { d: FichaDados }) {
  return (
    <>
      {d.inventario.map((s) => (
        <section key={s.titulo}>
          <h3 className="fp-tit">{s.titulo}</h3>
          <ul className="fp-lista">
            {s.itens.map((i) => (
              <li key={i.id}>
                {i.nome} {i.detalhe && <small>{i.detalhe}</small>}
                {i.direita && <span className="dir">{i.direita}</span>}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {d.moedas && (
        <section className="fp-ouro">
          {d.moedas.map((m) => (
            <span key={m.nome}>
              <small>{m.nome}</small>
              {m.valor}
            </span>
          ))}
        </section>
      )}
    </>
  );
}

function AbaHistoria({ d, aplicar }: { d: FichaDados; aplicar: Aplicar }) {
  return (
    <div className="fp-notas">
      {d.perguntas.map((p) => (
        <div key={p.id}>
          <label htmlFor={`fp-n-${p.id}`}>{p.pergunta}</label>
          <textarea
            id={`fp-n-${p.id}`}
            defaultValue={p.texto}
            // grava ao sair do campo, e sem entrar no histórico de "desfazer"
            onBlur={(e) => {
              const v = e.target.value;
              aplicar((x) => (x.perguntas.find((q) => q.id === p.id)?.texto === v ? x : { ...x, perguntas: x.perguntas.map((q) => (q.id === p.id ? { ...q, texto: v } : q)) }), false);
            }}
          />
        </div>
      ))}
    </div>
  );
}

function AbaEfeitos({ d, aplicar }: { d: FichaDados; aplicar: Aplicar }) {
  const alterna = (id: string) => aplicar((x) => ({ ...x, efeitos: x.efeitos.includes(id) ? x.efeitos.filter((e) => e !== id) : [...x.efeitos, id] }));
  return (
    <section>
      <h3 className="fp-tit">Condições e efeitos ativos</h3>
      <div className="fp-efeitos">
        {d.condicoes.map((c) => (
          <button key={c.id} type="button" className="fp-efeito" data-on={d.efeitos.includes(c.id) ? "" : undefined} aria-pressed={d.efeitos.includes(c.id)} onClick={() => alterna(c.id)}>
            <b>{c.nome}</b>
            <small>{c.texto}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

const ICONES: Record<string, string> = {
  lampiao: "M9 3h6l1 4H8zM8 7c-1 3-2 5-2 8h12c0-3-1-5-2-8M10 15v3h4v-3M7 21h10",
  lua: "M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z",
  ferimentos: "M12 5v14M5 12h14M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
  folego: "M3 9h11a3 3 0 1 0-3-3M3 14h15a3 3 0 1 1-3 3M3 19h8",
  armadura: "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z",
  preparar: "M12 3l2.5 6 6.5.5-5 4.3 1.6 6.4-5.6-3.4L6.4 20.2 8 13.8 3 9.5 9.5 9z",
  remendar: "M12 12a1.6 1.6 0 1 0 0 .01M12 12c0-5 8-5 8 0s-8 9-12 4c-3-3 0-8 4-8",
  projeto: "M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM8 8h8M8 12h8M8 16h5",
  destilar: "M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.4 2h11.2a1.5 1.5 0 0 0 1.4-2l-5-10V3M8 15h8",
  padrao: "M12 3l9 9-9 9-9-9z",
};
function Icone({ n }: { n: string }) {
  return (
    <svg className={`fp-ic ic-${n}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONES[n] ?? ICONES.padrao} />
    </svg>
  );
}

function AbaDescanso({ d, confirmar }: { d: FichaDados; confirmar: (p: PedidoDescanso) => void }) {
  const [tipo, setTipo] = useState<"curto" | "longo">("curto");
  const [qtd, setQtd] = useState<Record<string, number>>({});
  const escolhidos = Object.values(qtd).reduce((a, b) => a + b, 0);
  const lista = d.movimentosDescanso.filter((m) => tipo === "longo" || !m.soLongo);
  // movimentos escolhidos, na ordem da lista, repetidos conforme a quantidade
  const marcados = d.movimentosDescanso.flatMap((m) => Array.from({ length: qtd[m.id] ?? 0 }, () => m));
  // clicar num cartão escolhe (até 2 no total); com 2 já escolhidos, clicar num já marcado tira um
  const alterna = (id: string) =>
    setQtd((q) => {
      const n = q[id] ?? 0;
      if (escolhidos < 2) return { ...q, [id]: n + 1 };
      return n > 0 ? { ...q, [id]: n - 1 } : q;
    });
  const tira = (id: string) => setQtd((q) => ({ ...q, [id]: Math.max(0, (q[id] ?? 0) - 1) }));
  const pronto = escolhidos === 2;
  const ok = () => {
    confirmar({ tipo, movimentos: marcados.map((m) => m.id) });
    setQtd({});
  };
  return (
    <section className="fp-descanso">
      <div className="fp-ceu" role="group" aria-label="Tipo de descanso">
        {(["curto", "longo"] as const).map((k) => (
          <div key={k} className="fp-ceu-op">
            <BotaoHextech ativo={tipo === k} tema={k === "curto" ? "ambar" : "noite"} onClick={() => setTipo(k)}>
              <Icone n={k === "curto" ? "lampiao" : "lua"} /> {k === "curto" ? "Descanso curto" : "Descanso longo"}
            </BotaoHextech>
            <small>{k === "curto" ? "uma pausa à luz de gás" : "a noite inteira"}</small>
          </div>
        ))}
      </div>

      <div className="fp-escolhas">
        <div className="fp-slots-desc" aria-label="Movimentos escolhidos">
          {[0, 1].map((k) => {
            const m = marcados[k];
            return m ? (
              <button key={k} type="button" className="fp-slot-d" data-cheio="" title="Clique para tirar" onClick={() => tira(m.id)}>
                <Icone n={m.id} />
                <span>{m.nome}</span>
              </button>
            ) : (
              <div key={k} className="fp-slot-d">
                <span>{k === 0 ? "primeiro movimento" : "segundo movimento"}</span>
              </div>
            );
          })}
        </div>
        <div className="fp-lacre-caixa">
          <BotaoHextech redondo tema={tipo === "curto" ? "ambar" : "noite"} disabled={!pronto} onClick={ok}>
            <Icone n={tipo === "curto" ? "lampiao" : "lua"} />
            <span className="rot">Descansar</span>
          </BotaoHextech>
          <button type="button" className="fp-x" aria-label="Limpar a escolha" title="Limpar a escolha" data-visivel={escolhidos > 0 ? "" : undefined} disabled={escolhidos === 0} onClick={() => setQtd({})}>
            <svg viewBox="0 0 12 12" aria-hidden>
              <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="fp-movs">
        {lista.map((m, i) => (
          <button key={`${tipo}-${m.id}`} style={{ ["--i" as string]: i }} type="button" className="fp-mov" data-n={qtd[m.id] ?? 0} onClick={() => alterna(m.id)} title={tipo === "curto" ? m.curto : m.longo}>
            <span className="ico">
              <Icone n={m.id} />
            </span>
            <b>
              {m.nome}
              {m.classe && <em>classe</em>}
            </b>
            <small>{tipo === "curto" ? m.curto : m.longo}</small>
            {(qtd[m.id] ?? 0) > 0 && <span className="qtd">×{qtd[m.id]}</span>}
          </button>
        ))}
      </div>

      <p className="fp-aviso">
        Ao confirmar, a ficha aplica os efeitos, posta o resultado no chat e o mestre ganha {tipo === "curto" ? "1d4" : "1d4 + 1"} Medo.
        {tipo === "longo" && " As ervas voltam a ficar disponíveis e o Frenesi zera."}
      </p>
    </section>
  );
}
