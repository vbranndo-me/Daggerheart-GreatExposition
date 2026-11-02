// Ponto de entrada do pacote para o Foundry (vite.ficha.config.ts).
// O script define `window.FichaExposicao`; o módulo chama `montar` dentro do HTML da janela.
//
//   const ficha = FichaExposicao.montar(elemento, dados, acoes);
//   ficha.atualizar(dadosNovos);   // depois de gravar no ator
//   ficha.mensagem("<b>…</b>");    // uma linha no rodapé
//   ficha.destruir();              // ao fechar a janela
import { createRoot } from "react-dom/client";
import { createRef } from "react";
import Ficha, { type Ponte } from "./Ficha";
import { exemplo } from "./exemplo";
import type { FichaAcoes, FichaDados, FichaHandle, FichaOpcoes } from "./tipos";

export function montar(el: HTMLElement, dados: FichaDados, acoes: FichaAcoes = {}, opcoes: FichaOpcoes = {}): FichaHandle {
  const raiz = createRoot(el);
  const ponte = createRef<Ponte | null>() as { current: Ponte | null };
  const desenha = (d: FichaDados) => raiz.render(<Ficha dados={d} acoes={acoes} opcoes={{ rodape: false, ...opcoes }} ponte={ponte} embutida />);
  desenha(dados);
  return {
    atualizar: desenha,
    mensagem: (html) => ponte.current?.mensagem?.(html),
    destruir: () => raiz.unmount(),
  };
}

export { exemplo };
export { montarEscolha, montarBotao } from "./escolha";
export type * from "./tipos";
