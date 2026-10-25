// As cartas do Exhibition Builder.
// Verso: carta de baralho Belle Époque, ardósia com guilhochê, medalhão com raios e legenda curva,
//        esmalte e emblema próprios de cada monte.
// Frente: bilhete de entrada da Exposição, em papel: arco com a categoria, carimbo com o número,
//         a pergunta, linha picotada e o canhoto.
// Tudo em SVG de 200 × 300 (proporção 2:3) com o texto em HTML por cima, medido em cqw,
// então a mesma carta serve do monte pequeno (96 px) à carta da vez (180 px ou mais).
import { useId } from "react";
import { ICONES_DADOS } from "./icones-dados";
import { FILIGRANA } from "./filigrana";

export const MONTES: Record<number, { esmalte: string; emblema: string }> = {
  1: { esmalte: "#5e9c86", emblema: "ajustes" }, // A construção
  2: { esmalte: "#6f8fcf", emblema: "pavilhao" }, // Os pavilhões
  3: { esmalte: "#c27a93", emblema: "convidado" }, // A gente da feira
  4: { esmalte: "#9a7fd0", emblema: "boato" }, // Os rumores
};
const ROM = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

function Emblema({ id, x, y, t, cor }: { id: string; x: number; y: number; t: number; cor: string }) {
  const corpo = ICONES_DADOS[id]?.corpo || "";
  return <svg x={x - t / 2} y={y - t / 2} width={t} height={t} viewBox="0 0 512 512" style={{ color: cor }} dangerouslySetInnerHTML={{ __html: corpo }} />;
}

function Cantos({ cor, escala = 0.32, inset = 8 }: { cor: string; escala?: number; inset?: number }) {
  const tracos = FILIGRANA.filter((p) => !p.preenchido).slice(2, 9);
  const canto = (t: string) => (
    <g transform={t}>
      {tracos.map((p, i) => (
        <path key={i} d={p.d} fill={p.veu ? cor : "none"} fillOpacity={p.veu ? 0.2 : undefined} stroke={cor} strokeWidth={(p.largura ?? 1.2) / escala * 0.45} strokeLinecap="round" />
      ))}
    </g>
  );
  return (
    <>
      {canto(`translate(${inset} ${inset}) scale(${escala})`)}
      {canto(`translate(${200 - inset} ${inset}) scale(${-escala} ${escala})`)}
      {canto(`translate(${inset} ${300 - inset}) scale(${escala} ${-escala})`)}
      {canto(`translate(${200 - inset} ${300 - inset}) scale(${-escala} ${-escala})`)}
    </>
  );
}

