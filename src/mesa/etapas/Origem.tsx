// Ficha de registro · Origem. As três perguntas da classe viram "memórias": uma trilha de selos
// à esquerda (o fio dourado se enche conforme se responde) e, à direita, uma folha de caderno
// com a pergunta em destaque. Uma memória por vez, sem parede de caixas de texto.
import { useEffect, useId, useState } from "react";
import type { Classe } from "../../conteudo";
import { useSessao } from "../../db/sala";
import { Canto, Placa, Selo } from "../../jogo/componentes";
import { Icone } from "../../jogo/icones";
import { idArte } from "../../arquivo/base";
import { TextoVivo } from "../pecas";

const ROM = ["I", "II", "III", "IV", "V", "VI"];
const palavras = (t?: string) => (t?.trim() ? t.trim().split(/\s+/).length : 0);

export function Origem({
  jid,
  classe,
  respostas,
  trancada,
  aoEscolherClasse,
  aoAvancar,
}: {
  jid: string;
  classe: Classe | undefined;
  respostas: Record<string, string>;
  trancada: boolean;
  aoEscolherClasse: () => void;
  aoAvancar: () => void;
}) {
  const { conteudo, acoes } = useSessao();
  const perguntas = classe?.origem || [];
  const feita = (k: number) => !!respostas[k]?.trim();
  const total = perguntas.length;
  const feitas = perguntas.filter((_, k) => feita(k)).length;
  // começa na primeira ainda em branco
  const primeira = Math.max(0, perguntas.findIndex((_, k) => !feita(k)));
  const [ativa, setAtiva] = useState(primeira);
  useEffect(() => setAtiva(primeira), [classe?.id, jid]); // eslint-disable-line react-hooks/exhaustive-deps
  const idCampo = useId();

  if (!classe || !total) {
    return (
      <div className="origem-vazia">
        <Icone id="memoria" tamanho={34} />
        <p className="n-N">{classe ? "Esta classe ainda não tem perguntas de origem cadastradas." : "Cada classe guarda três memórias, e elas só se abrem depois que você escolhe uma."}</p>
        {!classe && <Placa onClick={aoEscolherClasse}>Escolher classe</Placa>}
      </div>
    );
  }

  const k = Math.min(ativa, total - 1);
  const arte = conteudo.arte[idArte("classes", classe.id)];
  const selada = feitas === total;

  return (
    <div className="origem">
      <aside className="origem-trilha" aria-label="As memórias de origem">
        <header className="origem-classe">
          <span className="origem-retrato">{arte ? <img src={arte} alt="" /> : <Icone id="memoria" tamanho={28} />}</span>
          <span>
            <span className="n-L">memórias de</span>
            <span className="n-S">{classe.nome}</span>
          </span>
        </header>

        <ol className="origem-fio" style={{ ["--feitas" as string]: feitas, ["--total" as string]: total }}>
          {perguntas.map((q, i) => (
            <li key={i} className={`${i === k ? "atual" : ""} ${feita(i) ? "feita" : ""}`}>
              <button type="button" onClick={() => setAtiva(i)} aria-current={i === k ? "step" : undefined}>
                <span className="origem-selo" aria-hidden="true">
                  {feita(i) ? <Icone id="visto" tamanho={16} /> : ROM[i]}
                </span>
                <span className="origem-previa">
                  <span className="n-L">memória {ROM[i]}</span>
                  <span className="origem-previa-texto">{q}</span>
                  <span className="n-I">{feita(i) ? `${palavras(respostas[i])} palavras` : "em branco"}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>

        <div className={`origem-selagem ${selada ? "selada" : ""}`}>
          {selada ? (
            <Selo tipo="feito">
              <Icone id="selar" tamanho={12} /> memórias seladas
            </Selo>
          ) : (
            <span className="n-I">
              {feitas} de {total} memórias escritas
            </span>
          )}
        </div>
      </aside>

      <section className="origem-folha" key={`${classe.id}-${k}`} aria-labelledby={`${idCampo}-q`}>
        <Canto pos="tl" />
        <Canto pos="br" />
        <div className="origem-folha-topo">
          <span className="origem-numeral" aria-hidden="true">
            {ROM[k]}
          </span>
          <span className="n-L">
            Memória {ROM[k]} de {ROM[total - 1]}
          </span>
          {feita(k) && (
            <span className="origem-carimbo anim-selo-carimbo">
              <Icone id="visto" tamanho={12} /> escrita
            </span>
          )}
        </div>

        <label id={`${idCampo}-q`} htmlFor={idCampo} className="origem-pergunta">
          {perguntas[k]}
        </label>

        <div className="origem-papel">
          <Icone id="escrever" tamanho={20} />
          <TextoVivo
            id={idCampo}
            valor={respostas[k]}
            salvar={(v) => acoes.respostaOrigem(jid, classe.id, k, v)}
            linhas={9}
            desabilitado={trancada}
            placeholder="Conte como foi. Dois ou três parágrafos bastam…"
          />
        </div>
        <div className="origem-rodape">
          <span className="n-I">{trancada ? "Edição trancada pelo mestre" : "Salva sozinha enquanto você escreve"}</span>
          <span className="n-I">{palavras(respostas[k])} palavras</span>
        </div>

        <div className="origem-passos">
          <button type="button" className="link" disabled={k === 0} onClick={() => setAtiva(k - 1)}>
            ◂ memória anterior
          </button>
          {k < total - 1 ? (
            <button type="button" className="link" onClick={() => setAtiva(k + 1)}>
              próxima memória ▸
            </button>
          ) : (
            <button type="button" className="link" onClick={aoAvancar}>
              seguir para a compulsão ▸
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
