// Ficha de registro · o fim mecânico do criador: traços, Experiências, equipamento e cartas de domínio.
// Tudo grava no personagem (sala.personagens[jid]); os números derivados são calculados aqui e
// gravados quando o registro é confirmado (veja `calcularDerivados`).
import { useState } from "react";
import type { Equipamento } from "../../conteudo";
import { useSessao } from "../../db/sala";
import { comoLista } from "../../db/backend";
import type { EquipamentoPersonagem } from "../../db/tipos";
import { calcularDerivados, cartasDisponiveis, conjuracaoDe, experienciasDe, opcoesItemClasse, tracosCompletos } from "../../db/regras";
import { Canto, Selo } from "../../jogo/componentes";
import { Icone } from "../../jogo/icones";
import { Markdown, TextoVivo } from "../../components/ui";

const sinal = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");

// ---------- peças comuns ----------

function Folha({ titulo, rotulo, children, lado }: { titulo: string; rotulo: string; children: React.ReactNode; lado?: React.ReactNode }) {
  return (
    <div className={`mec ${lado ? "" : "mec-sem-lado"}`}>
      <section className="mec-folha">
        <Canto pos="tl" />
        <Canto pos="br" />
        <div className="n-L">{rotulo}</div>
        <h2 className="n-S mec-titulo">{titulo}</h2>
        {children}
      </section>
      {lado && <aside className="mec-lado">{lado}</aside>}
    </div>
  );
}