export function VersoCarta({ cat, nome, arte }: { cat: number; nome: string; arte?: string | null }) {
  const uid = useId().replace(/:/g, "");
  const m = MONTES[cat] || MONTES[1];
  if (arte) return <img src={arte} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />;
  const ouro = "#c9ad6e";
  return (
    <svg viewBox="0 0 200 300" className="carta-svg" aria-label={`verso do monte ${ROM[cat]}: ${nome}`}>
      <defs>
        <radialGradient id={`${uid}-f`} cx=".5" cy=".45" r=".75">
          <stop offset="0" stopColor="#2f3650" />
          <stop offset="1" stopColor="#151925" />
        </radialGradient>
        <linearGradient id={`${uid}-o`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3dfa6" />
          <stop offset=".55" stopColor="#c4a467" />
          <stop offset="1" stopColor="#7a6438" />
        </linearGradient>
        <path id={`${uid}-arco`} d="M100 150 m-45 0 a45 45 0 1 1 90 0 a45 45 0 1 1 -90 0" />
        <clipPath id={`${uid}-clip`}>
          <rect x="11" y="11" width="178" height="278" rx="5" />
        </clipPath>
      </defs>
      <rect width="200" height="300" rx="10" fill={`url(#${uid}-f)`} />
      {/* guilhochê: roseta de elipses finas, como em cédula antiga */}
      <g clipPath={`url(#${uid}-clip)`} fill="none" stroke={ouro} strokeWidth=".35" opacity=".22">
        {Array.from({ length: 36 }, (_, i) => (
          <ellipse key={i} cx="100" cy="150" rx="92" ry="34" transform={`rotate(${i * 5} 100 150)`} />
        ))}
        {Array.from({ length: 24 }, (_, i) => (
          <ellipse key={`b${i}`} cx="100" cy="150" rx="120" ry="70" transform={`rotate(${i * 7.5} 100 150)`} opacity=".5" />
        ))}
      </g>
      {/* moldura dupla e cantos */}
      <rect x="6" y="6" width="188" height="288" rx="7" fill="none" stroke={`url(#${uid}-o)`} strokeWidth="1.6" />
      <rect x="10.5" y="10.5" width="179" height="279" rx="5" fill="none" stroke={ouro} strokeWidth=".6" opacity=".8" />
      <Cantos cor={ouro} />
      {/* raios de sol em volta do medalhão */}
      <g stroke={ouro} strokeLinecap="round">
        {Array.from({ length: 32 }, (_, i) => {
          const a = (i / 32) * Math.PI * 2;
          const r1 = 52,
            r2 = i % 2 ? 66 : 76;
          return <line key={i} x1={100 + Math.cos(a) * r1} y1={150 + Math.sin(a) * r1} x2={100 + Math.cos(a) * r2} y2={150 + Math.sin(a) * r2} strokeWidth={i % 2 ? 0.5 : 1} opacity={i % 2 ? 0.45 : 0.75} />;
        })}
      </g>
      {/* medalhão */}
      <circle cx="100" cy="150" r="51" fill="#141824" stroke={`url(#${uid}-o)`} strokeWidth="1.8" />
      <circle cx="100" cy="150" r="46.5" fill="none" stroke={ouro} strokeWidth=".5" opacity=".7" />
      <text fontFamily="'Libre Baskerville', Georgia, serif" fontSize="6.4" letterSpacing="1.6" fill={ouro}>
        <textPath href={`#${uid}-arco`} startOffset="0">
          EXPOSITION UNIVERSELLE · ROUILLAC · EXPOSITION UNIVERSELLE ·
        </textPath>
      </text>
      <circle cx="100" cy="150" r="38" fill={m.esmalte} opacity=".22" />
      <circle cx="100" cy="150" r="38" fill="none" stroke={m.esmalte} strokeWidth="1.4" />
      <circle cx="100" cy="150" r="34" fill="none" stroke={ouro} strokeWidth=".6" opacity=".6" />
      <text x="100" y="163" textAnchor="middle" fontFamily="'Libre Baskerville', Georgia, serif" fontSize="34" fill={`url(#${uid}-o)`} stroke="#2a2213" strokeWidth=".6">
        {ROM[cat]}
      </text>
      {/* emblema do monte, em losango, em cima */}
      <g transform="translate(100 52)">
        <path d="M0 -17 L17 0 L0 17 L-17 0 Z" fill="#141824" stroke={`url(#${uid}-o)`} strokeWidth="1.3" />
        <path d="M0 -13 L13 0 L0 13 L-13 0 Z" fill={m.esmalte} opacity=".25" stroke={m.esmalte} strokeWidth=".7" />
      </g>
      <Emblema id={m.emblema} x={100} y={52} t={15} cor="#f3e3b5" />
      {/* faixa com o nome, embaixo */}
      <g transform="translate(100 252)">
        <path d="M-70 -9 L70 -9 L62 0 L70 9 L-70 9 L-62 0 Z" fill="#141824" stroke={`url(#${uid}-o)`} strokeWidth="1" />
        <path d="M-58 -6 L58 -6 M-58 6 L58 6" stroke={m.esmalte} strokeWidth=".6" opacity=".7" />
      </g>
      <text x="100" y="255" textAnchor="middle" fontFamily="'Source Sans 3', sans-serif" fontWeight="700" fontSize="7.5" letterSpacing="1.8" fill="#f0e2bd">
        {nome.toUpperCase()}
      </text>
    </svg>
  );
}

export function FrenteCarta({ cat, nome, num, pergunta }: { cat: number; nome: string; num: number; pergunta: string }) {
  const uid = useId().replace(/:/g, "");
  const m = MONTES[cat] || MONTES[1];
  const tinta = "#6b2320";
  const serie = `${ROM[cat]}-${String(num).padStart(2, "0")}`;
  return (
    <div className="frente-bilhete">
      <svg viewBox="0 0 200 300" className="carta-svg" aria-hidden="true">
        <defs>
          <radialGradient id={`${uid}-p`} cx=".5" cy=".45" r=".8">
            <stop offset="0" stopColor="#f4ead2" />
            <stop offset=".75" stopColor="#e8dab8" />
            <stop offset="1" stopColor="#cdb98d" />
          </radialGradient>
          <filter id={`${uid}-grao`}>
            <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="3" />
            <feColorMatrix values="0 0 0 0 .35 0 0 0 0 .25 0 0 0 0 .12 0 0 0 .09 0" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
          <radialGradient id={`${uid}-selo`} cx=".4" cy=".35" r=".8">
            <stop offset="0" stopColor="#c9443c" />
            <stop offset=".6" stopColor="#9b2226" />
            <stop offset="1" stopColor="#5c1214" />
          </radialGradient>
        </defs>
        {/* papel, com grão e manchas de idade */}
        <rect width="200" height="300" rx="10" fill={`url(#${uid}-p)`} />
        <rect width="200" height="300" rx="10" fill="#000" filter={`url(#${uid}-grao)`} />
        <circle cx="168" cy="40" r="22" fill="#b89a5e" opacity=".06" />
        <circle cx="34" cy="206" r="30" fill="#b89a5e" opacity=".05" />
        {/* molduras de tinta */}
        <rect x="7" y="7" width="186" height="286" rx="6" fill="none" stroke={tinta} strokeWidth="1.2" />
        <rect x="10.5" y="10.5" width="179" height="279" rx="4" fill="none" stroke={tinta} strokeWidth=".45" opacity=".7" />
        <Cantos cor={tinta} escala={0.26} inset={9} />
        {/* arco do cabeçalho */}
        <path d="M30 70 L30 44 Q100 6 170 44 L170 70" fill="none" stroke={tinta} strokeWidth=".9" />
        <path d="M35 70 L35 47 Q100 12 165 47 L165 70" fill="none" stroke={tinta} strokeWidth=".4" opacity=".7" />
        <path d="M30 70 L170 70" stroke={tinta} strokeWidth=".9" />
        {/* esmalte do monte numa barrinha sob o arco */}
        <path d="M100 65.5 L105 70 L100 74.5 L95 70 Z" fill={m.esmalte} stroke={tinta} strokeWidth=".6" />
        {/* carimbo com o número */}
        <g transform="translate(100 96) rotate(-8)">
          <circle r="21" fill={`url(#${uid}-selo)`} opacity=".92" />
          <circle r="18" fill="none" stroke="#f3d2c6" strokeWidth=".6" strokeDasharray="1.6 1.4" opacity=".8" />
          <text y="-6" textAnchor="middle" fontFamily="'Source Sans 3', sans-serif" fontWeight="700" fontSize="5.5" letterSpacing="1" fill="#f8e2da">
            Nº
          </text>
          <text y="10" textAnchor="middle" fontFamily="'Libre Baskerville', Georgia, serif" fontSize="17" fill="#fff1ea">
            {num}
          </text>
        </g>
        {/* linha picotada e o canhoto */}
        <line x1="14" y1="236" x2="186" y2="236" stroke={tinta} strokeWidth=".8" strokeDasharray="2.2 2.2" opacity=".75" />
        <text x="100" y="256" textAnchor="middle" fontFamily="'Source Sans 3', sans-serif" fontWeight="700" fontSize="6.6" letterSpacing="2.2" fill={tinta}>
          BILLET D'ENTRÉE
        </text>
        <text x="100" y="270" textAnchor="middle" fontFamily="'Libre Baskerville', Georgia, serif" fontSize="9.5" fill={tinta}>
          {`Nº ${serie}`}
        </text>
        <text x="100" y="281" textAnchor="middle" fontFamily="'Vollkorn', Georgia, serif" fontStyle="italic" fontSize="5.6" fill={tinta} opacity=".8">
          Exposition Universelle · Rouillac
        </text>
      </svg>
      {/* texto em HTML, que quebra linha sozinho e escala com a carta */}
      <div className="bilhete-cab">
        <span className="bilhete-programa">Programme officiel</span>
        <span className="bilhete-cat">{nome}</span>
      </div>
      <div className="bilhete-pergunta">{pergunta}</div>
    </div>
  );
}

export function CartaBuilder({
  virada,
  cat,
  nome,
  num,
  pergunta,
  arteVerso,
}: {
  virada: boolean;
  cat: number;
  nome: string;
  num: number;
  pergunta: string;
  arteVerso?: string | null;
}) {
  return (
    <div className="carta-cena">
      <div className={`carta ${virada ? "virada" : ""}`}>
        <div className="face verso">
          <VersoCarta cat={cat} nome={nome} arte={arteVerso} />
        </div>
        <div className="face frente">
          <FrenteCarta cat={cat} nome={nome} num={num} pergunta={pergunta} />
        </div>
      </div>
    </div>
  );
}
