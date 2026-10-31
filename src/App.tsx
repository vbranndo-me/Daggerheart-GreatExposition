import { useEffect, useState } from "react";
import { carregarConteudo, type Conteudo } from "./conteudo";
import { SessaoCtx, useCarregarSessao, novaSalaId, novaChaveMestre } from "./db/sala";
import { modoLocalForcado } from "./db/backend";
import { lerSalasSalvas, registrarSala, apagarSalaSalva, linkMestre, type SalaSalva } from "./db/salasSalvas";
import { firebaseConfigurado } from "./firebase-config";
import { Kit } from "./jogo/Kit";
import { Arquivo, type RotaArquivo } from "./arquivo/Arquivo";
import { Criador, PortaoIdentidade } from "./arquivo/Criador";
import { Casca } from "./mesa/Casca";
import { Cabecalho, Janela, SeloExposicao } from "./jogo/componentes";
import { BotaoHextech } from "./jogo/hextech";
import "./jogo/jogo.css";
import "./jogo/jogo-ajustes.css";
import "./mesa/mesa.css";

// ---------- rota (hash) ----------
/** "#/arquivo/classe/<id>" é a ficha de uma classe; o resto é capítulo e seção. */
function rotaArquivo(a: string | undefined, b: string | undefined, rascunho: boolean, prefixo: string, salaId: string | null): RotaArquivo {
  if (a === "classe") return { cap: null, secao: null, classe: b || null, rascunho, prefixo, salaId };
  return { cap: a || null, secao: b || null, classe: null, rascunho, prefixo, salaId };
}
function lerRota() {
  const h = location.hash.replace(/^#/, "");
  const vazio = { salaId: null as string | null, chave: null as string | null, kit: false, arquivo: null as RotaArquivo | null, criador: false };
  if (h.startsWith("/kit")) return { ...vazio, kit: true };
  const [caminho, query = ""] = h.split("?");
  const q = new URLSearchParams(query);
  const rascunho = q.has("rascunho");
  // o criador de personagem: com sala (#/s/<sala>/criador) ou sem (só explica como entrar)
  if (/^\/arquivo\/criador\/?$/.test(caminho)) return { ...vazio, criador: true };
  const sc = caminho.match(/^\/s\/([A-Za-z0-9_-]+)\/criador\/?$/);
  if (sc) return { ...vazio, salaId: sc[1], chave: q.get("m"), criador: true };
  // o Arquivo, com sala (a pessoa se identifica e pode escolher) ou sem (só leitura)
  const sa = caminho.match(/^\/s\/([A-Za-z0-9_-]+)\/arquivo(?:\/([\w-]+))?(?:\/([\w-]+))?/);
  if (sa) return { ...vazio, salaId: sa[1], chave: q.get("m"), arquivo: rotaArquivo(sa[2], sa[3], rascunho, `#/s/${sa[1]}/arquivo`, sa[1]) };
  const arq = caminho.match(/^\/arquivo(?:\/([\w-]+))?(?:\/([\w-]+))?/);
  if (arq) return { ...vazio, arquivo: rotaArquivo(arq[1], arq[2], rascunho, "#/arquivo", null) };
  const m = caminho.match(/^\/s\/([A-Za-z0-9_-]+)/);
  return { ...vazio, salaId: m ? m[1] : null, chave: q.get("m") };
}
function useRota() {
  const [r, setR] = useState(lerRota);
  useEffect(() => {
    const f = () => setR(lerRota());
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  return r;
}
export function linkSala(salaId: string, chave?: string | null) {
  const base = location.href.split("#")[0];
  const local = modoLocalForcado() ? (chave ? "&local" : "?local") : "";
  return `${base}#/s/${salaId}${chave ? `?m=${chave}` : ""}${local}`;
}

export default function App() {
  const [conteudo, setConteudo] = useState<Conteudo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const rota = useRota();
  useEffect(() => {
    carregarConteudo().then(setConteudo, (e) => setErro(String(e.message || e)));
  }, []);
  if (erro) return <Aviso titulo="Não deu para carregar o conteúdo" texto={erro} />;
  if (rota.kit) return <Kit conteudo={conteudo} />;
  if (rota.criador && !rota.salaId) return <Criador conteudo={conteudo} />;
  if (rota.salaId && (rota.arquivo || rota.criador)) return <SalaExtra key={rota.salaId} salaId={rota.salaId} chave={rota.chave} conteudo={conteudo} arquivo={rota.arquivo} />;
  if (rota.arquivo) return <Arquivo conteudo={conteudo} rota={rota.arquivo} />;
  if (!rota.salaId) return <Inicio conteudo={conteudo} />;
  return <SalaApp key={rota.salaId} salaId={rota.salaId} chave={rota.chave} conteudo={conteudo} />;
}

function FaixaLocal() {
  if (firebaseConfigurado && !modoLocalForcado()) return null;
  return (
    <div className="faixa-local-jogo" role="note" title="Sem Firebase, só as abas deste navegador ficam sincronizadas. Bom para ensaiar; para a sessão, configure o Firebase (README).">
      modo local · só este navegador
    </div>
  );
}

function Aviso({ titulo, texto, detalhe }: { titulo: string; texto?: string; detalhe?: string }) {
  return (
    <div className="jogo entrada-jogo" data-paleta="ardosia">
      <Janela tipo="leve">
        <div className="n-S">{titulo}</div>
        {texto && <p className="n-N" style={{ marginTop: 8 }}>{texto}</p>}
        {detalhe && <p className="n-I">{detalhe}</p>}
      </Janela>
    </div>
  );
}

function Carregando() {
  return (
    <div className="jogo entrada-jogo" data-paleta="ardosia">
      <div className="carregando">
        <SeloExposicao tamanho={56} />
      </div>
    </div>
  );
}

// ---------- página inicial: criar sala ----------
function Inicio({ conteudo }: { conteudo: Conteudo | null }) {
  const [salas, setSalas] = useState<SalaSalva[]>(lerSalasSalvas);
  const [apagando, setApagando] = useState<string | null>(null);
  const criar = () => {
    const id = novaSalaId();
    const chave = novaChaveMestre();
    registrarSala(id, chave);
    location.hash = `#/s/${id}?m=${chave}${modoLocalForcado() ? "&local" : ""}`;
  };
  const apagar = async (s: SalaSalva) => {
    if (!confirm(`Apagar a sala ${s.id}? Os dados dela somem do banco e não dá para desfazer.`)) return;
    setApagando(s.id);
    await apagarSalaSalva(s);
    setApagando(null);
    setSalas(lerSalasSalvas());
  };
  const ordenadas = [...salas].sort((a, b) => b.visitadaEm - a.visitadaEm);
  const quando = (t: number) => new Date(t).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="jogo entrada-jogo" data-paleta="ardosia">
      <Janela tipo="pesada">
        <Cabecalho capitulo={conteudo?.geral.ano || "Exposition Universelle"} titulo={conteudo?.geral.titulo || "Sessão Zero"} contexto={conteudo?.geral.subtitulo} />
        <p className="n-N">
          Jogadores: abram o <strong>link da sala</strong> que o mestre mandou no Discord.
        </p>
        <p className="n-I" style={{ marginTop: 8 }}>
          Mestre: escolha uma das suas salas ou crie uma nova. O link dos jogadores fica na Mesa do Mestre, aba Pessoas.
        </p>
        {ordenadas.length > 0 && (
          <div className="salas-salvas">
            <div className="n-L">Suas salas</div>
            <ul>
              {ordenadas.map((s) => (
                <li key={s.id}>
                  <a className="salas-salvas-abrir" href={linkMestre(s)}>
                    <span className="n-R">{s.id}</span>
                    <span className="n-I">
                      criada {quando(s.criadaEm)} · aberta {quando(s.visitadaEm)}
                      {s.local ? " · local" : ""}
                    </span>
                  </a>
                  <button type="button" className="salas-salvas-apagar" disabled={apagando === s.id} onClick={() => apagar(s)} aria-label={`Apagar a sala ${s.id}`}>
                    {apagando === s.id ? "…" : "Apagar"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 26 }}>
          <BotaoHextech onClick={criar}>Criar sala nova</BotaoHextech>
        </div>
      </Janela>
      <FaixaLocal />
    </div>
  );
}

// ---------- a sala ----------
function SalaApp({ salaId, chave, conteudo }: { salaId: string; chave: string | null; conteudo: Conteudo | null }) {
  const { sessao, erroBackend, escolher, naoSouEu } = useCarregarSessao(salaId, chave, conteudo);
  const souMestre = !!sessao?.mestre;
  // quem entra como mestre deixa a sala na lista da tela inicial
  useEffect(() => {
    if (souMestre && chave) registrarSala(salaId, chave);
  }, [souMestre, salaId, chave]);
  if (erroBackend) return <Aviso titulo="Sem conexão com o banco" texto={erroBackend} detalhe="Confira a configuração do Firebase e se o login anônimo está ligado (README)." />;
  if (!sessao || !sessao.carregada) return <Carregando />;
  return (
    <SessaoCtx.Provider value={sessao}>
      <Casca escolher={escolher} naoSouEu={naoSouEu} />
    </SessaoCtx.Provider>
  );
}

// ---------- o Arquivo e o criador, com sala: a pessoa se identifica sem depender do mestre ----------
function SalaExtra({ salaId, chave, conteudo, arquivo }: { salaId: string; chave: string | null; conteudo: Conteudo | null; arquivo: RotaArquivo | null }) {
  const { sessao, erroBackend, escolher } = useCarregarSessao(salaId, chave, conteudo);
  if (erroBackend) return <Aviso titulo="Sem conexão com o banco" texto={erroBackend} detalhe="Confira a configuração do Firebase e se o login anônimo está ligado (README)." />;
  if (!sessao || !sessao.carregada) return <Carregando />;
  return (
    <SessaoCtx.Provider value={sessao}>
      {arquivo ? <Arquivo conteudo={conteudo} rota={arquivo} /> : <Criador conteudo={conteudo} />}
      {!sessao.mestre && !sessao.meuJid && <PortaoIdentidade escolher={escolher} />}
    </SessaoCtx.Provider>
  );
}
