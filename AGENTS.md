## Agent skills

### Issue tracker

As issues vivem no GitHub em `NEO-Kaizen/backend-novo`. Consulte `docs/agents/issue-tracker.md`.

### Triage labels

São usados os labels canônicos padrão: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Consulte `docs/agents/triage-labels.md`.

### Domain docs

Layout single-context: `GLOSSARY.md` na raiz e `docs/adr/`. Consulte `docs/agents/domain.md`.

## Convenções de Git

- Branches: `<tipo>/<slug-em-portugues>` — ex.: `docs/padroes-de-codigo`, `feat/relatorio-de-vendas`.
- Commits: `<tipo>: <descrição no imperativo, em português>` — ex.: `docs: adiciona convenções de Git`.
- O tipo do Conventional Commits permanece em inglês (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`); slug e descrição ficam em português.
- Corpo e footer do commit em português.
- Título do PR igual à mensagem do commit principal; descrição em português.
