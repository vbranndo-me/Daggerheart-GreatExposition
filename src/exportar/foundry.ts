// Pacote para o Foundry VTT v13: dados.json + mapas sem alfinetes + macro de importação.
import { zipSync, strToU8 } from "fflate";
import type { Conteudo } from "../conteudo";
import { perguntaBuilder } from "../conteudo";
import type { Sala } from "../db/tipos";
import { renderizarMapa } from "./png";
import { itensSeguranca, jogadoresLista, nomeJ, pinsPorPais, respostasOrdenadas } from "./relatorio";
import MACRO from "./macro-foundry.js?raw";

const h = (t: string | null | undefined) =>
  String(t ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");

interface PaginaF {
  nome: string;
  html: string;
}
interface DiarioF {
  nome: string;
  privado: boolean;
  paginas: PaginaF[];
}
interface NotaF {
  mapa: "continente" | "rouillac";
  u: number;
  v: number;
  titulo: string;
  icone: string;
  diario: string;
  pagina: string;
}

export async function gerarPacoteFoundry(s: Sala, c: Conteudo, onde: (u: number, v: number) => string | null) {
  const achar = (l: { id: string; nome: string }[], id?: string | null) => l.find((x) => x.id === id)?.nome || "—";
  const iconeC = (t: string) => c.continente.tiposPin.find((x) => x.id === t)?.icone || "icons/svg/book.svg";
  const iconeR = (t: string) => c.rouillac.tiposPin.find((x) => x.id === t)?.icone || "icons/svg/book.svg";
  const rotC = (t: string) => c.continente.tiposPin.find((x) => x.id === t)?.rotulo || t;
  const rotR = (t: string) => c.rouillac.tiposPin.find((x) => x.id === t)?.rotulo || t;

  // --- Países ---
  const porPais = pinsPorPais(s, onde);
  const paginasPaises: PaginaF[] = c.paises.map((p) => {
    const pins = porPais[p.id] || [];
    const origem = jogadoresLista(s).filter(([jid]) => s.personagens[jid]?.pais === p.id);
    return {
      nome: p.nome,
      html:
        `<p><strong>Capital:</strong> ${h(p.capital)} · <strong>Língua:</strong> sabor ${h(p.sabor)} · <strong>Na guerra:</strong> ${h(p.lado)}</p>` +
        `<p>${h(p.publico)}</p><h3>Boatos</h3><ol>${p.boatos.map((b) => `<li>${h(b)}</li>`).join("")}</ol>` +
        `<p><em>“${h(p.viajante)}”</em></p>` +
        (origem.length ? `<p><strong>Origem de:</strong> ${origem.map(([, j]) => h(j.nome)).join(", ")}</p>` : "") +
        `<h3>Alfinetes da mesa</h3>` +
        (pins.length
          ? `<ul>${pins.map(([, x]) => `<li><strong>${h(x.titulo)}</strong> (${h(rotC(x.tipo))}, ${h(nomeJ(s, x.autor))})${x.texto ? `: ${h(x.texto)}` : ""}</li>`).join("")}</ul>`
          : "<p>Nenhum.</p>"),
    };
  });
  const fora = porPais._fora || [];
  paginasPaises.push({
    nome: "Mar e outros lugares",
    html: fora.length
      ? `<ul>${fora.map(([, x]) => `<li><strong>${h(x.titulo)}</strong> (${h(rotC(x.tipo))}, ${h(nomeJ(s, x.autor))})${x.texto ? `: ${h(x.texto)}` : ""}</li>`).join("")}</ul>`
      : "<p>Nenhum alfinete fora dos países.</p>",
  });

  // --- A Exposição ---
  const prog = respostasOrdenadas(s)
    .map(([, r]) => {
      const { categoria, pergunta } = perguntaBuilder(c, r.cat, r.num);
      const pin = r.pin ? s.pins.rouillac?.[r.pin] : null;
      return `<h3>Nº ${r.n} · ${h(categoria?.nome)} ${r.cat}·${r.num}</h3><p><em>${h(pergunta?.texto)}</em></p><p>${h(r.texto)}</p><p class="fraco">— ${h(nomeJ(s, r.jid))}${pin ? ` · alfinete: ${h(pin.titulo)}` : ""}</p>`;
    })
    .join("");
  const pinsR = Object.values(s.pins.rouillac || {}).filter(Boolean);
  const paginasExpo: PaginaF[] = [
    { nome: "Programa oficial", html: prog || "<p>Nenhuma resposta.</p>" },
    {
      nome: "Lugares de Rouillac",
      html: pinsR.length
        ? `<ul>${pinsR.map((x) => `<li><strong>${h(x.titulo)}</strong> (${h(rotR(x.tipo))}, ${h(nomeJ(s, x.autor))})${x.texto ? `: ${h(x.texto)}` : ""}</li>`).join("")}</ul>`
        : "<p>Nenhum alfinete.</p>",
    },
  ];

  // --- Personagens (sem segredo) e Segredos (só mestre) ---
  const paginasPJ: PaginaF[] = [];
  const paginasSeg: PaginaF[] = [];
  for (const [jid, j] of jogadoresLista(s)) {
    const p = s.personagens[jid] || {};
    const pr = s.privado[jid] || {};
    const cl = c.classes.find((x) => x.id === p.classe);
    const rs: any = (cl && p.origem?.[cl.id]) || {};
    paginasPJ.push({
      nome: j.nome,
      html:
        `<p><strong>País:</strong> ${h(achar(c.paises, p.pais))}<br><strong>Papel na Exposição:</strong> ${h(p.papel === "outro" ? p.papelOutro || "outro" : achar(c.origens, p.papel))}<br>` +
        `<strong>Comunidade:</strong> ${h(achar(c.comunidades, p.comunidade))}<br><strong>Ancestralidade:</strong> ${h([p.ancestralidade, p.ancestralidade2].filter(Boolean).join(" + ") || "—")}<br><strong>Classe de interesse:</strong> ${h(p.classeOutra || cl?.nome || "—")}<br><strong>Subclasse:</strong> ${h(p.subclasse || "—")}</p>` +
        (cl ? `<h3>Perguntas de origem</h3>${cl.origem.map((q, i) => `<p><em>${h(q)}</em><br>${h(rs[i] || "—")}</p>`).join("")}` : "") +
        `<h3>Compulsão</h3><p>${h(p.compulsao || "—")}</p><h3>Ligação com o oculto</h3><p>${h(p.oculto || "—")}</p>`,
    });
    paginasSeg.push({
      nome: j.nome,
      html:
        `<p><strong>Segredo:</strong> ${h(pr.segredo || "—")}</p>` +
        `<p><strong>Morte e sacrifício:</strong> ${h(c.seguranca.morte.opcoes.find((o) => o.id === pr.morte)?.nome || "—")}</p>`,
    });
  }
  const seg = itensSeguranca(s);
  paginasSeg.push({
    nome: "Linhas e véus",
    html: `<h3>Linhas</h3><ul>${seg.linha.map((t) => `<li>${h(t)}</li>`).join("") || "<li>nenhuma</li>"}</ul><h3>Véus</h3><ul>${seg.veu.map((t) => `<li>${h(t)}</li>`).join("") || "<li>nenhum</li>"}</ul>`,
  });

  // --- Laços ---
  const lacos = Object.values(s.lacos || {}).sort((a, b) => a.criadoEm - b.criadoEm);
  const paginaLacos: PaginaF = {
    nome: "Laços",
    html: lacos.length
      ? lacos.map((l) => `<p><strong>${h(nomeJ(s, l.de))} → ${h(nomeJ(s, l.para))}</strong><br><em>${h(l.pergunta)}</em><br>${h(l.resposta || "(sem resposta)")}</p>`).join("")
      : "<p>Nenhum laço.</p>",
  };

  const diarios: DiarioF[] = [
    { nome: "Países", privado: false, paginas: paginasPaises },
    { nome: "A Exposição", privado: false, paginas: paginasExpo },
    { nome: "Personagens", privado: false, paginas: paginasPJ },
    { nome: "Segredos (mestre)", privado: true, paginas: paginasSeg },
    { nome: "Laços", privado: false, paginas: [paginaLacos] },
  ];

  // --- Notas nos mapas ---
  const notas: NotaF[] = [];
  for (const p of Object.values(s.pins.continente || {})) {
    if (!p) continue;
    const pais = c.paises.find((x) => x.id === onde(p.u, p.v));
    notas.push({ mapa: "continente", u: p.u, v: p.v, titulo: p.titulo, icone: iconeC(p.tipo), diario: "Países", pagina: pais?.nome || "Mar e outros lugares" });
  }
  for (const p of Object.values(s.pins.rouillac || {})) {
    if (!p) continue;
    notas.push({
      mapa: "rouillac",
      u: p.u,
      v: p.v,
      titulo: p.titulo,
      icone: iconeR(p.tipo),
      diario: "A Exposição",
      pagina: p.resposta ? "Programa oficial" : "Lugares de Rouillac",
    });
  }

  // --- Mapas (sem alfinetes) ---
  const cont = await renderizarMapa(c.continente, { largura: 4200 });
  const rou = await renderizarMapa(c.rouillac, { largura: 4000 });

  const dados = {
    formato: "sessao-zero/1",
    titulo: c.geral.titulo,
    exportadoEm: new Date().toISOString(),
    mapas: {
      continente: { nome: `${c.continente.titulo}`, arquivo: "continente.png", largura: cont.largura, altura: cont.altura },
      rouillac: { nome: `${c.rouillac.titulo}`, arquivo: "rouillac.png", largura: rou.largura, altura: rou.altura },
    },
    diarios,
    notas,
  };

  const zip = zipSync({
    "dados.json": strToU8(JSON.stringify(dados, null, 2)),
    "continente.png": new Uint8Array(await cont.blob.arrayBuffer()),
    "rouillac.png": new Uint8Array(await rou.blob.arrayBuffer()),
    "importar-sessao-zero.js": strToU8(MACRO),
    "LEIA-ME.txt": strToU8(LEIA_ME),
  }, { level: 6 });
  return new Blob([zip], { type: "application/zip" });
}

const LEIA_ME = `Importar a Sessão Zero no Foundry VTT v13

1. Na pasta de dados do Foundry, crie: Data/worlds/<seu-mundo>/sessao-zero/
   e copie para lá continente.png e rouillac.png.
   (Ou suba pelo navegador de arquivos do Foundry, na mesma pasta.)
2. No Foundry, como mestre, crie uma macro nova do tipo "Script".
3. Cole todo o conteúdo de importar-sessao-zero.js e salve.
4. Rode a macro. Ela pede o dados.json: escolha o arquivo deste pacote.
5. Pronto: pasta de diários "Sessão Zero" e duas cenas com as notas no mapa.
`;
