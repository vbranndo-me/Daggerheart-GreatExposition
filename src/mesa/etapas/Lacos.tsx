// Capítulo VI · Laços. Tela de gestão em três colunas: perguntar (à esquerda), o diagrama
// (no centro) e a caixa de entrada (à direita). Cada laço é uma linha na cor de quem perguntou:
// tracejada enquanto espera resposta, cheia depois de respondida.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSessao } from "../../db/sala";
import { Janela, Placa, Ramo, Selo } from "../../jogo/componentes";
import { Icone } from "../../jogo/icones";
import { Escrita, Gestao, Painel } from "../pecas";
import { BolinhaJogador, BolinhaJogadorSvg } from "../../jogo/BolinhaJogador";
import { useVisao } from "../Casca";

export function Lacos({ trancada }: { trancada: boolean }) {
  const { sala, conteudo: c, meuJid, acoes } = useSessao();
  const { mestre } = useVisao();
  const [foco, setFoco] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [pergunta, setPergunta] = useState<string | null>(null);
  const [para, setPara] = useState<string | null>(null);
  const lista = Object.entries(sala.jogadores).sort((a, b) => (a[1].ordem ?? 0) - (b[1].ordem ?? 0));
  const eu = meuJid;
  const minhaClasse = eu ? c.classes.find((x) => x.id === sala.personagens[eu]?.classe) : null;
  const lacos = Object.entries(sala.lacos || {}).sort((a, b) => a[1].criadoEm - b[1].criadoEm);
  const paraMim = lacos.filter(([, l]) => l.para === eu);
  const pendentes = paraMim.filter(([, l]) => !l.resposta);
  const respondidas = paraMim.filter(([, l]) => l.resposta);
  const fiz = lacos.filter(([, l]) => l.de === eu);
  const nome = (j: string) => sala.jogadores[j]?.nome || "alguém";
  const jaFeita = (q: string, j: string) => fiz.some(([, l]) => l.pergunta === q && l.para === j);

  const [livre, setLivre] = useState("");
  const LIVRE = "__personalizada";
  const enviar = async () => {
    const texto = pergunta === LIVRE ? livre.trim() : pergunta;
    if (!eu || !texto || !para) return;
    await acoes.criarLaco({ de: eu, para, pergunta: texto });
    setPara(null);
    setPergunta(null); // fecha o acordeão; a pergunta desce para o fim da fila
    if (pergunta === LIVRE) setLivre("");
  };

  /** "Para quem?", os retratos e, no canto inferior direito, o botão de enviar. */
  const destinatarios = (q: string) => (
    <div className="laco-envio">
      <span className="n-L">para quem?</span>
      <div className="retratos-para" role="radiogroup" aria-label="destinatário">
        {lista
          .filter(([j]) => j !== eu)
          .map(([j, x]) => {
            const feita = !!q && jaFeita(q, j);
            return (
              <button
                key={j}
                type="button"
                role="radio"
                aria-checked={para === j}
                disabled={feita || trancada}
                className={`retrato-para ${para === j ? "escolhido" : ""}`}
                onClick={() => setPara(para === j ? null : j)}
                title={feita ? `Já perguntado a ${x.nome}` : x.nome}
              >
                <BolinhaJogador cor={x.cor} letra={x.nome.slice(0, 1)} tamanho={38} k={x.ordem ?? 0} />
                <span className="n-L">{x.nome}</span>
                {feita && <span className="n-I">feita</span>}
              </button>
            );
          })}
      </div>
      <div className="laco-envio-rodape">
        <Placa disabled={!para || !q || trancada} onClick={enviar}>
          Enviar pergunta
        </Placa>
      </div>
    </div>
  );

  return (
    <Gestao n={6} titulo="Laços" colunas="minmax(250px, 1fr) minmax(300px, 1.25fr) minmax(250px, 1fr)">
      <Painel titulo={mestre && !eu ? "A tripulação" : "As suas perguntas"}>
        <ol className="laco-passos" aria-label="como funciona">
          <li>
            <b>1</b>
            <span>Escolha uma pergunta da sua classe.</span>
          </li>
          <li>
            <b>2</b>
            <span>Mande a um colega.</span>
          </li>
          <li>
            <b>3</b>
            <span>A resposta vira um laço entre vocês.</span>
          </li>
        </ol>
        {!eu && mestre ? (
          <div className="acompanha">
            {lista.map(([j, x], i) => {
              const fez = lacos.filter(([, l]) => l.de === j);
              const rec = lacos.filter(([, l]) => l.para === j);
              return (
                <div key={j} className="acompanha-linha" style={{ ["--i" as string]: i }}>
                  <BolinhaJogador cor={x.cor} letra={x.nome.slice(0, 1)} tamanho={34} k={i} />
                  <span className="acompanha-nome">
                    <span className="n-R">{x.nome}</span>
                    <span className="n-I">
                      perguntou {fez.length} · respondeu {rec.filter(([, l]) => l.resposta).length} de {rec.length}
                    </span>
                  </span>
                  {rec.length > 0 && rec.every(([, l]) => l.resposta) && <Icone id="visto" tamanho={16} />}
                </div>
              );
            })}
            {!lista.length && <p className="n-I">Ainda não há jogadores cadastrados.</p>}
          </div>
        ) : !eu ? (
          <p className="n-I">Entre com o seu nome para fazer perguntas.</p>
        ) : !minhaClasse ? (
          <p className="n-I">Marque uma classe na Ficha de registro para ver as perguntas de conexão.</p>
        ) : (
          <div className="ramos" style={{ marginTop: 0 }}>
            <Ramo
              titulo="Pergunta personalizada"
              descricao={pergunta === LIVRE ? undefined : "Escreva a sua própria pergunta."}
              icone="escrever"
              estado={trancada ? "bloqueado" : "normal"}
              aberto={pergunta === LIVRE}
              aoClicar={() => {
                setPergunta(pergunta === LIVRE ? null : LIVRE);
                setPara(null);
              }}
            >
              <textarea
                className="laco-livre"
                rows={3}
                value={livre}
                disabled={trancada}
                placeholder="O que você quer perguntar?"
                aria-label="Pergunta personalizada"
                onChange={(e) => setLivre(e.target.value)}
              />
              {destinatarios(livre.trim())}
            </Ramo>
            {[...minhaClasse.conexao.filter((q) => !lista.some(([j]) => jaFeita(q, j))), ...minhaClasse.conexao.filter((q) => lista.some(([j]) => jaFeita(q, j)))].map((q) => {
              const feitas = lista.filter(([j]) => jaFeita(q, j)).map(([j]) => nome(j));
              const aberto = pergunta === q;
              return (
                <Ramo
                  key={q}
                  titulo={q}
                  descricao={feitas.length && !aberto ? `Feita para ${feitas.join(", ")}.` : undefined}
                  chamada={feitas.length ? undefined : "Escolha para quem."}
                  icone="rumor"
                  estado={trancada ? "bloqueado" : feitas.length && !aberto ? "feito" : "normal"}
                  selo={feitas.length && !aberto ? <Selo tipo="feito">pergunta feita</Selo> : undefined}
                  aberto={aberto}
                  aoClicar={() => {
                    setPergunta(aberto ? null : q);
                    setPara(null);
                  }}
                >
                  {destinatarios(q)}
                </Ramo>
              );
            })}
          </div>
        )}
        {fiz.some(([, l]) => !l.resposta) && !trancada && (
          <div className="perguntas-feitas">
            <div className="n-L">esperando resposta</div>
            {fiz
              .filter(([, l]) => !l.resposta)
              .map(([lid, l]) => (
                <div key={lid} className="pergunta-feita" onMouseEnter={() => setFoco(lid)} onMouseLeave={() => setFoco(null)}>
                  <span className="n-I">
                    para <strong style={{ color: "var(--text)" }}>{nome(l.para)}</strong>: <em>{l.pergunta}</em>
                  </span>
                  <button className="link perigo" onClick={() => acoes.apagarLaco(lid)}>
                    desfazer
                  </button>
                </div>
              ))}
          </div>
        )}
        {mestre && <p className="n-I" style={{ marginTop: 12 }}>Mestre: apagar laços fica na Mesa, aba Moderação.</p>}
      </Painel>

      <Painel titulo="O diagrama" className="painel-diagrama">
        <Diagrama foco={foco} setFoco={setFoco} abrir={setAberto} />
        <div className="legenda-lacos n-I">
          <span>
            <i className="tracejado" /> esperando resposta
          </span>
          <span>
            <i className="cheio" /> respondida
          </span>
        </div>
      </Painel>

      <Painel titulo={mestre && !eu ? "Todos os laços" : "Caixa de entrada"} acao={pendentes.length ? <Selo tipo="vez">{pendentes.length === 1 ? "1 pergunta" : `${pendentes.length} perguntas`}</Selo> : undefined}>
        {!eu && mestre ? (
          lacos.length ? (
            lacos.map(([lid, l], i) => (
              <div key={lid} className={`caixa-item ${l.resposta ? "respondida" : "nova"}`} style={{ ["--i" as string]: i }} onMouseEnter={() => setFoco(lid)} onMouseLeave={() => setFoco(null)}>
                <div className="n-L">
                  {nome(l.de)} → {nome(l.para)}
                </div>
                <p className="n-contexto" style={{ margin: "2px 0 4px" }}>
                  {l.pergunta}
                </p>
                {l.resposta ? (
                  <p className="n-J resposta-curta" style={{ ["--autor" as string]: sala.jogadores[l.para]?.cor }}>
                    {l.resposta}
                  </p>
                ) : (
                  <p className="n-I">Esperando resposta…</p>
                )}
              </div>
            ))
          ) : (
            <p className="n-I laco-vazio">Nenhum laço ainda. Quando alguém mandar uma pergunta, ela aparece aqui.</p>
          )
        ) : !eu ? (
          <p className="n-I">Entre com o seu nome para ver as perguntas que te fizeram.</p>
        ) : !paraMim.length ? (
          <p className="n-I laco-vazio">Ninguém te perguntou nada ainda. Quando chegar uma pergunta, ela aparece aqui.</p>
        ) : null}
        {pendentes.map(([lid, l]) => (
          <div key={lid} className="caixa-item nova" onMouseEnter={() => setFoco(lid)} onMouseLeave={() => setFoco(null)}>
            <div className="n-L">{nome(l.de)} te perguntou</div>
            <p className="n-contexto" style={{ margin: "2px 0 6px" }}>
              {l.pergunta}
            </p>
            <Escrita rotulo="sua resposta" valor={l.resposta} salvar={(v) => acoes.responderLaco(lid, v)} desabilitado={trancada} linhas={3} />
          </div>
        ))}
        {respondidas.length > 0 && (
          <>
            <div className="n-L" style={{ margin: "16px 0 6px" }}>
              respondidas
            </div>
            {respondidas.map(([lid, l]) => (
              <div key={lid} className="caixa-item respondida" onMouseEnter={() => setFoco(lid)} onMouseLeave={() => setFoco(null)}>
                <div className="n-I">
                  {nome(l.de)}: <em>{l.pergunta}</em>
                </div>
                <p className="n-J resposta-curta" style={{ ["--autor" as string]: eu ? sala.jogadores[eu]?.cor : undefined }}>
                  {l.resposta}
                </p>
                <Escrita rotulo="editar a resposta" valor={l.resposta} salvar={(v) => acoes.responderLaco(lid, v)} desabilitado={trancada} linhas={2} />
              </div>
            ))}
          </>
        )}
      </Painel>
      {aberto && sala.lacos[aberto] && <ModalLaco lid={aberto} fechar={() => setAberto(null)} />}
    </Gestao>
  );
}

