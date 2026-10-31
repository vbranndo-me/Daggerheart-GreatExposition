// Capítulo III · Ficha de registro. Storylet em páginas, uma decisão por página.
// Cada escolha é um conjunto de ramos; cada texto, um ramo que abre no lugar.
// O Signoff encerra o registro com uma revisão das escolhas.
import { useId, useState } from "react";
import { useSessao } from "../../db/sala";
import type { Personagem, Privado } from "../../db/tipos";
import { Placa, Selo } from "../../jogo/componentes";
import { Icone } from "../../jogo/icones";
import { Gestao, Painel, TextoVivo } from "../pecas";
import { useVisao } from "../Casca";

import { SelecaoFicha, type AcaoFicha } from "./SelecaoFicha";
import { Origem } from "./Origem";
import "./ficha-registro.css";

const PAGINAS = [
  { id: "pais", rotulo: "País", icone: "cap-3" },
  { id: "papel", rotulo: "Papel", icone: "convidado" },
  { id: "comunidade", rotulo: "Comunidade", icone: "lente-cidades" },
  { id: "ancestralidade", rotulo: "Ancestralidade", icone: "pessoa" },
  { id: "classe", rotulo: "Classe", icone: "escrever" },
  { id: "subclasse", rotulo: "Subclasse", icone: "memoria" },
  { id: "origem", rotulo: "Origem", icone: "memoria" },
  { id: "compulsao", rotulo: "Compulsão", icone: "rumor" },
  { id: "oculto", rotulo: "O oculto", icone: "boato" },
  { id: "segredo", rotulo: "Segredo", icone: "selar" },
  { id: "signoff", rotulo: "Signoff", icone: "visto" },
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
      <Gestao n={3} titulo="Ficha de registro" colunas="1fr">
        <Painel>
          <p className="n-I">Nenhum jogador cadastrado.</p>
        </Painel>
      </Gestao>
    );
  }
  return (
    <PaginaFicha key={jid} jid={jid} pag={pag} setPag={setPag} trancada={trancada} escolherJogador={mestre ? setDe : null} />
  );
}

