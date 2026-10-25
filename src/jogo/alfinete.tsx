// Alfinete de mapa temático: medalhão esmaltado na cor do jogador, com aro de latão e o
// ícone do tipo (origem, memória, rumor...), preso numa agulha de aço com colar de latão.
// Desenhado dentro de um <svg> de mapa: (x, y) é a ponta da agulha, no espaço do mapa.
// "escala" deixa o alfinete do mesmo tamanho na tela com qualquer zoom.
import { ICONES_DADOS } from "./icones-dados";

export function Alfinete({
  x,
  y,
  cor,
  icone,
  escala = 1,
  titulo,
  cravar,
  destaque,
  onClick,
}: {
  x: number;
  y: number;
  cor: string;
  icone: string;
  escala?: number;
  titulo?: string;
  cravar?: boolean; // anima a queda (alfinete novo)
  destaque?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const corpo = ICONES_DADOS[icone]?.corpo || "";
  const id = `alf-${Math.round(x)}-${Math.round(y)}`;
  return (
    <g transform={`translate(${x} ${y}) scale(${escala})`} className="alfinete-tema" onClick={onClick}>
      {titulo && <title>{titulo}</title>}
      <defs>
        <linearGradient id={`${id}-aco`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5b6170" />
          <stop offset=".45" stopColor="#d9dde6" />
          <stop offset="1" stopColor="#4a4f5c" />
        </linearGradient>
        <linearGradient id={`${id}-latao`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6e4b0" />
          <stop offset=".5" stopColor="#c4a467" />
          <stop offset="1" stopColor="#7a6438" />
        </linearGradient>
        <radialGradient id={`${id}-esmalte`} cx=".38" cy=".32" r=".75">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".55" />
          <stop offset=".28" stopColor={cor} />
          <stop offset="1" stopColor={cor} stopOpacity="1" />
        </radialGradient>
      </defs>
      {/* sombra no mapa e furo */}
      <ellipse cx="4" cy="0.5" rx="7" ry="2.4" fill="#000" opacity=".45" />
      {cravar && <circle className="alf-onda" cx="0" cy="0" r="3" fill="none" stroke={cor} strokeWidth="1.4" />}
      <g className={cravar ? "alf-cai" : undefined}>
        {/* agulha de aço, afinando até a ponta */}
        <path d="M0 0 L4.6 -24 L7.4 -23.4 Z" fill={`url(#${id}-aco)`} stroke="#1a1d25" strokeWidth=".5" />
        {/* colar de latão */}
        <ellipse cx="6.4" cy="-25" rx="3.4" ry="1.6" fill={`url(#${id}-latao)`} stroke="#3d311a" strokeWidth=".5" />
        {/* medalhão: aro de latão, esmalte, ícone */}
        <g transform="translate(7.5 -37)">
          {destaque && <circle r="17" fill="none" stroke="#e8705f" strokeWidth="1.6" opacity=".9" />}
          <circle r="13" fill={`url(#${id}-latao)`} stroke="#2a2213" strokeWidth="1" />
          <circle r="11.2" fill="none" stroke="#fff3cf" strokeOpacity=".5" strokeWidth=".6" />
          <circle r="9.6" fill={`url(#${id}-esmalte)`} stroke="#3d311a" strokeWidth=".8" />
          <svg x="-6.2" y="-6.2" width="12.4" height="12.4" viewBox="0 0 512 512" style={{ color: "#fffaf0", overflow: "visible" }}>
            <g style={{ color: "#2a1d10" }} opacity=".45" transform="translate(14 20)" dangerouslySetInnerHTML={{ __html: corpo }} />
            <g style={{ color: "#fffaf0" }} dangerouslySetInnerHTML={{ __html: corpo }} />
          </svg>
          {/* reflexo do esmalte */}
          <path d="M-6.5 -3.5 A7.5 7.5 0 0 1 -1 -8.2" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="1.3" strokeLinecap="round" />
        </g>
      </g>
    </g>
  );
}
