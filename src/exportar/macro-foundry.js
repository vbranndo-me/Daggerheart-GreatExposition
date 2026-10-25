// Importar Sessão Zero · macro para Foundry VTT v13 (tipo Script, rodar como mestre)
// Cria a pasta de diários "Sessão Zero", uma cena por mapa e uma nota por alfinete.
// Antes: suba continente.png e rouillac.png para Data/worlds/<seu-mundo>/sessao-zero/
(async () => {
  if (!game.user.isGM) return ui.notifications.error("Rode esta macro como mestre.");
  const { DialogV2 } = foundry.applications.api;
  const NIVEL = CONST.DOCUMENT_OWNERSHIP_LEVELS;
  const HTML = CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML;
  const pastaPadrao = `worlds/${game.world.id}/sessao-zero`;

  const escolha = await DialogV2.prompt({
    window: { title: "Importar Sessão Zero" },
    content: `
      <p>Escolha o arquivo <strong>dados.json</strong> do pacote exportado pelo app.</p>
      <div class="form-group"><input type="file" name="arquivo" accept=".json,application/json"></div>
      <p>Pasta onde você subiu <code>continente.png</code> e <code>rouillac.png</code>:</p>
      <div class="form-group"><input type="text" name="pasta" value="${pastaPadrao}"></div>`,
    ok: {
      label: "Importar",
      callback: (event, button) => ({
        arquivo: button.form.elements.arquivo.files[0],
        pasta: button.form.elements.pasta.value.trim().replace(/\/+$/, ""),
      }),
    },
    rejectClose: false,
  });
  if (!escolha) return;
  if (!escolha.arquivo) return ui.notifications.error("Nenhum arquivo escolhido.");

  let dados;
  try {
    dados = JSON.parse(await escolha.arquivo.text());
  } catch (e) {
    return ui.notifications.error("O arquivo não é um JSON válido.");
  }
  if (dados.formato !== "sessao-zero/1") return ui.notifications.error("Este não é o dados.json da Sessão Zero.");

  // Confere se as imagens estão na pasta (só avisa; não impede)
  try {
    const FP = foundry.applications.apps.FilePicker.implementation;
    const lista = await FP.browse("data", escolha.pasta);
    for (const m of Object.values(dados.mapas)) {
      if (!lista.files.some((f) => f.endsWith("/" + m.arquivo))) {
        ui.notifications.warn(`Não achei ${m.arquivo} em ${escolha.pasta}. A cena vai ficar sem fundo até você subir a imagem.`);
      }
    }
  } catch (e) {
    ui.notifications.warn(`Não consegui abrir a pasta ${escolha.pasta}. Confira se as imagens estão lá.`);
  }

  ui.notifications.info("Importando a Sessão Zero…");

  // Pasta de diários
  const pasta = await Folder.create({ name: "Sessão Zero", type: "JournalEntry" });

  // Diários e páginas
  const diarios = {};
  for (const d of dados.diarios) {
    const entrada = await JournalEntry.create({
      name: d.nome,
      folder: pasta.id,
      ownership: { default: d.privado ? NIVEL.NONE : NIVEL.OBSERVER },
      pages: d.paginas.map((p, i) => ({
        name: p.nome,
        type: "text",
        sort: (i + 1) * 100000,
        text: { content: p.html, format: HTML },
      })),
    });
    diarios[d.nome] = entrada;
  }

  // Cenas e notas
  const cenas = {};
  for (const [id, m] of Object.entries(dados.mapas)) {
    const cena = await Scene.create({
      name: `Sessão Zero · ${m.nome}`,
      background: { src: `${escolha.pasta}/${m.arquivo}` },
      width: m.largura,
      height: m.altura,
      padding: 0,
      grid: { type: CONST.GRID_TYPES.GRIDLESS },
      tokenVision: false,
      navigation: true,
    });
    cenas[id] = { cena, m };
  }

  for (const [id, { cena, m }] of Object.entries(cenas)) {
    const notas = dados.notas
      .filter((n) => n.mapa === id)
      .map((n) => {
        const entrada = diarios[n.diario];
        const pagina = entrada?.pages.getName(n.pagina);
        return {
          entryId: entrada?.id ?? null,
          pageId: pagina?.id ?? null,
          x: Math.round(n.u * m.largura),
          y: Math.round(n.v * m.altura),
          texture: { src: n.icone },
          iconSize: 64,
          text: n.titulo,
          fontSize: 28,
          textColor: "#ffffff",
        };
      });
    if (notas.length) await cena.createEmbeddedDocuments("Note", notas);
  }

  ui.notifications.info(
    `Sessão Zero importada: ${dados.diarios.length} diários, ${Object.keys(cenas).length} cenas, ${dados.notas.length} notas.`,
  );
})();
