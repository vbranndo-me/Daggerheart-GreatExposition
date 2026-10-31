import { esquecerSala } from "./salasSalvas";
import { carregarArquivo } from "../arquivo/dados";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { obterBackend, comoLista, type Backend } from "./backend";
import {
  SALA_VAZIA,
  type Sala,
  type Pin,
  type MapaId,
  type Personagem,
  type Privado,
  type Laco,
  type Builder,
  type BuilderResposta,
} from "./tipos";
import type { Conteudo } from "../conteudo";

// ---------- armazenamento do navegador (sempre em try/catch) ----------
export function lsGet(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
export function lsSet(k: string, v: string | null) {
  try {
    if (v == null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* sem storage */
  }
}
function ssGet(k: string): string | null {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return null;
  }
}
function ssSet(k: string, v: string | null) {
  try {
    if (v == null) sessionStorage.removeItem(k);
    else sessionStorage.setItem(k, v);
  } catch {
    /* sem storage */
  }
}

// legíveis sobre as janelas de ardósia e o mapa escuro, longe do latão e da luz de gás
export const CORES_JOGADORES = ["#D9805F", "#6FB7A0", "#7FA6E0", "#B48BD6", "#E28AA6", "#C9B458", "#8FC0D8", "#D8A07A"];

function aleatorio(n = 6) {
  const a = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < n; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}
export const novaSalaId = () => "expo-" + aleatorio(6);
export const novaChaveMestre = () => aleatorio(12);

export interface Sessao {
  b: Backend;
  uid: string;
  salaId: string;
  chave: string | null;
  mestre: boolean;
  erroMestre: string | null;
  meuJid: string | null;
  sala: Sala;
  carregada: boolean;
  conectado: boolean;
  conteudo: Conteudo;
  acoes: ReturnType<typeof criarAcoes>;
  /** solta o nome que esta pessoa assumiu, para ela escolher outro */
  trocarNome?: () => Promise<void>;
}

export const SessaoCtx = createContext<Sessao | null>(null);
export function useSessao(): Sessao {
  const s = useContext(SessaoCtx);
  if (!s) throw new Error("sem sessão");
  return s;
}

const FILHOS_PUBLICOS = ["meta", "jogadores", "pins", "personagens", "seguranca", "builder", "lacos"] as const;

export function useCarregarSessao(salaId: string, chaveUrl: string | null, conteudo: Conteudo | null) {
  const [b, setB] = useState<Backend | null>(null);
  const [erroBackend, setErroBackend] = useState<string | null>(null);
  const [mestre, setMestre] = useState(false);
  const [erroMestre, setErroMestre] = useState<string | null>(null);
  const [sala, setSala] = useState<Sala>(SALA_VAZIA);
  const [carregada, setCarregada] = useState(false);
  const [conectado, setConectado] = useState(false);
  const [meuJid, setMeuJid] = useState<string | null>(null);
  // O papel de mestre vem só do link com ?m=<chave>. Outra aba sem a chave é um jogador.
  const chave = chaveUrl;
  const tentouAuto = useRef(false);

  useEffect(() => {
    obterBackend().then(setB, (e) => setErroBackend(String(e?.message || e)));
  }, []);

  // conexão
  useEffect(() => {
    if (!b) return;
    return b.conectado(setConectado);
  }, [b]);

  // reivindica o papel de mestre com a chave
  useEffect(() => {
    if (!b || !chave) return;
    (async () => {
      try {
        await b.set(`gmkeys/${salaId}`, chave);
      } catch {
        /* a sala já tem chave: tudo bem */
      }
      try {
        await b.set(`salas/${salaId}/gmauth/${b.uid}`, chave);
        setErroMestre(null);
      } catch {
        setErroMestre("A chave de mestre não confere com a desta sala.");
      }
    })();
  }, [b, salaId, chave]);

  // sou mestre?
  useEffect(() => {
    if (!b) return;
    return b.on(
      `salas/${salaId}/gmauth/${b.uid}`,
      (v) => setMestre(v != null),
      () => setMestre(false),
    );
  }, [b, salaId]);

  // dados públicos (ou tudo, se for mestre)
  useEffect(() => {
    if (!b) return;
    setCarregada(false);
    if (mestre) {
      return b.on(`salas/${salaId}`, (v) => {
        const s = v || {};
        setSala({
          ...SALA_VAZIA,
          ...s,
          meta: s.meta || {},
          jogadores: s.jogadores || {},
          pins: s.pins || {},
          personagens: s.personagens || {},
          privado: s.privado || {},
          seguranca: s.seguranca || {},
          builder: s.builder || {},
          lacos: s.lacos || {},
        });
        setCarregada(true);
      });
    }
    const uns = FILHOS_PUBLICOS.map((k) =>
      b.on(`salas/${salaId}/${k}`, (v) => {
        setSala((s) => ({ ...s, [k]: v || {} }));
        if (k === "jogadores") setCarregada(true);
      }),
    );
    return () => uns.forEach((u) => u());
  }, [b, salaId, mestre]);

  // meu privado (jogador)
  useEffect(() => {
    if (!b || mestre || !meuJid) return;
    return b.on(
      `salas/${salaId}/privado/${meuJid}`,
      (v) => setSala((s) => ({ ...s, privado: { [meuJid]: v || {} } })),
      () => {},
    );
  }, [b, salaId, mestre, meuJid]);

  // cria a meta da sala na primeira vez que o mestre entra
  useEffect(() => {
    if (!b || !mestre || !carregada) return;
    if (sala.meta.criadaEm == null) {
      b.update(`salas/${salaId}/meta`, {
        criadaEm: Date.now(),
        etapaAtual: sala.meta.etapaAtual ?? 0,
        "etapas/0/aberta": true,
      });
    }
  }, [b, mestre, carregada, sala.meta.criadaEm, salaId, sala.meta.etapaAtual]);

  const acoes = useMemo(() => (b ? criarAcoes(b, salaId) : null), [b, salaId]);

  // confere se o nome escolhido ainda é meu
  useEffect(() => {
    if (!b || !meuJid) return;
    const j = sala.jogadores[meuJid];
    if (carregada && (!j || j.uid !== b.uid)) {
      setMeuJid(null);
    }
  }, [b, meuJid, sala.jogadores, carregada]);

  // retoma o nome salvo (F5, ou voltou depois de cair)
  useEffect(() => {
    if (!b || !acoes || mestre || meuJid || !carregada || tentouAuto.current) return;
    const salvo = ssGet(`sz-jid-${salaId}`) || lsGet(`sz-jid-${salaId}`);
    tentouAuto.current = true;
    if (!salvo) return;
    const j = sala.jogadores[salvo];
    if (j && (j.uid === b.uid || !j.uid || !j.online)) {
      acoes.reivindicar(salvo).then(() => setMeuJid(salvo)).catch(() => {});
    }
  }, [b, acoes, mestre, meuJid, carregada, sala.jogadores, salaId]);

  // presença
  useEffect(() => {
    if (!b || !meuJid || !conectado) return;
    const p = `salas/${salaId}/jogadores/${meuJid}/online`;
    b.aoDesconectar(p, false).then(() => b.set(p, true)).catch(() => {});
  }, [b, meuJid, conectado, salaId]);

  const escolher = async (jid: string) => {
    if (!acoes) return;
    await acoes.reivindicar(jid);
    ssSet(`sz-jid-${salaId}`, jid);
    lsSet(`sz-jid-${salaId}`, jid);
    setMeuJid(jid);
  };
  const naoSouEu = async () => {
    if (!acoes || !meuJid) return;
    const j = meuJid;
    setMeuJid(null);
    ssSet(`sz-jid-${salaId}`, null);
    lsSet(`sz-jid-${salaId}`, null);
    await acoes.liberar(j);
  };

  const sessao: Sessao | null =
    b && acoes && conteudo
      ? { b, uid: b.uid, salaId, chave, mestre, erroMestre, meuJid, sala, carregada, conectado, conteudo, acoes, trocarNome: naoSouEu }
      : null;
  return { sessao, erroBackend, escolher, naoSouEu };
}

// ---------- ações ----------
export function criarAcoes(b: Backend, salaId: string) {
  const P = `salas/${salaId}`;

  const acoes = {
    // presença e nome
    async reivindicar(jid: string) {
      await b.set(`${P}/jogadores/${jid}/uid`, b.uid);
    },
    async liberar(jid: string) {
      try {
        await b.cancelarDesconexao(`${P}/jogadores/${jid}/online`);
      } catch {
        /* nada */
      }
      await b.set(`${P}/jogadores/${jid}/online`, false);
      await b.set(`${P}/jogadores/${jid}/uid`, null);
    },

    // etapas (mestre)
    async irParaEtapa(n: number) {
      await b.update(`${P}/meta`, { etapaAtual: n, [`etapas/${n}/aberta`]: true });
    },
    async trancarCriador(trancado: boolean) {
      await b.set(`${P}/meta/criadorTrancado`, trancado || null);
    },
    async trancarEtapa(n: number, trancada: boolean) {
      await b.set(`${P}/meta/etapas/${n}/trancada`, trancada || null);
    },
    async abrirEtapa(n: number) {
      await b.set(`${P}/meta/etapas/${n}/aberta`, true);
    },
    async fecharEtapa(n: number) {
      await b.set(`${P}/meta/etapas/${n}/aberta`, null);
    },
    async abrirConvite(aberto: boolean) {
      await b.set(`${P}/meta/conviteAberto`, aberto);
    },

    // pessoas (mestre)
    async adicionarJogador(nome: string, cor: string, ordem: number) {
      const jid = b.novaChave();
      await b.set(`${P}/jogadores/${jid}`, { nome, cor, ordem });
      return jid;
    },
    async editarJogador(jid: string, campos: { nome?: string; cor?: string }) {
      await b.update(`${P}/jogadores/${jid}`, campos);
    },
    async removerJogador(jid: string) {
      await b.update(P, {
        [`jogadores/${jid}`]: null,
        [`personagens/${jid}`]: null,
        [`privado/${jid}`]: null,
      });
    },
    async liberarNome(jid: string) {
      await b.update(`${P}/jogadores/${jid}`, { uid: null, online: false });
    },

    // alfinetes
    async salvarPin(mapa: MapaId, pid: string | null, pin: Pin) {
      const id = pid || b.novaChave();
      await b.set(`${P}/pins/${mapa}/${id}`, pin);
      return id;
    },
    async apagarPin(mapa: MapaId, pid: string) {
      await b.remove(`${P}/pins/${mapa}/${pid}`);
    },

    // personagem
    async personagem(jid: string, campos: Partial<Record<keyof Personagem, any>>) {
      await b.update(`${P}/personagens/${jid}`, { ...campos, ...(Object.keys(campos).some((k) => k !== "registroConfirmado") ? { registroConfirmado: null } : {}) });
    },
    async respostaOrigem(jid: string, classe: string, i: number, texto: string) {
      await b.update(`${P}/personagens/${jid}`, { [`origem/${classe}/${i}`]: texto || null, registroConfirmado: null });
    },
    async privado(jid: string, campo: keyof Privado, valor: any) {
      await b.set(`${P}/privado/${jid}/${campo}`, valor ?? null);
      if (campo === "segredo") await b.update(`${P}/personagens/${jid}`, { registroConfirmado: null });
    },

    // segurança: o item público não tem autor; o autor fica no privado de quem escreveu
    async adicionarSeguranca(jid: string | null, lista: "linha" | "veu", texto: string) {
      const iid = b.novaChave();
      await b.set(`${P}/seguranca/itens/${iid}`, { lista, texto, criadoEm: Date.now() });
      if (jid) await b.set(`${P}/privado/${jid}/seguranca/${iid}`, true);
    },
    async removerSeguranca(iid: string, jid: string | null) {
      await b.remove(`${P}/seguranca/itens/${iid}`);
      if (jid) await b.remove(`${P}/privado/${jid}/seguranca/${iid}`);
    },

    // laços
    async criarLaco(laco: Omit<Laco, "criadoEm">) {
      const lid = b.novaChave();
      await b.set(`${P}/lacos/${lid}`, { ...laco, criadoEm: Date.now() });
    },
    async responderLaco(lid: string, resposta: string) {
      await b.set(`${P}/lacos/${lid}/resposta`, resposta || null);
    },
    async apagarLaco(lid: string) {
      await b.remove(`${P}/lacos/${lid}`);
    },

    // builder
    async configurarBuilder(ordem: string[], rodadas: number) {
      await b.update(`${P}/builder`, { ordem, rodadas });
    },
    async iniciarBuilder(ordem: string[], rodadas: number) {
      await b.update(`${P}/builder`, {
        ordem,
        rodadas,
        iniciado: true,
        terminado: false,
        rodada: 1,
        vez: 0,
        vezJid: ordem[0] ?? null,
        atual: null,
      });
    },
    async rolar(builder: Builder, totalPorCat: number[]) {
      if (!builder.vezJid) return;
      const d4 = 1 + Math.floor(Math.random() * 4);
      const d10 = 1 + Math.floor(Math.random() * 10);
      const usadas = builder.sorteadas || {};
      let cat = d4,
        num = d10,
        desvio: string | undefined;
      const livre = (c: number, n: number) => !usadas[`${c}-${n}`];
      if (!livre(cat, num)) {
        let achou = false;
        for (let c = 0; c < 4 && !achou; c++) {
          const cc = ((d4 - 1 + c) % 4) + 1;
          const tot = totalPorCat[cc - 1] || 10;
          for (let k = c === 0 ? 1 : 0; k <= tot && !achou; k++) {
            const nn = ((d10 - 1 + k) % tot) + 1;
            if (livre(cc, nn)) {
              cat = cc;
              num = nn;
              achou = true;
            }
          }
        }
        if (!achou) return;
        desvio = cat === d4 ? `a ${d10} já saiu, vamos para a ${num}` : `a categoria ${d4} acabou, vamos para ${cat}·${num}`;
      }
      await b.set(`${P}/builder/atual`, {
        d4,
        d10,
        cat,
        num,
        jid: builder.vezJid,
        ts: Date.now(),
        ...(desvio ? { desvio } : {}),
      });
    },
    async digitarBuilder(texto: string) {
      await b.set(`${P}/builder/atual/texto`, texto || null);
    },
    async enviarBuilder(enviada: boolean) {
      await b.set(`${P}/builder/atual/enviada`, enviada || null);
    },
    async pinBuilder(pid: string | null) {
      await b.set(`${P}/builder/atual/pin`, pid);
    },
    async aceitarBuilder(builder: Builder, texto: string) {
      const a = builder.atual;
      if (!a) return;
      const rid = b.novaChave();
      const n = Object.keys(builder.respostas || {}).length + 1;
      const resp: BuilderResposta = { n, cat: a.cat, num: a.num, jid: a.jid, texto, pin: a.pin || null, criadoEm: Date.now() };
      const upd: Record<string, any> = {
        [`builder/respostas/${rid}`]: resp,
        [`builder/sorteadas/${a.cat}-${a.num}`]: "aceita",
        "builder/atual": null,
        ...proximaVez(builder),
      };
      if (a.pin) upd[`pins/rouillac/${a.pin}/resposta`] = rid;
      await b.update(P, upd);
    },
    async vetarBuilder(builder: Builder) {
      const a = builder.atual;
      if (!a) return;
      await b.update(P, { [`builder/sorteadas/${a.cat}-${a.num}`]: "vetada", "builder/atual": null });
    },
    async passarVez(builder: Builder) {
      await b.update(P, { "builder/atual": null, ...proximaVez(builder) });
    },
    async editarResposta(rid: string, texto: string) {
      await b.set(`${P}/builder/respostas/${rid}/texto`, texto);
    },
    async apagarResposta(rid: string, r: BuilderResposta) {
      await b.update(P, { [`builder/respostas/${rid}`]: null, [`builder/sorteadas/${r.cat}-${r.num}`]: null });
    },
    async zerarBuilder() {
      await b.set(`${P}/builder`, null);
    },

    // sala (mestre)
    async lerTudo(): Promise<any> {
      return (await b.get(P)) || {};
    },
    async duplicarSala(chave: string) {
      const tudo = (await b.get(P)) || {};
      const novo = novaSalaId();
      const copia = { ...tudo };
      delete copia.gmauth;
      for (const j of Object.values<any>(copia.jogadores || {})) {
        delete j.uid;
        delete j.online;
      }
      copia.meta = { ...(copia.meta || {}), criadaEm: Date.now(), ensaio: true };
      await b.set(`gmkeys/${novo}`, chave);
      await b.set(`salas/${novo}/gmauth/${b.uid}`, chave);
      await b.update(`salas/${novo}`, copia);
      return novo;
    },
    async apagarSala() {
      await b.remove(P);
      esquecerSala(salaId);
    },
    async modoEnsaio(conteudo: Conteudo) {
      await criarEnsaio(b, P, conteudo);
    },
  };
  return acoes;
}

function proximaVez(builder: Builder): Record<string, any> {
  const ordem = comoLista<string>(builder.ordem);
  let vez = (builder.vez ?? 0) + 1;
  let rodada = builder.rodada ?? 1;
  if (vez >= ordem.length) {
    vez = 0;
    rodada += 1;
  }
  if (rodada > (builder.rodadas ?? 3)) {
    return { "builder/vez": 0, "builder/rodada": builder.rodadas ?? 3, "builder/vezJid": null, "builder/terminado": true };
  }
  return { "builder/vez": vez, "builder/rodada": rodada, "builder/vezJid": ordem[vez] ?? null };
}

// ---------- modo ensaio: 5 jogadores falsos, cada um com o personagem pronto ----------
// Atenção: o Firebase recusa um update com caminhos que se sobrepõem (ex.: "privado/x" e
// "privado/x/seguranca/y"), então cada jogador vai inteiro num único caminho.
async function criarEnsaio(b: Backend, P: string, conteudo: Conteudo) {
  const nomes = ["Amélie", "Bastien", "Céleste", "Dorian", "Eulália"];
  const ancestralidades = (await carregarArquivo()).ancestralidades;
  const paises = conteudo.paises.map((p) => p.id);
  const papeis = conteudo.origens.map((o) => o.id);
  const em = <T,>(lista: T[], i: number): T | undefined => (lista.length ? lista[i % lista.length] : undefined);
  const agora = Date.now();
  // classes espalhadas pela lista, para o ensaio mostrar variedade
  const passo = Math.max(1, Math.floor(conteudo.classes.length / nomes.length));
  const upd: Record<string, any> = {};
  const jids: string[] = [];
  nomes.forEach((nome, i) => {
    const jid = "ensaio" + (i + 1);
    jids.push(jid);
    const classe = em(conteudo.classes, i * passo);
    const sub = classe?.subclasses.length ? classe.subclasses[i % classe.subclasses.length].nome : null;
    const anc = em(ancestralidades, i * 2 + 1);
    const anc2 = i === 4 ? em(ancestralidades, i * 2 + 4) : null; // uma ancestralidade mista
    const origemTexto: Record<number, string> = {};
    const perguntas = Math.max(3, classe?.origem?.length || 0);
    for (let k = 0; k < perguntas; k++) origemTexto[k] = `Resposta de exemplo ${k + 1} de ${nome}.`;
    upd[`jogadores/${jid}`] = { nome: nome + " (ensaio)", cor: CORES_JOGADORES[i], ordem: 100 + i };
    upd[`personagens/${jid}`] = {
      pais: em(paises, i * 3),
      papel: em(papeis, i),
      comunidade: em(conteudo.comunidades, i)?.id ?? null,
      ancestralidade: anc?.nome ?? null,
      ancestralidade2: anc2?.nome && anc2.nome !== anc?.nome ? anc2.nome : null,
      classe: classe?.id ?? null,
      subclasse: sub,
      criadorPronto: true,
      registroConfirmado: true,
      origem: classe ? { [classe.id]: origemTexto } : null,
      compulsao: "Não consigo deixar uma porta trancada sem saber o que há atrás.",
      oculto: "Vi uma luz que não devia existir, uma vez, no fundo de um poço.",
    };
    upd[`privado/${jid}`] = {
      segredo: `Segredo de exemplo de ${nome}: guardo uma carta que nunca abri.`,
      morte: em(conteudo.seguranca.morte.opcoes, i)?.id ?? null,
      seguranca: i === 0 ? { "ensaio-s1": true } : i === 1 ? { "ensaio-s2": true } : null,
    };
    const tipo = em(conteudo.continente.tiposPin, i)?.id;
    if (tipo) {
      upd[`pins/continente/ensaio-pin-${i}`] = {
        u: 0.15 + 0.15 * i,
        v: 0.45 + 0.05 * (i % 3),
        tipo,
        titulo: `Alfinete de ${nome}`,
        texto: "Texto curto de exemplo.",
        autor: jid,
        criadoEm: agora + i,
      };
    }
  });
  upd["seguranca/itens/ensaio-s1"] = { lista: "linha", texto: "Violência contra crianças", criadoEm: agora };
  upd["seguranca/itens/ensaio-s2"] = { lista: "veu", texto: "Tortura", criadoEm: agora };
  upd["builder/ordem"] = jids;
  upd["builder/rodadas"] = 1;
  upd["meta/ensaio"] = true;
  await b.update(P, upd);
}
