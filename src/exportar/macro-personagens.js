// Foundryborne 2.11 · Foundry v14 · Macro Script, executada pelo mestre.
// Importa sessao-zero.json; não modifica diários, cenas ou fichas existentes.
(async () => {
  const catalogo = /* CATALOGO */ null;
  if (!game.user.isGM) return ui.notifications.error("Execute como mestre.");
  if (game.system.id !== "daggerheart" || !String(game.system.version).startsWith("2.")) {
    return ui.notifications.error("Esta macro requer Foundryborne Daggerheart 2.x (validada com o esquema 2.11.4).");
  }
  const { DialogV2 } = foundry.applications.api;
  const h = v => String(v ?? "").replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])).replace(/\n/g, '<br>');
  const norm = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const lista = v => Object.values(v || {}).filter(Boolean);
  const tracos = { agilidade: 'agility', forca: 'strength', finura: 'finesse', instinto: 'instinct', presenca: 'presence', conhecimento: 'knowledge' };
  const dominios = { arcano: 'arcana', lamina: 'blade', osso: 'bone', codice: 'codex', graca: 'grace', meiaNoite: 'midnight', 'meia-noite': 'midnight', sabio: 'sage', esplendor: 'splendor', valor: 'valor', dread: 'dread' };
  const dominio = n => dominios[norm(n)] || norm(n);
  try {
    const arquivo = await DialogV2.prompt({
      window: { title: 'Importar fichas da Sessão Zero' },
      content: '<p>Selecione <strong>sessao-zero.json</strong>, exportado no painel do mestre. O antigo dados.json contém apenas diários e mapas e não serve para fichas completas.</p><p>Cria personagens novos e ignora os já importados. As fichas ficam visíveis apenas ao mestre até você atribuir os jogadores. Segredos não são copiados.</p><input type="file" name="arquivo" accept=".json,application/json">',
      ok: { label: 'Ler arquivo', callback: (_e, b) => b.form.elements.arquivo.files[0] }, rejectClose: false,
    });
    if (!arquivo) return;
    const dados = JSON.parse(await arquivo.text());
    if (!dados.jogadores || !dados.personagens || typeof dados.salaId !== 'string' || !dados.salaId.trim()) {
      throw new Error('Escolha sessao-zero.json com salaId, jogadores e personagens. Exporte novamente pelo painel do mestre.');
    }
    const entradas = Object.entries(dados.jogadores).filter(([id, j]) => typeof j?.nome === 'string' && j.nome.trim() && dados.personagens[id]);
    if (!entradas.length) throw new Error('Nenhuma ficha de personagem encontrada.');
    const seguir = await DialogV2.confirm({ window: { title: 'Criar personagens' }, content: `<p>Importar ${entradas.length} fichas da sala ${h(dados.salaId)}?</p><ul>${entradas.map(([, j]) => `<li>${h(j.nome)}</li>`).join('')}</ul><p>Itens sem correspondência segura serão listados para revisão.</p>`, rejectClose: false });
    if (!seguir) return;
    const avisos = [];
    const indice = [];
    for (const i of game.items) indice.push({ nome: i.name, type: i.type, uuid: i.uuid });
    for (const pack of game.packs) {
      if (pack.documentName !== 'Item') continue;
      try {
        for (const i of await pack.getIndex()) indice.push({ nome: i.name, type: i.type, uuid: i.uuid || `Compendium.${pack.collection}.${i._id}` });
      } catch { avisos.push(`Compêndio indisponível: ${pack.title}`); }
    }
    async function buscar(type, nomes) {
      for (const nome of nomes.filter(Boolean)) {
        const matches = indice.filter(i => i.type === type && norm(i.nome) === norm(nome));
        const unicos = [...new Map(matches.map(i => [i.uuid, i])).values()];
        if (unicos.length === 1) {
          const doc = await fromUuid(unicos[0].uuid);
          if (!doc) continue;
          const obj = doc.toObject();
          delete obj._id; delete obj.folder; delete obj.ownership;
          obj._stats = { compendiumSource: doc.uuid };
          return obj;
        }
      }
      return null;
    }
    const achar = (tipo, id) => catalogo[tipo].find(x => x.id === id || x.nome === id || x.original === id);
    const texto = x => [x?.descricao, x?.fantasia, x?.texto, x?.caracteristica].filter(Boolean).map(t => `<p>${h(t)}</p>`).join('');
    let pasta = game.folders.find(f => f.type === 'Actor' && f.name === 'Sessão Zero');
    let criados = 0, ignorados = 0;
    for (const [jid, j] of entradas) {
      const origem = `${dados.salaId}/${jid}`;
      if (game.actors.some(a => a.getFlag('world', 'sessaoZero')?.origem === origem)) { ignorados++; continue; }
      const p = dados.personagens[jid];
      const cl = achar('classes', p.classe);
      const d = p.derivados || {};
      const nome = j.nome;
      const pendente = msg => avisos.push(`${nome}: ${msg}`);
      const classeNomes = { bardo: 'Bard', druida: 'Druid', guardiao: 'Guardian', patrulheiro: 'Ranger', ladino: 'Rogue', serafim: 'Seraph', feiticeiro: 'Sorcerer', guerreiro: 'Warrior', mago: 'Wizard' };
      let classe = await buscar('class', [p.classeOutra, cl?.nome, classeNomes[p.classe]]);
      if (!classe && cl) {
        classe = { name: cl.nome, type: 'class', system: { description: texto(cl), domains: cl.dominios.map(dominio), hitPoints: cl.pv || d.pv || 5, evasion: cl.evasao ?? d.evasao ?? 0 } };
        pendente('classe criada com os dados do cenário; habilidades especiais precisam de revisão manual.');
      }
      if (!classe) pendente(`classe não encontrada: ${p.classeOutra || p.classe || '(não escolhida)'}`);
      const publico = `<h2>Registro da Exposição</h2><p><strong>País:</strong> ${h(achar('paises', p.pais)?.nome || p.pais)}<br><strong>Papel:</strong> ${h(p.papel === 'outro' ? p.papelOutro : achar('origens', p.papel)?.nome || p.papel)}<br><strong>Classe:</strong> ${h(p.classeOutra || cl?.nome || p.classe)}<br><strong>Subclasse:</strong> ${h(p.subclasse)}</p><h3>Compulsão</h3><p>${h(p.compulsao)}</p><h3>Ligação com o oculto</h3><p>${h(p.oculto)}</p>` + (cl?.origem || []).map((q, i) => `<p><strong>${h(q)}</strong><br>${h(p.origem?.[cl.id]?.[i])}</p>`).join('');
      const conexoes = lista(dados.lacos).filter(l => l.de === jid || l.para === jid).map(l => `<p><strong>${h(dados.jogadores[l.de]?.nome)} → ${h(dados.jogadores[l.para]?.nome)}</strong><br>${h(l.pergunta)}<br>${h(l.resposta)}</p>`).join('');
      const system = {
        traits: Object.fromEntries(Object.entries(tracos).filter(([pt]) => Number.isFinite(p.tracos?.[pt])).map(([pt, en]) => [en, { value: p.tracos[pt] }])),
        levelData: { level: { current: d.nivel || 1, changed: d.nivel || 1 } },
        proficiency: d.proficiencia ?? 1,
        // A classe soma PV e evasão; gravamos apenas a diferença para não duplicar.
        evasion: Number.isFinite(d.evasao) ? d.evasao - (classe?.system.evasion || 0) : 0,
        resources: { hitPoints: { value: 0, max: Number.isFinite(d.pv) ? d.pv - (classe?.system.hitPoints || 0) : 0 }, stress: { value: 0, max: d.fadiga ?? 6 }, hope: { value: d.esperanca ?? 2 } },
        experiences: Object.fromEntries(lista(p.experiencias).filter(e => e.texto?.trim()).map((e, i) => [`exp${i}`, { name: e.texto, value: e.bonus ?? 2, core: i < 2 }])),
        biography: { background: publico, connections: conexoes },
      };
      if (!p.derivados) pendente('ficha sem valores derivados confirmados; confira PV, evasão e equipamento.');
      if (!pasta) pasta = await Folder.create({ name: 'Sessão Zero', type: 'Actor' });
      const actor = await Actor.create({ name: nome, type: 'character', folder: pasta.id, system, ownership: { default: 0 }, prototypeToken: { actorLink: true }, flags: { world: { sessaoZero: { origem, concluido: false } } } });
      if (!actor) throw new Error(`Não foi possível criar ${nome}.`);
      criados++;
      async function adicionar(item) {
        const criados = await actor.createEmbeddedDocuments('Item', [item]);
        if (!criados.length) pendente(`item recusado pelo sistema: ${item.name}`);
        return criados[0];
      }
      try {
        const itemClasse = classe ? await adicionar(classe) : null;
        if (p.subclasse && itemClasse) {
          let sub = await buscar('subclass', [p.subclasse]);
          if (!sub) {
            const local = cl?.subclasses?.find(x => x.nome === p.subclasse);
            if (local) {
              sub = { name: local.nome, type: 'subclass', system: { description: `<p>${h(local.linha)}</p>`, spellcastingTrait: tracos[norm(local.conjuracao)] || null } };
              for (const f of local.fundacao || []) await adicionar({ name: f.nome, type: 'feature', system: { description: `<p>${h(f.texto)}</p>` } });
              pendente(`${local.nome}: Fundação importada como habilidades com texto; configure seus efeitos e ações.`);
            }
          }
          if (sub) { sub.system.linkedClass = itemClasse.sourceUuid || itemClasse.uuid; await adicionar(sub); }
          else pendente(`subclasse sem item correspondente: ${p.subclasse}`);
        }
        for (const [tipo, id] of [['ancestry', p.ancestralidade], ['community', p.comunidade]]) {
          if (!id) continue;
          const c = achar(tipo === 'ancestry' ? 'ancestralidades' : 'comunidades', id);
          const item = await buscar(tipo, [c?.nome, c?.original, id]);
          if (item) await adicionar(item);
          else if (c) {
            await adicionar({ name: c.nome, type: tipo, system: { description: texto(c) } });
            for (const f of c.habilidades || []) await adicionar({ name: f.nome, type: 'feature', system: { description: `<p>${h(f.texto)}</p>` } });
            pendente(`${c.nome}: herança importada com texto; confira habilidades e efeitos.`);
          } else pendente(`sem item de ${tipo}: ${id}`);
        }
        if (classe && !classe._stats?.compendiumSource && cl) {
          for (const f of [...(cl.habilidades || []), ...(cl.esperanca ? [cl.esperanca] : [])]) await adicionar({ name: f.nome, type: 'feature', system: { description: `<p>${h(f.texto)}</p>` } });
        }
        if (p.ancestralidade2) pendente(`herança mista: selecionar manualmente as habilidades de ${p.ancestralidade} + ${p.ancestralidade2}; segunda ancestralidade não adicionada automaticamente.`);
        for (const [slot, id] of Object.entries(p.equipamento || {})) {
          if (slot === 'kit' || !id) continue;
          const eq = achar('equipamento', id);
          const tipo = slot === 'armadura' ? 'armor' : ['principal', 'secundaria'].includes(slot) ? 'weapon' : 'loot';
          let item = await buscar(tipo, [eq?.nome, eq?.original, id]);
          if (!item && eq && tipo === 'armor') {
            const lim = eq.limiares?.match(/(\d+)\s*\/\s*(\d+)/);
            item = { name: eq.nome, type: tipo, system: { description: texto(eq), armor: { current: 0, max: eq.armadura || 0 }, baseThresholds: { major: Number(lim?.[1] || 0), severe: Number(lim?.[2] || 0) } } };
            if (eq.caracteristica) pendente(`${eq.nome}: característica especial descrita; revisar automação.`);
          }
          if (!item && eq && tipo === 'weapon') {
            const dano = eq.dano?.match(/d(\d+)(?:\s*\+\s*(\d+))?/);
            const alcance = { corpoacorpo: 'melee', 'corpo a corpo': 'melee', 'muito proximo': 'veryClose', proximo: 'close', distante: 'far', 'muito distante': 'veryFar' }[norm(eq.alcance)];
            const atributo = tracos[norm(eq.atributo)];
            if (dano && alcance && atributo) item = { name: eq.nome, type: tipo, system: { description: texto(eq), secondary: slot === 'secundaria', burden: norm(eq.empunhadura).includes('duas') ? 'twoHanded' : 'oneHanded', attack: { name: eq.nome, type: 'attack', range: alcance, roll: { type: 'attack', trait: atributo }, damage: { main: { type: [eq.magica ? 'magical' : 'physical'], value: { multiplier: 'prof', dice: `d${dano[1]}`, bonus: Number(dano[2] || 0) } } } } } };
            pendente(`${eq.nome}: revisar características especiais e dano por patamar.`);
          }
          if (!item) {
            item = { name: eq?.nome || String(id), type: 'loot', system: { description: texto(eq) || '<p>Importado como referência. Configure as regras manualmente.</p>' } };
            if (tipo !== 'loot') pendente(`equipamento sem correspondência, guardado como referência: ${item.name}`);
          }
          if (['weapon', 'armor'].includes(item.type)) item.system.equipped = true;
          await adicionar(item);
        }
        for (const nomeItem of lista(p.equipamento?.kit)) await adicionar({ name: nomeItem, type: 'loot', system: { quantity: 1 } });
        const domainsValidos = CONFIG.DH.DOMAIN.allDomains();
        for (const id of lista(p.cartas)) {
          const carta = achar('cartas', id);
          let item = await buscar('domainCard', [carta?.nomeEn, carta?.nome]);
          if (!item && carta && domainsValidos[dominio(carta.dominio)]) item = { name: carta.nome, type: 'domainCard', system: { description: `<p>${h(carta.texto)}</p>`, domain: dominio(carta.dominio), level: carta.nivel, recallCost: carta.recuperacao || 0, type: { habilidade: 'ability', feitico: 'spell', grimorio: 'grimoire' }[norm(carta.tipo)] || 'ability', inVault: false } };
          if (item && itemClasse) { await adicionar(item); if (!item._stats?.compendiumSource) pendente(`${item.name}: texto importado; ações e custos precisam de configuração manual.`); }
          else { pendente(`carta sem domínio/classe compatível: ${carta?.nome || id}`); await adicionar({ name: carta?.nome || id, type: 'loot', system: { description: `<p>${h(carta?.texto)}</p>` } }); }
        }
        // A criação da classe pode acrescentar perguntas à biografia. Restaura as respostas importadas.
        await actor.update({ 'system.biography.background': publico, 'system.biography.connections': conexoes, 'flags.world.sessaoZero.concluido': true });
      } catch (e) { pendente(`importação parcial: ${e.message}. A ficha foi preservada; revise antes de usar.`); }
    }
    console.info('Sessão Zero — relatório de importação', { criados, ignorados, avisos });
    await DialogV2.prompt({ window: { title: 'Resultado da importação' }, content: `<p>${criados} personagens criados; ${ignorados} já importados e ignorados.</p><p>Atribua cada ficha ao jogador no Foundry. Habilidades concedidas por classe, subclasse e herança devem ser conferidas na ficha.</p>${avisos.length ? `<h3>Revisão necessária</h3><ul>${avisos.map(a => `<li>${h(a)}</li>`).join('')}</ul>` : '<p>Sem pendências de correspondência.</p>'}`, ok: { label: 'Fechar' }, rejectClose: false });
  } catch (e) { console.error(e); ui.notifications.error(`Importação interrompida: ${e.message}`); }
})();
