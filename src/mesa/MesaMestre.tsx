// A Mesa do Mestre: gaveta à direita, em feltro verde-garrafa com acento vermelho-lacre.
// Abas: Condução · Pessoas · Dados · Moderação · Sala · Exportar. A noite inteira se conduz
// pela aba Condução; o resto é para moderar e preparar.
import { useState, type ReactNode } from "react";
import { useSessao, CORES_JOGADORES } from "../db/sala";
import { comoLista } from "../db/backend";
import { ETAPAS, ROMANOS } from "../db/tipos";
import { perguntaBuilder } from "../conteudo";
import { BotaoHextech } from "../jogo/hextech";
import { Icone } from "../jogo/icones";
import { useNotificar } from "../jogo/componentes";
import { TextoVivo, copiar } from "../components/ui";
import { linkSala } from "../App";
import { progresso } from "./pecas";
import { baixar, gerarMarkdown } from "../exportar/relatorio";
import { renderizarMapa } from "../exportar/png";
import { gerarPacoteFoundry } from "../exportar/foundry";
import { localizadorDePaises } from "../geo";

const ABAS = [
  ["conducao", "Condução"],
  ["pessoas", "Pessoas"],
  ["dados", "Dados"],
  ["moderacao", "Moderação"],
  ["sala", "Sala"],
  ["exportar", "Exportar"],
] as const;

function Confirmar({ rotulo, confirmar, aoConfirmar, perigo = true }: { rotulo: ReactNode; confirmar?: ReactNode; aoConfirmar: () => void; perigo?: boolean }) {
  const [pedindo, setPedindo] = useState(false);
  return pedindo ? (
    <span className="mesa-linha">
      <button
        className={`btn-gm ${perigo ? "perigo" : ""}`}
        onClick={() => {
          setPedindo(false);
          aoConfirmar();
        }}
      >
        {confirmar || "confirmar"}
      </button>
      <button className="btn-gm" onClick={() => setPedindo(false)}>
        não
      </button>
    </span>
  ) : (
    <button className={`btn-gm ${perigo ? "perigo" : ""}`} onClick={() => setPedindo(true)}>
      {rotulo}
    </button>
  );
}

export function MesaMestre({
  aberta,
  aba,
  setAba,
  fechar,
  comoJogador,
  setComoJogador,
}: {
  aberta: boolean;
  aba: string;
  setAba: (a: string) => void;
  fechar: () => void;
  comoJogador: boolean;
  setComoJogador: (v: boolean) => void;
  vendo: number;
}) {
  return (
    <aside className={`mesa-mestre ${aberta ? "aberta" : ""}`} aria-label="Mesa do Mestre" aria-hidden={!aberta}>
      <div className="mesa-cab">
        <Icone id="mesa" tamanho={22} />
        <span className="n-S">Mesa do Mestre</span>
        <button className="icone-btn gm" onClick={fechar} aria-label="fechar a Mesa">
          <Icone id="fechar" tamanho={14} />
        </button>
      </div>
      <nav className="mesa-abas">
        {ABAS.map(([id, r]) => (
          <button key={id} className={`mesa-aba ${aba === id ? "ativa" : ""}`} onClick={() => setAba(id)}>
            {r}
          </button>
        ))}
      </nav>
      <div className="mesa-corpo">
        {aba === "conducao" && <Conducao comoJogador={comoJogador} setComoJogador={setComoJogador} />}
        {aba === "pessoas" && <Pessoas />}
        {aba === "dados" && <Dados />}
        {aba === "moderacao" && <Moderacao />}
        {aba === "sala" && <SalaAba />}
        {aba === "exportar" && <Exportar />}
      </div>
    </aside>
  );
}

