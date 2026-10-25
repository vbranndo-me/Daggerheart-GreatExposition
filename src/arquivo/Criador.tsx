// O criador de personagem (pré-criação): comunidade → ancestralidade → classe → subclasse → resumo.
// Cada passo é uma tela cheia (grade à esquerda, detalhe grande à direita). As escolhas vão direto para
// personagens/<jid>, o mesmo nó da etapa 4, então a sessão abre com tudo preenchido. Atributos, cartas e equipamento ficam no Foundry.
import { useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import "../jogo/jogo.css";
import "../jogo/jogo-ajustes.css";
import "../mesa/mesa.css";
import "./arquivo.css";
import type { Conteudo } from "../conteudo";
import { SessaoCtx, type Sessao } from "../db/sala";
import type { Personagem } from "../db/tipos";
import { ComTooltip, Janela, MolduraTela, PlaceholderArte, Placa, Ramo, Selo, SeloExposicao } from "../jogo/componentes";
import { BotaoHextech } from "../jogo/hextech";
import { Icone } from "../jogo/icones";
import { BotaoAmbiente, FundoVivo } from "../jogo/FundoVivo";
import { Opcao } from "../mesa/pecas";
import { carregarArquivo, type DadosArquivo } from "./dados";
import { idArte } from "./base";

type PassoId = "comunidade" | "ancestralidade" | "classe" | "subclasse" | "resumo";
const PASSOS: { id: PassoId; rotulo: string }[] = [
  { id: "comunidade", rotulo: "Comunidade" },
  { id: "ancestralidade", rotulo: "Ancestralidade" },
  { id: "classe", rotulo: "Classe" },
  { id: "subclasse", rotulo: "Subclasse" },
  { id: "resumo", rotulo: "Resumo" },
];
const ICONES_PASSO: Record<PassoId, string> = { comunidade: "lente-cidades", ancestralidade: "pessoa", classe: "escrever", subclasse: "memoria", resumo: "selar" };
const NOMES_GRUPO: Record<string, string> = { basico: "Livro básico", "hope-fear": "Hope & Fear" };

interface Item {
  id: string;
  nome: string;
  descricao?: string;
  grupo?: string;
  etiqueta?: string;
  imagem?: string | null;
}
const limpa = (t?: string) => (t || "").replace(/^\[Exemplo\]\s*/, "");

/** O que vem antes de tudo: quem é você? (a mesma escolha de nome da etapa 0, sem depender do mestre) */
export function PortaoIdentidade({ escolher }: { escolher: (jid: string) => Promise<void> }) {
  const s = useContext(SessaoCtx)!;
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const lista = Object.entries(s.sala.jogadores).sort((a, b) => (a[1].ordem ?? 0) - (b[1].ordem ?? 0));
  return (
    <div className="jogo portao-identidade" data-paleta="ardosia">
      <Janela tipo="pesada" className="portao-janela">
        <div className="n-L" style={{ color: "var(--brass)" }}>
          Antes de começar
        </div>
        <h2 className="n-C">Quem é você?</h2>
        <p className="n-N">Escolha o seu nome na lista. O que você marcar aqui já chega na sessão.</p>
        <div className="ramos portao-lista">
          {lista.map(([jid, j]) => {
            const aBordo = !!j.uid && j.uid !== s.uid && !!j.online;
            return (
              <Ramo
                key={jid}
                titulo={j.nome}
                descricao={aBordo ? "Já está com este nome em outro lugar." : undefined}
                icone="pessoa"
                corMedalhao={j.cor}
                estado={aBordo ? "bloqueado" : escolhido === jid ? "selecionado" : "normal"}
                aoClicar={() => setEscolhido(jid)}
              />
            );
          })}
          {!lista.length && <p className="n-I">O mestre ainda não cadastrou os nomes. Espere um pouquinho.</p>}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
          <BotaoHextech
            disabled={!escolhido || ocupado}
            onClick={async () => {
              if (!escolhido) return;
              setOcupado(true);
              try {
                await escolher(escolhido);
              } finally {
                setOcupado(false);
              }
            }}
          >
            Assumir este nome
          </BotaoHextech>
        </div>
      </Janela>
    </div>
  );
}

export function Criador({ conteudo }: { conteudo: Conteudo | null }) {
  const s = useContext(SessaoCtx);
  const [dados, setDados] = useState<DadosArquivo | null>(null);
  useEffect(() => {
    carregarArquivo().then(setDados);
  }, []);
  if (!conteudo || !dados)
    return (
      <div className="jogo entrada-jogo" data-paleta="ardosia">
        <div className="carregando">Abrindo o criador…</div>
      </div>
    );
  if (!s) return <SemSala />;
  return <CriadorComSala s={s} conteudo={conteudo} dados={dados} />;
}

/** Sem a sala no link não há onde gravar: explica como entrar. */
function SemSala() {
  return (
    <div className="jogo entrada-jogo" data-paleta="ardosia">
      <Janela tipo="pesada">
        <div className="n-L" style={{ color: "var(--brass)" }}>
          O criador de personagem
        </div>
        <h2 className="n-C">Falta o link da sala</h2>
        <p className="n-N">As suas escolhas ficam guardadas na sala da sessão. Peça ao mestre o link da sala (o que termina em /arquivo) e abra por ele.</p>
        <p className="n-I">Sem a sala, o Arquivo continua aberto só para leitura.</p>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
          <Placa onClick={() => (location.hash = "#/arquivo")}>Voltar ao Arquivo</Placa>
        </div>
      </Janela>
    </div>
  );
}

function CriadorComSala({ s, conteudo, dados }: { s: Sessao; conteudo: Conteudo; dados: DadosArquivo }) {
  const { sala, meuJid, mestre, acoes } = s;
  const jid = meuJid;
  const p: Personagem = (jid && sala.personagens[jid]) || {};
  const trancado = !!sala.meta.criadorTrancado;
  const [passo, setPasso] = useState<PassoId>("comunidade");
  const [mista, setMista] = useState(!!p.ancestralidade2);
  const [ver, setVer] = useState<string | null>(null); // o item aberto no detalhe
  const [outra, setOutra] = useState("");
  const jogador = jid ? sala.jogadores[jid] : null;
  const salvar = (campos: Partial<Record<keyof Personagem, unknown>>) => jid && !trancado && acoes.personagem(jid, campos as never);

  // ao chegar num passo, o detalhe abre na escolha que já existe (se houver); nada fica "marcado" sem estar aberto
  useEffect(() => setVer(null), [passo]);
  useEffect(() => setOutra(passo === "classe" ? p.classeOutra || "" : passo === "subclasse" ? (!p.classeLivro && !conteudo.classes.find((c) => c.id === p.classe)?.nova && p.classeOutra ? p.subclasse || "" : "") : ""), [passo]);

  const classeObj = conteudo.classes.find((c) => c.id === p.classe);
  const nomeClasse = p.classeOutra ? p.classeOutra : classeObj?.nome;
  const nomeComunidade = conteudo.comunidades.find((c) => c.id === p.comunidade)?.nome;
  // a ancestralidade é guardada pelo NOME (legível na Mesa e nas exportações)
  const nomeAnc = (nome?: string) => nome;
  const ancestralidade = [nomeAnc(p.ancestralidade), p.ancestralidade2 ? nomeAnc(p.ancestralidade2) : null].filter(Boolean).join(" + ");
  const feito: Record<PassoId, boolean> = {
    comunidade: !!p.comunidade,
    ancestralidade: !!p.ancestralidade && (!mista || !!p.ancestralidade2),
    classe: !!nomeClasse,
    subclasse: !!p.subclasse,
    resumo: !!p.criadorPronto,
  };
  const iPasso = PASSOS.findIndex((x) => x.id === passo);
  const proximo = () => iPasso < PASSOS.length - 1 && setPasso(PASSOS[iPasso + 1].id);

  if (mestre)
    return (
      <div className="jogo entrada-jogo" data-paleta="ardosia">
        <Janela tipo="pesada">
          <h2 className="n-C">O criador é dos jogadores</h2>
          <p className="n-N">O mestre acompanha as escolhas de todos na Mesa, aba Pessoas, em "Pré-criação".</p>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
            <Placa onClick={() => (location.hash = `#/s/${s.salaId}${s.chave ? `?m=${s.chave}` : ""}`)}>Voltar à sala</Placa>
          </div>
        </Janela>
      </div>
    );
  if (!jid || !jogador) return <div className="jogo criador-raiz" data-paleta="ardosia" />;

  // ---- as listas de cada passo ----
  const comunidades: Item[] = conteudo.comunidades.map((c) => ({ id: c.id, nome: c.nome, descricao: limpa(c.descricao), grupo: (c as { grupo?: string }).grupo, imagem: conteudo.arte[idArte("comunidades", c.id)] }));
  const ancestralidades: Item[] = dados.ancestralidades.map((a) => ({ id: a.id, nome: a.nome, descricao: a.descricao, imagem: a.imagem || conteudo.arte[idArte("ancestralidades", a.id)] }));
  const novas = conteudo.classes.filter((c) => c.nova);
  const livro = conteudo.classes.filter((c) => !c.nova);
  const classes: Item[] = [
    ...novas.map((c) => ({ id: c.id, nome: c.nome, descricao: limpa(c.fantasia), etiqueta: "nova", imagem: conteudo.arte[idArte("classes", c.id)] })),
    { id: "__livro", nome: "Classe do livro básico", descricao: "Uma das classes do livro básico. Aqui só aparecem os nomes." },
    { id: "__outra", nome: "Outra", descricao: "Playtest ou homebrew. Escreva o nome." },
  ];
  const subclasses: Item[] = (classeObj?.subclasses || []).map((x, i) => ({ id: `sub-${i}`, nome: x.nome, descricao: limpa(x.linha), imagem: conteudo.arte[`subclasse-${classeObj?.id}-${i + 1}`] }));

  const escolhaDoPasso = (): string | null => {
    if (passo === "comunidade") return p.comunidade ?? null;
    if (passo === "ancestralidade") return ancestralidades.find((x) => x.nome === p.ancestralidade)?.id ?? null;
    if (passo === "classe") return p.classeOutra ? "__outra" : p.classeLivro ? "__livro" : p.classe ?? null;
    if (passo === "subclasse") return subclasses.find((x) => x.nome === p.subclasse)?.id ?? null;
    return null;
  };
  const marcado = (id: string) => {
    if (passo === "ancestralidade") {
      const n = ancestralidades.find((x) => x.id === id)?.nome;
      return !!n && (p.ancestralidade === n || p.ancestralidade2 === n);
    }
    return escolhaDoPasso() === id;
  };

  const escolher = (id: string) => {
    if (passo === "comunidade") {
      salvar({ comunidade: id });
      proximo();
    } else if (passo === "ancestralidade") {
      const n = ancestralidades.find((x) => x.id === id)?.nome;
      if (!n) return;
      if (!mista) {
        salvar({ ancestralidade: n, ancestralidade2: null });
        proximo();
      } else if (p.ancestralidade === n) salvar({ ancestralidade: p.ancestralidade2 ?? null, ancestralidade2: null });
      else if (p.ancestralidade2 === n) salvar({ ancestralidade2: null });
      else if (!p.ancestralidade) salvar({ ancestralidade: n });
      else salvar({ ancestralidade2: n });
    } else if (passo === "classe") {
      if (id !== "__livro" && id !== "__outra") {
        salvar({ classe: id, classeLivro: false, classeOutra: null, subclasse: null });
        proximo();
      }
    } else if (passo === "subclasse") {
      const sub = subclasses.find((x) => x.id === id);
      if (sub) {
        salvar({ subclasse: sub.nome });
        proximo();
      }
    }
  };

  const itens = passo === "comunidade" ? comunidades : passo === "ancestralidade" ? ancestralidades : passo === "classe" ? classes : passo === "subclasse" ? subclasses : [];
  const aberto = itens.find((x) => x.id === (ver ?? escolhaDoPasso())) || null;
  const grupos = [...new Set(itens.map((i) => i.grupo || ""))];

  return (
    <div className="jogo criador-raiz" data-paleta="ardosia">
      <div className="fundo-gestao" aria-hidden="true" />
      <FundoVivo />
      <header className="hud criador-topo">
        <button className="capitulo" onClick={() => (location.hash = `#/s/${s.salaId}/arquivo`)} aria-label="Voltar ao Arquivo" title="Voltar ao Arquivo">
          <SeloExposicao />
          <span className="cap-texto">
            <span className="cap-num">O CRIADOR</span>
            <span className="cap-nome">Meu personagem</span>
          </span>
        </button>
        <div className="objetivo com-passos">
          <ol className="stepper-hud" aria-label="passos do criador">
            {PASSOS.map((x) => {
              const estado = x.id === passo ? "mesa" : feito[x.id] ? "feito" : "aberto";
              const valor = { comunidade: nomeComunidade, ancestralidade, classe: nomeClasse, subclasse: p.subclasse, resumo: undefined }[x.id];
              return (
                <li key={x.id} className={estado}>
                  <ComTooltip titulo={x.rotulo} texto={valor ? `Escolhido: ${valor}` : x.id === "resumo" ? "O cartão do seu personagem." : "Ainda não escolhido."} icone={ICONES_PASSO[x.id]}>
                    <button type="button" className={`passo-hud ${estado}`} onClick={() => setPasso(x.id)} aria-current={x.id === passo ? "step" : undefined} aria-label={`${x.rotulo}${feito[x.id] ? " (feito)" : ""}`}>
                      <Icone id={feito[x.id] && x.id !== passo ? "visto" : ICONES_PASSO[x.id]} tamanho={18} />
                    </button>
                  </ComTooltip>
                </li>
              );
            })}
          </ol>
          <div className="objetivo-bloco">
            <span className="n-L">passo</span>
            <span className="texto">{PASSOS[iPasso].rotulo}</span>
          </div>
        </div>
        <div className="criador-acoes-topo">
          <BotaoAmbiente />
          <button className="link pequeno-link" onClick={() => (location.hash = `#/s/${s.salaId}/arquivo`)}>
            Voltar ao Arquivo
          </button>
        </div>
      </header>

      {trancado && <div className="criador-aviso">O mestre trancou as escolhas. Você pode ler, mas não mudar.</div>}

      {passo !== "resumo" ? (
        <main className="criador-tela">
          <section className="criador-grade">
            <div className="criador-grade-cab">
              <h1 className="n-C">{PASSOS[iPasso].rotulo}</h1>
              {passo === "ancestralidade" && (
                <label className="interruptor">
                  <input
                    type="checkbox"
                    checked={mista}
                    disabled={trancado}
                    onChange={(e) => {
                      setMista(e.target.checked);
                      if (!e.target.checked && p.ancestralidade2) salvar({ ancestralidade2: null });
                    }}
                  />
                  <span>Ancestralidade mista</span>
                  <span className="n-I">(a 1ª habilidade de uma e a 2ª da outra)</span>
                </label>
              )}
              {passo === "subclasse" && !nomeClasse && <p className="n-I">Escolha uma classe primeiro.</p>}
            </div>
            {grupos.map((g) => (
              <div key={g}>
                {g && <div className="selecao-grupo n-L">{NOMES_GRUPO[g] || g}</div>}
                <div className="ramos grade-opcoes criador-cartoes">
                  {itens
                    .filter((i) => (i.grupo || "") === g)
                    .map((it) => (
                      <Opcao key={it.id} nome={it.nome} descricao={it.descricao} arte={it.imagem} marcada={marcado(it.id)} etiqueta={it.etiqueta} rotuloMarca="sua escolha" aoClicar={() => setVer(it.id)} />
                    ))}
                </div>
              </div>
            ))}
            {passo === "subclasse" && classeObj === undefined && p.classeOutra && (
              <div className="detalhe-livre">
                <p className="n-N">Para "{p.classeOutra}", escreva o nome da subclasse.</p>
                <CampoLivre valor={outra} aoMudar={setOutra} rotulo="subclasse" desabilitado={trancado} aoUsar={() => { salvar({ subclasse: outra.trim() || null }); proximo(); }} />
              </div>
            )}
          </section>

          <aside className="criador-detalhe">
            {aberto ? (
              <Detalhe
                item={aberto}
                passo={passo}
                marcada={marcado(aberto.id)}
                trancado={trancado}
                aoEscolher={() => escolher(aberto.id)}
                extra={
                  passo === "classe" && aberto.id === "__livro" ? (
                    <div className="lista-livro">
                      <div className="n-L">escolha uma</div>
                      <div className="ramos">
                        {livro.map((c) => (
                          <Ramo
                            key={c.id}
                            titulo={c.nome}
                            icone="escrever"
                            estado={p.classeLivro && p.classe === c.id ? "selecionado" : trancado ? "bloqueado" : "normal"}
                            aoClicar={() => {
                              salvar({ classe: c.id, classeLivro: true, classeOutra: null, subclasse: null });
                              proximo();
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : passo === "classe" && novas.some((c) => c.id === aberto.id) ? (
                    <button className="link" onClick={() => (location.hash = `#/s/${s.salaId}/arquivo/classe/${aberto.id}`)}>
                      Ver a ficha completa ▸
                    </button>
                  ) : passo === "classe" && aberto.id === "__outra" ? (
                    <CampoLivre
                      valor={outra}
                      aoMudar={setOutra}
                      rotulo="nome da classe"
                      desabilitado={trancado}
                      aoUsar={() => {
                        salvar({ classe: null, classeLivro: false, classeOutra: outra.trim() || null, subclasse: null });
                        proximo();
                      }}
                    />
                  ) : null
                }
                semBotao={passo === "classe" && (aberto.id === "__livro" || aberto.id === "__outra")}
              />
            ) : (
              <div className="detalhe-vazio">
                <Icone id="info" tamanho={22} />
                <p className="n-N">Clique num cartão para ver o detalhe.</p>
              </div>
            )}
          </aside>
        </main>
      ) : (
        <main className="criador-resumo">
          <div className="resumo-layout">
            <Janela tipo="pesada" className="cartao-personagem">
              <div className="n-L" style={{ color: "var(--carmim-hi)" }}>
                o seu personagem
              </div>
              <h1 className="n-T">{jogador.nome}</h1>
              <dl className="qualidades-grandes">
                <Qual rotulo="Comunidade" valor={nomeComunidade} aoClicar={() => setPasso("comunidade")} />
                <Qual rotulo="Ancestralidade" valor={ancestralidade || undefined} aoClicar={() => setPasso("ancestralidade")} />
                <Qual rotulo="Classe" valor={nomeClasse} aoClicar={() => setPasso("classe")} />
                <Qual rotulo="Subclasse" valor={p.subclasse} aoClicar={() => setPasso("subclasse")} />
              </dl>
              <p className="n-I resumo-nota">O resto (atributos, cartas e equipamento) é feito no Foundry, e a história do personagem é montada na sessão.</p>
            </Janela>
            <RetratoPersonagem
              retrato={p.retrato}
              placeholder={conteudo.arte["retrato-placeholder"]}
              cor={jogador.cor}
              inicial={jogador.nome.slice(0, 1)}
              desabilitado={trancado}
              aoMudar={(v) => salvar({ retrato: v })}
            />
          </div>
          <div className="resumo-acao">
            {p.criadorPronto ? (
              <>
                <Selo tipo="feito">pronto</Selo>
                <span className="n-N">Até a sessão zero.</span>
                <button className="link" onClick={() => (location.hash = `#/s/${s.salaId}/arquivo`)}>
                  Voltar ao Arquivo
                </button>
              </>
            ) : (
              <BotaoHextech grande disabled={trancado || !(feito.comunidade && feito.ancestralidade && feito.classe && feito.subclasse)} onClick={() => salvar({ criadorPronto: true })}>
                Pronto
              </BotaoHextech>
            )}
          </div>
        </main>
      )}

      <footer className="criador-qualidades" aria-label="seu personagem">
        <span className="n-L">Seu personagem</span>
        <ul>
          <li className={nomeComunidade ? "ok" : ""}>◉ {nomeComunidade || "comunidade"}</li>
          <li className={ancestralidade ? "ok" : ""}>◉ {ancestralidade || "ancestralidade"}</li>
          <li className={nomeClasse ? "ok" : ""}>◉ {nomeClasse || "classe"}</li>
          <li className={p.subclasse ? "ok" : ""}>◉ {p.subclasse || "subclasse"}</li>
        </ul>
      </footer>
      <MolduraTela topo={56} />
    </div>
  );
}

/** Reduz a imagem escolhida para um retrato 3:4 pequeno (cabe no banco, sem precisar de armazenamento de arquivos). */
function reduzir(arquivo: File): Promise<string> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      const W = 300;
      const H = 400;
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const g = c.getContext("2d")!;
      const k = Math.max(W / img.width, H / img.height); // cobre o quadro, cortando o excesso
      const w = img.width * k;
      const h = img.height * k;
      g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      URL.revokeObjectURL(url);
      res(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rej(new Error("imagem inválida"));
    };
    img.src = url;
  });
}

/** O retrato do personagem: opcional. Sem imagem, aparece o placeholder (a arte `retrato-placeholder`, ou o monograma). */
function RetratoPersonagem({ retrato, placeholder, cor, inicial, desabilitado, aoMudar }: { retrato?: string; placeholder?: string; cor: string; inicial: string; desabilitado: boolean; aoMudar: (v: string | null) => void }) {
  const [erro, setErro] = useState<string | null>(null);
  return (
    <Janela tipo="pesada" className="retrato-card">
      <div className="retrato-quadro" style={!retrato && !placeholder ? { background: `radial-gradient(circle at 45% 40%, ${cor}, #161a26 120%)` } : undefined}>
        {retrato ? <img src={retrato} alt="Retrato do personagem" /> : placeholder ? <img src={placeholder} alt="" /> : <span className="retrato-inicial">{inicial}</span>}
      </div>
      <div className="retrato-rodape">
        <div className="retrato-acoes">
          <label className={`btn-pequeno ${desabilitado ? "desligado" : ""}`}>
            {retrato ? "Trocar a imagem" : "Enviar uma imagem"}
            <input
              type="file"
              accept="image/*"
              hidden
              disabled={desabilitado}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                if (!f.type.startsWith("image/")) return setErro("Escolha um arquivo de imagem.");
                try {
                  setErro(null);
                  aoMudar(await reduzir(f));
                } catch {
                  setErro("Não deu para ler essa imagem.");
                }
              }}
            />
          </label>
          {retrato && !desabilitado && (
            <button className="link perigo" onClick={() => aoMudar(null)}>
              remover
            </button>
          )}
        </div>
        <span className="n-I">{erro || "Opcional."}</span>
      </div>
    </Janela>
  );
}

function Qual({ rotulo, valor, aoClicar }: { rotulo: string; valor?: string; aoClicar: () => void }) {
  return (
    <button className={`qual-grande ${valor ? "ok" : ""}`} onClick={aoClicar}>
      <dt className="n-L">{rotulo}</dt>
      <dd>{valor || "ainda não escolhida"}</dd>
    </button>
  );
}

function CampoLivre({ valor, aoMudar, rotulo, aoUsar, desabilitado }: { valor: string; aoMudar: (v: string) => void; rotulo: string; aoUsar: () => void; desabilitado?: boolean }) {
  return (
    <form
      className="adicionar-linha campo-livre"
      onSubmit={(e) => {
        e.preventDefault();
        if (valor.trim() && !desabilitado) aoUsar();
      }}
    >
      <input aria-label={rotulo} placeholder={rotulo} value={valor} onChange={(e) => aoMudar(e.target.value)} maxLength={60} disabled={desabilitado} />
      <button type="submit" className="btn-pequeno" disabled={!valor.trim() || desabilitado}>
        Usar
      </button>
    </form>
  );
}

function Detalhe({
  item,
  passo,
  marcada,
  trancado,
  aoEscolher,
  extra,
  semBotao,
}: {
  item: Item;
  passo: PassoId;
  marcada: boolean;
  trancado: boolean;
  aoEscolher: () => void;
  extra?: ReactNode;
  semBotao?: boolean;
}) {
  const rotulo = useMemo(() => (item.grupo ? NOMES_GRUPO[item.grupo] || item.grupo : PASSOS.find((x) => x.id === passo)?.rotulo), [item, passo]);
  return (
    <div className="detalhe-criador">
      <div className="detalhe-retrato-criador">
        <span className="retrato-34">{item.imagem ? <img src={item.imagem} alt="" /> : <PlaceholderArte id={item.nome} monograma={item.nome.slice(0, 1)} />}</span>
      </div>
      <div className="detalhe-texto-criador">
        <div className="n-L" style={{ color: "var(--brass)" }}>
          {rotulo}
        </div>
        <h2 className="n-T titulo-detalhe">{item.nome}</h2>
        {item.descricao && <p className="n-N">{item.descricao}</p>}
        {extra}
        {!semBotao && (
          <div className="detalhe-acao-criador">
            <BotaoHextech grande disabled={trancado} onClick={aoEscolher}>
              {marcada ? (passo === "ancestralidade" ? `Tirar ${item.nome}` : `${item.nome} (escolhida)`) : `Escolher ${item.nome}`}
            </BotaoHextech>
          </div>
        )}
      </div>
    </div>
  );
}
