// Os medidores do cenário: Discernimento (0 a 12), trilha de Frenesi (4 espaços) e o cartão de demonstração
// do módulo de ficha. Servem de coluna fixa nas seções de regras e de brinquedo no "Módulo de ficha".
import { useEffect, useState, type RefObject } from "react";

const LIMIARES = [4, 8, 12];

/** Quanto da seção já passou pela tela (0 a 1), lido na rolagem da apresentação. */
export function useProgressoDaSecao(ref: RefObject<HTMLElement | null>) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rolagem = el.closest(".apr-rolagem") as HTMLElement | null;
    if (!rolagem) return;
    const calcular = () => {
      const r = el.getBoundingClientRect();
      const vh = rolagem.clientHeight || window.innerHeight;
      const total = Math.max(1, r.height - vh * 0.45);
      setP(Math.min(1, Math.max(0, (vh * 0.55 - r.top) / total)));
    };
    calcular();
    rolagem.addEventListener("scroll", calcular, { passive: true });
    window.addEventListener("resize", calcular);
    return () => {
      rolagem.removeEventListener("scroll", calcular);
      window.removeEventListener("resize", calcular);
    };
  }, [ref]);
  return p;
}

/** Doze lâmpadas em coluna; os limiares 4, 8 e 12 em latão. `estados` (opcional) torna as células clicáveis. */
export function MedidorDiscernimento({ valor, queimados = 0, aoClicar }: { valor: number; queimados?: number; aoClicar?: (n: number) => void }) {
  return (
    <div className="medidor-disc" role="img" aria-label={`Discernimento ${valor} de 12`}>
      <div className="medidor-disc-celulas">
        {Array.from({ length: 12 }, (_, i) => 12 - i).map((n) => {
          const acesa = n <= valor;
          const queimada = acesa && n > valor - queimados;
          const limiar = LIMIARES.includes(n);
          const Tag = aoClicar ? "button" : "span";
          return (
            <Tag
              key={n}
              {...(aoClicar ? { type: "button" as const, onClick: () => aoClicar(n), "aria-label": `Discernimento ${n}` } : {})}
              className={`medidor-celula ${acesa ? "acesa" : ""} ${queimada ? "queimada" : ""} ${limiar ? "limiar" : ""}`}
            >
              {limiar && <span className="medidor-limiar n-L">{n}</span>}
            </Tag>
          );
        })}
      </div>
      <div className="medidor-disc-rodape n-L">
        Discernimento <b>{valor}</b>/12
      </div>
    </div>
  );
}

/** Quatro espaços: 0 livre, 1 marcado, 2 perdido para sempre (riscado, como num Surto). */
export function TrilhaFrenesi({ estados, aoClicar }: { estados: number[]; aoClicar?: (i: number) => void }) {
  return (
    <div className="trilha-frenesi" role="img" aria-label={`Frenesi: ${estados.filter((e) => e === 1).length} marcados, ${estados.filter((e) => e === 2).length} perdidos para sempre`}>
      <div className="trilha-espacos">
        {[0, 1, 2, 3].map((i) => {
          const perdido = estados[i] === 2;
          const marcado = estados[i] === 1;
          const Tag = aoClicar ? "button" : "span";
          return (
            <Tag
              key={i}
              {...(aoClicar ? { type: "button" as const, onClick: () => aoClicar(i), "aria-label": `Espaço ${i + 1} de Frenesi` } : {})}
              className={`trilha-espaco ${marcado ? "marcado" : ""} ${perdido ? "perdido" : ""}`}
            >
              {perdido && (
                <svg viewBox="0 0 40 40" aria-hidden="true">
                  <path d="M6 6 L34 34 M34 6 L6 34" />
                </svg>
              )}
            </Tag>
          );
        })}
      </div>
      <div className="medidor-disc-rodape n-L">Frenesi</div>
    </div>
  );
}

/** A coluna fixa de Discernimento: acende conforme a rolagem da seção. */
export function ColunaDiscernimento({ progresso }: { progresso: number }) {
  const valor = Math.round(progresso * 12);
  return (
    <aside className="coluna-medidor">
      <MedidorDiscernimento valor={valor} />
      <p className="n-I coluna-medidor-nota">Quanto mais você enxerga, maior a chance de o véu te tocar.</p>
    </aside>
  );
}

/** A coluna fixa de Frenesi: a trilha enche e, no fim, o último espaço é riscado pelo Surto. */
export function ColunaFrenesi({ progresso }: { progresso: number }) {
  const surto = progresso > 0.8;
  const marcados = surto ? 3 : Math.min(3, Math.floor(progresso * 4));
  const estados = [0, 1, 2, 3].map((i) => (surto && i === 3 ? 2 : i < marcados ? 1 : 0));
  return (
    <aside className="coluna-medidor">
      <TrilhaFrenesi estados={estados} />
      <p className="n-I coluna-medidor-nota">{surto ? "Um Surto: a trilha perde 1 espaço para sempre." : "A trilha tem 4 espaços."}</p>
    </aside>
  );
}

/** Cartão de demonstração do módulo de ficha: nada é salvo. */
export function CartaoFichaDemo() {
  const [disc, setDisc] = useState(6);
  const [queimados, setQueimados] = useState(0);
  const [estados, setEstados] = useState([1, 0, 0, 0]);
  const [compulsao, setCompulsao] = useState("");

  const clicarDisc = (n: number) => {
    if (n === disc) {
      // clicar no valor atual queima um ponto (fica marcado à parte)
      setQueimados((q) => Math.min(disc, q + 1));
    } else {
      setDisc(n);
      setQueimados((q) => Math.min(n, q));
    }
  };
  const clicarFrenesi = (i: number) => setEstados((e) => e.map((v, k) => (k === i ? (v + 1) % 3 : v)));

  return (
    <div className="ficha-demo">
      <div className="ficha-demo-cabeca n-L">Módulo de ficha · demonstração</div>
      <div className="ficha-demo-grade">
        <section>
          <h3 className="n-S">Discernimento</h3>
          <MedidorDiscernimento valor={disc} queimados={queimados} aoClicar={clicarDisc} />
          <p className="n-I">Clique para marcar. Clicar no valor atual queima um ponto. Queimados: {queimados}</p>
        </section>
        <section>
          <h3 className="n-S">Frenesi</h3>
          <TrilhaFrenesi estados={estados} aoClicar={clicarFrenesi} />
          <p className="n-I">Clique para marcar; clique de novo para riscar, como num Surto; e mais uma vez para limpar.</p>
        </section>
      </div>
      <label className="ficha-demo-compulsao">
        <span className="n-L">Compulsão</span>
        <input type="text" value={compulsao} placeholder="Volto para buscar quem ficou para trás." onChange={(e) => setCompulsao(e.target.value)} maxLength={120} />
      </label>
      <div className="ficha-demo-rodape n-L">Só demonstração: nada é salvo.</div>
    </div>
  );
}
