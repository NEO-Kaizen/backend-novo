# Setup do ambiente de desenvolvimento

Este documento reúne os passos para preparar o ambiente local. As dependências cobertas são o **GitHub CLI** (`gh`) e o **Node.js 24** (com npm). As demais serão adicionadas conforme o projeto evoluir.

## Pré-requisitos

- Conta no GitHub com acesso ao repositório `NEO-Kaizen/backend-novo`.
- Node.js 24+ (`.nvmrc`) e npm.
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

## 3. Rodar o backend

```bash
npm ci
cp .env.example .env   # gera o .env de desenvolvimento
npm run dev
npm run check
npm run build
npm start:prod
curl -i localhost:3000/health
```

`npm run dev` usa `--watch` sobre `src/server.ts`; `npm start:prod` executa `dist/server.js`. Os scripts carregam `.env` com `--env-file-if-exists`. As variáveis obrigatórias do schema (`docs/02-Architecture.md` § 16) precisam existir — no `.env` em dev ou no ambiente em produção; sem elas o processo encerra no boot com a lista do que falta. Os valores de `.env.example` são apenas de desenvolvimento e devem ser trocados em qualquer ambiente compartilhado.

`/health` responde 200 sem autenticação e não consulta o banco; a conexão com o Postgres só abre na primeira query.

## Problemas comuns

| Sintoma                             | Causa provável                      | Solução                                        |
| ----------------------------------- | ----------------------------------- | ---------------------------------------------- |
| `gh: command not found`             | Terminal aberto antes da instalação | Abra uma nova janela do terminal               |
| `HTTP 401`                          | Credencial inválida ou expirada     | `gh auth login`                                |
| `missing required scopes`           | Escopo ausente                      | `gh auth refresh --scopes project`             |
| Versão antiga no Linux              | Pacote da distribuição              | Use o repositório oficial deste guia           |
| `Configuração de ambiente inválida` | `.env` ausente ou incompleto        | `cp .env.example .env` e preencha as variáveis |

## Referências

- Instalação no Linux: https://github.com/cli/cli/blob/trunk/docs/install_linux.md
- Instalação no macOS: https://github.com/cli/cli/blob/trunk/docs/install_macos.md
- Instalação no Windows: https://github.com/cli/cli/blob/trunk/docs/install_windows.md
- `gh auth login`: https://cli.github.com/manual/gh_auth_login
- `gh auth refresh`: https://cli.github.com/manual/gh_auth_refresh
- `gh auth status`: https://cli.github.com/manual/gh_auth_status
- Releases do GitHub CLI: https://github.com/cli/cli/releases/latest
