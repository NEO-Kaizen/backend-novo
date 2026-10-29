## Agent skills

### Issue tracker

As issues vivem no GitHub em `NEO-Kaizen/backend-novo`. Consulte `docs/agents/issue-tracker.md`.

### Triage labels

São usados os labels canônicos padrão: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Consulte `docs/agents/triage-labels.md`.

### Domain docs

Layout single-context: `GLOSSARY.md` na raiz e `docs/adr/`. Consulte `docs/agents/domain.md`.

### Coding standards

Antes de escrever ou alterar código em `src/` ou `test/`, leia `CODING_STANDARDS.md`. Para rota ou OpenAPI, leia também `docs/04-API-Conventions.md` e `docs/04-HTTP-Contract.md`; para schema, `docs/03-Data-Model.md`.

### Data model

O modelo de dados é a especificação do schema em `docs/03-Data-Model.md`. A ordem de leitura obrigatória para agentes está em `docs/agents/domain.md`.

## Context7

Use o Context7 MCP durante a sessão para consultar documentação atualizada de bibliotecas quando a resposta depender de API, configuração ou versão.

A chave fica em `.context7API` na raiz, ignorado pelo Git e negado ao agente pelas regras de `read`, `edit` e `shell` em `opencode.jsonc`. O `opencode.jsonc` lê o arquivo com `{file:.context7API}`, sem exportar variável de ambiente.

## Convenções de Git

- Branches: `<type>/<issue>-<slug>` — ex.: `docs/12-coding-standards`, `feat/34-sales-report`.
- Commits: uma linha só, `<type>(<scope>): <imperative description in English>` — ex.: `docs(git): record Git conventions`.
- O tipo do Conventional Commits permanece em inglês (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`); scope, slug e descrição também ficam em inglês.
- Sem corpo e sem footer: o commit é só a linha de assunto, no máximo 72 caracteres; o contexto que não cabe ali vai na descrição do PR.
- Título do PR em inglês; descrição e comentários em português.
