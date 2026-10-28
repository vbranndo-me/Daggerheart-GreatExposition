import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { construirRede, ajustarPonto, encontrarRota } from '../src/mesa/rotas.ts';
const fixture = () => construirRede({ nodes: [[0,0],[10,0],[10,10],[0,10],[30,30],[40,30]], edges: [[0,1],[1,2],[2,3],[4,5]], metersPerUnit: 4 });
test('same street uses only the portion between the two selected points', () => {
 const g=fixture(), a=ajustarPonto(g,{x:2,y:0}), b=ajustarPonto(g,{x:8,y:0});
 assert.equal(encontrarRota(g,a,b).metros,24);
});
test('follows connected streets instead of crossing the empty space', () => {
 const g=fixture(), a=ajustarPonto(g,{x:0,y:0}), b=ajustarPonto(g,{x:0,y:10});
 const r=encontrarRota(g,a,b);assert.equal(r.metros,120);assert.ok(r.pontos.some(p=>p.x===10));
});
test('does not fabricate a route between disconnected streets', () => {
 const g=fixture();assert.equal(encontrarRota(g,ajustarPonto(g,{x:0,y:0}),ajustarPonto(g,{x:35,y:30})),null);
});
test('distant clicks are rejected; the same point has a zero length route', () => {
 const g=fixture();assert.equal(ajustarPonto(g,{x:1000,y:1000}),null);
 const p=ajustarPonto(g,{x:5,y:0});assert.equal(encontrarRota(g,p,p).metros,0);
});
const g=construirRede(JSON.parse(fs.readFileSync('content/mapas/rouillac/rotas.json','utf8')));
test('departure stays on a local street between blocks, far from arterial roads', () => {
 const click={x:950.739,y:2028.5335};
 const a=ajustarPonto(g,click,.5),b=ajustarPonto(g,{x:1200,y:1900});
 assert.ok(a&&b);assert.ok(Math.hypot(a.ponto.x-click.x,a.ponto.y-click.y)<.01);
 const route=encontrarRota(g,a,b);assert.ok(route);assert.deepEqual(route.pontos[0],a.ponto);
});
test('Rouillac bridge centerline keeps the SVG translation and scale', () => {
 const a=ajustarPonto(g,{x:1324.7,y:2290.2},1), b=ajustarPonto(g,{x:1382.6,y:2290.2},1);
 assert.ok(a&&b);const r=encontrarRota(g,a,b);assert.ok(r);assert.ok(Math.abs(r.metros-57.9*4)<1);
});
test('city routes are symmetric and no shorter than a straight line', () => {
 let checked=0;
 for(let i=100;i<g.edges.length;i+=731) {
  const [ai]=g.edges[i], [bi]=g.edges[(i+2701)%g.edges.length];
  const a=ajustarPonto(g,{x:g.nodes[ai][0],y:g.nodes[ai][1]},1),b=ajustarPonto(g,{x:g.nodes[bi][0],y:g.nodes[bi][1]},1);
  const r=encontrarRota(g,a,b),v=encontrarRota(g,b,a);if(!r){assert.equal(v,null);continue;}
  checked++;assert.ok(v);assert.ok(Math.abs(r.metros-v.metros)<.01);
  assert.ok(r.metros+.01>=Math.hypot(a.ponto.x-b.ponto.x,a.ponto.y-b.ponto.y)*4);
 }
 assert.ok(checked>=10);
});
// Save a representative city route as a temporary SVG for visual inspection.
const a=ajustarPonto(g,{x:1300,y:2100}), b=ajustarPonto(g,{x:2500,y:1400});
const r=encontrarRota(g,a,b);assert.ok(r);
let svg=fs.readFileSync('content/mapas/rouillac/distritos.svg','utf8');
svg=svg.replace('</svg>',`<polyline points="${r.pontos.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="#000" stroke-width="15"/><polyline points="${r.pontos.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="#f22" stroke-width="8"/><circle cx="${a.ponto.x}" cy="${a.ponto.y}" r="18" fill="lime"/><circle cx="${b.ponto.x}" cy="${b.ponto.y}" r="18" fill="blue"/></svg>`);
fs.writeFileSync(process.env.TEMP+'/rouillac-rota-qa.svg',svg);
console.log('City sample:',Math.round(r.metros),'m');

if (process.env.ROTA_QA === '1') { const {default:sharp}=await import('sharp'); await sharp(process.env.TEMP+'/rouillac-rota-qa.svg').resize({width:1400}).png().toFile(process.env.TEMP+'/rouillac-rota-qa.png'); }
