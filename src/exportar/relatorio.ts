import type { Conteudo } from "../conteudo";
import { perguntaBuilder } from "../conteudo";
import { comoLista } from "../db/backend";
import type { Sala, Pin } from "../db/tipos";

export function baixar(dados: Blob | string, nome: string, tipo = "application/octet-stream") {
  const blob = typeof dados === "string" ? new Blob([dados], { type: tipo }) : dados;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const nomeJ = (s: Sala, jid: string | null | undefined) => (jid === "mestre" ? "Mestre" : (jid && s.jogadores[jid]?.nome) || "?");
const achar = (l: { id: string; nome: string }[], id?: string | null) => l.find((x) => x.id === id)?.nome;
export const normalizarItem = (s: string) =>
  s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[.!;,]+$/, "").replace(/\s+/g, " ");

export function itensSeguranca(s: Sala) {
  const out = { linha: [] as string[], veu: [] as string[] };
  const vistos = new Set<string>();
  for (const it of Object.values(s.seguranca.itens || {}).sort((a, b) => a.criadoEm - b.criadoEm)) {
    const k = it.lista + normalizarItem(it.texto);
    if (vistos.has(k)) continue;
    vistos.add(k);
    out[it.lista].push(it.texto.trim());
  }
  return out;
}

export function jogadoresLista(s: Sala) {
  return Object.entries(s.jogadores).sort((a, b) => (a[1].ordem ?? 0) - (b[1].ordem ?? 0));
}

export function respostasOrdenadas(s: Sala) {
  return Object.entries(s.builder.respostas || {}).sort((a, b) => a[1].n - b[1].n);
}

export function pinsPorPais(s: Sala, onde: (u: number, v: number) => string | null) {
  const m: Record<string, [string, Pin][]> = {};
  for (const [pid, p] of Object.entries(s.pins.continente || {})) {
    if (!p) continue;
    const k = onde(p.u, p.v) || "_fora";
    (m[k] ||= []).push([pid, p]);
  }
  return m;
}

