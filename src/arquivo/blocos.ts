// O corpo de uma entrada vira uma lista de blocos: Markdown comum, diretivas de bloco (:::nota … :::)
// e diretivas de uma linha (::tabela-paises). Assim cada diretiva é um componente React de verdade.
export type Bloco =
  | { tipo: "md"; texto: string }
  | { tipo: "dir"; nome: string; attrs: Record<string, string>; filho?: string };

export function lerAttrs(s: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!s) return out;
  for (const m of s.matchAll(/([\w-]+)\s*=\s*"([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

export function lerBlocos(corpo: string): Bloco[] {
  const blocos: Bloco[] = [];
  let md: string[] = [];
  const soltar = () => {
    const t = md.join("\n").trim();
    if (t) blocos.push({ tipo: "md", texto: t });
    md = [];
  };
  const linhas = corpo.split(/\r?\n/);
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    const cont = l.match(/^:::([\w-]+)(?:\{(.*)\})?\s*$/);
    if (cont) {
      soltar();
      const filho: string[] = [];
      i++;
      while (i < linhas.length && !/^:::\s*$/.test(linhas[i])) filho.push(linhas[i++]);
      blocos.push({ tipo: "dir", nome: cont[1], attrs: lerAttrs(cont[2]), filho: filho.join("\n").trim() });
      continue;
    }
    const folha = l.match(/^::([\w-]+)(?:\{(.*)\})?\s*$/);
    if (folha) {
      soltar();
      blocos.push({ tipo: "dir", nome: folha[1], attrs: lerAttrs(folha[2]) });
      continue;
    }
    md.push(l);
  }
  soltar();
  return blocos;
}
