// #/kit · Kit de componentes da direção visual v2, para o mestre aprovar antes de aplicar nas etapas.
// Não mostra nenhum dado de sala nem nada privado.
import { useEffect, useRef, useState, type ReactNode } from "react";
import "./jogo.css";
import "./jogo-ajustes.css";
import type { Conteudo } from "../conteudo";
import { urlConteudo } from "../conteudo";
import { carregarSvgInterno } from "../svg";
import { ICONES, Icone } from "./icones";
import { recolorirSvgNoturno } from "./noturno";
import { BotaoHextech } from "./hextech";
import { Alfinete } from "./alfinete";
import { CartaBuilder, VersoCarta } from "./carta";
import {
  AreaEscrita,
  Cabecalho,
  ComTooltip,
  Dado,
  Divisoria,
  HUD,
  Janela,
  Neblina,
  Insignia,
  PlaceholderArte,
  Placa,
  ProvedorNotificacoes,
  Ramo,
  Selo,
  SeloExposicao,
  Vinheta,
  useNotificar,
  type Tripulante,
} from "./componentes";

export const CORES_TRIPULACAO = [
  { nome: "Terracota", cor: "#D9805F" },
  { nome: "Menta", cor: "#6FB7A0" },
  { nome: "Azul-céu", cor: "#7FA6E0" },
  { nome: "Lilás", cor: "#B48BD6" },
  { nome: "Rosa-velho", cor: "#E28AA6" },
];

const CAPITULOS = ["Registro de chegada", "O convite", "Protocolo", "O continente", "Ficha de registro", "A Exposição", "Laços", "Fecho do registro"];
const ROMANOS = ["0", "I", "II", "III", "IV", "V", "VI", "VII"];

