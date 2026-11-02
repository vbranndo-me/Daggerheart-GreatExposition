// Dados de exemplo: Alquimista / Apotecária, nível 3. Servem à página de ensaio (#/ficha) e ao
// pacote do Foundry (FichaExposicao.exemplo()), para testar a ficha sem um ator de verdade.
import type { FichaDados } from "./tipos";
import { CARTAS_EXEMPLO as C } from "./exemplo-cartas";

const SVG_SABIO =
  '<svg viewBox="0 0 32 32" fill="currentColor"><path d="M16 5C9 5 4 12 2 16c2 4 7 11 14 11s12-7 14-11c-2-4-7-11-14-11zm0 3.4c4.2 0 7.6 3.4 7.6 7.6S20.2 23.6 16 23.6 8.4 20.2 8.4 16 11.8 8.4 16 8.4zM16 11a5 5 0 100 10 5 5 0 000-10zm0 2.6a2.4 2.4 0 110 4.8 2.4 2.4 0 010-4.8z"/></svg>';
const SVG_CODICE =
  '<svg viewBox="0 0 32 32" fill="currentColor"><path d="M3 6.5c4-1.2 9-1 13 1.6 4-2.6 9-2.8 13-1.6V24c-4-1.2-9-1-13 1.6C12 23 7 22.800 3 24zM15 10.5c-3-1.6-6.5-1.8-9.5-1v12.4c3-.8 6.5-.6 9.5 1zm2 0v12.400c3-1.600 6.500-1.800 9.500-1V9.500c-3-.8-6.500-.6-9.500 1z"/></svg>';

