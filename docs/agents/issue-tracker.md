# Rastreador de issues: GitHub

Issues e especificações deste repositório vivem no GitHub em `NEO-Kaizen/backend-novo`. Use a CLI `gh` para todas as operações.

> Se este diretório ainda não for um clone com um remote `origin`, passe `--repo NEO-Kaizen/backend-novo` explicitamente.

## Convenções

- **Criar uma issue**: `gh issue create --title "..." --body "..."`. Use um heredoc para corpos com múltiplas linhas.
- **Ler uma issue**: `gh issue view <number> --comments`, filtrando comentários com `jq` e também buscando os labels.
- **Listar issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` com os filtros apropriados de `--label` e `--state`.
- **Comentar em uma issue**: `gh issue comment <number> --body "..."`
- **Aplicar / remover labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Fechar**: `gh issue close <number> --comment "..."`

Dentro de um clone, o `gh` infere o repositório a partir de `git remote -v`. Fora dele, passe `--repo NEO-Kaizen/backend-novo`.

## Pull requests como canal de triagem

**PRs como canal de solicitações: não.** _(Defina como `yes` se este repositório trata PRs externos como solicitações de funcionalidades; `/triage` lê esta flag.)_

Quando definido como `yes`, PRs passam pelos mesmos labels e estados das issues, usando os equivalentes `gh pr`:

- **Ler um PR**: `gh pr view <number> --comments` e `gh pr diff <number>` para ver o diff.
- **Listar PRs externos para triagem**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments` e mantenha apenas `authorAssociation` igual a `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR` ou `NONE` (descarte `OWNER`/`MEMBER`/`COLLABORATOR`).
- **Comentar / rotular / fechar**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

O GitHub compartilha um único espaço de numeração entre issues e PRs, então um `#42` isolado pode ser qualquer um: resolva com `gh pr view 42` e recorra a `gh issue view 42`.

## Quando um skill diz "publicar no rastreador de issues"

Crie uma issue no GitHub.

## Quando um skill diz "buscar o ticket relevante"

Execute `gh issue view <number> --comments`.

## Operações do wayfinder

Usado pelo `/wayfinder`. O **mapa** é uma issue única com **issues filhas** como tickets.

- **Mapa**: uma issue única com o label `wayfinder:map`, contendo o corpo de Notas / Decisões até o momento / Névoa (Fog). `gh issue create --label wayfinder:map`.
- **Ticket filho**: uma issue vinculada ao mapa como sub-issue do GitHub (`gh api` no endpoint de sub-issues). Onde sub-issues não estiverem habilitadas, adicione o filho a uma lista de tarefas no corpo do mapa e coloque `Part of #<map>` no topo do corpo do filho. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Uma vez assumido, o ticket é atribuído ao desenvolvedor responsável.
- **Bloqueio**: **dependências nativas de issues** do GitHub, a representação canônica e visível na UI. Adicione uma aresta com `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, onde `<blocker-db-id>` é o **database id** numérico do bloqueador (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _não_ o `#number` nem o `node_id`). O GitHub reporta `issue_dependencies_summary.blocked_by` (somente bloqueadores abertos, o gate em tempo real). Onde dependências não estiverem disponíveis, use uma linha `Blocked by: #<n>, #<n>` no topo do corpo do filho. Um ticket está desbloqueado quando todos os bloqueadores estão fechados.
- **Consulta de fronteira**: liste os filhos abertos do mapa (`gh issue list --state open`, limitado às sub-issues / lista de tarefas do mapa), descarte qualquer um com bloqueador aberto (`issue_dependencies_summary.blocked_by > 0`, ou uma issue aberta na linha `Blocked by`) ou com assignee; o primeiro na ordem do mapa vence.
- **Assumir**: `gh issue edit <n> --add-assignee @me`, a primeira escrita da sessão.
- **Resolver**: `gh issue comment <n> --body "<resposta>"`, depois `gh issue close <n>`, depois anexe um ponteiro de contexto (gist + link) ao "Decisões até o momento" do mapa.