// ---------------- Condução ----------------
function Conducao({ comoJogador, setComoJogador }: { comoJogador: boolean; setComoJogador: (v: boolean) => void }) {
  const { sala, acoes } = useSessao();
  const atual = sala.meta.etapaAtual ?? 0;
  const etapas = sala.meta.etapas || {};
  return (
    <>
      <div className="mesa-bloco">
        <span className="n-L">na mesa</span>
        <div className="n-S" style={{ color: "#f0e4d8" }}>
          {atual === 0 ? "Prólogo · " : `Capítulo ${ROMANOS[atual]} · `}
          {ETAPAS[atual].nome}
        </div>
        <div className="mesa-linha" style={{ justifyContent: "space-between" }}>
          <button className="btn-gm" disabled={atual <= 0} onClick={() => acoes.irParaEtapa(atual - 1)}>
            ◂ anterior
          </button>
          <BotaoHextech disabled={atual >= ETAPAS.length - 1} onClick={() => acoes.irParaEtapa(atual + 1)}>
            Próximo capítulo ▸
          </BotaoHextech>
        </div>
        {atual === 1 && (
          <button className={`btn-gm ${sala.meta.conviteAberto ? "" : "ativo"}`} onClick={() => acoes.abrirConvite(!sala.meta.conviteAberto)}>
            {sala.meta.conviteAberto ? "lacrar o convite de novo" : "entregar o convite para todos"}
          </button>
        )}
      </div>

      {(atual === 5 || sala.builder?.iniciado) && <ControleBuilder />}

      <div className="mesa-bloco">
        <span className="n-L">capítulos</span>
        {ETAPAS.map((e) => {
          const est = etapas[e.n] || {};
          return (
            <div key={e.n} className={`mesa-etapa ${e.n === atual ? "atual" : ""}`}>
              <span className="num">{e.n === 0 ? "·" : ROMANOS[e.n]}</span>
              <span>{e.nome}</span>
              {e.n === atual ? (
                <span className="n-L" style={{ color: "#f0c4bd" }}>
                  na mesa
                </span>
              ) : (
                <button className="btn-gm" onClick={() => acoes.irParaEtapa(e.n)} title="abrir e levar a mesa para este capítulo">
                  {est.aberta || e.n === 0 ? "levar a mesa" : "abrir"}
                </button>
              )}
              {e.n > 0 ? (
                <button className={`btn-gm ${est.trancada ? "ativo" : ""}`} onClick={() => acoes.trancarEtapa(e.n, !est.trancada)} title={est.trancada ? "destrancar" : "trancar: os jogadores leem mas não editam"}>
                  <Icone id="cadeado" tamanho={12} />
                </button>
              ) : (
                <span />
              )}
            </div>
          );
        })}
      </div>

      <div className="mesa-bloco">
        <span className="n-L">visão</span>
        <button className={`btn-gm ${comoJogador ? "ativo" : ""}`} onClick={() => setComoJogador(!comoJogador)}>
          {comoJogador ? "voltar à visão de mestre" : "ver como jogador"}
        </button>
        <p className="n-I" style={{ color: "#a9b5a9", fontSize: 12, margin: 0 }}>
          Esconde a Mesa e tudo que é só seu, para você ver a tela como a mesa vê. O botão da Mesa no HUD traz tudo de volta.
        </p>
      </div>
    </>
  );
}

