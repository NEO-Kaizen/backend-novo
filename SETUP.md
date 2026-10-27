# Setup do ambiente de desenvolvimento

Este documento reúne os passos para preparar o ambiente local. A primeira dependência coberta é o **GitHub CLI** (`gh`). As demais serão adicionadas conforme o projeto evoluir.

## Pré-requisitos

- Conta no GitHub com acesso ao repositório `NEO-Kaizen/backend-novo`.
- Terminal: bash/zsh no Linux e macOS; PowerShell no Windows.

## 1. Instalar o GitHub CLI

### Linux (Debian/Ubuntu)

Use o repositório oficial. O pacote da distribuição pode estar desatualizado ou quebrado.

```bash
(type -p wget >/dev/null || (sudo apt update && sudo apt install wget -y)) \
  && sudo mkdir -p -m 755 /etc/apt/keyrings \
  && out=$(mktemp) && wget -nv -O$out https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  && cat $out | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
  && sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
  && sudo mkdir -p -m 755 /etc/apt/sources.list.d \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
  && sudo apt update \
  && sudo apt install gh -y
```

Para atualizar:

```bash
sudo apt update && sudo apt install gh
```

### macOS

```bash
brew install gh
```

Para atualizar:

```bash
brew upgrade gh
```

### Windows

```powershell
winget install --id GitHub.cli --source winget
```

Para atualizar:

```powershell
winget upgrade --id GitHub.cli --source winget
```

> Feche e abra uma **nova janela** do Windows Terminal depois da instalação. Abrir apenas uma nova aba não atualiza o PATH.

### Verificar

```bash
gh --version
```

Saída esperada: `gh version 2.x.y`. Prefira a versão estável mais recente.

## 2. Autenticar

```bash
gh auth login
```

Respostas do fluxo interativo:

| Pergunta         | Resposta                       |
| ---------------- | ------------------------------ |
| Host             | `GitHub.com`                   |
| Protocolo de Git | `SSH` (recomendado) ou `HTTPS` |
| Autenticação     | `Login with a web browser`     |

Copie o código de oito dígitos exibido no terminal e cole no navegador.

Verifique:

```bash
gh auth status
```

Saída esperada:

```text
✓ Logged in to github.com account <seu-usuario>
- Token scopes: 'gist', 'read:org', 'repo'
```

Escopos mínimos: `repo`, `read:org` e `gist`. Se for usar `gh project`, adicione o escopo `project`:

```bash
gh auth refresh --scopes project
```

Instale a extensão usada pelo fluxo de pull requests do repositório:

```bash
gh extension install github/gh-stack
```

## 3. Permissões do OpenCode

O repositório versiona a política de permissões do harness em `opencode.jsonc`. O arquivo usa o schema público e não contém segredos.

### Como as regras são avaliadas

O OpenCode começa com uma política base que permite `*`; as regras deste projeto restringem `shell`, `read`, `edit` e `external_directory`. As regras são avaliadas em ordem e a última que casar vence. Em uma operação com vários recursos, qualquer `deny` nega; senão, qualquer `ask` pergunta; senão, `allow`.

| Ação | Recurso | Efeito |
| --- | --- | --- |
| `shell` | `*` | `ask` |
| `shell` | `git status *`, `git diff *`, `git log *`, `git show *` | `allow` |
| `shell` | `npm run *` | `allow` |
| `shell` | `npm run *env*` | `ask` |
| `shell` | `git push *`, `rm *`, `mv *`, `chmod *`, `npm install *`, `npm ci *`, `npm i *` | `ask` |
| `read` | `*.env`, `*.env.*` | `deny` |
| `read` | `*.env.example*` | `allow` |
| `shell` | `*.env*` (inclui `.env.example` no shell) | `deny` |
| `edit` | `*.env`, `*.env.*` | `deny` |
| `edit` | `*.env.example*` | `allow` |
| `external_directory` | `*` | `ask` |

