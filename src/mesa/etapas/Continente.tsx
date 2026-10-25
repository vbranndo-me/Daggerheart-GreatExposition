// Capítulo III · O continente. O mapa ganha vida: lentes, ficha do país, alfinetes.
// A janela principal encolhe para um painel à esquerda; a lateral mostra a ficha do país,
// os alfinetes da mesa (por pessoa) ou as terras distantes.
import { useEffect, useState } from "react";
import { useSessao } from "../../db/sala";
import { Insignia, Ramo, Selo, Vinheta } from "../../jogo/componentes";
import { localizadorDePaises } from "../../geo";
import { Icone } from "../../jogo/icones";
import type { Pais } from "../../conteudo";
import { Escolhas, JanelaLateral, Storylet } from "../pecas";
import { useConfigurarMapa } from "../MapaFundo";

type Lateral = { tipo: "pais"; id: string } | { tipo: "alfinetes" } | { tipo: "distantes" } | null;

export function Continente({ trancada }: { trancada: boolean }) {
  const { conteudo, sala, meuJid, mestre } = useSessao();
  const [fixando, setFixando] = useState(false);
  const [lateral, setLateral] = useState<Lateral>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [onde, setOnde] = useState<((u: number, v: number) => string | null) | null>(null);
  const pins = sala.pins.continente || {};
  const sel = lateral?.tipo === "pais" ? lateral.id : null;
  const podeFixar = !trancada && (!!meuJid || mestre);

  useEffect(() => {
    localizadorDePaises(conteudo.continente, conteudo.paises).then((f) => setOnde(() => f));
  }, [conteudo]);

  useConfigurarMapa(
    {
      interativo: true,
      fixando,
      bloqueado: trancada,
      paisSelecionado: sel,
      aoClicarPais: (id) => setLateral(id ? { tipo: "pais", id } : null),
      aoSairDoFixar: () => setFixando(false),
    },
    [fixando, trancada, sel],
  );

  const meusPins = Object.values(pins).filter((p) => p && p.autor === (mestre ? "mestre" : meuJid)).length;
  const proximos = conteudo.paises.filter((p) => !p.distante);

  return (
    <>
      <Storylet n={3} titulo="O Continente" contexto="Dez anos de guerra, oito países e uma feira pela paz." forma="painel" vinheta={false}>
        <p className="n-N">
          O mapa está aberto sobre a mesa do cartógrafo. As frentes estão marcadas em vermelho, as ferrovias cortadas em cruz. Marque de onde seu personagem vem,
          por onde passou, o que viu.
        </p>
        <div className="dica" style={{ marginTop: 10 }}>
          <Icone id="info" tamanho={16} />
          <p className="n-I">Arraste para mover o mapa, use a roda do mouse para aproximar. As lentes ficam embaixo.</p>
        </div>
        <Escolhas>
          <Ramo
            titulo={fixando ? "Fixando: clique no mapa" : "Fixar um alfinete"}
            descricao={fixando ? "Esc cancela." : "Origem, memória, rumor ou pessoa."}
            chamada={fixando ? undefined : "Clique no mapa para escolher o lugar."}
            icone="lugar"
            estado={!podeFixar ? "bloqueado" : fixando ? "selecionado" : "normal"}
            selo={meusPins ? <Selo tipo="feito">{meusPins === 1 ? "1 seu" : `${meusPins} seus`}</Selo> : undefined}
            aoClicar={() => setFixando(!fixando)}
          />
          <Ramo
            titulo="Ler a ficha de um país"
            descricao="Clique num país no mapa, ou escolha aqui."
            icone="lente-politica"
            aberto={aberto === "paises"}
            aoClicar={() => setAberto(aberto === "paises" ? null : "paises")}
          >
            <div className="sub-ramos">
              {proximos.map((p) => (
                <Ramo key={p.id} titulo={p.nome} descricao={p.lado} icone="cap-3" estado={sel === p.id ? "selecionado" : "normal"} aoClicar={() => setLateral({ tipo: "pais", id: p.id })} />
              ))}
            </div>
          </Ramo>
          <Ramo titulo="Os alfinetes da mesa" descricao="Tudo o que cada um marcou, por pessoa." icone="memoria" estado={lateral?.tipo === "alfinetes" ? "selecionado" : "normal"} aoClicar={() => setLateral(lateral?.tipo === "alfinetes" ? null : { tipo: "alfinetes" })} />
          <Ramo titulo="Terras distantes" descricao="As Ilhas Peroladas e a Costa do Marfim." icone="lente-ferrovias" estado={lateral?.tipo === "distantes" ? "selecionado" : "normal"} aoClicar={() => setLateral(lateral?.tipo === "distantes" ? null : { tipo: "distantes" })} />
        </Escolhas>
      </Storylet>

      {lateral?.tipo === "pais" && (
        <FichaPais pais={conteudo.paises.find((p) => p.id === lateral.id)!} fechar={() => setLateral(null)} onde={onde} />
      )}
      {lateral?.tipo === "alfinetes" && (
        <JanelaLateral rotulo="por pessoa" titulo="Alfinetes da mesa" fechar={() => setLateral(null)}>
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
                    const pais = onde?.(p.u, p.v);
                    return (
                      <li key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <Insignia icone={p.tipo} tamanho={28} />
                        <div style={{ flex: 1 }}>
                          <div className="n-J" style={{ ["--autor" as string]: j.cor, fontSize: 15, paddingLeft: 8 }}>
                            {p.titulo}
                          </div>
                          <div className="n-I" style={{ fontSize: 12 }}>
                            {conteudo.paises.find((x) => x.id === pais)?.nome || "mar e outros lugares"}
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
