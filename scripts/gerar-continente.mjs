// Gera content/mapas/continente.svg a partir do SVG v5 (terras) e dos GeoJSON do mapa.
// Uso: node scripts/gerar-continente.mjs [pasta-do-mapa]
// A pasta padrão é C:\Users\vbran\AI\mapa. Os GeoJSON estão no espaço do heightmap
// (7350 × 5250, y negativo); o SVG usa 2100 × 1500, então dividimos por 3,5 e invertemos y.
import fs from "node:fs";
import path from "node:path";

const SRC = process.argv[2] || "C:/Users/vbran/AI/mapa";
const OUT = path.resolve("content/mapas/continente.svg");
const ESCALA = 3.5;
const W = 2100, H = 1500;

const ler = (p) => JSON.parse(fs.readFileSync(path.join(SRC, p), "utf8"));
const pt = ([x, y]) => [x / ESCALA, -y / ESCALA];
const f1 = (n) => (Math.round(n * 10) / 10).toString();

function simplificar(pts, min = 1.2) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const [ax, ay] = out[out.length - 1];
    const [bx, by] = pts[i];
    if (Math.hypot(bx - ax, by - ay) >= min) out.push(pts[i]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}
const linha = (coords, fechar = false, min) => {
  const p = simplificar(coords.map(pt), min);
  return "M" + p.map(([x, y]) => f1(x) + "," + f1(y)).join("L") + (fechar ? "Z" : "");
};
const poligono = (geom) => {
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  return polys.map((rings) => rings.map((r) => linha(r, true, 0.8)).join("")).join("");
};
const linhas = (geom, min) => {
  const ls = geom.type === "LineString" ? [geom.coordinates] : geom.coordinates;
  return ls.map((l) => linha(l, false, min)).join("");
};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

const slug = (s) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Cores de litografia, uma por país
const CORES = {
  entremonts: "#e8b49a", bretemar: "#b8c3cc", kenturia: "#d5d3a0", codrina: "#cbb49b",
  serrania: "#e5cd94", narona: "#c6adc2", fiorescuro: "#a9c0a3", maresme: "#a9c2bb",
  "ilhas-peroladas": "#e6d9b9", "costa-do-marfim": "#e6dfcb",
};

// --- base: terras do v5 ---
const v5 = fs.readFileSync(path.join(SRC, "mapa-continente-v5.svg"), "utf8");
const terras = v5.match(/<path id="terras"[^>]*d="([^"]*)"/)[1];

// --- camadas ---
const paises = ler("politico/paises.geojson").features;
const gPaises = paises
  .map((f) => {
    const id = slug(f.properties.nome);
    return `<path data-pais="${id}" id="pais-${id}" d="${poligono(f.geometry)}" fill="${CORES[id] || "#ddd"}"/>`;
  })
  .join("\n");

const lagos = ler("lagos.geojson").features.map((f) => `<path d="${poligono(f.geometry)}"/>`).join("");
const rios = ler("rios.geojson").features
  .filter((f) => f.properties.ordem >= 2)
  .map((f) => `<path d="${linhas(f.geometry, 2)}" stroke-width="${Math.min(0.6 + f.properties.ordem * 0.35, 2.4)}"/>`)
  .join("");

const ferrovias = ler("cidades/ferrovias.geojson").features;
const fPrincipal = ferrovias.filter((f) => f.properties.tipo === "principal").map((f) => linhas(f.geometry, 2)).join("");
const fRamal = ferrovias.filter((f) => f.properties.tipo !== "principal").map((f) => linhas(f.geometry, 2)).join("");

const frentes = ler("guerra/frentes.geojson").features.map((f) => linhas(f.geometry, 1)).join("");
const ocupada = ler("guerra/zona_ocupada.geojson").features.map((f) => poligono(f.geometry)).join("");
const cortadas = ler("guerra/ferrovias_cortadas.geojson")
  .features.map((f) => {
    const [x, y] = pt(f.geometry.coordinates);
    return `<path d="M${f1(x - 4)},${f1(y - 4)}L${f1(x + 4)},${f1(y + 4)}M${f1(x - 4)},${f1(y + 4)}L${f1(x + 4)},${f1(y - 4)}"/>`;
  })
  .join("");

const cidades = ler("cidades/cidades.geojson").features;
const marca = (f) => {
  const [x, y] = pt(f.geometry.coordinates);
  const n = esc(f.properties.nome);
  if (f.properties.tipo === "capital")
    return `<g data-cidade="${n}"><rect x="${f1(x - 5)}" y="${f1(y - 5)}" width="10" height="10" fill="#fbf6ea" stroke="#2b2620" stroke-width="2"/><rect x="${f1(x - 2)}" y="${f1(y - 2)}" width="4" height="4" fill="#2b2620"/><text x="${f1(x + 9)}" y="${f1(y + 5)}" font-weight="700" font-size="15">${n}</text></g>`;
  return `<g data-cidade="${n}"><circle cx="${f1(x)}" cy="${f1(y)}" r="3.6" fill="#2b2620"/><text x="${f1(x + 7)}" y="${f1(y + 4)}" font-size="12" font-style="italic">${n}</text></g>`;
};
const gCidades = cidades.filter((f) => f.properties.tipo !== "vila").map(marca).join("\n");
const gVilas = cidades
  .filter((f) => f.properties.tipo === "vila")
  .map((f) => {
    const [x, y] = pt(f.geometry.coordinates);
    return `<circle cx="${f1(x)}" cy="${f1(y)}" r="1.6"/>`;
  })
  .join("");

