import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const macro = fs.readFileSync('public/importar-personagens-foundry.js', 'utf8');
function ambiente(dados) {
  const actors = [], erros = [], relatorios = [];
  const contexto = {
    game: { user: { isGM: true }, system: { id: 'daggerheart', version: '2.11.4' }, items: [], packs: [], actors, folders: [] },
    CONFIG: { DH: { DOMAIN: { allDomains: () => ({ codex: {}, dread: {}, arcana: {} }) } } },
    console: { info() {}, error() {} },
    ui: { notifications: { error: msg => erros.push(msg) } },
    foundry: { applications: { api: { DialogV2: {
      confirm: async () => true,
      prompt: async o => {
        if (o.window.title === 'Resultado da importação') { relatorios.push(o.content); return; }
        return { text: async () => JSON.stringify(dados) };
      },
    } } } },
    Folder: { create: async () => ({ id: 'pasta' }) },
    Actor: { create: async data => {
      const actor = { ...structuredClone(data), items: [], getFlag: () => actor.flags.world.sessaoZero,
        createEmbeddedDocuments: async (_tipo, items) => {
          for (const i of items) actor.items.push({ ...i, uuid: 'Actor.pc.Item.classe' });
          return actor.items.slice(-items.length);
        }, update: async update => { actor.atualizacao = update; },
      };
      actors.push(actor); return actor;
    } },
    fromUuid: async () => null,
  };
  return { contexto, actors, erros, relatorios, rodar: () => vm.runInNewContext(macro, contexto) };
}
const exemplo = () => ({ salaId: 'sala-teste', jogadores: { ana: { nome: 'Ana' }, fantasma: { online: false } }, personagens: { ana: {
  classe: 'ocultista', subclasse: 'Antiquário', tracos: { agilidade: -1, conhecimento: 2 },
  derivados: { nivel: 1, pv: 5, evasao: 10, fadiga: 6, esperanca: 2, proficiencia: 1 },
  experiencias: { 0: { texto: 'Bibliotecária', bonus: 2 } },
  equipamento: { principal: 'revolver', armadura: 'couro', kit: ['Corda'] }, cartas: ['carta-erudicao'],
} }, privado: { ana: { segredo: 'NAO COPIAR ESTE SEGREDO' } } });

test('cria personagem com atributos, recursos e itens sem expor segredos; reimportação não duplica', async () => {
  const a = ambiente(exemplo()); await a.rodar();
  assert.deepEqual(a.erros, []); assert.equal(a.actors.length, 1);
  const pc = a.actors[0];
  assert.equal(pc.type, 'character'); assert.equal(pc.ownership.default, 0);
  assert.equal(pc.system.traits.agility.value, -1); assert.equal(pc.system.traits.knowledge.value, 2);
  const classe = pc.items.find(i => i.type === 'class');
  assert.equal(pc.system.resources.hitPoints.max + classe.system.hitPoints, 5);
  assert.equal(pc.system.evasion + classe.system.evasion, 10);
  assert.equal(pc.system.experiences.exp0.value, 2);
  assert.ok(pc.items.some(i => i.type === 'weapon' && i.system.attack.damage.main.value.dice === 'd8'));
  assert.ok(pc.items.some(i => i.type === 'domainCard' && i.system.domain === 'codex'));
  assert.equal(JSON.stringify(pc).includes('NAO COPIAR ESTE SEGREDO'), false);
  assert.match(a.relatorios[0], /Revisão necessária/);
  await a.rodar(); assert.equal(a.actors.length, 1);
});

test('recusa exportação antiga de diários antes de criar fichas', async () => {
  const a = ambiente({ formato: 'sessao-zero/1', diarios: [] }); await a.rodar();
  assert.equal(a.actors.length, 0); assert.match(a.erros[0], /sessao-zero.json/);
});

test('não executa em outro sistema', async () => {
  const a = ambiente(exemplo()); a.contexto.game.system.id = 'dnd5e'; await a.rodar();
  assert.equal(a.actors.length, 0); assert.match(a.erros[0], /Foundryborne/);
});
