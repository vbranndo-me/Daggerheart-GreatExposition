// Capítulo VI · Laços. Tela de gestão em três colunas: perguntar (à esquerda), o diagrama
// (no centro) e a caixa de entrada (à direita). Cada laço é uma linha na cor de quem perguntou:
// tracejada enquanto espera resposta, cheia depois de respondida.
import { useState } from "react";
import { useSessao } from "../../db/sala";
import { Placa, Ramo, Selo } from "../../jogo/componentes";
import { Icone } from "../../jogo/icones";
import { Escrita, Gestao, Painel } from "../pecas";
import { useVisao } from "../Casca";

export function Lacos({ trancada }: { trancada: boolean }) {
  const { sala, conteudo: c, meuJid, acoes } = useSessao();
  const { mestre } = useVisao();
  const [foco, setFoco] = useState<string | null>(null);
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
  const focado = foco ? sala.lacos[foco] : null;
  const nome = (j: string) => sala.jogadores[j]?.nome || "alguém";
  const jaFeita = (q: string, j: string) => fiz.some(([, l]) => l.pergunta === q && l.para === j);

  const enviar = async () => {
    if (!eu || !pergunta || !para) return;
    await acoes.criarLaco({ de: eu, para, pergunta });
    setPara(null);
  };

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
                  <span className="retrato" style={{ background: `radial-gradient(circle at 45% 40%, ${x.cor}, #161a26 120%)` }}>
                    {x.nome.slice(0, 1)}
                  </span>
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
            {minhaClasse.conexao.map((q) => {
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
                  aberto={aberto}
                  aoClicar={() => {
                    setPergunta(aberto ? null : q);
                    setPara(null);
                  }}
                >
                  <div className="linha-enviar">
                    <span className="n-L">para quem?</span>
                    <Placa disabled={!para || trancada} onClick={enviar}>
                      Enviar pergunta
                    </Placa>
                  </div>
                  <div className="retratos-para" role="radiogroup" aria-label="destinatário">
                    {lista
                      .filter(([j]) => j !== eu)
                      .map(([j, x]) => {
                        const feita = jaFeita(q, j);
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
                            <span className="retrato" style={{ background: `radial-gradient(circle at 45% 40%, ${x.cor}, #161a26 120%)` }}>
                              {x.nome.slice(0, 1)}
                            </span>
                            <span className="n-L">{x.nome}</span>
                            {feita && <span className="n-I">feita</span>}
                          </button>
                        );
                      })}
                  </div>
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
        <Diagrama foco={foco} setFoco={setFoco} />
        <div className="legenda-lacos n-I">
          <span>
            <i className="tracejado" /> esperando resposta
          </span>
          <span>
            <i className="cheio" /> respondida
          </span>
        </div>
        <div className="laco-focado" aria-live="polite">
          <Icone id="info" tamanho={20} />
          {focado ? (
            <div>
              <div className="n-L">
                {nome(focado.de)} → {nome(focado.para)}
              </div>
              <p className="n-contexto" style={{ margin: "2px 0 4px" }}>
                {focado.pergunta}
              </p>
              {focado.resposta ? (
                <p className="n-J" style={{ ["--autor" as string]: sala.jogadores[focado.para]?.cor, margin: 0 }}>
                  {focado.resposta}
                </p>
              ) : (
                <p className="n-I" style={{ margin: 0 }}>
                  Sem resposta ainda.
                </p>
              )}
            </div>
          ) : (
            <p className="n-I" style={{ margin: 0 }}>
              Passe o mouse (ou toque) numa linha para ler o laço.
            </p>
          )}
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
    </Gestao>
  );
}

function Diagrama({ foco, setFoco }: { foco: string | null; setFoco: (l: string | null) => void }) {
  const { sala } = useSessao();
  const lista = Object.entries(sala.jogadores).sort((a, b) => (a[1].ordem ?? 0) - (b[1].ordem ?? 0));
  const n = lista.length || 1;
  const C = 200;
  const R = n === 1 ? 0 : 124;
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
    <svg viewBox="0 10 400 380" className={`diagrama-lacos ${foco ? "tem-foco" : ""}`} role="img" aria-label="diagrama de laços">
      <defs>
        <radialGradient id="laco-brilho" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e8b866" stopOpacity=".16" />
          <stop offset="100%" stopColor="#e8b866" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={C} cy={C} r="190" fill="url(#laco-brilho)" />
      <g className="laco-relogio" aria-hidden="true">
        <circle cx={C} cy={C} r="178" fill="none" stroke="var(--brass-dark)" strokeWidth=".8" strokeDasharray="1 7" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * Math.PI) / 6;
          return <line key={i} x1={C + 170 * Math.cos(a)} y1={C + 170 * Math.sin(a)} x2={C + 178 * Math.cos(a)} y2={C + 178 * Math.sin(a)} stroke="var(--brass)" strokeWidth="1" opacity=".55" />;
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
          <g key={lid} className={`laco ${foco === lid ? "foco" : ""}`} style={{ ["--i" as string]: i }} onMouseEnter={() => setFoco(lid)} onMouseLeave={() => setFoco(null)} onClick={() => setFoco(foco === lid ? null : lid)}>
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
            <circle cx={x} cy={y} r="31" fill="#0c0f17" stroke="var(--brass)" strokeWidth="1.5" />
            <circle cx={x} cy={y} r="27" fill={j.cor} />
            <circle cx={x - 8} cy={y - 9} r="8" fill="#fff" opacity=".28" />
            <text x={x} y={y + 8} textAnchor="middle" fontFamily="var(--font-display)" fontSize="24" fontWeight="700" fill="#0e1213">
              {j.nome.slice(0, 1)}
            </text>
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
