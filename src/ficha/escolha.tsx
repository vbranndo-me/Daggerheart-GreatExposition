// Janela de escolha de ação (a habilidade tem mais de uma): botões hextech no estilo da ficha.
import { createRoot } from "react-dom/client";
import { BotaoHextech } from "../jogo/hextech";

export interface OpcaoEscolha {
  id: string;
  nome: string;
  img?: string;
}

function Escolha({ titulo, opcoes, aoEscolher }: { titulo: string; opcoes: OpcaoEscolha[]; aoEscolher: (id: string) => void }) {
  return (
    <div className="fp-pagina fp-embutida fp-escolha">
      <h3>{titulo}</h3>
      <div className="fp-escolha-lista">
        {opcoes.map((o) => (
          <BotaoHextech key={o.id} tema="ambar" onClick={() => aoEscolher(o.id)}>
            {o.img && <img className="fp-escolha-img" src={o.img} alt="" />}
            {o.nome}
          </BotaoHextech>
        ))}
      </div>
    </div>
  );
}

export function montarEscolha(el: HTMLElement, titulo: string, opcoes: OpcaoEscolha[], aoEscolher: (id: string) => void) {
  const raiz = createRoot(el);
  raiz.render(<Escolha titulo={titulo} opcoes={opcoes} aoEscolher={aoEscolher} />);
  return { destruir: () => raiz.unmount() };
}

export function montarBotao(el: HTMLElement, texto: string, aoClicar: () => void, opcoes: { desabilitado?: boolean; tema?: "ciano" | "ambar" | "noite" } = {}) {
  const raiz = createRoot(el);
  raiz.render(
    <div className="fp-pagina fp-embutida fp-botao-solto">
      <BotaoHextech tema={opcoes.tema ?? "ambar"} disabled={opcoes.desabilitado} onClick={aoClicar}>
        {texto}
      </BotaoHextech>
    </div>
  );
  return { destruir: () => raiz.unmount() };
}
