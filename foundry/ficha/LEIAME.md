# Ficha de personagem · pacote para o módulo do Foundry

A ficha da Sessão Zero, empacotada para o módulo `exposicao-tema`. Ela **não conhece o Foundry**:
recebe um objeto de dados, desenha, e avisa por funções quando alguém mexe em algo. Quem faz a ponte
com o ator é o módulo.

| Arquivo | O que é |
|---|---|
| `ficha.js` | Script único (traz o React dentro). Define `window.FichaExposicao`. |
| `ficha.css` | Todo o estilo. Tudo vive sob classes `.fp-…`, então não vaza para o Foundry. |
| `exemplo.html` | A ficha montada com dados de exemplo, para testar fora do Foundry (abra no navegador). |

Para refazer o pacote depois de mudar o desenho: `npm run ficha:pacote` na raiz do projeto.
O código-fonte está em `src/ficha/`; o contrato completo está em `src/ficha/tipos.ts`.

## 1. Carregar no módulo

Em `module.json`:

```json
"scripts": ["ficha/ficha.js"],
"styles": ["ficha/ficha.css"]
```

(ou `esmodules` com um arquivo seu que injete o `<script>`, se preferir). As fontes **Libre Baskerville**,
**Vollkorn** e **Source Sans 3** precisam estar carregadas pelo módulo.

## 2. Montar numa janela (ApplicationV2)

```js
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

class FichaExposicao extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = { classes: ["exposicao-ficha"], position: { width: 1120, height: 820 }, window: { resizable: true, title: "Ficha" } };
  static PARTS = { corpo: { template: "modules/exposicao-tema/ficha/vazio.hbs" } }; // <div class="alvo"></div>

  _onRender() {
    const alvo = this.element.querySelector(".alvo");
    this.ficha ??= window.FichaExposicao.montar(alvo, this.dadosDaFicha(), {
      aoMudar: (novo) => this.gravar(novo),          // grava no ator
      aoRolar: (p) => this.rolar(p),                 // Dualidade pelo sistema
      aoDescansar: (p) => this.descansar(p),         // descanso pelo sistema
      aoUsarHabilidade: (id) => this.usar(id),
      aoAbrirCarta: (id) => this.actor.items.get(id)?.sheet.render(true),
    });
    this.ficha.atualizar(this.dadosDaFicha());
  }
  _onClose() { this.ficha?.destruir(); }
}
```

Regras de convivência:

- O elemento onde se monta **precisa ter altura** (a ficha preenche 100% dele). Num `.window-content` em flex, dê `flex: 1; min-height: 0` ao `.alvo`.
- `atualizar(dados)` redesenha com dados novos. Chame depois de gravar no ator e em `Hooks.on("updateActor" / "updateItem")`.
- `mensagem(html)` posta uma linha na faixa de rodapé (só aparece se `opcoes.rodape: true`; no Foundry o padrão é **sem** rodapé, porque o chat é do Foundry).
- Sem `aoRolar` e sem `aoDescansar`, a ficha rola e descansa sozinha (modo de ensaio). **No Foundry, passe os dois.**

## 3. O contrato de dados (`FichaDados`)

Resumo; os tipos exatos estão em `src/ficha/tipos.ts` e `FichaExposicao.exemplo()` devolve um objeto completo.

- **Identidade:** `nome`, `classe`, `subclasse`, `origem` ("Erudita · Humana", já sem rótulos), `nivel`, `patamar`, `dominios[{nome, svg}]` (SVG com `fill="currentColor"`).
- **Recursos** (`recursos`): `pv`, `fadiga`, `armadura` guardam `marcados` e `max`. `esperanca` guarda `valor` (o que sobra), `max` e `desabilitados[]`. `discernimento` guarda `valor`, `max` e `marcos[]`. `frenesi` guarda `valor`, `max`, `desabilitados[]` e `surto`.
- **Números fixos:** `evasao`, `limiares {maior, grave}`, `tracos[{id, nome, mod, conjuracao?}]` (só um com `conjuracao`), `experiencias[{id, nome, bonus}]`, `habilidadeEsperanca`, `compulsao`.
- **Habilidades** (`grupos`): grupos "Classe / Subclasse / Ancestralidade / Comunidade", cada habilidade com `tipo` (`acao`, `reacao`, `esperanca`, `recurso`, `fundacao`, `passiva`), `html`, `custo`, `icone` (URL de 64 px) e `recurso` opcional. O `recurso` é como a ficha mostra os mini-controles de classe: `contadores` (a bolsa de Princípios) ou `caixas` (as ervas do Herbário).
- **Loadout:** `loadout[]`, `cofre[]`, `loadoutMax`. Cada carta é `{id, nome, dominio, nivel, tipo, recuperacao, html, imagem}`, os mesmos campos de uma carta de domínio do sistema (`domain`, `level`, `type`, `recallCost`, `description`, `img`). **Com `imagem`, a ficha mostra a arte da carta pronta (do gerador); sem, desenha uma carta tipográfica.**
- **Resto:** `inventario[{titulo, itens}]`, `moedas`, `perguntas` (aba História), `condicoes` + `efeitos[]` (ids ativos), `movimentosDescanso`.

Textos longos (`html`) vêm como HTML, o mesmo formato das descrições do Foundry. Passe pelo `TextEditor.enrichHTML` antes, se quiser links e @UUID.

## 4. Eventos (`FichaAcoes`)

| Função | Quando |
|---|---|
| `aoMudar(novo, anterior)` | Qualquer marcação (PV, Fadiga, Esperança, contadores de classe, cartas movidas, notas, efeitos…) e o "desfazer". Devolve o `FichaDados` inteiro: o módulo compara e grava o que mudou. |
| `aoRolar({traco, experiencia, vantagem})` | Clicou num traço e confirmou a janelinha. `experiencia` é o id de uma Experiência (custa 1 Esperança). |
| `aoDescansar({tipo, movimentos[]})` | Confirmou o descanso: `"curto"` ou `"longo"` e **os 2 ids** escolhidos (pode repetir). |
| `aoUsarHabilidade(id)` | Botão "Usar" numa habilidade ativa. |
| `aoUsarHabilidadeEsperanca()` | Botão da habilidade de Esperança. |
| `aoAbrirCarta(id)` | Botão "Abrir carta" no Loadout. |

## 5. O que o módulo precisa decidir

1. **Onde guardar o que o sistema não tem:** Discernimento, Frenesi (com os espaços perdidos), Compulsão, a bolsa de Princípios e as caixas de erva. Sugestão: `actor.setFlag("exposicao-tema", "veu", {...})` e outro flag para recursos de classe.
2. **Adaptador ator → `FichaDados`:** uma função no módulo que lê o ator (e seus itens) e monta o objeto. Os caminhos dos campos do sistema (PV, Estresse, Esperança, limiares, traços) precisam ser conferidos no seu sistema; eu não os assumi.
3. **O que o `aoMudar` grava:** a ficha devolve o objeto inteiro; o módulo converte de volta, campo a campo, para o ator. Não grave tudo a cada clique sem comparar com `anterior`.
4. **Descanso e rolagem:** são do sistema. A ficha só pede.

## 6. Tamanho e janelas

A ficha adapta-se à largura do elemento (container queries): abaixo de ~850 px a coluna da esquerda vira uma faixa no topo, e abaixo de ~590 px os traços passam para três por linha. O que nunca some: PV, Fadiga, Esperança, Discernimento e os traços. Animações respeitam `prefers-reduced-motion`.