function luminancia(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contraste(a: string, b: string) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

export function Kit({ conteudo }: { conteudo: Conteudo | null }) {
  // a paleta escolhida é a azul-ardósia
  const paleta = "ardosia" as "carvao" | "ardosia" | "lado";
  const [fonte, setFonte] = useState<"baskerville" | "cormorant">("baskerville");
  const [ambiente, setAmbiente] = useState(true);
  const raiz = paleta === "lado" ? "carvao" : paleta;
  return (
    <div className={`jogo kit ${ambiente ? "ambiente" : ""}`} data-paleta={raiz} data-fonte={fonte}>
      <ProvedorNotificacoes>
        <div className="kit-barra">
          <div className="kit-controles">
            <strong className="n-L" style={{ color: "var(--brass)" }}>
              Kit · direção visual v2
            </strong>
            <div className="grupo">
              <span className="n-L">títulos</span>
              {(
                [
                  ["baskerville", "Libre Baskerville"],
                  ["cormorant", "Cormorant"],
                ] as const
              ).map(([v, r]) => (
                <button key={v} className={`chip ${fonte === v ? "ativo" : ""}`} onClick={() => setFonte(v)}>
                  {r}
                </button>
              ))}
            </div>
            <div className="grupo">
              <span className="n-L">ambiente</span>
              <button className={`chip ${ambiente ? "ativo" : ""}`} onClick={() => setAmbiente(!ambiente)}>
                {ambiente ? "ligado" : "desligado"}
              </button>
            </div>
          </div>
          <SecaoHUD />
        </div>

        <div className="kit-corpo">
          <p className="n-I" style={{ maxWidth: 760 }}>
            Esta página mostra cada peça da nova interface, isolada, com textos de exemplo. Nada aqui é aplicado às etapas ainda: aprove (ou peça ajustes) e só
            depois eu monto as telas. A barra de cima é o HUD de verdade; passe o mouse nos retratos.
          </p>

          <section className="kit-secao">
            <span className="n-L">1 · Janela principal (storylet)</span>
            {paleta === "lado" ? (
              <div className="kit-grade" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div data-paleta="carvao" style={{ background: "var(--bg-map-sea)", padding: 30 }}>
                  <div className="n-L" style={{ marginBottom: 30 }}>carvão esverdeado</div>
                  <StoryletExemplo conteudo={conteudo} compacto />
                </div>
                <div data-paleta="ardosia" style={{ background: "var(--bg-map-sea)", padding: 30 }}>
                  <div className="n-L" style={{ marginBottom: 30 }}>azul-ardósia</div>
                  <StoryletExemplo conteudo={conteudo} compacto />
                </div>
              </div>
            ) : (
              <MapaFundo>
                <div style={{ padding: "48px 40px", display: "flex", gap: 28, alignItems: "flex-start" }}>
                  <div style={{ flex: "0 1 760px" }}>
                    <StoryletExemplo conteudo={conteudo} />
                  </div>
                  <Janela tipo="leve" style={{ width: 340, flex: "none" }}>
                    <FichaPaisExemplo conteudo={conteudo} />
                  </Janela>
                </div>
              </MapaFundo>
            )}
          </section>

          <section className="kit-secao">
            <span className="n-L">2 · Escala de hierarquia (C a A)</span>
            <Janela tipo="leve" style={{ padding: "22px 26px" }}>
              <EscalaHierarquia />
            </Janela>
          </section>

          <section className="kit-secao">
            <span className="n-L">3 · Ramo em todos os estados</span>
            <div className="kit-grade">
              {(
                [
                  ["normal", "Normal"],
                  ["hover", "Hover"],
                  ["foco", "Foco (teclado)"],
                  ["selecionado", "Selecionado"],
                  ["bloqueado", "Bloqueado"],
                  ["feito", "Feito"],
                ] as const
              ).map(([e, r]) => (
                <div key={e}>
                  <div className="n-L" style={{ marginBottom: 8 }}>
                    {r}
                  </div>
                  <Ramo
                    titulo={e === "feito" ? "Seu país de origem" : "Fixar um alfinete no mapa"}
                    descricao={e === "bloqueado" ? "Abre quando o mestre liberar." : e === "feito" ? <span className="n-J" style={{ fontSize: 15, padding: 0, border: 0 }}>Codrina, a parte ocupada.</span> : "Marque de onde você vem ou algo que viu."}
                    chamada={e === "normal" || e === "hover" ? "Clique no mapa para escolher o lugar." : undefined}
                    icone="lugar"
                    estado={e}
                    selo={e === "selecionado" ? <Selo>escolhido</Selo> : e === "feito" ? <Selo tipo="feito">feito</Selo> : e === "bloqueado" ? <Selo>o mestre decide</Selo> : undefined}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 28, maxWidth: 640 }}>
              <div className="n-L" style={{ marginBottom: 8 }}>
                Ramo que pede texto (abre no lugar, sem modal)
              </div>
              <RamoEscrita />
            </div>
          </section>

          <section className="kit-secao">
            <span className="n-L">4 · Ação, link, selos e área de escrita</span>
            <div className="kit-grade">
              <div style={{ display: "grid", gap: 18, justifyItems: "start" }}>
                <Placa>Assumir este nome</Placa>
                <Placa disabled>Assumir este nome</Placa>
                <button className="link">ver as referências</button>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Selo>escolhido</Selo>
                  <Selo tipo="privado">
                    <Icone id="selar" tamanho={12} /> só você vê
                  </Selo>
                  <Selo tipo="vez">vez de Ana</Selo>
                  <Selo>o mestre decide</Selo>
                  <Selo tipo="feito">
                    <Icone id="visto" tamanho={12} /> feito
                  </Selo>
                  <Selo tipo="gm">mestre</Selo>
                </div>
              </div>
              <Janela tipo="leve">
                <AreaEscrita rotulo="Ligação com o oculto" placeholder="A primeira vez que você viu algo que não devia existir…" aoSalvar={() => {}} />
              </Janela>
            </div>
          </section>

          <section className="kit-secao">
            <span className="n-L">5 · Tooltip e notificação</span>
            <div className="kit-grade">
              <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                {["origem", "pavilhao", "refugiado", "lente-guerra"].map((i) => (
                  <ComTooltip key={i} titulo={ICONES[i].nome} texto="Uma ou duas linhas de explicação, no nível de instrução." icone={i}>
                    <span className="icone-btn" tabIndex={0} style={{ width: 44, height: 44 }}>
                      <Icone id={i} />
                    </span>
                  </ComTooltip>
                ))}
                <span className="n-I">passe o mouse (250 ms) · no toque, toque e segure</span>
              </div>
              <BotoesNotificacao />
            </div>
          </section>

          <section className="kit-secao">
            <span className="n-L">6 · Arte: placeholders (trocam pela imagem sem mexer em código)</span>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
              <Vinheta id="cap-3" icone="cap-3" tamanho={176} />
              <Vinheta id="papel-refugiado" icone="refugiado" tamanho={128} />
              <Vinheta id="classe-alquimista" monograma="A" tamanho={150} proporcao={3 / 4} />
              <Vinheta id="pais-codrina" monograma="C" tamanho={128} />
              <div style={{ width: 96, height: 96, position: "relative", borderRadius: "50%", overflow: "hidden", border: "1px solid var(--brass-dark)" }}>
                <PlaceholderArte id="retrato" monograma="B" />
              </div>
            </div>
          </section>

          <section className="kit-secao">
            <span className="n-L">7 · Cores da tripulação (proposta)</span>
            <Cores />
          </section>

          <section className="kit-secao">
            <span className="n-L">8 · Carta (frente e verso) e dados</span>
            <BaralhoDemo conteudo={conteudo} />
          </section>

          <section className="kit-secao">
            <span className="n-L">9 · Ícones (silhuetas do game-icons.net)</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
              {Object.entries(ICONES)
                .filter(([k]) => k !== "losango")
                .map(([k, v]) => (
                  <div key={k} style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--brass)" }}>
                    <Icone id={k} tamanho={32} />
                    <span className="n-I" style={{ fontSize: 13 }}>
                      {v.nome}
                    </span>
                  </div>
                ))}
            </div>
          </section>

          <section className="kit-secao">
            <span className="n-L">9b · Insígnias e qualidades (à Lies of P)</span>
            <div className="kit-grade">
              <div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                  {["cap-3", "refugiado", "pavilhao", "boato", "selar", "rolar", "convidado", "lente-guerra"].map((i) => (
                    <Insignia key={i} icone={i} titulo={ICONES[i].nome} />
                  ))}
                  <Insignia icone="escandalo" ativa titulo="ativa" />
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <Insignia icone="cap-5" tamanho={56} />
                  <Insignia icone="cap-1" tamanho={30} />
                  <Insignia icone="lugar" tamanho={24} />
                  <span className="n-I">o mesmo quadro em 56, 30 e 24 px</span>
                </div>
                <p className="n-I" style={{ marginTop: 16 }}>
                  O ícone em si continua do game-icons; o que dá a cara “estilizada” é o quadro chanfrado com filete de latão. Eu usaria nas qualidades da ficha,
                  no tooltip do retrato e nas lentes do mapa. Nos ramos fica o medalhão redondo, para não virar tudo a mesma coisa.
                </p>
              </div>
              <div>
                <div className="n-L" style={{ marginBottom: 8 }}>
                  qualidades de Ana (ficha de registro)
                </div>
                <div className="qualidades">
                  {(
                    [
                      ["cap-3", "País", "Codrina", false],
                      ["refugiado", "Papel", "Refugiada", true],
                      ["lente-cidades", "Comunidade", "Operariado", false],
                      ["escrever", "Classe", "Alquimista", false],
                      ["memoria", "Origem", "2/3", false],
                      ["selar", "Segredo", "selado", false],
                    ] as const
                  ).map(([i, n, v, a]) => (
                    <div key={n} className={`qualidade ${a ? "ativa" : ""}`}>
                      <Insignia icone={i} ativa={a} tamanho={32} />
                      <span className="nome">{n}</span>
                      <span className="valor">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="kit-secao">
            <span className="n-L">10 · O mapa como carta náutica escura</span>
            <MapasNoturnos ambiente={ambiente} />
          </section>

          <section className="kit-secao">
            <span className="n-L">11 · Botão hextech (só onde pede destaque)</span>
            <p className="n-I" style={{ maxWidth: 780, marginBottom: 22 }}>
              Moldura de ouro em hexágono com joias nas pontas e, dentro, um cristal com energia viva. Em repouso ela respira devagar; no hover acende, os fios de
              luz ganham surtos, sobem faíscas e um reflexo atravessa; no clique sai uma onda do ponto clicado. A placa de latão continua sendo a ação comum; o
              hextech é reservado para poucos momentos da noite.
            </p>
            <div className="vitrine-hextech">
              <div className="hx-amostra">
                <BotaoHextech grande>Rolar os bilhetes</BotaoHextech>
                <span className="n-L">grande · o momento da vez</span>
              </div>
              <div className="hx-amostra">
                <BotaoHextech>Entregar o convite</BotaoHextech>
                <span className="n-L">normal</span>
              </div>
              <div className="hx-amostra">
                <BotaoHextech disabled>Rolar os bilhetes</BotaoHextech>
                <span className="n-L">desligado (não é a sua vez)</span>
              </div>
              <div className="hx-amostra" style={{ background: "var(--gm-bg)", padding: "22px 26px", borderLeft: "3px solid var(--gm-accent)" }}>
                <BotaoHextech>Próximo capítulo ▸</BotaoHextech>
                <span className="n-L">na Mesa do Mestre</span>
              </div>
            </div>

            <div className="kit-grade" style={{ marginTop: 40 }}>
              <Janela tipo="pesada">
                <Cabecalho capitulo="Capítulo V" titulo="A carta da vez" contexto="É a vez de Ana." />
                <p className="n-N" style={{ marginBottom: 18 }}>
                  Os quatro montes esperam sobre o feltro. O d4 escolhe o monte; o d10, a carta.
                </p>
                <div className="ramos">
                  <Ramo titulo="Ver o programa da noite" descricao="As perguntas que já saíram, em ordem." icone="memoria" />
                </div>
                <div style={{ display: "flex", justifyContent: "center", marginTop: 26 }}>
                  <BotaoHextech grande>Rolar os bilhetes</BotaoHextech>
                </div>
              </Janela>
              <div className="n-I">
                <p style={{ marginTop: 0 }}>
                  <strong style={{ color: "var(--text)" }}>Onde eu usaria (sugestão):</strong>
                </p>
                <ul style={{ paddingLeft: 18, margin: 0, display: "grid", gap: 6 }}>
                  <li><strong style={{ color: "var(--text)" }}>Rolar os bilhetes</strong>, na vez de cada jogador: é o grande momento da Exposição.</li>
                  <li><strong style={{ color: "var(--text)" }}>Entregar o convite</strong>, o gesto do mestre que abre a noite.</li>
                  <li><strong style={{ color: "var(--text)" }}>Próximo capítulo</strong>, na Mesa do Mestre.</li>
                  <li><strong style={{ color: "var(--text)" }}>Assumir este nome</strong>, na entrada: a primeira coisa que cada um clica.</li>
                </ul>
                <p>
                  Todo o resto (salvar, enviar, fixar alfinete) fica na placa de latão. Se tiver hextech em tudo, nada mais parece especial. Passe o mouse no botão da
                  janela: a filigrana também acende, em dourado.
                </p>
              </div>
            </div>
          </section>

          <section className="kit-secao">
            <span className="n-L">12 · Animações (aperte "tocar")</span>
            <Animacoes conteudo={conteudo} />
          </section>
          <p className="n-I" style={{ marginTop: 60, fontSize: 12 }}>
            Créditos: ícones de <a className="link" href="https://game-icons.net" target="_blank" rel="noreferrer">game-icons.net</a> (Lorc, Delapouite e outros
            autores), licença CC BY 3.0.
          </p>
        </div>
      </ProvedorNotificacoes>
    </div>
  );
}

// ---------------------------------------------------------------------------

const TRIPULACAO_EX: Tripulante[] = [
  { id: "a", nome: "Ana", cor: CORES_TRIPULACAO[0].cor, online: true, papel: "Refugiada", classe: "Alquimista" },
  { id: "b", nome: "Bruno", cor: CORES_TRIPULACAO[1].cor, online: true, papel: "Convidado ilustre" },
  { id: "c", nome: "Carla", cor: CORES_TRIPULACAO[2].cor, online: false },
  { id: "d", nome: "Davi", cor: CORES_TRIPULACAO[3].cor, online: true, papel: "Funcionário da feira", classe: "Galvanista" },
  { id: "e", nome: "Eva", cor: CORES_TRIPULACAO[4].cor, online: true },
];

const OBJETIVOS = {
  vez: "Responda a pergunta da carta",
  outros: "Acompanhe a vez de Ana",
  mestre: "Aceite ou vete a resposta",
} as const;

function SecaoHUD() {
  const [papel, setPapel] = useState<keyof typeof OBJETIVOS>("outros");
  const [lista, setLista] = useState(false);
  const [som, setSom] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <HUD
        capitulo="V"
        nomeCapitulo="A Exposição"
        objetivo={OBJETIVOS[papel]}
        tripulacao={TRIPULACAO_EX}
        vez="a"
        mestre={papel === "mestre"}
        aoAbrirCapitulos={() => setLista(!lista)}
        som={som}
        aoSom={() => setSom(!som)}
      />
      <div style={{ position: "absolute", right: 16, top: 62, display: "flex", gap: 4, zIndex: 6 }}>
        <span className="n-L" style={{ alignSelf: "center", marginRight: 4 }}>
          ver como
        </span>
        {(
          [
            ["vez", "jogador da vez"],
            ["outros", "outro jogador"],
            ["mestre", "mestre"],
          ] as const
        ).map(([v, r]) => (
          <button key={v} className={`chip ${papel === v ? "ativo" : ""}`} onClick={() => setPapel(v)}>
            {r}
          </button>
        ))}
      </div>
      {lista && (
        <Janela tipo="leve" className="lista-capitulos">
          {CAPITULOS.map((c, i) => (
            <button key={c} disabled={i > 5} className={i === 5 ? "atual" : ""} onClick={() => setLista(false)}>
              <Icone id={i > 5 ? "cadeado" : `cap-${i}`} tamanho={20} />
              <span className="n-L" style={{ width: 28, color: "inherit" }}>
                {ROMANOS[i]}
              </span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 15 }}>{c}</span>
            </button>
          ))}
        </Janela>
      )}
    </div>
  );
}

function MapaFundo({ children }: { children: ReactNode }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    carregarSvgInterno("mapas/continente.svg").then(setSvg);
  }, []);
  return (
    <div className="mapa-noturno" style={{ borderRadius: 2, border: "1px solid #1d2626" }}>
      <svg viewBox="0 0 2100 1500" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.55 }} dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="vinheta-escura" style={{ background: "radial-gradient(ellipse at center, rgba(4,7,8,.35), rgba(4,7,8,.85))" }} />
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
}

