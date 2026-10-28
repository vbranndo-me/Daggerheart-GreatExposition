import { useEffect, useRef, useState } from "react";
import { useSessao } from "../../db/sala";
import type { Personagem } from "../../db/tipos";
import { Detalhe, PainelSubclasse, type Item } from "../../arquivo/Criador";
import { carregarArquivo, type DadosArquivo } from "../../arquivo/dados";
import { idArte, useDesvanecer } from "../../arquivo/base";
import { Icone } from "../../jogo/icones";
import { Cartaz, Escrita } from "../pecas";
import "../../arquivo/arquivo.css";
export interface AcaoFicha { rotulo: string; desabilitada?: boolean; executar: () => void | Promise<void>; }
type Pagina = "pais" | "papel" | "comunidade" | "ancestralidade" | "classe" | "subclasse";
export function SelecaoFicha({ jid, pagina, titulo, trancada, aoAcao, aoProximo }: { jid: string; pagina: Pagina; titulo: string; trancada: boolean; aoAcao: (acao: AcaoFicha | null) => void; aoProximo: () => void }) {
  const { conteudo: c, sala, acoes } = useSessao();
  const p = sala.personagens[jid] || {};
  const galeriaRef = useRef<HTMLElement>(null);
  const detalheRef = useRef<HTMLElement>(null);
  useDesvanecer(galeriaRef);
  useDesvanecer(detalheRef);
  const [ver, setVer] = useState<string | null>(null);
  const [mista, setMista] = useState(!!p.ancestralidade2);
  const [dados, setDados] = useState<DadosArquivo | null>(null);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    if (pagina !== "ancestralidade") return;
    let ativa = true;
    setErro(false);
    carregarArquivo().then((d) => { if (ativa) setDados(d); }).catch(() => { if (ativa) setErro(true); });
    return () => { ativa = false; };
  }, [pagina, tentativa]);
  const salvar = (campos: Partial<Record<keyof Personagem, unknown>>) => { if (!trancada) return acoes.personagem(jid, campos as never); };
  const arte = (id: string) => ({ url: c.arte[id], srcSet: c.arteSet[id], proporcao: c.arteInfo[id]?.proporcao });
  const classe = c.classes.find((x) => x.id === p.classe);
  const gruposClasse: Record<string, string> = { cenario: "Classes do cen\u00e1rio", livro: "Livro b\u00e1sico e Hope & Fear", void: "The Void" };
  const subs: Item[] = (classe?.subclasses || []).map((x) => ({ id: x.id || x.nome, nome: x.nome, descricao: x.linha, classe, sub: x, mostrarNome: false, ...arte(`subclasse-${x.id}`) }));
  const itens: Item[] = pagina === "pais" ? c.paises.map((x) => ({ id: x.id, nome: x.nome, descricao: x.publico, grupo: x.distante ? "Terras distantes" : "Lucentia", detalhes: [{ rotulo: "Capital", valor: x.capital }, { rotulo: "Lado", valor: x.lado }], ...arte(`pais-${x.id}`) }))
    : pagina === "papel" ? c.origens.map((x) => ({ ...x, ...arte(`papel-${x.id}`) }))
    : pagina === "comunidade" ? c.comunidades.map((x) => ({ ...x, habilidades: x.habilidade ? [x.habilidade] : [], ...arte(idArte("comunidades", x.id)) }))
    : pagina === "ancestralidade" ? (dados?.ancestralidades || []).map((x) => ({ ...x, ...arte(idArte("ancestralidades", x.id)) }))
    : pagina === "classe" ? [...c.classes.map((x) => ({ id: x.id, nome: x.nome, descricao: x.nova ? x.fantasia.replace(/^\[Exemplo\]\s*/, "") : undefined, classe: x, mostrarNome: false, grupo: gruposClasse[x.grupo || (x.nova ? "cenario" : "livro")], ...arte(idArte("classes", x.id)) })), { id: "__outra", nome: "Outra", descricao: "Playtest ou homebrew. Escreva o nome.", grupo: "Outra" }] : subs;
  const marcado = (it: Item) => pagina === "ancestralidade" ? p.ancestralidade === it.nome || p.ancestralidade2 === it.nome : pagina === "subclasse" ? p.subclasse === it.nome : pagina === "classe" && it.id === "__outra" ? !!p.classeOutra : p[pagina as "pais" | "papel" | "comunidade" | "classe"] === it.id;
  const aberto = itens.find((x) => x.id === ver) || itens.find(marcado) || null;
  const escolher = async (it: Item) => {
    if (trancada) return;
    if (pagina === "ancestralidade") {
      if (!mista) await salvar({ ancestralidade: it.nome, ancestralidade2: null });
      else if (p.ancestralidade === it.nome) await salvar({ ancestralidade: p.ancestralidade2 ?? null, ancestralidade2: null });
      else if (p.ancestralidade2 === it.nome) await salvar({ ancestralidade2: null });
      else if (!p.ancestralidade) await salvar({ ancestralidade: it.nome });
      else await salvar({ ancestralidade2: it.nome });
    } else if (pagina === "classe") {
      if (it.id !== "__outra") await salvar({ classe: it.id, classeLivro: null, classeOutra: null, ...(p.classe === it.id ? {} : { subclasse: it.classe?.subclasses[0]?.nome ?? null }) });
    } else if (pagina === "subclasse") await salvar({ subclasse: it.nome });
    else await salvar({ [pagina]: it.id });
  };
  useEffect(() => {
    const alvo = aberto || (pagina === "subclasse" ? subs[0] : null);
    const livre = (pagina === "classe" && alvo?.id === "__outra") || (pagina === "subclasse" && !!p.classeOutra);
    const nome = livre ? (pagina === "classe" ? p.classeOutra : p.subclasse) : alvo?.nome;
    aoAcao({
      rotulo: nome ? `Escolher ${nome}` : "Escolher",
      desabilitada: trancada || !nome || (pagina === "ancestralidade" && mista && !!alvo && marcado(alvo) && !p.ancestralidade2),
      executar: async () => {
        if (trancada || !nome) return;
        if (livre) { aoProximo(); return; }
        if (!alvo) return;
        if (pagina === "ancestralidade" && mista && marcado(alvo) && p.ancestralidade && p.ancestralidade2) { aoProximo(); return; }
        await escolher(alvo);
        if (pagina === "papel" && alvo.id === "outro" && p.papel !== "outro") return;
        if (pagina !== "ancestralidade" || !mista || (p.ancestralidade && !marcado(alvo))) aoProximo();
      },
    });
    return () => aoAcao(null);
  }, [aberto?.id, pagina, trancada, mista, p.ancestralidade, p.ancestralidade2, p.classe, p.classeOutra, p.subclasse, p.papel, subs.length, aoAcao]);

  if (pagina === "subclasse") return <section ref={detalheRef} className="registro-selecao registro-subclasse registro-fade">{classe && subs.length ? <PainelSubclasse classe={classe} subs={subs} aberto={aberto} marcado={(id) => subs.some((x) => x.id === id && marcado(x))} trancado={trancada} arteClasse={arte(idArte("classes", classe.id))} aoVer={setVer} aoEscolher={(id) => { const it = subs.find((x) => x.id === id); if (it) escolher(it); }} /> : p.classeOutra ? <Escrita rotulo="Subclasse" valor={p.subclasse} salvar={(v) => salvar({ subclasse: v || null })} desabilitado={trancada} linhas={1} /> : <p className="n-I">Escolha uma classe primeiro.</p>}</section>;
  const passo = pagina === "pais" || pagina === "papel" ? "comunidade" : pagina;
  return <div className={`registro-selecao registro-${pagina}`}>
    <section ref={galeriaRef} className="registro-galeria registro-fade"><h1 className="n-S registro-titulo">{titulo}</h1>
      {pagina === "ancestralidade" && !dados && <p className="n-I">{erro ? <button type="button" className="link" onClick={() => setTentativa((t) => t + 1)}>Tentar carregar novamente</button> : "Abrindo ancestralidades..."}</p>}
      {pagina === "ancestralidade" && <label className="interruptor"><input type="checkbox" checked={mista} disabled={trancada} onChange={(e) => { setMista(e.target.checked); if (!e.target.checked) salvar({ ancestralidade2: null }); }} /><span>Ancestralidade mista</span><span className="n-I">{"1\u00aa habilidade de uma e 2\u00aa da outra"}</span></label>}
      {[...new Set(itens.map((x) => x.grupo || ""))].map((g) => <div key={g}>
        {g && <div className="selecao-grupo n-L">{({ basico: "Livro b\u00e1sico", "hope-fear": "Hope & Fear" } as Record<string, string>)[g] || g}</div>}
        <div className="criador-cartazes">{itens.filter((x) => (x.grupo || "") === g).map((it) => pagina === "pais" ? <button key={it.id} type="button" className={`registro-pais-card ${marcado(it) ? "escolhido" : ""} ${aberto?.id === it.id ? "aberto" : ""}`} aria-pressed={marcado(it)} onClick={() => setVer(it.id)}>
          <span className="registro-pais-arte">{it.url ? <img src={it.url} srcSet={it.srcSet} alt="" /> : <span className="registro-monograma">{it.nome.slice(0, 1)}</span>}</span>
          <span className="registro-pais-nome">{it.nome}</span>
          {marcado(it) && <span className="registro-pais-check" aria-label="Escolhido"><Icone id="visto" tamanho={12} /></span>}
        </button> : <Cartaz key={it.id} nome={it.nome} url={it.url} srcSet={it.srcSet} proporcao={it.proporcao} mostrarNome={it.mostrarNome !== false} marcada={marcado(it)} aberto={aberto?.id === it.id} aoClicar={() => setVer(it.id)} />)}</div>
      </div>)}
    </section>
    <aside ref={detalheRef} className="registro-detalhe registro-fade">{aberto && pagina === "pais" ? <div className="registro-pais-detalhe">
      <div className="registro-pais-texto">
        <span className="registro-brasao">{aberto.url ? <img src={aberto.url} srcSet={aberto.srcSet} alt="" /> : <span className="registro-monograma">{aberto.nome.slice(0, 1)}</span>}</span>
        <div className="n-L">{aberto.grupo}</div>
        <h2 className="n-T">{aberto.nome}</h2>
        <p className="n-N">{aberto.descricao}</p>
      </div>
      <dl className="registro-pais-dados">{aberto.detalhes?.map((d) => <div key={d.rotulo}><dt className="n-L">{d.rotulo}</dt><dd>{d.valor}</dd></div>)}</dl>

    </div> : aberto ? <Detalhe key={aberto.id} item={aberto} passo={passo} marcada={marcado(aberto)} trancado={trancada} aoEscolher={() => escolher(aberto)} semBotao
      extra={aberto.id === "__outra" ? <Escrita rotulo="Nome da classe" valor={p.classeOutra} linhas={1} desabilitado={trancada} salvar={(v) => salvar({ classe: null, classeLivro: null, classeOutra: v.trim() || null, subclasse: null })} /> : pagina === "papel" && aberto.id === "outro" && p.papel === "outro" ? <Escrita rotulo="Qual?" valor={p.papelOutro} linhas={1} desabilitado={trancada} salvar={(v) => salvar({ papelOutro: v })} /> : undefined} /> : <p className="n-I">{"Clique num cart\u00e3o para conhecer os detalhes e escolher."}</p>}</aside>
  </div>;
}
