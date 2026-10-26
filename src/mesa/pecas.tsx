// Peças comuns das etapas: janela storylet, janela lateral, campo que salva sozinho e contas.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSessao } from "../db/sala";
import { ETAPAS, ROMANOS, type Personagem, type Privado } from "../db/tipos";
import type { Conteudo } from "../conteudo";
import { comoLista } from "../db/backend";
import { Cabecalho, Janela, PlaceholderArte, Selo, Vinheta } from "../jogo/componentes";
import { Icone } from "../jogo/icones";
import { TextoVivo } from "../components/ui";
import { useMapa } from "./MapaFundo";

export { TextoVivo };

/** A janela principal da etapa, no formato storylet. */
export function Storylet({
  n,
  titulo,
  contexto,
  vinheta = true,
  forma = "normal",
  compacto,
  rodape,
  children,
}: {
  n: number;
  titulo: string;
  contexto?: string;
  vinheta?: boolean;
  forma?: "normal" | "painel" | "cheia" | "ficha";
  /** cabeçalho enxuto: sem a frase de contexto, para a ação principal caber sem rolar */
  compacto?: boolean;
  /** botões de navegação que ficam sempre visíveis no pé do painel */
  rodape?: ReactNode;
  children: ReactNode;
}) {
  const { conteudo } = useSessao();
  const { definir } = useMapa();
  const [recolhido, setRecolhido] = useState(false);
  // o painel avisa o mapa quanto espaço ocupa; recolhido, o mapa ganha a tela toda
  useEffect(() => {
    if (forma !== "painel") return;
    definir({ painel: recolhido ? 0 : 510 });
    return () => definir({ painel: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forma, recolhido]);
  const rotulo = n === 0 ? "Prólogo" : `Capítulo ${ROMANOS[n]}`;
  // no painel dos capítulos de mapa dá para recolher a janela e ver o mapa inteiro
  if (forma === "painel" && recolhido) {
    return (
      <button className="aba-recolhida" onClick={() => setRecolhido(false)} title="abrir o painel">
        <Icone id={`cap-${n}`} tamanho={18} />
        <span>
          <span className="n-L">{rotulo}</span>
          <span className="titulo-aba">{titulo}</span>
        </span>
        <Puxador sentido="abrir" />
      </button>
    );
  }
  return (
    <div className={`janela-principal ${forma === "normal" ? "" : forma} ${compacto ? "compacto" : ""}`}>
      <Janela
        tipo="pesada"
        rolar
        rodape={rodape}
        topo={
          <div className="topo-storylet">
            <Cabecalho capitulo={rotulo} nomeCap={ETAPAS[n]?.nome} titulo={titulo} contexto={contexto} />
            {forma === "painel" && (
              <button className="puxador-btn" onClick={() => setRecolhido(true)} title="recolher o painel e ver o mapa" aria-label="recolher o painel">
                <Puxador sentido="recolher" />
              </button>
            )}
          </div>
        }
      >
        {vinheta ? (
          <div className="storylet-topo">
            <Vinheta id={`cap-${n}`} arquivo={conteudo.arte[`cap-${n}`]} icone={`cap-${n}`} tamanho={forma === "painel" || forma === "ficha" ? 112 : 160} />
            <div className="storylet-corpo">{children}</div>
          </div>
        ) : (
          <div>{children}</div>
        )}
      </Janela>
    </div>
  );
}

/** Tela de gestão: UMA janela grande, sem mapa, que usa a largura toda. Os painéis ficam lado a lado, separados por fios de latão. */
export function Gestao({
  n,
  titulo,
  colunas,
  rodape,
  semCabecalho,
  children,
}: {
  n: number;
  titulo: string;
  /** sem o cabeçalho (capítulo e título): a janela é só os painéis */
  semCabecalho?: boolean;
  /** (ignorado nas telas de gestão: sem subtítulos) */
  contexto?: string;
  /** `grid-template-columns` da grade de painéis (ex.: "1.2fr 1fr") */
  colunas: string;
  rodape?: ReactNode;
  children: ReactNode;
}) {
  const rotulo = n === 0 ? "Prólogo" : `Capítulo ${ROMANOS[n]}`;
  return (
    <div className="janela-principal gestao">
      <Janela tipo="pesada" className="gestao-janela" rodape={rodape} topo={semCabecalho ? undefined : <div className="topo-storylet"><Cabecalho capitulo={rotulo} nomeCap={ETAPAS[n]?.nome} titulo={titulo} /></div>}>
        <div className="gestao-grade" style={{ ["--colunas" as string]: colunas }}>
          {children}
        </div>
      </Janela>
    </div>
  );
}

/** Um painel interno da tela de gestão: rola sozinho, sem moldura própria. */
export function Painel({ titulo, acao, children, className = "" }: { rotulo?: never; titulo?: string; acao?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`painel-g ${className}`}>
      {(titulo || acao) && (
        <header className="painel-g-cab">
          <div>{titulo && <div className="n-S">{titulo}</div>}</div>
          {acao}
        </header>
      )}
      {children}
    </section>
  );
}

export /** Cartão de escolha: quase quadrado, texto à esquerda e uma sangria à direita para a ilustração. */
function Opcao({
  nome,
  descricao,
  arte,
  marcada,
  bloqueada,
  etiqueta,
  rotuloMarca = "escolhido",
  aoClicar,
}: {
  nome: string;
  descricao?: ReactNode;
  arte?: string | null;
  marcada: boolean;
  bloqueada?: boolean;
  etiqueta?: string;
  rotuloMarca?: string;
  aoClicar: () => void;
}) {
  return (
    <button type="button" className={`opcao ${marcada ? "marcada" : ""}`} disabled={bloqueada} aria-pressed={marcada} onClick={aoClicar}>
      <span className="opcao-txt">
        <span className="opcao-nome">{nome}</span>
        {descricao && <span className="opcao-desc">{descricao}</span>}
      </span>
      {(marcada || etiqueta) && <span className={`opcao-selo ${marcada ? "escolhido" : ""}`}>{marcada ? rotuloMarca : etiqueta}</span>}
      <span className="opcao-arte" aria-hidden="true">
        {arte ? <img src={arte} alt="" /> : <PlaceholderArte id={nome} monograma={nome.slice(0, 1)} />}
      </span>
    </button>
  );
}

/** O cartaz 3:4: a arte É o cartão. O nome só aparece por cima quando a arte não o traz escrito (`mostrarNome`); senão fica no tooltip e no painel de detalhes. */
export function Cartaz({
  nome,
  url,
  srcSet,
  mostrarNome = true,
  marcada,
  aberto,
  etiqueta,
  rotuloMarca = "sua escolha",
  proporcao,
  aoClicar,
}: {
  nome: string;
  url?: string | null;
  srcSet?: string;
  mostrarNome?: boolean;
  marcada?: boolean;
  /** o cartaz cujo detalhe está aberto agora */
  aberto?: boolean;
  etiqueta?: string;
  rotuloMarca?: string;
  /** largura/altura real da arte; o quadro a segue e a imagem nunca é cortada */
  proporcao?: number;
  aoClicar: () => void;
}) {
  return (
    <button type="button" style={url && proporcao ? { aspectRatio: String(proporcao) } : undefined} className={`cartaz ${marcada ? "marcada" : ""} ${aberto ? "aberto" : ""}`} title={nome} aria-label={nome} aria-pressed={marcada} onClick={aoClicar}>
      <span className="cartaz-arte">
        {url ? <img src={url} srcSet={srcSet} sizes="200px" alt="" loading="lazy" /> : <PlaceholderArte id={nome} monograma={nome.slice(0, 1)} />}
      </span>
      {mostrarNome && <span className="cartaz-nome">{nome}</span>}
      {(marcada || etiqueta) && <span className={`opcao-selo ${marcada ? "escolhido" : ""}`}>{marcada ? rotuloMarca : etiqueta}</span>}
    </button>
  );
}

/** Lingueta de latão presa na borda da moldura, com a seta gravada. */
function Puxador({ sentido }: { sentido: "recolher" | "abrir" }) {
  return (
    <span className="puxador" aria-hidden="true">
      <svg viewBox="0 0 16 56" width="16" height="56">
        <defs>
          <linearGradient id="puxador-latao" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8e7240" />
            <stop offset=".45" stopColor="#e9d29a" />
            <stop offset="1" stopColor="#9d7f45" />
          </linearGradient>
        </defs>
        <path d="M0 2 L10 8 Q15 11 15 16 L15 40 Q15 45 10 48 L0 54 Z" fill="url(#puxador-latao)" stroke="#3d311a" strokeWidth="1" />
        <path d="M2.5 9 L2.5 47" stroke="#fff3cf" strokeOpacity=".5" strokeWidth=".8" />
        <path d={sentido === "recolher" ? "M10 22 L5.5 28 L10 34" : "M6 22 L10.5 28 L6 34"} fill="none" stroke="#2a2213" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** O que vem depois do texto: a divisória e os ramos, com a ação principal no pé. */
export function Escolhas({ children, acao, grade }: { children?: ReactNode; acao?: ReactNode; grade?: boolean }) {
  return (
    <>
      <div className="divisoria" aria-hidden="true">
        <Icone id="losango" tamanho={12} />
      </div>
      {children && <div className={grade ? "ramos grade-opcoes" : "ramos"}>{children}</div>}
      {acao && <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 18, marginTop: 20 }}>{acao}</div>}
    </>
  );
}

export function JanelaLateral({ rotulo, titulo, fechar, children, insignia }: { rotulo?: string; titulo: string; fechar?: () => void; children: ReactNode; insignia?: ReactNode }) {
  useEffect(() => {
    if (!fechar) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [fechar]);
  return (
    <aside className="janela-lateral">
      <Janela tipo="leve">
        <div className="cab-lateral">
          {insignia}
          <div>
            {rotulo && <div className="n-L">{rotulo}</div>}
            <div className="n-S">{titulo}</div>
          </div>
          {fechar && (
            <button className="icone-btn" onClick={fechar} aria-label="fechar">
              <Icone id="fechar" tamanho={14} />
            </button>
          )}
        </div>
        {children}
      </Janela>
    </aside>
  );
}

/** Campo que salva sozinho, com rótulo visível e o carimbo de "feito". */
export function Escrita({
  rotulo,
  valor,
  salvar,
  linhas = 3,
  desabilitado,
  placeholder,
  atraso,
}: {
  rotulo: string;
  valor: string | null | undefined;
  salvar: (v: string) => void;
  linhas?: number;
  desabilitado?: boolean;
  placeholder?: string;
  atraso?: number;
}) {
  const [salvo, setSalvo] = useState(0);
  const primeiro = useRef(true);
  useEffect(() => {
    if (primeiro.current) {
      primeiro.current = false;
      return;
    }
  }, []);
  return (
    <div className="escrita">
      <label className="n-L">{rotulo}</label>
      <TextoVivo
        valor={valor}
        linhas={linhas}
        desabilitado={desabilitado}
        placeholder={placeholder}
        atraso={atraso}
        salvar={(v) => {
          salvar(v);
          setSalvo((n) => n + 1);
        }}
      />
      <div className="rodape" style={{ minHeight: 22 }}>
        {desabilitado ? (
          <span className="n-I">trancado pelo mestre</span>
        ) : salvo > 0 ? (
          <span key={salvo} className="anim-selo-carimbo">
            <Selo tipo="feito">
              <Icone id="visto" tamanho={12} /> salvo
            </Selo>
          </span>
        ) : (
          <span className="n-I">salva sozinho enquanto você escreve</span>
        )}
      </div>
    </div>
  );
}

/** Quanto da ficha de registro cada pessoa já preencheu. */
export function progresso(c: Conteudo, p: Personagem | undefined, pr: Privado | undefined) {
  const origem = p?.classe ? comoLista<string>(p.origem?.[p.classe]).filter((x) => x && String(x).trim()).length : 0;
  const itens: [string, boolean][] = [
    ["país", !!p?.pais],
    ["papel", !!p?.papel],
    ["comunidade", !!p?.comunidade],
    ["classe", !!p?.classe],
    [`origem ${origem}/3`, origem >= 3],
    ["compulsão", !!p?.compulsao?.trim()],
    ["oculto", !!p?.oculto?.trim()],
    ["segredo", !!pr?.segredo?.trim()],
  ];
  return { itens, feitos: itens.filter((i) => i[1]).length, total: itens.length };
}

export const normalizar = (s: string) =>
  s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[.!;,]+$/, "").replace(/\s+/g, " ");