export function exemplo(): FichaDados {
  return {
    nome: "Marguerite Valcourt",
    classe: "Alquimista",
    subclasse: "Apotecária",
    origem: "Erudita · Humana",
    nivel: 3,
    patamar: 2,
    dominios: [
      { nome: "Sábio", svg: SVG_SABIO },
      { nome: "Códice", svg: SVG_CODICE },
    ],
    recursos: {
      pv: { marcados: 2, max: 6 },
      fadiga: { marcados: 3, max: 7 },
      armadura: { marcados: 1, max: 3 },
      esperanca: { valor: 4, max: 6, desabilitados: [false, false, false, false, false, false] },
      discernimento: { valor: 5, max: 12, marcos: [4, 8, 12] },
      frenesi: { valor: 1, max: 4, desabilitados: [false, false, false, false], surto: false },
    },
    evasao: 10,
    limiares: { maior: 8, grave: 16 },
    habilidadeEsperanca: { nome: "Solve et Coagula", html: "<p>Troque o conteúdo de um frasco pronto por outra receita, na hora.</p>", custo: 3 },
    compulsao: null,
    experiencias: [
      { id: "exp1", nome: "Boticária de bairro, de madrugada", bonus: 2 },
      { id: "exp2", nome: "Não confie em rótulo, prove você mesma", bonus: 2 },
    ],
    tracos: [
      { id: "agi", nome: "Agilidade", mod: 0 },
      { id: "for", nome: "Força", mod: -1 },
      { id: "acu", nome: "Acuidade", mod: 1 },
      { id: "ins", nome: "Instinto", mod: 1 },
      { id: "pre", nome: "Presença", mod: 0 },
      { id: "con", nome: "Conhecimento", mod: 3, conjuracao: true },
    ],
    grupos: [
      {
        origem: "Classe",
        fonte: "Alquimista",
        habilidades: [
          {
            id: "principios",
            nome: "Os Três Princípios",
            tipo: "recurso",
            cores: ["#2f8f6b", "#c9a24a"],
            html: "<p><i>Sal</i> (o corpo: cura, proteção), <i>Enxofre</i> (o fogo: dano, explosão) e <i>Mercúrio</i> (a mudança: veneno, sono, transformação). A bolsa guarda até patamar + 6 Princípios, em qualquer combinação.</p><p>Receitas custam 2 Princípios; a dupla define o efeito. Um terceiro Princípio, como Reação, sobe a mistura um degrau.</p>",
            recurso: {
              tipo: "contadores",
              limiteTotal: 8,
              itens: [
                { id: "sal", nome: "Sal", valor: 2, cor: "radial-gradient(circle at 35% 30%, #f0eadb, #9a9484)" },
                { id: "enxofre", nome: "Enxofre", valor: 1, cor: "radial-gradient(circle at 35% 30%, #f4d065, #b0841c)" },
                { id: "mercurio", nome: "Mercúrio", valor: 3, cor: "radial-gradient(circle at 35% 30%, #d4dbe3, #7a8795)" },
              ],
            },
          },
          { id: "bancada", nome: "Bancada", tipo: "acao", cores: ["#8a5a2b", "#d7bc80"], custo: "no descanso", html: "<p>Com a bancada à mão, engarrafe misturas prontas durante o descanso. Elas ficam na maleta, no Inventário, até serem usadas.</p>" },
          { id: "improvisar", nome: "Improvisar", tipo: "reacao", cores: ["#a8472f", "#e8b866"], custo: "2 Princípios", html: "<p>Misture no campo, com uma ação, gastando Princípios da bolsa. A mistura sai na hora, mas sem o refinamento da bancada.</p>" },
        ],
      },
      {
        origem: "Subclasse",
        fonte: "Apotecária",
        habilidades: [
          {
            id: "herbario",
            nome: "Herbário",
            tipo: "fundacao",
            cores: ["#3f7d4a", "#a6c97a"],
            html: "<p>Você conhece 4 ervas e aprende mais 1 por patamar. Ao engarrafar ou improvisar, tempere a mistura com uma erva e ela ganha a virtude. Cada erva serve uma vez por descanso.</p>",
            recurso: {
              tipo: "caixas",
              vaga: "erva nova (patamar 3)",
              itens: [
                { id: "dedaleira", nome: "Dedaleira", usada: false },
                { id: "arnica", nome: "Arnica", usada: true },
                { id: "valeriana", nome: "Valeriana", usada: false },
                { id: "losna", nome: "Losna", usada: false },
              ],
            },
          },
          {
            id: "mistura",
            nome: "Mistura Mirabolante",
            tipo: "acao",
            cores: ["#6a3f8f", "#e07fb0"],
            custo: "2+ Princípios",
            html: "<p>Diga o efeito que quer, mesmo fora da tabela. Faça um teste de Conhecimento: Dificuldade 10, 15 ou 20, com +2 por patamar acima do 1º. Uma erva que faça sentido dá +2. Na luta, só valem efeitos do tamanho de um frasco.</p>",
          },
        ],
      },
      {
        origem: "Ancestralidade",
        fonte: "Humana",
        habilidades: [
          { id: "resistencia", nome: "Alta Resistência", tipo: "passiva", cores: ["#7a6a3a", "#d7bc80"], html: "<p>Você tem um espaço de Fadiga a mais.</p>" },
          { id: "habil", nome: "Habilidoso", tipo: "passiva", cores: ["#4a6a8a", "#9fc0dd"], html: "<p>Quando você faz uma rolagem de Esperança, pode rolar um dado de vantagem uma vez por descanso.</p>" },
        ],
      },
      {
        origem: "Comunidade",
        fonte: "Erudita",
        habilidades: [
          { id: "letra", nome: "Letra Miúda", tipo: "passiva", cores: ["#5b4a7a", "#b5a3d8"], html: "<p>Uma vez por sessão, ao consultar um livro, registro ou arquivo, faça ao mestre uma pergunta a mais sobre o que está escrito.</p>" },
        ],
      },
    ],
    futuras: { titulo: "Ainda não conquistadas · Especialização (nível 5) · Maestria (nível 8)", nomes: ["Língua de Provadora", "Estufa"] },
    loadout: [C["carta-erva-de-bolso"], C["carta-peconha"], C["carta-erudicao"]],
    loadoutMax: 5,
    cofre: [C["carta-livro-de-vaurel"]],
    inventario: [
      {
        titulo: "Armas e armadura",
        itens: [
          { id: "w1", nome: "Bengala-estoque", detalhe: "Acuidade · Corpo a corpo", direita: "d8 físico" },
          { id: "a1", nome: "Casaco de couro encerado", detalhe: "Armadura · 3 espaços", direita: "limiares 8 / 16" },
        ],
      },
      {
        titulo: "Maleta de frascos",
        itens: [
          { id: "f1", nome: "Tônico", detalhe: "beber · limpa 2 PV", direita: "× 2" },
          { id: "f2", nome: "Explosão", detalhe: "arremessar · d10+2", direita: "× 1" },
          { id: "f3", nome: "Antídoto de Valeriana", detalhe: "beber · limpa 2 Fadiga", direita: "× 1" },
        ],
      },
      {
        titulo: "Itens",
        itens: [
          { id: "i1", nome: "Balança de botica cujos pesos não batem" },
          { id: "i2", nome: "Caderno de receitas, metade em código" },
        ],
      },
    ],
    moedas: [
      { nome: "Moedas", valor: 12 },
      { nome: "Punhados", valor: 3 },
      { nome: "Bolsas", valor: 0 },
    ],
    perguntas: [
      { id: "q1", pergunta: "De onde você veio, e o que levou de lá?", texto: "" },
      { id: "q2", pergunta: "Quem você deixou para trás na Exposição?", texto: "" },
      { id: "q3", pergunta: "Aparência", texto: "" },
      { id: "q4", pergunta: "Projetos de descanso longo", texto: "" },
      { id: "q5", pergunta: "Notas livres", texto: "" },
    ],
    condicoes: [
      { id: "envenenado", nome: "Envenenado", texto: "Marca 1 Fadiga sempre que age." },
      { id: "distraido", nome: "Distraído", texto: "Desvantagem na próxima ação." },
      { id: "vulneravel", nome: "Vulnerável", texto: "Quem o ataca tem vantagem." },
      { id: "escondido", nome: "Escondido", texto: "Não é visto até agir." },
      { id: "cena", nome: "Bônus de cena", texto: "+1 nos limiares até o fim da cena (Unguento)." },
    ],
    efeitos: [],
    movimentosDescanso: [
      { id: "ferimentos", nome: "Tratar ferimentos", curto: "Limpa 1d4 + patamar PV", longo: "Limpa todos os PV" },
      { id: "folego", nome: "Recobrar o fôlego", curto: "Limpa 1d4 + patamar de Fadiga", longo: "Limpa toda a Fadiga" },
      { id: "armadura", nome: "Reparar a armadura", curto: "Limpa 1d4 + patamar espaços de Armadura", longo: "Limpa todos os espaços de Armadura" },
      { id: "preparar", nome: "Preparar-se", curto: "+1 Esperança", longo: "+1 Esperança" },
      { id: "destilar", nome: "Destilar", curto: "+patamar + 1 Princípios na bolsa", longo: "Enche a bolsa de Princípios", classe: true },
      { id: "remendar", nome: "Remendar a mente", curto: "−2 de Discernimento", longo: "−4 de Discernimento" },
      { id: "projeto", nome: "Trabalhar num projeto", curto: "", longo: "Avança um projeto de descanso longo", soLongo: true },
    ],
  };
}
