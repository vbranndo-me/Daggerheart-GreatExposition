import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = nome => JSON.parse(fs.readFileSync(path.join(raiz, 'content', nome + '.json'), 'utf8'));
const catalogo = Object.fromEntries(['classes', 'comunidades', 'ancestralidades', 'equipamento', 'paises', 'origens'].map(k => [k, ler(k)]));
catalogo.cartas = [...ler('cartas'), ...ler('srd-cartas')];
const modelo = fs.readFileSync(path.join(raiz, 'src/exportar/macro-personagens.js'), 'utf8');
const macro = modelo.replace('/* CATALOGO */ null', () => JSON.stringify(catalogo));
fs.writeFileSync(path.join(raiz, 'public/importar-personagens-foundry.js'), macro);
console.log('Macro de personagens gerada em public/importar-personagens-foundry.js');
