---
status: aceito
---

# Preservar o contrato de aparência; preparar as aparências nomeadas

O contrato público de `GET /portal-config` devolve a identidade visual como `theme: { light, dark }` — dois conjuntos de cores no mesmo objeto. O frontend aplica as duas de uma vez, como duas séries de variáveis CSS (`--light-*`, `--dark-*`), e troca entre elas pelo atributo `data-theme` no `<html>`, escolhido pelo `localStorage` ou por `prefers-color-scheme`. O `PATCH /portal-config/theme` reescreve os dois conjuntos de cores de uma vez, e os assets têm a mesma forma: oito URLs, de `logoLightUrl` a `faviconDarkUrl`.

O modelo novo trata a aparência como entidade: uma linha é um conjunto completo de cores, e não há colunas `light_*` duplicando `dark_*`. Sozinho, isso quebraria o contrato — e a duplicação dos assets já estava no modelo anterior, com quatro URLs onde o frontend consome oito.

Decidimos que **a forma nova preserva o contrato antigo**. `portal_settings` ganha `light_theme_id` e `dark_theme_id`, cada um apontando para uma linha de `themes`, e a leitura consolidada do portal compõe `{ light, dark }` a partir dos dois slots, como hoje. Os assets migram para a Aparência: cada linha carrega os seus quatro — logo, avatar, tela de login e favicon — no lugar das oito URLs do legado.

A forma final já está escrita: o contrato `portal-config-api-0_5` especifica perfis de identidade visual — até três, nomeados, cada um um retrato da Aparência e dos assets, com um perfil ativo. É o que a entidade `themes` já permite, e **Aparência** é o termo do glossário que o nomeia.

## Alternativas consideradas

- **Devolver a lista de aparências e deixar o frontend escolher.** É a forma final, mas muda o contrato agora: o frontend consome `theme.light`/`theme.dark` em um punhado de lugares, e a escolha passaria a exigir uma preferência que ele ainda não tem.
- **Manter as colunas `light_*` e `dark_*` em uma linha só.** Preserva o contrato sem composição, e mantém a duplicação que a entidade veio para eliminar.
- **Compor a partir de duas linhas, marcando o slot na linha.** `themes.variant` distinguiria o conjunto claro do escuro. A marcação volta a carregar a noção de light/dark em toda Aparência, e duas aparências "claras" ficam ambíguas.
- **Dois slots em `portal_settings`.** Escolhido: a noção de light/dark fica exatamente onde o contrato a tem — na configuração do portal — e a Aparência continua sendo uma entidade nomeada, sem misturar os slots.

## Consequências

- O `PATCH /portal-config/theme` continua recebendo os dois conjuntos de cores e grava a linha de cada slot.
- Um token nulo significa "use o padrão": o frontend cobre token a token, e o contrato já permite o backend começar sem cores.
- A lista de aparências e a escolha do solicitante são a etapa seguinte, e estão registradas como pendência em `03-Data-Model.md` § 21.
- A URL de um asset é relativa ou absoluta — regra de aplicação, porque o upload acontece depois da escrita.
