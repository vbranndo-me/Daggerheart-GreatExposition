// O brasão de Entremonts como carimbo: anel duplo com a legenda correndo em volta, coroa sobre o
// quadrifólio, as duas montanhas e a bigorna. Tudo numa cor só (currentColor), como tinta.
// "tinta" passa um filtro de borracha gasta (falhas e borda irregular); "lacre" é liso, para o selo de cera.
import { useId } from "react";

export function BrasaoCarimbo({
  variante = "tinta",
  legenda = "ROYAUME D'ENTREMONTS ✦ EXPOSITION UNIVERSELLE ✦",
  className,
  x,
  y,
  tamanho,
}: {
  variante?: "tinta" | "lacre" | "marca";
  legenda?: string;
  className?: string;
  /** posição e tamanho quando vai dentro de outro <svg> */
  x?: number;
  y?: number;
  tamanho?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const gasto = variante === "tinta";
  return (
    <svg viewBox="0 0 200 200" x={x} y={y} width={tamanho} height={tamanho} className={`brasao-carimbo brasao-${variante} ${className || ""}`} aria-label="Brasão de Entremonts" role="img">
      <defs>
        <path id={`${uid}-anel`} d="M100 100 m-77 0 a77 77 0 1 1 154 0 a77 77 0 1 1 -154 0" />
        {gasto && (
          <filter id={`${uid}-borracha`} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency=".55" numOctaves="3" seed="7" result="grao" />
            <feColorMatrix in="grao" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -7 5.5" result="falhas" />
            <feComposite in="SourceGraphic" in2="falhas" operator="in" result="tinta" />
            <feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="2" result="onda" />
            <feDisplacementMap in="tinta" in2="onda" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        )}
        {/* o quadrifólio vazado: quatro lobos e o miolo, com a parte de dentro recortada */}
        <mask id={`${uid}-vazado`}>
          <rect width="200" height="200" fill="#fff" />
          <g fill="#000">
            <circle cx="100" cy="86" r="18.5" />
            <circle cx="100" cy="132" r="18.5" />
            <circle cx="77" cy="109" r="18.5" />
            <circle cx="123" cy="109" r="18.5" />
            <rect x="81" y="90" width="38" height="38" />
          </g>
        </mask>
      </defs>

      <g filter={gasto ? `url(#${uid}-borracha)` : undefined} fill="currentColor" stroke="currentColor">
        {/* anéis e legenda */}
        <circle cx="100" cy="100" r="95" fill="none" strokeWidth="4.5" />
        <circle cx="100" cy="100" r="89" fill="none" strokeWidth="1.2" />
        <circle cx="100" cy="100" r="65" fill="none" strokeWidth="1.6" />
        <circle cx="100" cy="100" r="61.5" fill="none" strokeWidth=".6" strokeDasharray="1.2 2.4" />
        <text fontFamily="'Libre Baskerville', Georgia, serif" fontSize="12.2" fontWeight="700" letterSpacing="2.1" stroke="none">
          <textPath href={`#${uid}-anel`} startOffset="0" textLength="476" lengthAdjust="spacing">
            {legenda}
          </textPath>
        </text>

        {/* estrelas nos flancos */}
        {[47, 153].map((x) => (
          <path key={x} stroke="none" d={`M${x} 102 l2.2 -6.2 l2.2 6.2 l6.2 2.2 l-6.2 2.2 l-2.2 6.2 l-2.2 -6.2 l-6.2 -2.2 Z`} transform={`translate(${-2.2} ${-2.2})`} />
        ))}

        {/* coroa */}
        <g stroke="none">
          <path d="M80 62 L76 46 L86 54 L93 42 L100 52 L107 42 L114 54 L124 46 L120 62 Z" />
          <rect x="79" y="62" width="42" height="5.5" rx="1" />
          <circle cx="76" cy="44.5" r="2.6" />
          <circle cx="93" cy="40.5" r="2.6" />
          <circle cx="107" cy="40.5" r="2.6" />
          <circle cx="124" cy="44.5" r="2.6" />
          <circle cx="100" cy="35" r="3" />
          <path d="M98.6 38 h2.8 v8 h-2.8 Z" />
        </g>

        {/* o quadrifólio (moldura do escudo) */}
        <g mask={`url(#${uid}-vazado)`} stroke="none">
          <circle cx="100" cy="86" r="23" />
          <circle cx="100" cy="132" r="23" />
          <circle cx="77" cy="109" r="23" />
          <circle cx="123" cy="109" r="23" />
          <rect x="77" y="86" width="46" height="46" />
        </g>
        {/* rebites na moldura */}
        {[
          [100, 66.5],
          [100, 151.5],
          [57.5, 109],
          [142.5, 109],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="var(--papel-carimbo, #f4ead2)" stroke="none" />
        ))}

        <g transform="translate(100 120) scale(.84) translate(-100 -120)">
        {/* as duas montanhas, cada uma recortada da outra por um fio de papel, com neve no cume */}
        <g stroke="var(--papel-carimbo, #f4ead2)" strokeWidth="2.2" paintOrder="stroke" strokeLinejoin="round">
          <path d="M62 120 L86 79 L98 98 L104 120 Z" />
          <path d="M84 120 L113 72 L140 120 Z" />
        </g>
        <g fill="var(--papel-carimbo, #f4ead2)" stroke="none">
          <path d="M80.5 88.5 L86 79 L91.6 87.6 L88.4 86.2 L86.2 89.2 L83.6 86.4 Z" />
          <path d="M106.8 82.4 L113 72 L119.6 82.6 L116.2 81 L113.4 84.8 L110 81.2 Z" />
        </g>
        <path fill="none" stroke="var(--papel-carimbo, #f4ead2)" strokeWidth="1" strokeLinecap="round" d="M113 90 l-5 9 M120 94 l4 8 M88 97 l-4 7" opacity=".9" />
        </g>

        {/* a bigorna, na frente, com o chifre para a direita */}
        <path
          stroke="var(--papel-carimbo, #f4ead2)"
          strokeWidth="3"
          paintOrder="stroke"
          strokeLinejoin="round"
          d="M70 117 H122 C127 117 132 119 137 123 H124 C119 125.5 114 126.5 109 127 L107.5 133 H113 L116 141 H84 L87 133 H92.5 L91 127 C81 126.5 73.5 123.5 70 117 Z"
        />
        <path fill="none" stroke="var(--papel-carimbo, #f4ead2)" strokeWidth="1" d="M76 119.4 H121" opacity=".85" />
      </g>
    </svg>
  );
}