// Rótulos: posições tiradas do mapa político (rascunho) do mestre
const ROT_PAISES = [
  ["BRETEMAR", 121, 467], ["CODRINA", 289, 668], ["KENTURIA", 112, 697], ["SERRANIA", 688, 556],
  ["FIORESCURO", 1150, 697], ["NARONA", 905, 857], ["MARESME", 362, 1006], ["ENTREMONTS", 407, 836],
  ["ILHAS PEROLADAS", 1638, 92], ["COSTA DO MARFIM", 1843, 1327],
];
const ROT_MARES = [["MAR DE JADE", 1001, 177], ["MAR DO INVERNO", 903, 1148], ["OCEANO", 1454, 898]];

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="'EB Garamond', Georgia, serif">
<defs>
<pattern id="hach-ocupada" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="9" stroke="#8e2a22" stroke-width="1.6" opacity=".55"/></pattern>
<pattern id="hach-mar" width="7" height="7" patternUnits="userSpaceOnUse"><line x1="0" y1="3.5" x2="7" y2="3.5" stroke="#a9bccb" stroke-width=".6" opacity=".55"/></pattern>
</defs>
<rect id="oceano" width="100%" height="100%" fill="#d6e1e6"/>
<rect id="oceano-gravura" width="100%" height="100%" fill="url(#hach-mar)"/>
<g id="grade" stroke="#b9c9d3" stroke-width="1" fill="none" opacity=".7">${Array.from({ length: 15 }, (_, i) => `<line x1="${i * 150}" y1="0" x2="${i * 150}" y2="${H}"/>`).join("")}${Array.from({ length: 11 }, (_, i) => `<line x1="0" y1="${i * 150}" x2="${W}" y2="${i * 150}"/>`).join("")}</g>
<path id="terras" d="${terras}" fill="#ece3cc" stroke="#5c5346" stroke-width="1.6"/>
<g id="paises" stroke="#6d5f4c" stroke-width="1" stroke-dasharray="4 2" fill-opacity=".85">
${gPaises}
</g>
<g id="rios" fill="none" stroke="#7d9db3" stroke-linecap="round" pointer-events="none">${rios}</g>
<g id="lagos" fill="#bcd0dc" stroke="#7d9db3" stroke-width=".8" pointer-events="none">${lagos}</g>
<g id="ferrovias" fill="none" pointer-events="none">
<path d="${fRamal}" stroke="#3b342c" stroke-width=".8" opacity=".75"/>
<path d="${fPrincipal}" stroke="#2b2620" stroke-width="2.6"/>
<path d="${fPrincipal}" stroke="#f3ead6" stroke-width="1.2" stroke-dasharray="5 5"/>
</g>
<g id="frentes" pointer-events="none">
<path d="${ocupada}" fill="url(#hach-ocupada)" stroke="#8e2a22" stroke-width="1" stroke-dasharray="3 3"/>
<path d="${frentes}" fill="none" stroke="#8e2a22" stroke-width="3.2" stroke-linejoin="round" opacity=".9"/>
<g stroke="#8e2a22" stroke-width="2">${cortadas}</g>
<g font-size="13" font-style="italic" fill="#8e2a22" text-anchor="middle" font-weight="600">
<text x="299" y="467">frente oeste</text><text x="790" y="609">frente das serras</text><text x="598" y="767">frente da costa</text><text x="1009" y="637">frente parada</text><text x="222" y="637">zona ocupada</text>
</g>
</g>
<g id="vilas" fill="#3b342c" pointer-events="none">${gVilas}</g>
<g id="cidades" fill="#2b2620" pointer-events="none">
${gCidades}
</g>
<g id="rotulos" pointer-events="none" text-anchor="middle">
<g font-size="27" font-weight="700" letter-spacing="7" fill="#2f281f" stroke="#f6efdd" stroke-width="4" paint-order="stroke">${ROT_PAISES.map(([t, x, y]) => `<text x="${x}" y="${y}">${t}</text>`).join("")}</g>
<g font-size="24" font-style="italic" letter-spacing="12" fill="#5d7486">${ROT_MARES.map(([t, x, y]) => `<text x="${x}" y="${y}">${t}</text>`).join("")}</g>
<text x="470" y="919" font-size="14" font-style="italic" letter-spacing="3" fill="#4d6f87">Rio Ferrum</text>
</g>
<g id="rosa" transform="translate(110,130)" fill="#3b342c" pointer-events="none"><path d="M0,-42 L10,0 L0,9 L-10,0 Z"/><path d="M0,42 L10,0 L0,-9 L-10,0 Z" fill="#b5ab98"/><text x="0" y="-50" font-size="22" text-anchor="middle" font-weight="700">N</text></g>
</svg>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, svg);
console.log("ok:", OUT, (svg.length / 1024).toFixed(0) + " KB");
