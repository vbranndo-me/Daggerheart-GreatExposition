# Sessão Zero · Exposição Universal

App web da sessão zero da campanha de Daggerheart. Seis navegadores sincronizados ao vivo: o mestre conduz as etapas e a tela de todo mundo acompanha. No fim, tudo o que a mesa criou sai em arquivos (JSON, Markdown, PNG dos mapas e um pacote para o Foundry v13).

O app é público (GitHub Pages). **Não ponha nada secreto do cenário no repositório, nem no código, nem em `/content`.** Os únicos dados privados são os segredos e as respostas sobre morte que os jogadores escrevem durante a sessão, e esses ficam protegidos pelas regras do banco.

---

## 1. Testar agora, sem configurar nada

Precisa do [Node.js](https://nodejs.org) 20 ou mais novo.

```bash
npm install
```

```bash
npm run dev
```

Abra o endereço que aparecer (ex.: `http://localhost:5173`). Sem Firebase, o app roda em **modo local**: guarda tudo no navegador e sincroniza só as **abas do mesmo navegador**. Uma faixa amarela no topo avisa isso. Serve para ensaiar sozinho:

1. Clique em **criar sala nova**. Você entra como mestre (o link tem `?m=<chave>`).
2. No painel do mestre › **Sala** › **modo ensaio**: cria 5 jogadores falsos com dados de exemplo.
3. Copie o **link dos jogadores** (painel › Pessoas) e abra em outras abas. Cada aba é uma pessoa diferente.

---

## 2. Configurar o Firebase (para a sessão de verdade)

1. Entre em <https://console.firebase.google.com> e **crie um projeto** (o Google Analytics pode ficar desligado).
2. **Realtime Database**: menu *Criação › Realtime Database › Criar banco de dados*. Escolha a região e comece em **modo bloqueado**.
3. **Login anônimo**: *Criação › Authentication › Começar › Método de login › Anônimo › Ativar*.
4. **Config web**: *Configurações do projeto (engrenagem) › Seus apps › ícone `</>`*. Registre um app web (sem hosting) e copie o objeto `firebaseConfig`. Cole os valores em [`src/firebase-config.ts`](src/firebase-config.ts). Confira se o `databaseURL` está lá (ele aparece depois que o banco existe). Essa config **não é segredo**: pode ir para o GitHub.
5. **Regras**: *Realtime Database › Regras*. Apague o que estiver lá, cole todo o conteúdo de [`database.rules.json`](database.rules.json) e clique em **Publicar**.
6. **Domínio autorizado**: *Authentication › Configurações › Domínios autorizados › Adicionar domínio*: `<seu-usuario>.github.io`.

O plano grátis (Spark) basta com folga para 6 pessoas.

### O que as regras garantem

- Qualquer pessoa com o link lê o que é público da sala (mapa, alfinetes, fichas, programa).
- `privado/<jogador>` (segredo e resposta sobre morte) só pode ser lido pelo **dono** e pelo **mestre**.
- O autor de cada linha ou véu fica no privado de quem escreveu, não no item público: nem abrindo o console dá para ver.
- Só o mestre muda etapas, nomes, a ordem do builder e aceita respostas. Cada jogador só edita o próprio personagem, os próprios alfinetes e a resposta quando é a vez dele.
- Não é à prova de hacker (alguém poderia, por exemplo, escolher o nome de outra pessoa que esteja fora da sala), mas evita acidentes.

---

## 3. Publicar no GitHub Pages

1. Crie um repositório no GitHub (ex.: `sessao-zero`) e envie esta pasta para a branch `main`.
2. No repositório: *Settings › Pages › Build and deployment › Source*: **GitHub Actions**.
3. Cada push na `main` publica sozinho (veja a aba *Actions*). O endereço fica `https://<seu-usuario>.github.io/<repositorio>/`.

---

## 4. Na noite da sessão

1. Abra o site e clique em **criar sala nova**. O endereço vira o seu **link de mestre** (`#/s/<sala>?m=<chave>`). **Guarde esse link e não mande para ninguém.**
2. No painel do mestre › **Pessoas**: cadastre o nome e a cor de cada jogador.
3. Copie o **link dos jogadores** e mande no Discord.
4. Cada jogador abre o link e clica no próprio nome. Um ponto verde mostra quem está na sala.
5. Conduza pelo painel › **Etapas**: *avançar* leva todo mundo para a próxima etapa. O cadeado **tranca** uma etapa (os jogadores ainda leem, mas não editam mais).
6. Na **Abertura**, o botão *abrir convite para todos* abre o envelope na tela de todo mundo.
7. Na **Exposição**, prepare a ordem e o número de rodadas e clique em *começar*. Na vez de cada um, a pessoa (ou você) rola os bilhetes, escreve a resposta (todos veem a digitação) e pode pôr um alfinete em Rouillac. Você aceita, veta (a pergunta sai do sorteio e a pessoa rola de novo) ou passa a vez.
8. No **Encerramento**, exporte tudo.

**Se alguém cair:** basta abrir o link de novo. O nome volta sozinho (fica salvo no navegador). Se o nome ficar preso como "na sala", use *liberar* no painel › Pessoas.

**Se você (mestre) fechar a aba:** abra o seu link de mestre de novo. O papel de mestre vem da chave do link.

**Ensaiar sem estragar a sala:** painel › Sala › *duplicar para ensaio* cria uma cópia com outra identificação.

---

## 5. Exportações

No Encerramento (ou no painel › Exportar):

| Arquivo | O que é |
|---|---|
| `sessao-zero.json` | O estado completo da sala, para o Claude do projeto. |
| `sessao-zero.md` | Relatório legível: participantes, segurança (sem autores), países com alfinetes, personagens (com segredo marcado "Só mestre"), Exposição em ordem, laços. |
| `continente-alfinetes.png`, `rouillac-alfinetes.png` | Os mapas a 4096 px com os alfinetes, os títulos e a legenda de autores. |
| `foundry-sessao-zero.zip` | Pacote para o Foundry v13 (abaixo). |

---

## 6. Importar no Foundry VTT v13

O zip traz `dados.json`, `continente.png` e `rouillac.png` (mapas **sem** alfinetes, para fundo de cena), `importar-sessao-zero.js` (a macro) e um `LEIA-ME.txt`.

1. **Suba as imagens.** Copie `continente.png` e `rouillac.png` para `Data/worlds/<seu-mundo>/sessao-zero/` (no Windows, a pasta Data fica em `%LOCALAPPDATA%\FoundryVTT\Data`). Ou, no Foundry, abra qualquer seletor de arquivo, vá até a pasta do mundo, crie `sessao-zero` e faça o upload por lá.
2. **Crie a macro.** Entre no mundo como mestre. Na barra de macros, clique num espaço vazio › *Tipo: Script*. Dê o nome "Importar Sessão Zero".
3. **Cole** todo o conteúdo de `importar-sessao-zero.js` e salve.
4. **Rode** a macro (clique nela na barra). Ela pede o `dados.json` e a pasta das imagens (já vem preenchida com `worlds/<seu-mundo>/sessao-zero`).
5. Pronto. A macro cria:
   - a pasta de diários **Sessão Zero**, com os diários *Países* (uma página por país, com os alfinetes), *A Exposição* (programa e lugares), *Personagens* (sem segredo), *Segredos (mestre)* (só o mestre vê) e *Laços*;
   - duas cenas, **Sessão Zero · O Continente** e **Sessão Zero · Plan de Rouillac**, sem grade, com `padding 0` e o tamanho exato do PNG;
   - uma **nota no mapa** por alfinete, ligada à página certa do diário, com o título do alfinete e um ícone por tipo.

Rodar duas vezes cria tudo de novo (duplicado). Apague a pasta e as cenas antes de repetir.

**API conferida no código do Foundry 13.351** instalado nesta máquina: `JournalEntry` (`name`, `folder`, `ownership`, `pages`), `JournalEntryPage` (`type: "text"`, `text.content`, `text.format = CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML`), `Note` (`entryId`, `pageId`, `x`/`y` **inteiros**, `texture.src`, `iconSize` ≥ 32, `text`), `Scene` (`background.src`, `width`, `height`, `padding`, `grid.type = CONST.GRID_TYPES.GRIDLESS`), `foundry.applications.api.DialogV2.prompt` e `foundry.applications.apps.FilePicker.implementation.browse`. Os ícones usados existem em `icons/svg/` do core (house, book, sound, mystery-man, temple, hazard, village, eye).

---

## 7. Trocar o conteúdo (`/content`)

Todos os textos ficam em `content/`, fora do código. Hoje estão com **dados de exemplo** marcados "[Exemplo]". Troque à vontade; o formato está abaixo. Depois de editar, um push na `main` publica.

| Arquivo | Conteúdo |
|---|---|
| `geral.json` | Título do cenário, subtítulo, pergunta da ligação com o oculto, ajuda do segredo, rodadas padrão, `conviteArte` (opcional, ex.: `"convite.png"`) |
| `abertura.md` | A Proposta. Tudo antes do primeiro `## ` é o texto de leitura; cada `## Seção` (Tom, Temas, Referências…) vira um bloco ao lado |
| `convite.md` | O convite da Exposição, que aparece dentro do envelope |
| `seguranca.json` | Textos de linhas e véus, a pergunta e as opções sobre morte e sacrifício, as ferramentas |
| `paises.json` | 8 países + 2 terras distantes (`"distante": true`) |
| `origens.json` | Papéis na Exposição (`id`, `nome`, `descricao`). Use o id `outro` para abrir um campo livre |
| `comunidades.json` | Comunidades (lista simples, `id`, `nome`, `descricao`) |
| `classes.json` | Vitrine de classes, 3 perguntas de origem e 3 de conexão por classe. `imagem` opcional (caminho dentro de `content/`) |
| `compulsao.json` | Explicação, exemplos e a pergunta |
| `builder.json` | 4 categorias (d4) × 10 perguntas (d10), cada uma com um tipo de alfinete sugerido (`pavilhao`, `escandalo`, `lugar`, `boato`, `pessoa`) |
| `mapas/continente.json` | `viewBox`, o SVG, as camadas (id do `<g>` + rótulo + se começa ligada) e os tipos de alfinete com o ícone do Foundry |
| `mapas/rouillac.json` | `viewBox`, as plantas alternativas (`bases`) e os tipos de alfinete |

Exemplos de formato:

```json
// paises.json
[{ "id": "entremonts", "nome": "Entremonts", "sabor": "francês", "capital": "Rouillac",
   "lado": "Neutro", "publico": "…", "boatos": ["…","…","…"], "viajante": "…", "svgId": "pais-entremonts" }]

// builder.json
{ "titulo": "Programme Officiel de l'Exposition",
  "categorias": [{ "d4": 1, "nome": "A construção", "perguntas": [{ "d10": 1, "texto": "…", "pin": "escandalo" }] }] }

// classes.json
[{ "id": "alquimista", "nome": "Alquimista", "nova": true, "fantasia": "…", "dominios": ["Sábio","Códice"],
   "subclasses": [{"nome": "Apotecária", "linha": "…"}], "origem": ["…","…","…"], "conexao": ["…","…","…"], "imagem": null }]
```

**Cuidado ao trocar ids** (`id` de país, classe, papel, pergunta): respostas já gravadas numa sala usam esses ids. Troque antes da sessão, não durante.

---

## 8. Os mapas

### Continente

O SVG v5 só tinha 5 grupos (`oceano`, `grade`, `terras`, `rotulos`, `rosa`), sem países. Por isso `content/mapas/continente.svg` é **gerado** pelo script [`scripts/gerar-continente.mjs`](scripts/gerar-continente.mjs), que junta as `terras` do v5 com os GeoJSON da pasta do mapa (países, frentes, zona ocupada, ferrovias, cidades, vilas, rios, lagos). Os GeoJSON estão no espaço do heightmap (7350 × 5250); o script divide por 3,5 e inverte o y para cair no `viewBox` 2100 × 1500.

Camadas que existem agora: `paises` (política, clicável), `frentes` (frentes de guerra, zona ocupada e ferrovias cortadas), `ferrovias`, `cidades` (capitais e cidades), `vilas`, `rios`, `rotulos`, `grade`.

Para regerar depois de mexer nos GeoJSON:

```bash
npm run gerar-continente -- "C:/Users/vbran/AI/mapa"
```

Camadas novas também podem entrar como SVGs sobrepostos com o mesmo `viewBox`, listados em `sobreposicoes` no `continente.json` (mesmo formato de `bases`).

### Rouillac

Usa as plantas v1 **dos jogadores**: `monumentos` (padrão), `distritos` e `pobreza` (a carta de Booth), escolhidas em *camadas*. São SVGs sem grupos, então funcionam como plantas alternativas. **Nunca copie para cá a versão do mestre.**

---

## 9. Estrutura do código

```
src/
  App.tsx              rotas, entrada, barra de etapas, palco
  db/backend.ts        Firebase + modo local (mesma interface)
  db/sala.ts           assinatura ao vivo, presença, ações
  db/tipos.ts          modelo de dados
  components/Mapa.tsx  zoom, camadas, alfinetes
  components/PainelMestre.tsx
  etapas/*.tsx         uma tela por etapa
  exportar/*.ts        JSON/MD, PNG, pacote do Foundry e a macro
content/               textos e mapas (editáveis sem mexer no código)
database.rules.json    regras do Realtime Database
```

Modelo no banco:

```
gmkeys/<sala>                     chave do mestre (ninguém lê)
salas/<sala>/
  gmauth/<uid>                    quem é mestre (uid → chave)
  meta: { etapaAtual, etapas: { n: { aberta, trancada } }, conviteAberto, criadaEm }
  jogadores/<jid>: { nome, cor, uid, online, ordem }
  pins/<continente|rouillac>/<pid>: { u, v, tipo, titulo, texto, autor, criadoEm, resposta? }
  personagens/<jid>: { pais, papel, papelOutro, comunidade, classe, origem: { <classe>: { 0, 1, 2 } }, compulsao, oculto }
  privado/<jid>: { segredo, morte, seguranca: { <iid>: true } }
  seguranca/itens/<iid>: { lista, texto, criadoEm }
  builder: { ordem, rodadas, rodada, vez, vezJid, iniciado, terminado, sorteadas, atual, respostas/<rid> }
  lacos/<lid>: { de, para, pergunta, resposta }
```

Mudança em relação ao rascunho da especificação: em vez de `meta/gm = uid`, o mestre fica em `gmauth/<uid>`, validado contra `gmkeys/<sala>`. Assim o mestre pode reabrir o link (ou usar outro computador) e continuar mestre, e cada aba tem a própria identidade (sessão por aba), o que permite ensaiar com várias abas.

---

## 10. O Arquivo (a apresentação do cenário)

Abre em `#/arquivo` (sem sala e sem Firebase). É uma apresentação: tela de título, um capítulo de cada vez e, no fim, o criador de personagem.

**Estrutura** (`content/arquivo/`)

- `arquivo.json`: título, subtítulo, complexidade e a lista de capítulos, cada um com as suas `secoes` (os ids dos `.md`).
- `<id>.md`: uma seção. Frontmatter:

```markdown
---
id: rouillac
wf: 3
layout: texto-arte     # abertura | texto-arte | arte-cheia | efemera | mapa | galeria | regras | citacao | chamada
titulo: Rouillac
contexto: "A cidade que o ferro construiu e a fome esvaziou."
arte: { id: "rouillac", tipo: A, desc: "o que a imagem mostra" }
placeholder: { mapa: rouillac, x: 50, y: 50, z: 3 }   # recorte do mapa, em duotom, até a arte ficar pronta
lado: direita          # texto-arte: de que lado fica a arte
status: esqueleto      # esqueleto | rascunho | pronto
---
```

- **Status:** só `pronto` aparece para os jogadores. Com `?rascunho=1` no endereço (`#/arquivo/mundo?rascunho=1`) você vê tudo, com a faixa "em escrita" ou "rascunho". Um capítulo sem nenhuma seção pronta aparece com cadeado na faixa de capítulos.
- **Marcar como pronta:** troque `status: esqueleto` por `status: pronto`.
- **Abertura de capítulo:** a coluna da direita vem de um bloco `:::lateral` … `:::` no próprio Markdown.
- **Diretivas:** `:::lateral`, `:::nota{titulo="…"}`, `:::exemplo`, `:::citacao{autor="…"}`, `::efemera{id="convite"}`, `::tabela-paises`, `::pais{id="bretemar"}`, `::galeria{fonte="comunidades"}` (também `ancestralidades`, `classes`, `equipamento`), `::carta{id="…"}`, `::mapa{id="continente"}`, `::ramo{para="…" titulo="…"}` e `:termo[Discernimento]` (usa o `content/glossario.json`).
- **Peças de papel:** o texto vem de `content/arquivo/efemera-<id>.md` (o convite usa o `convite.md` da sessão).
- **Trocar um placeholder por arte:** gere a imagem para o `id` pedido em `content/arte/manifest.json` (rode `npm run pedidos-arte` para a lista), ponha o arquivo em `content/arte/` e preencha o campo `arquivo`. O placeholder some sozinho.

**As artes (`npm run arte`)**

- Os PNG originais do mestre ficam em `content/arte/fonte/` (fora do git, com os nomes que ele deu). O arquivo `content/arte/mapa-arte.json` diz qual PNG é qual `id` (`null` = ainda não existe).
- `npm run arte` gera `public/arte/<id>-<largura>.webp` e o `public/arte/arte.json` (larguras, proporção e cor média). O app pede a arte sempre pelo `id`; o nome original nunca aparece no site. Esses WebP vão para o git, porque a publicação automática não tem os originais.
- Imagem nova: ponha o PNG na `fonte/`, acrescente a linha no `mapa-arte.json` e rode `npm run arte`. Trocar uma imagem: ponha o PNG com o mesmo nome e rode de novo.
- O comando avisa (sem falhar) sobre arquivo sem `id`, `id` sem arquivo e imagem menor que o tamanho-alvo. `npm run pedidos-arte` mantém `content/arte/PEDIDOS.md` (o que ainda falta).

**Spoiler:** crie `.spoilers.txt` na raiz (uma palavra por linha; ele já está no `.gitignore`) e rode `npm run spoiler` antes de cada push. O script só avisa, não bloqueia.

## Créditos

- Ícones: [game-icons.net](https://game-icons.net) (Lorc, Delapouite e outros autores), licença [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Só os ícones usados vão para o app: a lista fica em `scripts/extrair-icones.mjs` e `npm run icones` regera `src/jogo/icones-dados.ts`.

