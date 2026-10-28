// A casca da sala: mapa em tela cheia (camada 0), véu, HUD, a janela da etapa,
// as notificações e, para o mestre, a Mesa do Mestre. Guiada pelo mestre: quando ele muda
// de capítulo, todo mundo vai junto; capítulos passados podem ser relidos pela lista do HUD.
import { Component, createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import "../jogo/jogo.css";
import "../jogo/jogo-ajustes.css";
import "./mesa.css";
import { useSessao } from "../db/sala";
import { ETAPAS, ROMANOS, type MapaId } from "../db/tipos";
import { HUD, Janela, ProvedorNotificacoes, useNotificar, type PassoHUD, type Tripulante } from "../jogo/componentes";
import { Icone } from "../jogo/icones";
import { BotaoAmbiente, FundoVivo } from "../jogo/FundoVivo";
import { MapaFundo, ProvedorMapa } from "./MapaFundo";
import { MesaMestre } from "./MesaMestre";
import { Chegada } from "./etapas/Chegada";
import { Convite } from "./etapas/Convite";
import { Protocolo } from "./etapas/Protocolo";
import { Continente } from "./etapas/Continente";
import { Ficha } from "./etapas/Ficha";
import { Exposicao } from "./etapas/Exposicao";
import { Lacos } from "./etapas/Lacos";
import { Fecho } from "./etapas/Fecho";

// "ver como jogador": o mestre esconde tudo que é dele
const VisaoCtx = createContext<{ mestre: boolean; abrirMesa: (aba?: string) => void; programa: boolean; setPrograma: (v: boolean) => void }>({ mestre: false, abrirMesa: () => {}, programa: false, setPrograma: () => {} });
export const useVisao = () => useContext(VisaoCtx);

class Protecao extends Component<{ children: ReactNode; chave: number }, { erro: Error | null }> {
  state = { erro: null as Error | null };
  static getDerivedStateFromError(erro: Error) {
    return { erro };
  }
  componentDidUpdate(prev: { chave: number }) {
    if (prev.chave !== this.props.chave && this.state.erro) this.setState({ erro: null });
  }
  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div className="janela-principal">
        <Janela tipo="leve">
          <div className="n-S">Algo deu errado neste capítulo.</div>
          <p className="n-I">{this.state.erro.message}</p>
          <button className="link" onClick={() => location.reload()}>
            recarregar a página
          </button>
        </Janela>
      </div>
    );
  }
}