// borda de cera derramada: um círculo com ondulações irregulares
const BORDA_CERA = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 72; i++) {
    const t = (i / 72) * Math.PI * 2;
    const r = 45 + 1.8 * Math.sin(7 * t + 0.4) + 1.1 * Math.sin(13 * t + 1.7) + 0.7 * Math.sin(23 * t);
    pts.push(`${(50 + r * Math.cos(t)).toFixed(2)} ${(50 + r * Math.sin(t)).toFixed(2)}`);
  }
  return `M${pts.join(" L")} Z`;
})();

/** O selo de cera do envelope: cera derramada, o disco prensado e o brasão em relevo (sombra e luz). */
export function SeloCera({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 100 100" className={`selo-cera ${className || ""}`} aria-hidden="true">
      <defs>
        <radialGradient id={`${uid}-cera`} cx=".36" cy=".3" r=".8">
          <stop offset="0" stopColor="#e4585d" />
          <stop offset=".42" stopColor="#a8262c" />
          <stop offset="1" stopColor="#5a1013" />
        </radialGradient>
        <radialGradient id={`${uid}-disco`} cx=".6" cy=".65" r=".7">
          <stop offset="0" stopColor="#a52a30" />
          <stop offset="1" stopColor="#7e161b" />
        </radialGradient>
      </defs>
      <path d={BORDA_CERA} fill={`url(#${uid}-cera)`} />
      {/* o disco que o sinete prensou: borda funda embaixo à direita, luz em cima à esquerda */}
      <circle cx="50" cy="50" r="35.5" fill={`url(#${uid}-disco)`} />
      <circle cx="50.6" cy="50.8" r="35.5" fill="none" stroke="#4a0b0e" strokeWidth="1.6" opacity=".7" />
      <circle cx="49.4" cy="49.2" r="35.5" fill="none" stroke="#ff9d9d" strokeWidth=".9" opacity=".45" />
      <g style={{ ["--papel-carimbo" as string]: "#8c1d23" }}>
        <g color="#ffb0b0" opacity=".35">
          <BrasaoCarimbo variante="lacre" x={16.4} y={16.4} tamanho={67} />
        </g>
        <g color="#3a070a" opacity=".9">
          <BrasaoCarimbo variante="lacre" x={17} y={17} tamanho={67} />
        </g>
      </g>
      {/* brilho da cera */}
      <path d="M24 30 A32 32 0 0 1 44 16" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