/** O laço aberto: quem perguntou a quem, a pergunta e a resposta. */
function ModalLaco({ lid, fechar }: { lid: string; fechar: () => void }) {
  const { sala } = useSessao();
  const l = sala.lacos[lid];
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [fechar]);
  const de = sala.jogadores[l.de];
  const para = sala.jogadores[l.para];
  const alvo = document.querySelector(".jogo") || document.body;
  return createPortal(
    <div className="laco-modal-veu" onClick={fechar}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="O laço">
        <Janela
          tipo="pesada"
          className="laco-modal"
          animar
          rolar
          topo={
            <button type="button" className="laco-modal-fechar" onClick={fechar} aria-label="Fechar">
              <Icone id="fechar" tamanho={16} />
            </button>
          }
        >
          <div className="laco-modal-pessoas">
            <span>
              <BolinhaJogador cor={de?.cor} letra={(de?.nome || "?").slice(0, 1)} tamanho={60} k={de?.ordem ?? 0} />
              <span className="n-L">{de?.nome}</span>
            </span>
            <span className="laco-modal-fio" style={{ ["--cor" as string]: de?.cor }} aria-hidden="true" />
            <span>
              <BolinhaJogador cor={para?.cor} letra={(para?.nome || "?").slice(0, 1)} tamanho={60} k={para?.ordem ?? 1} />
              <span className="n-L">{para?.nome}</span>
            </span>
          </div>
          <div className="n-L">{de?.nome} perguntou</div>
          <p className="laco-modal-pergunta">{l.pergunta}</p>
          <div className="n-L">{l.resposta ? `${para?.nome} respondeu` : "a resposta"}</div>
          {l.resposta ? (
            <p className="n-J laco-modal-resposta" style={{ ["--autor" as string]: para?.cor }}>
              {l.resposta}
            </p>
          ) : (
            <p className="n-I">Ainda sem resposta.</p>
          )}
        </Janela>
      </div>
    </div>,
    alvo,
  );
}