/** A plaqueta com os números da ficha, que acompanha os traços e o equipamento. */
function Numeros({ jid }: { jid: string }) {
  const { sala, conteudo: c } = useSessao();
  const p = sala.personagens[jid] || {};
  const d = calcularDerivados(c, p);
  const itens: [string, string][] = [
    ["Evasão", d.evasao != null ? String(d.evasao) : "—"],
    ["PV", d.pv != null ? String(d.pv) : "—"],
    ["Fadiga", String(d.fadiga)],
    ["Esperança", String(d.esperanca)],
    ["Proficiência", String(d.proficiencia)],
    ["Armadura", d.armadura != null ? String(d.armadura) : "—"],
    ["Limiares", d.limiares ? `${d.limiares.maior} / ${d.limiares.grave}` : "—"],
  ];
  return (
    <div className="mec-numeros">
      <div className="n-L">a ficha, no nível 1</div>
      <dl>
        {itens.map(([k, v]) => (
          <div key={k}>
            <dt className="n-L">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {d.notas?.map((n) => (
        <p key={n} className="n-I">
          {n}
        </p>
      ))}
      {!p.equipamento?.armadura && <p className="n-I">Armadura e limiares aparecem quando você escolher a armadura.</p>}
    </div>
  );
}

// ---------- Traços ----------

export function Tracos({ jid, trancada }: { jid: string; trancada: boolean }) {
  const { sala, conteudo: c, acoes } = useSessao();
  const p = sala.personagens[jid] || {};
  const t = p.tracos || {};
  const { classe, traco: conj } = conjuracaoDe(c, p);
  const [fichaPega, setFicha] = useState<number | null>(null);
  // a bandeja: os valores que ainda não foram encaixados (multiconjunto)
  const bandeja = [...c.criacao.valores];
  for (const x of c.criacao.tracos) {
    const v = t[x.id];
    if (v == null) continue;
    const i = bandeja.indexOf(v);
    if (i >= 0) bandeja.splice(i, 1);
  }
  // a ficha na mão só vale se ainda estiver na bandeja (alguém pode ter mudado os traços)
  const ficha = fichaPega != null && bandeja.includes(fichaPega) ? fichaPega : null;
  const salvar = (novo: Record<string, number | null>) => !trancada && acoes.personagem(jid, { tracos: novo });
  const clicarTraco = (id: string) => {
    if (trancada) return;
    const atual = t[id] ?? null;
    if (ficha != null) {
      // encaixa a ficha; o que estava ali volta para a bandeja
      salvar({ ...t, [id]: ficha });
      setFicha(null);
    } else if (atual != null) {
      salvar({ ...t, [id]: null });
      setFicha(atual);
    }
  };
  const sugestao = classe ? c.criacao.sugestoes[classe.id] : undefined;
  const completo = tracosCompletos(c, t);

  return (
    <Folha
      rotulo="traços"
      titulo="No que você é bom?"
      lado={
        <>
          <Numeros jid={jid} />
          <div className="mec-ajuda">
            <p className="n-I">Escolha uma ficha da bandeja e toque num traço para encaixá-la. Toque num traço preenchido para tirar a ficha de volta.</p>
          </div>
        </>
      }
    >
      <p className="n-N mec-intro">
        Distribua <strong>+2, +1, +1, 0, 0 e −1</strong>, um em cada traço. É o que você soma quando rola os dados.
      </p>
      <div className="mec-bandeja" role="group" aria-label="Fichas para distribuir">
        {bandeja.length ? (
          bandeja.map((v, i) => (
            <button
              key={`${v}-${i}`}
              type="button"
              disabled={trancada}
              className={`mec-ficha ${ficha === v && bandeja.indexOf(v) === i ? "pega" : ""}`}
              onClick={() => setFicha(ficha === v ? null : v)}
              aria-pressed={ficha === v && bandeja.indexOf(v) === i}
            >
              {sinal(v)}
            </button>
          ))
        ) : (
          <span className="mec-bandeja-vazia n-I">
            <Icone id="visto" tamanho={14} /> todas as fichas no lugar
          </span>
        )}
      </div>
      <ol className={`mec-tracos ${ficha != null ? "encaixando" : ""}`}>
        {c.criacao.tracos.map((x) => {
          const v = t[x.id];
          return (
            <li key={x.id} className={`${v != null ? "cheio" : ""} ${conj === x.id ? "conjura" : ""}`}>
              <button type="button" disabled={trancada} onClick={() => clicarTraco(x.id)} title={v != null ? "Tirar a ficha" : ficha != null ? `Encaixar ${sinal(ficha)}` : "Escolha uma ficha primeiro"}>
                <span className="mec-medalha" key={String(v)}>
                  {v != null ? sinal(v) : ""}
                </span>
                <span className="mec-traco-nome">{x.nome}</span>
                <span className="n-I mec-verbos">{x.verbos}</span>
                {conj === x.id && <span className="mec-conjura n-L">é com ele que você conjura</span>}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="mec-acoes">
        {sugestao ? (
          <button type="button" className="link" disabled={trancada} onClick={() => salvar({ ...sugestao })}>
            usar a sugestão de {classe?.nome}
          </button>
        ) : (
          <span className="n-I">{classe ? `${classe.nome} ainda não tem distribuição sugerida.` : "Escolha a classe para ver a sugestão."}</span>
        )}
        <button type="button" className="link" disabled={trancada || !Object.values(t).some((v) => v != null)} onClick={() => salvar({})}>
          recolher todas
        </button>
        {completo && <Selo tipo="feito">traços prontos</Selo>}
      </div>
    </Folha>
  );
}

// ---------- Experiências ----------

export function Experiencias({ jid, trancada }: { jid: string; trancada: boolean }) {
  const { sala, conteudo: c, acoes } = useSessao();
  const p = sala.personagens[jid] || {};
  const exps = experienciasDe(p);
  const salvar = (i: number, texto: string) => {
    if (trancada) return;
    const novo = experienciasDe(sala.personagens[jid] || {}).map((x, k) => (k === i ? { texto, bonus: 2 } : { texto: x.texto || "", bonus: 2 }));
    acoes.personagem(jid, { experiencias: novo });
  };
  // umas 6 a 8 sugestões, misturando classe, país e papel, sem repetir
  const s = c.sugestoesExperiencia;
  const fontes = [s.classe[p.classe || ""] || [], s.pais[p.pais || ""] || [], s.papel[p.papel || ""] || []];
  const sugestoes: string[] = [];
  for (let k = 0; sugestoes.length < 8 && k < 6; k++) for (const f of fontes) if (f[k] && !sugestoes.includes(f[k]) && sugestoes.length < 8) sugestoes.push(f[k]);
  const usar = (txt: string) => {
    const i = exps.findIndex((x) => !x.texto?.trim());
    salvar(i < 0 ? 1 : i, txt);
  };

  return (
    <Folha
      rotulo="experiências"
      titulo="O que a vida te ensinou?"
      lado={
        <div className="mec-ajuda">
          <h3 className="n-L">Como funciona</h3>
          <p className="n-I">Uma Experiência é uma frase curta sobre quem você é ou o que viveu. Quando ela couber na situação, gaste 1 Esperança e some +2 ao teste.</p>
          <h3 className="n-L">Não vale</h3>
          <p className="n-I">Só um traço com outro nome ("Forte", "Esperto") ou um poder mágico.</p>
        </div>
      }
    >
      <div className="mec-experiencias">
        {exps.map((x, i) => (
          <label key={i} className={`mec-exp ${x.texto?.trim() ? "cheia" : ""}`}>
            <span className="mec-exp-num n-L">experiência {i === 0 ? "I" : "II"}</span>
            <TextoVivo valor={x.texto} salvar={(v) => salvar(i, v)} multilinha={false} desabilitado={trancada} placeholder={i === 0 ? "Contrabandista das docas do Ferrum" : "Criado num seminário"} atraso={400} />
            <span className="mec-exp-bonus" aria-label="mais dois">+2</span>
          </label>
        ))}
      </div>
      {sugestoes.length > 0 && (
        <div className="mec-sugestoes">
          <div className="n-L">ideias para você (toque para usar, depois edite à vontade)</div>
          <div className="mec-chips">
            {sugestoes.map((x) => (
              <button key={x} type="button" disabled={trancada || exps.some((e) => e.texto === x)} onClick={() => usar(x)}>
                {x}
              </button>
            ))}
          </div>
        </div>
      )}
    </Folha>
  );
}

// ---------- Equipamento ----------

function Peca({ e, escolhida, aoEscolher, trancada, aviso }: { e: Equipamento; escolhida: boolean; aoEscolher: () => void; trancada: boolean; aviso?: string }) {
  const [nomeCar, ...resto] = (e.caracteristica || "").split(/:\s*/);
  const stats = [e.atributo, e.alcance, e.dano, e.empunhadura, e.limiares && `limiares ${e.limiares}`, e.armadura != null && `Armadura ${e.armadura}`].filter(Boolean) as string[];
  return (
    <button type="button" className={`mec-peca ${escolhida ? "escolhida" : ""}`} aria-pressed={escolhida} disabled={trancada} onClick={aoEscolher}>
      <span className="mec-peca-cab">
        <span className="mec-peca-nome">{e.nome}</span>
        {escolhida && <Icone id="visto" tamanho={14} />}
      </span>
      {e.original && <span className="n-L mec-peca-orig">{e.original}</span>}
      <span className="mec-peca-stats">{stats.join(" · ")}</span>
      {e.caracteristica && (
        <span className="mec-peca-car">
          {resto.length ? (
            <>
              <strong>{nomeCar}:</strong> {resto.join(": ")}
            </>
          ) : (
            e.caracteristica
          )}
        </span>
      )}
      {(e.fogo || e.magica || aviso) && (
        <span className="mec-peca-selos">
          {e.fogo && <span className="mec-etiqueta fogo">arma de fogo · combine com o mestre</span>}
          {e.magica && <span className="mec-etiqueta magica">mágica</span>}
          {aviso && <span className="mec-etiqueta">{aviso}</span>}
        </span>
      )}
    </button>
  );
}

export function EquipamentoPagina({ jid, trancada }: { jid: string; trancada: boolean }) {
  const { sala, conteudo: c, acoes } = useSessao();
  const p = sala.personagens[jid] || {};
  const e: EquipamentoPersonagem = p.equipamento || {};
  const { classe, traco: conj } = conjuracaoDe(c, p);
  const salvar = (mud: Partial<EquipamentoPersonagem>) => !trancada && acoes.personagem(jid, { equipamento: { ...e, kit: c.criacao.kit.fixos, ...mud } });
  const principais = c.equipamento.filter((x) => x.tipo === "arma principal" && (!x.magica || !!conj));
  const principal = c.equipamento.find((x) => x.id === e.principal);
  const umaMao = !principal || /uma mão/i.test(principal.empunhadura || "");
  const secundarias = c.equipamento.filter((x) => x.tipo === "arma secundária");
  const armaduras = c.equipamento.filter((x) => x.tipo === "armadura");
  const itensClasse = opcoesItemClasse(classe);
  const alternar = (campo: keyof EquipamentoPersonagem, id: string) => {
    const mud: Partial<EquipamentoPersonagem> = { [campo]: e[campo] === id ? null : id };
    if (campo === "principal") {
      const nova = c.equipamento.find((x) => x.id === id);
      if (nova && !/uma mão/i.test(nova.empunhadura || "")) mud.secundaria = null; // duas mãos não deixam espaço
    }
    salvar(mud);
  };

  return (
    <Folha rotulo="equipamento" titulo="O que você leva para Rouillac?" lado={<Numeros jid={jid} />}>
      <p className="n-N mec-intro">
        Uma arma principal, uma secundária se a principal for de uma mão, uma armadura, o kit de viagem e uma poção.
        {!conj && classe && " Sua subclasse não conjura, então as armas mágicas ficam de fora."}
      </p>

      <section className="mec-grupo">
        <h3 className="n-L">Arma principal</h3>
        <div className="mec-pecas">
          {principais.map((x) => (
            <Peca key={x.id} e={x} escolhida={e.principal === x.id} trancada={trancada} aoEscolher={() => alternar("principal", x.id)} aviso={x.magica && x.atributo && conj && c.criacao.tracos.find((t) => t.id === conj)?.nome !== x.atributo ? `usa ${x.atributo}` : undefined} />
          ))}
        </div>
      </section>

      <section className={`mec-grupo ${umaMao ? "" : "apagado"}`}>
        <h3 className="n-L">Arma secundária {umaMao ? "(opcional)" : "· sua principal usa as duas mãos"}</h3>
        {umaMao && (
          <div className="mec-pecas">
            {secundarias.map((x) => (
              <Peca key={x.id} e={x} escolhida={e.secundaria === x.id} trancada={trancada} aoEscolher={() => alternar("secundaria", x.id)} />
            ))}
          </div>
        )}
      </section>

      <section className="mec-grupo">
        <h3 className="n-L">Armadura</h3>
        <div className="mec-pecas">
          {armaduras.map((x) => (
            <Peca key={x.id} e={x} escolhida={e.armadura === x.id} trancada={trancada} aoEscolher={() => alternar("armadura", x.id)} />
          ))}
        </div>
      </section>

      <section className="mec-grupo mec-kit">
        <div>
          <h3 className="n-L">O kit de viagem</h3>
          <ul>
            {c.criacao.kit.fixos.map((x) => (
              <li key={x}>
                <Icone id="visto" tamanho={12} /> {x}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="n-L">Uma poção</h3>
          <div className="mec-opcoes">
            {c.criacao.kit.pocoes.map((x) => (
              <button key={x.id} type="button" disabled={trancada} className={e.pocao === x.id ? "escolhida" : ""} aria-pressed={e.pocao === x.id} onClick={() => salvar({ pocao: x.id })}>
                <strong>{x.nome}</strong>
                <span className="n-I">{x.texto}</span>
              </button>
            ))}
          </div>
        </div>
        {itensClasse.length > 0 && (
          <div>
            <h3 className="n-L">Um objeto de {classe?.nome}</h3>
            <div className="mec-opcoes">
              {itensClasse.map((x) => (
                <button key={x} type="button" disabled={trancada} className={e.itemClasse === x ? "escolhida" : ""} aria-pressed={e.itemClasse === x} onClick={() => salvar({ itemClasse: x })}>
                  <span>{x}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </Folha>
  );
}

// ---------- Cartas de domínio ----------

export function Cartas({ jid, trancada }: { jid: string; trancada: boolean }) {
  const { sala, conteudo: c, acoes } = useSessao();
  const p = sala.personagens[jid] || {};
  const classe = c.classes.find((x) => x.id === p.classe);
  const escolhidas = comoLista<string>(p.cartas);
  const lista = cartasDisponiveis(c, p);
  const alternar = (id: string) => {
    if (trancada) return;
    const novo = escolhidas.includes(id) ? escolhidas.filter((x) => x !== id) : escolhidas.length >= 2 ? [escolhidas[1], id] : [...escolhidas, id];
    acoes.personagem(jid, { cartas: novo });
  };
  if (!classe) {
    return (
      <Folha rotulo="cartas de domínio" titulo="Suas duas primeiras cartas">
        <p className="n-I">{p.classeOutra ? "Classe de fora do app: combine as cartas com o mestre." : "Escolha uma classe primeiro: as cartas vêm dos domínios dela."}</p>
      </Folha>
    );
  }
  return (
    <div className="mec-cartas-pagina">
      <header className="mec-cartas-cab">
        <div>
          <div className="n-L">cartas de domínio · nível 1</div>
          <h2 className="n-S mec-titulo">Suas duas primeiras cartas</h2>
          <p className="n-I">
            {classe.nome} usa {classe.dominios.join(" e ")}. Escolha duas; podem ser do mesmo domínio.
          </p>
        </div>
        <div className={`mec-contador ${escolhidas.length === 2 ? "cheio" : ""}`} aria-live="polite">
          {[0, 1].map((i) => (
            <span key={i} className={escolhidas[i] ? "on" : ""} />
          ))}
          <span className="n-L">{escolhidas.length} de 2</span>
        </div>
      </header>
      {classe.dominios.map((d) => {
        const doms = lista.filter((k) => k.dominio === d);
        return (
          <section key={d} className="mec-dominio">
            <h3 className="n-L">{d}</h3>
            {doms.length ? (
              <div className="mec-cartas">
                {doms.map((k) => {
                  const on = escolhidas.includes(k.id);
                  return (
                    <button key={k.id} type="button" disabled={trancada} className={`mec-carta ${on ? "escolhida" : ""}`} aria-pressed={on} onClick={() => alternar(k.id)}>
                      <span className="mec-carta-topo">
                        <span className="n-L">{[k.tipo, k.recuperacao != null ? `recuperação ${k.recuperacao}` : null].filter(Boolean).join(" · ")}</span>
                        {!k.fonte && <span className="mec-etiqueta exposicao">da Exposição</span>}
                      </span>
                      <span className="mec-carta-nome">{k.nome}</span>
                      {k.texto && <Markdown texto={k.texto} className="mec-carta-texto" />}
                      {on && (
                        <span className="mec-carta-marca">
                          <Icone id="visto" tamanho={16} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="n-I">Este domínio ainda não tem cartas de nível 1 no app.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
