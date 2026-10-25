// Mantém content/arte/manifest.json (todas as vagas de arte do app) e gera content/arte/PEDIDOS.md,
// a lista de pedidos para levar ao ComfyUI.
// Uso: npm run pedidos-arte
// Vagas novas (classe ou país novo no conteúdo) entram sozinhas; o que já existe no manifesto,
// incluindo "arquivo" e "pedido" editados à mão, é preservado.
import fs from "node:fs";
import path from "node:path";

const C = path.resolve("content");
const ler = (f) => JSON.parse(fs.readFileSync(path.join(C, f), "utf8"));
const MANIFESTO = path.join(C, "arte/manifest.json");

const classes = ler("classes.json");
const paises = ler("paises.json");
const origens = ler("origens.json");
const builder = ler("builder.json");

const capitulos = [
  ["cap-0", "Registro de chegada", "cais de desembarque em Rouillac ao entardecer, malas e lampiões a gás, vapor do trem"],
  ["cap-1", "O convite", "envelope lacrado com selo de cera vermelho sobre uma mesa de mármore, luz de vela"],
  ["cap-2", "Protocolo", "mesa de diplomatas com tinteiro, pena e um documento oficial, luz fria de janela"],
  ["cap-3", "O continente", "mesa de cartógrafo com o continente aberto, compasso de latão, luz de gás"],
  ["cap-4", "Ficha de registro", "balcão de registro da Exposição, livro de assinaturas aberto, carimbos"],
  ["cap-5", "A Exposição", "a Tour de l'Exposition iluminada à noite, pavilhões de ferro e vidro, multidão em silhueta"],
  ["cap-6", "Laços", "fios vermelhos ligando fotografias presas num quadro de cortiça"],
  ["cap-7", "Fecho do registro", "livro de registro fechado com fita e lacre, vela quase apagada"],
];

const vagas = [
  ...capitulos.map(([id, nome, pedido]) => ({ id, grupo: "Vinhetas de capítulo", onde: `vinheta do capítulo ${nome}`, proporcao: "1:1", px: 512, pedido })),
  ...origens.map((o) => ({ id: `papel-${o.id}`, grupo: "Papéis", onde: `ramo do papel ${o.nome}`, proporcao: "1:1", px: 512, pedido: `retrato simbólico de um(a) ${o.nome.toLowerCase()} na Exposição Universal, gravura em tons de latão` })),
  ...classes.map((c) => ({ id: `classe-${c.id}`, grupo: "Classes", onde: `vitrine de classes: ${c.nome}`, proporcao: "3:4", px: "600×800", pedido: `${c.nome}, Belle Époque, ${c.fantasia.replace(/^\[Exemplo\]\s*/, "")}` })),
  ...paises.map((p) => ({ id: `pais-${p.id}`, grupo: "Brasões e vinhetas de país", onde: `ficha do país ${p.nome}`, proporcao: "1:1", px: 512, pedido: `brasão ou vinheta de ${p.nome} (sabor ${p.sabor}), estilo gravura do século XIX` })),
  ...builder.categorias.map((c) => ({ id: `verso-${c.d4}`, grupo: "Versos de carta do builder", onde: `verso do monte ${c.d4}: ${c.nome}`, proporcao: "2:3", px: "600×900", pedido: `verso de carta art nouveau para "${c.nome}", moldura de ferro fundido, simetria` })),
  ...[1, 2, 3, 4, 5].map((n) => ({ id: `retrato-${n}`, grupo: "Retratos da tripulação (opcional)", onde: `retrato do jogador ${n} no HUD`, proporcao: "1:1", px: 256, pedido: "retrato do personagem do jogador, recorte circular" })),
  ...ler("comunidades.json").map((c) => ({ id: `comunidade-${c.id}`, grupo: "Quem Vocês São: comunidades", onde: `cartão da comunidade ${c.nome} (ficha, galeria e criador)`, proporcao: "3:4", px: "768×1024", pedido: `retrato simbólico da comunidade ${c.nome}, Belle Époque, gravura em tons de latão` })),
  ...(fs.existsSync(path.join(C, "ancestralidades.json")) ? ler("ancestralidades.json") : []).map((a) => ({ id: `ancestralidade-${a.id}`, grupo: "Quem Vocês São: ancestralidades", onde: `cartão da ancestralidade ${a.nome} (galeria e criador)`, proporcao: "3:4", px: "768×1024", pedido: `retrato de ${a.nome}, Belle Époque` })),
  ...classes.filter((c) => c.nova).map((c) => ({ id: `abertura-classe-${c.id}`, grupo: "Fichas de classe (abertura)", onde: `abertura da ficha da classe ${c.nome}`, proporcao: "21:9", px: "2560×1100", pedido: `${c.nome}: ${c.fantasia.replace(/^\[Exemplo\]\s*/, "")} Deixe a parte de baixo mais simples (chão, sombra, névoa), é nela que entra o texto.` })),
  ...classes.filter((c) => c.nova).flatMap((c) => c.subclasses.map((sc, i) => ({ id: `subclasse-${c.id}-${i + 1}`, grupo: "Subclasses (criador)", onde: `subclasse ${i + 1} de ${c.nome} no criador`, proporcao: "3:4", px: "768×1024", pedido: `${c.nome}, subclasse ${sc.nome === "a definir" ? i + 1 : sc.nome}` }))),
  ...(fs.existsSync(path.join(C, "cartas.json")) ? ler("cartas.json") : []).map((k) => ({ id: `carta-${k.id}`, grupo: "Cartas de domínio (Figma)", onde: `carta ${k.nome}`, proporcao: "63:88", px: "1260×1760", pedido: `carta de domínio "${k.nome}" (${k.dominio}, nível ${k.nivel}); a arte vem do Figma` })),
  { id: "retrato-placeholder", grupo: "O Arquivo", onde: "retrato do personagem no criador, enquanto o jogador não envia uma imagem", proporcao: "3:4", px: "768×1024", pedido: "silhueta em gravura de um convidado da Exposição, de busto, sem rosto definido, tons de latão sobre azul-petróleo" },
  { id: "selo-expo", grupo: "Selo e lacre", onde: "selo da Exposição no HUD", proporcao: "1:1", px: "SVG ou PNG transparente", pedido: "selo circular da Exposição Universal de Rouillac com a torre ao centro, traço de latão" },
  { id: "lacre-convite", grupo: "Selo e lacre", onde: "lacre do envelope do convite", proporcao: "1:1", px: "SVG ou PNG transparente", pedido: "lacre de cera vermelha com a letra E (Entremonts)" },
];

