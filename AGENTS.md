## Agent skills

### Issue tracker

As issues vivem no GitHub em `NEO-Kaizen/backend-novo`. Consulte `docs/agents/issue-tracker.md`.

### Triage labels

São usados os labels canônicos padrão: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Consulte `docs/agents/triage-labels.md`.

### Domain docs

Layout single-context: `GLOSSARY.md` na raiz e `docs/adr/`. Consulte `docs/agents/domain.md`.

## Convenções de Git

- Branches: `<type>/<issue>-<slug>` — ex.: `docs/12-coding-standards`, `feat/34-sales-report`.
- Commits: `<type>(<scope>): <imperative description in English>` — ex.: `docs(git): add Git conventions`.
- O tipo do Conventional Commits permanece em inglês (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`); scope, slug e descrição também ficam em inglês.
- Corpo e footer do commit em inglês.
- Título do PR em inglês; descrição e comentários em português.