export function Casca({ escolher, naoSouEu }: { escolher: (jid: string) => Promise<void>; naoSouEu: () => Promise<void> }) {
  const s = useSessao();
  const { sala, mestre, meuJid, conteudo } = s;
  const etapaAtual = sala.meta.etapaAtual ?? 0;
  const [vendo, setVendo] = useState(etapaAtual);
  const [lista, setLista] = useState(false);
  const [releituraFechada, setReleituraFechada] = useState<string | null>(null);
  const [mesaAberta, setMesaAberta] = useState(true);
  const [abaMesa, setAbaMesa] = useState("conducao");
  const [comoJogador, setComoJogador] = useState(false);
  // o programa da noite (Cap. V) é uma janela lateral; o botão fica no HUD
  const [programa, setPrograma] = useState(false);
  const refCap = useRef<HTMLSpanElement>(null);
  const refVez = useRef<HTMLSpanElement>(null);

  useEffect(() => setVendo(etapaAtual), [etapaAtual]);

  const etapas = sala.meta.etapas || {};
  // capítulo que a mesa já passou (ou o atual) sempre pode ser relido, mesmo que o mestre tenha pulado etapas
  const aberta = (n: number) => mestre || n === 0 || n <= etapaAtual || !!etapas[n]?.aberta;
  const semNome = !mestre && !meuJid;
  const visivel = semNome ? 0 : aberta(vendo) ? vendo : etapaAtual;
  const mestreVisivel = mestre && !comoJogador;
  const trancada = !!etapas[visivel]?.trancada && !mestre;
  const [mapaOrigem, setMapaOrigem] = useState<MapaId>("continente");
  const mapa = visivel === 5 ? "rouillac" : visivel === 4 ? mapaOrigem : "continente";
  // só os capítulos de mapa (III e V) têm mapa; o resto é tela de gestão, a janela usa a largura toda
  const telaMapa = !semNome && (visivel === 4 || visivel === 5);
  const vezJid = sala.builder?.vezJid || null;

  // objetivo do HUD, por capítulo e papel
  const obj = conteudo.objetivos[String(visivel)] || {};
  const nomeVez = vezJid ? sala.jogadores[vezJid]?.nome || "alguém" : "alguém";
  let objetivo = semNome
    ? "Escolha o seu nome para entrar"
    : mestreVisivel
      ? obj.mestre || ""
      : visivel === 5 && vezJid && vezJid === meuJid
        ? obj.vez || obj.jogador || ""
        : obj.jogador || "";
  objetivo = objetivo.replace("{vez}", nomeVez);
  if (visivel === 5 && !sala.builder?.iniciado) objetivo = mestreVisivel ? "Prepare a ordem e comece as rodadas na Mesa" : "Espere o mestre preparar as rodadas";

  const tripulacao: Tripulante[] = Object.entries(sala.jogadores)
    .sort((a, b) => (a[1].ordem ?? 0) - (b[1].ordem ?? 0))
    .map(([jid, j]) => {
      const p = sala.personagens[jid] || {};
      return {
        id: jid,
        nome: jid === meuJid ? `${j.nome} (você)` : j.nome,
        cor: j.cor,
        online: !!j.online,
        papel: p.papel === "outro" ? p.papelOutro || "outro" : conteudo.origens.find((o) => o.id === p.papel)?.nome,
        classe: conteudo.classes.find((c) => c.id === p.classe)?.nome,
      };
    });

  // o caminho da noite no HUD: clicar num capítulo já aberto volta a ele (e ao mapa dele)
  const passos: PassoHUD[] | undefined = semNome
    ? undefined
    : ETAPAS.map((e) => {
        const pode = aberta(e.n);
        const estado = !pode ? "fechado" : e.n === etapaAtual ? "mesa" : e.n < etapaAtual ? "feito" : "aberto";
        const nome = `${e.n === 0 ? "Prólogo" : `Capítulo ${ROMANOS[e.n]}`} · ${e.nome}`;
        const dica = !pode
          ? "O mestre ainda não abriu este capítulo."
          : e.n === etapaAtual
            ? e.n === visivel
              ? "A mesa está aqui, agora."
              : "A mesa está aqui. Clique para voltar."
            : e.n === visivel
              ? "Você está relendo este capítulo."
              : e.n < etapaAtual
                ? "Já passou. Clique para rever."
                : "O mestre já liberou. Clique para espiar.";
        return { n: e.n, nome, icone: `cap-${e.n === 3 ? 4 : e.n === 4 ? 3 : e.n}`, estado, vendo: e.n === visivel, dica } as PassoHUD;
      });

  const abrirMesa = (aba?: string) => {
    if (aba) setAbaMesa(aba);
    setMesaAberta(true);
    setComoJogador(false);
  };

  return (
    <VisaoCtx.Provider value={{ mestre: mestreVisivel, abrirMesa, programa, setPrograma }}>
      <div className="jogo mesa-raiz" data-paleta="ardosia" data-tela={telaMapa ? "mapa" : "gestao"} style={{ ["--mesa-w" as string]: mestreVisivel && mesaAberta ? "var(--mesa-larg)" : "0px" }}>
        <ProvedorNotificacoes>
          <ProvedorMapa>
            {telaMapa ? <MapaFundo key={mapa} mapa={mapa} /> : <div className="fundo-gestao" aria-hidden="true" />}
            <FundoVivo ativo={!telaMapa} />
            <div className="hud-fixo">
              <HUD
                capitulo={ROMANOS[visivel] || "·"}
                nomeCapitulo={ETAPAS[visivel].nome}
                objetivo={objetivo}
                tripulacao={tripulacao}
                vez={visivel === 5 ? vezJid : null}
                mestre={mestre}
                aoAbrirCapitulos={() => !semNome && setLista(!lista)}
                passos={passos}
                aoPasso={(n) => {
                  setVendo(n);
                  setLista(false);
                }}
                aoMesa={() => (mestreVisivel ? setMesaAberta(!mesaAberta) : abrirMesa())}
                refCapitulo={refCap}
                refVez={refVez}
                extra={
                  <>
                    {meuJid && (
                      <button className="link pequeno-link" onClick={naoSouEu} title="liberar este nome">
                        não sou eu
                      </button>
                    )}
                    {!s.conectado && <span className="selo privado">reconectando…</span>}
                    <BotaoAmbiente />
                    {visivel === 5 && !semNome && sala.builder?.iniciado && (
                      <button className={`btn-hud ${programa ? "ligado" : ""}`} onClick={() => setPrograma(!programa)} title="O programa da noite">
                        <Icone id="memoria" tamanho={16} />
                        Programa · {Object.keys(sala.builder.respostas || {}).length}
                      </button>
                    )}
                    {s.b.tipo === "local" && (
                      <span className="selo-local" title="Sem Firebase, só as abas deste navegador ficam sincronizadas. Bom para ensaiar; para a sessão, configure o Firebase (README).">
                        modo local
                      </span>
                    )}
                  </>
                }
              />
            </div>

            {lista && (
              <div className="lista-capitulos-fixa" onMouseLeave={() => setLista(false)}>
                <Janela tipo="leve" className="lista-capitulos">
                  {ETAPAS.map((e) => {
                    const pode = aberta(e.n);
                    return (
                      <button
                        key={e.n}
                        disabled={!pode}
                        className={e.n === etapaAtual ? "atual" : ""}
                        onClick={() => {
                          setVendo(e.n);
                          setLista(false);
                        }}
                      >
                        <Icone id={pode ? `cap-${e.n}` : "cadeado"} tamanho={20} />
                        <span className="n-L" style={{ width: 28, color: "inherit" }}>
                          {e.n === 0 ? "·" : ROMANOS[e.n]}
                        </span>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: 15 }}>{e.nome}</span>
                      </button>
                    );
                  })}
                </Janela>
              </div>
            )}

            {visivel !== etapaAtual && !semNome && releituraFechada !== `${visivel}:${etapaAtual}` && (
              <div className="aviso-releitura">
                Você está relendo o Capítulo {ROMANOS[visivel]}. A mesa está no Capítulo {ROMANOS[etapaAtual]}.
                <button className="link" onClick={() => setVendo(etapaAtual)}>
                  voltar para a mesa
                </button>
                <button type="button" className="releitura-fechar" aria-label="Fechar aviso de releitura" onClick={() => setReleituraFechada(`${visivel}:${etapaAtual}`)}>×</button>
              </div>
            )}

            <div className="camada-janelas">
              <Protecao chave={visivel}>
                {semNome ? <Chegada escolher={escolher} /> : <EtapaN n={visivel} trancada={trancada} mapaOrigem={mapaOrigem} setMapaOrigem={setMapaOrigem} />}
              </Protecao>
            </div>

            {mestre && (
              <MesaMestre
                aberta={mestreVisivel && mesaAberta}
                aba={abaMesa}
                setAba={setAbaMesa}
                fechar={() => setMesaAberta(false)}
                comoJogador={comoJogador}
                setComoJogador={setComoJogador}
                vendo={visivel}
              />
            )}
            <Eventos refCap={refCap} refVez={refVez} />
          </ProvedorMapa>
        </ProvedorNotificacoes>
      </div>
    </VisaoCtx.Provider>
  );
}

