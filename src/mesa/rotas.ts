export type PontoRota = { x: number; y: number };
export interface DadosRotas { nodes: [number, number][]; edges: [number, number][]; metersPerUnit: number }
export interface PontoNaRua { ponto: PontoRota; aresta: number; t: number }
export interface RedeRotas extends DadosRotas { vizinhos: [number, number][][] }
const distancia = (a: PontoRota, b: PontoRota) => Math.hypot(a.x - b.x, a.y - b.y);
const ponto = (p: [number, number]): PontoRota => ({ x: p[0], y: p[1] });
export function construirRede(dados: DadosRotas): RedeRotas {
  const vizinhos: [number, number][][] = dados.nodes.map(() => []);
  for (const [a, b] of dados.edges) {
    const d = distancia(ponto(dados.nodes[a]), ponto(dados.nodes[b]));
    vizinhos[a].push([b, d]); vizinhos[b].push([a, d]);
  }
  return { ...dados, vizinhos };
}
export function ajustarPonto(rede: RedeRotas, click: PontoRota, limite = 45): PontoNaRua | null {
  let melhor: PontoNaRua | null = null, menor = limite;
  rede.edges.forEach(([ai, bi], aresta) => {
    const a = ponto(rede.nodes[ai]), b = ponto(rede.nodes[bi]);
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((click.x - a.x) * dx + (click.y - a.y) * dy) / (dx * dx + dy * dy)));
    const p = { x: a.x + t * dx, y: a.y + t * dy }, d = distancia(click, p);
    if (d <= menor) { menor = d; melhor = { ponto: p, aresta, t }; }
  });
  return melhor;
}
// A* with Euclidean lower bound; all street edges are walkable in both directions.
export function encontrarRota(rede: RedeRotas, inicio: PontoNaRua, fim: PontoNaRua): { pontos: PontoRota[]; metros: number } | null {
  const n = rede.nodes.length, origem = n, destino = n + 1;
  const pos = (id: number) => id === origem ? inicio.ponto : id === destino ? fim.ponto : ponto(rede.nodes[id]);
  const extras = new Map<number, [number, number][]>();
  const ligar = (a: number, b: number) => {
    const d = distancia(pos(a), pos(b));
    extras.set(a, [...(extras.get(a) || []), [b, d]]);
    extras.set(b, [...(extras.get(b) || []), [a, d]]);
  };
  for (const id of rede.edges[inicio.aresta]) ligar(origem, id);
  for (const id of rede.edges[fim.aresta]) ligar(destino, id);
  if (inicio.aresta === fim.aresta) ligar(origem, destino);
  const dist = new Float64Array(n + 2).fill(Infinity), anterior = new Int32Array(n + 2).fill(-1);
  const heap: [number, number][] = [];
  const push = (item: [number, number]) => {
    let i = heap.length; heap.push(item);
    while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= item[0]) break; heap[i] = heap[p]; i = p; }
    heap[i] = item;
  };
  const pop = () => {
    const first = heap[0], last = heap.pop()!;
    if (heap.length) {
      let i = 0;
      while (2 * i + 1 < heap.length) {
        let c = 2 * i + 1;
        if (c + 1 < heap.length && heap[c + 1][0] < heap[c][0]) c++;
        if (heap[c][0] >= last[0]) break;
        heap[i] = heap[c]; i = c;
      }
      heap[i] = last;
    }
    return first;
  };
  dist[origem] = 0; push([distancia(inicio.ponto, fim.ponto), origem]);
  const fechado = new Uint8Array(n + 2);
  while (heap.length) {
    const [, id] = pop();
    if (fechado[id]) continue;
    if (id === destino) {
      const ids = [destino];
      while (ids[ids.length - 1] !== origem) ids.push(anterior[ids[ids.length - 1]]);
      return { pontos: ids.reverse().map(pos), metros: dist[destino] * rede.metersPerUnit };
    }
    fechado[id] = 1;
    for (const [vizinho, peso] of [...(rede.vizinhos[id] || []), ...(extras.get(id) || [])]) {
      const d = dist[id] + peso;
      if (d < dist[vizinho]) { dist[vizinho] = d; anterior[vizinho] = id; push([d + distancia(pos(vizinho), fim.ponto), vizinho]); }
    }
  }
  return null;
}
