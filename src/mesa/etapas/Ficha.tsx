// Capítulo IV · Ficha de registro. Storylet em páginas, uma decisão por página.
// Cada escolha é um conjunto de ramos; cada texto, um ramo que abre no lugar.
// À direita, as qualidades do personagem (insígnias) e o resumo da tripulação.
import { useState } from "react";
import { useSessao } from "../../db/sala";
import type { Personagem, Privado } from "../../db/tipos";
import { Insignia, Placa, Ramo, Selo } from "../../jogo/componentes";
import { Icone } from "../../jogo/icones";
import { Escolhas, Escrita, Gestao, Opcao, Painel } from "../pecas";
import { useVisao } from "../Casca";

const PAGINAS = [
  { id: "pais", rotulo: "País", icone: "cap-3" },
  { id: "papel", rotulo: "Papel", icone: "convidado" },
  { id: "comunidade", rotulo: "Comunidade", icone: "lente-cidades" },
  { id: "classe", rotulo: "Classe", icone: "escrever" },
  { id: "origem", rotulo: "Origem", icone: "memoria" },
  { id: "compulsao", rotulo: "Compulsão", icone: "rumor" },
  { id: "oculto", rotulo: "O oculto", icone: "boato" },
  { id: "segredo", rotulo: "Segredo", icone: "selar" },
] as const;
type IdPagina = (typeof PAGINAS)[number]["id"];

export function Ficha({ trancada }: { trancada: boolean }) {
  const { sala, meuJid } = useSessao();
  const { mestre } = useVisao();
  const lista = Object.entries(sala.jogadores).sort((a, b) => (a[1].ordem ?? 0) - (b[1].ordem ?? 0));
  const [de, setDe] = useState<string | null>(meuJid || lista[0]?.[0] || null);
  const jid = mestre ? de : meuJid;
  const [pag, setPag] = useState<IdPagina>("pais");
  if (!jid || !sala.jogadores[jid]) {
    return (
      <Gestao n={4} titulo="Ficha de registro" colunas="1fr">
        <Painel>
          <p className="n-I">Nenhum jogador cadastrado.</p>
        </Painel>
      </Gestao>
    );
  }
  return (
    <PaginaFicha jid={jid} pag={pag} setPag={setPag} trancada={trancada} escolherJogador={mestre ? setDe : null} />
  );
}

function feitas(p: Personagem, pr: Privado): Record<IdPagina, boolean> {
  const origem = p.classe ? Object.values(p.origem?.[p.classe] || {}).filter((x) => x && String(x).trim()).length : 0;
  return {
    pais: !!p.pais,
    papel: !!p.papel,
    comunidade: !!p.comunidade,
    classe: !!p.classe,
    origem: origem >= 3,
    compulsao: !!p.compulsao?.trim(),
    oculto: !!p.oculto?.trim(),
    segredo: !!pr.segredo?.trim(),
  };
}

