import { urlConteudo } from "./conteudo";

// Carrega um SVG de /content e devolve só o miolo (sem a tag <svg>), com cache.
const cacheSvg = new Map<string, Promise<string>>();
export function carregarSvgInterno(arquivo: string): Promise<string> {
  if (!cacheSvg.has(arquivo)) {
    cacheSvg.set(
      arquivo,
      fetch(urlConteudo(arquivo))
        .then((r) => r.text())
        .then((t) => t.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")),
    );
  }
  return cacheSvg.get(arquivo)!;
}
