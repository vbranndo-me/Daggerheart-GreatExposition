// npm run arte: gera as imagens do app a partir dos originais do mestre.
//
//  content/arte/fonte/        os PNG originais, com os nomes que o mestre deu (espaço, acento e maiúscula)
//  content/arte/mapa-arte.json  id da arte -> nome do arquivo original (null = ainda não existe)
//  public/arte/<id>-<largura>.webp  o que o app usa (nunca o nome original)
//  public/arte/arte.json        por id: larguras geradas, proporção real e cor média
//
// O código da app só pede a arte pelo id. Para trocar uma imagem: ponha o PNG novo na fonte/ com o mesmo
// nome e rode `npm run arte`. Para uma imagem nova: ponha o PNG e acrescente a linha no mapa-arte.json.
// Avisa, sem falhar: arquivo da fonte sem id, id sem arquivo, imagem menor que o tamanho-alvo.
// Sem a pasta fonte/ (por exemplo, na publicação automática), não faz nada: o public/arte já vem pronto.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const raiz = path.resolve(import.meta.dirname, "..");
const fonte = path.join(raiz, "content/arte/fonte");
const mapaArq = path.join(raiz, "content/arte/mapa-arte.json");
const saida = path.join(raiz, "public/arte");

if (!fs.existsSync(fonte) || !fs.existsSync(mapaArq)) {
  console.log("arte: sem content/arte/fonte (ou mapa-arte.json); mantendo public/arte como está.");
  process.exit(0);
}

const nfc = (s) => s.normalize("NFC").toLowerCase(); // sem diferenciar maiúscula: o Windows não diferencia e o Linux da publicação sim
const mapa = JSON.parse(fs.readFileSync(mapaArq, "utf8"));
const arquivos = fs.readdirSync(fonte).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
const porNome = new Map(arquivos.map((f) => [nfc(f), f]));

/** O tipo da arte (pelo começo do id) decide as larguras do srcset. */
function tipo(id) {
  if (/^(abertura-|chamada-|respiro-)/.test(id)) return { larguras: [1280, 1920, 2560], rotulo: "abertura 21:9" };
  if (/^(comunidade-|ancestralidade-|classe-|subclasse-)/.test(id) || ["corte", "distincoes", "classes-cenario", "refugiados", "armatabela", "discernimento", "frenesi", "ecclesia", "veu", "compulsao", "principios-mestre", "modulo-ficha"].includes(id)) return { larguras: [384, 768], rotulo: "cartaz 3:4" };
  if (/^pais-/.test(id)) return { larguras: [384, 768], rotulo: "brasão 1:1" };
  return { larguras: [512, 1024], rotulo: "outra" };
}

fs.mkdirSync(saida, { recursive: true });
/** Brasões vêm com fundo preto: o preto ligado à borda vira transparente e a imagem é recortada rente ao desenho. */
async function brasaoTransparente(orig) {
  const { data, info: i } = await sharp(orig).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = i;
  const escuro = (k) => Math.max(data[k * 4], data[k * 4 + 1], data[k * 4 + 2]) < 40;
  const fundo = new Uint8Array(W * H);
  const fila = [];
  const semear = (k) => {
    if (!fundo[k] && escuro(k)) {
      fundo[k] = 1;
      fila.push(k);
    }
  };
  for (let x = 0; x < W; x++) {
    semear(x);
    semear((H - 1) * W + x);
  }
  for (let y = 0; y < H; y++) {
    semear(y * W);
    semear(y * W + W - 1);
  }
  for (let q = 0; q < fila.length; q++) {
    const k = fila[q];
    const x = k % W;
    if (x > 0) semear(k - 1);
    if (x < W - 1) semear(k + 1);
    if (k >= W) semear(k - W);
    if (k < W * (H - 1)) semear(k + W);
  }
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let k = 0; k < W * H; k++) {
    if (fundo[k]) {
      data[k * 4 + 3] = 0;
      continue;
    }
    const x = k % W, y = (k / W) | 0;
    const borda = (x > 0 && fundo[k - 1]) || (x < W - 1 && fundo[k + 1]) || (y > 0 && fundo[k - W]) || (y < H - 1 && fundo[k + W]);
    if (borda) data[k * 4 + 3] = Math.max(0, Math.min(255, ((Math.max(data[k * 4], data[k * 4 + 1], data[k * 4 + 2]) - 30) / 70) * 255));
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  const m = Math.round(Math.max(x1 - x0, y1 - y0) * 0.02);
  x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(W - 1, x1 + m); y1 = Math.min(H - 1, y1 + m);
  const buffer = await sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
    .png()
    .toBuffer();
  return { buffer, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

const info = {};
const usados = new Set();
const avisos = { semId: [], semArquivo: [], pequena: [] };

for (const [id, nome] of Object.entries(mapa)) {
  if (!nome) continue;
  const real = porNome.get(nfc(nome));
  if (!real) {
    avisos.semArquivo.push(`${id} → ${nome}`);
    continue;
  }
  usados.add(real);
  const orig = path.join(fonte, real);
  let fonteImg = orig;
  let meta = await sharp(orig).metadata();
  const ehBrasao = id.startsWith("pais-");
  if (ehBrasao) {
    const b = await brasaoTransparente(orig);
    fonteImg = b.buffer;
    meta = { width: b.width, height: b.height };
  }
  const { larguras } = tipo(id);
  const feitas = [];
  for (const w of larguras) {
    const largura = Math.min(w, meta.width);
    const destino = path.join(saida, `${id}-${w}.webp`);
    // só refaz se o original mudou depois da última geração
    if (!fs.existsSync(destino) || fs.statSync(destino).mtimeMs < fs.statSync(orig).mtimeMs) {
      await sharp(fonteImg).resize({ width: largura, withoutEnlargement: true }).webp({ quality: 85, alphaQuality: 100 }).toFile(destino);
    }
    feitas.push(w);
  }
  if (meta.width < larguras[larguras.length - 1]) avisos.pequena.push(`${id} (${meta.width} px; alvo ${larguras[larguras.length - 1]})`);
  const { dominant, channels } = await sharp(fonteImg).resize(16, 16, { fit: "cover" }).stats();
  const cor = `rgb(${Math.round(channels[0].mean)},${Math.round(channels[1].mean)},${Math.round(channels[2].mean)})`;
  void dominant;
  info[id] = { larguras: feitas, proporcao: +(meta.width / meta.height).toFixed(3), cor };
}

for (const f of arquivos) if (!usados.has(f)) avisos.semId.push(f);
// remove o que ficou órfão em public/arte (um id que saiu do mapa)
for (const f of fs.readdirSync(saida)) {
  const m = f.match(/^(.*)-\d+\.webp$/);
  if (m && !info[m[1]]) fs.unlinkSync(path.join(saida, f));
}
fs.writeFileSync(path.join(saida, "arte.json"), JSON.stringify(info, null, 1));

console.log(`arte: ${Object.keys(info).length} ids com imagem; ${Object.values(mapa).filter((v) => !v).length} ainda sem arquivo.`);
if (avisos.semId.length) console.log(`\n⚠ na fonte/ mas em nenhum id (imagem nova ou nome trocado):\n  ${avisos.semId.join("\n  ")}`);
if (avisos.semArquivo.length) console.log(`\n⚠ o id aponta para um arquivo que não existe:\n  ${avisos.semArquivo.join("\n  ")}`);
if (avisos.pequena.length) console.log(`\n⚠ menor que o tamanho-alvo (serve, mas pode ser trocada pelo mesmo nome):\n  ${avisos.pequena.join("\n  ")}`);