export function gerarMarkdown(s: Sala, c: Conteudo, onde: (u: number, v: number) => string | null) {
  const L: string[] = [];
  const tipoC = (id: string) => c.continente.tiposPin.find((t) => t.id === id)?.rotulo || id;
  const tipoR = (id: string) => c.rouillac.tiposPin.find((t) => t.id === id)?.rotulo || id;
  L.push(`# Sessão zero · ${c.geral.titulo}`, "", `Exportado em ${new Date().toLocaleString("pt-BR")}.`, "");

  L.push("## Participantes", "");
  for (const [jid, j] of jogadoresLista(s)) {
    const p = s.personagens[jid] || {};
    L.push(`- **${j.nome}** (cor ${j.cor})${p.classe ? ` · interesse: ${achar(c.classes, p.classe)}` : ""}`);
  }
  L.push("");

  const seg = itensSeguranca(s);
  L.push("## Segurança", "", "*Sem autores.*", "", "### Linhas", "");
  L.push(...(seg.linha.length ? seg.linha.map((t) => `- ${t}`) : ["- (nenhuma)"]), "", "### Véus", "");
  L.push(...(seg.veu.length ? seg.veu.map((t) => `- ${t}`) : ["- (nenhum)"]), "");

  L.push("## Países e alfinetes do continente", "");
  const porPais = pinsPorPais(s, onde);
  for (const pais of c.paises) {
    const ps = porPais[pais.id] || [];
    L.push(`### ${pais.nome}`, "");
    const origem = jogadoresLista(s).filter(([jid]) => s.personagens[jid]?.pais === pais.id);
    if (origem.length) L.push(`Origem de: ${origem.map(([, j]) => j.nome).join(", ")}.`, "");
    if (!ps.length) L.push("- (sem alfinetes)");
    for (const [, p] of ps) L.push(`- **${p.titulo}** (${tipoC(p.tipo)}, ${nomeJ(s, p.autor)})${p.texto ? `: ${p.texto}` : ""}`);
    L.push("");
  }
  if (porPais._fora?.length) {
    L.push("### Fora dos países (mar e outros lugares)", "");
    for (const [, p] of porPais._fora) L.push(`- **${p.titulo}** (${tipoC(p.tipo)}, ${nomeJ(s, p.autor)})${p.texto ? `: ${p.texto}` : ""}`);
    L.push("");
  }

  L.push("## Personagens", "");
  for (const [jid, j] of jogadoresLista(s)) {
    const p = s.personagens[jid] || {};
    const pr = s.privado[jid] || {};
    const cl = c.classes.find((x) => x.id === p.classe);
    L.push(`### ${j.nome}`, "");
    L.push(`- País: ${achar(c.paises, p.pais) || "—"}`);
    L.push(`- Papel na Exposição: ${p.papel === "outro" ? p.papelOutro || "outro" : achar(c.origens, p.papel) || "—"}`);
    L.push(`- Comunidade: ${achar(c.comunidades, p.comunidade) || "—"}`);
    L.push(`- Ancestralidade: ${[p.ancestralidade, p.ancestralidade2].filter(Boolean).join(" + ") || "—"}`);
    L.push(`- Classe de interesse: ${p.classeOutra || cl?.nome || "—"}${p.classeLivro ? " (livro básico)" : ""}`);
    L.push(`- Subclasse: ${p.subclasse || "—"}`);
    if (cl) {
      const r = comoLista<string>(p.origem?.[cl.id]);
      const rs = p.origem?.[cl.id] || {};
      L.push("", "**Perguntas de origem**", "");
      cl.origem.forEach((q, i) => L.push(`- *${q}* ${(rs as any)[i] || r[i] || "—"}`));
    }
    for (const [outra, rs] of Object.entries(p.origem || {})) {
      if (outra === p.classe) continue;
      const cl2 = c.classes.find((x) => x.id === outra);
      if (!cl2) continue;
      L.push("", `*Respostas guardadas de ${cl2.nome}:*`);
      cl2.origem.forEach((q, i) => (rs as any)[i] && L.push(`- *${q}* ${(rs as any)[i]}`));
    }
    L.push("", `- Compulsão: ${p.compulsao || "—"}`, `- Ligação com o oculto: ${p.oculto || "—"}`);
    L.push("", `> **Só mestre.** Segredo: ${pr.segredo || "—"}`);
    L.push(`> **Só mestre.** Morte e sacrifício: ${c.seguranca.morte.opcoes.find((o) => o.id === pr.morte)?.nome || "—"}`, "");
  }

  L.push("## A Exposição", "");
  for (const [, r] of respostasOrdenadas(s)) {
    const { categoria, pergunta } = perguntaBuilder(c, r.cat, r.num);
    const pin = r.pin ? s.pins.rouillac?.[r.pin] : null;
    L.push(`${r.n}. **${categoria?.nome} ${r.cat}·${r.num}.** *${pergunta?.texto || "?"}*`);
    L.push(`   ${r.texto.replace(/\n/g, "\n   ")} (${nomeJ(s, r.jid)})${pin ? ` · alfinete: ${pin.titulo}` : ""}`);
  }
  const soltos = Object.values(s.pins.rouillac || {}).filter((p) => p && !p.resposta);
  if (soltos.length) {
    L.push("", "### Outros alfinetes em Rouillac", "");
    for (const p of soltos) L.push(`- **${p.titulo}** (${tipoR(p.tipo)}, ${nomeJ(s, p.autor)})${p.texto ? `: ${p.texto}` : ""}`);
  }
  L.push("");

  L.push("## Laços", "");
  const lacos = Object.values(s.lacos || {}).sort((a, b) => a.criadoEm - b.criadoEm);
  if (!lacos.length) L.push("- (nenhum)");
  for (const l of lacos) L.push(`- **${nomeJ(s, l.de)} → ${nomeJ(s, l.para)}:** *${l.pergunta}* ${l.resposta || "(sem resposta)"}`);
  L.push("");
  return L.join("\n");
}