// as artes que as seções do Arquivo pedem (id, tipo e descrição vêm do frontmatter de content/arquivo/*.md)
const TIPOS = { I: ["21:9", "2560×1100"], C: ["21:9", "2560×1100"], A: ["3:4", "768×1024"], B: ["3:4", "768×1024"], K: ["4:3", "1280×960"], G: ["4:3", "1280×960"], E: ["1:1", "512×512"] };
const dirArq = path.join(C, "arquivo");
if (fs.existsSync(dirArq))
  for (const f of fs.readdirSync(dirArq).filter((x) => x.endsWith(".md") && !x.startsWith("efemera-"))) {
    const t = fs.readFileSync(path.join(dirArq, f), "utf8");
    const m = t.match(/^arte:\s*\{\s*id:\s*"([^"]+)",\s*tipo:\s*([A-K]),\s*desc:\s*"([^"]*)"/m);
    const titulo = (t.match(/^titulo:\s*(.*)$/m) || [, f])[1] || "(respiro)";
    // as seções de mapa mostram o mapa de verdade, não uma arte
    if (m && !/^layout:\s*mapa/m.test(t)) {
      const [prop, px] = TIPOS[m[2]] || ["16:9", "1920×1080"];
      vagas.push({ id: m[1], grupo: "O Arquivo", onde: `seção "${titulo}" do Arquivo (tipo ${m[2]})`, proporcao: prop, px, pedido: m[3] });
    }
  }
// o mesmo id pode vir de dois lugares: vale o primeiro
const unicas = [...new Map(vagas.map((v) => [v.id, v]).reverse()).values()].reverse();

let atual = [];
try {
  atual = JSON.parse(fs.readFileSync(MANIFESTO, "utf8"));
} catch {
  /* primeira vez */
}
const porId = new Map(atual.map((v) => [v.id, v]));
const final = unicas.map((v) => {
  const antigo = porId.get(v.id);
  const { grupo, ...resto } = v;
  return antigo ? { ...resto, ...antigo, grupo } : { ...resto, arquivo: null, grupo };
});
// vagas criadas à mão no manifesto continuam
for (const v of atual) if (!final.some((f) => f.id === v.id)) final.push(v);

fs.mkdirSync(path.dirname(MANIFESTO), { recursive: true });
fs.writeFileSync(MANIFESTO, JSON.stringify(final, null, 2) + "\n");

const grupos = [...new Set(final.map((v) => v.grupo || "Outras"))];
const L = [
  "# Pedidos de arte",
  "",
  "Gerado por `npm run pedidos-arte` a partir de `content/arte/manifest.json`. Não edite este arquivo; edite o manifesto.",
  "",
  "Quando uma imagem ficar pronta: salve em `content/arte/` (de preferência `.webp`) e ponha o nome do arquivo no campo `arquivo` da vaga no manifesto. O app troca o placeholder pela imagem sozinho.",
  "",
  `Feitas: ${final.filter((v) => v.arquivo).length} de ${final.length}.`,
  "",
];
for (const g of grupos) {
  L.push(`## ${g}`, "");
  L.push("| feita | id | onde aparece | tamanho | pedido |", "|---|---|---|---|---|");
  for (const v of final.filter((x) => (x.grupo || "Outras") === g))
    L.push(`| ${v.arquivo ? "✓" : " "} | \`${v.id}\` | ${v.onde} | ${v.proporcao}, ${v.px} | ${v.pedido.replace(/\|/g, "/")} |`);
  L.push("");
}
fs.writeFileSync(path.join(C, "arte/PEDIDOS.md"), L.join("\n"));
console.log(`ok: ${final.length} vagas (${final.filter((v) => v.arquivo).length} com arte)`);
