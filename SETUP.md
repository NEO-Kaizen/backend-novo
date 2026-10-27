# Setup do ambiente de desenvolvimento

Este documento reúne os passos para preparar o ambiente local. As dependências cobertas são o **GitHub CLI** (`gh`), o **Node.js 24** (com npm) e o **Context7 MCP**. As demais serão adicionadas conforme o projeto evoluir.

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
npm run dev
npm run check
npm run build
npm start:prod
```

`npm run dev` usa `--watch` sobre `src/server.ts`; `npm start:prod` executa `dist/server.js`. O `.env` é opcional: os scripts usam `--env-file-if-exists=.env`.

## 4. Context7 MCP

O [Context7](https://context7.com) fornece documentação atualizada de bibliotecas para o agente. O projeto usa o servidor remoto `https://mcp.context7.com/mcp`; **não há instalador** para Windows, Linux ou macOS. O único passo local é criar o arquivo `.context7API` na raiz com a chave.

### 4.1 Criar a chave no Context7

1. Abra [context7.com/dashboard](https://context7.com/dashboard) e entre ou crie a conta.
2. No card **API Keys**, clique em **Create API Key**.
3. Dê um nome reconhecível, por exemplo `backend-novo-opencode`.
4. Copie a chave `ctx7sk-...` imediatamente; ela não é exibida novamente.
5. Guarde-a no gerenciador de senhas.

### 4.2 Criar o arquivo do secret

1. No VS Code, clique com o botão direito na **raiz do projeto** e escolha **New File**.
2. Nomeie o arquivo como `.context7API`.
3. Cole **apenas a chave**, sem `CONTEXT7_API_KEY=`, sem quotes e sem texto extra.
4. Salve. O OpenCode remove espaços e quebras de linha nas pontas do conteúdo.
5. Confira que `.context7API` aparece no `.gitignore`. O arquivo deve ficar ao lado do `opencode.jsonc`.

O `opencode.jsonc` lê o arquivo com `{file:.context7API}`. Não é preciso exportar variável, editar o shell ou reiniciar o serviço. Se o OpenCode já estava aberto, rode `/reload` para reler a configuração.

### 4.3 Permissões do arquivo (opcional, por SO)

O arquivo já fica fora do Git e a política do OpenCode nega leitura/edição pelo agente. Se quiser restringir o acesso no sistema:

| SO          | Passo prático                                                                                                                                                                            |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linux**   | No gerenciador de arquivos, `Ctrl+H` para mostrar ocultos; botão direito em `.context7API` → **Properties** → **Permissions**; dono com leitura/escrita, grupo e outros sem acesso.      |
| **macOS**   | No Finder, `Cmd+Shift+.` para mostrar ocultos; botão direito → **Get Info** → **Sharing & Permissions**; remova o acesso dos demais usuários.                                            |
| **Windows** | No Explorer, **View** → **Show** → **Hidden items**; botão direito → **Properties** → **Security** → **Advanced**; desative a herança e mantenha apenas seu usuário com leitura/escrita. |

### 4.4 Como o projeto consome

O trecho relevante do `opencode.jsonc` é:

```jsonc
"mcp": {
  "servers": {
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/mcp",
      "oauth": false,
      "headers": {
        "Authorization": "Bearer {file:.context7API}"
      }
    }
  }
}
```

- `{file:...}` lê o arquivo relativo ao `opencode.jsonc`; não usa variável de ambiente.
- `oauth: false` usa a API key; OAuth usaria o endpoint `/mcp/oauth`.
- Se o arquivo não existir, o header fica vazio e a chave não é usada; o servidor pode operar com os limites anônimos ou responder `401`.

### 4.5 Validar

1. Abra o OpenCode.
2. Rode `/mcps` e confira `context7 connected`.
3. Peça: “Use o Context7 para consultar a documentação atual do Prisma sobre migrations.” O `connected` sozinho não prova que a chave foi usada, porque o Context7 permite uso anônimo; a consulta real confirma.
4. Opcional: rode `opencode mcp list` no terminal.

### 4.6 Problemas comuns

| Sintoma                               | Causa provável                                      | Solução prática                                                                      |
| ------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `/mcps` mostra `needs authentication` | OpenCode tentando OAuth                             | Confirme `oauth: false` no `opencode.jsonc`; o projeto já vem assim.                 |
| `401`                                 | `.context7API` ausente, vazio ou com chave revogada | Abra o arquivo, confira a chave e recrie no dashboard se necessário; rode `/reload`. |
| Ferramentas não aparecem              | Servidor desconectado ou configuração antiga        | Use `/mcps` para reconectar e `/reload` para reler a configuração.                   |
| Alterei a chave e continua `401`      | Configuração antiga em memória                      | Rode `/reload` ou reabra o OpenCode.                                                 |
| Rate limit                            | Limite da conta ou do plano                         | Confira o dashboard e o plano do Context7.                                           |

### 4.7 Alternativa via terminal (opcional)

Para quem preferir criar o arquivo por comando, em Linux/macOS:

```bash
printf "Cole a chave do Context7: "
read -rs CONTEXT7_API_KEY
printf '\n'
(umask 077; printf '%s' "$CONTEXT7_API_KEY" > .context7API)
unset CONTEXT7_API_KEY
```

No Windows PowerShell:

```powershell
$secure = Read-Host "Cole a chave do Context7" -AsSecureString
$key = [System.Net.NetworkCredential]::new("", $secure).Password
Set-Content -NoNewline -Path .context7API -Value $key
Remove-Variable secure, key
```

Esses comandos citam `.context7API`; a política do projeto os nega ao agente. Execute no seu terminal.

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
- Dashboard do Context7: https://context7.com/dashboard
- API keys do Context7: https://context7.com/docs/howto/api-keys
- Context7 no OpenCode: https://context7.com/docs/clients/opencode
- MCP no OpenCode V2: https://opencode.ai/v2/docs/mcp-servers
- Troubleshooting do Context7: https://context7.com/docs/resources/troubleshooting