As regras de `.env` ficam por último de propósito: como a última regra que casa vence, elas precisam vir depois das permissões de Git e de `npm run` para que `git diff .env` ou `rm .env` continuem negados.

Não há allow de shell para `.env.example`: o padrão cobre a string inteira do comando, então `cat .env.example .env` casaria a allow e leria o `.env`. Para o exemplo, use `read`/`edit`; comandos Git que citam o caminho também são negados, então use `git diff` sem o caminho ou `git add -A` (com confirmação).

`npm run *` é liberado porque os scripts são versionados e revisados no `package.json`; um script pode executar comandos arbitrários, então trate mudanças em `package.json` como mudanças de código. Scripts cujo nome contém `env` pedem confirmação, porque podem imprimir o ambiente do processo.

O `.gitignore` também exclui `*.env` e `*.env.*` (mantendo `*.env.example*`) para evitar commits acidentais e para que o `grep` não os varra em buscas amplas.

> O tool `grep` do OpenCode avalia a permissão pelo padrão, não pelo caminho. Por isso o `deny` de `read` não cobre `grep` com `path` explícito para `.env`; o `.gitignore` cobre as buscas amplas. Bloqueio absoluto exigiria plugin ou mudança no tool `grep`.

### Aprovações salvas ("Allow always")

Ao escolher **Allow always**, o OpenCode grava uma regra `allow` durável e restrita ao projeto. Ela nunca sobrepõe um `deny` configurado.

Liste as aprovações salvas:

```bash
opencode api get /api/permission/saved
```

Cada item traz `id`, `projectID`, `action`, `resource` e os timestamps. Remova uma aprovação ampla pelo `id`:

```bash
opencode api delete /api/permission/saved/<id>
```

> As aprovações não ficam em `~/.opencode/approvals.json`; no V2, ficam no banco local e são expostas pela API acima.

### Validar a política

1. Confirme que o arquivo é carregado:

   ```bash
   opencode debug config
   ```

   A saída deve incluir `opencode.jsonc`.

2. Crie `.env` e `.env.example` temporários (não os commite) e, na TUI, peça para o agente ler `.env` (deve ser negado) e `.env.example` (deve ser liberado via `read`).
3. Peça `git status` (sem prompt), `rm` (com prompt) e `cat .env.example` (deve ser negado; use `read` para o exemplo).
4. Peça para ler um caminho fora do projeto (com prompt).
5. Para repetir a matriz sem chamar modelo, avalie as regras com `POST /api/session/{id}/permission`; casos combinados como `cat .env.example .env` devem retornar `deny`:

   ```bash
   opencode api post /api/session/<session-id>/permission \
     --data '{"action":"read","resources":[".env"],"agent":"build"}'
   ```

## Problemas comuns

| Sintoma                   | Causa provável                      | Solução                              |
| ------------------------- | ----------------------------------- | ------------------------------------ |
| `gh: command not found`   | Terminal aberto antes da instalação | Abra uma nova janela do terminal     |
| `HTTP 401`                | Credencial inválida ou expirada     | `gh auth login`                      |
| `missing required scopes` | Escopo ausente                      | `gh auth refresh --scopes project`   |
| Versão antiga no Linux    | Pacote da distribuição              | Use o repositório oficial deste guia |

## Referências

- Instalação no Linux: https://github.com/cli/cli/blob/trunk/docs/install_linux.md
- Instalação no macOS: https://github.com/cli/cli/blob/trunk/docs/install_macos.md
- Instalação no Windows: https://github.com/cli/cli/blob/trunk/docs/install_windows.md
- `gh auth login`: https://cli.github.com/manual/gh_auth_login
- `gh auth refresh`: https://cli.github.com/manual/gh_auth_refresh
- `gh auth status`: https://cli.github.com/manual/gh_auth_status
- Releases do GitHub CLI: https://github.com/cli/cli/releases/latest
- Permissões do OpenCode V2: https://opencode.ai/v2/docs/permissions
