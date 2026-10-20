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

| Pergunta | Resposta |
| --- | --- |
| Host | `GitHub.com` |
| Protocolo de Git | `SSH` (recomendado) ou `HTTPS` |
| Autenticação | `Login with a web browser` |

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

## Problemas comuns

| Sintoma | Causa provável | Solução |
| --- | --- | --- |
| `gh: command not found` | Terminal aberto antes da instalação | Abra uma nova janela do terminal |
| `HTTP 401` | Credencial inválida ou expirada | `gh auth login` |
| `missing required scopes` | Escopo ausente | `gh auth refresh --scopes project` |
| Versão antiga no Linux | Pacote da distribuição | Use o repositório oficial deste guia |

## Próximos passos

Dependências ainda não cobertas por este documento:

- Git
- Node.js 24+
- jq
- Docker e banco de dados (a definir)

## Referências

- Instalação no Linux: https://github.com/cli/cli/blob/trunk/docs/install_linux.md
- Instalação no macOS: https://github.com/cli/cli/blob/trunk/docs/install_macos.md
- Instalação no Windows: https://github.com/cli/cli/blob/trunk/docs/install_windows.md
- `gh auth login`: https://cli.github.com/manual/gh_auth_login
- `gh auth refresh`: https://cli.github.com/manual/gh_auth_refresh
- `gh auth status`: https://cli.github.com/manual/gh_auth_status
- Releases do GitHub CLI: https://github.com/cli/cli/releases/latest
