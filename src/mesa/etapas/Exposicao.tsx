// Capítulo V · A Exposição. Rouillac à noite, interativo para quem tem a vez fixar.
// Duas fases: o sorteio (teatro no centro da tela, todos veem ao mesmo tempo: montes, dados,
// a carta virando) e a resposta (a carta "pousa" no painel, compacto e sem rolagem; quem tem a
// vez escreve direto). O programa da noite é uma janela lateral aberta pelo botão do HUD.
import { useEffect, useMemo, useState } from "react";
import { useSessao } from "../../db/sala";
import { comoLista } from "../../db/backend";
import { perguntaBuilder } from "../../conteudo";
import { ROMANOS } from "../../db/tipos";
import { Dado, Insignia, Placa, Selo } from "../../jogo/componentes";
import { BotaoHextech } from "../../jogo/hextech";
import { CartaBuilder, VersoCarta } from "../../jogo/carta";
import { Icone } from "../../jogo/icones";
import { Escrita, JanelaLateral, Storylet } from "../pecas";
import { useConfigurarMapa } from "../MapaFundo";
import { useVisao } from "../Casca";

const DURACAO_SORTEIO = 8500;
const ESCOLHER_MONTE = 1600;
const VIRAR_CARTA = 2900;
const SAIR_DO_SORTEIO = 7800;
const semAnimacao = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function Exposicao({ trancada }: { trancada: boolean }) {
  const { conteudo: c, sala, meuJid, acoes } = useSessao();
  const { mestre, programa, setPrograma } = useVisao();
  const bld = sala.builder || {};
  const atual = bld.atual || null;
  const minhaVez = !!meuJid && bld.vezJid === meuJid && !trancada;
  const podeEscrever = (minhaVez || mestre) && !trancada;
  const [fixando, setFixando] = useState(false);
  const categorias = useMemo(() => [...c.builder.categorias].sort((a, b) => a.d4 - b.d4), [c.builder.categorias]);
  const totais = useMemo(() => categorias.map((x) => x.perguntas.length), [categorias]);
  const { pergunta } = atual ? perguntaBuilder(c, atual.cat, atual.num) : { pergunta: null };
  const textoPergunta = (pergunta?.texto || "").replace(/^\[Exemplo\]\s*/, "");

  useConfigurarMapa(
    {
      interativo: true,
      fixando: fixando && podeEscrever && !!atual,
      tipoSugerido: pergunta?.pin,
      destaque: atual?.pin || null,
      bloqueado: !podeEscrever,
      aoSairDoFixar: () => setFixando(false),
      aoCriarPin: (pid) => {
        if (atual) acoes.pinBuilder(pid);
      },
    },
    [fixando, podeEscrever, atual?.ts, atual?.pin, pergunta?.pin],
  );

  // fase 1: o teatro do sorteio. Quem chega atrasado (ou prefere sem animação) já vê o resultado.
  const [teatro, setTeatro] = useState<"rola" | "escolhe" | "vira" | "sai" | null>(null);
  useEffect(() => {
    if (!atual || semAnimacao() || Date.now() - atual.ts > DURACAO_SORTEIO) {
      setTeatro(null);
      return;
    }
    const decorrido = Date.now() - atual.ts;
    const fase = decorrido >= SAIR_DO_SORTEIO ? "sai" : decorrido >= VIRAR_CARTA ? "vira" : decorrido >= ESCOLHER_MONTE ? "escolhe" : "rola";
    setTeatro(fase);
    const tempos = [
      [ESCOLHER_MONTE, "escolhe"],
      [VIRAR_CARTA, "vira"],
      [SAIR_DO_SORTEIO, "sai"],
      [DURACAO_SORTEIO, null],
    ] as const;
    const timers = tempos.filter(([tempo]) => tempo > decorrido).map(([tempo, proxima]) =>
      window.setTimeout(() => setTeatro(proxima), tempo - decorrido),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [atual?.ts]);

  const nomeVez = bld.vezJid ? sala.jogadores[bld.vezJid]?.nome || "alguém" : null;
  const corVez = bld.vezJid ? sala.jogadores[bld.vezJid]?.cor : undefined;
  const usadas = Object.keys(bld.sorteadas || {});
  const esgotou = usadas.length >= totais.reduce((a, b) => a + b, 0);
  const sobra = (d4: number) => totais[d4 - 1] - usadas.filter((k) => k.startsWith(`${d4}-`)).length;
  const pinAtual = atual?.pin ? sala.pins.rouillac?.[atual.pin] : null;
  const categoria = atual ? c.builder.categorias.find((x) => x.d4 === atual.cat) : null;

  let corpo;
  if (!bld.iniciado) {
    corpo = <p className="n-N">{mestre ? "Prepare a ordem e o número de rodadas na Mesa, aba Condução, e comece." : "O mestre está preparando as rodadas. Os quatro montes esperam sobre o feltro."}</p>;
  } else if (bld.terminado) {
    corpo = (
      <>
        <p className="n-N">A Exposição está montada. O programa da noite está completo.</p>
        <button className="link" onClick={() => setPrograma(true)}>
          ler o programa da noite
        </button>
      </>
    );
  } else {
    corpo = (
      <>
        <div className="linha-vez">
          <span className="cabeca-cor" style={{ background: corVez, width: 12, height: 12 }} />
          <span className="n-L">
            rodada {bld.rodada} de {bld.rodadas}
          </span>
          <Selo tipo="vez">{minhaVez ? "a sua vez" : `vez de ${nomeVez}`}</Selo>
          <span className="n-L montes-sobra" title="Quantas cartas ainda restam em cada monte">
            montes:{" "}
            {categorias.map((cat, i) => (
              <span key={cat.d4} className={atual?.cat === cat.d4 ? "agora" : ""} title={`${cat.nome}: ${sobra(cat.d4)} restantes`}>
                {i > 0 && " · "}
                {ROMANOS[cat.d4]} {sobra(cat.d4)}
              </span>
            ))}
          </span>
        </div>

        {!atual ? (
          <div className="sem-carta">
            {esgotou ? (
              <p className="n-I">Todas as perguntas já saíram.</p>
            ) : minhaVez || mestre ? (
              <>
                <p className="n-N" style={{ margin: 0 }}>
                  Os quatro montes esperam sobre o feltro. Role os dados para saber de onde sai a próxima carta.
                </p>
                <BotaoHextech grande onClick={() => acoes.rolar(bld, totais)} disabled={trancada}>
                  Rolar os bilhetes
                </BotaoHextech>
              </>
            ) : (
              <p className="n-I">Acompanhando a vez de {nomeVez}.</p>
            )}
          </div>
        ) : (
          <>
            <div className="carta-compacta" style={{ ["--cat" as string]: atual.cat }}>
              <div className="n-L">
                Nº {ROMANOS[atual.cat]}-{String(atual.num).padStart(2, "0")} · {categoria?.nome}
              </div>
              <p className="n-N pergunta-vez">{textoPergunta}</p>
              {atual.desvio && <p className="n-I">({atual.desvio})</p>}
            </div>

            {podeEscrever ? (
              <Escrita rotulo="a sua resposta" valor={atual.texto} salvar={(v) => acoes.digitarBuilder(v)} atraso={350} linhas={3} />
            ) : (
              <div className="resposta-ao-vivo">
                <div className="n-L">{nomeVez} está escrevendo</div>
                {atual.texto ? (
                  <p className="n-J" style={{ ["--autor" as string]: corVez }}>
                    {atual.texto}
                  </p>
                ) : (
                  <p className="n-I">…</p>
                )}
              </div>
            )}

            <div className="linha-acao">
              {podeEscrever && (
                <button
                  type="button"
                  className={`fixar-linha ${pinAtual ? "feito" : fixando ? "selecionado" : ""}`}
                  aria-pressed={fixando && !pinAtual}
                  onClick={() => (pinAtual ? acoes.pinBuilder(null) : setFixando(!fixando))}
                  title={pinAtual ? "Desligar o alfinete desta resposta" : "Ponha um alfinete em Rouillac ligado à resposta"}
                >
                  <Icone id="lugar" tamanho={22} />
                  <span>{pinAtual ? `No mapa: ${pinAtual.titulo}` : fixando ? "Clique em Rouillac · Esc cancela" : "Fixar no mapa"}</span>
                  {pinAtual && <Selo tipo="feito">desligar</Selo>}
                </button>
              )}
              {minhaVez && !mestre && (
                <div className="enviar-resposta">
                  {atual.enviada ? (
                    <>
                      <Selo tipo="feito">enviada ao mestre</Selo>
                      <button className="link" onClick={() => acoes.enviarBuilder(false)}>
                        reabrir
                      </button>
                    </>
                  ) : (
                    <Placa disabled={!atual.texto?.trim()} onClick={() => acoes.enviarBuilder(true)}>
                      Enviar resposta
                    </Placa>
                  )}
                </div>
              )}
            </div>
          </>
        )}
        <OrdemDaRodada />
      </>
    );
  }

  return (
    <>
      <Storylet n={5} titulo="A carta da vez" contexto="O d4 escolhe o monte; o d10, a carta." forma="painel" compacto vinheta={false}>
        {corpo}
      </Storylet>
      {teatro && atual && (
        <div className={`sorteio-veu fase-${teatro} ${teatro === "sai" ? "saindo" : ""}`} role="status" aria-live="polite">
          <div className="sorteio-palco">
            <div className="sorteio-chamada n-L">{teatro === "rola" ? "Os dados escolhem o destino?" : teatro === "escolhe" ? categoria?.nome : "A carta da vez"}</div>
            <div className="montes montes-grandes" aria-label="os quatro montes">
              {categorias.map((cat) => (
                <div key={cat.d4} className={`monte ${teatro !== "rola" && atual.cat === cat.d4 ? "sorteado" : ""} ${teatro !== "rola" && atual.cat !== cat.d4 ? "apagado" : ""}`}>
                  <div className="folha" style={{ transform: "translate(4px, -4px)" }} />
                  <div className="folha" style={{ transform: "translate(2px, -2px)" }} />
                  <div className="topo">
                    <VersoCarta cat={cat.d4} nome={cat.nome} arte={c.arte[`verso-${cat.d4}`]} />
                  </div>
                  <div className="n-L rotulo-monte">{cat.nome}</div>
                </div>
              ))}
            </div>
            <div className="dados-sorteio">
              <Dado lados={4} valor={atual.d4} girar={atual.ts} />
              <Dado lados={10} valor={atual.d10} girar={atual.ts} />
            </div>
            <div className={`carta-sorteio ${teatro === "rola" ? "escondida" : ""}`}>
              <CartaBuilder virada={teatro === "vira" || teatro === "sai"} cat={atual.cat} nome={categoria?.nome || ""} num={atual.num} pergunta={textoPergunta} arteVerso={c.arte[`verso-${atual.cat}`]} />
            </div>
          </div>
        </div>
      )}
      {programa && <Programa fechar={() => setPrograma(false)} />}
    </>
  );
}

/** A ordem desta rodada, com o rótulo que explica o que são os pontos coloridos. */
function OrdemDaRodada() {
  const { sala } = useSessao();
  const bld = sala.builder;
  const ordem = comoLista<string>(bld.ordem);
  return (
    <div className="ordem-rodada">
      <span className="n-L">ordem da rodada</span>
      {ordem.map((jid, i) => (
        <span key={jid + i} className={`ordem-item ${i === bld.vez ? "agora" : ""}`}>
          <span className="cabeca-cor" style={{ background: sala.jogadores[jid]?.cor }} />
          {sala.jogadores[jid]?.nome}
        </span>
      ))}
    </div>
  );
}

function Programa({ fechar }: { fechar: () => void }) {
  const { sala, conteudo: c } = useSessao();
  const lista = Object.entries(sala.builder.respostas || {}).sort((a, b) => a[1].n - b[1].n);
  return (
    <JanelaLateral rotulo={c.builder.titulo || "Programme officiel"} titulo="O programa da noite" fechar={fechar} insignia={<Insignia icone="pavilhao" tamanho={40} />}>
      {!lista.length && <p className="n-I">Ainda não há nada no programa.</p>}
      <ol className="programa-lista">
        {lista.map(([rid, r]) => {
          const { categoria, pergunta } = perguntaBuilder(c, r.cat, r.num);
          const pin = r.pin ? sala.pins.rouillac?.[r.pin] : null;
          return (
            <li key={rid}>
              <div className="n-L">
                Nº {r.n} · {categoria?.nome} · {ROMANOS[r.cat]}·{r.num}
              </div>
              <div className="n-R" style={{ fontWeight: 400, fontStyle: "italic", margin: "2px 0 4px" }}>
                {pergunta?.texto.replace(/^\[Exemplo\]\s*/, "")}
              </div>
              <p className="n-J" style={{ ["--autor" as string]: sala.jogadores[r.jid]?.cor, fontSize: 15 }}>
                {r.texto}
              </p>
              <div className="n-I" style={{ fontSize: 12, marginTop: 2 }}>
                {sala.jogadores[r.jid]?.nome}
                {pin && ` · alfinete: ${pin.titulo}`}
              </div>
            </li>
          );
        })}
      </ol>
    </JanelaLateral>
  );
}