function Diagrama({ foco, setFoco, abrir }: { foco: string | null; setFoco: (l: string | null) => void; abrir: (l: string) => void }) {
  const { sala } = useSessao();
  const lista = Object.entries(sala.jogadores).sort((a, b) => (a[1].ordem ?? 0) - (b[1].ordem ?? 0));
  const n = lista.length || 1;
  const C = 200;
  const R = n === 1 ? 0 : 150;
  const pos: Record<string, [number, number]> = {};
  lista.forEach(([jid], i) => {
    // com 2 nós eles ficam em lados opostos, na horizontal; com mais, em círculo a partir do topo
    const a = n === 2 ? Math.PI * i : -Math.PI / 2 + (i * 2 * Math.PI) / n;
    pos[jid] = [C + R * Math.cos(a), C + R * Math.sin(a)];
  });
  const lacos = Object.entries(sala.lacos || {}).filter(([, l]) => pos[l.de] && pos[l.para]);
  const pendentesDe: Record<string, number> = {};
  for (const [, l] of lacos) if (!l.resposta) pendentesDe[l.para] = (pendentesDe[l.para] || 0) + 1;
  const ligados = foco && sala.lacos[foco] ? [sala.lacos[foco].de, sala.lacos[foco].para] : [];
  const cont: Record<string, number> = {};
  return (
    <svg viewBox="-12 -12 424 424" className={`diagrama-lacos ${foco ? "tem-foco" : ""}`} role="img" aria-label="diagrama de laços">
      <defs>
        <radialGradient id="laco-brilho" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e8b866" stopOpacity=".16" />
          <stop offset="100%" stopColor="#e8b866" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={C} cy={C} r="212" fill="url(#laco-brilho)" />
      <g className="laco-relogio" aria-hidden="true">
        <circle cx={C} cy={C} r="204" fill="none" stroke="var(--brass-dark)" strokeWidth=".8" strokeDasharray="1 7" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * Math.PI) / 6;
          return <line key={i} x1={C + 196 * Math.cos(a)} y1={C + 196 * Math.sin(a)} x2={C + 204 * Math.cos(a)} y2={C + 204 * Math.sin(a)} stroke="var(--brass)" strokeWidth="1" opacity=".55" />;
        })}
      </g>
      {n > 1 && <circle className="laco-anel" cx={C} cy={C} r={R} fill="none" stroke="var(--brass-dark)" strokeDasharray="2 6" />}
      {lacos.map(([lid, l], i) => {
        const [x1, y1] = pos[l.de];
        const [x2, y2] = pos[l.para];
        const par = [l.de, l.para].sort().join("|");
        const k = (cont[par] = (cont[par] || 0) + 1);
        const curva = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 22 * (l.de < l.para ? 1 : -1);
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const cx = mx + (-dy / len) * curva;
        const cy = my + (dx / len) * curva;
        const d = `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`;
        const cor = sala.jogadores[l.de]?.cor;
        // ponto da curva em t = 1/2
        const jx = (x1 + 2 * cx + x2) / 4;
        const jy = (y1 + 2 * cy + y2) / 4;
        return (
          <g key={lid} role="button" aria-label={`Laço de ${sala.jogadores[l.de]?.nome} para ${sala.jogadores[l.para]?.nome}`} className={`laco ${foco === lid ? "foco" : ""}`} style={{ ["--i" as string]: i, ["--brilho" as string]: cor }} onMouseEnter={() => setFoco(lid)} onMouseLeave={() => setFoco(null)} onClick={() => abrir(lid)}>
            <path d={d} className="area-laco" />
            <path d={d} pathLength={l.resposta ? 1 : undefined} className={`linha-laco ${l.resposta ? "desenha" : "espera"} ${foco === lid ? "foco" : ""}`} stroke={cor} />
            {l.resposta ? (
              <path className="joia-laco" d={`M${jx},${jy - 6} L${jx + 5},${jy} L${jx},${jy + 6} L${jx - 5},${jy} Z`} fill={cor} stroke="#0c0f17" strokeWidth="1.5" />
            ) : (
              <circle className="fagulha" r="3.2" fill={cor}>
                <animateMotion dur="3.4s" repeatCount="indefinite" path={d} />
              </circle>
            )}
          </g>
        );
      })}
      {lista.map(([jid, j], i) => {
        const [x, y] = pos[jid];
        const abaixo = y > C + 4 || n === 1;
        const pend = pendentesDe[jid] || 0;
        return (
          <g key={jid} pointerEvents="none" className={`no-laco ${ligados.includes(jid) ? "ligado" : ""}`} style={{ ["--i" as string]: i }}>
            {pend > 0 && <circle className="no-halo" cx={x} cy={y} r="31" fill="none" stroke="var(--gaslight)" strokeWidth="2" />}
            <BolinhaJogadorSvg x={x} y={y} r={30} cor={j.cor} letra={j.nome.slice(0, 1)} k={i} aceso={ligados.includes(jid)} />
            <text x={x} y={abaixo ? y + 54 : y - 40} textAnchor="middle" fontFamily="var(--font-display)" fontSize="17" fill="var(--text)" stroke="#0c0f17" strokeWidth="3" paintOrder="stroke">
              {j.nome}
            </text>
            {pend > 0 && (
              <g>
                <circle cx={x + 24} cy={y - 24} r="9" fill="var(--gaslight)" stroke="#0c0f17" strokeWidth="1.5" />
                <text x={x + 24} y={y - 20} textAnchor="middle" fontFamily="var(--font-ui)" fontSize="12" fontWeight="700" fill="#1a1408">
                  {pend}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
