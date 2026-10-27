## Agent skills

### Issue tracker

As issues vivem no GitHub em `NEO-Kaizen/backend-novo`. Consulte `docs/agents/issue-tracker.md`.

### Triage labels

São usados os labels canônicos padrão: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Consulte `docs/agents/triage-labels.md`.

### Domain docs

Layout single-context: `GLOSSARY.md` na raiz e `docs/adr/`. Consulte `docs/agents/domain.md`.

## Convenções de Git

- Branches: `<type>/<issue>-<slug>` — ex.: `docs/12-coding-standards`, `feat/34-sales-report`.
- Commits: uma linha só, `<type>(<scope>): <imperative description in English>` — ex.: `docs(git): record Git conventions`.
- O tipo do Conventional Commits permanece em inglês (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`); scope, slug e descrição também ficam em inglês.
- Sem corpo e sem footer: o commit é só a linha de assunto, no máximo 72 caracteres; o contexto que não cabe ali vai na descrição do PR.
- Título do PR em inglês; descrição e comentários em português.

## Permissões do harness

A política versionada fica em `opencode.jsonc` (raiz) e vale para todo o projeto. Ela usa o formato V2 (`permissions` com `action`/`resource`/`effect`), onde a última regra que casa vence.

- As regras de `read` e `edit` negam `.env` e `.env.*`; `.env.example*` é liberado via `read`/`edit`.
- Comandos de shell que mencionam `.env*` são negados; para ler ou editar `.env.example`, use as ferramentas `read`/`edit`, não o shell.
- Comandos de shell pedem confirmação, exceto inspeção Git (`git status`, `git diff`, `git log`, `git show`) e `npm run *` (exceto `npm run env`).
- `git push`, `rm`, `mv`, `chmod`, `npm install`, `npm ci` e `npm i` pedem confirmação.
- Acesso fora do projeto pede confirmação.
- O tool `grep` não é coberto pelas regras de `read`; não use `grep` para procurar em `.env`.

Ao aprovar, prefira **Allow once** a **Allow always**; aprovações salvas são regras `allow` do projeto e nunca sobrepõem um `deny`. Detalhes e auditoria em `SETUP.md`.
