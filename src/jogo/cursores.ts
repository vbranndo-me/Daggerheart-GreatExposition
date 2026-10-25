// Cursores próprios em latão (32 × 32, ponta em 3,2) e os remates das barras de rolagem.
// Viram variáveis CSS no <html>; jogo-ajustes.css diz onde cada um aparece.
import { ICONES_DADOS } from "./icones-dados";

const uri = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " "))}")`;

const SETA = "M3 2 L3 23 L8.6 18 L12.6 27 L16 25.5 L12 16.8 L19.5 16.8 Z";

function seta(claro: string, medio: string, escuro: string, extra = "") {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'>
<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
<stop offset='0' stop-color='${claro}'/><stop offset='.55' stop-color='${medio}'/><stop offset='1' stop-color='${escuro}'/>
</linearGradient></defs>
<path d='${SETA}' fill='url(#g)' stroke='#0b0d14' stroke-width='1.6' stroke-linejoin='round'/>
<path d='M5 6.5 L5 18' stroke='#fff6dc' stroke-opacity='.55' stroke-width='1' stroke-linecap='round'/>
${extra}</svg>`;
}

const brilho = `<path d='M21 2 L22.2 5.8 L26 7 L22.2 8.2 L21 12 L19.8 8.2 L16 7 L19.8 5.8 Z' fill='#fff3cf' stroke='#0b0d14' stroke-width='.8'/>`;

const cadeado = ICONES_DADOS.cadeado?.corpo.replace(/currentColor/g, "#d7bc80") ?? "";
const selo = `<circle cx='22.5' cy='22.5' r='8.5' fill='#141826' stroke='#8b7a55' stroke-width='1.2'/>
<g transform='translate(16.5 16.5) scale(${12 / 512})'>${cadeado}</g>`;

const remate = (rot: number) =>
  uri(`<svg xmlns='http://www.w3.org/2000/svg' width='12' height='14' viewBox='0 0 12 14'>
<defs><linearGradient id='r' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#e3d3ad'/><stop offset='1' stop-color='#7d6a45'/></linearGradient></defs>
<g transform='rotate(${rot} 6 7)'>
<path d='M6 1 L10.6 6.6 Q11.2 8.2 9.6 9.6 L6 13 L2.4 9.6 Q0.8 8.2 1.4 6.6 Z' fill='url(#r)' stroke='#07090e' stroke-width='.9'/>
<path d='M3.8 8.2 L6 5.8 L8.2 8.2' fill='none' stroke='#2a2418' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/>
</g></svg>`);

if (typeof document !== "undefined") {
  const r = document.documentElement.style;
  r.setProperty("--cursor-seta", `${uri(seta("#f3dfae", "#c4a467", "#7a6438"))} 3 2`);
  r.setProperty("--cursor-mao", `${uri(seta("#fff1c9", "#dcbc7a", "#8c7443", brilho))} 3 2`);
  r.setProperty("--cursor-bloqueado", `${uri(seta("#a8abb5", "#7d818d", "#4b4f5a", selo))} 3 2`);
  r.setProperty("--remate-cima", remate(0));
  r.setProperty("--remate-baixo", remate(180));
}
