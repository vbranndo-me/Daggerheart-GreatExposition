// Procura palavras de uma lista em content/** e AVISA (não bloqueia).
// A lista fica em .spoilers.txt (uma palavra ou expressão por linha), FORA do git, porque ela mesma seria um spoiler.
// Uso: npm run spoiler   (rode antes de cada push)
import fs from "node:fs";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..");
const listaArq = path.join(raiz, ".spoilers.txt");
if (!fs.existsSync(listaArq)) {
  console.log("Não achei .spoilers.txt na raiz do projeto.");
  console.log("Crie o arquivo com uma palavra ou expressão por linha (ele não vai para o git) e rode de novo.");
  process.exit(0);
}
const palavras = fs
  .readFileSync(listaArq, "utf8")
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"));
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const alvos = palavras.map((p) => ({ p, n: norm(p) }));

function arquivos(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "arte" ? [] : arquivos(f);
    return /\.(md|json|txt|svg)$/i.test(e.name) ? [f] : [];
  });
}

let achados = 0;
for (const f of arquivos(path.join(raiz, "content"))) {
  const linhas = fs.readFileSync(f, "utf8").split(/\r?\n/);
  linhas.forEach((l, i) => {
    const n = norm(l);
    for (const a of alvos) {
      if (a.n && n.includes(a.n)) {
        achados++;
        console.log(`${path.relative(raiz, f)}:${i + 1}  «${a.p}»  ${l.trim().slice(0, 110)}`);
      }
    }
  });
}
console.log(achados ? `\n${achados} ocorrência(s). Olhe caso a caso: palavras como "ritual" podem ser legítimas.` : "Nenhuma ocorrência.");
