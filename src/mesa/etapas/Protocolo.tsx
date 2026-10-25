// Capítulo II · Protocolo. Storylet sério, sem ornamento extra. Linhas e véus são escritos no
// lugar e ficam anônimos; morte e sacrifício é privado (só o mestre vê); a lista da mesa fica
// numa janela lateral, sem autores e sem repetir itens iguais.
import { useMemo, useState } from "react";
import { useSessao } from "../../db/sala";
import { Ramo, Selo } from "../../jogo/componentes";
import { Icone } from "../../jogo/icones";
import { Gestao, Painel, normalizar } from "../pecas";

export function Protocolo({ trancada }: { trancada: boolean }) {
  const { conteudo, sala, meuJid, mestre, acoes } = useSessao();
  const seg = conteudo.seguranca;
  const [aberto, setAberto] = useState<string | null>(null);
  const meus = new Set(Object.keys((meuJid && sala.privado[meuJid]?.seguranca) || {}));
  const minhaMorte = meuJid ? sala.privado[meuJid]?.morte : undefined;
  const opcaoMorte = seg.morte.opcoes.find((o) => o.id === minhaMorte);
  const alternar = (k: string) => setAberto(aberto === k ? null : k);

  const grupos = useMemo(() => {
    const out = { linha: [] as { texto: string; ids: string[] }[], veu: [] as { texto: string; ids: string[] }[] };
    const mapa = new Map<string, { texto: string; ids: string[] }>();
    for (const [iid, it] of Object.entries(sala.seguranca.itens || {}).sort((a, b) => a[1].criadoEm - b[1].criadoEm)) {
      const k = it.lista + normalizar(it.texto);
      if (!mapa.has(k)) {
        const g = { texto: it.texto.trim(), ids: [] as string[] };
        mapa.set(k, g);
        out[it.lista].push(g);
      }
      mapa.get(k)!.ids.push(iid);
    }
    return out;
  }, [sala.seguranca.itens]);

  const lista = (l: "linha" | "veu") => (
    <>
      <ul className="lista-simples">
        {grupos[l].map((g) => {
          const meu = g.ids.find((i) => meus.has(i));
          return (
            <li key={g.ids[0]} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
              <span className="n-N" style={{ fontSize: 16, flex: 1 }}>
                {g.texto}
              </span>
              {!trancada && meu && (
                <button className="link perigo" onClick={() => acoes.removerSeguranca(meu, meuJid)}>
                  tirar o meu
                </button>
              )}
            </li>
          );
        })}
        {!grupos[l].length && <li className="n-I">Nada ainda.</li>}
      </ul>
    </>
  );
  const semNome = trancada || (!meuJid && !mestre);

  return (
    <Gestao n={2} titulo="Protocolo" colunas="minmax(0, 1fr) minmax(0, 1fr) minmax(280px, 0.9fr)">
      <Painel titulo="Linhas">
        <AdicionarItem chave="linha" dica={seg.linhas} placeholder="Escreva uma linha" trancada={semNome} adicionar={(t) => acoes.adicionarSeguranca(meuJid, "linha", t)} />
        <div style={{ marginTop: 14 }}>{lista("linha")}</div>
      </Painel>
      <Painel titulo="Véus">
        <AdicionarItem chave="veu" dica={seg.veus} placeholder="Escreva um véu" trancada={semNome} adicionar={(t) => acoes.adicionarSeguranca(meuJid, "veu", t)} />
        <div style={{ marginTop: 14 }}>{lista("veu")}</div>
      </Painel>
      <Painel titulo="Morte e ferramentas">
        <div className="ramos" style={{ marginTop: 0 }}>
          {meuJid && (
            <Ramo
              titulo="Morte e sacrifício"
              descricao={opcaoMorte && aberto !== "morte" ? opcaoMorte.nome : seg.morte.pergunta}
              icone="selar"
              estado={trancada ? "bloqueado" : opcaoMorte && aberto !== "morte" ? "feito" : "normal"}
              selo={<Selo tipo="privado">só o mestre vê</Selo>}
              aberto={aberto === "morte"}
              aoClicar={() => alternar("morte")}
            >
              {seg.morte.explicacao && <p className="n-I" style={{ marginBottom: 10 }}>{seg.morte.explicacao}</p>}
              <div className="sub-ramos" role="radiogroup">
                {seg.morte.opcoes.map((o) => (
                  <Ramo
                    key={o.id}
                    titulo={o.nome}
                    icone={minhaMorte === o.id ? "visto" : "selar"}
                    estado={minhaMorte === o.id ? "selecionado" : "normal"}
                    aoClicar={() => {
                      acoes.privado(meuJid, "morte", o.id);
                      setAberto(null);
                    }}
                  />
                ))}
              </div>
            </Ramo>
          )}
          <Ramo titulo="As ferramentas de segurança" descricao="O que usar durante o jogo, a qualquer momento." icone="cap-2" aberto={aberto === "ferramentas"} aoClicar={() => alternar("ferramentas")}>
            <div style={{ display: "grid", gap: 10 }}>
              {seg.ferramentas.map((f) => (
                <div key={f.nome}>
                  <div className="n-R">{f.nome}</div>
                  <p className="n-I">{f.texto}</p>
                </div>
              ))}
            </div>
          </Ramo>
        </div>
      </Painel>
    </Gestao>
  );
}

/** Campo de adicionar sempre à vista: escreve, Enter (ou o botão pequeno) põe na lista. */
function AdicionarItem(p: { chave: string; dica: string; placeholder: string; trancada: boolean; adicionar: (t: string) => Promise<void> }) {
  const [texto, setTexto] = useState("");
  const [ok, setOk] = useState(0);
  const enviar = async () => {
    if (!texto.trim() || p.trancada) return;
    await p.adicionar(texto.trim());
    setTexto("");
    setOk((n) => n + 1);
  };
  return (
    <div className="adicionar-item">
      <p className="n-I" style={{ margin: "0 0 8px" }}>
        {p.dica}
      </p>
      <form
        className="adicionar-linha"
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
      >
        <input aria-label={p.placeholder} placeholder={p.placeholder} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={140} disabled={p.trancada} />
        <button type="submit" className="btn-pequeno" disabled={!texto.trim() || p.trancada}>
          Adicionar
        </button>
      </form>
      {ok > 0 && (
        <span key={ok} className="anim-selo-carimbo">
          <Selo tipo="feito">
            <Icone id="visto" tamanho={12} /> na lista
          </Selo>
        </span>
      )}
    </div>
  );
}