function PaginaFicha({
  jid,
  pag,
  setPag,
  trancada,
  escolherJogador,
}: {
  jid: string;
  pag: IdPagina;
  setPag: (p: IdPagina) => void;
  trancada: boolean;
  escolherJogador: ((j: string) => void) | null;
}) {
  const { sala, conteudo: c, acoes } = useSessao();
  const p: Personagem = sala.personagens[jid] || {};
  const pr: Privado = sala.privado[jid] || {};
  const set = (campo: keyof Personagem, v: unknown) => acoes.personagem(jid, { [campo]: v ?? null });
  const [aberto, setAberto] = useState<string | null>(null);
  const alt = (k: string) => setAberto(aberto === k ? null : k);
  const classe = c.classes.find((x) => x.id === p.classe);
  const respostas: Record<string, string> = (p.classe && (p.origem?.[p.classe] as Record<string, string>)) || {};

  const TEXTOS: Record<IdPagina, { titulo: string; texto: string }> = {
    pais: { titulo: "De onde você vem?", texto: "Primeiro, a nacionalidade, como manda o regulamento da Exposição." },
    papel: { titulo: "O que faz na Exposição?", texto: "Convidado, refugiado, funcionário, ou outra coisa que não cabe no formulário." },
    comunidade: { titulo: "A que gente você pertence?", texto: "Onde você aprendeu a ser quem é." },
    classe: { titulo: "Que tipo de pessoa você é?", texto: "Marque a classe que te interessa. Não é a escolha final; é só para o mestre saber." },
    origem: { titulo: "Perguntas de origem", texto: classe ? `Três perguntas de ${classe.nome}. Se você trocar de classe, estas respostas ficam guardadas.` : "Escolha uma classe primeiro (página anterior)." },
    compulsao: { titulo: "Compulsão", texto: c.compulsao.explicacao },
    oculto: { titulo: "Ligação com o oculto", texto: c.geral.perguntaOculto },
    segredo: { titulo: "O segredo", texto: c.geral.ajudaSegredo || "Uma coisa que o seu personagem esconde de todo mundo." },
  };

  return (
    <Gestao
      n={4}
      titulo="Ficha de registro"
     
      colunas="minmax(184px, 0.4fr) minmax(0, 1.9fr) minmax(230px, 0.8fr)"
    >
      <Abas jid={jid} pag={pag} setPag={setPag} />
      <Painel titulo={TEXTOS[pag].titulo} className="pagina-ficha">
      {TEXTOS[pag].texto && <p className="n-N">{TEXTOS[pag].texto}</p>}
      {pag === "compulsao" && (
        <ul className="n-I" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
          {c.compulsao.exemplos.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {pag === "oculto" && c.geral.ajudaOculto && <p className="n-I" style={{ marginTop: 8 }}>{c.geral.ajudaOculto}</p>}

      <Escolhas grade={["pais", "papel", "comunidade", "classe"].includes(pag)}>
        {pag === "pais" &&
          c.paises.map((x) => (
            <Opcao key={x.id} nome={x.nome} descricao={x.lado} arte={c.arte[`pais-${x.id}`]} marcada={p.pais === x.id} bloqueada={trancada} aoClicar={() => set("pais", p.pais === x.id ? null : x.id)} />
          ))}
        {pag === "papel" && (
          <>
            {c.origens.map((x) => (
              <Opcao key={x.id} nome={x.nome} descricao={x.descricao} arte={c.arte[`papel-${x.id}`]} marcada={p.papel === x.id} bloqueada={trancada} aoClicar={() => set("papel", p.papel === x.id ? null : x.id)} />
            ))}
            {p.papel === "outro" && <Escrita rotulo="qual?" valor={p.papelOutro} salvar={(v) => set("papelOutro", v)} linhas={1} desabilitado={trancada} />}
          </>
        )}
        {pag === "comunidade" &&
          c.comunidades.map((x) => (
            <Opcao key={x.id} nome={x.nome} descricao={x.descricao} arte={c.arte[`comunidade-${x.id}`]} marcada={p.comunidade === x.id} bloqueada={trancada} aoClicar={() => set("comunidade", p.comunidade === x.id ? null : x.id)} />
          ))}
        {pag === "classe" &&
          c.classes.map((x) => (
            <Opcao
              key={x.id}
              nome={x.nome}
              descricao={
                <>
                  {x.fantasia.replace(/^\[Exemplo\]\s*/, "")} <span style={{ color: "var(--brass)" }}>· {x.dominios.join(" · ")}</span>
                </>
              }
              arte={c.arte[`classe-${x.id}`]}
              marcada={p.classe === x.id}
              etiqueta={x.nova ? "nova" : undefined}
              bloqueada={trancada}
              aoClicar={() => set("classe", p.classe === x.id ? null : x.id)}
            />
          ))}
        {pag === "origem" &&
          classe?.origem.map((q, k) => {
            const r = respostas[k];
            return (
              <Ramo key={classe.id + k} titulo={q} descricao={r && aberto !== `o${k}` ? <span className="n-J resposta-curta">{r}</span> : undefined} chamada={r ? undefined : "Responda aqui mesmo."} icone="memoria" estado={trancada ? "bloqueado" : r && aberto !== `o${k}` ? "feito" : "normal"} aberto={aberto === `o${k}`} aoClicar={() => alt(`o${k}`)}>
                <Escrita rotulo="sua resposta" valor={r} salvar={(v) => acoes.respostaOrigem(jid, classe.id, k, v)} desabilitado={trancada} />
              </Ramo>
            );
          })}
        {pag === "compulsao" && (
          <Ramo titulo={c.compulsao.pergunta || "A compulsão do seu personagem"} descricao={p.compulsao && aberto !== "comp" ? <span className="n-J resposta-curta">{p.compulsao}</span> : undefined} chamada={p.compulsao ? undefined : "Escreva aqui mesmo."} icone="rumor" estado={trancada ? "bloqueado" : p.compulsao && aberto !== "comp" ? "feito" : "normal"} aberto={aberto === "comp"} aoClicar={() => alt("comp")}>
            <Escrita rotulo="compulsão" valor={p.compulsao} salvar={(v) => set("compulsao", v)} linhas={2} desabilitado={trancada} />
          </Ramo>
        )}
        {pag === "oculto" && (
          <Ramo titulo="O que você viu" descricao={p.oculto && aberto !== "oc" ? <span className="n-J resposta-curta">{p.oculto}</span> : undefined} chamada={p.oculto ? undefined : "Escreva aqui mesmo."} icone="boato" estado={trancada ? "bloqueado" : p.oculto && aberto !== "oc" ? "feito" : "normal"} aberto={aberto === "oc"} aoClicar={() => alt("oc")}>
            <Escrita rotulo="a sua ligação com o oculto" valor={p.oculto} salvar={(v) => set("oculto", v)} desabilitado={trancada} />
          </Ramo>
        )}
        {pag === "segredo" && (
          <Ramo titulo="Selar o segredo" descricao={pr.segredo && aberto !== "seg" ? "Selado. Só o mestre vai ler." : "Só o mestre vai ler isto."} icone="selar" estado={trancada ? "bloqueado" : pr.segredo && aberto !== "seg" ? "feito" : "normal"} selo={<Selo tipo="privado">só o mestre vê</Selo>} aberto={aberto === "seg"} aoClicar={() => alt("seg")}>
            <Escrita rotulo="o segredo" valor={pr.segredo} salvar={(v) => acoes.privado(jid, "segredo", v || null)} desabilitado={trancada} />
          </Ramo>
        )}
      </Escolhas>
      </Painel>
      <Resumo jid={jid} pag={pag} setPag={setPag} escolherJogador={escolherJogador} />
    </Gestao>
  );
}

function valoresDe(c: ReturnType<typeof useSessao>["conteudo"], p: Personagem, pr: Privado): Record<IdPagina, string> {
  const nomeDe = (l: { id: string; nome: string }[], id?: string) => l.find((x) => x.id === id)?.nome;
  const origem = p.classe ? Object.values(p.origem?.[p.classe] || {}).filter((x) => x && String(x).trim()).length : 0;
  return {
    pais: nomeDe(c.paises, p.pais) || "—",
    papel: p.papel === "outro" ? p.papelOutro || "Outro" : nomeDe(c.origens, p.papel) || "—",
    comunidade: nomeDe(c.comunidades, p.comunidade) || "—",
    classe: nomeDe(c.classes, p.classe) || "—",
    origem: p.classe ? `${origem}/3` : "—",
    compulsao: p.compulsao?.trim() ? "escrita" : "—",
    oculto: p.oculto?.trim() ? "escrita" : "—",
    segredo: pr.segredo?.trim() ? "selado" : "—",
  };
}

/** As páginas da ficha como abas verticais, à esquerda. */
function Abas({ jid, pag, setPag }: { jid: string; pag: IdPagina; setPag: (p: IdPagina) => void }) {
  const { sala } = useSessao();
  const ok = feitas(sala.personagens[jid] || {}, sala.privado[jid] || {});
  return (
    <Painel className="painel-abas">
      <ol className="passos" aria-label="páginas da ficha">
        {PAGINAS.map((x) => (
          <li key={x.id} className={`passo ${ok[x.id] ? "feita" : "pendente"} ${x.id === pag ? "atual" : ""}`}>
            <button type="button" onClick={() => setPag(x.id)} aria-current={x.id === pag ? "step" : undefined}>
              <span className="aba-ico">
                <Insignia icone={x.icone} tamanho={32} ativa={x.id === pag} />
                {ok[x.id] && (
                  <span className="check-bola" aria-label="feito">
                    <Icone id="visto" tamanho={9} />
                  </span>
                )}
              </span>
              <span className="nome">{x.rotulo}</span>
            </button>
          </li>
        ))}
      </ol>
    </Painel>
  );
}

/** As qualidades do personagem e a tripulação ao vivo, sempre à vista, à direita. */
function Resumo({ jid, pag, setPag, escolherJogador }: { jid: string; pag: IdPagina; setPag: (p: IdPagina) => void; escolherJogador: ((j: string) => void) | null }) {
  const i = PAGINAS.findIndex((x) => x.id === pag);
  const { sala, conteudo: c, meuJid } = useSessao();
  const { mestre } = useVisao();
  const p: Personagem = sala.personagens[jid] || {};
  const pr: Privado = sala.privado[jid] || {};
  const nomeDe = (l: { id: string; nome: string }[], id?: string) => l.find((x) => x.id === id)?.nome;
  const valores = valoresDe(c, p, pr);
  // o mestre vê todos (e pode abrir a ficha de qualquer um pelo olho); o jogador, só os outros
  const outros = Object.entries(sala.jogadores)
    .filter(([id]) => !!escolherJogador || id !== jid)
    .sort((a, b) => (a[1].ordem ?? 0) - (b[1].ordem ?? 0));
  return (
    <Painel titulo="Resumo" className="painel-resumo">
      <dl className="dados-ficha">
        {PAGINAS.map((x) => (
          <div key={x.id}>
            <dt className="n-L">{x.rotulo}</dt>
            <dd>{valores[x.id]}</dd>
          </div>
        ))}
        <div>
          <dt className="n-L">Ancestralidade</dt>
          <dd>{[p.ancestralidade, p.ancestralidade2].filter(Boolean).join(" + ") || "—"}</dd>
        </div>
        <div>
          <dt className="n-L">Subclasse</dt>
          <dd>{p.subclasse || "—"}</dd>
        </div>
      </dl>
      <details className="tripulacao-viva">
        <summary className="n-L">a tripulação, ao vivo</summary>
      <ul className="lista-simples">
        {outros.map(([id, j]) => {
          const q = sala.personagens[id] || {};
          const resumo = [nomeDe(c.paises, q.pais), q.papel === "outro" ? q.papelOutro : nomeDe(c.origens, q.papel), nomeDe(c.classes, q.classe)].filter(Boolean).join(" · ");
          return (
            <li key={id} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <span className="cabeca-cor" style={{ background: j.cor }} />
              <span style={{ fontFamily: "var(--font-display)", fontSize: 14 }}>{j.nome}</span>
              <span className="n-I" style={{ fontSize: 13, flex: 1, textAlign: "right" }}>
                {resumo || "em branco"}
              </span>
              {escolherJogador && (
                <button type="button" className={`olho-mestre ${id === jid ? "ligado" : ""}`} onClick={() => escolherJogador(id)} title={id === jid ? "Você está vendo esta ficha" : `Ver a ficha de ${j.nome} (só o mestre)`} aria-label={`Ver a ficha de ${j.nome}`}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              )}
            </li>
          );
        })}
      </ul>
      </details>
      {(mestre || jid === meuJid) && <p className="n-I" style={{ fontSize: 12, marginTop: 10 }}>O segredo nunca aparece para os outros jogadores.</p>}
      <div className="nav-ficha">
        {i > 0 ? (
          <button className="link" onClick={() => setPag(PAGINAS[i - 1].id)}>
            ◂ anterior
          </button>
        ) : (
          <span />
        )}
        {i < PAGINAS.length - 1 ? <Placa onClick={() => setPag(PAGINAS[i + 1].id)}>Próxima página ▸</Placa> : <Placa onClick={() => setPag("pais")}>Voltar ao início</Placa>}
      </div>
    </Painel>
  );
}
