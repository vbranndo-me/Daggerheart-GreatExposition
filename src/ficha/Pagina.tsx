// #/ficha · a ficha de personagem, sozinha numa página, para ensaiar o desenho.
// Nenhum dado de sala nem nada privado: usa o exemplo do Alquimista.
import { useMemo, useState } from "react";
import Ficha from "./Ficha";
import { exemplo } from "./exemplo";

export default function Pagina() {
  const [rodada, setRodada] = useState(0);
  const dados = useMemo(() => exemplo(), [rodada]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Ficha
      key={rodada}
      dados={dados}
      topo={
        <div className="fp-ensaio">
          <span>
            <b>Ficha de personagem</b> · protótipo navegável, exemplo: Alquimista / Apotecária, nível 3
          </span>
          <span>Arraste o canto inferior direito da janela para redimensionar.</span>
          <button type="button" onClick={() => setRodada((r) => r + 1)}>
            reiniciar exemplo
          </button>
        </div>
      }
    />
  );
}
