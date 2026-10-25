// Copia do pacote game-icons.net só os ícones que o app usa, para src/jogo/icones-dados.ts.
// Para trocar um ícone: mude o nome aqui (veja https://game-icons.net) e rode `npm run icones`.
// Licença dos ícones: CC BY 3.0 (crédito no README e no kit).
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const pacote = require("@iconify-json/game-icons/icons.json");

// id no app → [nome no game-icons, nome em português]
const MAPA = {
  // capítulos
  "cap-0": ["steam-locomotive", "Registro de chegada"],
  "cap-1": ["envelope", "O convite"],
  "cap-2": ["checked-shield", "Protocolo"],
  "cap-3": ["compass", "O continente"],
  "cap-4": ["quill-ink", "Ficha de registro"],
  "cap-5": ["radio-tower", "A Exposição"],
  "cap-6": ["linked-rings", "Laços"],
  "cap-7": ["book-cover", "Fecho do registro"],
  // tipos de alfinete
  origem: ["house", "Origem"],
  memoria: ["portrait", "Memória"],
  rumor: ["talk", "Rumor"],
  pessoa: ["person", "Pessoa"],
  pavilhao: ["greek-temple", "Pavilhão"],
  escandalo: ["newspaper", "Escândalo"],
  lugar: ["position-marker", "Lugar"],
  boato: ["all-seeing-eye", "Boato"],
  // papéis
  convidado: ["top-hat", "Convidado ilustre"],
  refugiado: ["suitcase", "Refugiado"],
  funcionario: ["monkey-wrench", "Funcionário da feira"],
  outro: ["drama-masks", "Outra coisa"],
  // lentes do mapa
  "lente-politica": ["flag-objective", "Político"],
  "lente-guerra": ["crossed-swords", "Guerra"],
  "lente-ferrovias": ["railway", "Ferrovias"],
  "lente-cidades": ["castle", "Cidades"],
  // ações e sistema
  escrever: ["quill", "Escrever"],
  rolar: ["rolling-dices", "Rolar"],
  abrir: ["entry-door", "Abrir"],
  selar: ["wax-seal", "Selar (privado)"],
  visto: ["check-mark", "Feito"],
  cadeado: ["padlock", "Trancado"],
  som: ["speaker", "Som"],
  "som-off": ["speaker-off", "Som desligado"],
  ajustes: ["cog", "Ajustes"],
  mesa: ["round-table", "Mesa do Mestre"],
  info: ["info", "Dica"],
  regua: ["measure-tape", "Régua"],
  "ver-tudo": ["world", "Ver o mapa todo"],
  fechar: ["cancel", "Fechar"],
};

const saida = {};
for (const [id, [nome, rotulo]] of Object.entries(MAPA)) {
  const ic = pacote.icons[nome];
  if (!ic) throw new Error(`ícone não existe no game-icons: ${nome}`);
  saida[id] = { nome: rotulo, origem: nome, corpo: ic.body };
}
const ts = `// GERADO por scripts/extrair-icones.mjs a partir de game-icons.net (CC BY 3.0). Não edite à mão.
export const ICONES_DADOS: Record<string, { nome: string; origem: string; corpo: string }> = ${JSON.stringify(saida, null, 2)};
`;
fs.writeFileSync("src/jogo/icones-dados.ts", ts);
console.log(`ok: ${Object.keys(saida).length} ícones`);