function StoryletExemplo({ conteudo, compacto }: { conteudo: Conteudo | null; compacto?: boolean }) {
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const paises = conteudo?.paises.filter((p) => !p.distante).slice(0, 3) || [];
  return (
    <Janela tipo="pesada">
      <Cabecalho capitulo="Capítulo III" titulo="O Continente" contexto="Dez anos de guerra, oito países e uma feira pela paz." />
      <div className="storylet-topo" style={compacto ? { gridTemplateColumns: "1fr" } : undefined}>
        {!compacto && <Vinheta id="cap-3" icone="cap-3" tamanho={168} />}
        <div className="storylet-corpo">
          <p className="n-N">
            O mapa está aberto sobre a mesa do cartógrafo. As frentes estão marcadas em vermelho, as ferrovias cortadas em cruz. Entremonts, pequeno, no meio de
            tudo, parece um botão que segura o casaco inteiro.
          </p>
          <p className="n-J" style={{ ["--autor" as string]: CORES_TRIPULACAO[0].cor }}>
            “Meu pai trabalhava nas minas de sal de Ocna Neagră, antes da ocupação.”
          </p>
          <div className="dica">
            <Icone id="info" tamanho={16} />
            <p className="n-I">Arraste para mover o mapa e use a roda do mouse para aproximar.</p>
          </div>
        </div>
      </div>
      <Divisoria />
      <div className="ramos">
        <Ramo titulo="Fixar um alfinete no mapa" descricao="Marque de onde você vem ou algo que viu." chamada="Clique no mapa para escolher o lugar." icone="lugar" estilo={{ ["--atraso" as string]: "0s" }} />
        <Ramo
          titulo="Ler a ficha de um país"
          descricao={escolhido ? `Lendo: ${escolhido}.` : "Clique num país no mapa, ou escolha aqui."}
          icone="lente-politica"
          estado={escolhido ? "selecionado" : "normal"}
          selo={escolhido ? <Selo>escolhido</Selo> : undefined}
          aoClicar={() => setEscolhido(escolhido ? null : paises[0]?.nome || "Codrina")}
        />
        <Ramo titulo="Seu segredo" descricao="Algo que seu personagem esconde de todo mundo." icone="selar" selo={<Selo tipo="privado">só o mestre vê</Selo>} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 18, marginTop: 18 }}>
        <button className="link">ver os alfinetes da mesa</button>
        <Placa>Pronto, terminei</Placa>
      </div>
    </Janela>
  );
}

