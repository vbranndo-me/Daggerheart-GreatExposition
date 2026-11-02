// A bolinha de um jogador no estilo das marcações da ficha do Foundry: aro de latão polido,
// vidro etéreo por dentro com a cor da pessoa em névoa e fios de energia difusos correndo.
// Duas entradas: HTML (retratos) e SVG (nós do diagrama), que embrulha a mesma bolinha HTML.
import { useId, type CSSProperties } from "react";

/** os três fios, numa grade 20 × 20 (a mesma da ficha) */
const FIOS = [
  { d: "M-20 11Q-15 5-10 11T0 11T10 11T20 11T30 11T40 11", passo: 20, dur: 5.5, giro: 0, mistura: 45, opac: 1, larg: 0.9 },
  { d: "M-10 8Q-7.5 3-5 8T0 8T5 8T10 8T15 8T20 8T25 8T30 8", passo: 10, dur: 3.8, giro: 68, mistura: 60, opac: 0.85, larg: 0.7, reverso: true },
  { d: "M-20 14Q-15 18-10 14T0 14T10 14T20 14T30 14T40 14", passo: 20, dur: 7.5, giro: -47, mistura: 75, opac: 0.7, larg: 0.6 },
];
const fio = (cor: string, mistura: number) => `color-mix(in srgb, ${cor} ${mistura}%, #fff)`;

export function BolinhaJogador({ cor, letra, tamanho = 44, k = 0, className = "", style }: { cor?: string; letra: string; tamanho?: number; k?: number; className?: string; style?: CSSProperties }) {
  const uid = useId().replace(/:/g, "");
  const c = cor || "#8a8f9c";
  return (
    <span className={`bolinha-jogador ${className}`} style={{ ["--cor" as string]: c, ["--k" as string]: k, width: tamanho, height: tamanho, fontSize: tamanho * 0.46, ...style }} aria-hidden="true">
      <span className="bolinha-vidro">
        <svg className="bolinha-fios" viewBox="0 0 20 20" preserveAspectRatio="none">
          <defs>
            {/* o halo largo e bem difuso, e o núcleo só um pouco amaciado */}
            <filter id={`${uid}-halo`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.1" />
            </filter>
            <filter id={`${uid}-nucleo`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.28" />
            </filter>
          </defs>
          {FIOS.map((f, i) => {
            const anim = `bolinha-corre-${f.passo} ${f.dur}s linear ${-(k * 0.6 + i)}s infinite ${f.reverso ? "reverse" : ""}`;
            return (
              <g key={i} style={{ transformBox: "view-box", transformOrigin: "50% 50%", transform: `rotate(${f.giro + k * (29 + i * 12)}deg)` }}>
                <g filter={`url(#${uid}-halo)`}>
                  <path d={f.d} style={{ stroke: fio(c, f.mistura), strokeOpacity: f.opac * 0.75, strokeWidth: f.larg * 4.5, animation: anim }} />
                </g>
                <g filter={`url(#${uid}-nucleo)`}>
                  <path d={f.d} style={{ stroke: fio(c, f.mistura - 20), strokeOpacity: f.opac * 0.9, strokeWidth: f.larg, animation: anim }} />
                </g>
              </g>
            );
          })}
        </svg>
      </span>
      <span className="bolinha-letra">{letra}</span>
    </span>
  );
}

/** A mesma bolinha dentro de um <svg>, centrada em (x, y) com raio r. */
export function BolinhaJogadorSvg({ x, y, r, cor, letra, k = 0, aceso }: { x: number; y: number; r: number; cor?: string; letra: string; k?: number; aceso?: boolean }) {
  return (
    <g className="bolinha-svg">
      {aceso && <circle cx={x} cy={y} r={r + 3} fill="none" stroke="var(--brass-hi)" strokeWidth="1.5" />}
      <foreignObject x={x - r} y={y - r} width={r * 2} height={r * 2} style={{ overflow: "visible" }}>
        <BolinhaJogador cor={cor} letra={letra} tamanho={r * 2} k={k} />
      </foreignObject>
    </g>
  );
}