function EtapaN({ n, trancada, mapaOrigem, setMapaOrigem }: { n: number; trancada: boolean; mapaOrigem: MapaId; setMapaOrigem: (mapa: MapaId) => void }) {
  switch (n) {
    case 0:
      return <Chegada />;
    case 1:
      return <Convite trancada={trancada} />;
    case 2:
      return <Protocolo trancada={trancada} />;
    case 3:
      return <Ficha trancada={trancada} />;
    case 4:
      return <Continente trancada={trancada} mapa={mapaOrigem} setMapa={setMapaOrigem} />;
    case 5:
      return <Exposicao trancada={trancada} />;
    case 6:
      return <Lacos trancada={trancada} />;
    case 7:
      return <Fecho />;
  }
  return null;
}

function reiniciar(el: Element | null, classe: string) {
  if (!el) return;
  el.classList.remove(classe);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(classe);
}

// Notificações de evento: comparam o estado novo com o anterior
function Eventos({ refCap, refVez }: { refCap: React.RefObject<HTMLSpanElement>; refVez: React.RefObject<HTMLSpanElement> }) {
  const { sala, meuJid, carregada, mestre } = useSessao();
  const notificar = useNotificar();
  const antes = useRef<{ etapa?: number; vez?: string | null; pins: Set<string>; resp: number } | null>(null);
  useEffect(() => {
    if (!carregada) return;
    const pins = new Set<string>();
    for (const m of ["continente", "rouillac"] as const) for (const pid of Object.keys(sala.pins[m] || {})) pins.add(`${m}/${pid}`);
    const agora = { etapa: sala.meta.etapaAtual, vez: sala.builder?.vezJid ?? null, pins, resp: Object.keys(sala.builder?.respostas || {}).length };
    const a = antes.current;
    antes.current = agora;
    if (!a) return;
    if (agora.etapa !== a.etapa && agora.etapa != null) {
      reiniciar(refCap.current, "anim-cap-brilha");
      if (!mestre) notificar(`cap-${agora.etapa}`, <>O mestre abriu o Capítulo {ROMANOS[agora.etapa]}</>);
    }
    if (agora.vez && agora.vez !== a.vez) {
      window.setTimeout(() => reiniciar(refVez.current, "anim-vez"), 50);
      notificar("rolar", agora.vez === meuJid ? <>É a sua vez</> : <>Vez de {sala.jogadores[agora.vez]?.nome || "alguém"}</>);
    }
    for (const chave of pins) {
      if (a.pins.has(chave)) continue;
      const [m, pid] = chave.split("/") as ["continente" | "rouillac", string];
      const p = sala.pins[m]?.[pid];
      if (!p || p.autor === meuJid || (mestre && p.autor === "mestre")) continue;
      const quem = p.autor === "mestre" ? "O mestre" : sala.jogadores[p.autor]?.nome || "Alguém";
      notificar(p.tipo, (
        <>
          {quem} fixou um alfinete: <em>{p.titulo}</em>
        </>
      ));
    }
    if (agora.resp > a.resp) notificar("cap-5", <>Uma nova atração entrou no programa (Nº {agora.resp})</>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sala, carregada]);
  return null;
}
