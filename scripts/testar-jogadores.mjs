import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarJogadores } from '../src/db/jogadores.ts';

test('ignora presença órfã sem perder jogadores ou modificar os dados recebidos', () => {
  const dados = { ana: { nome: 'Ana', cor: '#123456', uid: 'u1', online: true }, removido: { online: false } };
  const jogadores = normalizarJogadores(dados);
  assert.deepEqual(Object.keys(jogadores), ['ana']);
  assert.deepEqual(jogadores.ana, dados.ana);
  assert.equal(dados.removido.online, false);
  assert.equal(Object.values(jogadores).map(j => j.nome.slice(0, 1)).join(''), 'A');
});

test('tolera lista vazia, registros inválidos e cor ausente', () => {
  assert.deepEqual(normalizarJogadores(null), {});
  assert.deepEqual(normalizarJogadores({ a: null, b: false, c: { nome: 7 }, d: { nome: ' ' } }), {});
  assert.equal(normalizarJogadores({ a: { nome: 'Ana' } }).a.cor, '#7FA6E0');
});