function ControleBuilder() {
  const { sala, conteudo: c, acoes } = useSessao();
  const bld = sala.builder || {};
  const nome = (j?: string | null) => (j ? sala.jogadores[j]?.nome || "alguém" : "—");
  const todos = Object.entries(sala.jogadores)
    .sort((a, b) => (a[1].ordem ?? 0) - (b[1].ordem ?? 0))
    .map(([j]) => j);
  const salva = comoLista<string>(bld.ordem).filter((j) => sala.jogadores[j]);
  const ordem = [...salva, ...todos.filter((j) => !salva.includes(j))];
  const rodadas = bld.rodadas ?? c.geral.rodadasPadrao ?? 3;
  const totais = [...c.builder.categorias].sort((a, b) => a.d4 - b.d4).map((x) => x.perguntas.length);
  const mover = (i: number, d: number) => {
    const o = [...ordem];
    const k = i + d;
    if (k < 0 || k >= o.length) return;
    [o[i], o[k]] = [o[k], o[i]];
    acoes.configurarBuilder(o, rodadas);
  };
  const sortear = () => {
    const o = [...ordem];
    for (let i = o.length - 1; i > 0; i--) {
      const k = Math.floor(Math.random() * (i + 1));
      [o[i], o[k]] = [o[k], o[i]];
    }
    acoes.configurarBuilder(o, rodadas);
  };

  if (!bld.iniciado || bld.terminado) {
    return (
      <div className="mesa-bloco">
        <span className="n-L">{bld.terminado ? "a exposição está montada" : "preparar as rodadas"}</span>
        {ordem.map((j, i) => (
          <div key={j} className="mesa-linha">
            <span className="cabeca-cor" style={{ background: sala.jogadores[j]?.cor }} />
            <span className="cresce">
              {i + 1}. {nome(j)}
            </span>
            <button className="btn-gm" onClick={() => mover(i, -1)} aria-label="subir">
              ↑
            </button>
            <button className="btn-gm" onClick={() => mover(i, 1)} aria-label="descer">
              ↓
            </button>
          </div>
        ))}
        <div className="mesa-linha">
          <button className="btn-gm" onClick={sortear}>
            sortear a ordem
          </button>
          <label className="mesa-linha" style={{ fontFamily: "var(--font-ui)", fontSize: 13 }}>
            rodadas
            <input type="number" min={1} max={8} value={rodadas} onChange={(e) => acoes.configurarBuilder(ordem, Math.max(1, Math.min(8, Number(e.target.value) || 1)))} style={{ width: 56 }} />
          </label>
          <span className="n-I" style={{ color: "#a9b5a9", fontSize: 12 }}>
            = {rodadas * ordem.length} perguntas
          </span>
        </div>
        <button className="btn-gm ativo" disabled={!ordem.length} onClick={() => acoes.iniciarBuilder(ordem, rodadas)}>
          {bld.terminado ? "recomeçar as rodadas" : "começar as rodadas"}
        </button>
      </div>
    );
  }

  const a = bld.atual;
  const { categoria, pergunta } = a ? perguntaBuilder(c, a.cat, a.num) : { categoria: null, pergunta: null };
  return (
    <div className="mesa-bloco">
      <span className="n-L">
        a exposição · rodada {bld.rodada} de {bld.rodadas}
      </span>
      <div className="mesa-linha">
        <span className="cabeca-cor" style={{ background: bld.vezJid ? sala.jogadores[bld.vezJid]?.cor : undefined }} />
        <strong className="cresce">vez de {nome(bld.vezJid)}</strong>
        <Confirmar rotulo="passar a vez" confirmar="passar" perigo={false} aoConfirmar={() => acoes.passarVez(bld)} />
      </div>
      {!a ? (
        <div className="mesa-linha">
          <span className="cresce n-I" style={{ color: "#a9b5a9" }}>
            Esperando {nome(bld.vezJid)} rolar.
          </span>
          <button className="btn-gm" onClick={() => acoes.rolar(bld, totais)}>
            rolar por ela
          </button>
        </div>
      ) : (
        <div className="cartao-dados">
          <span className="n-L" style={{ color: "#d9a49a" }}>
            {categoria?.nome} · {ROMANOS[a.cat]}·{a.num} {a.enviada && "· enviada"}
          </span>
          <em>{pergunta?.texto}</em>
          <div className="n-L" style={{ marginTop: 6 }}>
            resposta (você pode editar)
          </div>
          <div className="escrita">
            <TextoVivo valor={a.texto} salvar={(v) => acoes.digitarBuilder(v)} linhas={3} atraso={350} />
          </div>
          {a.pin && <span className="n-I">alfinete: {sala.pins.rouillac?.[a.pin]?.titulo}</span>}
          <div className="mesa-linha" style={{ marginTop: 6 }}>
            <button className="btn-gm ativo" disabled={!a.texto?.trim()} onClick={() => acoes.aceitarBuilder(bld, (a.texto || "").trim())}>
              aceitar
            </button>
            <Confirmar rotulo="vetar" confirmar="vetar e rolar de novo" aoConfirmar={() => acoes.vetarBuilder(bld)} />
          </div>
        </div>
      )}
      <Confirmar rotulo="zerar o builder" confirmar="zerar: apaga rodadas e programa" aoConfirmar={() => acoes.zerarBuilder()} />
    </div>
  );
}

