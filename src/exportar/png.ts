// Renderiza um mapa (SVG) num <canvas>, com ou sem alfinetes, e devolve um PNG.
import type { ManifestoMapa } from "../conteudo";
import { urlConteudo } from "../conteudo";
import type { Jogador, Pin } from "../db/tipos";

async function svgDoMapa(m: ManifestoMapa): Promise<string> {
  if (m.arquivo) {
    let t = await (await fetch(urlConteudo(m.arquivo))).text();
    // camadas desligadas por padrão ficam escondidas na imagem
    const off = (m.camadas || []).filter((c) => !c.ligada).map((c) => `#${c.id}{display:none}`);
    if (off.length) t = t.replace(/(<svg[^>]*>)/, `$1<style>${off.join("")}</style>`);
    return t;
  }
  const base = m.bases?.[0];
  if (!base) throw new Error("mapa sem base");
  return (await fetch(urlConteudo(base.arquivo))).text();
}

function carregarImagem(svg: string): Promise<HTMLImageElement> {
  return new Promise((ok, falha) => {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    img.onload = () => {
      ok(img);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    img.onerror = () => falha(new Error("não deu para desenhar o SVG"));
    img.src = url;
  });
}

function desenharPin(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, cor: string) {
  const hx = x + r * 0.5,
    hy = y - r * 2.4;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.3)";
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.35, r * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a5048";
  ctx.lineWidth = r * 0.22;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + r * 0.5, y - r * 2.3);
  ctx.stroke();
  ctx.fillStyle = cor;
  ctx.strokeStyle = "#1b1712";
  ctx.lineWidth = r * 0.12;
  ctx.beginPath();
  ctx.arc(hx, hy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const g = ctx.createRadialGradient(hx - r * 0.3, hy - r * 0.4, 0, hx, hy, r);
  g.addColorStop(0, "rgba(255,255,255,.75)");
  g.addColorStop(0.35, "rgba(255,255,255,0)");
  g.addColorStop(1, "rgba(0,0,0,.35)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(hx, hy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export async function renderizarMapa(
  m: ManifestoMapa,
  opcoes: { largura?: number; pins?: Pin[]; jogadores?: Record<string, Jogador>; legenda?: boolean; numerar?: boolean },
): Promise<{ blob: Blob; largura: number; altura: number }> {
  const largura = opcoes.largura || 4096;
  const [, , vw, vh] = m.viewBox;
  const altura = Math.round((largura * vh) / vw);
  const img = await carregarImagem(await svgDoMapa(m));
  const jog = opcoes.jogadores || {};
  const autores = [...new Set((opcoes.pins || []).map((p) => p.autor))];
  const faixa = opcoes.legenda && opcoes.pins?.length ? Math.round(largura * 0.045) : 0;
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura + faixa;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f3ead5";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, largura, altura);

  if (opcoes.pins?.length) {
    const r = largura / 260;
    const ord = [...opcoes.pins].sort((a, b) => a.v - b.v);
    for (const p of ord) desenharPin(ctx, p.u * largura, p.v * altura, r, p.autor === "mestre" ? "#221c15" : jog[p.autor]?.cor || "#776a59");
    // títulos ao lado de cada alfinete
    ctx.font = `600 ${Math.round(r * 1.5)}px Georgia, serif`;
    ctx.textBaseline = "middle";
    for (const p of ord) {
      const x = p.u * largura + r * 1.9,
        y = p.v * altura - r * 2.4;
      ctx.lineWidth = r * 0.5;
      ctx.strokeStyle = "rgba(249,243,228,.9)";
      ctx.strokeText(p.titulo, x, y);
      ctx.fillStyle = "#221c15";
      ctx.fillText(p.titulo, x, y);
    }
  }

  if (faixa) {
    ctx.fillStyle = "#f9f3e4";
    ctx.fillRect(0, altura, largura, faixa);
    ctx.fillStyle = "#221c15";
    ctx.fillRect(0, altura, largura, 4);
    const fs = Math.round(faixa * 0.36);
    ctx.font = `${fs}px Georgia, serif`;
    ctx.textBaseline = "middle";
    let x = fs;
    const y = altura + faixa / 2;
    ctx.fillText("Alfinetes:", x, y);
    x += ctx.measureText("Alfinetes: ").width + fs * 0.5;
    for (const a of autores) {
      const cor = a === "mestre" ? "#221c15" : jog[a]?.cor || "#776a59";
      const nome = a === "mestre" ? "Mestre" : jog[a]?.nome || "?";
      ctx.fillStyle = cor;
      ctx.beginPath();
      ctx.arc(x + fs * 0.4, y, fs * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#221c15";
      ctx.fillText(nome, x + fs * 1.1, y);
      x += fs * 1.1 + ctx.measureText(nome).width + fs * 1.2;
    }
  }

  const blob: Blob = await new Promise((ok, falha) => canvas.toBlob((b) => (b ? ok(b) : falha(new Error("canvas vazio"))), "image/png"));
  return { blob, largura, altura };
}
