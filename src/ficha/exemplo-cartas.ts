// Gerado de content/cartas.json por scratchpad/gera_cartas.py: cartas reais do projeto, usadas só no exemplo.
import type { CartaDominio } from "./tipos";

export const CARTAS_EXEMPLO: Record<string, CartaDominio> = {
  "carta-erva-de-bolso": {
    id: "carta-erva-de-bolso",
    nome: "Erva de Bolso",
    dominio: "Sábio",
    nivel: 1,
    tipo: "Habilidade",
    recuperacao: 0,
    html: "<p>Em cada descanso, prepare 2 doses de erva (vale qualquer coisa verde que você colha ou compre). As doses duram até o próximo descanso. Dar uma dose a você ou a alguém Muito Próximo não gasta ação: limpa 1 Fadiga, ou dá vantagem no próximo teste contra veneno, doença ou dor.</p>",
    imagem: null,
  },
  "carta-peconha": {
    id: "carta-peconha",
    nome: "Peçonha",
    dominio: "Sábio",
    nivel: 2,
    tipo: "Feitiço",
    recuperacao: 1,
    html: "<p>Faça um teste de conjuração contra uma criatura Próxima, ou, fora de combate, revista uma arma sua ou de um aliado. Em caso de sucesso (ou no próximo acerto da arma revestida), o alvo sofre d6+2 de dano físico usando a sua Proficiência e fica Envenenado, até marcar 3 Fadiga por este veneno.</p>",
    imagem: null,
  },
  "carta-erudicao": {
    id: "carta-erudicao",
    nome: "Erudição",
    dominio: "Códice",
    nivel: 1,
    tipo: "Habilidade",
    recuperacao: 0,
    html: "<p>Quando você examinar um texto, símbolo, inscrição ou círculo, gaste 1 Esperança e faça uma pergunta ao mestre: o que isso faz, de que tradição vem, ou como se desfaz. Ele responde com a verdade. Se for algo do véu, conta como conhecimento proibido.</p>",
    imagem: null,
  },
  "carta-livro-de-vaurel": {
    id: "carta-livro-de-vaurel",
    nome: "Livro de Vaurel",
    dominio: "Códice",
    nivel: 2,
    tipo: "Grimório",
    recuperacao: 2,
    html: "<p><b><i>Interrogar</i></b>: faça um teste de conjuração (13) com um cadáver Muito Próximo. Com Esperança, ele responde a até três perguntas; com Medo, responde a uma, e a cena passa a ser do véu. Ele só sabe o que sabia em vida, e mente se mentia.</p><p><b><i>Psicometria</i></b>: toque um objeto e gaste 1 Esperança. Você vê a última coisa forte que aconteceu perto dele, ou o rosto de quem o segurou por último.</p>",
    imagem: null,
  },
};