// ---------------- Pré-criação (o criador de personagem do Arquivo) ----------------
function PreCriacao() {
  const { sala, conteudo, acoes } = useSessao();
  const lista = Object.entries(sala.jogadores).sort((a, b) => (a[1].ordem ?? 0) - (b[1].ordem ?? 0));
  const trancado = !!sala.meta.criadorTrancado;
  const nome = (l: { id: string; nome: string }[], id?: string) => l.find((x) => x.id === id)?.nome;
  return (
    <div className="mesa-bloco">
      <span className="n-L">pré-criação ({lista.filter(([jid]) => sala.personagens[jid]?.criadorPronto).length} de {lista.length} prontos)</span>
      <table className="tabela-pre">
        <thead>
          <tr>
            <th />
            <th>Comunid.</th>
            <th>Ancestr.</th>
            <th>Classe</th>
            <th>Subcl.</th>
          </tr>
        </thead>
        <tbody>
          {lista.map(([jid, j]) => {
            const p = sala.personagens[jid] || {};
            const anc = [p.ancestralidade, p.ancestralidade2].filter(Boolean).join(" + ");
            const classe = p.classeOutra || nome(conteudo.classes, p.classe) || "";
            const cel = (v?: string | null) => (v ? <td>{v}</td> : <td className="falta">falta</td>);
            return (
              <tr key={jid}>
                <th>
                  <span className="cabeca-cor" style={{ background: j.cor }} /> {j.nome}
                  {p.criadorPronto && <Icone id="visto" tamanho={11} />}
                </th>
                {cel(nome(conteudo.comunidades, p.comunidade))}
                {cel(anc)}
                {cel(classe)}
                {cel(p.subclasse)}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mesa-linha">
        <button className={`btn-gm ${trancado ? "ativo" : ""}`} onClick={() => acoes.trancarCriador(!trancado)}>
          {trancado ? "criador trancado · destrancar" : "trancar o criador"}
        </button>
      </div>
    </div>
  );
}

// ---------------- Pessoas ----------------
function Pessoas() {
  const { sala, acoes, salaId, chave } = useSessao();
  const notificar = useNotificar();
  const [novo, setNovo] = useState("");
  const lista = Object.entries(sala.jogadores).sort((a, b) => (a[1].ordem ?? 0) - (b[1].ordem ?? 0));
  const corLivre = CORES_JOGADORES.find((x) => !lista.some(([, j]) => j.cor.toLowerCase() === x.toLowerCase())) || CORES_JOGADORES[lista.length % CORES_JOGADORES.length];
  const linkJog = linkSala(salaId);
  const linkMestre = linkSala(salaId, chave);
  const linkArquivo = `${location.href.split("#")[0]}#/s/${salaId}/arquivo`;
  return (
    <>
      <div className="mesa-bloco">
        <span className="n-L">a tripulação ({lista.length})</span>
        {lista.map(([jid, j]) => (
          <div key={jid} className="mesa-linha">
            <input type="color" value={j.cor} onChange={(e) => acoes.editarJogador(jid, { cor: e.target.value })} style={{ width: 26, height: 26, padding: 0, border: 0, background: "none" }} aria-label={`cor de ${j.nome}`} />
            <input defaultValue={j.nome} className="cresce" onBlur={(e) => e.target.value.trim() && e.target.value !== j.nome && acoes.editarJogador(jid, { nome: e.target.value.trim() })} aria-label="nome" />
            <span className={`presenca-ponto ${j.online ? "on" : ""}`} title={j.online ? "na sala" : "fora"} />
            {j.uid && (
              <button className="btn-gm" onClick={() => acoes.liberarNome(jid)} title="liberar o nome (alguém ficou preso)">
                liberar
              </button>
            )}
            <Confirmar rotulo={<Icone id="fechar" tamanho={10} />} confirmar="remover" aoConfirmar={() => acoes.removerJogador(jid)} />
          </div>
        ))}
        <form
          className="mesa-linha"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!novo.trim()) return;
            await acoes.adicionarJogador(novo.trim(), corLivre, lista.length);
            setNovo("");
          }}
        >
          <span className="cabeca-cor" style={{ background: corLivre }} />
          <input className="cresce" value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="nome do jogador" />
          <button className="btn-gm ativo" disabled={!novo.trim()}>
            cadastrar
          </button>
        </form>
      </div>
      <PreCriacao />
      <div className="mesa-bloco">
        <span className="n-L">link dos jogadores (mande no Discord)</span>
        <div className="mesa-linha">
          <code className="cresce">{linkJog}</code>
          <button className="btn-gm" onClick={async () => notificar("visto", (await copiar(linkJog)) ? "Link dos jogadores copiado." : "Não deu para copiar.")}>
            copiar
          </button>
        </div>
      <div className="mesa-bloco">
        <span className="n-L">link do Arquivo e do criador de personagem (mande ANTES da sessão)</span>
        <div className="mesa-linha">
          <code className="cresce">{linkArquivo}</code>
          <button className="btn-gm" onClick={async () => notificar("visto", (await copiar(linkArquivo)) ? "Link do Arquivo copiado." : "Não deu para copiar.")}>
            copiar
          </button>
        </div>
        <span className="n-I">Quem abrir escolhe o próprio nome, lê o Arquivo e monta o personagem. Não precisa esperar o mestre abrir nenhum capítulo.</span>
      </div>
      </div>
      {chave && (
        <div className="mesa-bloco">
          <span className="n-L">seu link de mestre (não mande para ninguém)</span>
          <div className="mesa-linha">
            <code className="cresce">{linkMestre}</code>
            <button className="btn-gm" onClick={async () => notificar("visto", (await copiar(linkMestre)) ? "Link de mestre copiado." : "Não deu para copiar.")}>
              copiar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------- Dados (só o mestre) ----------------
function Dados() {
  const { sala, conteudo: c } = useSessao();
  const lista = Object.entries(sala.jogadores).sort((a, b) => (a[1].ordem ?? 0) - (b[1].ordem ?? 0));
  return (
    <div className="mesa-bloco">
      <span className="n-L">tudo dos jogadores · só você vê</span>
      {lista.map(([jid, j]) => {
        const p = sala.personagens[jid] || {};
        const pr = sala.privado[jid] || {};
        const prog = progresso(c, p, pr);
        const autorias = Object.keys(pr.seguranca || {})
          .map((iid) => sala.seguranca.itens?.[iid])
          .filter(Boolean);
        return (
          <div key={jid} className="cartao-dados">
            <div className="mesa-linha">
              <span className="cabeca-cor" style={{ background: j.cor }} />
              <strong className="cresce">{j.nome}</strong>
              <span>
                {prog.feitos}/{prog.total}
              </span>
            </div>
            <div className="barra-progresso">
              <span style={{ width: `${(prog.feitos / prog.total) * 100}%` }} />
            </div>
            <div>
              <span className="n-L">segredo </span>
              {pr.segredo || "—"}
            </div>
            <div>
              <span className="n-L">morte </span>
              {c.seguranca.morte.opcoes.find((o) => o.id === pr.morte)?.nome || "—"}
            </div>
            {autorias.length > 0 && (
              <div>
                <span className="n-L">escreveu </span>
                {autorias.map((it) => `${it!.lista === "linha" ? "linha" : "véu"}: ${it!.texto}`).join("; ")}
              </div>
            )}
            <div style={{ color: "#a9b5a9" }}>faltam: {prog.itens.filter((x) => !x[1]).map((x) => x[0]).join(", ") || "nada"}</div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------- Moderação ----------------
function Moderacao() {
  const { sala, conteudo: c, acoes } = useSessao();
  const nome = (a: string) => (a === "mestre" ? "Mestre" : sala.jogadores[a]?.nome || "?");
  const respostas = Object.entries(sala.builder?.respostas || {}).sort((a, b) => a[1].n - b[1].n);
  return (
    <>
      {(["continente", "rouillac"] as const).map((m) => {
        const pins = Object.entries(sala.pins[m] || {});
        return (
          <div key={m} className="mesa-bloco">
            <span className="n-L">
              alfinetes · {m === "continente" ? "continente" : "Rouillac"} ({pins.length})
            </span>
            {pins.map(([pid, p]) => (
              <div key={pid} className="mesa-linha">
                <Icone id={p.tipo} tamanho={14} />
                <span className="cresce">
                  {p.titulo} <span style={{ color: "#a9b5a9" }}>· {nome(p.autor)}</span>
                </span>
                <Confirmar rotulo="apagar" aoConfirmar={() => acoes.apagarPin(m, pid)} />
              </div>
            ))}
          </div>
        );
      })}
      <div className="mesa-bloco">
        <span className="n-L">programa da exposição ({respostas.length})</span>
        {respostas.map(([rid, r]) => (
          <div key={rid} className="cartao-dados">
            <span className="n-L" style={{ color: "#d9a49a" }}>
              Nº {r.n} · {perguntaBuilder(c, r.cat, r.num).categoria?.nome} · {nome(r.jid)}
            </span>
            <div className="escrita">
              <TextoVivo valor={r.texto} salvar={(v) => acoes.editarResposta(rid, v)} linhas={2} />
            </div>
            <Confirmar rotulo="apagar do programa" aoConfirmar={() => acoes.apagarResposta(rid, r)} />
          </div>
        ))}
      </div>
      <div className="mesa-bloco">
        <span className="n-L">laços ({Object.keys(sala.lacos || {}).length})</span>
        {Object.entries(sala.lacos || {}).map(([lid, l]) => (
          <div key={lid} className="mesa-linha">
            <span className="cresce">
              {nome(l.de)} → {nome(l.para)}: <em>{l.pergunta}</em>
            </span>
            <Confirmar rotulo="apagar" aoConfirmar={() => acoes.apagarLaco(lid)} />
          </div>
        ))}
      </div>
    </>
  );
}

// ---------------- Sala ----------------
function SalaAba() {
  const s = useSessao();
  const { acoes, conteudo, salaId, chave, sala } = s;
  const notificar = useNotificar();
  const [apagando, setApagando] = useState(false);
  return (
    <>
      <div className="mesa-bloco">
        <span className="n-L">esta sala</span>
        <div>
          <code>{salaId}</code> · {s.b.tipo === "local" ? "modo local (só este navegador)" : "Firebase"}
          {sala.meta.ensaio && " · ensaio"}
        </div>
      </div>
      <div className="mesa-bloco">
        <span className="n-L">ensaiar</span>
        <Confirmar
          rotulo="criar 5 jogadores de ensaio"
          confirmar="criar"
          perigo={false}
          aoConfirmar={async () => {
            await acoes.modoEnsaio(conteudo);
            notificar("pessoa", "Jogadores de ensaio criados.");
          }}
        />
        <Confirmar
          rotulo="duplicar esta sala para ensaio"
          confirmar="duplicar"
          perigo={false}
          aoConfirmar={async () => {
            if (!chave) return notificar("info", "Precisa do link de mestre para duplicar.");
            const novo = await acoes.duplicarSala(chave);
            location.hash = `#/s/${novo}?m=${chave}${location.hash.includes("local") ? "&local" : ""}`;
          }}
        />
        <button className="btn-gm" onClick={() => (location.hash = "#/")}>
          criar outra sala
        </button>
      </div>
      <div className="mesa-bloco">
        <span className="n-L">apagar</span>
        {!apagando ? (
          <button className="btn-gm perigo" onClick={() => setApagando(true)}>
            apagar esta sala…
          </button>
        ) : (
          <div className="confirmacao">
            <strong>Apagar a sala {salaId}?</strong>
            <span>Apaga tudo o que a mesa criou nesta sala: nomes, alfinetes, fichas, segredos, programa e laços. Não dá para desfazer. Exporte antes se quiser guardar.</span>
            <div className="mesa-linha">
              <button
                className="btn-gm perigo"
                onClick={async () => {
                  await acoes.apagarSala();
                  location.hash = "#/";
                }}
              >
                apagar para sempre
              </button>
              <button className="btn-gm" onClick={() => setApagando(false)}>
                cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ---------------- Exportar ----------------
function Exportar() {
  const { sala, conteudo: c, acoes, salaId } = useSessao();
  const notificar = useNotificar();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const onde = () => localizadorDePaises(c.continente, c.paises);
  const rodar = async (id: string, f: () => Promise<void>) => {
    setOcupado(id);
    try {
      await f();
      notificar("visto", "Arquivo baixado.");
    } catch (e) {
      notificar("info", `Falhou: ${(e as Error).message || e}`);
    } finally {
      setOcupado(null);
    }
  };
  const itens: [string, string, string, () => Promise<void>][] = [
    [
      "json",
      "sessao-zero.json",
      "O estado completo da sala, para o Claude.",
      async () => {
        const tudo = await acoes.lerTudo();
        delete tudo.gmauth;
        baixar(JSON.stringify({ salaId, exportadoEm: new Date().toISOString(), ...tudo }, null, 2), "sessao-zero.json", "application/json");
      },
    ],
    ["md", "sessao-zero.md", "Relatório legível (segredos marcados só mestre).", async () => baixar(gerarMarkdown(sala, c, await onde()), "sessao-zero.md", "text/markdown")],
    [
      "png-c",
      "Continente com alfinetes (PNG)",
      "4096 px, com legenda dos autores.",
      async () => baixar((await renderizarMapa(c.continente, { largura: 4096, pins: Object.values(sala.pins.continente || {}), jogadores: sala.jogadores, legenda: true })).blob, "continente-alfinetes.png"),
    ],
    [
      "png-r",
      "Rouillac com alfinetes (PNG)",
      "4096 px, com legenda dos autores.",
      async () => baixar((await renderizarMapa(c.rouillac, { largura: 4096, pins: Object.values(sala.pins.rouillac || {}), jogadores: sala.jogadores, legenda: true })).blob, "rouillac-alfinetes.png"),
    ],
    ["foundry", "Pacote do Foundry v13 (.zip)", "Diários, mapas sem alfinetes e a macro.", async () => baixar(await gerarPacoteFoundry(sala, c, await onde()), "foundry-sessao-zero.zip", "application/zip")],
  ];
  return (
    <div className="mesa-bloco">
      <span className="n-L">exportar a noite</span>
      {itens.map(([id, titulo, desc, f]) => (
        <button key={id} className="btn-gm exportar" disabled={!!ocupado} onClick={() => rodar(id, f)}>
          <strong>{ocupado === id ? "gerando…" : titulo}</strong>
          <span>{desc}</span>
        </button>
      ))}
      <p className="n-I" style={{ color: "#a9b5a9", fontSize: 12 }}>
        Passo a passo do Foundry no LEIA-ME do zip e no README.
      </p>
    </div>
  );
}