function FichaPaisExemplo({ conteudo }: { conteudo: Conteudo | null }) {
  const p = conteudo?.paises.find((x) => x.id === "codrina");
  if (!p) return null;
  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <Vinheta id="pais-codrina" monograma="C" tamanho={64} />
        <div style={{ flex: 1 }}>
          <div className="n-L">{p.lado}</div>
          <div className="n-S">{p.nome}</div>
        </div>
        <button className="icone-btn" aria-label="fechar">
          <Icone id="fechar" tamanho={16} />
        </button>
      </div>
      <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 14px", margin: "0 0 12px" }}>
        <dt className="n-L">capital</dt>
        <dd className="n-I" style={{ margin: 0, color: "var(--text)" }}>
          {p.capital}
        </dd>
        <dt className="n-L">língua</dt>
        <dd className="n-I" style={{ margin: 0, color: "var(--text)" }}>
          sabor {p.sabor}
        </dd>
      </dl>
      <p className="n-N" style={{ fontSize: 16 }}>
        {p.publico}
      </p>
      <div className="n-L" style={{ margin: "14px 0 6px" }}>
        boatos
      </div>
      <ul style={{ margin: 0, paddingLeft: 18 }} className="n-I">
        {p.boatos.map((b) => (
          <li key={b} style={{ marginBottom: 4 }}>
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EscalaHierarquia() {
  const linhas: [string, string, ReactNode][] = [
    ["C", "Capítulo · display 32", <h2 className="n-C">A Exposição Universal</h2>],
    ["S", "Seção · display 21", <h3 className="n-S">Codrina</h3>],
    ["N", "Narrativo · serifa 18", <p className="n-N">Os pavilhões de ferro e vidro brilham à noite, e ninguém sabe ao certo quem paga a conta do gás.</p>],
    ["J", "Dos jogadores · serifa 18 + barra do autor", <p className="n-J" style={{ ["--autor" as string]: CORES_TRIPULACAO[1].cor }}>O pavilhão de Kenturia está vazio por dentro. Eu vi.</p>],
    ["R", "Ramo · serifa de título 16, negrito", <div className="n-R">Fixar um alfinete no mapa</div>],
    ["I", "Instrução · sans 14, apagada", <p className="n-I">Clique no mapa onde quer pôr o alfinete. Esc cancela.</p>],
    ["L", "Rótulo · sans 12, caixa alta", <span className="n-L">rodada 2 de 3</span>],
    ["A", "Ação · placa de latão", <Placa>Rolar os bilhetes</Placa>],
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "40px 230px 1fr", gap: "16px 18px", alignItems: "baseline" }}>
      {linhas.map(([n, d, ex]) => (
        <FragmentoLinha key={n} n={n} d={d} ex={ex} />
      ))}
    </div>
  );
}
function FragmentoLinha({ n, d, ex }: { n: string; d: string; ex: ReactNode }) {
  return (
    <>
      <span className="n-S" style={{ color: "var(--brass)" }}>
        {n}
      </span>
      <span className="n-I" style={{ fontSize: 13 }}>
        {d}
      </span>
      <div>{ex}</div>
    </>
  );
}

function RamoEscrita() {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  return (
    <Ramo
      titulo="Ligação com o oculto"
      descricao={texto ? <span className="n-J" style={{ fontSize: 15, border: 0, padding: 0 }}>{texto}</span> : "A primeira vez que você viu algo que não devia existir."}
      chamada={texto ? undefined : "Escreva aqui mesmo."}
      icone="escrever"
      estado={texto && !aberto ? "feito" : "normal"}
      selo={texto && !aberto ? <Selo tipo="feito">feito</Selo> : undefined}
      aberto={aberto}
      aoClicar={() => setAberto(!aberto)}
    >
      <AreaEscrita
        rotulo="sua resposta"
        valor={texto}
        aoSalvar={(v) => {
          setTexto(v);
          window.setTimeout(() => setAberto(false), 350);
        }}
      />
    </Ramo>
  );
}

function BotoesNotificacao() {
  const notificar = useNotificar();
  const exemplos: [string, ReactNode][] = [
    ["lugar", <>Bruno fixou um alfinete: <em>A fábrica do pai</em></>],
    ["cap-4", <>O mestre abriu o Capítulo IV</>],
    ["rolar", <>Vez de Carla</>],
  ];
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      {exemplos.map(([i, c], k) => (
        <button key={k} className="tocar" onClick={() => notificar(i, c)}>
          notificar {k + 1}
        </button>
      ))}
      <span className="n-I">aparecem no canto superior direito, somem em 4 s, no máximo 3</span>
    </div>
  );
}

function Cores() {
  return (
    <div className="kit-grade">
      <div>
        {CORES_TRIPULACAO.map((c) => (
          <div key={c.cor} className="amostra-cor">
            <span className="bolinha" style={{ background: c.cor }} />
            <span style={{ width: 110 }}>{c.nome}</span>
            <code className="n-I" style={{ width: 80 }}>
              {c.cor}
            </code>
            <span className="n-I">
              contraste na janela {contraste(c.cor, "#161D1E").toFixed(1)} : 1 · no mapa {contraste(c.cor, "#1A2628").toFixed(1)} : 1
            </span>
          </div>
        ))}
      </div>
      <div className="n-I">
        <p style={{ marginTop: 0 }}>
          Texto narrativo (<code>--text</code>) sobre a janela: <strong style={{ color: "var(--text)" }}>{contraste("#DCD5C6", "#161D1E").toFixed(1)} : 1</strong> no carvão,{" "}
          <strong style={{ color: "var(--text)" }}>{contraste("#DCD5C6", "#232838").toFixed(1)} : 1</strong> na ardósia (AA pede 4,5).
        </p>
        <p>
          Instrução (<code>--text-muted</code>): {contraste("#9A9C92", "#161D1E").toFixed(1)} : 1 no carvão, {contraste("#9A9C92", "#232838").toFixed(1)} : 1 na ardósia.
        </p>
        <p>As cinco cores ficam longe do latão (que é a cor do que é clicável) e da luz de gás (que é a cor da vez).</p>
      </div>
    </div>
  );
}

function BaralhoDemo({ conteudo }: { conteudo: Conteudo | null }) {
  const [virada, setVirada] = useState(true);
  const [rolagem, setRolagem] = useState(0);
  const [valores, setValores] = useState({ d4: 2, d10: 7 });
  const cat = conteudo?.builder.categorias.find((c) => c.d4 === valores.d4);
  const perg = cat?.perguntas.find((p) => p.d10 === valores.d10);
  return (
    <div style={{ display: "flex", gap: 40, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ display: "flex", gap: 14 }}>
        {(conteudo?.builder.categorias || []).map((c) => (
          <div key={c.d4} style={{ textAlign: "center" }}>
            <div style={{ position: "relative", width: 96 }}>
              {[2, 1, 0].map((k) => (
                <div key={k} style={{ position: k ? "absolute" : "relative", top: -k * 3, left: k * 2, width: 96, aspectRatio: "2/3", borderRadius: 6, overflow: "hidden", border: "1px solid var(--brass-dark)", background: "#151925", boxShadow: "0 3px 6px #0008", ["--carta-w" as string]: "96px" }}>
                  {k === 0 && <VersoCarta cat={c.d4} nome={c.nome} />}
                </div>
              ))}
            </div>
            <div className="n-L" style={{ marginTop: 8, maxWidth: 96 }}>
              {c.nome}
            </div>
          </div>
        ))}
      </div>
      <CartaBuilder virada={virada} cat={valores.d4} nome={cat?.nome || "Os pavilhões"} num={valores.d10} pergunta={perg?.texto || "Que pavilhão ninguém visita, e por quê?"} />
      <div style={{ display: "grid", gap: 12, justifyItems: "start" }}>
        <div style={{ display: "flex", gap: 16 }}>
          <Dado lados={4} valor={valores.d4} girar={rolagem} />
          <Dado lados={10} valor={valores.d10} girar={rolagem} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="tocar"
            onClick={() => {
              setVirada(false);
              setValores({ d4: 1 + Math.floor(Math.random() * 4), d10: 1 + Math.floor(Math.random() * 10) });
              setRolagem((n) => n + 1);
              window.setTimeout(() => setVirada(true), 1000);
            }}
          >
            rolar
          </button>
          <button className="tocar" onClick={() => setVirada(!virada)}>
            virar carta
          </button>
        </div>
      </div>
    </div>
  );
}

function MapasNoturnos({ ambiente }: { ambiente: boolean }) {
  const [cont, setCont] = useState("");
  const [rou, setRou] = useState("");
  useEffect(() => {
    carregarSvgInterno("mapas/continente.svg").then(setCont);
    fetch(urlConteudo("mapas/rouillac/monumentos.svg"))
      .then((r) => r.text())
      .then((t) => setRou(URL.createObjectURL(new Blob([recolorirSvgNoturno(t)], { type: "image/svg+xml" }))));
  }, []);
  return (
    <div className="kit-grade" style={{ gridTemplateColumns: "1fr 1fr" }}>
      <div>
        <div className="mapa-noturno" style={{ border: "1px solid #1d2626" }}>
          <svg viewBox="0 0 2100 1500">
            <g dangerouslySetInnerHTML={{ __html: cont.replace('data-pais="codrina"', 'data-pais="codrina" class="selecionado"') }} />
            <Alfinete x={300} y={640} cor={CORES_TRIPULACAO[0].cor} icone="origem" escala={3.2} titulo="Ana · origem" destaque />
            <Alfinete x={700} y={600} cor={CORES_TRIPULACAO[1].cor} icone="memoria" escala={3.2} titulo="Bruno · memória" />
            <Alfinete x={395} y={800} cor={CORES_TRIPULACAO[2].cor} icone="rumor" escala={3.2} titulo="Carla · rumor" />
            <Alfinete x={930} y={840} cor={CORES_TRIPULACAO[3].cor} icone="pessoa" escala={3.2} titulo="Davi · pessoa" />
            <Alfinete x={1180} y={640} cor={CORES_TRIPULACAO[4].cor} icone="boato" escala={3.2} titulo="Eva · boato" />
          </svg>
          <Neblina ligada={ambiente} />
          <div className="vinheta-escura" />
        </div>
        <p className="n-I">
          Continente: recolorido pelas classes e grupos do SVG (Codrina selecionada). Alfinetes: medalhão esmaltado na cor de quem fixou, com o ícone do tipo; o de
          Ana está em destaque (aberto). Neblina a ~8% com o ambiente ligado.
        </p>
      </div>
      <div>
        <div className="mapa-noturno" style={{ border: "1px solid #1d2626", background: "#141b1c" }}>
          {rou ? <img src={rou} alt="Rouillac noturna" style={{ width: "100%", display: "block" }} /> : <div style={{ aspectRatio: "4000/3120" }} />}
          <div className="vinheta-escura" />
        </div>
        <p className="n-I">Rouillac: a planta é clara e não tem classes, então cada cor é remapeada (papel vira terra escura, tinta vira marfim). Não é inversão.</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function Demo({ titulo, aoTocar, children }: { titulo: string; aoTocar: () => void; children: ReactNode }) {
  return (
    <div className="demo">
      <div className="demo-titulo">
        <span className="n-R">{titulo}</span>
        <button className="tocar" onClick={aoTocar}>
          ▸ tocar
        </button>
      </div>
      {children}
    </div>
  );
}

function reiniciarClasse(el: Element | null, classe: string) {
  if (!el) return;
  el.classList.remove(classe);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(classe);
}

function Animacoes({ conteudo }: { conteudo: Conteudo | null }) {
  const notificar = useNotificar();
  const [chaveJanela, setChaveJanela] = useState(0);
  const [cap, setCap] = useState(3);
  const [trocando, setTrocando] = useState(false);
  const capRef = useRef<HTMLSpanElement>(null);
  const vezRef = useRef<HTMLSpanElement>(null);
  const [rolagem, setRolagem] = useState(0);
  const [virada, setVirada] = useState(true);
  const [pinos, setPinos] = useState<{ id: number; x: number; y: number }[]>([]);
  const [salvo, setSalvo] = useState(0);
  const [convite, setConvite] = useState(0);
  const [transicao, setTransicao] = useState(0);

  const trocarCapitulo = () => {
    setTrocando(true);
    window.setTimeout(() => {
      setCap((c) => (c >= 7 ? 1 : c + 1));
      setTrocando(false);
      setChaveJanela((k) => k + 1);
      reiniciarClasse(capRef.current, "anim-cap-brilha");
    }, 250);
  };

  return (
    <div className="kit-grade" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))" }}>
      <Demo titulo="Janela abre (filigrana se desenha)" aoTocar={() => setChaveJanela((k) => k + 1)}>
        <div style={{ padding: 20 }}>
          <Janela key={chaveJanela} tipo="pesada" animar>
            <Cabecalho capitulo={`Capítulo ${ROMANOS[cap]}`} titulo={CAPITULOS[cap]} />
            <p className="n-N" style={{ fontSize: 16 }}>
              Uma janela de exemplo.
            </p>
          </Janela>
        </div>
      </Demo>

      <Demo titulo="Troca de capítulo (HUD brilha)" aoTocar={trocarCapitulo}>
        <div className="hud" style={{ height: 48, marginBottom: 14 }}>
          <span className="capitulo">
            <SeloExposicao tamanho={30} />
            <span className="cap-texto">
              <span className="cap-num" ref={capRef}>
                CAP. {ROMANOS[cap]}
              </span>
              <span className="cap-nome">{CAPITULOS[cap]}</span>
            </span>
          </span>
        </div>
        <div className={trocando ? "anim-janela-afunda" : ""}>
          <Janela key={`t${chaveJanela}`} tipo="leve" className="anim-janela-abre">
            <div className="n-S">{CAPITULOS[cap]}</div>
          </Janela>
        </div>
      </Demo>

      <Demo titulo="Ramo escolhido (carimbo)" aoTocar={() => {}}>
        <Ramo titulo="Clique no ramo" descricao="O medalhão carimba (passe o mouse para ver ele girar)." icone="rolar" />
      </Demo>

      <Demo titulo="Vez de alguém (retrato acende)" aoTocar={() => {
        reiniciarClasse(vezRef.current, "anim-vez");
        notificar("rolar", <>Vez de Ana</>);
      }}>
        <div className="hud" style={{ height: 52 }}>
          <div className="tripulacao">
            {TRIPULACAO_EX.map((t) => (
              <span key={t.id} ref={t.id === "a" ? vezRef : undefined} className={`retrato ${t.id === "a" ? "vez" : ""}`} style={{ background: t.cor }}>
                {t.nome[0]}
              </span>
            ))}
          </div>
        </div>
      </Demo>

      <Demo titulo="Baralho (dados rolam, carta vira)" aoTocar={() => {
        setVirada(false);
        setRolagem((n) => n + 1);
        window.setTimeout(() => setVirada(true), 1000);
      }}>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <div style={{ display: "grid", gap: 10 }}>
            <Dado lados={4} valor={4} girar={rolagem} />
            <Dado lados={10} valor={3} girar={rolagem} />
          </div>
          <div style={{ ["--carta-w" as string]: "130px" }}>
            <CartaBuilder
              virada={virada}
              cat={4}
              nome={conteudo?.builder.categorias[3]?.nome || "Os rumores"}
              num={3}
              pergunta={conteudo?.builder.categorias[3]?.perguntas[2]?.texto.replace("[Exemplo] ", "") || ""}
            />
          </div>
        </div>
        <p className="n-I">A pergunta já fica legível quando os dados param; nada bloqueia o clique.</p>
      </Demo>

      <Demo titulo="Alfinete novo (cai e crava)" aoTocar={() => setPinos((p) => [...p.slice(-4), { id: Date.now(), x: 60 + Math.random() * 220, y: 50 + Math.random() * 70 }])}>
        <div className="mapa-noturno" style={{ height: 160, border: "1px solid #1d2626", background: "var(--bg-map-land)" }}>
          <svg width="100%" height="160">
            {pinos.map((p, k) => (
              <Alfinete key={p.id} x={p.x} y={p.y + 30} cor={CORES_TRIPULACAO[k % 5].cor} icone={["origem", "memoria", "rumor", "pessoa", "boato"][k % 5]} cravar />
            ))}
          </svg>
        </div>
      </Demo>

      <Demo titulo="Notificação" aoTocar={() => notificar("lugar", <>Bruno fixou um alfinete: <em>A fábrica do pai</em></>)}>
        <p className="n-I">Desliza do lado direito, no topo da página.</p>
      </Demo>

      <Demo titulo="Salvar texto (selo carimba)" aoTocar={() => setSalvo((n) => n + 1)}>
        {salvo > 0 && (
          <span key={salvo} className="anim-selo-carimbo" style={{ display: "inline-block" }}>
            <Selo tipo="feito">
              <Icone id="visto" tamanho={12} /> feito
            </Selo>
          </span>
        )}
      </Demo>

      <Demo titulo="O convite (envelope abre)" aoTocar={() => setConvite((n) => n + 1)}>
        <ConviteDemo chave={convite} texto={conteudo?.convite} />
      </Demo>

      <Demo titulo="Transição de mapa (continente → Rouillac)" aoTocar={() => setTransicao((n) => n + 1)}>
        <TransicaoDemo chave={transicao} />
      </Demo>
    </div>
  );
}

function ConviteDemo({ chave }: { chave: number; texto?: string }) {
  const env = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = env.current;
    if (!el || !chave) return;
    const q = (s: string) => el.querySelector(s) as HTMLElement;
    const anims = [
      el.animate([{ transform: "translateX(-140%) rotate(-8deg)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 450, easing: "cubic-bezier(.2,.8,.3,1)", fill: "both" }),
      q(".lacre-a").animate([{ transform: "none", opacity: 1 }, { transform: "translate(-14px,40px) rotate(-40deg)", opacity: 0 }], { duration: 400, delay: 600, easing: "ease-in", fill: "both" }),
      q(".lacre-b").animate([{ transform: "none", opacity: 1 }, { transform: "translate(14px,44px) rotate(35deg)", opacity: 0 }], { duration: 400, delay: 600, easing: "ease-in", fill: "both" }),
      q(".aba").animate([{ transform: "rotateX(0deg)" }, { transform: "rotateX(180deg)" }], { duration: 450, delay: 900, easing: "ease-in-out", fill: "both" }),
      q(".carta-c").animate([{ transform: "translateY(0)" }, { transform: "translateY(-58%)" }], { duration: 500, delay: 1300, easing: "cubic-bezier(.2,.8,.3,1)", fill: "both" }),
    ];
    return () => anims.forEach((a) => a.cancel());
  }, [chave]);
  return (
    <div style={{ height: 230, display: "grid", placeItems: "end center", perspective: 800 }}>
      <div ref={env} style={{ position: "relative", width: 240, height: 150, opacity: chave ? undefined : 1 }}>
        <div className="carta-c" style={{ position: "absolute", left: 14, right: 14, top: 8, height: 130, background: "var(--paper)", color: "var(--paper-ink)", borderRadius: 2, padding: "12px 10px", textAlign: "center", zIndex: 1, boxShadow: "0 2px 6px #0006" }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 8, letterSpacing: ".25em", fontWeight: 700 }}>ROYAUME D'ENTREMONTS</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 15, margin: "6px 0" }}>Exposition Universelle</div>
          <div style={{ fontFamily: "var(--font-narrative)", fontStyle: "italic", fontSize: 11 }}>pour la Paix des Nations</div>
        </div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg,#e6d9ba,#d3c093)", borderRadius: 3, zIndex: 2, clipPath: "polygon(0 22%, 50% 62%, 100% 22%, 100% 100%, 0 100%)", boxShadow: "0 8px 18px #000a" }} />
        <div className="aba" style={{ position: "absolute", left: 0, right: 0, top: 0, height: "62%", transformOrigin: "top", zIndex: 3, background: "linear-gradient(180deg,#e9dcbd,#cdb98c)", clipPath: "polygon(0 0,100% 0,50% 100%)" }} />
        <div style={{ position: "absolute", left: "50%", top: "62%", zIndex: 4, transform: "translate(-50%,-50%)", width: 40, height: 40 }}>
          <span className="lacre-a" style={{ position: "absolute", inset: 0, clipPath: "polygon(0 0,55% 0,45% 100%,0 100%)", borderRadius: "50%", background: "radial-gradient(circle at 35% 30%,#c4363b,#9b2226 45%,#5c1214)" }} />
          <span className="lacre-b" style={{ position: "absolute", inset: 0, clipPath: "polygon(55% 0,100% 0,100% 100%,45% 100%)", borderRadius: "50%", background: "radial-gradient(circle at 35% 30%,#c4363b,#9b2226 45%,#5c1214)" }} />
        </div>
      </div>
    </div>
  );
}

function TransicaoDemo({ chave }: { chave: number }) {
  const [cont, setCont] = useState("");
  const [rou, setRou] = useState("");
  const a = useRef<HTMLDivElement>(null);
  const b = useRef<HTMLDivElement>(null);
  useEffect(() => {
    carregarSvgInterno("mapas/continente.svg").then(setCont);
    fetch(urlConteudo("mapas/rouillac/monumentos.svg"))
      .then((r) => r.text())
      .then((t) => setRou(URL.createObjectURL(new Blob([recolorirSvgNoturno(t)], { type: "image/svg+xml" }))));
  }, []);
  useEffect(() => {
    if (!chave || !a.current || !b.current) return;
    // Rouillac fica em ~(393, 792) no viewBox 2100 × 1500
    const o = "18.7% 52.8%";
    a.current.style.transformOrigin = o;
    const x = a.current.animate([{ transform: "scale(1)", opacity: 1 }, { transform: "scale(6)", opacity: 1, offset: 0.6 }, { transform: "scale(9)", opacity: 0 }], { duration: 1200, easing: "cubic-bezier(.5,0,.3,1)", fill: "both" });
    const y = b.current.animate([{ opacity: 0, transform: "scale(.6)" }, { opacity: 0, transform: "scale(.6)", offset: 0.5 }, { opacity: 1, transform: "scale(1)" }], { duration: 1200, easing: "ease-out", fill: "both" });
    return () => {
      x.cancel();
      y.cancel();
    };
  }, [chave]);
  return (
    <div className="mapa-noturno" style={{ height: 210, border: "1px solid #1d2626" }}>
      <div ref={a} style={{ position: "absolute", inset: 0 }}>
        <svg viewBox="0 0 2100 1500" preserveAspectRatio="xMidYMid slice" style={{ width: "100%", height: "100%" }} dangerouslySetInnerHTML={{ __html: cont }} />
      </div>
      <div ref={b} style={{ position: "absolute", inset: 0, opacity: 0 }}>
        {rou && <img src={rou} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
      </div>
      <div className="vinheta-escura" />
    </div>
  );
}
