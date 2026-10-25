// Descobre em que país cai um ponto do continente, usando os próprios paths do SVG.
import type { ManifestoMapa, Pais } from "./conteudo";
import { carregarSvgInterno } from "./svg";

let oculto: Promise<SVGSVGElement> | null = null;

function svgOculto(m: ManifestoMapa): Promise<SVGSVGElement> {
  if (!oculto) {
    oculto = carregarSvgInterno(m.arquivo!).then((interno) => {
      const ns = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(ns, "svg");
      svg.setAttribute("viewBox", m.viewBox.join(" "));
      svg.setAttribute("aria-hidden", "true");
      svg.style.cssText = "position:absolute;left:-99999px;top:0;width:10px;height:10px;visibility:hidden;pointer-events:none";
      svg.innerHTML = interno;
      document.body.appendChild(svg);
      return svg;
    });
  }
  return oculto;
}

export async function localizadorDePaises(m: ManifestoMapa, paises: Pais[]) {
  const svg = await svgOculto(m);
  const [vx, vy, vw, vh] = m.viewBox;
  const paths = paises
    .map((p) => {
      const el =
        (p.svgId && svg.querySelector<SVGGeometryElement>(`#${CSS.escape(p.svgId)}`)) ||
        svg.querySelector<SVGGeometryElement>(`[data-pais="${p.id}"]`);
      return el ? { id: p.id, el } : null;
    })
    .filter(Boolean) as { id: string; el: SVGGeometryElement }[];
  return (u: number, v: number): string | null => {
    const pt = new DOMPoint(vx + u * vw, vy + v * vh);
    for (const { id, el } of paths) {
      try {
        if (el.isPointInFill(pt)) return id;
      } catch {
        /* navegador sem suporte */
      }
    }
    return null;
  };
}
