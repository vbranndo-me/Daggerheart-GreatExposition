// Capítulo IV · O continente. O mapa ganha vida: lentes, ficha do país, alfinetes.
// A janela principal encolhe para um painel à esquerda; a lateral mostra a ficha do país,
// os alfinetes da mesa (por pessoa) ou as terras distantes.
import { useEffect, useState } from "react";
import { useSessao } from "../../db/sala";
import { Insignia, Ramo, Vinheta } from "../../jogo/componentes";
import { localizadorDePaises } from "../../geo";
import { Icone } from "../../jogo/icones";
import type { MapaId } from "../../db/tipos";
import type { Pais } from "../../conteudo";
import { JanelaLateral, Storylet } from "../pecas";
import { useConfigurarMapa } from "../MapaFundo";

type Lateral = { tipo: "pais"; id: string } | { tipo: "alfinetes" } | { tipo: "distantes" } | null;

export function Continente({ trancada, mapa, setMapa }: { trancada: boolean; mapa: MapaId; setMapa: (mapa: MapaId) => void }) {
  const { conteudo, sala, meuJid, mestre } = useSessao();
  const [fixando, setFixando] = useState(false);
  const [lateral, setLateral] = useState<Lateral>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [onde, setOnde] = useState<((u: number, v: number) => string | null) | null>(null);
  const pins = sala.pins[mapa] || {};
  const sel = lateral?.tipo === "pais" ? lateral.id : null;
  const podeFixar = !trancada && (!!meuJid || mestre);

  useEffect(() => {
    localizadorDePaises(conteudo.continente, conteudo.paises).then((f) => setOnde(() => f));
  }, [conteudo]);

  useConfigurarMapa(
    {
      interativo: true,
      fixando: fixando && podeFixar,
      bloqueado: !podeFixar,
      paisSelecionado: mapa === "continente" ? sel : null,
      aoClicarPais: mapa === "continente" ? (id) => setLateral(id ? { tipo: "pais", id } : null) : undefined,
      aoSairDoFixar: () => setFixando(false),
    },
    [fixando, podeFixar, sel, mapa],
  );

  const meusPins = Object.values(pins).filter((p) => p && p.autor === (mestre ? "mestre" : meuJid)).length;
  const proximos = conteudo.paises.filter((p) => !p.distante);

  return (
    <>
      <Storylet n={4} titulo="O Continente" contexto="Dez anos de guerra, oito países e uma feira pela paz." forma="painel" vinheta={false}>
        <div className="origem-mapas" role="group" aria-label="Escolher mapa">
          {([ ["continente", "Continente"], ["rouillac", "Cidade de Rouillac"] ] as const).map(([id, nome]) => (
            <button type="button" key={id} aria-pressed={mapa === id} onClick={() => {
              setFixando(false);
              setLateral(null);
              setAberto(null);
              setMapa(id);
            }}>{nome}</button>
          ))}
        </div>
        <p className="n-N mapa-convite">{mapa === "rouillac" ? "Marque os lugares que fazem parte da sua história em Rouillac." : "Marque de onde você vem, por onde passou e o que viu."}</p>
        <div className="mapa-acoes" aria-label="Ações do mapa">
          <button type="button" className={fixando ? "ativa" : ""} disabled={!podeFixar} aria-pressed={fixando} onClick={() => setFixando(!fixando)}>
            <Icone id="lugar" tamanho={22} />
            <span>{fixando ? "Cancelar" : "Fixar alfinete"}</span>
            {!!meusPins && <span className="mapa-acao-contagem" title="Seus alfinetes">{meusPins}</span>}
          </button>
          {mapa === "continente" && <button type="button" className={aberto === "paises" ? "ativa" : ""} aria-expanded={aberto === "paises"} aria-controls="mapa-lista-paises" onClick={() => setAberto(aberto === "paises" ? null : "paises")}>
            <Icone id="lente-politica" tamanho={22} /><span>Países</span>
          </button>}
          <button type="button" className={lateral?.tipo === "alfinetes" ? "ativa" : ""} aria-pressed={lateral?.tipo === "alfinetes"} onClick={() => setLateral(lateral?.tipo === "alfinetes" ? null : { tipo: "alfinetes" })}>
            <Icone id="memoria" tamanho={22} /><span>Alfinetes da mesa</span>
          </button>
          {mapa === "continente" && <button type="button" className={lateral?.tipo === "distantes" ? "ativa" : ""} aria-pressed={lateral?.tipo === "distantes"} onClick={() => setLateral(lateral?.tipo === "distantes" ? null : { tipo: "distantes" })}>
            <Icone id="lente-ferrovias" tamanho={22} /><span>Terras distantes</span>
          </button>}
        </div>
        {fixando && <p className="n-I mapa-instrucao">Clique no mapa para fixar. Esc cancela.</p>}
        {mapa === "continente" && aberto === "paises" && <div id="mapa-lista-paises" className="mapa-paises">
          {proximos.map((p) => <Ramo key={p.id} titulo={p.nome} icone="cap-3" estado={sel === p.id ? "selecionado" : "normal"} aoClicar={() => setLateral({ tipo: "pais", id: p.id })} />)}
        </div>}
      </Storylet>

      {lateral?.tipo === "pais" && (
        <FichaPais pais={conteudo.paises.find((p) => p.id === lateral.id)!} fechar={() => setLateral(null)} onde={onde} />
      )}
      {lateral?.tipo === "alfinetes" && (
        <JanelaLateral rotulo="por pessoa" titulo={mapa === "rouillac" ? "Alfinetes de Rouillac" : "Alfinetes do continente"} fechar={() => setLateral(null)}>
          {[...Object.entries(sala.jogadores).sort((a, b) => (a[1].ordem ?? 0) - (b[1].ordem ?? 0)), ["mestre", { nome: "Mestre", cor: "#a5463c" }] as const].map(([jid, j]) => {
            const dele = Object.values(pins).filter((p) => p && p.autor === jid);
            if (!dele.length) return null;
            return (
              <div key={jid} style={{ marginBottom: 14 }}>
                <div className="n-L" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span className="cabeca-cor" style={{ background: j.cor }} /> {j.nome}
                </div>
                <ul className="lista-simples">
                  {dele.map((p, i) => {
                    const pais = mapa === "continente" ? onde?.(p.u, p.v) : null;
                    return (
                      <li key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <Insignia icone={p.tipo} tamanho={28} />
                        <div style={{ flex: 1 }}>
                          <div className="n-J" style={{ ["--autor" as string]: j.cor, fontSize: 15, paddingLeft: 8 }}>
                            {p.titulo}
                          </div>
                          <div className="n-I" style={{ fontSize: 12 }}>
                            {mapa === "rouillac" ? "Rouillac" : conteudo.paises.find((x) => x.id === pais)?.nome || "mar e outros lugares"}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          {!Object.keys(pins).length && <p className="n-I">Nenhum alfinete ainda.</p>}
        </JanelaLateral>
      )}
      {lateral?.tipo === "distantes" && (
        <JanelaLateral rotulo="além do mar" titulo="Terras distantes" fechar={() => setLateral(null)}>
          {conteudo.paises
            .filter((p) => p.distante)
            .map((p) => (
              <div key={p.id} style={{ marginBottom: 18 }}>
                <ConteudoPais pais={p} onde={null} />
              </div>
            ))}
        </JanelaLateral>
      )}
    </>
  );
}

function FichaPais({ pais, fechar, onde }: { pais: Pais; fechar: () => void; onde: ((u: number, v: number) => string | null) | null }) {
  const { conteudo } = useSessao();
  return (
    <JanelaLateral
      rotulo={`ficha do catálogo · ${pais.lado}`}
      titulo={pais.nome}
      fechar={fechar}
      insignia={<Vinheta id={`pais-${pais.id}`} arquivo={conteudo.arte[`pais-${pais.id}`]} monograma={pais.nome.slice(0, 1)} tamanho={64} />}
    >
      <ConteudoPais pais={pais} onde={onde} semTitulo />
    </JanelaLateral>
  );
}

function ConteudoPais({ pais, onde, semTitulo }: { pais: Pais; onde: ((u: number, v: number) => string | null) | null; semTitulo?: boolean }) {
  const { sala } = useSessao();
  const pins = onde ? Object.values(sala.pins.continente || {}).filter((p) => p && onde(p.u, p.v) === pais.id) : [];
  const origem = Object.entries(sala.personagens).filter(([, p]) => p?.pais === pais.id).map(([jid]) => sala.jogadores[jid]).filter(Boolean);
  return (
    <div>
      {!semTitulo && (
        <>
          <div className="n-L">{pais.lado}</div>
          <div className="n-S" style={{ marginBottom: 6 }}>
            {pais.nome}
          </div>
        </>
      )}
      <dl className="dados-pais">
        <dt className="n-L">capital</dt>
        <dd>{pais.capital}</dd>
        <dt className="n-L">língua</dt>
        <dd>sabor {pais.sabor}</dd>
      </dl>
      <p className="n-N" style={{ fontSize: 16 }}>
        {pais.publico}
      </p>
      <div className="n-L" style={{ margin: "12px 0 4px" }}>
        boatos
      </div>
      <ul className="n-I" style={{ margin: 0, paddingLeft: 18 }}>
        {pais.boatos.map((b) => (
          <li key={b} style={{ marginBottom: 4 }}>
            {b}
          </li>
        ))}
      </ul>
      <p className="n-contexto" style={{ marginTop: 10 }}>
        “{pais.viajante}”
      </p>
      {origem.length > 0 && (
        <p className="n-I" style={{ marginTop: 10 }}>
          Origem de: {origem.map((j) => j!.nome).join(", ")}.
        </p>
      )}
      {pins.length > 0 && (
        <>
          <div className="n-L" style={{ margin: "12px 0 4px" }}>
            alfinetes da mesa
          </div>
          <ul className="lista-simples">
            {pins.map((p, i) => (
              <li key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Insignia icone={p.tipo} tamanho={26} />
                <span className="n-J" style={{ ["--autor" as string]: sala.jogadores[p.autor]?.cor || "#a5463c", fontSize: 15, paddingLeft: 8 }}>
                  {p.titulo}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