function feitas(p: Personagem, pr: Privado): Record<IdPagina, boolean> {
  const origem = p.classe ? Object.values(p.origem?.[p.classe] || {}).filter((x) => x && String(x).trim()).length : 0;
  return {
    pais: !!p.pais,
    papel: !!p.papel,
    comunidade: !!p.comunidade,
    ancestralidade: !!p.ancestralidade,
    classe: !!(p.classe || p.classeOutra),
    subclasse: !!p.subclasse,
    origem: origem >= 3,
    compulsao: !!p.compulsao?.trim(),
    oculto: !!p.oculto?.trim(),
    segredo: !!pr.segredo?.trim(),
    signoff: !!p.registroConfirmado,
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
  const [acaoEscolha, setAcaoEscolha] = useState<AcaoFicha | null>(null);
  const selecao = ["pais", "papel", "comunidade", "ancestralidade", "classe", "subclasse"].includes(pag);
  const proxima = () => setPag(PAGINAS[Math.min(PAGINAS.length - 1, PAGINAS.findIndex((x) => x.id === pag) + 1)].id);
  const classe = c.classes.find((x) => x.id === p.classe);
  const respostas: Record<string, string> = (p.classe && (p.origem?.[p.classe] as Record<string, string>)) || {};

  const TEXTOS: Record<IdPagina, { titulo: string; texto: string }> = {
    pais: { titulo: "De onde você vem?", texto: "Primeiro, a nacionalidade, como manda o regulamento da Exposição." },
    papel: { titulo: "O que faz na Exposição?", texto: "Convidado, refugiado, funcionário, ou outra coisa que não cabe no formulário." },
    comunidade: { titulo: "A que gente você pertence?", texto: "Onde você aprendeu a ser quem é." },
    classe: { titulo: "Que tipo de pessoa você é?", texto: "Conheça os domínios e habilidades antes de escolher sua classe." },
    ancestralidade: { titulo: "Ancestralidade", texto: "Escolha sua ancestralidade e conheça suas habilidades." },
    subclasse: { titulo: "Escolha o seu caminho", texto: "Conheça as habilidades de cada subclasse e escolha a sua." },
    origem: { titulo: "Perguntas de origem", texto: classe ? `Três perguntas de ${classe.nome}. Se você trocar de classe, estas respostas ficam guardadas.` : "Escolha uma classe na aba Classe para responder às perguntas de origem." },
    compulsao: { titulo: "Compulsão", texto: c.compulsao.explicacao },
    oculto: { titulo: "Ligação com o oculto", texto: c.geral.perguntaOculto },
    signoff: { titulo: "Signoff", texto: "Revise o registro antes de confirmar sua ficha." },
    segredo: { titulo: "O segredo", texto: c.geral.ajudaSegredo || "Uma coisa que o seu personagem esconde de todo mundo." },
  };

  return (
    <Gestao
      n={3}
      titulo="Ficha de registro"
     
      semMoldura
      className="ficha-registro"
      colunas="minmax(0, 1fr)"
      rodape={<div className="registro-nav">
        <button className="link" disabled={pag === "pais"} onClick={() => setPag(PAGINAS[Math.max(0, PAGINAS.findIndex((x) => x.id === pag) - 1)].id)}>Anterior</button>
        <span className="n-I">{PAGINAS.findIndex((x) => x.id === pag) + 1} / {PAGINAS.length}</span>
        {selecao ? <Placa disabled={trancada || !acaoEscolha || acaoEscolha.desabilitada} onClick={() => acaoEscolha?.executar()}>{acaoEscolha?.rotulo || "Escolher"}</Placa> : pag !== "signoff" ? <Placa onClick={proxima}>Próxima etapa</Placa> : <Placa disabled={trancada || !!p.registroConfirmado} onClick={() => acoes.personagem(jid, { registroConfirmado: true })}>{p.registroConfirmado ? "Ficha confirmada" : "Confirmar ficha"}</Placa>}
      </div>}
    >
      {escolherJogador && <div className="registro-jogador"><label className="n-L" htmlFor="registro-jogador">Ficha de</label><select id="registro-jogador" value={jid} onChange={(e) => escolherJogador(e.target.value)}>{Object.entries(sala.jogadores).map(([id, j]) => <option key={id} value={id}>{j.nome}</option>)}</select></div>}
      <Abas jid={jid} pag={pag} setPag={setPag} />
      <Painel titulo={selecao ? undefined : TEXTOS[pag].titulo} className={`pagina-ficha ${selecao ? "com-selecao" : ""}`}>
      {pag === "signoff" ? <Signoff jid={jid} setPag={setPag} /> : ["pais", "papel", "comunidade", "ancestralidade", "classe", "subclasse"].includes(pag) ? (
        <SelecaoFicha key={jid + pag} jid={jid} pagina={pag as "pais" | "papel" | "comunidade" | "ancestralidade" | "classe" | "subclasse"} titulo={TEXTOS[pag].titulo} trancada={trancada} aoAcao={setAcaoEscolha} aoProximo={proxima} />
      ) : <div className="registro-narrativa">
        {pag === "origem" && <Origem jid={jid} classe={classe} respostas={respostas} trancada={trancada} aoEscolherClasse={() => setPag("classe")} aoAvancar={proxima} />}
        {pag === "compulsao" && <div className="registro-escrita-layout">
          <PerguntaRegistro pergunta={c.compulsao.pergunta || "O que seu personagem n?o consegue evitar?"} valor={p.compulsao} salvar={(v) => set("compulsao", v)} trancada={trancada} linhas={7} />
          <aside className="registro-inspiracao"><h3 className="n-L">Compuls?o</h3><p className="n-I">{c.compulsao.explicacao}</p>{!!c.compulsao.exemplos.length && <><h3 className="n-L">Exemplos</h3><ul>{c.compulsao.exemplos.map((e) => <li key={e} className="n-I">{e}</li>)}</ul></>}</aside>
        </div>}
        {pag === "oculto" && <div className="registro-escrita-layout">
          <PerguntaRegistro pergunta={c.geral.perguntaOculto || "Qual ? a sua liga??o com o oculto?"} valor={p.oculto} salvar={(v) => set("oculto", v)} trancada={trancada} linhas={8} />
          {c.geral.ajudaOculto && <aside className="registro-inspiracao"><Icone id="boato" tamanho={24} /><p className="n-I">{c.geral.ajudaOculto}</p></aside>}
        </div>}
        {pag === "segredo" && <div className="registro-escrita-layout">
          <PerguntaRegistro pergunta="O que seu personagem esconde?" valor={pr.segredo} salvar={(v) => acoes.privado(jid, "segredo", v || null)} trancada={trancada} linhas={8} privada />
          <aside className="registro-inspiracao"><Icone id="selar" tamanho={24} /><p className="n-I">{c.geral.ajudaSegredo || "Uma coisa que seu personagem esconde de todo mundo."}</p><p className="n-I">Apenas voc? e o mestre podem ler esta resposta.</p></aside>
        </div>}
      </div>}
      </Painel>
    </Gestao>
  );
}

function PerguntaRegistro({ pergunta, numero, valor, salvar, trancada, linhas = 4, privada = false }: { pergunta: string; numero?: number; valor?: string; salvar: (v: string) => void; trancada: boolean; linhas?: number; privada?: boolean }) {
  const id = useId();
  return <article className="registro-pergunta">
    <div className="registro-pergunta-cab">
      {numero != null && <span className="registro-pergunta-numero" aria-hidden="true">{String(numero).padStart(2, "0")}</span>}
      <label htmlFor={id}>{pergunta}</label>
      {privada && <Selo tipo="privado"><Icone id="selar" tamanho={12} /> Privado</Selo>}
    </div>
    <TextoVivo id={id} valor={valor} salvar={salvar} linhas={linhas} desabilitado={trancada} placeholder="Escreva sua resposta..." />
    <div className="registro-pergunta-rodape"><span>{trancada ? "Edi??o trancada pelo mestre" : "Salvamento autom?tico"}</span>{!!valor?.trim() && <span className="registro-resposta-preenchida"><Icone id="visto" tamanho={12} /> Respondida</span>}</div>
  </article>;
}

function valoresDe(c: ReturnType<typeof useSessao>["conteudo"], p: Personagem, pr: Privado): Record<IdPagina, string> {
  const nomeDe = (l: { id: string; nome: string }[], id?: string) => l.find((x) => x.id === id)?.nome;
  const origem = p.classe ? Object.values(p.origem?.[p.classe] || {}).filter((x) => x && String(x).trim()).length : 0;
  return {
    pais: nomeDe(c.paises, p.pais) || "—",
    papel: p.papel === "outro" ? p.papelOutro || "Outro" : nomeDe(c.origens, p.papel) || "—",
    comunidade: nomeDe(c.comunidades, p.comunidade) || "—",
    ancestralidade: [p.ancestralidade, p.ancestralidade2].filter(Boolean).join(" + ") || "—",
    classe: p.classeOutra || nomeDe(c.classes, p.classe) || "—",
    subclasse: p.subclasse || "—",
    origem: p.classe ? `${origem}/3` : "—",
    compulsao: p.compulsao?.trim() ? "escrita" : "—",
    oculto: p.oculto?.trim() ? "escrita" : "—",
    segredo: pr.segredo?.trim() ? "selado" : "—",
    signoff: p.registroConfirmado ? "confirmada" : "pendente",
  };
}

/** O trilho da ficha: uma linha de latão com uma estação por página. As feitas acendem, a atual brilha. */
function Abas({ jid, pag, setPag }: { jid: string; pag: IdPagina; setPag: (p: IdPagina) => void }) {
  const { sala } = useSessao();
  const ok = feitas(sala.personagens[jid] || {}, sala.privado[jid] || {});
  const total = PAGINAS.filter((x) => x.id !== "signoff").length;
  const prontas = PAGINAS.filter((x) => x.id !== "signoff" && ok[x.id]).length;
  return (
    <nav className="trilha-ficha" aria-label="Etapas da ficha">
      <ol>
        {PAGINAS.map((x) => {
          const estado = pag === x.id ? "atual" : ok[x.id] ? "feita" : "pendente";
          return (
            <li key={x.id} className={estado}>
              <button type="button" onClick={() => setPag(x.id)} aria-current={pag === x.id ? "step" : undefined} title={`${x.rotulo}${ok[x.id] ? " · feito" : ""}`}>
                <span className="trilha-estacao">
                  <Icone id={ok[x.id] && pag !== x.id ? "visto" : x.icone} tamanho={16} />
                </span>
                <span className="trilha-nome">{x.rotulo}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <span className="trilha-conta n-L" aria-live="polite">
        {prontas} de {total} páginas prontas
      </span>
    </nav>
  );
}

function Signoff({ jid, setPag }: { jid: string; setPag: (p: IdPagina) => void }) {
  const { sala, conteudo } = useSessao();
  const p = sala.personagens[jid] || {};
  const valores = valoresDe(conteudo, p, sala.privado[jid] || {});
  return <section className="registro-signoff">
    <h2 className="n-T">{sala.jogadores[jid]?.nome}</h2>
    <div className="signoff-itens">{PAGINAS.filter((x) => x.id !== "signoff").map((x) => <button type="button" key={x.id} onClick={() => setPag(x.id)}>
      <span className="n-L">{x.rotulo}</span><span>{valores[x.id]}</span><Icone id="escrever" tamanho={16} />
    </button>)}</div>
    <p className="n-I">O segredo permanece privado. Clique em qualquer item para revisar.</p>
    {p.registroConfirmado && <Selo tipo="feito">Ficha confirmada</Selo>}
  </section>;
}
