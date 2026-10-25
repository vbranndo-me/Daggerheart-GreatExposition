// A filigrana da moldura pesada.
//
// CANTO: desenhado para o canto superior esquerdo, numa caixa de 96 × 96 cuja origem é a
// quina externa da janela. Os outros três cantos são espelhos. A moldura dupla corre a 3,5 px
// (linha forte) e 8,5 px (linha fina) da borda; no canto as duas linhas dobram num recorte
// côncavo, e é dele que nasce o ornamento. Por isso as linhas retas do border-image param
// antes do canto (ver svgMolduraPesada).
//
// FLORAO: o ornamento do meio da borda de cima, numa caixa de 120 × 30 centrada na borda,
// com y = 3,5 sobre a linha forte.
//
// É o rascunho da Direção Visual. O desenho definitivo do mestre (Inkscape, AutoCAD ou ComfyUI
// vetorizado) entra aqui como listas de "d" de <path>, e nada mais precisa mudar.

export interface TracoFiligrana {
  d: string;
  largura?: number; // espessura do traço
  preenchido?: boolean; // forma cheia (joias, botões)
  veu?: boolean; // forma com preenchimento translúcido + contorno (folhas)
}

export const FILIGRANA: TracoFiligrana[] = [
  // o recorte côncavo: as duas linhas da moldura dobram aqui
  { d: "M3.5 23 A19.5 19.5 0 0 0 23 3.5", largura: 1.5 },
  { d: "M8.5 26 A17.5 17.5 0 0 0 26 8.5", largura: 0.8 },
  // a joia no recorte
  { d: "M11.5 7.2 a4.3 4.3 0 1 0 0.01 0", largura: 1 },
  { d: "M11.5 9.6 a1.9 1.9 0 1 0 0.01 0", preenchido: true },
  // folha na diagonal, com nervura
  { d: "M20 20 C29 21 36 28 37 37 C28 36 21 29 20 20 Z", veu: true, largura: 1.1 },
  { d: "M21.5 21.5 L34.5 34.5", largura: 0.6 },
  // voluta que sai da ponta da folha
  { d: "M37 37 C41 41.5 40 47 35.5 47.5 C32 48 30.5 44.5 33 43.2", largura: 1.1 },
  // gavinha de cima: nasce da linha fina, mergulha numa espiral e corre pela borda, afinando
  { d: "M26 8.5 C33 8.8 38.5 13.5 36.5 18 C35 21 31 20.6 31.3 17.8", largura: 1.3 },
  { d: "M36.5 18 C46 24 58 18.5 70 14.6", largura: 1.1 },
  { d: "M70 14.6 C77 12.4 84 11.2 92 11", largura: 0.6 },
  // gavinha do lado (mais curta, para caber em janelas baixas)
  { d: "M8.5 26 C8.8 33 13.5 38.5 18 36.5 C21 35 20.6 31 17.8 31.3", largura: 1.3 },
  { d: "M18 36.5 C24 44 19 54 15.5 62", largura: 1.1 },
  { d: "M15.5 62 C13.6 66.5 11.8 70 11 74", largura: 0.6 },
  // folhinhas e botões ao longo das gavinhas
  { d: "M52 19.6 C55 14.6 60 13 63.5 14.4 C60.5 17.6 56.5 19.8 52 19.6 Z", veu: true, largura: 0.8 },
  { d: "M20.2 48 C15.6 50.6 13.8 55 15 58.5 C18 55.8 20.4 52 20.2 48 Z", veu: true, largura: 0.8 },
  { d: "M70 12.9 a1.7 1.7 0 1 0 0.01 0", preenchido: true },
  { d: "M13.8 62 a1.6 1.6 0 1 0 0.01 0", preenchido: true },
  { d: "M44.5 23.2 a1.1 1.1 0 1 0 0.01 0", preenchido: true },
  { d: "M23.6 42 a1.1 1.1 0 1 0 0.01 0", preenchido: true },
];

// Florão do meio da borda de cima (caixa 120 × 30, eixo de simetria em x = 60).
export const FLORAO: TracoFiligrana[] = [
  // escudete central
  { d: "M60 3.5 L67 10.5 L60 19 L53 10.5 Z", veu: true, largura: 1.1 },
  { d: "M60 8 a2.4 2.4 0 1 0 0.01 0", preenchido: true },
  // volutas para os dois lados, apoiadas na linha fina
  { d: "M67 10.5 C74 8.5 79 9.5 82 13 C84 16 81.5 19 78.8 17.6 C76.8 16.5 77.6 14 79.4 14.4", largura: 1.2 },
  { d: "M53 10.5 C46 8.5 41 9.5 38 13 C36 16 38.5 19 41.2 17.6 C43.2 16.5 42.4 14 40.6 14.4", largura: 1.2 },
  // hastes que se perdem na linha
  { d: "M82 13 C90 11.5 98 10 112 9.2", largura: 0.6 },
  { d: "M38 13 C30 11.5 22 10 8 9.2", largura: 0.6 },
  // gota pendente
  { d: "M60 19 C61.6 21.6 61.6 24 60 26 C58.4 24 58.4 21.6 60 19 Z", preenchido: true },
];

// Moldura dupla de latão para border-image (9-slice, corte de 26 px).
// As linhas retas param antes dos cantos, onde a filigrana faz o recorte côncavo.
export function svgMolduraPesada(cor = "#B69A60") {
  const s = `<svg xmlns='http://www.w3.org/2000/svg' width='78' height='78' viewBox='0 0 78 78'>
<g fill='none' stroke='${cor}'>
<path stroke-width='1.5' d='M23 3.5H55M23 74.5H55M3.5 23V55M74.5 23V55'/>
<path stroke-width='.8' d='M26 8.5H52M26 69.5H52M8.5 26V52M69.5 26V52'/>
</g>
</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
}
