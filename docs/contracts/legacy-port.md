# Contrato legado — port fiel do backend atual

Este documento registra, domínio por domínio, o contrato HTTP **vigente no backend legado** no
commit `70acc02c89c58d9b0056f9f1615502212873c7e2` (referência `F1`). Ele descreve o que o sistema
faz hoje, para que o backend-novo tenha uma fonte única e fiel antes de qualquer alteração.

Este é um port **narrativo** do legado: não é o contrato de máquina do backend-novo e não substitui
os schemas Zod (`docs/04-HTTP-Contract.md`).

**Este documento não decide nada.** Não há renomeação de rota ou campo, não há correção de
divergência e não há recomendação. Onde o legado diverge das convenções congeladas do backend-novo,
a divergência é apenas **anotada**, com ponteiro para a decisão correspondente. Os deltas
intencionais vivem nas specs de domínio e em `docs/adr/`.

## Como ler este documento

- **Legado vigente** — comportamento efetivo no commit `F1`, com evidência de código.
- **Divergente (legado vigente)** — o comportamento existe e é o que está documentado, mas contraria
  `docs/04-API-Conventions.md`. A anotação aponta a convenção e o destino da decisão; nada é
  alterado aqui.
- **Compatível por exceção registrada** — o comportamento coincide com a convenção por uma linha de
  exceção em `docs/04-API-Conventions.md` (por exemplo, a tabela de paginação da §4.3).
- **Desatualizado no legado** — um documento do próprio legado (`F1 docs/...`) contradiz o código no
  mesmo commit. O código prevalece e a divergência é registrada.
- **Parcialmente compatível** — parte do comportamento coincide e parte diverge; a célula diz qual
  parte.
- **Registrado (sem convenção correspondente)** — comportamento do legado que não tem convenção
  congelada aplicável; fica registrado sem veredito.
- **Registrado (decisão aberta)** — o comportamento depende de uma decisão da tabela 0.2 ainda não
  congelada; o ponteiro indica a linha.
- **Não verificado** — quando a evidência não permite afirmar o comportamento (por exemplo, regra
  que depende de dados ou de configuração externa).
- **Fora do inventário** — rota servida por middleware estático ou de infraestrutura, que não é
  contrato de domínio.

Os marcadores de divergência e de desatualização aparecem em negrito quando abrem um parágrafo e em
texto corrido quando estão dentro de tabelas; a grafia é fixa.

Citação: `F1 <caminho>:<linha>` para código e `F2 <caminho>:<linha>` para o consumidor; documentos
do legado são citados como `F1 docs/<arquivo>.md` (sem linha, salvo quando a seção é relevante).
Linhas foram lidas no commit fixado, nunca na árvore de trabalho.

Ponteiros de convenção usam `§n` para a seção e `tabela 0.1 #n`/`tabela 0.2 #n` para a linha da
tabela correspondente em `docs/04-API-Conventions.md`. Specs de domínio são citadas por nome — por
exemplo, “spec de `requests`”. Este documento não referencia issues do backend-novo; caminhos
`F1 docs/issues/...` são documentos do legado.

### Índice

- [1. Escopo e fora de escopo](#1-escopo-e-fora-de-escopo)
- [2. Fontes](#2-fontes)
- [3. Transporte transversal](#3-transporte-transversal)
- [4. Inventário de rotas](#4-inventário-de-rotas)
- [5. auth](#5-auth)
- [6. forms](#6-forms)
- [7. portal-config](#7-portal-config)
- [8. users](#8-users)
- [9. requests](#9-requests)
- [10. triage](#10-triage)
- [11. mapping](#11-mapping)
- [12. prioritization](#12-prioritization)
- [13. pending-items](#13-pending-items)
- [14. queue](#14-queue)
- [15. reports](#15-reports)
- [16. audit](#16-audit)
- [17. internal-notes](#17-internal-notes)
- [18. Divergências anotadas (índice)](#18-divergências-anotadas-índice)

## Template das seções de domínio

Cada domínio (§5 a §17) segue a mesma estrutura:

1. **Fontes** — código, documentos do legado e consumidor usados na seção.
2. **Rotas** — tabela com método, path completo, autenticação/autorização, handler, sucesso e erros.
3. **Uma subseção por rota** com `Request` (path/query/body e headers quando diferirem do padrão),
   `Response` de sucesso e `Erros` (status, `code` quando houver, mensagem literal e condição).
   `Transporte` e `Evidência` aparecem quando a rota tem particularidade de transporte ou de
   implementação; fora isso, a evidência fica nas citações do próprio texto. A coluna `code` só
   existe nas tabelas de erro dos domínios que emitem `code`.
4. **Visão do consumidor (F2)** — o que o frontend chama e onde ele diverge do backend, sem decisão.
5. **Confronto com `docs/04-API-Conventions.md`** — `Compatível` ou `Divergente (legado vigente)`,
   com ponteiro para a convenção, o ADR ou a decisão da spec de origem.

A §6 (`forms`) é a exceção: o legado não expõe rota de formulário, então a seção documenta a
gramática do payload de `POST /requests` e o catálogo de 33 chaves no lugar das rotas.

Rotas públicas não recebem `security` explícito neste documento; a coluna de autenticação é a fonte.

## 1. Escopo e fora de escopo

**Escopo:** as 54 rotas registradas em `F1 src/router.ts:16-32` nos 11 módulos de router de domínio, mais a
gramática do payload de formulário (§6) que não tem superfície HTTP própria.

**Fora de escopo:** deltas intencionais, geração de OpenAPI, implementação em `src/`, migração de
dados e qualquer julgamento sobre o que deveria ser diferente. Rotas de infraestrutura
(`GET /uploads/*`) são citadas apenas como contexto de transporte.

## 2. Fontes

| Ref | Repositório           | Commit                                     | Uso                                                                                   |
| --- | --------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------- |
| F1  | `NEO-Kaizen/backend`  | `70acc02c89c58d9b0056f9f1615502212873c7e2` | fonte primária: rotas, controllers, services, schemas, DTOs, documentos do legado     |
| F2  | `NEO-Kaizen/frontend` | `ca80eec6cf12a38046d89933b5107b7fcc4acf13` | visão do consumidor: `src/lib/api`, `src/config`, `src/lib/types`, `src/lib/pendency` |

Limitações das fontes:

- As cópias de contrato do frontend (`frontend/contratos/*.md`) **não estão versionadas em F2**;
  portanto não são citáveis. A visão do consumidor vem apenas de código tipado em `src/lib`.
- Vários documentos do legado em `F1 docs/` já estão desatualizados em relação ao próprio código
  (o motor de status v4 é o caso mais visível). Onde isso ocorre, a seção marca
  **Desatualizado no legado**.
- O contrato é fixado por SHA; se o legado avançar, este documento não muda.
- Comportamentos que dependem de dados ou configuração (por exemplo, o modo de abertura do portal e o
  conteúdo de `system_settings`) são descritos pela regra do código, não por um estado específico.

## 3. Transporte transversal

### 3.1 Base path e montagem

O legado **não** tem prefixo `/api/v1`: o `router` é montado na raiz da aplicação
(`F1 src/app.ts:28`) e cada domínio é montado a partir de `F1 src/router.ts:16-32`.

| Montagem                             | Router                            | Evidência                |
| ------------------------------------ | --------------------------------- | ------------------------ |
| `/prioritization`                    | `prioritizationRoutes`            | `F1 src/router.ts:18`    |
| `/auth`                              | `authRoutes`                      | `F1 src/router.ts:20`    |
| `/requests/:protocol/internal-notes` | `internalNotesRoutes`             | `F1 src/router.ts:21`    |
| `/requests/:protocol/pending-items`  | `pendingItemsRoutes`              | `F1 src/router.ts:22`    |
| `/requests/:protocol/public`         | `publicVerifyRouter`              | `F1 src/router.ts:23`    |
| `/requests`                          | `requestsRoutes` e `triageRoutes` | `F1 src/router.ts:24-25` |
| `/users`                             | `usersRoutes`                     | `F1 src/router.ts:26`    |
| `/queue`                             | `queueRoutes` (inclui mapping)    | `F1 src/router.ts:28`    |
| `/portal-config`                     | `portalConfigRoutes`              | `F1 src/router.ts:29`    |
| `/reports`                           | `reportsRoutes`                   | `F1 src/router.ts:30`    |
| `/audit-history`                     | `auditHistoryRoutes`              | `F1 src/router.ts:31`    |
| `/audit-logs`                        | `auditLogsRouter`                 | `F1 src/router.ts:32`    |

O JSON é lido com o limite default do Express (`F1 src/app.ts:26`), sem limite explícito. O
`/uploads` é `express.static` público sobre `Config.UPLOAD_DIR`, com `fallthrough: false`
(`F1 src/app.ts:24`) — serve os assets do portal, não é rota de domínio e não aparece no inventário
da §4.

**Divergente (legado vigente):** ausência de `/api/v1` — convenção §1 de `docs/04-API-Conventions.md`.

### 3.2 Sessão e cookie

- O cookie é `Config.COOKIE_NAME`, default `session_id` (`F1 src/configs.ts:23`); o conteúdo é um
  JWT assinado com `JWT_SECRET` e validade `JWT_EXPIRES_IN`, default `1d`
  (`F1 src/configs.ts:15-19`; `F1 src/shared/utils/jwtUtil.ts:22-31`).
- Atributos na emissão: `maxAge` igual à validade, `httpOnly: true`, `sameSite: "lax"`,
  `secure` quando `NODE_ENV === "production"` (`F1 src/modules/auth/auth.controller.ts:12-17`).
- `POST /auth/login` emite o token com `scope: "session"`; quando a senha precisa ser trocada, emite
  um token `scope: "change_password"` e devolve `mustChangePassword: true`
  (`F1 src/modules/auth/auth.controller.ts:40-50,64-73`).
- `POST /auth/logout` é **público** (não há `authMiddleware`), limpa o cookie e responde
  `200 { message: "Sessão encerrada com sucesso" }` (`F1 src/modules/auth/auth.controller.ts:26-29`;
  `F1 src/modules/auth/auth.router.ts:8`). O `clearCookie` passa apenas `httpOnly`
  (`F1 src/modules/auth/auth.controller.ts:27`).
- O `authMiddleware` valida o cookie e recarrega o usuário a cada request; perfil e `is_active` vêm
  do banco, não do JWT (`F1 src/shared/middleware/auth.ts:25-45,74-85`). Mensagens: ausência de
  cookie → `401 "Token não fornecido"`; token inválido/expirado/usuário inativo → `401 "Token inválido
ou expirado"` (`F1 src/shared/middleware/auth.ts:27-45,87-95`).
- Com `must_change_password` verdadeiro, apenas `PUT /auth/change-password` e `GET /auth/me`
  passam; as demais rotas respondem `403 "Troca de senha obrigatória antes de continuar"`
  (`F1 src/shared/middleware/auth.ts:49-61`).
- Toda troca ou reset de senha avança `users.password_changed_at`; tokens emitidos antes são
  recusados com `401 "Sua sessão foi revogada. Faça login novamente."`
  (`F1 src/shared/middleware/auth.ts:63-72`).
- `requireRole` exige `req.authScope === "session"` e responde
  `403 "Troca de senha obrigatória antes de continuar"` quando o escopo não é `session`; com
  escopo válido, perfil fora da lista responde
  `403 "Acesso restrito ao perfil <perfis unidos por ' ou '>"` (`F1 src/shared/middleware/requireRole.ts:9-23`).
- **Desatualizado no legado:** `F1 src/shared/middleware/dualAuth.ts:20` testa o cookie literal
  `session_id` em vez de `Config.COOKIE_NAME`; com `COOKIE_NAME` customizado, a rota dual-auth trata
  a sessão como anônima.

**Divergente (legado vigente):** `clearCookie` sem os demais atributos — anotado na spec de `auth`
(§3.2).

### 3.3 Envelope de erro

Formato vigente (`F1 src/shared/middleware/errorHandler.ts:9-44`):

```json
{ "status": "error", "statusCode": 404, "message": "Solicitação não encontrada." }
```

- `code` é aditivo e só aparece quando o erro foi criado com ele
  (`F1 src/shared/errors/AppError.ts:1-11`; `F1 src/shared/middleware/errorHandler.ts:19-22`).
- `fields` é aditivo e só aparece em `ValidationError` (`422`), como **objeto** chave → mensagem,
  indexado pela chave da UI (`F1 src/shared/errors/ValidationError.ts:10-17`;
  `F1 src/shared/middleware/errorHandler.ts:24-30`). Exemplo:
  `{ "operational.hasManualControlsDetail": "Campo obrigatório." }`
  (`F1 src/shared/validation/zodErrors.ts:99-117`).
- Erros não previstos respondem com o `status`/`statusCode` do erro quando existir, ou `500`, e a
  mensagem `"Erro interno do servidor"` para 5xx (`F1 src/shared/middleware/errorHandler.ts:32-44`).
- Não há `requestId` no envelope no legado.

**Divergente (legado vigente):** `fields` como objeto e uso de `422` em parte do fluxo — convenções
§3 e tabela 0.1 #5 de `docs/04-API-Conventions.md` (alvo `400` + `fields` como lista). Não há `requestId` —
convenção §12.

### 3.4 Validação

O legado usa dois caminhos:

| Caminho                                   | Status | Corpo                      | Evidência                                      |
| ----------------------------------------- | ------ | -------------------------- | ---------------------------------------------- |
| `formatZodIssues`                         | 400    | mensagem agregada em pt-BR | `F1 src/shared/validation/zodErrors.ts:89-91`  |
| `buildZodFieldErrors` → `ValidationError` | 422    | `{ message, fields }`      | `F1 src/shared/validation/zodErrors.ts:99-117` |

O primeiro é usado, por exemplo, em `auth` (`F1 src/modules/auth/auth.controller.ts:32-36`) e no
verify público (`F1 src/modules/pendingItems/pendingItems.controller.ts:114-115`); o segundo, no
fluxo de requests. A distribuição exata é registrada em cada seção de domínio.

**Divergente (legado vigente):** mistura 400/422 — convenção §3 (C2) e specs de `requests`, `users`,
`triage` e `mapping`.

### 3.5 Códigos de sucesso

Leitura e atualização respondem `200` com corpo JSON. A criação responde `201` em `POST /users`,
`POST /requests`, `POST /requests/:protocol/triage`, `POST /requests/:protocol/pending-items`
(inclusive o anexo) e `POST /requests/:protocol/internal-notes`; `PUT /queue/requests/:protocol/mapping`
cria com `200`; `PUT /requests/:protocol/internal-notes/read` responde `204` sem corpo. Não há uso de
`Location` nem de `ETag`.

**Divergente (legado vigente):** criação com `200` no mapping — convenção §15.4 (tabela 0.1 #20).

### 3.6 Paginação

Não há convenção única no legado. O tipo `PaginatedResponse<T>` (`{ data, page, pageSize, total,
totalPages }`) existe em `F1 src/shared/types/pagination.ts:1-7`, mas cada domínio aplica o seu
envelope — a auditoria, por exemplo, usa `{ items, total, page, limit }` (§16). A forma efetiva de
cada endpoint está na seção do domínio; nenhuma delas é normalizada aqui.

### 3.7 Multipart

| Uso                                                                 | Campo                                   | Limites                                                                                     | MIME/extensão                                            | Erros                                 | Evidência                                                        |
| ------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------- |
| `POST /requests`                                                    | `payload` (1), `attachments` (0–5)      | 10 MB/arquivo; 5 arquivos; 2 MB por campo                                                   | PDF, DOCX, XLSX, PNG, JPG → senão 400                    | 400 com mensagem por código do multer | `F1 src/shared/middleware/upload.ts:5-64`                        |
| `PUT /users/me`                                                     | `avatar` (1)                            | 2 MB; 1 arquivo; 2 MB por campo                                                             | `.jpg/.jpeg/.png` + `image/jpeg`/`image/png` → senão 415 | 413 estouro; 400 demais               | `F1 src/shared/middleware/uploadAvatar.ts:14-84`                 |
| `PATCH /portal-config/assets`                                       | `assets` (JSON, 1) + 8 chaves de imagem | 8 arquivos; 2 MB por campo; por chave: logo/avatar 2 MB, favicon 1 MB, imagem de login 5 MB | por chave (`ASSET_FILE_RULES`) → senão 415               | 413 por tamanho; 400 demais           | `F1 src/shared/middleware/uploadAssets.ts:11-139,146-166`        |
| `POST /requests/:protocol/pending-items/:pendingItemId/attachments` | `file` (1)                              | 10 MB; 1 arquivo                                                                            | mesma allowlist de anexos → senão 400                    | 400 com mensagem por código           | `F1 src/modules/pendingItems/pendingItems.router.ts:19-33,50-67` |

Quando a rota aceita arquivo, o JSON trafega como parte multipart (campo `payload` em
`POST /requests`; campo `assets` em `PATCH /portal-config/assets`; campo `payload` em `PUT /users/me`,
ao lado do arquivo `avatar`). Sem arquivo, as mesmas rotas aceitam corpo `application/json` com esse
campo como string: o `express.json` roda antes do multer e o multer ignora requisições não multipart
(`F1 src/app.ts:26`; `F1 src/shared/middleware/upload.ts:48-64`).

**Divergente (legado vigente):** 400 para MIME inválido em requests/pendências, 415 em avatar e
assets; convenção §9 e specs de `requests`, `pending-items`, `users` e `portal-config`.

### 3.8 Datas e horas

Timestamps vêm do PostgreSQL (`timestamptz`) e são serializados por `res.json` como string
ISO-8601 em UTC (sufixo `Z`); datas puras trafegam como `YYYY-MM-DD`. Cada seção registra os campos
de data que expõe. Não há normalização de fuso no wire: o valor é o do banco.

### 3.9 Identidade do solicitante

O legado usa o header `X-Requester-Identity` com um JSON `{ "name": string, "email": string }`
(`F1 src/shared/utils/requesterIdentity.ts:1-13`). O middleware dual aceita **cookie de sessão ou**
o header; sem cookie e sem header válido responde
`401 "Valide seus dados para acompanhar esta solicitação."`
(`F1 src/shared/middleware/dualAuth.ts:19-40`). O header só é parseado: a checagem de posse
(nome/e-mail contra a solicitação) acontece no service de cada domínio.

**Divergente (legado vigente):** header `X-Requester-Identity` com nome+e-mail, 401 e verificação
por `POST .../public/verify`; ADR-0023 e convenção §15.3 apontam `X-Requester-Email`, 404 e a
aposentadoria gradual do verify.

### 3.10 CORS, headers e request-id

- CORS com origens explícitas de `CORS_ORIGINS` (default `http://localhost:5173`), `credentials:
true` e `exposedHeaders: ["Content-Disposition"]` (`F1 src/app.ts:11-18`; `F1 src/configs.ts:19-21`).
- `x-powered-by` desligado (`F1 src/app.ts:19`).
- Não há middleware de `x-request-id` nem headers de segurança no legado; também não há handler de
  404 dedicado — rota não casada recebe o 404 HTML padrão do Express, e o `errorHandler` só trata
  erros encaminhados por `next(err)` (`F1 src/app.ts:28-31`).

**Divergente (legado vigente):** sem request-id, sem headers de segurança e sem 404 explícito —
convenções §12 e §14; `02-Architecture.md` §9.4.

### 3.11 Rate limit

Só o verify público de pendências aplica limite: 10 tentativas por 10 minutos, chave
`ip:protocolo` normalizado, storage em memória do processo; excedeu →
`429 "Muitas tentativas. Tente novamente em alguns minutos."`, sem `Retry-After`
(`F1 src/modules/pendingItems/pendingItems.controller.ts:8-12,109-112`;
`F1 src/shared/middleware/rateLimit.ts:7-29`).

**Divergente (legado vigente):** storage não compartilhado e ausência de `Retry-After` — convenção
§13 (C12). Login não tem limite no legado — tabela 0.2 #24.

## 4. Inventário de rotas

54 registros, contados a partir dos routers em `F1 src/modules/**`.

| #   | Domínio        | Método | Path                                                           | Autenticação/autorização                                          | Handler                            | Evidência                                                      |
| --- | -------------- | ------ | -------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------- |
| 1   | auth           | POST   | `/auth/login`                                                  | pública                                                           | `authenticate`                     | `F1 src/modules/auth/auth.router.ts:7`                         |
| 2   | auth           | POST   | `/auth/logout`                                                 | pública                                                           | `logout`                           | `F1 src/modules/auth/auth.router.ts:8`                         |
| 3   | auth           | GET    | `/auth/me`                                                     | sessão                                                            | `me`                               | `F1 src/modules/auth/auth.router.ts:9`                         |
| 4   | auth           | PUT    | `/auth/change-password`                                        | sessão (inclusive `must_change_password`)                         | `changePassword`                   | `F1 src/modules/auth/auth.router.ts:10`                        |
| 5   | portal-config  | GET    | `/portal-config`                                               | pública                                                           | `getConfig`                        | `F1 src/modules/portalConfig/portalConfig.router.ts:19`        |
| 6   | portal-config  | PATCH  | `/portal-config/access`                                        | Administrador                                                     | `updateAccess`                     | `F1 src/modules/portalConfig/portalConfig.router.ts:25`        |
| 7   | portal-config  | PATCH  | `/portal-config/identity`                                      | Administrador                                                     | `updateIdentity`                   | `F1 src/modules/portalConfig/portalConfig.router.ts:26`        |
| 8   | portal-config  | PATCH  | `/portal-config/theme`                                         | Administrador                                                     | `updateTheme`                      | `F1 src/modules/portalConfig/portalConfig.router.ts:27`        |
| 9   | portal-config  | PATCH  | `/portal-config/assets`                                        | Administrador; multipart                                          | `updateAssets`                     | `F1 src/modules/portalConfig/portalConfig.router.ts:28`        |
| 10  | portal-config  | PATCH  | `/portal-config/categories`                                    | Administrador                                                     | `updateCategories`                 | `F1 src/modules/portalConfig/portalConfig.router.ts:29`        |
| 11  | portal-config  | PATCH  | `/portal-config/statuses`                                      | Administrador                                                     | `updateStatuses`                   | `F1 src/modules/portalConfig/portalConfig.router.ts:30`        |
| 12  | portal-config  | PATCH  | `/portal-config/prioritization-weights`                        | Administrador                                                     | `updatePrioritizationWeights`      | `F1 src/modules/portalConfig/portalConfig.router.ts:31`        |
| 13  | users          | GET    | `/users/analysts`                                              | sessão (qualquer sessão autenticada, inclusive Solicitante)       | `listAnalysts`                     | `F1 src/modules/users/users.router.ts:23`                      |
| 14  | users          | GET    | `/users/me`                                                    | sessão                                                            | `getMyProfile`                     | `F1 src/modules/users/users.router.ts:26`                      |
| 15  | users          | PUT    | `/users/me`                                                    | sessão; multipart opcional                                        | `updateMyProfile`                  | `F1 src/modules/users/users.router.ts:29`                      |
| 16  | users          | GET    | `/users/metrics`                                               | Administrador                                                     | `getUserMetrics`                   | `F1 src/modules/users/users.router.ts:32`                      |
| 17  | users          | GET    | `/users`                                                       | Administrador                                                     | `listUsers`                        | `F1 src/modules/users/users.router.ts:33`                      |
| 18  | users          | POST   | `/users`                                                       | Administrador                                                     | `createUser`                       | `F1 src/modules/users/users.router.ts:34`                      |
| 19  | users          | GET    | `/users/:id`                                                   | Administrador                                                     | `getUser`                          | `F1 src/modules/users/users.router.ts:35`                      |
| 20  | users          | PUT    | `/users/:id`                                                   | Administrador                                                     | `updateUser`                       | `F1 src/modules/users/users.router.ts:36`                      |
| 21  | users          | PATCH  | `/users/:id/status`                                            | Administrador                                                     | `changeUserStatus`                 | `F1 src/modules/users/users.router.ts:37`                      |
| 22  | users          | POST   | `/users/:id/reset-password`                                    | Administrador                                                     | `resetUserPassword`                | `F1 src/modules/users/users.router.ts:38`                      |
| 23  | requests       | GET    | `/requests`                                                    | modo de acesso (`PUBLIC`/`AUTHENTICATED`)                         | `getRequestsByEmail`               | `F1 src/modules/requests/requests.router.ts:24`                |
| 24  | requests       | GET    | `/requests/assignees`                                          | Analista, Gestor, Administrador                                   | `getAssignees`                     | `F1 src/modules/requests/requests.router.ts:27-32`             |
| 25  | requests       | PATCH  | `/requests/:protocol/internal/assignee`                        | Analista, Administrador; custódia no service                      | `patchInternalAssignee`            | `F1 src/modules/requests/requests.router.ts:38-43`             |
| 26  | requests       | PATCH  | `/requests/:protocol/assignee`                                 | Analista, Administrador; alias legado                             | `patchAssignee`                    | `F1 src/modules/requests/requests.router.ts:45-50`             |
| 27  | requests       | GET    | `/requests/:protocol/tracking`                                 | dual (sessão ou `X-Requester-Identity`)                           | `getTracking`                      | `F1 src/modules/requests/requests.router.ts:55`                |
| 28  | requests       | PATCH  | `/requests/:protocol/status`                                   | Analista, Gestor, Administrador; custódia no service              | `patchRequestStatus`               | `F1 src/modules/requests/requests.router.ts:60-65`             |
| 29  | requests       | GET    | `/requests/:protocol`                                          | modo de acesso                                                    | `getRequestsByProtocol`            | `F1 src/modules/requests/requests.router.ts:67`                |
| 30  | requests       | GET    | `/requests/:protocol/internal`                                 | Analista, Gestor, Administrador                                   | `getInternalRequestByProtocol`     | `F1 src/modules/requests/requests.router.ts:68-75`             |
| 31  | requests       | PATCH  | `/requests/:protocol/internal`                                 | Analista, Gestor, Administrador; custódia no service              | `patchInternalRequestByProtocol`   | `F1 src/modules/requests/requests.router.ts:79-84`             |
| 32  | requests       | POST   | `/requests`                                                    | modo de acesso; multipart                                         | `postRequest`                      | `F1 src/modules/requests/requests.router.ts:88`                |
| 33  | triage         | GET    | `/requests/:protocol/triage`                                   | Analista, Gestor, Administrador; Analista restrito ao responsável | `getTriage`                        | `F1 src/modules/requests/triage/triage.router.ts:12-16`        |
| 34  | triage         | POST   | `/requests/:protocol/triage`                                   | Administrador, Analista; Analista restrito ao responsável         | `saveTriage`                       | `F1 src/modules/requests/triage/triage.router.ts:19`           |
| 35  | mapping        | GET    | `/queue/requests/:protocol/mapping`                            | Analista, Gestor, Administrador                                   | `getMappingController`             | `F1 src/modules/queue/queue.router.ts:28-33`                   |
| 36  | mapping        | PUT    | `/queue/requests/:protocol/mapping`                            | Analista, Gestor, Administrador; escrita no service               | `putMappingController`             | `F1 src/modules/queue/queue.router.ts:35-40`                   |
| 37  | prioritization | GET    | `/prioritization/criteria`                                     | Analista, Gestor, Administrador                                   | `listCriteria`                     | `F1 src/modules/prioritization/prioritization.router.ts:11-15` |
| 38  | prioritization | PUT    | `/prioritization/:protocol/score`                              | Analista, Administrador; custódia no service                      | `evaluateScore`                    | `F1 src/modules/prioritization/prioritization.router.ts:18-22` |
| 39  | pending-items  | POST   | `/requests/:protocol/pending-items`                            | Analista, Gestor, Administrador                                   | `createPendingItems`               | `F1 src/modules/pendingItems/pendingItems.router.ts:36-41`     |
| 40  | pending-items  | GET    | `/requests/:protocol/pending-items`                            | dual (sessão ou `X-Requester-Identity`)                           | `listPendingItems`                 | `F1 src/modules/pendingItems/pendingItems.router.ts:42`        |
| 41  | pending-items  | PATCH  | `/requests/:protocol/pending-items/review`                     | Analista, Gestor, Administrador                                   | `reviewPendingItems`               | `F1 src/modules/pendingItems/pendingItems.router.ts:43-48`     |
| 42  | pending-items  | PATCH  | `/requests/:protocol/pending-items/:pendingItemId`             | dual (sessão ou `X-Requester-Identity`)                           | `respondPendingItem`               | `F1 src/modules/pendingItems/pendingItems.router.ts:49`        |
| 43  | pending-items  | POST   | `/requests/:protocol/pending-items/:pendingItemId/attachments` | dual; multipart                                                   | `attachPendingItem`                | `F1 src/modules/pendingItems/pendingItems.router.ts:50-67`     |
| 44  | pending-items  | POST   | `/requests/:protocol/public/verify`                            | pública; rate limit                                               | `publicVerify`                     | `F1 src/modules/pendingItems/pendingItems.router.ts:70`        |
| 45  | queue          | GET    | `/queue/metrics`                                               | Analista, Gestor, Administrador                                   | `getMetricsController`             | `F1 src/modules/queue/queue.router.ts:11-16`                   |
| 46  | queue          | GET    | `/queue`                                                       | Analista, Gestor, Administrador                                   | `centralizedQueue`                 | `F1 src/modules/queue/queue.router.ts:18-23`                   |
| 47  | reports        | GET    | `/reports/dashboard`                                           | Gestor, Administrador                                             | `getDashboardController`           | `F1 src/modules/reports/reports.router.ts:8-13`                |
| 48  | reports        | GET    | `/reports/requests.csv`                                        | Gestor, Administrador                                             | `exportQueueCsvController`         | `F1 src/modules/reports/reports.router.ts:15-20`               |
| 49  | audit          | GET    | `/audit-history`                                               | Administrador, Gestor                                             | `listAuditHistoryController`       | `F1 src/modules/auditHistory/auditHistory.router.ts:19-24`     |
| 50  | audit          | GET    | `/audit-history/:id`                                           | Administrador, Gestor                                             | `getAuditHistoryDetailController`  | `F1 src/modules/auditHistory/auditHistory.router.ts:26-31`     |
| 51  | audit          | GET    | `/audit-logs/:protocol`                                        | Analista, Gestor, Administrador                                   | `getAuditLogsByProtocolController` | `F1 src/modules/auditHistory/auditHistory.router.ts:40-45`     |
| 52  | internal-notes | GET    | `/requests/:protocol/internal-notes`                           | Analista, Gestor, Administrador                                   | `listInternalNotes`                | `F1 src/modules/internalNotes/internalNotes.router.ts:15`      |
| 53  | internal-notes | POST   | `/requests/:protocol/internal-notes`                           | Analista, Gestor, Administrador                                   | `createInternalNote`               | `F1 src/modules/internalNotes/internalNotes.router.ts:16`      |
| 54  | internal-notes | PUT    | `/requests/:protocol/internal-notes/read`                      | Analista, Gestor, Administrador                                   | `markInternalNotesRead`            | `F1 src/modules/internalNotes/internalNotes.router.ts:17`      |

### 4.1 Cobertura por domínio

| Domínio        | Rotas                   | Seção |
| -------------- | ----------------------- | ----- |
| auth           | 4                       | §5    |
| forms          | 0 (sem superfície HTTP) | §6    |
| portal-config  | 8                       | §7    |
| users          | 10                      | §8    |
| requests       | 10                      | §9    |
| triage         | 2                       | §10   |
| mapping        | 2                       | §11   |
| prioritization | 2                       | §12   |
| pending-items  | 6                       | §13   |
| queue          | 2                       | §14   |
| reports        | 2                       | §15   |
| audit          | 3                       | §16   |
| internal-notes | 3                       | §17   |
| **Total**      | **54**                  | —     |

## 5. auth

Quatro rotas, montadas em `/auth` (`F1 src/router.ts:20`), cobrindo o ciclo de sessão por cookie JWT:
login, logout, leitura da sessão e troca de senha. No router de `auth` não há recuperação de senha por
e-mail, refresh de token nem cadastro público (o reset administrativo vive em `/users`, §8). A sessão é
sempre cookie `HttpOnly`; nenhuma rota de `auth` aceita `Authorization: Bearer`.

### 5.1 Fontes

**Código (F1):**

| Caminho                                                                                                             | Uso                                               |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `src/modules/auth/auth.router.ts`                                                                                   | registro das 4 rotas e do `authMiddleware`        |
| `src/modules/auth/auth.controller.ts`                                                                               | handlers, cookie de sessão, DTOs de resposta      |
| `src/modules/auth/auth.service.ts`                                                                                  | autenticação, releitura de sessão, troca de senha |
| `src/modules/auth/auth.schema.ts`                                                                                   | `loginSchema` e `changePasswordSchema`            |
| `src/modules/auth/auth.repository.ts`                                                                               | consultas de usuário/perfil e update de senha     |
| `src/modules/DTOs/auth/{LoginRequest,LoginResponse,MeResponse,ChangePasswordRequest,ChangePasswordResponse}.dto.ts` | forma dos corpos                                  |
| `src/shared/middleware/auth.ts`                                                                                     | `authMiddleware`, escopo e revogação              |
| `src/shared/utils/jwtUtil.ts`                                                                                       | emissão e verificação do JWT                      |
| `src/shared/utils/roleUtils.ts`                                                                                     | mapa `profiles.name` → `Role`                     |
| `src/shared/utils/passwordHandler.ts`                                                                               | bcrypt (custo 10)                                 |
| `src/shared/validation/fieldSchemas.ts`                                                                             | `emailSchema` e `passwordSchema`                  |
| `src/shared/validation/zodErrors.ts`                                                                                | `formatZodIssues`                                 |
| `src/configs.ts`                                                                                                    | `COOKIE_NAME`, `JWT_EXPIRES_IN`, `COOKIE_MAX_AGE` |
| `src/shared/middleware/errorHandler.ts`                                                                             | envelope de erro                                  |
| `src/app.ts`                                                                                                        | `express.json`, `cookieParser`, CORS              |
| `src/modules/users/users.service.ts`, `src/modules/users/users.repository.ts`                                       | reset administrativo de senha (revogação)         |

**Documentos do legado (F1):** `docs/database/authentication-persistence.md` (modelo de `profiles` e
`users`).

**Desatualizado no legado:** `F1 docs/database/authentication-persistence.md` descreve `users` sem
`avatar_url`, `must_change_password` e `password_changed_at` (tabela em §"Tabela `users`") e declara os
endpoints de autenticação fora de escopo (§"Fora do escopo"). O código lê as três colunas em toda
consulta de autenticação (`F1 src/modules/auth/auth.repository.ts:10-28`) e elas são criadas por
`F1 migrations/users/20260921000000_add_avatar_url_to_users.js`,
`F1 migrations/20260911120000_add_must_change_password_to_users.js` e
`F1 migrations/20260912150000_add_password_changed_at_to_users.js`.

**Consumidor (F2):** `src/lib/api/auth.api.ts`, `src/lib/services/auth.service.ts`,
`src/lib/types/auth.ts`, `src/lib/types/user.ts`, `src/lib/api/client.ts`, `src/lib/utils/api-assets.ts`,
`src/hooks.server.ts`, `src/lib/services/access.service.ts`,
`src/lib/components/forms/LoginForm.svelte`, `src/routes/(app)/redefinir-senha/+page.svelte`.

### 5.2 Rotas

| Método | Path                    | Autenticação                                          | Handler          | Sucesso                                     | Erros              |
| ------ | ----------------------- | ----------------------------------------------------- | ---------------- | ------------------------------------------- | ------------------ |
| POST   | `/auth/login`           | pública                                               | `authenticate`   | 200 + DTO de sessão + `Set-Cookie`          | 400, 401, 500      |
| POST   | `/auth/logout`          | pública                                               | `logout`         | 200 `{ message }` + cookie expirado         | 500                |
| GET    | `/auth/me`              | sessão (cookie); permitida com `must_change_password` | `me`             | 200 + DTO de sessão                         | 401, 500           |
| PUT    | `/auth/change-password` | sessão (cookie); permitida com `must_change_password` | `changePassword` | 200 + DTO de sessão + `Set-Cookie` renovado | 400, 401, 404, 500 |

Evidência do registro: `F1 src/modules/auth/auth.router.ts:7-10`.

**Divergente (legado vigente):** os paths não têm o prefixo `/api/v1` — convenção §1 de
`docs/04-API-Conventions.md` (ver também §3.1 deste documento).

O DTO de sessão é o mesmo nas três respostas com corpo (`LoginResponseDTO`, `MeResponseDTO`,
`ChangePasswordResponseDTO` são estruturalmente idênticos): `id`, `name`, `email`, `avatarUrl`, `role`,
`mustChangePassword` (`F1 src/modules/DTOs/auth/LoginResponse.dto.ts:3-10`;
`F1 src/modules/DTOs/auth/MeResponse.dto.ts:3-10`;
`F1 src/modules/DTOs/auth/ChangePasswordResponse.dto.ts:3-10`). Não existe campo `permissions` em
nenhuma resposta de `auth`.

### 5.3 POST `/auth/login`

Autentica por e-mail e senha, emite o JWT no cookie e devolve o DTO de sessão. Rota pública
(`F1 src/modules/auth/auth.router.ts:7`).

#### Request

| Parte   | Conteúdo                                                                                            |
| ------- | --------------------------------------------------------------------------------------------------- |
| Path    | nenhum parâmetro; path completo `/auth/login`                                                       |
| Query   | nenhuma                                                                                             |
| Body    | JSON `{ "email": string, "password": string }` (`F1 src/modules/DTOs/auth/LoginRequest.dto.ts:1-4`) |
| Headers | `Content-Type: application/json`; cookie não é necessário                                           |

Regras de validação (`F1 src/modules/auth/auth.schema.ts:4-12`):

| Campo      | Regra                                                                                  | Mensagem literal                                                                                                |
| ---------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `email`    | `emailSchema`: string, `trim`, `toLowerCase`, formato de e-mail, máximo 254 caracteres | `"Informe um e-mail válido."`, `"Máximo de 254 caracteres."` (`F1 src/shared/validation/fieldSchemas.ts:20-25`) |
| `password` | `maxPasswordBytes`: string, mínimo 1 caractere, máximo 72 **bytes** UTF-8; sem `trim`  | `"Campo obrigatório."`, `"Máximo de 72 bytes."` (`F1 src/modules/auth/auth.schema.ts:4-7`)                      |

- `password` no login **não** passa por `passwordSchema`: não há mínimo de 8 caracteres nessa rota
  (`F1 src/modules/auth/auth.schema.ts:11`).
- A falha de validação usa `formatZodIssues` + `AppError(..., 400)`, portanto o corpo do 400 tem
  apenas `message` agregada, sem `fields` (`F1 src/modules/auth/auth.controller.ts:32-36`;
  `F1 src/shared/validation/zodErrors.ts:57-91`). Exemplos de `message`:
  - `"Campos obrigatórios ausentes: email, password"` (ambos ausentes);
  - `"Campos inválidos: email — Informe um e-mail válido."`;
  - `"Campos inválidos: password — Máximo de 72 bytes."`;
  - valor não-string vira `"Deve ser um texto."` (`F1 src/shared/validation/zodErrors.ts:3-8,33-37`).
- O e-mail é normalizado uma segunda vez no service (`trim` + `toLowerCase`) antes da consulta
  (`F1 src/modules/auth/auth.service.ts:27-29`). A senha não é normalizada.
- A consulta é `users` JOIN `profiles` por `profile_id`, trazendo `profile_name` e
  `profile_is_active` (`F1 src/modules/auth/auth.repository.ts:6-28`).
- Usuário inexistente, senha incorreta, `users.is_active = false` e `profiles.is_active = false`
  produzem **a mesma** resposta: `401 "Credenciais inválidas"`. Nos casos de usuário inexistente e de
  usuário/perfil inativo o service executa um `comparePassword` contra um hash descartável para
  equalizar o tempo do bcrypt (`F1 src/modules/auth/auth.service.ts:22-24,31-48`).
- Não há rate limit nesta rota: o router não aplica nenhum middleware de limite
  (`F1 src/modules/auth/auth.router.ts:7`).

#### Response 2xx

Status `200` (`F1 src/modules/auth/auth.controller.ts:61,84`).

| Campo                | Tipo                                                         | Origem                                                                            |
| -------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `id`                 | string decimal (`String(user_id)`)                           | `F1 src/modules/auth/auth.service.ts:52`                                          |
| `name`               | string (`users.full_name`)                                   | `F1 src/modules/auth/auth.service.ts:53`                                          |
| `email`              | string (`users.email`, já normalizado no banco)              | `F1 src/modules/auth/auth.service.ts:54`                                          |
| `avatarUrl`          | string ou `null` (`users.avatar_url`)                        | `F1 src/modules/auth/auth.service.ts:55`                                          |
| `role`               | `"Solicitante" \| "Analista" \| "Gestor" \| "Administrador"` | `F1 src/modules/auth/auth.service.ts:56`; `F1 src/shared/utils/roleUtils.ts:5-22` |
| `mustChangePassword` | boolean                                                      | `F1 src/modules/auth/auth.service.ts:57`                                          |

Exemplo (dados fictícios):

```json
{
  "id": "42",
  "name": "Pessoa Analista",
  "email": "pessoa.analista@example.com",
  "avatarUrl": null,
  "role": "Analista",
  "mustChangePassword": false
}
```

Quando `users.must_change_password` é verdadeiro, a resposta tem a mesma forma com
`"mustChangePassword": true` e o cookie carrega `scope: "change_password"`
(`F1 src/modules/auth/auth.controller.ts:40-62`).

O `id` trafega como **string**, não como número: o service faz `String(user.user_id)`
(`F1 src/modules/auth/auth.service.ts:52`) e o DTO declara `id: string`
(`F1 src/modules/DTOs/auth/LoginResponse.dto.ts:4`).

#### Erros

| Status | `code` | Mensagem literal                                                                                                                                                   | Condição                                                                                                                                                    |
| ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400    | —      | `"Campos obrigatórios ausentes: email, password"` / `"Campos inválidos: email — Informe um e-mail válido."` / `"Campos inválidos: password — Máximo de 72 bytes."` | body inválido (`F1 src/modules/auth/auth.controller.ts:34-36`)                                                                                              |
| 401    | —      | `"Credenciais inválidas"`                                                                                                                                          | e-mail inexistente, senha incorreta, usuário inativo ou perfil inativo (`F1 src/modules/auth/auth.service.ts:31-49`)                                        |
| 500    | —      | `"Erro ao comparar as senhas"`                                                                                                                                     | falha do bcrypt no `compare` (`F1 src/shared/utils/passwordHandler.ts:17-25`)                                                                               |
| 500    | —      | `"Perfil inválido"`                                                                                                                                                | `profiles.name` fora do mapa canônico (`F1 src/shared/utils/roleUtils.ts:14-22`)                                                                            |
| 500    | —      | `"Erro interno do servidor"`                                                                                                                                       | erro não-`AppError`, por exemplo `JWT_SECRET` ausente na emissão (`F1 src/shared/utils/jwtUtil.ts:26-28`; `F1 src/shared/middleware/errorHandler.ts:34-43`) |

Não há 429 no legado (ver §5.8).

#### Transporte

- `Set-Cookie: <COOKIE_NAME>=<jwt>; Max-Age=<COOKIE_MAX_AGE convertido de ms para segundos>; Path=/; HttpOnly; SameSite=Lax[; Secure]`
  (`F1 src/modules/auth/auth.controller.ts:12-17,50,73`).
- `COOKIE_NAME` default `session_id` (`F1 src/configs.ts:23`). `COOKIE_MAX_AGE` é derivado de
  `JWT_EXPIRES_IN` (default `1d`) por `jwtExpiryToMs`, que lê o último caractere como unidade `d`/`h`/`m`
  e, na ausência dessas, trata o valor como segundos (`F1 src/configs.ts:17,22,28-35`). O valor de `Config.COOKIE_MAX_AGE` está em milissegundos; o Express converte para segundos ao
  serializar. Com o default, `Max-Age=86400`.
- `httpOnly: true`, `sameSite: "lax"`, `secure: Config.NODE_ENV === "production"`
  (`F1 src/modules/auth/auth.controller.ts:12-17`). `path` e `domain` não são definidos; o Express usa
  `Path=/` e sem `Domain`. Um cookie de sessão já existente é sobrescrito pelo novo valor.
- Payload do JWT: `id`, `name`, `email`, `role`, `password_changed_at` (época em ms) e
  `scope` (`"session"` ou `"change_password"`) (`F1 src/shared/utils/jwtUtil.ts:9-20`;
  `F1 src/modules/auth/auth.controller.ts:41-48,64-71`). Assinatura com `JWT_SECRET` e
  `expiresIn: JWT_EXPIRES_IN`, sem opção de algoritmo explícita
  (`F1 src/shared/utils/jwtUtil.ts:22-31`).
- Com `scope: "change_password"`, `requireRole` recusa com
  `403 "Troca de senha obrigatória antes de continuar"` (exige `req.authScope === "session"`,
  `F1 src/shared/middleware/requireRole.ts:9-14`); com `scope: "session"` e perfil fora da lista, a
  mensagem é `403 "Acesso restrito ao perfil <perfis unidos por ' ou '>"` (`F1 src/shared/middleware/requireRole.ts:16-23`).
- Cookie `HttpOnly` exige `credentials: "include"` do cliente; o CORS responde com
  `credentials: true` (`F1 src/app.ts:11-17`).
- O corpo JSON é lido com o limite default do `express.json` (`F1 src/app.ts:26`); acima do limite, o
  erro do body-parser chega ao `errorHandler` com status 413
  (`F1 src/shared/middleware/errorHandler.ts:34-43`).

#### Evidência

- `F1 src/modules/auth/auth.router.ts:7`
- `F1 src/modules/auth/auth.controller.ts:12-17,31-85`
- `F1 src/modules/auth/auth.service.ts:22-60`
- `F1 src/modules/auth/auth.schema.ts:4-12`
- `F1 src/shared/validation/fieldSchemas.ts:20-30`
- `F1 src/shared/middleware/errorHandler.ts:11-43`

### 5.4 POST `/auth/logout`

Rota **pública**: não há `authMiddleware` e o handler não lê o cookie nem o token
(`F1 src/modules/auth/auth.router.ts:8`; `F1 src/modules/auth/auth.controller.ts:26-29`).

#### Request

| Parte   | Conteúdo                                       |
| ------- | ---------------------------------------------- |
| Path    | nenhum parâmetro; path completo `/auth/logout` |
| Query   | nenhuma                                        |
| Body    | nenhum (o handler não lê `req.body`)           |
| Headers | cookie é opcional e ignorado                   |

#### Response 2xx

Status `200`, sempre, mesmo sem cookie presente ou com token inválido/expirado
(`F1 src/modules/auth/auth.controller.ts:26-29`).

| Campo     | Tipo   | Valor                            |
| --------- | ------ | -------------------------------- |
| `message` | string | `"Sessão encerrada com sucesso"` |

```json
{ "message": "Sessão encerrada com sucesso" }
```

O handler também responde com `Set-Cookie` de expiração para `Config.COOKIE_NAME`
(`F1 src/modules/auth/auth.controller.ts:27`).

#### Erros

O handler não levanta erro próprio. Uma falha inesperada em `clearCookie`/`res.json` cai no
`errorHandler` como 500 `"Erro interno do servidor"`
(`F1 src/shared/middleware/errorHandler.ts:34-43`).

#### Transporte

- `res.clearCookie(Config.COOKIE_NAME, { httpOnly: true })` (`F1 src/modules/auth/auth.controller.ts:27`):
  o cookie de expiração repete apenas `httpOnly`; `sameSite`, `secure` e `domain` não são reenviados.
  O Express envia `Path=/` por default na limpeza.
- O logout **não revoga** o JWT: não há blacklist, tabela de sessão nem alteração de
  `password_changed_at`. Um cookie copiado antes do logout continua aceito até expirar ou até uma
  troca/reset de senha (`F1 src/shared/middleware/auth.ts:63-72`).
- Seguro repetir: qualquer número de chamadas devolve 200.

**Divergente (legado vigente):** `clearCookie` sem os demais atributos da emissão — convenção §5 de
`docs/04-API-Conventions.md` e spec de `auth`.

#### Evidência

- `F1 src/modules/auth/auth.router.ts:8`
- `F1 src/modules/auth/auth.controller.ts:26-29`
- `F1 src/shared/middleware/auth.ts:63-72`

### 5.5 GET `/auth/me`

Devolve a sessão corrente relendo o banco. Protegida por `authMiddleware`
(`F1 src/modules/auth/auth.router.ts:9`). É uma das duas rotas liberadas quando
`users.must_change_password` é verdadeiro (`F1 src/shared/middleware/auth.ts:54-61`).

#### Request

| Parte   | Conteúdo                                   |
| ------- | ------------------------------------------ |
| Path    | nenhum parâmetro; path completo `/auth/me` |
| Query   | nenhuma (ignorada se enviada)              |
| Body    | nenhum                                     |
| Headers | cookie `Config.COOKIE_NAME` obrigatório    |

Não há parâmetro de usuário: o id vem de `req.user.id`, preenchido pelo middleware a partir do JWT
(`F1 src/modules/auth/auth.controller.ts:88`; `F1 src/shared/middleware/auth.ts:77-82`).

#### Response 2xx

Status `200`; corpo `MeResponseDTO` montado a partir de `authService.getSessionUser(userId)`
(`F1 src/modules/auth/auth.controller.ts:87-101`).

| Campo                | Tipo                                                         | Origem                                   |
| -------------------- | ------------------------------------------------------------ | ---------------------------------------- |
| `id`                 | string decimal                                               | `F1 src/modules/auth/auth.service.ts:71` |
| `name`               | string                                                       | `F1 src/modules/auth/auth.service.ts:72` |
| `email`              | string                                                       | `F1 src/modules/auth/auth.service.ts:73` |
| `avatarUrl`          | string ou `null`                                             | `F1 src/modules/auth/auth.service.ts:74` |
| `role`               | `"Solicitante" \| "Analista" \| "Gestor" \| "Administrador"` | `F1 src/modules/auth/auth.service.ts:75` |
| `mustChangePassword` | boolean                                                      | `F1 src/modules/auth/auth.service.ts:76` |

```json
{
  "id": "42",
  "name": "Pessoa Analista",
  "email": "pessoa.analista@example.com",
  "avatarUrl": "/uploads/avatars/ana.png",
  "role": "Analista",
  "mustChangePassword": false
}
```

Semântica (`F1 src/modules/auth/auth.service.ts:62-79`):

- O corpo é lido **do banco**, não do JWT: `role` vem de `profiles.name` via `resolveRole`,
  `mustChangePassword` vem de `users.must_change_password` e `avatarUrl` de `users.avatar_url`.
  Mudança de perfil ou de senha pendente vale imediatamente, mesmo com cookie antigo
  (`F1 src/shared/middleware/auth.ts:74-82`).
- Usuário removido, `users.is_active = false` ou `profiles.is_active = false` no intervalo entre o
  middleware e a leitura produzem `401 "Token inválido ou expirado"`
  (`F1 src/modules/auth/auth.service.ts:66-68`).
- A rota responde normalmente com `mustChangePassword: true` e com cookie de escopo
  `change_password`; o gate de troca obrigatória não a bloqueia
  (`F1 src/shared/middleware/auth.ts:49-61`).
- Não há `Set-Cookie` na resposta de sucesso.

#### Erros

| Status | `code` | Mensagem literal                                   | Condição                                                                                                                                                                       |
| ------ | ------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 401    | —      | `"Token não fornecido"`                            | cookie ausente (`F1 src/shared/middleware/auth.ts:25-30`)                                                                                                                      |
| 401    | —      | `"Token inválido"`                                 | payload do JWT fora da forma esperada (`F1 src/shared/utils/jwtUtil.ts:42-52`)                                                                                                 |
| 401    | —      | `"Token inválido ou expirado"`                     | assinatura inválida, token expirado, `id` sem usuário, usuário ou perfil inativo (`F1 src/shared/middleware/auth.ts:33-45,87-95`; `F1 src/modules/auth/auth.service.ts:66-68`) |
| 401    | —      | `"Sua sessão foi revogada. Faça login novamente."` | `password_changed_at` do token difere do banco (`F1 src/shared/middleware/auth.ts:63-72`)                                                                                      |
| 500    | —      | `"Perfil inválido"`                                | `profiles.name` fora do mapa (`F1 src/shared/utils/roleUtils.ts:14-22`)                                                                                                        |

Não há 403 nesta rota: ela está na allowlist de `must_change_password`
(`F1 src/shared/middleware/auth.ts:54-61`).

#### Transporte

- Somente leitura: cookie de sessão, corpo JSON, sem datas no wire.
- O `id` do JWT é convertido com `Number(...)` para consultar o banco
  (`F1 src/shared/middleware/auth.ts:35`; `F1 src/modules/auth/auth.controller.ts:19-24`); depois de
  `verifyToken`, o valor não é revalidado como inteiro.

#### Evidência

- `F1 src/modules/auth/auth.router.ts:9`
- `F1 src/modules/auth/auth.controller.ts:19-24,87-101`
- `F1 src/modules/auth/auth.service.ts:62-79`
- `F1 src/shared/middleware/auth.ts:25-97`

### 5.6 PUT `/auth/change-password`

Troca a senha do próprio usuário autenticado. Protegida por `authMiddleware` e liberada mesmo com
`must_change_password` verdadeiro (`F1 src/modules/auth/auth.router.ts:10`;
`F1 src/shared/middleware/auth.ts:54-61`).

#### Request

| Parte   | Conteúdo                                                                                                                                                |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Path    | nenhum parâmetro; path completo `/auth/change-password`                                                                                                 |
| Query   | nenhuma                                                                                                                                                 |
| Body    | JSON `{ "currentPassword": string, "newPassword": string, "confirmNewPassword": string }` (`F1 src/modules/DTOs/auth/ChangePasswordRequest.dto.ts:1-5`) |
| Headers | `Content-Type: application/json`; cookie `Config.COOKIE_NAME` obrigatório                                                                               |

Regras de validação (`F1 src/modules/auth/auth.schema.ts:14-27`):

| Campo                | Regra                                                                            | Mensagem literal                                                                                        |
| -------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `currentPassword`    | `maxPasswordBytes`: string, mínimo 1, máximo 72 bytes UTF-8; sem `trim`          | `"Campo obrigatório."`, `"Máximo de 72 bytes."`                                                         |
| `newPassword`        | `passwordSchema`: string, mínimo 8 caracteres, máximo 72 bytes UTF-8; sem `trim` | `"Mínimo de 8 caracteres."`, `"Máximo de 72 bytes."` (`F1 src/shared/validation/fieldSchemas.ts:27-30`) |
| `confirmNewPassword` | string, mínimo 1                                                                 | `"Campo obrigatório."`                                                                                  |

Regras de igualdade (refinements, `F1 src/modules/auth/auth.schema.ts:20-27`):

| Regra                                                                       | Mensagem literal                              | Path do erro         |
| --------------------------------------------------------------------------- | --------------------------------------------- | -------------------- |
| `newPassword` deve ser igual a `confirmNewPassword`                         | `"As senhas não conferem."`                   | `confirmNewPassword` |
| `newPassword` deve ser diferente de `currentPassword` (comparação de texto) | `"A nova senha deve ser diferente da atual."` | `newPassword`        |

- A falha de validação usa `formatZodIssues` + `400`, apenas com `message` agregada
  (`F1 src/modules/auth/auth.controller.ts:104-108`). Exemplos:
  `"Campos inválidos: confirmNewPassword — As senhas não conferem."`,
  `"Campos inválidos: newPassword — A nova senha deve ser diferente da atual."`,
  `"Campos inválidos: newPassword — Mínimo de 8 caracteres."`.
  Campo ausente entra na outra partição do resumo: `"Campos obrigatórios ausentes: currentPassword"`.
- Não há regra de complexidade (maiúscula, dígito, símbolo) nem histórico de senhas.
- Além do Zod, o service compara a senha nova com o hash atual; se forem a mesma senha, responde
  `400 "A nova senha deve ser diferente da atual."` (`F1 src/modules/auth/auth.service.ts:102-106`).
- A senha atual é conferida por bcrypt; senha atual errada responde **401**
  `"Senha atual incorreta"` (`F1 src/modules/auth/auth.service.ts:96-100`).

#### Response 2xx

Status `200`; corpo `ChangePasswordResponseDTO` (`F1 src/modules/auth/auth.controller.ts:124-133`).

| Campo                | Tipo                                                         | Valor                   |
| -------------------- | ------------------------------------------------------------ | ----------------------- |
| `id`                 | string decimal                                               | `String(user_id)`       |
| `name`               | string                                                       | `users.full_name`       |
| `email`              | string                                                       | `users.email`           |
| `avatarUrl`          | string ou `null`                                             | `users.avatar_url`      |
| `role`               | `"Solicitante" \| "Analista" \| "Gestor" \| "Administrador"` | `profiles.name` mapeado |
| `mustChangePassword` | boolean                                                      | sempre `false`          |

```json
{
  "id": "42",
  "name": "Pessoa Analista",
  "email": "pessoa.analista@example.com",
  "avatarUrl": null,
  "role": "Analista",
  "mustChangePassword": false
}
```

O `mustChangePassword: false` é fixo no controller (`F1 src/modules/auth/auth.controller.ts:130`) e o
banco também grava `must_change_password = false` na mesma atualização
(`F1 src/modules/auth/auth.repository.ts:77-85`).

#### Erros

| Status | `code` | Mensagem literal                                                                                                                                                                                                                                                              | Condição                                                                                                                                                                                |
| ------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400    | —      | `"Campos inválidos: confirmNewPassword — As senhas não conferem."` / `"Campos inválidos: newPassword — A nova senha deve ser diferente da atual."` / `"Campos inválidos: newPassword — Mínimo de 8 caracteres."` / `"Campos inválidos: currentPassword — Campo obrigatório."` | body inválido (`F1 src/modules/auth/auth.controller.ts:104-108`)                                                                                                                        |
| 401    | —      | `"Token não fornecido"`                                                                                                                                                                                                                                                       | cookie ausente (`F1 src/shared/middleware/auth.ts:25-30`)                                                                                                                               |
| 401    | —      | `"Token inválido"` / `"Token inválido ou expirado"`                                                                                                                                                                                                                           | JWT inválido/expirado ou usuário/perfil inativo (`F1 src/shared/middleware/auth.ts:33-45,87-95`)                                                                                        |
| 401    | —      | `"Sua sessão foi revogada. Faça login novamente."`                                                                                                                                                                                                                            | `password_changed_at` do token difere do banco (`F1 src/shared/middleware/auth.ts:63-72`)                                                                                               |
| 401    | —      | `"Senha atual incorreta"`                                                                                                                                                                                                                                                     | `currentPassword` não confere com o hash (`F1 src/modules/auth/auth.service.ts:96-100`)                                                                                                 |
| 400    | —      | `"A nova senha deve ser diferente da atual."`                                                                                                                                                                                                                                 | `newPassword` corresponde ao hash atual (`F1 src/modules/auth/auth.service.ts:102-106`)                                                                                                 |
| 401    | —      | `"Token inválido ou expirado"`                                                                                                                                                                                                                                                | usuário ausente em `req.user` ou usuário/perfil desativado entre o middleware e o service (`F1 src/modules/auth/auth.controller.ts:19-24`; `F1 src/modules/auth/auth.service.ts:92-94`) |
| 404    | —      | `"Usuário não encontrado"`                                                                                                                                                                                                                                                    | linha de `users` inexistente no service ou update sem linhas (`F1 src/modules/auth/auth.service.ts:88-90`; `F1 src/modules/auth/auth.repository.ts:89-91`)                              |
| 500    | —      | `"Erro ao comparar as senhas"` / `"Erro ao gerar hash da senha"` / `"Perfil inválido"`                                                                                                                                                                                        | falha do bcrypt ou `profiles.name` fora do mapa (`F1 src/shared/utils/passwordHandler.ts:5-25`; `F1 src/shared/utils/roleUtils.ts:14-22`)                                               |
| 500    | —      | `"Erro interno do servidor"`                                                                                                                                                                                                                                                  | falha da transação/auditoria ou erro não-`AppError` (`F1 src/shared/middleware/errorHandler.ts:34-43`)                                                                                  |

O gate de troca obrigatória não incide aqui: a rota é uma das exceções de
`F1 src/shared/middleware/auth.ts:54-61`, logo não há 403 por senha pendente.

#### Transporte

- A resposta renova o cookie: `res.cookie(Config.COOKIE_NAME, sessionToken, COOKIE_OPTIONS)` com
  `scope: "session"`, `password_changed_at` igual ao novo valor do banco
  (`F1 src/modules/auth/auth.controller.ts:113-122`). Isso vale também para a troca voluntária, não só
  para a obrigatória.
- A atualização e o evento de auditoria `user.change_password` ocorrem na mesma transação
  (`changeOrigin: "user"`, `ipAddress: req.ip`); falha da auditoria desfaz a troca
  (`F1 src/modules/auth/auth.service.ts:110-125`). `src/app.ts` não configura `trust proxy`
  (`F1 src/app.ts:9-28`).
- O update grava `password_hash`, `must_change_password = false`, `password_changed_at = now()` e
  `updated_at = now()` (`F1 src/modules/auth/auth.repository.ts:77-85`).
- **Revogação:** todo token emitido antes do novo `password_changed_at` passa a falhar com
  `401 "Sua sessão foi revogada. Faça login novamente."` na próxima requisição, inclusive em outras
  abas e dispositivos (`F1 src/shared/middleware/auth.ts:63-72`). O mesmo mecanismo é usado pelo reset
  administrativo de senha, que grava `must_change_password = true` e avança `password_changed_at`
  (`F1 src/modules/users/users.repository.ts:468-483`;
  `F1 src/modules/users/users.service.ts:210-247`).
- A comparação é de igualdade exata entre o valor em ms embutido no token e
  `userState.password_changed_at.getTime()` (`F1 src/shared/middleware/auth.ts:66-69`;
  `F1 src/modules/auth/auth.service.ts:134`).

#### Evidência

- `F1 src/modules/auth/auth.router.ts:10`
- `F1 src/modules/auth/auth.controller.ts:103-134`
- `F1 src/modules/auth/auth.service.ts:81-135`
- `F1 src/modules/auth/auth.schema.ts:14-27`
- `F1 src/modules/auth/auth.repository.ts:72-94`
- `F1 src/shared/middleware/auth.ts:54-72`

### 5.7 Visão do consumidor (F2) e drift

Chamadas do frontend (`F2 src/lib/api/auth.api.ts:10-60`):

| Rota                        | Chamada F2                                      | Uso                                                                                                               |
| --------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `POST /auth/login`          | `login(credentials)` → `LoginResponse`          | formulário de login (`F2 src/lib/api/auth.api.ts:15-26`)                                                          |
| `POST /auth/logout`         | `logout()` → `unknown`                          | botão de sair; falha é ignorada (`F2 src/lib/api/auth.api.ts:28-36`; `F2 src/lib/services/auth.service.ts:27-33`) |
| `GET /auth/me`              | `getMe(fetchImpl?, sessionId?)` → `SessionUser` | hook de servidor e pós-login (`F2 src/lib/api/auth.api.ts:41-48`; `F2 src/hooks.server.ts:8-16`)                  |
| `PUT /auth/change-password` | `changePassword(payload)` → `void`              | página de troca (`F2 src/lib/api/auth.api.ts:50-60`)                                                              |

Convergências:

- `SessionUser` tem exatamente os seis campos do DTO legado, com `id: string`,
  `avatarUrl: string | null`, `role: UserType` e `mustChangePassword: boolean`
  (`F2 src/lib/types/auth.ts:8-15`). `UserType` cobre os quatro perfis legados
  (`F2 src/lib/types/user.ts:3`). Não há `permissions` no tipo nem no consumo.
- `LoginResponse` é alias de `SessionUser`, refletindo o mesmo corpo flat
  (`F2 src/lib/types/auth.ts:23-24`).
- O cliente envia `credentials: 'include'` e lê a mensagem de `body.message || body.error`, o que casa
  com o envelope legado (`F2 src/lib/api/client.ts:55-66,86-92`).
- `avatarUrl` é `string | null` nos dois lados (`F2 src/lib/types/auth.ts:12`;
  `F1 src/modules/DTOs/auth/MeResponse.dto.ts:7`); o FE resolve caminho relativo contra
  `PUBLIC_API_URL` e aceita URL absoluta, `blob:` e `data:` (`F2 src/lib/utils/api-assets.ts:4-12`).
- O fluxo de troca redireciona por `mustChangePassword` (`F2 src/lib/services/access.service.ts:129-149`)
  e chama `GET /auth/me` depois do `PUT` (`F2 src/routes/(app)/redefinir-senha/+page.svelte:69-93`),
  compatível com a releitura no banco.

Drift anotado (sem decisão):

- `changePassword` é tipado como `void` na API e como `Result<void>` no service
  (`F2 src/lib/api/auth.api.ts:50-59`; `F2 src/lib/services/auth.service.ts:53-56`), embora o backend
  devolva `200` com o DTO de sessão. O corpo é descartado pelo consumidor.
- `logout` é tipado como `unknown` e o corpo `{ message }` não é lido
  (`F2 src/lib/api/auth.api.ts:28-36`).
- O login do F2 não usa o corpo de `POST /auth/login` para decidir o destino: chama `GET /auth/me` em
  seguida e redireciona com o resultado (`F2 src/lib/components/forms/LoginForm.svelte:60-81`).
- Qualquer `ApiError` no login é convertido em `"Credenciais inválidas."` (com ponto), independente da
  mensagem do backend, que é `"Credenciais inválidas"` (sem ponto)
  (`F2 src/lib/services/auth.service.ts:20-22`; `F1 src/modules/auth/auth.service.ts:33`).
- O nome do cookie é literal `'session_id'` no hook de servidor, não lido de configuração
  (`F2 src/hooks.server.ts:6,9`), enquanto o backend aceita `COOKIE_NAME`
  (`F1 src/configs.ts:23`).
- A validação de cliente da troca exige 8 caracteres em `newPassword` e igualdade de confirmação, mas
  não verifica o limite de 72 bytes (`F2 src/routes/(app)/redefinir-senha/+page.svelte:28-47`). O login
  só exige e-mail com formato e senha não vazia (`F2 src/lib/components/forms/LoginForm.svelte:25-38`).

### 5.8 Confronto com `docs/04-API-Conventions.md`

| Item                                | Confronto                                                                                                                                                             | Ponteiro                               |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Base path `/api/v1`                 | Divergente (legado vigente): rotas em `/auth/*`, sem prefixo                                                                                                          | §1; §3.1 deste documento               |
| Envelope de erro legado             | Compatível com o envelope vigente `{ status, statusCode, message }`, sem `requestId`                                                                                  | §2.1; ADR-0005                         |
| `code` nos erros de `auth`          | Compatível com o envelope vigente, em que `code` é aditivo; nenhum erro de `auth` o define, então `unauthorized`/`forbidden` do catálogo não aparecem                 | §2.1; tabela 0.1 #2                    |
| Validação                           | Divergente (legado vigente): 400 apenas com `message` agregada, sem `code: "validation_error"` e sem `fields`                                                         | §3 (C2); tabela 0.1 #5                 |
| Sessão e cookie na emissão          | Compatível: `session_id` configurável, HttpOnly, SameSite=Lax, Secure em produção, TTL 1 dia                                                                          | §5                                     |
| Limpeza do cookie no logout         | Divergente (legado vigente): `clearCookie` só com `httpOnly`                                                                                                          | §5; spec de `auth`; §3.2               |
| `/auth/me` — DTO                    | Compatível: `name`, `email`, `mustChangePassword` e `avatarUrl (string \| null)` coincidem; a ausência de `permissions` é aceita, porque o campo é aditivo e opcional | tabela 0.1 #9; §7; ADR-0025            |
| `/auth/me` — `id`                   | Divergente (legado vigente): `id` é string decimal de `users.user_id`, não UUID                                                                                       | §7 (exemplo `"uuid"`); §15.1; ADR-0003 |
| `/auth/me` — `role`                 | Divergente (legado vigente): quatro perfis (`Solicitante`, `Analista`, `Gestor`, `Administrador`), sem `Admin Root`; `role` vem do banco a cada request               | §6; ADR-0006; ADR-0025                 |
| Rate limit de login                 | Registrado (decisão aberta): sem limite e sem 429 na rota                                                                                                             | §13; tabela 0.2 #24                    |
| Idempotência                        | Compatível: login não idempotente; logout repetível com 200                                                                                                           | §8.2                                   |
| Datas e horas                       | Compatível/não aplicável: nenhum campo de data nas respostas; `password_changed_at` só existe dentro do JWT                                                           | §10                                    |
| Idioma                              | Compatível: chaves camelCase, mensagens e valores em pt-BR                                                                                                            | §11                                    |
| 403 de senha pendente               | Compatível em status (403); a mensagem `"Troca de senha obrigatória antes de continuar"` não traz `code`                                                              | §2.3; §5                               |
| Revogação por `password_changed_at` | Compatível com a validação por requisição descrita na convenção                                                                                                       | §5                                     |

## 6. forms

O domínio `forms` **não tem superfície HTTP no legado**. O formulário de abertura de solicitação é
um conjunto fixo de blocos e chaves escrito em TypeScript: os tipos em
`F1 src/shared/types/requests.ts`, a gramática em `F1 src/modules/requests/requests.schema.ts` e o
catálogo de 33 chaves em `F1 src/shared/catalog/fieldCatalog.ts`. A única forma de o formulário
trafegar é como a parte textual `payload` do `POST /requests` (§9), e a única forma de consultá-lo é
pela leitura da própria solicitação (§9), que devolve os blocos já materializados.

Esta seção documenta a gramática desse payload e o catálogo que as pendências usam para validar
`fieldKey` e fotografar o valor atual. Nada aqui é decisão: o formulário configurável é delta
intencional e vive nos ADRs (ponteiro em §6.7).

### 6.1 Fontes

| Ref | Caminho                                                                                                    | Uso                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| F1  | `src/shared/types/requests.ts`                                                                             | tipos dos quatro blocos, `YesNoDetail`, enums de impacto e criticidade    |
| F1  | `src/modules/requests/requests.schema.ts`                                                                  | gramática Zod do `POST /requests` e reuso dos blocos no `PATCH /internal` |
| F1  | `src/shared/validation/fieldSchemas.ts`                                                                    | helpers `requiredString` / `optionalString` e mensagens de tamanho        |
| F1  | `src/shared/validation/zodErrors.ts`                                                                       | formato agregado das mensagens de validação (`400`)                       |
| F1  | `src/modules/requests/requests.controller.ts`                                                              | leitura da parte `payload`, erros de multipart e resposta `201`           |
| F1  | `src/shared/middleware/upload.ts`                                                                          | limites e mensagens do multipart                                          |
| F1  | `src/modules/requests/requests.repository.ts`                                                              | validação da categoria contra o cadastro ativo e persistência dos blocos  |
| F1  | `src/modules/requests/requests.service.ts`                                                                 | sobrescrita de identidade no modo `AUTHENTICATED`                         |
| F1  | `src/shared/catalog/fieldCatalog.ts`                                                                       | `FIELD_KEYS`, `FIELD_LABELS`, `FIELD_KEY_SET`, `getFieldSnapshot`         |
| F1  | `src/modules/pendingItems/pendingItems.schema.ts`, `pendingItems.service.ts`, `pendingItems.repository.ts` | validação de `fieldKey`, snapshot e escrita do valor corrigido            |
| F1  | `docs/solicitations-api-requests-0_4.md` §0, §1, "Tipos compartilhados", "Observações do contrato"         | contrato do formulário e do `POST /requests`                              |
| F1  | `docs/contract-pendencias_03.md` §8                                                                        | catálogo de 33 `fieldKey` e regra de marcação                             |
| F2  | `src/lib/types/request.ts`                                                                                 | tipos do consumidor, opções de select e estado das etapas                 |
| F2  | `src/lib/pendency/field-catalog.ts`                                                                        | seleção de campos marcáveis e rótulos exibidos                            |
| F2  | `src/lib/pendency/requester-field-kind.ts`                                                                 | controle por tipo de campo e conversão do valor respondido                |
| F2  | `src/lib/types/pendency.ts`                                                                                | `PendingFieldRef`, `fieldKey` e `correctedValue`                          |
| F2  | `src/lib/api/request.api.ts`                                                                               | montagem do `multipart/form-data` do `POST /requests`                     |
| F2  | `src/routes/(public)/solicitacao/components/solicitation-form/SolicitationForm.svelte`                     | conversão do estado do formulário no payload                              |

### 6.2 Superfície

Zero rotas. O legado não tem `GET /forms`, nem qualquer verbo em `/forms`: o roteador monta apenas os
routers de domínio listados em `F1 src/router.ts:16-32`, e não existe módulo `forms` em
`F1 src/modules`. A definição do formulário é código estático:

| Elemento                         | Onde vive no legado                                                       | Evidência                                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Blocos e chaves do payload       | `RequesterBlock`, `DemandBlock`, `OperationalBlock`, `ComplementaryBlock` | `F1 src/shared/types/requests.ts:76-124`                                                                  |
| Obrigatoriedade, tipos e limites | schemas Zod dos blocos                                                    | `F1 src/modules/requests/requests.schema.ts:25-78`                                                        |
| Envelope do payload              | `createRequestPayloadSchema`                                              | `F1 src/modules/requests/requests.schema.ts:90-117`                                                       |
| Catálogo de chaves marcáveis     | `FIELD_KEYS` / `FIELD_LABELS`                                             | `F1 src/shared/catalog/fieldCatalog.ts:6-80`                                                              |
| Transporte                       | parte textual `payload` do `POST /requests`                               | `F1 src/modules/requests/requests.controller.ts:120-137`; `F1 src/modules/requests/requests.router.ts:88` |
| Reuso dos blocos na edição       | `updateRequestPayloadSchema`                                              | `F1 src/modules/requests/requests.schema.ts:143-148`                                                      |

Não há endpoint de definição nem de metadados do formulário: rótulos, tipos e obrigatoriedade só
existem no código do backend e, no consumidor, em espelhos manuais (§6.6). A leitura dos valores
respondidos acontece no detalhe interno e no acompanhamento, ambos em §9.

### 6.3 Gramática do payload

#### Transporte e envelope

O corpo é `multipart/form-data` com uma parte de texto `payload` (máx. 1) e zero a cinco partes
binárias `attachments` (`F1 src/shared/middleware/upload.ts:35-38`). O controller exige que
`payload` seja string não vazia, faz `JSON.parse` e valida o objeto resultante
(`F1 src/modules/requests/requests.controller.ts:120-137`):

| Condição                                      | Status | Mensagem literal                                  | Evidência                                                                                                          |
| --------------------------------------------- | ------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| parte `payload` ausente, vazia ou não textual | 400    | `Parte 'payload' ausente no corpo da requisição.` | `F1 src/modules/requests/requests.controller.ts:121-125`                                                           |
| `payload` não é JSON válido                   | 400    | `A parte 'payload' contém um JSON inválido.`      | `F1 src/modules/requests/requests.controller.ts:127-132`                                                           |
| JSON válido mas schema inválido               | 400    | mensagem agregada (abaixo)                        | `F1 src/modules/requests/requests.controller.ts:134-137`                                                           |
| sucesso                                       | 201    | `{ protocol, status, createdAt }`                 | `F1 src/modules/requests/requests.controller.ts:143-149`; `F1 src/modules/requests/requests.repository.ts:329-333` |

O JSON tem quatro blocos, dos quais três são obrigatórios:

```jsonc
{
  "requester": {/* obrigatório */},
  "demand": {/* obrigatório */},
  "operational": {/* obrigatório */},
  "complementary": {/* opcional */},
  "schedulePreferences": ["2026-09-02T08:00"], // opcional; 1 a 3 itens
}
```

- Se o valor não for objeto, a mensagem é
  `O payload deve ser um objeto JSON com os blocos requester, demand e operational.`
  (`F1 src/modules/requests/requests.schema.ts:114-116`).
- O envelope usa `z.object` sem `.strict()`: chave desconhecida — em qualquer nível — é
  **descartada em silêncio**, não gera erro (`F1 src/modules/requests/requests.schema.ts:90-117`).
- A validação é agregada em uma única string, sem `fields`:
  `Campos obrigatórios ausentes: <paths>` e/ou `Campos inválidos: <path> — <mensagem>`,
  separados por `;` e depois por `. ` (`F1 src/shared/validation/zodErrors.ts:57-91`). Exemplo:
  `Campos inválidos: operational.operationalImpact — Impacto operacional inválido — opções: Baixo, Médio, Alto ou Crítico.`
- Tipos trocados são traduzidos por `DEFAULT_TYPE_MESSAGES`: `Deve ser um texto.`, `Deve ser um
número.`, `Deve ser um objeto.`, `Informe uma lista.` (`F1 src/shared/validation/zodErrors.ts:3-8,33-37`).

#### Bloco `requester`

Obrigatório. Todas as chaves são strings (`F1 src/shared/types/requests.ts:76-85`;
`F1 src/modules/requests/requests.schema.ts:25-32`). Strings obrigatórias passam por `trim` antes da
contagem (`F1 src/shared/validation/fieldSchemas.ts:5-10`).

| Chave               | Obrigatória | Limite | Observação                                                                                                         |
| ------------------- | ----------- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| `fullName`          | sim         | 150    | —                                                                                                                  |
| `corporateEmail`    | sim         | 254    | validado como e-mail; sem `trim`/`toLowerCase` no schema do POST (`F1 src/modules/requests/requests.schema.ts:27`) |
| `area`              | sim         | 100    | —                                                                                                                  |
| `department`        | não         | 100    | vazio após `trim` vira ausente (`F1 src/shared/validation/fieldSchemas.ts:12-18`)                                  |
| `manager`           | sim         | 150    | —                                                                                                                  |
| `additionalContact` | não         | 100    | —                                                                                                                  |

Normalização do e-mail ocorre na persistência, não na validação: `trim().toLowerCase()` em
`F1 src/modules/requests/requests.repository.ts:76,181,323`. **Desatualizado no legado:** o contrato
descreve `department` como "opcional (padrão; Admin pode tornar obrigatório)"
(`F1 docs/solicitations-api-requests-0_4.md` §"Tipos compartilhados"), mas o schema do POST o trata
sempre como opcional e não há caminho de configuração que o torne obrigatório
(`F1 src/modules/requests/requests.schema.ts:29`).

#### Bloco `demand`

Obrigatório, oito chaves obrigatórias (`F1 src/shared/types/requests.ts:87-98`;
`F1 src/modules/requests/requests.schema.ts:34-43`).

| Chave            | Obrigatória | Limite | Observação                                           |
| ---------------- | ----------- | ------ | ---------------------------------------------------- |
| `title`          | sim         | 150    | —                                                    |
| `requestType`    | sim         | 80     | texto livre no backend; nenhum enum é validado       |
| `category`       | sim         | 80     | nome validado contra o cadastro ativo (§"Categoria") |
| `processName`    | sim         | 150    | —                                                    |
| `description`    | sim         | 4.000  | —                                                    |
| `problem`        | sim         | 4.000  | —                                                    |
| `expectedResult` | sim         | 4.000  | —                                                    |
| `justification`  | sim         | 4.000  | —                                                    |

`demand.category` viaja **dentro de `demand`**, não no topo do payload
(`F1 src/modules/requests/requests.schema.ts:37`). **Desatualizado no legado:** a assinatura do
contrato tipa `category: RequestCategory` com as 10 opções base
(`F1 docs/solicitations-api-requests-0_4.md` §"Tipos compartilhados"), enquanto o schema aceita
qualquer string de até 80 caracteres e a lista efetiva é a das categorias ativas do banco — o
próprio documento registra, em outro trecho, que novas categorias chegam como string livre.

#### Bloco `operational`

Obrigatório, 14 chaves obrigatórias (`F1 src/shared/types/requests.ts:100-116`;
`F1 src/modules/requests/requests.schema.ts:45-70`).

| Chave                  | Tipo              | Limite / regra                           | Mensagem específica                                                                                                                           |
| ---------------------- | ----------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `processDescription`   | string            | 4.000                                    | padrão                                                                                                                                        |
| `processSteps`         | string            | 4.000                                    | padrão                                                                                                                                        |
| `systemsUsed`          | string            | 255                                      | padrão                                                                                                                                        |
| `executionFrequency`   | string            | 50                                       | padrão; texto livre                                                                                                                           |
| `volumetry`            | string            | 100                                      | padrão                                                                                                                                        |
| `peopleInvolved`       | number            | inteiro, `> 0`                           | `Deve ser um número inteiro.`; `Deve ser maior que zero.`                                                                                     |
| `averageExecutionTime` | string            | 60                                       | padrão                                                                                                                                        |
| `monthlyEffortHours`   | number            | `>= 0` e `<= 99999999.99`                | `Não pode ser negativo.`; `Máximo de 99.999.999,99.`                                                                                          |
| `hasManualControls`    | `false` ou string | `false`; ou texto não vazio de até 1.000 | `Responda com 'false' (Não) ou informe o detalhamento em texto (máx. 1.000 caracteres).`; `Campo obrigatório.`; `Máximo de 1.000 caracteres.` |
| `mainRisks`            | string            | 2.000                                    | padrão                                                                                                                                        |
| `clientImpact`         | string            | 2.000                                    | padrão                                                                                                                                        |
| `operationalImpact`    | enum              | `Baixo`, `Médio`, `Alto`, `Crítico`      | `Impacto operacional inválido — opções: Baixo, Médio, Alto ou Crítico.`                                                                       |
| `desiredDeadline`      | string            | `AAAA-MM-DD`                             | `Data inválida — use o formato AAAA-MM-DD.`                                                                                                   |
| `perceivedCriticality` | enum              | `Baixa`, `Média`, `Alta`, `Crítica`      | `Criticidade inválida — opções: Baixa, Média, Alta ou Crítica.`                                                                               |

- `hasManualControls` é uma união de `false` literal e string
  (`F1 src/modules/requests/requests.schema.ts:15-23`): o detalhamento **é** a resposta "Sim"; não
  existe `true` nem "Sim" sem texto.
- O POST **não** exige prazo futuro: `desiredDeadline` valida a data ISO, sem regra de "hoje ou
  futura" (`F1 src/modules/requests/requests.schema.ts:66`). A regra "hoje ou futura" existe apenas no
  `PATCH /requests/:protocol/internal` (`F1 src/modules/requests/requests.schema.ts:128-137`).
- `peopleInvolved` e `monthlyEffortHours` chegam como número JSON, não como string
  (`F1 src/modules/requests/requests.controller.ts:129`).

#### Bloco `complementary`

Opcional por inteiro (`F1 src/shared/types/requests.ts:118-124`;
`F1 src/modules/requests/requests.schema.ts:72-78`). Se omitido, todas as flags são gravadas como
`NULL` (`F1 src/modules/requests/requests.repository.ts:43-53,231-239`).

| Chave                     | Obrigatória | Regra                         | Mensagem específica                |
| ------------------------- | ----------- | ----------------------------- | ---------------------------------- |
| `hasProcessDocumentation` | não         | `false` ou texto de até 1.000 | mesma união de `hasManualControls` |
| `hasSimilarSolution`      | não         | idem                          | idem                               |
| `dependsOnOtherAreas`     | não         | idem                          | idem                               |
| `handlesRestrictedInfo`   | não         | idem                          | idem                               |
| `additionalNotes`         | não         | string de até 2.000           | padrão                             |

Cada chave `YesNoDetail` aceita exatamente dois formatos: `false` ("Não") ou string não vazia após
`trim` ("Sim" + detalhamento) (`F1 src/shared/types/requests.ts:56`;
`F1 src/modules/requests/requests.schema.ts:15-23`).

#### `schedulePreferences`

Opcional; quando presente, é lista de strings `AAAA-MM-DDTHH:MM`
(`F1 src/modules/requests/requests.schema.ts:96-112`).

| Regra                                                                               | Mensagem literal                                     |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------- |
| formato `^\d{4}-(0[1-9]\|1[0-2])-(0[1-9]\|[12]\d\|3[01])T([01]\d\|2[0-3]):[0-5]\d$` | `Horário inválido — use o formato AAAA-MM-DDTHH:MM.` |
| data/hora precisa existir no calendário (dia válido, hora `<= 23`, minuto `<= 59`)  | `Horário inexistente no calendário.`                 |
| mínimo de 1 item (lista vazia falha)                                                | `Selecione pelo menos 1 opção de horário.`           |
| máximo de 3 itens                                                                   | `Máximo de 3 opções de horário.`                     |
| sem duplicatas                                                                      | `Horários duplicados não são permitidos.`            |

Os horários são gravados em `request_time_preferences` (`scheduled_for`) e não passam pelo catálogo
de 33 chaves (`F1 src/modules/requests/requests.repository.ts:258-273`).

#### Regras condicionais e normalizações

- **Identidade no modo `AUTHENTICATED`:** `fullName` e `corporateEmail` continuam obrigatórios na
  validação, mas são **sobrescritos** pela identidade do cadastro antes da persistência
  (`F1 src/modules/requests/requests.service.ts:105-139`). O guard de modo roda antes do multipart
  (`F1 src/modules/requests/requests.router.ts:88`); o contrato registra a mesma regra em
  `F1 docs/solicitations-api-requests-0_4.md` §0.
- **`trim`:** strings obrigatórias e opcionais são aparadas antes de medir; só espaços em campo
  obrigatório resulta em `Campo obrigatório.` (`F1 src/shared/validation/fieldSchemas.ts:5-18`).
- **Vazios opcionais:** `department`, `additionalContact` e `additionalNotes` com `""` depois do
  `trim` tornam-se ausentes (`F1 src/shared/validation/fieldSchemas.ts:12-18`;
  `F1 src/modules/requests/requests.schema.ts:77`).
- **Sem máscara:** o backend não aplica máscara de telefone, documento ou data; `additionalContact`
  é texto livre limitado a 100 caracteres e os limites são apenas de tamanho
  (`F1 src/modules/requests/requests.schema.ts:31`;
  `F1 src/shared/validation/fieldSchemas.ts:12-18`).
- **Flags Sim/Não na persistência:** string → flag `true` + coluna de detalhe; `false` → flag
  `false` + detalhe `NULL`; ausente → ambos `NULL`
  (`F1 src/modules/requests/requests.repository.ts:43-53`).
- **Categoria:** resolvida para `category_id` na mesma transação; nome inexistente entre as
  categorias `active` interrompe a criação com
  `Categoria inválida — selecione uma opção da lista.` (`400`)
  (`F1 src/modules/requests/requests.repository.ts:55-61,300-311`).
- **Não verificado:** o conjunto aceito de `demand.category` depende dos dados de `categories`;
  o código não fixa a lista.
- **Status inicial:** a criação grava `Solicitação enviada` e devolve esse nome no `201`
  (`F1 src/modules/requests/requests.repository.ts:36,312,329-333`).

#### Enumerações e vocabulários aceitos

| Campo                                          | Valores aceitos na validação              | Evidência                                                      |
| ---------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------- |
| `operational.operationalImpact`                | `Baixo` \| `Médio` \| `Alto` \| `Crítico` | `F1 src/modules/requests/requests.schema.ts:63-65`             |
| `operational.perceivedCriticality`             | `Baixa` \| `Média` \| `Alta` \| `Crítica` | `F1 src/modules/requests/requests.schema.ts:67-69`             |
| `demand.requestType`                           | qualquer string não vazia de até 80       | `F1 src/modules/requests/requests.schema.ts:36`                |
| `operational.executionFrequency`               | qualquer string não vazia de até 50       | `F1 src/modules/requests/requests.schema.ts:49`                |
| `demand.category`                              | nome de categoria `active` no cadastro    | `F1 src/modules/requests/requests.repository.ts:55-61,306-309` |
| `hasManualControls` e flags de `complementary` | `false` ou string não vazia de até 1.000  | `F1 src/modules/requests/requests.schema.ts:15-23`             |

As unions `RequestCategory`, `OperationalImpact` e `RequestPriority` em
`F1 src/shared/types/requests.ts:29-31,54-68` são referência de tipo, não allowlist de runtime: só os dois
enums de impacto/criticidade e a categoria (via banco) são validados.

#### Limites de transporte do formulário

| Parte                           | Limite no legado              | Erro                                                                                             | Evidência                                              |
| ------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `payload` (texto)               | 2 MiB por campo (`fieldSize`) | 400 com fallback `Erro ao processar o upload dos anexos.` — `LIMIT_FIELD_VALUE` não está no mapa | `F1 src/shared/middleware/upload.ts:15,22,42-46,54-60` |
| `attachments`                   | 5 arquivos                    | 400 `Máximo de 5 anexos por solicitação.`                                                        | `F1 src/shared/middleware/upload.ts:14,21,44`          |
| cada anexo                      | 10 MB                         | 400 `Cada anexo deve ter no máximo 10MB.`                                                        | `F1 src/shared/middleware/upload.ts:13,20,43`          |
| MIME do anexo                   | PDF, DOCX, XLSX, PNG, JPG     | 400 `Formato de arquivo não permitido. Aceitos: PDF, DOCX, XLSX, PNG e JPG.`                     | `F1 src/shared/middleware/upload.ts:5-11,24-32`        |
| parte de arquivo fora dos nomes | —                             | 400 `Parte de arquivo inesperada na requisição.`                                                 | `F1 src/shared/middleware/upload.ts:45`                |

**Desatualizado no legado:** o contrato afirma que `limits.fieldSize` fica no default "1MB"
(`F1 docs/solicitations-api-requests-0_4.md` §1, "Nota de implementação"), mas o código fixa
**2 MiB** (`F1 src/shared/middleware/upload.ts:15,22`).

O transporte completo do `POST /requests` — inclusive a coluna de autenticação e o envelope de
erro — está em §9; aqui ficam apenas as mensagens que nascem da gramática do formulário.

### 6.4 Catálogo de 33 chaves

Fonte única: `FIELD_KEYS` e `FIELD_LABELS` (`F1 src/shared/catalog/fieldCatalog.ts:6-80`). Os
rótulos abaixo são os do backend, literais; `getFieldLabel` devolve a própria chave quando ela não
está no mapa (`F1 src/shared/catalog/fieldCatalog.ts:82-84`).

| #   | Chave                                   | Label                       | Bloco         | Evidência                                     |
| --- | --------------------------------------- | --------------------------- | ------------- | --------------------------------------------- |
| 1   | `requester.fullName`                    | Nome completo               | requester     | `F1 src/shared/catalog/fieldCatalog.ts:7,47`  |
| 2   | `requester.corporateEmail`              | E-mail corporativo          | requester     | `F1 src/shared/catalog/fieldCatalog.ts:8,48`  |
| 3   | `requester.area`                        | Área                        | requester     | `F1 src/shared/catalog/fieldCatalog.ts:9,49`  |
| 4   | `requester.department`                  | Departamento                | requester     | `F1 src/shared/catalog/fieldCatalog.ts:10,50` |
| 5   | `requester.manager`                     | Gestor responsável          | requester     | `F1 src/shared/catalog/fieldCatalog.ts:11,51` |
| 6   | `requester.additionalContact`           | Contato adicional           | requester     | `F1 src/shared/catalog/fieldCatalog.ts:12,52` |
| 7   | `demand.title`                          | Título resumido             | demand        | `F1 src/shared/catalog/fieldCatalog.ts:13,53` |
| 8   | `demand.requestType`                    | Tipo de solicitação         | demand        | `F1 src/shared/catalog/fieldCatalog.ts:14,54` |
| 9   | `demand.category`                       | Categoria                   | demand        | `F1 src/shared/catalog/fieldCatalog.ts:15,55` |
| 10  | `demand.processName`                    | Nome do processo            | demand        | `F1 src/shared/catalog/fieldCatalog.ts:16,56` |
| 11  | `demand.description`                    | Descrição da necessidade    | demand        | `F1 src/shared/catalog/fieldCatalog.ts:17,57` |
| 12  | `demand.problem`                        | Problema/oportunidade       | demand        | `F1 src/shared/catalog/fieldCatalog.ts:18,58` |
| 13  | `demand.expectedResult`                 | Resultado esperado          | demand        | `F1 src/shared/catalog/fieldCatalog.ts:19,59` |
| 14  | `demand.justification`                  | Justificativa               | demand        | `F1 src/shared/catalog/fieldCatalog.ts:20,60` |
| 15  | `operational.processDescription`        | Descrição do processo atual | operational   | `F1 src/shared/catalog/fieldCatalog.ts:21,61` |
| 16  | `operational.processSteps`              | Etapas do processo          | operational   | `F1 src/shared/catalog/fieldCatalog.ts:22,62` |
| 17  | `operational.systemsUsed`               | Sistemas utilizados         | operational   | `F1 src/shared/catalog/fieldCatalog.ts:23,63` |
| 18  | `operational.executionFrequency`        | Frequência de execução      | operational   | `F1 src/shared/catalog/fieldCatalog.ts:24,64` |
| 19  | `operational.volumetry`                 | Volumetria                  | operational   | `F1 src/shared/catalog/fieldCatalog.ts:25,65` |
| 20  | `operational.peopleInvolved`            | Pessoas envolvidas          | operational   | `F1 src/shared/catalog/fieldCatalog.ts:26,66` |
| 21  | `operational.averageExecutionTime`      | Tempo médio por ciclo       | operational   | `F1 src/shared/catalog/fieldCatalog.ts:27,67` |
| 22  | `operational.monthlyEffortHours`        | Esforço mensal (horas)      | operational   | `F1 src/shared/catalog/fieldCatalog.ts:28,68` |
| 23  | `operational.hasManualControls`         | Controles manuais           | operational   | `F1 src/shared/catalog/fieldCatalog.ts:29,69` |
| 24  | `operational.mainRisks`                 | Principais riscos           | operational   | `F1 src/shared/catalog/fieldCatalog.ts:30,70` |
| 25  | `operational.clientImpact`              | Impacto no cliente          | operational   | `F1 src/shared/catalog/fieldCatalog.ts:31,71` |
| 26  | `operational.operationalImpact`         | Impacto operacional         | operational   | `F1 src/shared/catalog/fieldCatalog.ts:32,72` |
| 27  | `operational.desiredDeadline`           | Prazo desejado              | operational   | `F1 src/shared/catalog/fieldCatalog.ts:33,73` |
| 28  | `operational.perceivedCriticality`      | Criticidade percebida       | operational   | `F1 src/shared/catalog/fieldCatalog.ts:34,74` |
| 29  | `complementary.hasProcessDocumentation` | Documentação do processo    | complementary | `F1 src/shared/catalog/fieldCatalog.ts:35,75` |
| 30  | `complementary.hasSimilarSolution`      | Solução semelhante          | complementary | `F1 src/shared/catalog/fieldCatalog.ts:36,76` |
| 31  | `complementary.dependsOnOtherAreas`     | Dependência de outras áreas | complementary | `F1 src/shared/catalog/fieldCatalog.ts:37,77` |
| 32  | `complementary.handlesRestrictedInfo`   | Informação restrita (LGPD)  | complementary | `F1 src/shared/catalog/fieldCatalog.ts:38,78` |
| 33  | `complementary.additionalNotes`         | Observações adicionais      | complementary | `F1 src/shared/catalog/fieldCatalog.ts:39,79` |

Distribuição: 6 em `requester`, 8 em `demand`, 14 em `operational` e 5 em `complementary`.
`demand.category` está no bloco `demand` do payload de abertura (§6.3), e as cinco chaves
`complementary.*` pertencem a um bloco opcional. O catálogo é fechado — não inclui
`schedulePreferences` nem anexos, conforme o próprio contrato registra em
`F1 docs/contract-pendencias_03.md` §8.

### 6.5 Relação com pending-items

O formulário é insumo do lote de pendências: o analista marca chaves, o backend valida contra o
catálogo e grava o rótulo e o valor corrente como snapshot.

**Validação de `fieldKey`:**

- No schema do lote, `fieldKey` é apenas `z.string().trim().min(1)`, sem lista
  (`F1 src/modules/pendingItems/pendingItems.schema.ts:9-12`).
- A pertinência é verificada no service, contra `FIELD_KEY_SET`, depois de `trim`
  (`F1 src/modules/pendingItems/pendingItems.service.ts:25-27,114-118`). Fora do catálogo:
  400 `Campos inválidos: fieldKey — <chave> não está no catálogo`.
- `requester.fullName` e `requester.corporateEmail` só são marcáveis quando a solicitação não tem
  usuário de origem (`requester_user_id === null`); caso contrário, 400
  `Campos inválidos: fieldKey — <chave> só pode ser solicitado para solicitação pública`
  (`F1 src/modules/pendingItems/pendingItems.service.ts:125-133`).
- `comment` é obrigatório, não vazio após `trim`, até 2.000
  (`F1 src/modules/pendingItems/pendingItems.schema.ts:11`;
  `F1 src/modules/pendingItems/pendingItems.service.ts:119-124`).

**Snapshot:** na criação do item, `getFieldSnapshot(fieldKey, row)` devolve `{ label, value }`
(`F1 src/shared/catalog/fieldCatalog.ts:190-199`) e o service grava `field_label` e
`current_value: JSON.stringify(value)` (`F1 src/modules/pendingItems/pendingItems.service.ts:157-173`).
Regras de extração (`F1 src/shared/catalog/fieldCatalog.ts:95-188`):

| Chave                                                                                  | Valor corrente                                 |
| -------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `requester.fullName`, `requester.corporateEmail`, `demand.*`, `operational.*` textuais | string da coluna                               |
| `requester.area`, `requester.manager`                                                  | `""` quando a coluna é nula                    |
| `requester.department`, `requester.additionalContact`                                  | `null` quando a coluna é nula                  |
| `demand.category`                                                                      | `category`, senão `category_name`, senão `""`  |
| `operational.peopleInvolved`                                                           | número                                         |
| `operational.monthlyEffortHours`                                                       | `Number(...)`                                  |
| `operational.hasManualControls`                                                        | `null` (flag nula), `false`, ou o detalhamento |
| `operational.desiredDeadline`                                                          | `AAAA-MM-DD` (`toISOString().slice(0, 10)`)    |
| `complementary.*Detail`                                                                | `null`, `false`, ou o detalhamento             |
| `complementary.additionalNotes`                                                        | `null` ou string                               |

O snapshot é serializado em JSON e desserializado na leitura quando o valor é escalar
(`F1 src/modules/pendingItems/pendingItems.service.ts:51-73`). O rótulo exibido é o do catálogo do
backend, não o do frontend. **Desatualizado no legado:** o exemplo de `fieldLabel` em
`F1 docs/contract-pendencias_03.md` §10 usa `E-mail Corporativo`, enquanto o catálogo devolve
`E-mail corporativo` (`F1 src/shared/catalog/fieldCatalog.ts:48`).

**Correção do valor (`correctedValue`):** a revisão do lote valida por chave antes de aplicar; a tabela de regras e mensagens está em §13.5 (`F1 src/modules/pendingItems/pendingItems.service.ts:392-453`).

A revisão **não reaplica** o piso `>= 0` de `monthlyEffortHours` que o POST exige: para essa chave
só o tipo numérico é checado (`F1 src/modules/pendingItems/pendingItems.service.ts:392-401` versus
`F1 src/modules/requests/requests.schema.ts:56-59`).

`validate` escreve o valor na coluna correspondente: `requester.*` em `requesters`, `demand.*` em
`requests` (com `demand.category` resolvida de novo contra categorias ativas), `operational.*` em
`requests` e `complementary.*` nas flags + detalhe
(`F1 src/modules/pendingItems/pendingItems.repository.ts:603-742`).

### 6.6 Visão do consumidor (F2) e drift

**Envio.** O consumidor serializa o payload na parte textual `payload` e anexa os binários em
`attachments` (`F2 src/lib/api/request.api.ts:31-41`). O estado do formulário é separado dos tipos do
payload: `IdentificationData`, `DemandData`, `OperationalData` e `ComplementaryData` guardam
`YesNo` (`'Sim' | 'Não'`), detalhes em campos próprios e números como string
(`F2 src/lib/types/request.ts:151-226`).

**Conversão para o payload** (`F2 src/routes/(public)/solicitacao/components/solicitation-form/SolicitationForm.svelte:346-437`):

- aplica `trim` em todas as strings e omite `department` e `additionalContact` vazios;
- `hasManualControls`: `'Não'` vira `false`; qualquer outra escolha vira o detalhe aparado — "Sim"
  sem detalhe produz string vazia, que o backend recusa com `Campo obrigatório.`;
- as quatro flags de `complementary` usam `false` para "Não" e detalhe aparado para "Sim"; chave sem
  escolha fica fora do objeto (`toYesNoDetail`);
- `complementary` inteiro é omitido quando não há nenhuma chave preenchida;
- `schedulePreferences` só é enviado quando a lista tem itens;
- `peopleInvolved` e `monthlyEffortHours` passam por `Number(...)`;
- `category`, `requestType`, `executionFrequency`, `operationalImpact` e `perceivedCriticality`
  recebem cast para as unions de `F2 src/lib/types/request.ts:23-31`;
- no modo autenticado, a identidade enviada é a do usuário da sessão (`shouldLockIdentity`),
  coerente com a sobrescrita do backend (§6.3)
  (`F2 src/routes/(public)/solicitacao/components/solicitation-form/SolicitationForm.svelte:380-387`).

**Seleção de campos marcáveis.** `F2 src/lib/pendency/field-catalog.ts` monta as mesmas chaves do
catálogo (33 no total) em quatro blocos e envia apenas `fieldKey`
(`F2 src/lib/pendency/field-catalog.ts:32-154`; `F2 src/lib/types/pendency.ts:17-24`).
`fullName`/`corporateEmail` só entram com `includeIdentityFields`, que fica desligado por padrão
porque o detalhe interno não expõe o id de origem
(`F2 src/lib/pendency/field-catalog.ts:27-46`); na prática a UI oferece 31 chaves, enquanto o backend
aceita as 33 com a exceção de solicitação pública.

**Drift observado (sem decisão):**

| Ponto                                 | Legado (F1)                                             | Consumidor (F2)                                                                                                                                                                                                                         |
| ------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rótulos                               | catálogo do backend (`fieldCatalog.ts:46-80`)           | rótulos próprios, ex.: `Nome` vs `Nome completo`, `Título Resumido` vs `Título resumido`, `Volumetria Aproximada` vs `Volumetria`, `Tempo Médio de Execução` vs `Tempo médio por ciclo` (`F2 src/lib/pendency/field-catalog.ts:43-149`) |
| `demand.requestType`                  | texto livre até 80                                      | union de 3 opções: `Automação`, `Melhoria`, `Manutenção` (`F2 src/lib/types/request.ts:25,296-300`)                                                                                                                                     |
| `operational.executionFrequency`      | texto livre até 50                                      | union de 4 opções: `Diária`, `Semanal`, `Mensal`, `Por Demanda` (`F2 src/lib/types/request.ts:27,302-307`)                                                                                                                              |
| `demand.category`                     | nome de categoria ativa no cadastro                     | union fixa de 10 categorias (`F2 src/lib/types/request.ts:44-54`)                                                                                                                                                                       |
| `operational.*` numéricos na correção | número (`correctedValue`); `peopleInvolved` exige `> 0` | input texto convertido; negativo é recusado no cliente, mas zero passa no cliente e só é barrado no backend para `peopleInvolved` (`F2 src/lib/pendency/requester-field-kind.ts:106-115`)                                               |
| Sim/Não na correção                   | `hasManualControls` recusa string vazia                 | "Sim" sem detalhe é aceito como string vazia (`F2 src/lib/pendency/requester-field-kind.ts:144-150`)                                                                                                                                    |

Não existe, em F2, definição de obrigatoriedade vinda do backend: a obrigatoriedade por etapa está
escrita no próprio frontend (`STEP_FIELDS` em `F2 src/lib/types/request.ts:232-261`) e repetida na
validação dos componentes. O consumidor não chama nenhuma rota de definição de formulário — não há
`GET /forms` para chamar.

**Divergente (legado vigente):** o catálogo do legado trata `demand.category` como uma das 33 chaves
marcáveis, e a pendência pode pedir sua correção. O ADR-0022 fixa a categoria como classificação
top-level, fora do formulário; o wire de abertura mantém `demand.category` por emenda de compatibilidade
(`docs/adr/0022-the-classification-picks-the-form.md`).

### 6.7 Confronto com `docs/04-API-Conventions.md`

| Convenção                                                                 | Comportamento no legado (§6)                                                | Confronto                                                                   | Ponteiro                                                           |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| §2.1 — envelope e `code`                                                  | 400 `{ status, statusCode, message }`, sem `code` e sem `requestId`         | Compatível: `code` e `requestId` são aditivos (§2.1); o legado não os envia | ADR-0005; §2.1; tabela 0.1 #2                                      |
| §3 — validação `400` + `validation_error` + `fields: [{ path, message }]` | `POST /requests` responde 400 com **uma string agregada** e nenhum `fields` | Divergente (legado vigente)                                                 | convenção §3 (C2) e tabela 0.1 #5; spec de `requests`              |
| §9 — MIME inválido → 415; arquivo acima do limite → 413                   | MIME e tamanho respondem 400, com mensagens próprias                        | Divergente (legado vigente)                                                 | convenção §9                                                       |
| §9 — parte `payload` acima de 2 MiB → 413                                 | 400 com a mensagem de fallback do multer                                    | Divergente (legado vigente)                                                 | convenção §9                                                       |
| §9 — 5 arquivos × 10 MiB, parte JSON de 2 MiB                             | mesmos limites                                                              | Compatível                                                                  | convenção §9; `F1 src/shared/middleware/upload.ts:13-22,35-38`     |
| §10 — datas puras `yyyy-mm-dd`                                            | `desiredDeadline` segue o formato                                           | Compatível                                                                  | convenção §10                                                      |
| §10 — timestamps ISO-8601 UTC                                             | `schedulePreferences` usa `AAAA-MM-DDTHH:MM`, sem fuso e sem segundos       | Divergente (legado vigente)                                                 | convenção §10; `F1 src/modules/requests/requests.schema.ts:96-104` |
| §11 — chaves EN camelCase, valores pt-BR                                  | blocos e chaves em camelCase; enums e mensagens em pt-BR                    | Compatível                                                                  | convenção §11                                                      |
| §1 — base path `/api/v1`                                                  | o transportador vive em `/requests`                                         | Divergente (legado vigente)                                                 | já registrado em §3.1 e §9                                         |
| Multipart com limites por rota                                            | limites coincidem; status divergem (acima)                                  | Divergente (legado vigente)                                                 | convenção §9; tabela 0.1 #22                                       |

Contexto de delta intencional (ponteiro, sem decisão nesta seção): ADR-0012, ADR-0019 e ADR-0022.

## 7. portal-config

Configuração global e **singleton** do portal: uma leitura pública consolidada e sete escritas
administrativas, uma por seção, com `PATCH` independente (`F1 docs/portal-config-api-0_4.md` §1–§8).
Não há criação (`POST`) nem exclusão (`DELETE`): a linha `system_settings`/`system_themes` é garantida
por migration e cada `PATCH` altera apenas a sua seção (`F1 docs/portal-config-api-0_4.md`
§Observações — "Sem `POST` de config").

### 7.1 Fontes

| Ref | Caminho                                                                                                                             | Uso                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| F1  | `src/modules/portalConfig/portalConfig.router.ts`                                                                                   | montagem das 8 rotas, guardas                           |
| F1  | `src/modules/portalConfig/portalConfig.controller.ts`                                                                               | parse, multipart, montagem de URL, respostas            |
| F1  | `src/modules/portalConfig/portalConfig.service.ts`                                                                                  | projeção do GET e regras por seção                      |
| F1  | `src/modules/portalConfig/portalConfig.repository.ts`                                                                               | leituras ordenadas, locks, upserts                      |
| F1  | `src/modules/portalConfig/portalConfig.schema.ts`                                                                                   | validação Zod das 7 seções                              |
| F1  | `src/modules/portalConfig/portalConfig.mappers.ts`                                                                                  | Aparência (contrato ↔ colunas planas) e defaults        |
| F1  | `src/shared/middleware/uploadAssets.ts`                                                                                             | multipart de `/assets`                                  |
| F1  | `src/shared/types/portalConfig.ts`                                                                                                  | tipos do contrato, allowlists, `CORE_STATUS_IDS`        |
| F1  | `src/shared/types/systemSettings.ts`, `src/shared/types/systemTheme.ts`, `src/shared/types/criteria.ts`, `src/shared/types/role.ts` | linhas de banco e ponte de critérios/perfis             |
| F1  | `src/modules/DTOs/portalConfig/PortalConfigResponse.dto.ts`, `src/modules/DTOs/portalConfig/PortalConfigRequests.dto.ts`            | DTOs das respostas e corpos                             |
| F1  | `docs/portal-config-api-0_4.md`, `docs/portal-config-endpoints.md`, `docs/portal-config-statuses-amend.md`                          | documentos do legado                                    |
| F2  | `src/lib/config/portal-config.api.ts`                                                                                               | chamadas HTTP por seção                                 |
| F2  | `src/lib/config/portal-config.service.ts`                                                                                           | sanitize de leitura/escrita, fallback e validação local |
| F2  | `src/lib/config/portal-config-load.ts`                                                                                              | flag de falha de carregamento                           |
| F2  | `src/lib/types/portal-config.ts`                                                                                                    | tipos espelhados e aliases legados                      |

Contexto transversal já fixado na §3: envelope de erro (`F1 src/shared/middleware/errorHandler.ts:9-44`),
validação (`F1 src/shared/validation/zodErrors.ts:89-117`), sessão/cookie e `requireRole`
(`F1 src/shared/middleware/auth.ts:20-95`; `F1 src/shared/middleware/requireRole.ts:9-23`). O
`requireAccessMode` lê `solicitation_mode` a cada request (`F1 src/shared/middleware/accessMode.ts:19-41`),
portanto o valor gravado por `PATCH /portal-config/access` altera o comportamento das rotas de
`/requests` no request seguinte (`F1 src/modules/requests/requests.service.ts:613`;
`F1 src/modules/pendingItems/pendingItems.service.ts:532`).

### 7.2 Rotas

| #   | Método | Path                                    | Autenticação/autorização | Handler                       | Sucesso                            | Erros                        |
| --- | ------ | --------------------------------------- | ------------------------ | ----------------------------- | ---------------------------------- | ---------------------------- |
| 5   | GET    | `/portal-config`                        | pública                  | `getConfig`                   | 200 `PortalConfig`                 | 500                          |
| 6   | PATCH  | `/portal-config/access`                 | Administrador            | `updateAccess`                | 200 `AccessSection`                | 400, 401, 403, 500           |
| 7   | PATCH  | `/portal-config/identity`               | Administrador            | `updateIdentity`              | 200 `IdentitySection`              | 400, 401, 403, 500           |
| 8   | PATCH  | `/portal-config/theme`                  | Administrador            | `updateTheme`                 | 200 `ThemeSection`                 | 400, 401, 403, 500           |
| 9   | PATCH  | `/portal-config/assets`                 | Administrador; multipart | `updateAssets`                | 200 `AssetsSection`                | 400, 401, 403, 413, 415, 500 |
| 10  | PATCH  | `/portal-config/categories`             | Administrador            | `updateCategories`            | 200 `CategoriesSection`            | 400, 401, 403, 500           |
| 11  | PATCH  | `/portal-config/statuses`               | Administrador            | `updateStatuses`              | 200 `StatusesSection`              | 400, 401, 403, 409, 500      |
| 12  | PATCH  | `/portal-config/prioritization-weights` | Administrador            | `updatePrioritizationWeights` | 200 `PrioritizationWeightsSection` | 400, 401, 403, 500           |

Montagem: o router é montado em `/portal-config` (`F1 src/router.ts:29`). O `GET "/"` é declarado
**antes** dos guardas (`F1 src/modules/portalConfig/portalConfig.router.ts:19`); em seguida
`authMiddleware` e `requireRole("Administrador")` são aplicados por `router.use`, cobrindo todos os
`PATCH` (`F1 src/modules/portalConfig/portalConfig.router.ts:22-23`).

Transporte comum das rotas JSON:

- `application/json`, sem `Content-Type` alternativo aceito; corpo lido pelo default do Express
  (`F1 src/app.ts:26`), sem limite explícito próprio.
- Datas não aparecem no payload: o contrato não expõe `created_at`/`updated_at`/`updated_by`.
- Não há `Location`, `ETag`, `x-request-id` nem `Cache-Control`.
- Toda escrita roda em transação com `lockSettings` (e `lockTheme` na Aparência) e grava auditoria
  `entityType: "settings"`, `entityId: "settings"`, `actionType: "settings.update"`
  (`F1 src/modules/portalConfig/portalConfig.service.ts:106-122,135-160,173-191,204-223,236-257,270-346,357-378`).
- **Fora do inventário:** `GET /uploads/*` é `express.static` público sobre `Config.UPLOAD_DIR` com `fallthrough: false`
  (`F1 src/app.ts:24`): serve os binários de `/assets`, é infraestrutura e **não** integra o
  inventário da §4 (mesma classificação da §3.1).

**Divergente (legado vigente):** ausência de `/api/v1` nas 8 rotas — convenção §1 de
`docs/04-API-Conventions.md`.

### 7.3 GET `/portal-config`

#### Request

sem path param, query, body ou header obrigatório. Antes dos guardas
(`F1 src/modules/portalConfig/portalConfig.router.ts:19`), portanto anônimo.

#### Response 200

`PortalConfig` (`F1 src/modules/DTOs/portalConfig/PortalConfigResponse.dto.ts:1-2`),
montado por `getPortalConfig` (`F1 src/modules/portalConfig/portalConfig.service.ts:65-96`):

| Campo                   | Tipo                            | Regra de origem                                                    |
| ----------------------- | ------------------------------- | ------------------------------------------------------------------ |
| `platformName`          | string                          | `system_settings.platform_name`                                    |
| `solicitationMode`      | `"PUBLIC"` \| `"AUTHENTICATED"` | `system_settings.solicitation_mode`                                |
| `protocolMask`          | string                          | `system_settings.protocol_mask`                                    |
| `theme`                 | `PortalTheme`                   | `system_themes` (`theme_id = 1`) via `themeFromRow`                |
| `assets`                | `PortalAssets`                  | colunas de `system_settings`; `NULL` vira `""`                     |
| `categories`            | `PortalCategory[]`              | `categories` ordenado por `display_order` asc                      |
| `statuses`              | `PortalStatus[]`                | `statuses` ordenado por `order_number` asc, **incluindo inativos** |
| `prioritizationWeights` | objeto chave→inteiro            | `criteria` com `active = true`, ordenado por `display_order` asc   |

`theme` nunca é `null`: quando a linha não existe ou a coluna está `NULL`, o valor é o default do
contrato em `DEFAULT_THEME` (`F1 src/modules/portalConfig/portalConfig.mappers.ts:36-85,146-207`), e
`backgroundLocked` com coluna `NULL` resulta `false`, não o default do seed
(`F1 src/modules/portalConfig/portalConfig.mappers.ts:175-177`). A serialização emite os 13 tokens,
depois `gradient` e depois `statuses` (`F1 src/modules/portalConfig/portalConfig.mappers.ts:181-200`);
`gradient.angle` é sempre numérico no GET (`F1 src/modules/portalConfig/portalConfig.mappers.ts:159-161`).

`assets` traz as 9 chaves, sempre string/boolean; `NULL` no banco vira string vazia
(`F1 src/modules/portalConfig/portalConfig.service.ts:31-43`).

`categories`: `description` `NULL` vira `""` e `isActive` é derivado de `status === "active"`
(`F1 src/modules/portalConfig/portalConfig.service.ts:82-87`).

`statuses`: cada item tem exatamente `id`, `name`, `isCore`, `isPublic`, `isTerminal`,
`triageMode`, `mappingMode`, `isRestricted`, `tone`, `isActive` — **sem** campo `order`
(`F1 src/shared/types/portalConfig.ts:133-144`). A ordem de exibição é a posição no array, que vem de
`statuses.order_number` (`F1 src/modules/portalConfig/portalConfig.repository.ts:56-60`);
`is_core` é projetado como `isCore` (`F1 src/modules/portalConfig/portalConfig.service.ts:46-59`).
Campos `NULL` caem em `false`, `"none"` e `isActive: true` (`F1 src/modules/portalConfig/portalConfig.service.ts:50-57`).

`prioritizationWeights`: só critérios ativos entram (`F1 src/modules/portalConfig/portalConfig.repository.ts:68-74`);
a chave vem de `CRITERION_ID_TO_KEY` e, se o `criterion_id` for desconhecido, o próprio id é usado
como chave (`F1 src/modules/portalConfig/portalConfig.service.ts:89-94`;
`F1 src/shared/types/criteria.ts:8-23`).

```json
{
  "platformName": "NEO",
  "solicitationMode": "PUBLIC",
  "protocolMask": "NEO",
  "theme": {
    "light": {
      "background": "#f0f4f8",
      "surface": "#fafafa",
      "border": "#e5e7eb",
      "textPrimary": "#3c3e47",
      "textSecondary": "#757682",
      "heading": "#00236f",
      "richBlack": "#0f1a2a",
      "primary": "#00236f",
      "secondary": "#0058be",
      "tint": "#d6e7fb",
      "onPrimary": "#ffffff",
      "onDark": "#ffffff",
      "onGradient": "#ffffff",
      "gradient": { "from": "#002068", "to": "#003399", "angle": 143 },
      "statuses": {
        "error": { "color": "#ef4444", "background": "#ef444410", "backgroundLocked": true },
        "success": { "color": "#10b981", "background": "#10b98110", "backgroundLocked": true },
        "info": { "color": "#0058be", "background": "#0058be10", "backgroundLocked": true },
        "warning": { "color": "#956006", "background": "#f59e0b10", "backgroundLocked": true },
        "neutral": { "color": "#4b5563", "background": "#e5e7eb", "backgroundLocked": true }
      }
    },
    "dark": {
      "background": "#0b0f1a",
      "surface": "#141b2e",
      "border": "#2a3346",
      "textPrimary": "#e5e7eb",
      "textSecondary": "#9aa3b2",
      "heading": "#4c7dff",
      "richBlack": "#0f1a2a",
      "primary": "#4c7dff",
      "secondary": "#5b9bff",
      "tint": "#1b2942",
      "onPrimary": "#0b0f1a",
      "onDark": "#ffffff",
      "onGradient": "#ffffff",
      "gradient": { "from": "#002068", "to": "#003399", "angle": 143 },
      "statuses": {
        "error": { "color": "#f87171", "background": "#4c0f0a", "backgroundLocked": true },
        "success": { "color": "#4ade80", "background": "#0f2e1d", "backgroundLocked": true },
        "info": { "color": "#5b9bff", "background": "#1b2942", "backgroundLocked": true },
        "warning": { "color": "#fbbf24", "background": "#4a2e0f", "backgroundLocked": true },
        "neutral": { "color": "#9aa3b2", "background": "#2a3346", "backgroundLocked": true }
      }
    }
  },
  "assets": {
    "logoLightUrl": "/uploads/portal/logo-light-00000000-0000-4000-8000-000000000000.svg",
    "logoDarkUrl": "",
    "logoUsePrimaryColor": true,
    "avatarLightUrl": "",
    "avatarDarkUrl": "",
    "loginImageLightUrl": "",
    "loginImageDarkUrl": "",
    "faviconLightUrl": "",
    "faviconDarkUrl": ""
  },
  "categories": [
    {
      "id": 1,
      "name": "Automação",
      "description": "Automação de atividades manuais",
      "isActive": true
    }
  ],
  "statuses": [
    {
      "id": 1,
      "name": "Solicitação enviada",
      "isCore": true,
      "isPublic": true,
      "isTerminal": false,
      "triageMode": "none",
      "mappingMode": "none",
      "isRestricted": false,
      "tone": "neutral",
      "isActive": true
    },
    {
      "id": 16,
      "name": "Concluído",
      "isCore": true,
      "isPublic": true,
      "isTerminal": true,
      "triageMode": "conclusion_only",
      "mappingMode": "conclusion_only",
      "isRestricted": false,
      "tone": "success",
      "isActive": true
    }
  ],
  "prioritizationWeights": {
    "operationalImpact": 10,
    "operationalRisk": 10,
    "urgency": 10,
    "volumetry": 10,
    "manualEffort": 10,
    "clientImpact": 10,
    "regulatoryDeadline": 10,
    "affectedAreas": 10,
    "strategicAlignment": 10,
    "estimatedComplexity": 10
  }
}
```

#### Erros

| Status | `code` | Mensagem                     | Condição                                                                                                                                                                                                                       |
| ------ | ------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 500    | —      | `"Erro interno do servidor"` | falha de banco; singleton `system_settings` ausente lança `Error` (`F1 src/modules/portalConfig/portalConfig.repository.ts:21-29`) e cai no ramo genérico do `errorHandler` (`F1 src/shared/middleware/errorHandler.ts:32-44`) |

O outro único erro possível é o encaminhamento de exceção não prevista pelo `errorHandler`, com a
mesma mensagem genérica para 5xx. Não há 401/403 nesta rota.

#### Transporte

JSON; resposta completa `200` (sem `201`/`204`); nenhum header de cache.

**Confronto:** `GET /portal-config` é público e devolve status inativos e
`prioritizationWeights`; o ADR-0018 separa a leitura pública da administrativa.

#### Evidência

`F1 src/modules/portalConfig/portalConfig.router.ts:19`;
`F1 src/modules/portalConfig/portalConfig.controller.ts:50-53`;
`F1 src/modules/portalConfig/portalConfig.service.ts:65-96`;
`F1 src/modules/portalConfig/portalConfig.repository.ts:21-74`.

### 7.4 PATCH `/portal-config/access`

#### Request

(`F1 src/modules/portalConfig/portalConfig.schema.ts:70-76`):

| Campo              | Tipo                            | Regra                           |
| ------------------ | ------------------------------- | ------------------------------- |
| `solicitationMode` | `"PUBLIC"` \| `"AUTHENTICATED"` | obrigatório; objeto `.strict()` |

```http
PATCH /portal-config/access HTTP/1.1
Content-Type: application/json
Cookie: session_id=<sessão de Administrador>

{ "solicitationMode": "AUTHENTICATED" }
```

#### Response 200

`AccessSection`, eco do valor gravado
(`F1 src/modules/portalConfig/portalConfig.service.ts:123`):

| Campo              | Tipo                            | Regra                |
| ------------------ | ------------------------------- | -------------------- |
| `solicitationMode` | `"PUBLIC"` \| `"AUTHENTICATED"` | mesmo valor recebido |

```json
{ "solicitationMode": "AUTHENTICATED" }
```

Efeitos: `system_settings.solicitation_mode`, `updated_by`, `updated_at`
(`F1 src/modules/portalConfig/portalConfig.repository.ts:92-102`), além do evento de auditoria com
`previousValue`/`newValue` (`F1 src/modules/portalConfig/portalConfig.service.ts:110-121`).

#### Erros

| Status | `code` | Mensagem                                                                                            | Condição                                                                                                                                               |
| ------ | ------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 400    | —      | `"Campos inválidos: solicitationMode — Modo de acesso inválido — opções: PUBLIC ou AUTHENTICATED."` | ausência **ou** valor fora da allowlist — o enum responde a mesma mensagem nos dois casos (`F1 src/modules/portalConfig/portalConfig.schema.ts:72-74`) |
| 400    | —      | `"Campos inválidos: payload — Unrecognized key: \"modo\""`                                          | chave desconhecida (objeto `.strict()`; issue sem path é rotulada `payload` — `F1 src/shared/validation/zodErrors.ts:74,89-91`)                        |
| 401    | —      | `"Token não fornecido"`                                                                             | sem cookie de sessão (`F1 src/shared/middleware/auth.ts:27-31`)                                                                                        |
| 401    | —      | `"Token inválido ou expirado"`                                                                      | token inválido/expirado, usuário inativo ou perfil inativo (`F1 src/shared/middleware/auth.ts:37-45,87-95`)                                            |
| 401    | —      | `"Sua sessão foi revogada. Faça login novamente."`                                                  | `password_changed_at` do token difere do banco (`F1 src/shared/middleware/auth.ts:63-72`)                                                              |
| 403    | —      | `"Troca de senha obrigatória antes de continuar"`                                                   | `must_change_password` (`F1 src/shared/middleware/auth.ts:58-61`)                                                                                      |
| 403    | —      | `"Acesso restrito ao perfil Administrador"`                                                         | perfil diferente de Administrador (`F1 src/shared/middleware/requireRole.ts:21-22`)                                                                    |
| 500    | —      | `"Erro interno do servidor"`                                                                        | falha não prevista                                                                                                                                     |

O 400 de validação **não** traz `code` nem `fields`: a mensagem vai agregada em `message`
(`F1 src/modules/portalConfig/portalConfig.controller.ts:60-63`;
`F1 src/shared/validation/zodErrors.ts:89-91`).

#### Transporte

JSON; resposta `200` com a seção; o cookie é o único estado de sessão.

#### Evidência

`F1 src/modules/portalConfig/portalConfig.router.ts:25`;
`F1 src/modules/portalConfig/portalConfig.controller.ts:59-67`;
`F1 src/modules/portalConfig/portalConfig.service.ts:102-125`.

### 7.5 PATCH `/portal-config/identity`

#### Request

(`F1 src/modules/portalConfig/portalConfig.schema.ts:78-100`):

| Campo          | Tipo   | Regra                                                                                                                                  |
| -------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `platformName` | string | opcional; `trim`, 1..80 — `"Campo obrigatório."`, `"Máximo de 80 caracteres."`                                                         |
| `protocolMask` | string | opcional; `trim`, `^[A-Za-z0-9]+$`, ≤ 10 — `"Máscara do protocolo deve conter apenas letras e números."`, `"Máximo de 10 caracteres."` |

O body é parcial (envie só o que muda), mas exige **ao menos um** dos dois campos; objeto `.strict()`
(`F1 src/modules/portalConfig/portalConfig.schema.ts:92-100`). `protocolMask` é apenas o bloco inicial
do protocolo (`F1 src/shared/types/portalConfig.ts:78-80`).

```http
PATCH /portal-config/identity HTTP/1.1
Content-Type: application/json
Cookie: session_id=<sessão de Administrador>

{ "platformName": "NEO" }
```

#### Response 200

`IdentitySection`, **relido** do banco após o update, portanto sempre com os dois
campos (`F1 src/modules/portalConfig/portalConfig.service.ts:146-161`):

| Campo          | Tipo   | Regra            |
| -------------- | ------ | ---------------- |
| `platformName` | string | valor persistido |
| `protocolMask` | string | valor persistido |

```json
{ "platformName": "NEO", "protocolMask": "NEO" }
```

#### Erros

| Status | `code` | Mensagem                                                                                       | Condição                                                                                                          |
| ------ | ------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 400    | —      | `"Campos inválidos: platformName — Informe ao menos um campo."`                                | body `{}` (o `refine` aponta o path `platformName` — `F1 src/modules/portalConfig/portalConfig.schema.ts:94-100`) |
| 400    | —      | `"Campos inválidos: platformName — Campo obrigatório."`                                        | `platformName` só com espaços/inválido (`F1 src/modules/portalConfig/portalConfig.schema.ts:80-84`)               |
| 400    | —      | `"Campos inválidos: protocolMask — Máscara do protocolo deve conter apenas letras e números."` | caractere fora de `[A-Za-z0-9]` (`F1 src/modules/portalConfig/portalConfig.schema.ts:86-90`)                      |
| 400    | —      | mensagem agregada do Zod em `payload`                                                          | chave desconhecida (`.strict()`)                                                                                  |
| 401    | —      | `"Token não fornecido"` / `"Token inválido ou expirado"`                                       | ausência/invalidade de sessão (`F1 src/shared/middleware/auth.ts:27-45,87-95`)                                    |
| 401    | —      | `"Sua sessão foi revogada. Faça login novamente."`                                             | `password_changed_at` do token difere do banco (`F1 src/shared/middleware/auth.ts:63-72`)                         |
| 403    | —      | `"Acesso restrito ao perfil Administrador"`                                                    | perfil diferente de Administrador (`F1 src/shared/middleware/requireRole.ts:21-22`)                               |
| 403    | —      | `"Troca de senha obrigatória antes de continuar"`                                              | `must_change_password` (`F1 src/shared/middleware/auth.ts:58-61`)                                                 |
| 500    | —      | `"Erro interno do servidor"`                                                                   | falha não prevista                                                                                                |

#### Transporte

JSON; `updated_by`/`updated_at` gravados em `system_settings`
(`F1 src/modules/portalConfig/portalConfig.repository.ts:104-117`), sem exposição no payload.

#### Evidência

`F1 src/modules/portalConfig/portalConfig.router.ts:26`;
`F1 src/modules/portalConfig/portalConfig.controller.ts:73-81`;
`F1 src/modules/portalConfig/portalConfig.service.ts:131-163`.

### 7.6 PATCH `/portal-config/theme`

#### Request

(`F1 src/modules/portalConfig/portalConfig.schema.ts:17-68`) — **atômico**: as duas variantes
completas (`light` e `dark`), sem merge por token; nas linhas abaixo, `<variante>` é `light` ou
`dark`. Objetos `.strict()` em todos os níveis.

| Campo                       | Tipo          | Regra                                                                                                                                                                                                                                                                                            |
| --------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `theme.light`               | `ThemeTokens` | obrigatório                                                                                                                                                                                                                                                                                      |
| `theme.dark`                | `ThemeTokens` | obrigatório                                                                                                                                                                                                                                                                                      |
| `<variante>.<token>`        | string hex    | os 13 `THEME_TOKEN_KEYS` obrigatórios: `background`, `surface`, `border`, `textPrimary`, `textSecondary`, `heading`, `richBlack`, `primary`, `secondary`, `tint`, `onPrimary`, `onDark`, `onGradient` (`F1 src/shared/types/portalConfig.ts:55-71`); regex `^#([0-9A-Fa-f]{6}\|[0-9A-Fa-f]{8})$` |
| `<variante>.gradient.from`  | string hex    | obrigatório                                                                                                                                                                                                                                                                                      |
| `<variante>.gradient.to`    | string hex    | obrigatório                                                                                                                                                                                                                                                                                      |
| `<variante>.gradient.angle` | inteiro       | opcional; 0..360 — `"Ângulo deve ser inteiro."`, `"Ângulo mínimo de 0."`, `"Ângulo máximo de 360."`                                                                                                                                                                                              |
| `<variante>.statuses.<tom>` | objeto        | os 5 tons `error`, `success`, `info`, `warning`, `neutral`; cada um com `color`, `background` (hex) e `backgroundLocked` (boolean)                                                                                                                                                               |

```http
PATCH /portal-config/theme HTTP/1.1
Content-Type: application/json
Cookie: session_id=<sessão de Administrador>

{ "theme": { "light": { "background": "#f0f4f8", "surface": "#fafafa", "border": "#e5e7eb",
  "textPrimary": "#3c3e47", "textSecondary": "#757682", "heading": "#00236f", "richBlack": "#0f1a2a",
  "primary": "#00236f", "secondary": "#0058be", "tint": "#d6e7fb", "onPrimary": "#ffffff",
  "onDark": "#ffffff", "onGradient": "#ffffff",
  "gradient": { "from": "#002068", "to": "#003399" },
  "statuses": {
    "error": { "color": "#ef4444", "background": "#ef444410", "backgroundLocked": true },
    "success": { "color": "#10b981", "background": "#10b98110", "backgroundLocked": true },
    "info": { "color": "#0058be", "background": "#0058be10", "backgroundLocked": true },
    "warning": { "color": "#956006", "background": "#f59e0b10", "backgroundLocked": true },
    "neutral": { "color": "#4b5563", "background": "#e5e7eb", "backgroundLocked": true } } },
  "dark": { "background": "#0b0f1a", "surface": "#141b2e", "border": "#2a3346",
  "textPrimary": "#e5e7eb", "textSecondary": "#9aa3b2", "heading": "#4c7dff", "richBlack": "#0f1a2a",
  "primary": "#4c7dff", "secondary": "#5b9bff", "tint": "#1b2942", "onPrimary": "#0b0f1a",
  "onDark": "#ffffff", "onGradient": "#ffffff",
  "gradient": { "from": "#002068", "to": "#003399" },
  "statuses": {
    "error": { "color": "#f87171", "background": "#4c0f0a", "backgroundLocked": true },
    "success": { "color": "#4ade80", "background": "#0f2e1d", "backgroundLocked": true },
    "info": { "color": "#5b9bff", "background": "#1b2942", "backgroundLocked": true },
    "warning": { "color": "#fbbf24", "background": "#4a2e0f", "backgroundLocked": true },
    "neutral": { "color": "#9aa3b2", "background": "#2a3346", "backgroundLocked": true } } } } }
```

#### Response 200

`ThemeSection`, **eco do body recebido**
(`F1 src/modules/portalConfig/portalConfig.service.ts:192`):

| Campo                       | Tipo          | Regra                        |
| --------------------------- | ------------- | ---------------------------- |
| `theme.light`, `theme.dark` | `ThemeTokens` | exatamente o que foi enviado |

O eco tem uma consequência observável: `gradient.angle` omitido **não** aparece na resposta, enquanto
o banco recebe `143` (`F1 src/modules/portalConfig/portalConfig.mappers.ts:128`) e o `GET` passa a
devolver `143` (`F1 src/modules/portalConfig/portalConfig.mappers.ts:159-161`). Um `theme.light`
válido enviado com `angle: 200` volta como `200` e é persistido como `200`.

O shape completo da Aparência está em §7.3; a resposta devolve as duas variantes completas (claro e
escuro).

#### Erros

| Status | `code` | Mensagem                                                                                        | Condição                                                                                                                                                                    |
| ------ | ------ | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400    | —      | `"Campos obrigatórios ausentes: theme.dark.background, theme.dark.surface, …"`                  | variante ausente: a mensagem lista **todas** as folhas faltantes daquela variante (erro de tipo sem valor → `missing`, `F1 src/shared/validation/zodErrors.ts:28-31,65-70`) |
| 400    | —      | `"Campos inválidos: theme.light.background — Cor inválida — use #RRGGBB ou #RRGGBBAA."`         | hex fora do formato (`F1 src/modules/portalConfig/portalConfig.schema.ts:18-20`)                                                                                            |
| 400    | —      | `"Campos inválidos: theme.light.gradient.angle — Ângulo máximo de 360."`                        | `angle > 360` (`F1 src/modules/portalConfig/portalConfig.schema.ts:26-31`)                                                                                                  |
| 400    | —      | `"Campos inválidos: theme.dark.statuses.info — Cor inválida — use #RRGGBB ou #RRGGBBAA."`       | hex inválido em um tom (`F1 src/modules/portalConfig/portalConfig.schema.ts:35-45`)                                                                                         |
| 400    | —      | `"Campos inválidos: theme.light.gradient — Deve ser um objeto."`                                | `gradient` com tipo errado (tradução de tipo em `F1 src/shared/validation/zodErrors.ts:3-8,33-37`)                                                                          |
| 400    | —      | mensagem agregada do Zod em `payload`                                                           | token/chave desconhecida (`.strict()` em todos os níveis)                                                                                                                   |
| 401    | —      | `"Token não fornecido"` / `"Token inválido ou expirado"`                                        | ausência/invalidade de sessão                                                                                                                                               |
| 403    | —      | `"Acesso restrito ao perfil Administrador"` / `"Troca de senha obrigatória antes de continuar"` | perfil ou `must_change_password`                                                                                                                                            |
| 500    | —      | `"Erro interno do servidor"`                                                                    | falha não prevista                                                                                                                                                          |

#### Transporte

JSON; `themeToColumns` grava colunas planas em `system_themes` (`theme_id = 1`) e
`updated_at`, além de `updated_by`/`updated_at` em `system_settings`
(`F1 src/modules/portalConfig/portalConfig.mappers.ts:118-139`;
`F1 src/modules/portalConfig/portalConfig.repository.ts:119-135`).

#### Evidência

`F1 src/modules/portalConfig/portalConfig.router.ts:27`;
`F1 src/modules/portalConfig/portalConfig.controller.ts:87-95`;
`F1 src/modules/portalConfig/portalConfig.service.ts:169-194`.

### 7.7 PATCH `/portal-config/assets`

#### Request

`multipart/form-data` com uma parte JSON opcional e até 8 partes de arquivo
(`F1 src/shared/middleware/uploadAssets.ts:100-110`):

| Parte                | Tipo                      | Regra                                                      |
| -------------------- | ------------------------- | ---------------------------------------------------------- |
| `assets`             | JSON (`application/json`) | 1 campo, ≤ 2 MiB (`fieldSize`); opcional quando há arquivo |
| `logoLightUrl`       | arquivo                   | 1 por chave                                                |
| `logoDarkUrl`        | arquivo                   | 1 por chave                                                |
| `avatarLightUrl`     | arquivo                   | 1 por chave                                                |
| `avatarDarkUrl`      | arquivo                   | 1 por chave                                                |
| `loginImageLightUrl` | arquivo                   | 1 por chave                                                |
| `loginImageDarkUrl`  | arquivo                   | 1 por chave                                                |
| `faviconLightUrl`    | arquivo                   | 1 por chave                                                |
| `faviconDarkUrl`     | arquivo                   | 1 por chave                                                |

Limites globais do multer: `fileSize` = 5 MiB (maior regra), `files: 8`, `fields: 1`,
`fieldSize` = 2 MiB (`F1 src/shared/middleware/uploadAssets.ts:57-67`).

Regras por chave (`ASSET_FILE_RULES` — `F1 src/shared/middleware/uploadAssets.ts:11-55`):

| Chaves                                    | MIME aceitos                                 | Extensões                        | Máx. |
| ----------------------------------------- | -------------------------------------------- | -------------------------------- | ---- |
| `logoLightUrl`, `logoDarkUrl`             | `image/png`, `image/svg+xml`                 | `.png`, `.svg`                   | 2 MB |
| `avatarLightUrl`, `avatarDarkUrl`         | `image/jpeg`, `image/png`                    | `.jpg`, `.jpeg`, `.png`          | 2 MB |
| `faviconLightUrl`, `faviconDarkUrl`       | `image/x-icon`, `image/svg+xml`, `image/png` | `.ico`, `.svg`, `.png`           | 1 MB |
| `loginImageLightUrl`, `loginImageDarkUrl` | `image/jpeg`, `image/png`, `image/webp`      | `.jpg`, `.jpeg`, `.png`, `.webp` | 5 MB |

Parte JSON (`portalAssetsPatchSchema` — `F1 src/modules/portalConfig/portalConfig.schema.ts:261-288`):
objeto `.partial().strict()` com as 8 chaves de URL (`F1 src/shared/types/portalConfig.ts:33-44`) mais
`logoUsePrimaryColor` booleano; cada URL `trim` 1..500 e precisa começar com `/` ou casar
`^https?://` (`"URL de asset deve ser relativa do app ou http(s)."`); exige ao menos uma chave
(`"Informe ao menos uma chave de asset."`).

```http
PATCH /portal-config/assets HTTP/1.1
Content-Type: multipart/form-data; boundary=----X
Cookie: session_id=<sessão de Administrador>

------X
Content-Disposition: form-data; name="assets"
Content-Type: application/json

{"logoUsePrimaryColor":true}
------X
Content-Disposition: form-data; name="logoLightUrl"; filename="logo.png"
Content-Type: image/png

<binário>
------X--
```

Ordem de processamento: `authMiddleware` → `requireRole("Administrador")` → `uploadAssetFields`
(multer) → `validateAssetSizes` → `updateAssets` (`F1 src/modules/portalConfig/portalConfig.router.ts:22-28`).
Portanto um request sem sessão recebe 401 antes de qualquer leitura de multipart.

O controller monta o patch efetivo assim (`F1 src/modules/portalConfig/portalConfig.controller.ts:106-166`):

1. `rawAssets = req.body?.assets`; `req.files` é objeto (possivelmente vazio).
2. Sem JSON e sem nenhum arquivo → 400 `"Envie ao menos uma chave de asset (JSON ou arquivo)."`.
3. JSON como string é `JSON.parse`; falha → 400 `"JSON inválido na parte \`assets\`."`.
4. JSON validado pelo schema; falha → 400 com `formatZodIssues(error, "assets")`.
5. Binários são gravados em `Config.UPLOAD_DIR/portal` com prefixo da variante
   (`ASSET_KEY_TO_URL_PATH`: `logo-light`, `logo-dark`, `avatar-light`, `avatar-dark`,
   `login-light`, `login-dark`, `favicon-light`, `favicon-dark`) e nome
   `{prefixo}-{uuid}{extensão}` (`F1 src/shared/storage/fileStorage.ts:31`), resultando em
   `/uploads/portal/{arquivo}` (`F1 src/modules/portalConfig/portalConfig.controller.ts:145-158`).
6. Merge: **binário tem precedência** sobre a URL do JSON para a mesma chave; `logoUsePrimaryColor`
   só vem do JSON (`F1 src/modules/portalConfig/portalConfig.controller.ts:161-163`).
7. Falha após gravar binário → os arquivos salvos são removidos
   (`F1 src/modules/portalConfig/portalConfig.controller.ts:167-173`).

#### Response 200

`AssetsSection`, **relido** do banco (todas as 9 chaves, inclusive as não
enviadas) (`F1 src/modules/portalConfig/portalConfig.service.ts:212-224`):

| Campo                        | Tipo    | Regra                                                |
| ---------------------------- | ------- | ---------------------------------------------------- |
| `assets.logoLightUrl`        | string  | URL relativa do app ou `http(s)`; `""` quando `NULL` |
| `assets.logoDarkUrl`         | string  | idem                                                 |
| `assets.logoUsePrimaryColor` | boolean | flag persistido                                      |
| `assets.avatarLightUrl`      | string  | idem                                                 |
| `assets.avatarDarkUrl`       | string  | idem                                                 |
| `assets.loginImageLightUrl`  | string  | idem                                                 |
| `assets.loginImageDarkUrl`   | string  | idem                                                 |
| `assets.faviconLightUrl`     | string  | idem                                                 |
| `assets.faviconDarkUrl`      | string  | idem                                                 |

```json
{
  "assets": {
    "logoLightUrl": "/uploads/portal/logo-light-00000000-0000-4000-8000-000000000000.png",
    "logoDarkUrl": "/uploads/portal/logo-dark-00000000-0000-4000-8000-000000000001.png",
    "logoUsePrimaryColor": true,
    "avatarLightUrl": "",
    "avatarDarkUrl": "",
    "loginImageLightUrl": "",
    "loginImageDarkUrl": "",
    "faviconLightUrl": "",
    "faviconDarkUrl": ""
  }
}
```

#### Erros

| Status | `code` | Mensagem                                                                                        | Condição                                                                                                                                                               |
| ------ | ------ | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400    | —      | `"Envie ao menos uma chave de asset (JSON ou arquivo)."`                                        | sem parte `assets` e sem arquivo (`F1 src/modules/portalConfig/portalConfig.controller.ts:109-111`)                                                                    |
| 400    | —      | ``"JSON inválido na parte `assets`."``                                                          | `assets` string não é JSON (`F1 src/modules/portalConfig/portalConfig.controller.ts:116-120`)                                                                          |
| 400    | —      | `"Campos inválidos: logoLightUrl — URL de asset deve ser relativa do app ou http(s)."`          | URL fora da regra (`F1 src/modules/portalConfig/portalConfig.schema.ts:261-269`; rótulo raiz `assets` em `F1 src/modules/portalConfig/portalConfig.controller.ts:123`) |
| 400    | —      | `"Campos inválidos: assets — Informe ao menos uma chave de asset."`                             | JSON `{}` (`F1 src/modules/portalConfig/portalConfig.schema.ts:285-288`)                                                                                               |
| 400    | —      | `"Máximo de 1 arquivo por chave de asset."`                                                     | `LIMIT_FILE_COUNT` (`F1 src/shared/middleware/uploadAssets.ts:112-134`)                                                                                                |
| 400    | —      | `"Parte de arquivo inesperada na requisição."`                                                  | `LIMIT_UNEXPECTED_FILE` (`F1 src/shared/middleware/uploadAssets.ts:112-134`)                                                                                           |
| 400    | —      | `"Erro ao processar o upload."`                                                                 | qualquer outro `MulterError` não mapeado — inclusive `LIMIT_FIELD_VALUE` da parte JSON acima de 2 MiB (`F1 src/shared/middleware/uploadAssets.ts:112-134`)             |
| 401    | —      | `"Token não fornecido"` / `"Token inválido ou expirado"`                                        | ausência/invalidade de sessão                                                                                                                                          |
| 403    | —      | `"Acesso restrito ao perfil Administrador"` / `"Troca de senha obrigatória antes de continuar"` | perfil ou `must_change_password`                                                                                                                                       |
| 413    | —      | `"Arquivo excede o tamanho máximo permitido para esta chave."`                                  | arquivo acima de 5 MiB (limite global `fileSize`; `F1 src/shared/middleware/uploadAssets.ts:130-134`)                                                                  |
| 413    | —      | `"Arquivo \"logo.png\" (faviconLightUrl) excede 1.0MB."`                                        | arquivo acima do máximo da chave (`F1 src/shared/middleware/uploadAssets.ts:146-166`)                                                                                  |
| 415    | —      | `"Extensão \".gif\" não permitida para logoLightUrl. Aceitas: .png, .svg."`                     | extensão fora da regra da chave (`F1 src/shared/middleware/uploadAssets.ts:75-84`)                                                                                     |
| 415    | —      | `"MIME \"image/gif\" não permitido para logoLightUrl. Aceitos: image/png, image/svg+xml."`      | MIME fora da regra da chave (`F1 src/shared/middleware/uploadAssets.ts:86-94`)                                                                                         |
| 500    | —      | `"Erro interno do servidor"`                                                                    | falha não prevista                                                                                                                                                     |

Notas de comportamento verificáveis:

- A checagem "ao menos uma chave" roda **depois** do multer: multipart vazio chega ao controller e
  recebe 400; multipart com chave de arquivo fora das 8 declaradas recebe 400
  `"Parte de arquivo inesperada na requisição."` antes disso — o `upload.fields` barra o `fieldname`
  desconhecido como `LIMIT_UNEXPECTED_FILE`, e a mensagem 415 do `fileFilter` não é alcançável por
  essa via.
- Um corpo `application/json` **plano** (chaves `logoLightUrl` etc. no topo, como nos curls de
  `F1 docs/portal-config-endpoints.md`) não define `req.body.assets` e não tem arquivos → 400
  `"Envie ao menos uma chave de asset (JSON ou arquivo)."`. Um corpo JSON com
  `{ "assets": { ... } }` é aceito, porque o controller usa o objeto quando não é string
  (`F1 src/modules/portalConfig/portalConfig.controller.ts:106-126`).
- `logoUsePrimaryColor` não pode ser alterado por binário, apenas pela parte JSON.
- Nenhum endpoint separado de upload existe; o commit do binário e da config é a mesma chamada.

#### Transporte

`multipart/form-data`; binários em `uploads/portal/`; URLs relativas
`/uploads/portal/{variante}-{uuid}.{ext}`, servidas por `express.static` público
(`F1 src/app.ts:24`; `F1 docs/portal-config-endpoints.md` §"Decisões de produto").

#### Evidência

`F1 src/modules/portalConfig/portalConfig.router.ts:28`;
`F1 src/modules/portalConfig/portalConfig.controller.ts:101-174`;
`F1 src/shared/middleware/uploadAssets.ts:11-166`;
`F1 src/modules/portalConfig/portalConfig.repository.ts:137-160`.

### 7.8 PATCH `/portal-config/categories`

#### Request

(`F1 src/modules/portalConfig/portalConfig.schema.ts:102-139`) — lista **atômica**:

| Campo                      | Tipo    | Regra                                                                     |
| -------------------------- | ------- | ------------------------------------------------------------------------- |
| `categories`               | array   | 1..50 — `"Informe ao menos uma categoria."`, `"Máximo de 50 categorias."` |
| `categories[].id`          | inteiro | positivo — `"Id deve ser inteiro."`, `"Id deve ser positivo."`            |
| `categories[].name`        | string  | `trim` 1..40 — `"Campo obrigatório."`, `"Máximo de 40 caracteres."`       |
| `categories[].description` | string  | obrigatório no PATCH, ≤ 200 — `"Máximo de 200 caracteres."`               |
| `categories[].isActive`    | boolean | obrigatório                                                               |

Regras de conjunto: nomes únicos ignorando caixa/espaços —
`"Nomes de categorias devem ser únicos (ignora maiúsculas/minúsculas)."` — e ao menos uma categoria
ativa — `"Ao menos uma categoria deve estar ativa."`
(`F1 src/modules/portalConfig/portalConfig.schema.ts:117-137`). Objetos `.strict()`.

```http
PATCH /portal-config/categories HTTP/1.1
Content-Type: application/json
Cookie: session_id=<sessão de Administrador>

{ "categories": [
  { "id": 1, "name": "Automação", "description": "Automação de atividades manuais", "isActive": true },
  { "id": 2, "name": "Indicador", "description": "Criação de métrica operacional", "isActive": true }
] }
```

#### Response 200

`CategoriesSection`, **eco da lista enviada**
(`F1 src/modules/portalConfig/portalConfig.service.ts:258`):

| Campo        | Tipo               | Regra                                  |
| ------------ | ------------------ | -------------------------------------- |
| `categories` | `PortalCategory[]` | mesma lista do request, na mesma ordem |

```json
{
  "categories": [
    {
      "id": 1,
      "name": "Automação",
      "description": "Automação de atividades manuais",
      "isActive": true
    },
    {
      "id": 2,
      "name": "Indicador",
      "description": "Criação de métrica operacional",
      "isActive": true
    }
  ]
}
```

Persistência (`F1 src/modules/portalConfig/portalConfig.repository.ts:166-199`): `upsert` por
`category_id`; `display_order` = posição no array (ordem de exibição); `description` vazia
vira `NULL`; categorias existentes e ativas que **não** vieram na lista passam a `inactive`; a
sequence `categories_category_id_seq` é realinhada ao maior id. Categorias omitidas não voltam na
resposta (o eco é a lista enviada) mas aparecem no `GET` seguinte com `isActive: false`.

#### Erros

| Status | `code` | Mensagem                                                                                                                             | Condição                                                                                                                 |
| ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| 400    | —      | `"Campos inválidos: categories — Informe ao menos uma categoria.; categories.categories — Ao menos uma categoria deve estar ativa."` | lista vazia: o `min(1)` e o `superRefine` disparam juntos (`F1 src/modules/portalConfig/portalConfig.schema.ts:111-137`) |
| 400    | —      | `"Campos inválidos: categories — Máximo de 50 categorias."`                                                                          | mais de 50 itens                                                                                                         |
| 400    | —      | `"Campos inválidos: categories.0.id — Id deve ser positivo."`                                                                        | `id` ≤ 0 no primeiro item                                                                                                |
| 400    | —      | `"Campos inválidos: categories.1.name — Nomes de categorias devem ser únicos (ignora maiúsculas/minúsculas)."`                       | nome repetido no segundo item                                                                                            |
| 400    | —      | `"Campos inválidos: categories.categories — Ao menos uma categoria deve estar ativa."`                                               | todas inativas (o path do `superRefine` é relativo ao array, por isso o prefixo duplicado)                               |
| 400    | —      | `"Campos inválidos: categories.0 — Unrecognized key: \"x\""`                                                                         | item/chave desconhecida (`.strict()`)                                                                                    |
| 401    | —      | `"Token não fornecido"` / `"Token inválido ou expirado"`                                                                             | ausência/invalidade de sessão                                                                                            |
| 403    | —      | `"Acesso restrito ao perfil Administrador"` / `"Troca de senha obrigatória antes de continuar"`                                      | perfil ou `must_change_password`                                                                                         |
| 500    | —      | `"Erro interno do servidor"`                                                                                                         | falha não prevista                                                                                                       |

#### Transporte

JSON; o `id` de item novo é gerado pelo cliente (maior id + 1) e aceito pelo backend
(`F1 src/shared/types/portalConfig.ts:104-112`).

#### Evidência

`F1 src/modules/portalConfig/portalConfig.router.ts:29`;
`F1 src/modules/portalConfig/portalConfig.controller.ts:180-188`;
`F1 src/modules/portalConfig/portalConfig.service.ts:232-260`.

### 7.9 PATCH `/portal-config/statuses`

#### Request

(`F1 src/modules/portalConfig/portalConfig.schema.ts:141-221`) — lista **atômica**, sem
campo `order`:

| Campo                     | Tipo                                                               | Regra                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `statuses`                | array                                                              | 1..50 — `"Informe ao menos um status."`, `"Máximo de 50 status."`                                                       |
| `statuses[].id`           | inteiro                                                            | 1..50 — `"Id deve ser inteiro."`, `"Id mínimo de 1."`, `"Id máximo de 50."`                                             |
| `statuses[].name`         | string                                                             | `trim` 1..40 — `"Campo obrigatório."`, `"Máximo de 40 caracteres."`                                                     |
| `statuses[].isCore`       | boolean                                                            | só `true` nos ids `1, 3, 4, 6, 7, 16, 17` — `"isCore só é permitido nos status de núcleo (ids 1, 3, 4, 6, 7, 16, 17)."` |
| `statuses[].isPublic`     | boolean                                                            | —                                                                                                                       |
| `statuses[].isTerminal`   | boolean                                                            | —                                                                                                                       |
| `statuses[].triageMode`   | `"none"` \| `"free"` \| `"conclusion_only"`                        | `"Modo inválido — opções: none, free ou conclusion_only."`                                                              |
| `statuses[].mappingMode`  | idem                                                               | idem                                                                                                                    |
| `statuses[].isRestricted` | boolean                                                            | `true` exige ambos os modos `none`                                                                                      |
| `statuses[].tone`         | `"error"` \| `"success"` \| `"info"` \| `"warning"` \| `"neutral"` | `"Tom inválido — opções: error, success, info, warning ou neutral."`                                                    |
| `statuses[].isActive`     | boolean                                                            | —                                                                                                                       |

Regras de conjunto (`F1 src/modules/portalConfig/portalConfig.schema.ts:165-219`):

- nomes únicos ignorando caixa/espaços — `"Nomes de status devem ser únicos (ignora maiúsculas/minúsculas)."`;
- `isCore && !isActive` → `"Os statuses núcleo não podem ser desativados."` (path `isActive`);
- `isRestricted && (triageMode !== "none" || mappingMode !== "none")` →
  `"Status restrito só aceita modos none (bloqueia triagem e mapeamento)."` (path `isRestricted`);
- ao menos um ativo → `"Ao menos um status deve estar ativo."`.

`CORE_STATUS_IDS = [1, 3, 4, 6, 7, 16, 17]` (`F1 src/shared/types/portalConfig.ts:123`). A ordem de
exibição é a **posição no array**; não existe `order` no payload (`F1 src/shared/types/portalConfig.ts:125-133`).

```http
PATCH /portal-config/statuses HTTP/1.1
Content-Type: application/json
Cookie: session_id=<sessão de Administrador>

{ "statuses": [
  { "id": 1, "name": "Solicitação enviada", "isCore": true, "isPublic": true, "isTerminal": false,
    "triageMode": "none", "mappingMode": "none", "isRestricted": false, "tone": "neutral", "isActive": true },
  { "id": 3, "name": "Em triagem", "isCore": true, "isPublic": true, "isTerminal": false,
    "triageMode": "free", "mappingMode": "none", "isRestricted": false, "tone": "info", "isActive": true }
] }
```

#### Response 200

`StatusesSection`, **eco da lista enviada**
(`F1 src/modules/portalConfig/portalConfig.service.ts:345`):

| Campo      | Tipo             | Regra                                  |
| ---------- | ---------------- | -------------------------------------- |
| `statuses` | `PortalStatus[]` | mesma lista do request, na mesma ordem |

```json
{
  "statuses": [
    {
      "id": 1,
      "name": "Solicitação enviada",
      "isCore": true,
      "isPublic": true,
      "isTerminal": false,
      "triageMode": "none",
      "mappingMode": "none",
      "isRestricted": false,
      "tone": "neutral",
      "isActive": true
    },
    {
      "id": 3,
      "name": "Em triagem",
      "isCore": true,
      "isPublic": true,
      "isTerminal": false,
      "triageMode": "free",
      "mappingMode": "none",
      "isRestricted": false,
      "tone": "info",
      "isActive": true
    }
  ]
}
```

Regra: como a lista é atômica e os sete ids de núcleo são obrigatórios, uma lista real
precisa conter `1, 3, 4, 6, 7, 16, 17` — a ausência de qualquer um responde
409 `core_status_removed` (`F1 src/modules/portalConfig/portalConfig.service.ts:288-295`).

Persistência (`F1 src/modules/portalConfig/portalConfig.repository.ts:205-260`): `upsert` por
`status_id` com `order_number` = índice no array; status existentes **não enviados** são renumerados
para depois dos enviados (preservando a ordem relativa) e ficam `is_active = false`; a sequence
`statuses_status_id_seq` é realinhada. Não há exclusão de linha.

Antes do upsert, o service valida os status de núcleo **na ordem**
`1, 3, 4, 6, 7, 16, 17` (`F1 src/modules/portalConfig/portalConfig.service.ts:278-332`):

| Status | `code`                        | Mensagem                                                                                                        | Condição                                                                                       |
| ------ | ----------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 409    | `core_status_missing`         | `"O status de núcleo com id 6 não existe. Execute a migration de status v4 antes de atualizar a configuração."` | id de núcleo ausente no banco                                                                  |
| 409    | `core_status_removed`         | `"Não é possível remover o status de núcleo \"Mapeamento agendado\" (id 6 — referenciado pelo fluxo)."`         | id de núcleo ausente da lista enviada                                                          |
| 409    | `core_status_renamed`         | `"Não é possível renomear o status de núcleo \"Mapeamento agendado\" (id 6)."`                                  | `name` diferente do persistido                                                                 |
| 409    | `core_status_forced`          | `"Não é possível redefinir o status de núcleo \"Mapeamento agendado\" como não-núcleo (id 6)."`                 | item de núcleo enviado com `isCore: false`                                                     |
| 409    | `core_status_forced_inactive` | `"Não é possível desativar o status de núcleo \"Mapeamento agendado\" (id 6)."`                                 | `isActive: false` em status de núcleo                                                          |
| 409    | `core_status_locked`          | `"Flags/modos do status de núcleo \"Mapeamento agendado\" (id 6) são imutáveis."`                               | `isPublic`, `isTerminal`, `isRestricted`, `triageMode` ou `mappingMode` divergem do persistido |

Os exemplos usam o id 6 (`Mapeamento agendado`) porque ele é o núcleo além dos seis demais; as
mensagens interpolam `existing.name` e `coreId` (`F1 src/modules/portalConfig/portalConfig.service.ts:281-331`).
A comparação de `isPublic` usa `existing.is_public ?? false` e as demais flags comparam com o valor da
linha (`F1 src/modules/portalConfig/portalConfig.service.ts:319-325`).

Não alcançável por HTTP no commit fixado: `core_status_forced_inactive` fica atrás de duas barreiras —
`isCore: true` + `isActive: false` já é 400 pelo schema (`F1 src/modules/portalConfig/portalConfig.schema.ts:194-200`)
e `isCore: false` dispara `core_status_forced` antes da checagem de `isActive`
(`F1 src/modules/portalConfig/portalConfig.service.ts:303-316`).

#### Erros

| Status | `code`          | Mensagem                                                                                                               | Condição                                                    |
| ------ | --------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 400    | —               | `"Campos inválidos: statuses — Informe ao menos um status.; statuses.statuses — Ao menos um status deve estar ativo."` | lista vazia: o `min(1)` e o `superRefine` disparam juntos   |
| 400    | —               | `"Campos inválidos: statuses.1.name — Nomes de status devem ser únicos (ignora maiúsculas/minúsculas)."`               | nome repetido no segundo item                               |
| 400    | —               | `"Campos inválidos: statuses.0.isCore — isCore só é permitido nos status de núcleo (ids 1, 3, 4, 6, 7, 16, 17)."`      | `isCore: true` em id fora da lista                          |
| 400    | —               | `"Campos inválidos: statuses.0.isRestricted — Status restrito só aceita modos none (bloqueia triagem e mapeamento)."`  | restrito com modo não `none`                                |
| 400    | —               | `"Campos inválidos: statuses.0.isActive — Os statuses núcleo não podem ser desativados."`                              | `isCore: true` com `isActive: false`                        |
| 400    | —               | `"Campos inválidos: statuses.statuses — Ao menos um status deve estar ativo."`                                         | todos inativos (path do `superRefine` relativo ao array)    |
| 400    | —               | `"Campos inválidos: statuses.0 — Unrecognized key: \"order\""`                                                         | chave desconhecida no item, inclusive `order` (`.strict()`) |
| 401    | —               | `"Token não fornecido"` / `"Token inválido ou expirado"`                                                               | ausência/invalidade de sessão                               |
| 403    | —               | `"Acesso restrito ao perfil Administrador"` / `"Troca de senha obrigatória antes de continuar"`                        | perfil ou `must_change_password`                            |
| 409    | `core_status_*` | ver tabela acima                                                                                                       | violação de status de núcleo                                |
| 500    | —               | `"Erro interno do servidor"`                                                                                           | falha não prevista                                          |

#### Transporte

JSON; os `code` de 409 são o único uso de `code` na seção (aditivo no envelope,
`F1 src/shared/middleware/errorHandler.ts:18-21`).

#### Evidência

`F1 src/modules/portalConfig/portalConfig.router.ts:30`;
`F1 src/modules/portalConfig/portalConfig.controller.ts:194-202`;
`F1 src/modules/portalConfig/portalConfig.service.ts:266-347`;
`F1 src/modules/portalConfig/portalConfig.repository.ts:205-260`.

**Desatualizado no legado:** `F1 docs/portal-config-api-0_4.md` §7 e o changelog "0_4 → v4"
declaram o campo `order` em `PortalStatus`, aliases legados normalizados pelo schema
(`normalizeStatusLegacy`) e `isCore` = ids `1,3,4,7,16,17`; no commit fixado não há `order` no tipo
nem no schema (`.strict()` rejeita a chave) e o schema de statuses não tem normalizador de aliases
(`F1 src/shared/types/portalConfig.ts:133-144`; `F1 src/modules/portalConfig/portalConfig.schema.ts:145-164`).
O conjunto de núcleo tem sete ids, incluindo `6` (`F1 src/shared/types/portalConfig.ts:123`). Os códigos de erro documentados
(`core_status_name_locked`, `core_status_order_locked`, `core_status_flag_locked`,
`restricted_status_mode_invalid`, `inactive_core_status`) também não existem: os efetivos são
`core_status_missing`, `core_status_removed`, `core_status_renamed`, `core_status_forced`,
`core_status_forced_inactive` e `core_status_locked`
(`F1 src/modules/portalConfig/portalConfig.service.ts:281-331`). `F1 docs/portal-config-endpoints.md`
§"Decisões de produto" ainda fala em "8 nomes hardcoded", resquício do
`PROTECTED_STATUS_NAMES` citado em `F1 docs/portal-config-statuses-amend.md:35`.

### 7.10 PATCH `/portal-config/prioritization-weights`

#### Request

(`F1 src/modules/portalConfig/portalConfig.schema.ts:228-253`) — **objeto atômico** com
todas as chaves de `PRIORITIZATION_CRITERIA` (`F1 src/shared/types/portalConfig.ts:147-158`):

| Campo                                       | Tipo    | Regra                                                      |
| ------------------------------------------- | ------- | ---------------------------------------------------------- |
| `prioritizationWeights`                     | objeto  | obrigatório; chaves da allowlist; cada valor inteiro 1..10 |
| `prioritizationWeights.operationalImpact`   | inteiro | 1..10                                                      |
| `prioritizationWeights.operationalRisk`     | inteiro | 1..10                                                      |
| `prioritizationWeights.urgency`             | inteiro | 1..10                                                      |
| `prioritizationWeights.volumetry`           | inteiro | 1..10                                                      |
| `prioritizationWeights.manualEffort`        | inteiro | 1..10                                                      |
| `prioritizationWeights.clientImpact`        | inteiro | 1..10                                                      |
| `prioritizationWeights.regulatoryDeadline`  | inteiro | 1..10                                                      |
| `prioritizationWeights.affectedAreas`       | inteiro | 1..10                                                      |
| `prioritizationWeights.strategicAlignment`  | inteiro | 1..10                                                      |
| `prioritizationWeights.estimatedComplexity` | inteiro | 1..10                                                      |

Mensagens por peso: `"Peso deve ser inteiro."`, `"Peso mínimo de 1."`, `"Peso máximo de 10."`
(`F1 src/modules/portalConfig/portalConfig.schema.ts:228-232`). O `z.record` com chave enum é
exaustivo: critério faltando gera uma issue `missing` por chave e chave fora da allowlist vira
`Unrecognized key` — o `superRefine` que produz `"Critérios obrigatórios ausentes: <chaves>."` e a
mensagem de enum `"Critério desconhecido."` não chegam ao wire, porque o parse base já falhou antes
(`F1 src/modules/portalConfig/portalConfig.schema.ts:234-253`). Objetos `.strict()`.

```http
PATCH /portal-config/prioritization-weights HTTP/1.1
Content-Type: application/json
Cookie: session_id=<sessão de Administrador>

{ "prioritizationWeights": {
  "operationalImpact": 8, "operationalRisk": 7, "urgency": 9, "volumetry": 5, "manualEffort": 6,
  "clientImpact": 8, "regulatoryDeadline": 10, "affectedAreas": 4, "strategicAlignment": 7,
  "estimatedComplexity": 5
} }
```

#### Response 200

`PrioritizationWeightsSection`, **eco do objeto enviado**
(`F1 src/modules/portalConfig/portalConfig.service.ts:379`):

| Campo                   | Tipo                 | Regra                                 |
| ----------------------- | -------------------- | ------------------------------------- |
| `prioritizationWeights` | objeto chave→inteiro | as 10 chaves, com os valores enviados |

```json
{
  "prioritizationWeights": {
    "operationalImpact": 8,
    "operationalRisk": 7,
    "urgency": 9,
    "volumetry": 5,
    "manualEffort": 6,
    "clientImpact": 8,
    "regulatoryDeadline": 10,
    "affectedAreas": 4,
    "strategicAlignment": 7,
    "estimatedComplexity": 5
  }
}
```

Persistência: `criteria.weight` por `criterion_id` traduzido por `CRITERION_KEY_TO_ID`
(`F1 src/shared/types/criteria.ts:8-19`; `F1 src/modules/portalConfig/portalConfig.repository.ts:266-277`).
Critérios com `active = false` não aparecem no `GET`
(`F1 src/modules/portalConfig/portalConfig.repository.ts:68-74`), mas o `PATCH` atualiza as 10
chaves sem filtrar `active` (`F1 src/modules/portalConfig/portalConfig.repository.ts:266-277`), e o
schema exige todas as 10 (`F1 src/modules/portalConfig/portalConfig.schema.ts:236-250`).

#### Erros

| Status | `code` | Mensagem                                                                                         | Condição                                                                                                     |
| ------ | ------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| 400    | —      | `"Campos obrigatórios ausentes: prioritizationWeights.urgency, prioritizationWeights.volumetry"` | chaves faltando: `z.record` com chave enum é exaustivo, então cada critério ausente vira uma issue `missing` |
| 400    | —      | `"Campos inválidos: prioritizationWeights — Unrecognized key: \"foo\""`                          | chave fora da allowlist (o `z.record` reporta a chave no path do objeto)                                     |
| 400    | —      | `"Campos inválidos: prioritizationWeights.urgency — Peso máximo de 10."`                         | peso acima de 10                                                                                             |
| 400    | —      | `"Campos inválidos: prioritizationWeights.operationalImpact — Peso deve ser inteiro."`           | valor fracionário                                                                                            |
| 400    | —      | mensagem agregada do Zod em `payload`                                                            | chave desconhecida no nível do objeto (`.strict()`)                                                          |
| 401    | —      | `"Token não fornecido"` / `"Token inválido ou expirado"`                                         | ausência/invalidade de sessão                                                                                |
| 403    | —      | `"Acesso restrito ao perfil Administrador"` / `"Troca de senha obrigatória antes de continuar"`  | perfil ou `must_change_password`                                                                             |
| 500    | —      | `"Erro interno do servidor"`                                                                     | falha não prevista                                                                                           |

O schema rejeita pesos `< 1` mesmo o `CHECK` de banco aceitando `0`
(`F1 src/modules/portalConfig/portalConfig.schema.ts:10-15`; `F1 docs/portal-config-endpoints.md`
§"Decisões de produto").

#### Transporte

JSON; sem paginação; no máximo 10 chaves.

#### Evidência

`F1 src/modules/portalConfig/portalConfig.router.ts:31`;
`F1 src/modules/portalConfig/portalConfig.controller.ts:208-222`;
`F1 src/modules/portalConfig/portalConfig.service.ts:353-381`.

### 7.11 Visão do consumidor (F2) e drift

Leitura: `hooks.server.ts` carrega a config em todas as rotas via `loadPortalConfig`
(`F2 src/hooks.server.ts:18`; `F2 src/lib/config/portal-config.service.ts:75-83`), que chama
`fetchPortalConfig` → `GET /portal-config` com `credentials: "include"`
(`F2 src/lib/config/portal-config.api.ts:28-35`; `F2 src/lib/api/client.ts:55-58`). Falha de rede cai
nos defaults locais sem propagar erro (`F2 src/lib/config/portal-config.service.ts:79-82`). A tela de
configurações usa `loadPortalConfigStrict`, que **não** cai em default e devolve `Result` de falha
(`F2 src/lib/config/portal-config.service.ts:89-101`; `F2 src/routes/(admin)/configuracoes/+page.server.ts:14-18`);
nesse estado, `portalConfigLoadError` bloqueia edição e salvamento
(`F2 src/lib/config/portal-config-load.ts:18-20`).

Escrita: uma função por seção, `PATCH /portal-config/{access|identity|theme|assets|categories|statuses|prioritization-weights}`
(`F2 src/lib/config/portal-config.api.ts:39-132`). `assets` é o único `FormData`
(`F2 src/lib/config/portal-config.api.ts:78-102`); o cliente não define `Content-Type` quando o corpo é
`FormData` (`F2 src/lib/api/client.ts:53-61`). Erros são convertidos em `Result`, preservando a
`message` da API (`F2 src/lib/config/portal-config.service.ts:106-121`).

O consumidor mantém cópias locais do contrato, e não só tipos: `src/lib/types/portal-config.ts`
(espelho), `src/lib/config/portal-defaults.ts` (defaults), `src/lib/utils/validations.ts` (limites e
`ASSET_FILE_RULES`) e `src/lib/mocks/portal-config.mock.ts` (mock de dev).

Drift observável entre F1 e F2:

| #   | Drift                                                                                                                                                                                                                    | Evidência                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | F2 aceita aliases legados `visibility`, `closesRequest` e `isTriageExit` na leitura e os remove antes de escrever; o backend não os devolve nem os aceita (schema `.strict()`, sem normalizador)                         | `F2 src/lib/types/portal-config.ts:151-166`; `F2 src/lib/config/portal-config.service.ts:459-484`; `F1 src/modules/portalConfig/portalConfig.schema.ts:145-164` |
| 2   | F2 aceita `blob:` na sanitize de URL de asset (preview de dev); o backend rejeita qualquer esquema que não seja `/…` ou `http(s)`                                                                                        | `F2 src/lib/config/portal-config.service.ts:382-391`; `F1 src/modules/portalConfig/portalConfig.schema.ts:261-269`                                              |
| 3   | F2 declara `statuses` antes de `gradient` em `ThemeTokens`; o backend serializa `gradient` antes de `statuses`. A ordem de chaves é comparada por `JSON.stringify` no rascunho dos cards                                 | `F2 src/lib/types/portal-config.ts:127-130`; `F1 src/modules/portalConfig/portalConfig.mappers.ts:181-200`; `F2 src/lib/config/portal-config.service.ts:66-71`  |
| 4   | F2 sanitiza categorias/status e **descarta** itens inválidos antes do `PATCH`; a lista enviada pode ser menor que a da tela, e o backend inativa os ids omitidos                                                         | `F2 src/lib/config/portal-config.service.ts:397-426,434-512`; `F1 src/modules/portalConfig/portalConfig.repository.ts:188-194,238-255`                          |
| 5   | F2 trata `isActive` ausente como `true` na leitura (`item.isActive !== false`); o backend sempre envia o boolean da coluna                                                                                               | `F2 src/lib/config/portal-config.service.ts:452`; `F1 src/modules/portalConfig/portalConfig.service.ts:57`                                                      |
| 6   | F2 reproduz literalmente o 400 do backend quando não há parte alguma no `PATCH assets` e evita enviar multipart vazio                                                                                                    | `F2 src/lib/config/portal-config.api.ts:83-85`; `F1 src/modules/portalConfig/portalConfig.controller.ts:109-111`                                                |
| 7   | F2 valida tipo/tamanho de arquivo localmente com regras e mensagens próprias (`"Arquivo excede o tamanho máximo permitido."`, `"Tipo de arquivo não permitido para este asset."`), diferentes das do backend             | `F2 src/lib/config/portal-config.service.ts:163-179`; `F2 src/lib/utils/validations.ts:59-77`; `F1 src/shared/middleware/uploadAssets.ts:112-166`               |
| 8   | O mock de F2 devolve `URL.createObjectURL` (`blob:`) para arquivo enviado e não reproduz o multipart; o backend devolve `/uploads/portal/…` e exige multipart                                                            | `F2 src/lib/mocks/portal-config.mock.ts:126-130`; `F1 src/modules/portalConfig/portalConfig.controller.ts:154-158`                                              |
| 9   | O mock de F2 usa mensagens que não existem no backend (`"Modo de solicitação inválido."`, `"Informe ao menos um campo da identidade."`, `"Nome da plataforma deve ter entre 1 e 80 caracteres (após remover espaços)."`) | `F2 src/lib/mocks/portal-config.mock.ts:86-104`; `F1 src/modules/portalConfig/portalConfig.schema.ts:70-100`                                                    |
| 10  | F2 não tem `order` em `PortalStatus` e não o envia: a ordem é a do array, igual ao backend                                                                                                                               | `F2 src/lib/types/portal-config.ts:142-161`; `F1 src/shared/types/portalConfig.ts:125-144`                                                                      |

Não há em F2 rotas alternativas para leitura: o consumidor usa exatamente as 8 rotas desta seção.

### 7.12 Confronto com `docs/04-API-Conventions.md`

| Assunto                              | Confronto                                                                                                                                                                            | Ponteiro                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Base path das 8 rotas                | Divergente (legado vigente): `/portal-config` e `/portal-config/*`, sem `/api/v1`                                                                                                    | convenção §1; `F1 src/router.ts:29`                                                          |
| Envelope de erro                     | Compatível com o envelope legado de `{ status, statusCode, message }`                                                                                                                | convenção §2.1; `F1 src/shared/middleware/errorHandler.ts:11-31`                             |
| Erro de validação das 7 seções       | Divergente (legado vigente): 400 com mensagem agregada, sem `code` e sem `fields`                                                                                                    | convenção §3 (C2) e tabela 0.1 #5; `F1 src/shared/validation/zodErrors.ts:89-91`             |
| `code` em 409 de statuses            | Compatível com o uso aditivo de `code` snake_case de domínio                                                                                                                         | convenção §2.3 e §11; `F1 src/modules/portalConfig/portalConfig.service.ts:281-331`          |
| Autorização dos `PATCH`              | Divergente (legado vigente): perfil `Administrador` via `requireRole`, não capability key                                                                                            | convenção §6; ADR-0025; ADR-0006; `F1 src/modules/portalConfig/portalConfig.router.ts:22-23` |
| `id` numérico de status no wire      | Divergente (legado vigente): `statuses[].id` inteiro 1..50 é a referência; a convenção pede `key` varchar e nenhum id numérico de status no wire                                     | tabela 0.1 #18 e §15.1; ADR-0021; `F1 src/shared/types/portalConfig.ts:133-144`              |
| Chaves de JSON                       | Compatível: camelCase em inglês, valores de domínio em pt-BR                                                                                                                         | convenção §11; `F1 src/shared/types/portalConfig.ts:1-11`                                    |
| Corpo JSON                           | Divergente (legado vigente): `express.json()` sem limite explícito (default do Express), sem `JSON_BODY_MAX_BYTES` de 1 MiB                                                          | convenção §9; `F1 src/app.ts:26`                                                             |
| `PATCH /assets` — limites            | Compatível: 8 arquivos, favicon 1 MiB, logo/avatar 2 MiB, imagem de login 5 MiB, parte JSON de 2 MiB                                                                                 | convenção §9; `F1 src/shared/middleware/uploadAssets.ts:11-67`                               |
| `PATCH /assets` — erros de multipart | Divergente (legado vigente): parte JSON acima de 2 MiB responde **400** `"Erro ao processar o upload."` em vez de 413; a ausência de `code` nos 413/415 é compatível (aditivo, §2.1) | convenção §9; `F1 src/shared/middleware/uploadAssets.ts:112-134`                             |
| Códigos de sucesso                   | Compatível: `200` em leitura e em todas as atualizações                                                                                                                              | tabela 0.1 #20 e §15.4                                                                       |
| Paginação                            | não aplicável: a config é singleton e as listas (`categories`, `statuses`) são atômicas, sem envelope paginado                                                                       | convenção §4.3; `F1 docs/portal-config-api-0_4.md` §6–§7                                     |
| Datas no payload                     | Compatível por ausência: a config não expõe timestamps                                                                                                                               | convenção §10; `F1 src/modules/DTOs/portalConfig/PortalConfigResponse.dto.ts:1-12`           |
| Request-id                           | Divergente (legado vigente): sem header `x-request-id`; o `requestId` do envelope é aditivo (§2.1)                                                                                   | convenção §12 e tabela 0.1 #15; `F1 src/shared/middleware/errorHandler.ts:11-31`             |

## 8. users

O domínio `users` cobre o diretório de analistas, o self-service "Meus dados" e a gestão administrativa de
contas: listagem, criação, consulta, atualização, ativação/desativação e reset de senha. Nenhuma rota do
domínio emite `code` no erro; o envelope é o da §3.3, acrescido de `fields` apenas no `422`
de criação/atualização administrativa.

### 8.1 Fontes

| Ref | Arquivo                                                                              | Uso                                                                                  |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| F1  | `src/modules/users/users.router.ts`                                                  | montagem, separação entre autenticação e autorização                                 |
| F1  | `src/modules/users/users.controller.ts`                                              | parsing de request, validação, status de sucesso                                     |
| F1  | `src/modules/users/users.service.ts`                                                 | regras de self-service, hierarquia de contas, avatar, auditoria                      |
| F1  | `src/modules/users/users.repository.ts`                                              | queries, paginação, extensões 1:1, métricas                                          |
| F1  | `src/modules/users/users.schema.ts`                                                  | schemas Zod de criação, listagem, status e atualização                               |
| F1  | `src/modules/DTOs/users/UpdateProfileRequest.dto.ts`                                 | schema estrito do `payload` de `PUT /users/me`                                       |
| F1  | `src/modules/DTOs/users/{UserRequests,UserResponse,UserProfileResponse}.dto.ts`      | contratos TypeScript de entrada e saída                                              |
| F1  | `src/shared/middleware/uploadAvatar.ts`                                              | multipart do avatar (limites, MIME, erros)                                           |
| F1  | `src/shared/middleware/auth.ts`, `src/shared/middleware/requireRole.ts`              | sessão e gate administrativo                                                         |
| F1  | `src/shared/types/{user,role}.ts`, `src/shared/utils/{roleUtils,passwordHandler}.ts` | tipos e geração de senha temporária                                                  |
| F1  | `src/shared/validation/fieldSchemas.ts`, `src/shared/validation/zodErrors.ts`        | limites, charset e formato do erro de validação                                      |
| F1  | `docs/users-api-profile-0_1.md`                                                      | contrato do legado para "Meus dados" (`GET`/`PUT /users/me`, `GET`/`PUT /users/:id`) |
| F1  | `docs/users-api-metrics-0_1.md`                                                      | contrato do legado para `GET /users/metrics`                                         |
| F1  | `docs/contract-assign-action.md`                                                     | contrato do legado para `GET /users/analysts`                                        |
| F2  | `src/lib/api/user.api.ts`                                                            | chamadas do consumidor                                                               |
| F2  | `src/lib/types/user.ts`                                                              | tipagem do consumidor                                                                |
| F2  | `src/lib/types/request.ts`                                                           | `PaginatedResponse<T>` consumido pela listagem                                       |

### 8.2 Rotas

| #   | Método | Path                        | Autenticação/autorização                                    | Handler             | Sucesso                              | Erros                             | Evidência                                 |
| --- | ------ | --------------------------- | ----------------------------------------------------------- | ------------------- | ------------------------------------ | --------------------------------- | ----------------------------------------- |
| 13  | GET    | `/users/analysts`           | sessão (qualquer sessão autenticada, inclusive Solicitante) | `listAnalysts`      | 200 `AssignAnalyst[]`                | 401, 403, 500                     | `F1 src/modules/users/users.router.ts:23` |
| 14  | GET    | `/users/me`                 | sessão                                                      | `getMyProfile`      | 200 `UserProfileResponseDTO`         | 401, 403, 404                     | `F1 src/modules/users/users.router.ts:26` |
| 15  | PUT    | `/users/me`                 | sessão; multipart                                           | `updateMyProfile`   | 200 `UserProfileResponseDTO`         | 400, 401, 403, 404, 413, 415, 500 | `F1 src/modules/users/users.router.ts:29` |
| 16  | GET    | `/users/metrics`            | Administrador                                               | `getUserMetrics`    | 200 `UserMetricsResponse`            | 401, 403, 500                     | `F1 src/modules/users/users.router.ts:32` |
| 17  | GET    | `/users`                    | Administrador                                               | `listUsers`         | 200 `PaginatedResponse<UserSummary>` | 400, 401, 403, 500                | `F1 src/modules/users/users.router.ts:33` |
| 18  | POST   | `/users`                    | Administrador                                               | `createUser`        | 201 `CreateUserResponse`             | 400, 401, 403, 409, 422, 500      | `F1 src/modules/users/users.router.ts:34` |
| 19  | GET    | `/users/:id`                | Administrador                                               | `getUser`           | 200 `UserProfileResponseDTO`         | 401, 403, 404, 500                | `F1 src/modules/users/users.router.ts:35` |
| 20  | PUT    | `/users/:id`                | Administrador                                               | `updateUser`        | 200 `UserProfileResponseDTO`         | 400, 401, 403, 404, 409, 422, 500 | `F1 src/modules/users/users.router.ts:36` |
| 21  | PATCH  | `/users/:id/status`         | Administrador                                               | `changeUserStatus`  | 200 `ChangeUserStatusResponse`       | 400, 401, 403, 404, 500           | `F1 src/modules/users/users.router.ts:37` |
| 22  | POST   | `/users/:id/reset-password` | Administrador                                               | `resetUserPassword` | 200 `ResetPasswordResponse`          | 400, 401, 403, 404, 500           | `F1 src/modules/users/users.router.ts:38` |

**Split de autenticação/autorização.** As duas primeiras rotas (`/analysts` e `GET /me`) declaram
`authMiddleware` individualmente e ficam **antes** do gate administrativo
(`F1 src/modules/users/users.router.ts:23-26`). Em seguida o router aplica `authMiddleware` no nível do
router (linha 28), declara `PUT /me` (linha 29) e só então aplica `requireRole("Administrador")` (linha
30), que vale para as sete rotas seguintes (linhas 32-38). O efeito é: `analysts`, `GET /me` e `PUT /me`
exigem apenas sessão autenticada, inclusive `Solicitante`; `metrics`, `GET/POST /users` e todas as rotas
com `/:id` exigem `Administrador` (`F1 src/shared/middleware/requireRole.ts:9-23`).

Erros comuns a todas as rotas do domínio (além dos erros específicos de cada subseção):

| Status | code | Mensagem literal                                   | Condição                                                                               | Evidência                                                                                        |
| ------ | ---- | -------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 401    | —    | `"Token não fornecido"`                            | sem cookie de sessão                                                                   | `F1 src/shared/middleware/auth.ts:27-29`                                                         |
| 401    | —    | `"Token inválido ou expirado"`                     | token inválido/expirado, usuário ou perfil inativo, ou `req.user.id` não inteiro       | `F1 src/shared/middleware/auth.ts:37-45,87-95`; `F1 src/modules/users/users.controller.ts:14-23` |
| 401    | —    | `"Sua sessão foi revogada. Faça login novamente."` | `password_changed_at` do token difere do banco                                         | `F1 src/shared/middleware/auth.ts:63-72`                                                         |
| 403    | —    | `"Troca de senha obrigatória antes de continuar"`  | sessão com `must_change_password = true` (exceto `/auth/change-password` e `/auth/me`) | `F1 src/shared/middleware/auth.ts:49-61`                                                         |
| 403    | —    | `"Acesso restrito ao perfil Administrador"`        | perfil diferente de `Administrador` nas rotas administrativas                          | `F1 src/shared/middleware/requireRole.ts:16-22`                                                  |
| 500    | —    | `"Erro interno do servidor"`                       | falha não prevista (mensagem genérica do `errorHandler`)                               | `F1 src/shared/middleware/errorHandler.ts:39-43`                                                 |

**Divergente (legado vigente):** paths sem o prefixo `/api/v1` — convenção §1 de
`docs/04-API-Conventions.md`.

### 8.3 GET `/users/analysts`

#### Request

sem query, sem body. O router registra explicitamente "sem query, sem paginação"
(`F1 src/modules/users/users.router.ts:20-22`). `search` e `category` são filtrados no frontend
(`F1 docs/contract-assign-action.md` §GET /users/analysts).

#### Response 200

lista direta (sem envelope) de `AssignAnalyst`:

| Campo         | Tipo           | Regra                                                                                                                                                             |
| ------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | string         | `user_id` convertido para string (`F1 src/modules/users/users.repository.ts:560`)                                                                                 |
| `fullName`    | string         | `users.full_name`                                                                                                                                                 |
| `email`       | string         | `users.email`                                                                                                                                                     |
| `specialty`   | string         | `details_professional.job_title`, ou `""` quando nulo (`F1 src/modules/users/users.repository.ts:563`)                                                            |
| `categories`  | string[]       | nomes das categorias ativas cujos ids estão em `attended_category_ids`; ids sem categoria ativa são omitidos (`F1 src/modules/users/users.repository.ts:522-557`) |
| `notes`       | string \| null | `details_professional.notes`                                                                                                                                      |
| `requestLoad` | number \| null | `COUNT(*)` ao vivo de `requests` por `professional_id`; `null` quando o analista não tem extensão (`F1 src/modules/users/users.repository.ts:530-545,566-568`)    |

```json
[
  {
    "id": "20",
    "fullName": "Usuário Exemplo",
    "email": "usuario.exemplo@example.com",
    "specialty": "Especialista em processos",
    "categories": ["Automação", "Apoio técnico"],
    "notes": null,
    "requestLoad": 4
  }
]
```

Filtro aplicado na query: `profiles.name = "analista"`, `profiles.is_active = true`, `users.is_active = true`
e (`details_professional.status = "active"` **ou** extensão inexistente); ordenação por
`users.full_name` ascendente (`F1 src/modules/users/users.repository.ts:502-518`). Analista sem linha em
`details_professional` aparece na lista com `specialty: ""`, `categories: []`, `notes: null` e
`requestLoad: null`.

#### Erros

| Status | `code` | Mensagem literal                                         | Condição               | Evidência                                        |
| ------ | ------ | -------------------------------------------------------- | ---------------------- | ------------------------------------------------ |
| 401    | —      | `"Token não fornecido"` / `"Token inválido ou expirado"` | sessão                 | §8.2                                             |
| 403    | —      | `"Troca de senha obrigatória antes de continuar"`        | `must_change_password` | §8.2                                             |
| 500    | —      | `"Erro interno do servidor"`                             | falha não prevista     | `F1 src/modules/users/users.controller.ts:31-34` |

Não há `400`, `403` de perfil nem `404` nesta rota
(`F1 src/modules/users/users.controller.ts:31-34`).

#### Transporte

JSON; array sem paginação, sem `page`/`pageSize` e sem `total`. Cookie de sessão.

#### Evidência

`F1 src/modules/users/users.router.ts:20-23`; `F1 src/modules/users/users.controller.ts:31-34`;
`F1 src/modules/users/users.service.ts:79-81`; `F1 src/modules/users/users.repository.ts:495-571`;
`F1 src/modules/DTOs/users/UserResponse.dto.ts:15-23`.

**Desatualizado no legado:** `F1 docs/contract-assign-action.md` §GET /users/analysts descreve
`Analyst extends UserSummary` com `profile`, `isActive`, `mustChangePassword` e `createdAt`; o código
devolve somente `id`, `fullName`, `email`, `specialty`, `categories`, `notes` e `requestLoad`
(`F1 src/modules/DTOs/users/UserResponse.dto.ts:15-23`). O mesmo documento afirma que `listUsers` aceita
`category` na query; o schema de listagem não tem esse parâmetro (`F1 src/modules/users/users.schema.ts:59-79`).

### 8.4 GET `/users/me`

#### Request

sem path param, sem query, sem body. Exige cookie de sessão; o id vem de `req.user.id`
(`F1 src/modules/users/users.controller.ts:112-116,14-23`).

#### Response 200

`UserProfileResponseDTO`:

| Campo          | Tipo           | Regra                                                                                                                                                                       |
| -------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | string         | `user_id` como string (`F1 src/modules/users/users.service.ts:297`)                                                                                                         |
| `fullName`     | string         | `users.full_name`                                                                                                                                                           |
| `email`        | string         | `users.email` (não editável no self-service; `PUT /users/:id` aceita alteração)                                                                                             |
| `role`         | Role           | nome legível do perfil: `Solicitante`, `Analista`, `Gestor` ou `Administrador` (`F1 src/shared/utils/roleUtils.ts:5-21`)                                                    |
| `avatarUrl`    | string \| null | caminho relativo `/uploads/avatars/<storageKey>` gravado em `users.avatar_url` (`F1 src/modules/users/users.service.ts:427-432`), ou `null`                                 |
| `requester`    | objeto \| null | `{ area, department, manager, additionalContact }`, todos `string \| null`; `null` quando não há linha em `requesters` (`F1 src/modules/users/users.repository.ts:223-230`) |
| `professional` | objeto \| null | `{ jobTitle, specialties[], attendedCategoryIds[], notes }`; ver regra de default abaixo (`F1 src/modules/users/users.service.ts:265-275,291-294`)                          |

`professional` é `null` para perfis que não são `analista`. Para `analista` **sem** linha em
`details_professional`, o bloco vem preenchido com `jobTitle: null`, `specialties: []`,
`attendedCategoryIds: []`, `notes: null` (`F1 src/modules/users/users.service.ts:287-294`).
`specialties` é lido de texto separado por `", "` e `attendedCategoryIds` de texto separado por `","`
(`F1 src/modules/users/users.repository.ts:231-240`).

```json
{
  "id": "42",
  "fullName": "Usuário Exemplo",
  "email": "usuario.exemplo@example.com",
  "role": "Analista",
  "avatarUrl": null,
  "requester": {
    "area": "Tecnologia",
    "department": "Infraestrutura",
    "manager": "Gestor Exemplo",
    "additionalContact": null
  },
  "professional": {
    "jobTitle": "Especialista em processos",
    "specialties": ["Automação"],
    "attendedCategoryIds": [1, 3],
    "notes": null
  }
}
```

#### Erros

| Status | code | Mensagem literal                                         | Condição                                                                                            |
| ------ | ---- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 401    | —    | `"Token não fornecido"` / `"Token inválido ou expirado"` | §8.2                                                                                                |
| 403    | —    | `"Troca de senha obrigatória antes de continuar"`        | senha temporária pendente                                                                           |
| 404    | —    | `"Usuário não encontrado"`                               | sessão válida sem linha correspondente em `users` (`F1 src/modules/users/users.service.ts:281-285`) |

#### Transporte

JSON; `avatarUrl` é URL relativa ao host e o arquivo é servido publicamente por
`express.static` em `/uploads` (`F1 src/app.ts:24`). Datas não aparecem nesta resposta.

#### Evidência

`F1 src/modules/users/users.router.ts:25-26`; `F1 src/modules/users/users.controller.ts:108-116`;
`F1 src/modules/users/users.service.ts:277-305`; `F1 src/modules/users/users.repository.ts:200-242`;
`F1 src/modules/DTOs/users/UserProfileResponse.dto.ts:3-28`.

**Desatualizado no legado:** `F1 docs/users-api-profile-0_1.md` §0 afirma que `GET /users/me` e
`PUT /users/me` "respeitam `system_settings.solicitation_mode`" (`PUBLIC`/`AUTHENTICATED`); no código as
duas rotas só aplicam `authMiddleware`, sem middleware de modo de acesso
(`F1 src/modules/users/users.router.ts:23-29`). Na §1, o mesmo documento diz que o bloco
`professional` só existe quando há linha em `details_professional` e, na frase seguinte, que
analistas legados sem linha recebem o bloco com defaults; o código segue a segunda frase
(`F1 src/modules/users/users.service.ts:291-294`).

### 8.5 PUT `/users/me`

#### Request

`multipart/form-data`, sem path param e sem query.

| Parte     | Obrigatória | Tipo    | Regra                                                                                          |
| --------- | ----------- | ------- | ---------------------------------------------------------------------------------------------- |
| `payload` | sim         | texto   | JSON de `UpdateProfilePayload` (`F1 src/modules/DTOs/users/UpdateProfileRequest.dto.ts:47-53`) |
| `avatar`  | não         | binário | 1 arquivo; imagem JPEG/PNG; 2 MB (`F1 src/shared/middleware/uploadAvatar.ts:14-29,61`)         |

O `payload` precisa chegar como string não vazia; caso contrário → `400 "Parte 'payload' ausente no
corpo da requisição."`; JSON inválido → `400 "A parte 'payload' contém um JSON inválido."`
(`F1 src/modules/users/users.controller.ts:124-136`). O controller não exige multipart: com
`application/json`, o `express.json` (`F1 src/app.ts:26`) popula `req.body.payload` e o corpo
`{ "payload": "{...}" }` funciona sem arquivo; com multipart, `payload` é a parte texto e `avatar` o
arquivo opcional. O `400` ocorre quando a parte está ausente, vazia ou não é string.

Campos aceitos no `payload` (schema estrito; chave desconhecida é recusada):

| Campo                         | Tipo           | Regra                                                                                                                                                   |
| ----------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fullName`                    | string         | `requiredText(150)`: `trim`, 1..150 e apenas letras e espaços — `"Campo obrigatório."`, `"Máximo de 150 caracteres."`, `"Use apenas letras e espaços."` |
| `requester.additionalContact` | string \| null | `trim`, até 100; `""` vira `null`; `null` limpa                                                                                                         |
| `requester.area`              | string         | `requiredText(100)`; aceito no self-service apenas para o próprio `Administrador`                                                                       |
| `requester.department`        | string \| null | `optionalText(100)` ou `null`; mesma restrição de perfil                                                                                                |
| `requester.manager`           | string         | `requiredText(150)`; mesma restrição de perfil                                                                                                          |
| `removeAvatar`                | boolean        | `true` remove a foto atual                                                                                                                              |

Os limites e o charset vêm de `F1 src/shared/validation/fieldSchemas.ts:5-10,32-57`; o bloco `requester`
do self-service é `strict` (`F1 src/modules/DTOs/users/UpdateProfileRequest.dto.ts:15-22`) e o objeto
raiz também (`:47-53`). `email`, `role` e `professional` são recusados no `payload` — o exemplo de
recusa do legado é `400` com a mensagem `Campos inválidos: professional — Unrecognized key: "professional"`
(`F1 docs/users-api-profile-0_1.md` §2).

**Regras de autorização e efeito:**

- `area`, `department` ou `manager` enviados por perfil diferente de `Administrador` → `403 "Área,
departamento e gestor só podem ser alterados por administrador. Use PUT /users/:id."`, checado antes
  do schema no controller (`F1 src/modules/users/users.controller.ts:138-160`) e novamente no service
  com o perfil persistido no banco (`F1 src/modules/users/users.service.ts:360-372`).
- `removeAvatar: true` junto com arquivo `avatar` → `400 "Envie 'removeAvatar' ou 'avatar', não ambos."`
  (`F1 src/modules/users/users.service.ts:329-334`).
- `fullName` atualiza `users.full_name` e sincroniza `requesters.full_name`/`corporate_email`
  (`F1 src/modules/users/users.service.ts:351-358`).
- O bloco `requester` faz merge parcial: campo ausente preserva o valor; linha inexistente é criada e
  linha anônima com o mesmo e-mail corporativo é adotada (`F1 src/modules/users/users.repository.ts:597-664`).
- Avatar novo substitui o anterior (arquivo antigo removido best-effort); `removeAvatar` apaga o arquivo
  e grava `users.avatar_url = null` (`F1 src/modules/users/users.service.ts:390-401,435-441`;
  `F1 src/modules/users/users.repository.ts:342-357`).
- Tudo ocorre em uma transação com auditoria `user.update_profile` e `changeOrigin: "self"`
  (`F1 src/modules/users/users.service.ts:350-417`); a resposta é o perfil relido por `getMyProfile`
  (`:419`).

#### Response 200

mesmo `UserProfileResponseDTO` da §8.4 (campos `id`, `fullName`, `email`, `role`,
`avatarUrl`, `requester`, `professional`), já com os valores atualizados:

```json
{
  "id": "17",
  "fullName": "Usuário Exemplo Atualizado",
  "email": "usuario.exemplo@example.com",
  "role": "Solicitante",
  "avatarUrl": "/uploads/avatars/<storageKey>.jpg",
  "requester": {
    "area": "Recursos Humanos",
    "department": "Folha de Pagamento",
    "manager": "Gestor Exemplo",
    "additionalContact": "ramal 1234"
  },
  "professional": null
}
```

#### Erros

| Status | code | Mensagem literal                                                                                    | Condição                                                                                                                                                                    |
| ------ | ---- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400    | —    | `"Parte 'payload' ausente no corpo da requisição."`                                                 | parte ausente, vazia ou não textual (qualquer content-type)                                                                                                                 |
| 400    | —    | `"A parte 'payload' contém um JSON inválido."`                                                      | `JSON.parse` falha                                                                                                                                                          |
| 400    | —    | `"Envie 'removeAvatar' ou 'avatar', não ambos."`                                                    | remoção e upload na mesma requisição                                                                                                                                        |
| 400    | —    | mensagem agregada do Zod (ex.: `Campos inválidos: professional — Unrecognized key: "professional"`) | schema estrito/limites (`F1 src/modules/users/users.controller.ts:162-165`)                                                                                                 |
| 401    | —    | `"Token não fornecido"` / `"Token inválido ou expirado"`                                            | §8.2                                                                                                                                                                        |
| 403    | —    | `"Troca de senha obrigatória antes de continuar"`                                                   | senha temporária pendente                                                                                                                                                   |
| 403    | —    | `"Área, departamento e gestor só podem ser alterados por administrador. Use PUT /users/:id."`       | perfil não administrador envia campo administrativo                                                                                                                         |
| 403    | —    | `"Você não pode editar o perfil de outro usuário"`                                                  | actor diferente do dono — guarda do service (`F1 src/modules/users/users.service.ts:324-327`); a rota sempre usa o próprio id, então a condição não é alcançável pela borda |
| 404    | —    | `"Usuário não encontrado"`                                                                          | dono da sessão sem linha em `users` (`F1 src/modules/users/users.service.ts:336-339`)                                                                                       |
| 413    | —    | `"A foto de perfil deve ter no máximo 2MB."`                                                        | `LIMIT_FILE_SIZE` (`F1 src/shared/middleware/uploadAvatar.ts:63-79`)                                                                                                        |
| 415    | —    | `Extensão "<ext>" não permitida para avatar. Aceitas: .jpg, .jpeg, .png.`                           | extensão fora da allowlist (`:36-45`)                                                                                                                                       |
| 415    | —    | `MIME "<mime>" não permitido para avatar. Aceitos: image/jpeg, image/png.`                          | MIME fora da allowlist (`:47-55`)                                                                                                                                           |
| 400    | —    | `"Máximo de 1 arquivo por requisição."`                                                             | `LIMIT_FILE_COUNT` (`:64-67,76-79`)                                                                                                                                         |
| 400    | —    | `"Parte de arquivo inesperada na requisição."`                                                      | `LIMIT_UNEXPECTED_FILE` (`:66,76-79`)                                                                                                                                       |
| 400    | —    | `"Erro ao processar o upload."`                                                                     | demais `MulterError` sem tradução, inclusive `LIMIT_FIELD_SIZE` da parte `payload` (`:76-79`)                                                                               |
| 500    | —    | `"Falha ao salvar o avatar"`                                                                        | `saveFiles` não devolve anexo (`F1 src/modules/users/users.service.ts:427-431`)                                                                                             |

#### Transporte

multipart com `multer.memoryStorage()`; limites `fileSize` 2 MB, `files: 1`, `fields: 1`,
`fieldSize` 2 MB (`F1 src/shared/middleware/uploadAvatar.ts:20-29`). O `payload` é o único campo de texto
aceito; sem arquivo, o mesmo campo pode chegar em corpo `application/json` como string, porque o
`express.json` (`F1 src/app.ts:26`) roda antes do multer. Com multipart, o JSON trafega como parte
texto. Datas não aparecem na resposta.

#### Evidência

`F1 src/modules/users/users.router.ts:28-29`;
`F1 src/modules/users/users.controller.ts:118-175`; `F1 src/modules/users/users.service.ts:312-441`;
`F1 src/modules/DTOs/users/UpdateProfileRequest.dto.ts:9-53`;
`F1 src/shared/middleware/uploadAvatar.ts:6-84`; `F1 src/app.ts:24`.

**Desatualizado no legado:** `F1 docs/users-api-profile-0_1.md` §2 mapeia `LIMIT_UNEXPECTED_FILE` para
`415`; no código esse código do multer responde `400 "Parte de arquivo inesperada na requisição."`
(o `415` fica restrito ao `fileFilter`) (`F1 src/shared/middleware/uploadAvatar.ts:30-34,63-79`). O
exemplo de `413` do documento usa a mensagem `"Arquivo excede o tamanho máximo permitido para esta
chave."`; a mensagem vigente é `"A foto de perfil deve ter no máximo 2MB."` (`:64`).

### 8.6 GET `/users/metrics`

#### Request

sem query e sem body (`F1 src/modules/users/users.controller.ts:25-29`).

#### Response 200

objeto único, sem envelope e sem paginação:

| Campo     | Tipo   | Regra                                                                                |
| --------- | ------ | ------------------------------------------------------------------------------------ |
| `total`   | number | `COUNT(*)` sobre `users` com JOIN em `profiles`                                      |
| `active`  | number | `COUNT` de `users.is_active = true`                                                  |
| `pending` | number | `COUNT` de `users.must_change_password = true`, **independentemente** de `is_active` |
| `admins`  | number | `COUNT` de `profiles.name = "administrador"`                                         |

```json
{ "total": 15, "active": 13, "pending": 3, "admins": 3 }
```

As quatro contagens saem de uma única query (`F1 src/modules/users/users.repository.ts:574-591`); a
semântica de `pending` incluir inativos está registrada no contrato do legado
(`F1 docs/users-api-metrics-0_1.md` §Observações).

#### Erros

| Status | `code` | Mensagem literal                                         | Condição                            | Evidência                                        |
| ------ | ------ | -------------------------------------------------------- | ----------------------------------- | ------------------------------------------------ |
| 401    | —      | `"Token não fornecido"` / `"Token inválido ou expirado"` | sessão                              | §8.2                                             |
| 403    | —      | `"Troca de senha obrigatória antes de continuar"`        | `must_change_password`              | §8.2                                             |
| 403    | —      | `"Acesso restrito ao perfil Administrador"`              | perfil diferente de `Administrador` | §8.2                                             |
| 500    | —      | `"Erro interno do servidor"`                             | falha não prevista                  | `F1 src/modules/users/users.controller.ts:25-29` |

Sem `400`/`404` próprios.

#### Transporte

JSON; sem paginação, sem auditoria e sem escrita.

#### Evidência

`F1 src/modules/users/users.router.ts:30-32`; `F1 src/modules/users/users.controller.ts:25-29`;
`F1 src/modules/users/users.repository.ts:573-591`; `F1 src/shared/types/user.ts:35-41`.

**Desatualizado no legado:** `F1 docs/users-api-metrics-0_1.md` §1 afirma que o módulo aplica
`authMiddleware` + `requireRole("Administrador")` "no nível do router, portanto todas as rotas,
inclusive esta, exigem ... perfil de administrador". As rotas `/users/analysts` e `GET/PUT /users/me`
ficam antes do `requireRole` e aceitam qualquer sessão autenticada, inclusive `Solicitante`
(`F1 src/modules/users/users.router.ts:23-30`).

### 8.7 GET `/users`

#### Request

query string validada por `listUsersQuerySchema`:

| Parâmetro  | Tipo    | Regra                                                                                                     |
| ---------- | ------- | --------------------------------------------------------------------------------------------------------- |
| `profile`  | string  | `trim`, 1..60; deve corresponder exatamente a um `profiles.name` do banco, senão `400 "Perfil inválido."` |
| `search`   | string  | `trim`, até 150; busca `ILIKE` em `users.full_name` **ou** `users.email`, com `%`, `_` e `\` escapados    |
| `page`     | inteiro | default `1`; 1..10000                                                                                     |
| `pageSize` | inteiro | default `10`; 1..50                                                                                       |

Chaves de query não declaradas são descartadas pelo Zod (o schema não é `strict`), inclusive `category`.
A validação de sintaxe responde `400` com mensagem agregada
(`F1 src/modules/users/users.controller.ts:36-46`); o `profile` é validado de novo contra a tabela e, se
não existir, responde `400 "Perfil inválido."` (`F1 src/modules/users/users.service.ts:68-77`).

#### Response 200

envelope efetivamente usado:

| Campo        | Tipo            | Regra                                                           |
| ------------ | --------------- | --------------------------------------------------------------- |
| `data`       | `UserSummary[]` | itens da página                                                 |
| `page`       | number          | ecoa a página pedida, sem clamp                                 |
| `pageSize`   | number          | ecoa o tamanho pedido                                           |
| `total`      | number          | total de linhas do filtro                                       |
| `totalPages` | number          | `0` quando `total = 0`; caso contrário `ceil(total / pageSize)` |

Item de `data`:

| Campo                | Tipo           | Regra                                                |
| -------------------- | -------------- | ---------------------------------------------------- |
| `id`                 | string         | `user_id` como string                                |
| `fullName`           | string         | `users.full_name`                                    |
| `email`              | string         | `users.email`                                        |
| `avatarUrl`          | string \| null | `users.avatar_url`                                   |
| `profile`            | Role           | nome legível do perfil (campo `profile`, não `role`) |
| `isActive`           | boolean        | `users.is_active`                                    |
| `mustChangePassword` | boolean        | `users.must_change_password`                         |
| `createdAt`          | string         | ISO-8601 do banco                                    |

```json
{
  "data": [
    {
      "id": "42",
      "fullName": "Usuário Exemplo",
      "email": "usuario.exemplo@example.com",
      "avatarUrl": null,
      "profile": "Analista",
      "isActive": true,
      "mustChangePassword": false,
      "createdAt": "2026-09-01T12:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 10,
  "total": 1,
  "totalPages": 1
}
```

Ordenação `created_at DESC` e, em empate, `user_id DESC`; `offset = (page - 1) * pageSize`
(`F1 src/modules/users/users.repository.ts:383-397`). Página acima de `totalPages` devolve `data: []`
e ecoa a página pedida — não há clamp (`F1 src/modules/users/users.repository.ts:397,410-413`).

#### Erros

| Status  | code | Mensagem literal                                                                                                  | Condição                                                                                                                   |
| ------- | ---- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 400     | —    | `"Campos inválidos: pageSize — Máximo de 50 itens por página."` (ou equivalente para `page`, `profile`, `search`) | sintaxe da query inválida (`F1 src/modules/users/users.controller.ts:39-41`; `F1 src/modules/users/users.schema.ts:59-79`) |
| 400     | —    | `"Perfil inválido."`                                                                                              | `profile` inexistente em `profiles` (`F1 src/modules/users/users.service.ts:69-74`)                                        |
| 401/403 | —    | comuns da §8.2                                                                                                    | sessão/perfil                                                                                                              |

#### Transporte

JSON paginado; `createdAt` em ISO-8601 UTC; `page` é 1-based.

#### Evidência

`F1 src/modules/users/users.router.ts:30-33`; `F1 src/modules/users/users.controller.ts:36-46`;
`F1 src/modules/users/users.schema.ts:59-79`; `F1 src/modules/users/users.repository.ts:359-415`;
`F1 src/modules/DTOs/users/UserResponse.dto.ts:4-13`; `F1 src/shared/types/pagination.ts:1-7`.

**Divergente (legado vigente):** o envelope coincide com a convenção §4.1, mas o default é `10`, o
máximo é `50` e não há clamp de página — convenção §4.2 e a linha de migração da §4.3 de
`docs/04-API-Conventions.md` (10/50 não são herdados; decisões C3/C4).

### 8.8 POST `/users`

#### Request

JSON:

| Campo          | Tipo   | Regra                                                                                                                                                                       |
| -------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fullName`     | string | `requiredString(150)`: `trim`, 1..150 (aceita qualquer caractere; diferente do `fullName` de `PUT /users/:id`, que é `requiredText`)                                        |
| `email`        | string | `trim`, minúsculas, formato de e-mail, até 254 — `"Informe um e-mail válido."`, `"Máximo de 254 caracteres."`                                                               |
| `role`         | string | `trim`, 1..60; precisa existir como `profiles.name` (valores do banco em minúsculas: `solicitante`, `analista`, `gestor`, `administrador`) — senão `400 "Perfil inválido."` |
| `requester`    | objeto | **obrigatório**: `area` (`requiredText(100)`), `department` (`optionalText(100)`), `manager` (`requiredText(150)`), `additionalContact` (string até 100, `""` vira `null`)  |
| `professional` | objeto | obrigatório para `role = "analista"` e proibido para os demais perfis (regra do schema)                                                                                     |

`professional`:

| Campo                 | Tipo     | Regra                                                                                          |
| --------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `jobTitle`            | string   | `requiredString(100)`                                                                          |
| `specialties`         | string[] | ao menos 1 item, cada `requiredString(100)` — `"Informe ao menos uma especialidade."`          |
| `attendedCategoryIds` | number[] | ao menos 1 inteiro positivo — `"Id inválido."`, `"Selecione ao menos uma categoria atendida."` |
| `notes`               | string   | opcional, `trim`, até 500 — `"Máximo de 500 caracteres."`                                      |

O `superRefine` do schema emite `422` com `fields.professional` para as mensagens `"Dados
profissionais são obrigatórios para o perfil Analista."` e `"Dados profissionais são exclusivos do
perfil Analista."` (`F1 src/modules/users/users.schema.ts:33-57`). No service, a regra de
obrigatoriedade tem guarda defensiva com a mesma mensagem sem ponto final e status `400`
(`F1 src/modules/users/users.service.ts:124-130`); a exclusividade, no `POST`, é garantida apenas pelo
schema.

#### Response 201

`CreateUserResponse`:

| Campo                | Tipo    | Regra                                                |
| -------------------- | ------- | ---------------------------------------------------- |
| `id`                 | string  | `user_id` como string                                |
| `fullName`           | string  | `users.full_name`                                    |
| `email`              | string  | e-mail normalizado (`trim` + minúsculas)             |
| `role`               | Role    | nome legível do perfil criado                        |
| `isActive`           | boolean | default do schema (`true`)                           |
| `mustChangePassword` | boolean | gravado como `true` na criação                       |
| `createdAt`          | string  | ISO-8601                                             |
| `temporaryPassword`  | string  | senha temporária em claro, exibida **uma única vez** |

```json
{
  "id": "42",
  "fullName": "Usuário Exemplo",
  "email": "usuario.exemplo@example.com",
  "role": "Analista",
  "isActive": true,
  "mustChangePassword": true,
  "createdAt": "2026-10-27T12:00:00.000Z",
  "temporaryPassword": "<senha-temporaria>"
}
```

**Efeitos:** o e-mail é gravado em minúsculas (`F1 src/modules/users/users.repository.ts:92-99`); a
senha temporária é gerada por CSPRNG (`randomBytes(14)` em base64url) e gravada como hash bcrypt
(`F1 src/shared/utils/passwordHandler.ts:5-15,31-33`); `must_change_password` nasce `true`
(`F1 src/modules/users/users.repository.ts:98`); a linha 1:1 de `requesters` é criada (ou uma linha
anônima de mesmo e-mail é adotada) (`F1 src/modules/users/users.repository.ts:126-168`); a extensão
`details_professional` é criada quando o perfil é `analista`
(`F1 src/modules/users/users.repository.ts:71-83`); criação, extensões e auditoria `user.create` rodam na
mesma transação (`F1 src/modules/users/users.service.ts:107-147`).

#### Erros

| Status  | code | Mensagem literal                                                                         | Condição                                                                                            |
| ------- | ---- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 400     | —    | `"Perfil inválido."`                                                                     | `role` não existe em `profiles` (`F1 src/modules/users/users.service.ts:95-98`)                     |
| 403     | —    | `"Não é possível gerenciar contas de Administradores"`                                   | `role` resolve para `Administrador` (`F1 src/modules/users/users.service.ts:62-66,101`)             |
| 409     | —    | `"E-mail já cadastrado"`                                                                 | violação de unicidade `23505` dentro da transação (`F1 src/modules/users/users.service.ts:148-153`) |
| 422     | —    | `"Campos obrigatórios ausentes: role"` + `fields`                                        | body fora do schema (`F1 src/modules/users/users.controller.ts:48-54`)                              |
| 422     | —    | `"Dados profissionais são obrigatórios para o perfil Analista."` + `fields.professional` | `role = "analista"` sem `professional`                                                              |
| 422     | —    | `"Dados profissionais são exclusivos do perfil Analista."` + `fields.professional`       | `professional` com perfil não analista                                                              |
| 500     | —    | `"Falha ao criar o usuário"`                                                             | transação não devolve linha (`F1 src/modules/users/users.service.ts:155-157`)                       |
| 401/403 | —    | comuns da §8.2                                                                           | sessão/perfil                                                                                       |

#### Transporte

JSON; `201` sem header `Location`; `createdAt` em ISO-8601 UTC. A senha temporária só
existe nesta resposta — não há rota de leitura dela.

#### Evidência

`F1 src/modules/users/users.router.ts:30-34`; `F1 src/modules/users/users.controller.ts:48-59`;
`F1 src/modules/users/users.schema.ts:10-57`; `F1 src/modules/users/users.service.ts:87-169`;
`F1 src/shared/validation/fieldSchemas.ts:5-33`; `F1 src/modules/DTOs/users/UserResponse.dto.ts:28-33`.

**Divergente (legado vigente):** validação de body com `422` e `fields` como objeto indexado por campo —
convenção §3 (C2) e tabela 0.1 #5 de `docs/04-API-Conventions.md` (alvo `400`, `fields` lista). O valor
de `role` é o
slug do banco (`analista`) na escrita e o nome capitalizado (`Analista`) na leitura; a convenção §6 e a
ADR-0006 fixam cinco perfis capitalizados, incluindo `Admin Root`, que esta rota não cria e não aceita.

### 8.9 GET `/users/:id`

#### Request

path param `id`. `parseUserId` aceita apenas inteiro positivo; qualquer outro valor
responde `404 "Usuário não encontrado"` (`F1 src/modules/users/users.service.ts:46-52`).

#### Response 200

o mesmo `UserProfileResponseDTO` da §8.4, com as mesmas regras de `requester`,
`professional` e `avatarUrl` (`F1 src/modules/users/users.service.ts:307-310`).

```json
{
  "id": "42",
  "fullName": "Usuário Exemplo",
  "email": "usuario.exemplo@example.com",
  "role": "Solicitante",
  "avatarUrl": null,
  "requester": null,
  "professional": null
}
```

#### Erros

| Status | `code` | Mensagem literal                                         | Condição                                    | Evidência                                        |
| ------ | ------ | -------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------ |
| 401    | —      | `"Token não fornecido"` / `"Token inválido ou expirado"` | sessão                                      | §8.2                                             |
| 403    | —      | `"Troca de senha obrigatória antes de continuar"`        | `must_change_password`                      | §8.2                                             |
| 403    | —      | `"Acesso restrito ao perfil Administrador"`              | perfil diferente de `Administrador`         | §8.2                                             |
| 404    | —      | `"Usuário não encontrado"`                               | id não inteiro, não positivo ou inexistente | `F1 src/modules/users/users.service.ts:46-52`    |
| 500    | —      | `"Erro interno do servidor"`                             | falha não prevista                          | `F1 src/modules/users/users.controller.ts:79-83` |

Não há `400` próprio.

#### Transporte

JSON; id numérico em string no path e na resposta.

#### Evidência

`F1 src/modules/users/users.router.ts:30,35`; `F1 src/modules/users/users.controller.ts:79-83`;
`F1 src/modules/users/users.service.ts:46-52,307-310`.

**Divergente (legado vigente):** `:id` é numérico — convenção §15.1 e ADR-0003 (PK UUID v4).

### 8.10 PUT `/users/:id`

#### Request

JSON, merge parcial; campos ausentes preservam o valor atual
(`F1 src/modules/users/users.service.ts:443-448`).

| Campo          | Tipo   | Regra                                                                                                                                                         |
| -------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fullName`     | string | `requiredText(150)`: 1..150, apenas letras e espaços                                                                                                          |
| `email`        | string | `trim`, minúsculas, formato de e-mail, até 254                                                                                                                |
| `role`         | string | `trim`, 1..60; precisa existir em `profiles`; `Administrador` é bloqueado                                                                                     |
| `requester`    | objeto | patch parcial: `area` (`requiredText(100)`), `department` (string ou `null`), `manager` (`requiredText(150)`), `additionalContact` (string até 100 ou `null`) |
| `professional` | objeto | mesmo schema do `POST /users`; exclusivo de perfil analista                                                                                                   |

Body vazio → `422` com `fields: { "payload": "Informe ao menos um campo para atualização." }`
(`F1 src/modules/users/users.schema.ts:120-126`; `F1 src/shared/validation/zodErrors.ts:110-114`).

**Regras de negócio:**

- actor igual ao alvo → `400 "Você não pode modificar a própria conta"` (`F1 src/modules/users/users.service.ts:455-459`).
- alvo é `Administrador` e o patch contém `fullName`, `email`, `role` ou `professional` → `403 "Não é
possível gerenciar contas de Administradores"`; um patch só de `requester` é aceito
  (`F1 src/modules/users/users.service.ts:466-475`).
- `role` inválido → `400 "Perfil inválido."`; `role` que resolve para `Administrador` → `403` da mesma
  mensagem de hierarquia (`:477-487`).
- `professional` em perfil final não analista → `400 "Dados profissionais são exclusivos do perfil
Analista"`; promoção para analista sem `professional` → `400 "Dados profissionais são obrigatórios para
o perfil Analista"`; o schema já bloqueia `professional` com `role` não analista em `422`, com as
  mesmas mensagens e ponto final (`F1 src/modules/users/users.service.ts:489-506`;
  `F1 src/modules/users/users.schema.ts:105-119`).
- mudança de nome/e-mail sincroniza `requesters.full_name` e `requesters.corporate_email`
  (`F1 src/modules/users/users.service.ts:520-525`); e-mail é gravado em `trim` + minúsculas
  (`F1 src/modules/users/users.repository.ts:433-441`).
- `professional` é upsert; quando o alvo deixa de ser analista, a extensão é apagada
  (`F1 src/modules/users/users.service.ts:527-532`).
- tudo em uma transação com auditoria `user.update` (`:512-556`).

#### Response 200

`UserProfileResponseDTO` relido do banco (mesma tabela de campos da §8.4), incluindo o
bloco `professional` com defaults para analista sem extensão
(`F1 src/modules/users/users.service.ts:564-581`):

```json
{
  "id": "42",
  "fullName": "Usuário Exemplo",
  "email": "usuario.exemplo@example.com",
  "role": "Analista",
  "avatarUrl": null,
  "requester": {
    "area": "Tecnologia",
    "department": null,
    "manager": "Gestor Exemplo",
    "additionalContact": null
  },
  "professional": {
    "jobTitle": "Especialista em processos",
    "specialties": ["Automação"],
    "attendedCategoryIds": [1],
    "notes": null
  }
}
```

#### Erros

| Status  | code | Mensagem literal                                                | Condição                                                                           |
| ------- | ---- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 400     | —    | `"Você não pode modificar a própria conta"`                     | actor = alvo                                                                       |
| 400     | —    | `"Perfil inválido."`                                            | `role` inexistente em `profiles`                                                   |
| 400     | —    | `"Dados profissionais são exclusivos do perfil Analista"`       | `professional` com perfil final não analista                                       |
| 400     | —    | `"Dados profissionais são obrigatórios para o perfil Analista"` | promoção para analista sem `professional`                                          |
| 403     | —    | `"Não é possível gerenciar contas de Administradores"`          | alvo administrador com patch não-`requester`, ou `role` administrador              |
| 404     | —    | `"Usuário não encontrado"`                                      | id inválido ou inexistente (`F1 src/modules/users/users.service.ts:46-52,461-464`) |
| 409     | —    | `"E-mail já cadastrado"`                                        | `23505` na transação (`:557-562`)                                                  |
| 422     | —    | mensagem agregada do Zod + `fields`                             | schema (inclui `fields.payload` para body vazio)                                   |
| 401/403 | —    | comuns da §8.2                                                  | sessão/perfil                                                                      |

#### Transporte

JSON; `PUT` com semântica de merge, não de substituição integral. `id` numérico em
string.

#### Evidência

`F1 src/modules/users/users.router.ts:30,36`; `F1 src/modules/users/users.controller.ts:61-77`;
`F1 src/modules/users/users.schema.ts:81-127`; `F1 src/modules/users/users.service.ts:443-582`;
`F1 src/modules/users/users.repository.ts:433-465,597-664`.

**Divergente (legado vigente):** validação com `422` + `fields` objeto — convenção §3 (C2); `:id`
numérico — convenção §15.1/ADR-0003.

### 8.11 PATCH `/users/:id/status`

#### Request

JSON:

| Campo      | Tipo    | Regra                                                      |
| ---------- | ------- | ---------------------------------------------------------- |
| `isActive` | boolean | obrigatório (`F1 src/modules/users/users.schema.ts:88-90`) |

Validação com `formatZodIssues` → `400`; corpo sem a chave responde `"Campos obrigatórios ausentes:
isActive"` (`F1 src/modules/users/users.controller.ts:85-90`).

#### Response 200

`ChangeUserStatusResponse`:

| Campo      | Tipo    | Regra                    |
| ---------- | ------- | ------------------------ |
| `id`       | string  | `user_id` como string    |
| `isActive` | boolean | valor enviado no request |

```json
{ "id": "42", "isActive": false }
```

**Efeitos:** grava `users.is_active` e `updated_at` (`F1 src/modules/users/users.repository.ts:418-430`) e
registra auditoria `user.activate` ou `user.deactivate`, com `previousValue`/`newValue`, na mesma
transação (`F1 src/modules/users/users.service.ts:190-205`). A desativação passa a valer no request
seguinte do alvo: `authMiddleware` relê `users.is_active` e responde `401 "Token inválido ou expirado"`
(`F1 src/shared/middleware/auth.ts:42-45`).

#### Erros

| Status  | code | Mensagem literal                                                 | Condição                                                       |
| ------- | ---- | ---------------------------------------------------------------- | -------------------------------------------------------------- |
| 400     | —    | `"Você não pode modificar a própria conta"`                      | actor = alvo (`F1 src/modules/users/users.service.ts:179-181`) |
| 400     | —    | `"Campos obrigatórios ausentes: isActive"` (ou mensagem de tipo) | body inválido                                                  |
| 403     | —    | `"Não é possível gerenciar contas de Administradores"`           | alvo administrador (`:188`)                                    |
| 404     | —    | `"Usuário não encontrado"`                                       | id inválido ou inexistente (`:46-52,183-186`)                  |
| 401/403 | —    | comuns da §8.2                                                   | sessão/perfil                                                  |

#### Transporte

JSON; o estado é um booleano, não uma `key` de status.

#### Evidência

`F1 src/modules/users/users.router.ts:30,37`; `F1 src/modules/users/users.controller.ts:85-100`;
`F1 src/modules/users/users.service.ts:171-208`; `F1 src/modules/users/users.schema.ts:88-90`;
`F1 src/modules/users/users.repository.ts:417-430`; `F1 src/shared/types/user.ts:14-33`.

### 8.12 POST `/users/:id/reset-password`

#### Request

sem body, sem query; path param `id` (`F1 src/modules/users/users.controller.ts:102-106`).

#### Response 200

`ResetPasswordResponse`:

| Campo               | Tipo   | Regra                                      |
| ------------------- | ------ | ------------------------------------------ |
| `id`                | string | `user_id` como string                      |
| `temporaryPassword` | string | nova senha em claro, exibida uma única vez |

```json
{ "id": "42", "temporaryPassword": "<senha-temporaria>" }
```

**Efeitos:** gera senha temporária por CSPRNG (`randomBytes(14)` em base64url) e grava o hash bcrypt
(`F1 src/shared/utils/passwordHandler.ts:5-15,31-33`); grava `must_change_password = true`,
`password_changed_at = now` e `updated_at`; o avanço de `password_changed_at` revoga tokens emitidos antes
(`F1 src/modules/users/users.repository.ts:468-483`; `F1 src/shared/middleware/auth.ts:63-72`); registra
auditoria `user.reset_password` na mesma transação (`F1 src/modules/users/users.service.ts:231-244`).
A senha não é escolhida pelo cliente e não há campo de senha no request.

#### Erros

| Status  | code | Mensagem literal                                       | Condição                                                         |
| ------- | ---- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| 400     | —    | `"Você não pode modificar a própria conta"`            | actor = alvo (`F1 src/modules/users/users.service.ts:217-219`)   |
| 403     | —    | `"Não é possível gerenciar contas de Administradores"` | alvo administrador (`:226`)                                      |
| 404     | —    | `"Usuário não encontrado"`                             | id inválido ou inexistente (`:46-52,221-224`)                    |
| 500     | —    | `"Erro ao gerar hash da senha"`                        | falha do bcrypt (`F1 src/shared/utils/passwordHandler.ts:12-14`) |
| 401/403 | —    | comuns da §8.2                                         | sessão/perfil                                                    |

#### Transporte

JSON em ambos os sentidos; a senha temporária trafega no corpo da resposta.

#### Evidência

`F1 src/modules/users/users.router.ts:30,38`; `F1 src/modules/users/users.controller.ts:102-106`;
`F1 src/modules/users/users.service.ts:210-247`; `F1 src/modules/users/users.repository.ts:467-483`;
`F1 src/shared/utils/passwordHandler.ts:27-33`.

### 8.13 Visão do consumidor (F2) e drift

Chamadas em `F2 src/lib/api/user.api.ts`:

| Função F2           | Método e path                    | Observação                                                                                                                |
| ------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `getMyProfile`      | `GET /users/me`                  | `apiClient` com cookie (`F2 src/lib/api/user.api.ts:23-25`)                                                               |
| `updateMyProfile`   | `PUT /users/me`                  | monta `FormData` com `payload` (JSON.stringify de `fullName`, `requester`, `removeAvatar`) e `avatar` opcional (`:27-49`) |
| `getUser`           | `GET /users/:id`                 | `:51-58`                                                                                                                  |
| `updateUser`        | `PUT /users/:id`                 | envia `UpdateUserInput` (`:60-73`)                                                                                        |
| `listUsers`         | `GET /users`                     | envia `profile`, `search`, `category`, `page`, `pageSize` (`:75-111`)                                                     |
| `listAnalysts`      | `GET /users/analysts`            | sem query (`:113-120`)                                                                                                    |
| `getUserStats`      | `GET /users/metrics`             | em qualquer erro devolve `{ total: 0, active: 0, pending: 0, admins: 0 }` (`:122-133`)                                    |
| `createUser`        | `POST /users`                    | envia `CreateUserPayload` (`:135-145`)                                                                                    |
| `updateUserStatus`  | `PATCH /users/:id/status`        | envia `{ isActive }` (`:147-162`)                                                                                         |
| `resetUserPassword` | `POST /users/:id/reset-password` | sem body (`:164-173`)                                                                                                     |

Drift anotado, sem decisão:

- **`category` na listagem.** O FE envia `category` quando presente (`F2 src/lib/api/user.api.ts:94-96`;
  tipo em `F2 src/lib/types/user.ts:51-57`), mas o backend só lê `profile`, `search`, `page` e `pageSize`
  (`F1 src/modules/users/users.schema.ts:59-79`); a chave é descartada e o filtro não tem efeito.
- **Tipo de `Analyst` com campos ausentes na resposta.** O tipo do FE é
  `Omit<UserSummary, 'isActive' | 'avatarUrl'>` acrescido de `specialty`, `categories`, `notes` e
  `requestLoad` (`F2 src/lib/types/user.ts:35-42`), portanto espera também `profile`,
  `mustChangePassword` e `createdAt`; o backend devolve apenas sete campos
  (`F1 src/modules/DTOs/users/UserResponse.dto.ts:15-23`), e esses três chegam `undefined` em runtime.
- **`AdminUser` não corresponde a nenhuma resposta.** O tipo tem `name`, `role` e
  `status` com os valores `"Ativo" | "Inativo"` (`F2 src/lib/types/user.ts:9-22`), enquanto a listagem
  devolve `fullName`, `profile` e
  `isActive` (`F1 src/modules/DTOs/users/UserResponse.dto.ts:4-13`); nenhuma chamada de
  `F2 src/lib/api/user.api.ts` devolve esse formato.
- **`UpdateUserInput` mais estreito que o backend.** O FE envia apenas `fullName`, `requester
{ area, department, manager }` e `professional` (`F2 src/lib/types/user.ts:159-167`); o backend aceita
  ainda `email`, `role` e `requester.additionalContact` (`F1 src/modules/users/users.schema.ts:92-127`).
- **`CreateUserFormData` usa `name`, não `fullName`.** O tipo chama o nome de `name`
  (`F2 src/lib/types/user.ts:59-68`), mas o payload efetivamente enviado usa `fullName` (`:70-81`).
- **Estatísticas silenciam erro.** `getUserStats` captura qualquer falha e devolve zeros
  (`F2 src/lib/api/user.api.ts:128-132`); um `401`/`403` de `GET /users/metrics` não chega à UI como erro.
- **Resposta de criação tipada como literal.** `CreateUserResponse` do FE fixa `isActive: true` e
  `mustChangePassword: true` (`F2 src/lib/types/user.ts:83-92`), o que coincide com o que o backend grava
  hoje (`F1 src/modules/users/users.repository.ts:92-99`).
- **`role` na escrita é slug, na leitura é nome legível.** O FE tipa o payload com `UserProfile`
  minúsculo (`F2 src/lib/types/user.ts:7,52,62,73`) e a resposta com `UserRole` capitalizado
  (`:3-5,29,87`); o backend segue a mesma assimetria (`F1 src/modules/users/users.repository.ts:26-30`;
  `F1 src/shared/utils/roleUtils.ts:5-21`).

### 8.14 Confronto com `docs/04-API-Conventions.md`

| Assunto                   | Convenção                                                                                    | Confronto                                                                                                                                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base path                 | §1 — `/api/v1`                                                                               | Divergente (legado vigente): rotas montadas em `/users` (`F1 src/router.ts:26`; `F1 src/modules/users/users.router.ts:18`)                                                                                                                     |
| Envelope de erro          | §2 — `{ status, statusCode, message }` com `code`/`requestId` aditivos                       | Compatível no formato; nenhuma rota do domínio envia `code` nem `requestId` (`F1 src/shared/middleware/errorHandler.ts:11-30`)                                                                                                                 |
| Validação                 | §3 e tabela 0.1 #5 — `400` + `fields` lista                                                  | Divergente (legado vigente): `POST /users` e `PUT /users/:id` respondem `422` com `fields` objeto (`F1 src/modules/users/users.controller.ts:48-54,61-67`; `F1 src/shared/errors/ValidationError.ts:10-17`)                                    |
| Paginação                 | §4.1/§4.2/§4.3 — default 20, máximo 100, clamp                                               | Divergente (legado vigente): default 10, máximo 50, sem clamp (`F1 src/modules/users/users.schema.ts:67-78`; `F1 src/modules/users/users.repository.ts:397`)                                                                                   |
| Listagem não paginada     | §4.3 — exige linha de exceção                                                                | Divergente (legado vigente): `GET /users/analysts` não é paginada e não tem linha em §4.3 (`F1 src/modules/users/users.router.ts:20-23`); o contrato do legado a define como direta (`F1 docs/contract-assign-action.md` §GET /users/analysts) |
| Sessão e cookie           | §5 — `session_id`, relê usuário/perfil                                                       | Compatível (`F1 src/shared/middleware/auth.ts:20-86`; `F1 src/configs.ts:23`)                                                                                                                                                                  |
| Autorização               | §6 e ADR-0025 — capabilities, diretório com `assignee_directory:read`, cinco perfis          | Divergente (legado vigente): gate por perfil (`requireRole("Administrador")`) e diretório aberto a qualquer sessão, sem capability; não existe `Admin Root` (`F1 src/modules/users/users.router.ts:23,30`)                                     |
| Gestão de contas          | ADR-0006 e `03-Data-Model.md` §7.5                                                           | Parcialmente compatível: bloqueia alvo `Administrador`, promovê-lo e a própria conta (`F1 src/modules/users/users.service.ts:62-66,179-181,217-219,466-475`); não há `Admin Root` nem a matriz ator × operação × perfil de destino             |
| Ids                       | §15.1 e ADR-0003 — UUID v4                                                                   | Divergente (legado vigente): `id` e `:id` são inteiros serializados como string (`F1 src/modules/users/users.service.ts:46-52,160`; `F1 src/modules/users/users.repository.ts:401`)                                                            |
| Content types / multipart | §9 — avatar 1 arquivo, 2 MiB, JPEG/PNG; 413 tamanho, 415 MIME/extensão, 400 parte inesperada | Compatível nos limites e no status: `fileFilter` responde `415` só para extensão/MIME e o `LIMIT_UNEXPECTED_FILE` do multer responde `400` antes dele (`F1 src/shared/middleware/uploadAvatar.ts:30-55,63-79`)                                 |
| Códigos de sucesso        | §15.4 — 201 criação, 200 demais                                                              | Compatível (`F1 src/modules/users/users.controller.ts:58`)                                                                                                                                                                                     |
| Idioma                    | §11 — chaves camelCase, valores pt-BR                                                        | Compatível nas chaves; o campo `role` aceita slug minúsculo na escrita e devolve nome capitalizado na leitura (`F1 src/modules/users/users.schema.ts:37`; `F1 src/shared/utils/roleUtils.ts:5-21`)                                             |
| Idempotência              | §8.2 — `PUT` idempotente, `POST` sem deduplicação                                            | Compatível: `PUT /users/:id` é merge repetível e `POST /users` não deduplica (`F1 src/modules/users/users.service.ts:111-147,449-556`)                                                                                                         |
| Avatar no `/auth/me`      | §7 — `avatarUrl` `string \| null`                                                            | Compatível: mesmo campo e mesma URL relativa (`F1 src/modules/DTOs/users/UserProfileResponse.dto.ts:9`; `F1 src/modules/users/users.service.ts:301,427-432`)                                                                                   |

## 9. requests

As 10 rotas do domínio `requests` do inventário (§4) são servidas pelo `requestsRoutes`,
montado em `/requests` (`F1 src/router.ts:24`; `F1 src/modules/requests/requests.router.ts:20`).
O núcleo das regras de negócio — incluindo autorização por custódia e montagem dos DTOs — vive em
um único arquivo de 1.330 linhas, `F1 src/modules/requests/requests.service.ts`; o router só declara
rotas e guards.

Três guards definem o acesso e aparecem em quase todas as rotas:

| Guard                                 | Efeito                                                                                                                                                       | Evidência                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| `requireAccessMode()`                 | lê `system_settings.solicitation_mode` a cada request; em `PUBLIC` libera sem sessão, em `AUTHENTICATED` delega ao `authMiddleware` e grava `req.accessMode` | `F1 src/shared/middleware/accessMode.ts:19-41` |
| `authMiddleware` + `requireRole(...)` | cookie de sessão válido e perfil na lista; mensagem `"Acesso restrito ao perfil <perfis unidos por ' ou '>"`                                                 | `F1 src/shared/middleware/requireRole.ts:9-23` |
| `requesterDualAuth`                   | cookie `session_id` **ou** header `X-Requester-Identity: {"name","email"}`; sem cookie e sem header válido → `401`                                           | `F1 src/shared/middleware/dualAuth.ts:19-40`   |

**Divergente (legado vigente):** o router não tem prefixo `/api/v1` — convenção §1 de
`docs/04-API-Conventions.md`.

**Rota ausente do código:** `GET /requests/:protocol/attachments/:id/download` **não está
registrada** em `F1 src/modules/requests/requests.router.ts` e não existe em
`F1 src/`; o download de anexos é descrito como pendência/endpoint futuro na documentação do
legado (`F1 docs/solicitations-api-requests-0_4.md` §Observações; `F1 docs/requests-internal-query-contract.md` §Limitações) e o próprio código fixa
`downloadUrl` vazio e `canDownload: false` (`F1 src/modules/requests/requests.service.ts:363-369,550-558`).
Ela não entra na contagem de 10 rotas.

### 9.1 Fontes

| Ref | Caminho                                                  | Uso nesta seção                                                                      |
| --- | -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| F1  | `src/modules/requests/requests.router.ts`                | registro das 10 rotas, guards e ordem                                                |
| F1  | `src/modules/requests/requests.controller.ts`            | parsing de path/query/multipart, tradução de erro, status de sucesso                 |
| F1  | `src/modules/requests/requests.schema.ts`                | schemas Zod de query, criação, atualização interna, atribuição e status              |
| F1  | `src/modules/requests/requests.service.ts`               | regras de negócio, autorização por custódia, montagem dos DTOs                       |
| F1  | `src/modules/requests/requests.repository.ts`            | SQL, paginação, protocolo, elenco de responsáveis                                    |
| F1  | `src/modules/requests/statusTransition.ts`               | transição de status, precondição e retorno público                                   |
| F1  | `src/modules/DTOs/requests/RequestRequests.dto.ts`       | payloads e resposta de status                                                        |
| F1  | `src/modules/DTOs/requests/RequestResponse.dto.ts`       | `RequestDetail`, `CreateRequestResponse`, `AssigneeSummary`, `AssignRequestResponse` |
| F1  | `src/modules/DTOs/requests/RequestInternalDetail.dto.ts` | DTO da consulta interna                                                              |
| F1  | `src/modules/DTOs/requests/RequestTracking.dto.ts`       | DTO bimodal do acompanhamento                                                        |
| F1  | `src/shared/types/requests.ts`                           | status, prioridades, blocos, `YesNoDetail`, linhas de atribuição                     |
| F1  | `src/shared/middleware/{accessMode,dualAuth,upload}.ts`  | modo de acesso, credencial dual, multipart                                           |
| F1  | `docs/solicitations-api-requests-0_4.md`                 | contrato do fluxo do solicitante (POST, listagem, detalhe público)                   |
| F1  | `docs/requests-internal-query-contract.md`               | contrato da consulta interna                                                         |
| F1  | `docs/contract-assign-action.md`                         | contrato de `PATCH .../internal/assignee`                                            |
| F1  | `docs/requests-assignment-contract.md`                   | contrato de `GET /requests/assignees` e `PATCH .../assignee`                         |
| F1  | `docs/contract-pendencias_03.md` §3, §7                  | gate do `verify` e DTO do acompanhamento                                             |
| F2  | `src/lib/api/request.api.ts`                             | criação, listagem, detalhe, interno, atribuição                                      |
| F2  | `src/lib/api/requester-tracking.api.ts`                  | acompanhamento público e autenticado                                                 |
| F2  | `src/lib/api/status.api.ts`                              | troca de status                                                                      |
| F2  | `src/lib/types/request.ts`                               | tipos do consumidor                                                                  |
| F2  | `src/lib/types/requester-tracking.ts`                    | tipos do acompanhamento                                                              |

### 9.2 Rotas

| #   | Método | Path                                    | Autenticação/autorização                                                           | Handler                          | Sucesso                                   | Erros                             | Evidência                                          |
| --- | ------ | --------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------- | --------------------------------- | -------------------------------------------------- |
| 23  | GET    | `/requests`                             | modo de acesso: `PUBLIC` sem sessão; `AUTHENTICATED` exige sessão                  | `getRequestsByEmail`             | `200` `PaginatedResponse<RequestSummary>` | 400, 401, 403, 500                | `F1 src/modules/requests/requests.router.ts:24`    |
| 24  | GET    | `/requests/assignees`                   | sessão + Analista, Gestor, Administrador                                           | `getAssignees`                   | `200` `AssigneeSummary[]`                 | 401, 403, 500                     | `F1 src/modules/requests/requests.router.ts:27-32` |
| 25  | PATCH  | `/requests/:protocol/internal/assignee` | sessão + Analista, Administrador; custódia no service                              | `patchInternalAssignee`          | `200` `RequestInternalDetailDTO`          | 400, 401, 403, 404, 500           | `F1 src/modules/requests/requests.router.ts:38-43` |
| 26  | PATCH  | `/requests/:protocol/assignee`          | sessão + Analista, Administrador; custódia no service                              | `patchAssignee`                  | `200` `AssignRequestResponse`             | 400, 401, 403, 404, 500           | `F1 src/modules/requests/requests.router.ts:45-50` |
| 27  | GET    | `/requests/:protocol/tracking`          | dual: sessão **ou** `X-Requester-Identity`                                         | `getTracking`                    | `200` `{ mode, details }`                 | 400, 401, 403, 404, 500           | `F1 src/modules/requests/requests.router.ts:55`    |
| 28  | PATCH  | `/requests/:protocol/status`            | sessão + Analista, Gestor, Administrador; custódia no service                      | `patchRequestStatus`             | `200` `UpdateStatusResponse`              | 400, 401, 403, 404, 409, 422, 500 | `F1 src/modules/requests/requests.router.ts:60-65` |
| 29  | GET    | `/requests/:protocol`                   | modo de acesso: `PUBLIC` sem sessão; `AUTHENTICATED` exige sessão e posse          | `getRequestsByProtocol`          | `200` `RequestDetail`                     | 400, 401, 403, 404, 500           | `F1 src/modules/requests/requests.router.ts:67`    |
| 30  | GET    | `/requests/:protocol/internal`          | sessão + Analista, Gestor, Administrador; escopo do Analista no service            | `getInternalRequestByProtocol`   | `200` `RequestInternalDetailDTO`          | 401, 403, 404, 500                | `F1 src/modules/requests/requests.router.ts:68-75` |
| 31  | PATCH  | `/requests/:protocol/internal`          | sessão + Analista, Gestor, Administrador; Analista restrito ao próprio responsável | `patchInternalRequestByProtocol` | `200` `RequestInternalDetailDTO`          | 401, 403, 404, 422, 500           | `F1 src/modules/requests/requests.router.ts:79-84` |
| 32  | POST   | `/requests`                             | modo de acesso; multipart                                                          | `postRequest`                    | `201` `CreateRequestResponse`             | 400, 401, 403, 500                | `F1 src/modules/requests/requests.router.ts:88`    |

Notas de ordenação e montagem:

- `GET /requests/assignees` é declarado **antes** de `GET /:protocol` (`F1 src/modules/requests/requests.router.ts:27-32,67`) para não ser capturado como protocolo;
  `GET /:protocol/tracking` idem (`F1 src/modules/requests/requests.router.ts:52-55`).
- `POST /requests` aplica `requireAccessMode()` **antes** de `uploadFields`, para não processar
  multipart de uma requisição que já seria rejeitada (`F1 src/modules/requests/requests.router.ts:86-88`).
- `GET /requests` e `GET /requests/:protocol` compartilham o mesmo guard de modo; `POST /requests`
  também. As demais rotas usam `authMiddleware` + `requireRole`.

### 9.3 GET `/requests`

#### Request

- Path: `/requests` (`F1 src/modules/requests/requests.router.ts:24`).
- Guard `requireAccessMode()`: `req.accessMode` recebe o modo lido do banco
  (`F1 src/shared/middleware/accessMode.ts:26-32`).
- Modo `PUBLIC` — query (`F1 src/modules/requests/requests.schema.ts:152-166`):

  | Parâmetro  | Obrigatório | Regra                                                                 | Mensagem de erro                                               |
  | ---------- | ----------- | --------------------------------------------------------------------- | -------------------------------------------------------------- |
  | `email`    | sim         | e-mail válido, máx. 254                                               | `"Informe um e-mail válido."` / `"Máximo de 254 caracteres."`  |
  | `status`   | não         | texto, máx. 100; precisa existir em `statuses` com `is_public = true` | `"Status inválido."`                                           |
  | `page`     | não         | inteiro > 0, default `1`                                              | `"Deve ser um número inteiro."` / `"Deve ser maior que zero."` |
  | `pageSize` | não         | inteiro > 0, máx. 10, default `10`                                    | `"Máximo de 10 itens por página."`                             |

  Sem `email`, o controller responde antes de validar o resto:
  `"Parâmetro obrigatório ausente: email"` (`F1 src/modules/requests/requests.controller.ts:173-175`).

- Modo `AUTHENTICATED` — o e-mail vem do cadastro do usuário da sessão, não da query
  (`F1 src/modules/requests/requests.service.ts:145-149`). A presença de `email` em qualquer
  forma (`?email=` inclusive) é recusada antes do parse (`F1 src/modules/requests/requests.controller.ts:154-157`). O schema aceito é o mesmo sem `email`
  (`F1 src/modules/requests/requests.schema.ts:168-173`).
- Chaves desconhecidas na query são descartadas pelo `z.object` (strip padrão, documentado em
  `F1 src/modules/requests/requests.schema.ts:139-140`); `search` não faz parte do schema e
  portanto é aceito e ignorado.

**Desatualizado no legado:** `F1 docs/solicitations-api-requests-0_4.md` §2 documenta o parâmetro
`search` (match parcial em processo/solicitante/e-mail) e diz que `pageSize` não tem teto neste
contrato; o schema vigente não tem `search` e limita `pageSize` a 10
(`F1 src/modules/requests/requests.schema.ts:152-166`).

#### Response 2xx

`200` com `PaginatedResponse<RequestSummary>`
(`F1 src/modules/requests/requests.repository.ts:405-419`):

| Campo                  | Tipo                | Origem/observação                                                                                                                                                |
| ---------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data[].protocol`      | string              | `requests.protocol`                                                                                                                                              |
| `data[].createdAt`     | string ISO-8601 UTC | `requests.created_at`                                                                                                                                            |
| `data[].processName`   | string              | `requests.process_name`                                                                                                                                          |
| `data[].priority`      | string \| null      | `priorities.level`                                                                                                                                               |
| `data[].status`        | string              | status público calculado por SQL: nome do status atual se `is_public`; senão o de `last_public_status_id` se `is_public`; senão o nome do status `status_id = 1` |
| `data[].assignee`      | string \| null      | `users.full_name` do responsável da triagem                                                                                                                      |
| `data[].requesterName` | string              | `requesters.full_name`                                                                                                                                           |
| `page`                 | number              | eco da query (default 1)                                                                                                                                         |
| `pageSize`             | number              | eco da query (default 10)                                                                                                                                        |
| `total`                | number              | contagem com os mesmos filtros                                                                                                                                   |
| `totalPages`           | number              | `0` quando `total = 0`; senão `ceil(total / pageSize)`                                                                                                           |

O SQL do status público está em `F1 src/modules/requests/requests.repository.ts:353-354`; a
ordenação é `requests.created_at desc` (`F1 src/modules/requests/requests.repository.ts:401`).

```json
{
  "data": [
    {
      "protocol": "MAAT-8K3P-9X2M",
      "createdAt": "2026-08-25T14:03:11.000Z",
      "processName": "Conferência de diárias",
      "priority": null,
      "status": "Em triagem",
      "assignee": null,
      "requesterName": "Pessoa Solicitante"
    }
  ],
  "page": 1,
  "pageSize": 10,
  "total": 1,
  "totalPages": 1
}
```

Consulta vazia devolve `200` com `data: []`, `total: 0` e `totalPages: 0`
(`F1 src/modules/requests/requests.repository.ts:418`).

#### Erros

| Status | `code` | Mensagem literal                                                                                       | Condição                                     | Evidência                                                                                               |
| ------ | ------ | ------------------------------------------------------------------------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 400    | —      | `"O parâmetro 'email' não é aceito no modo autenticado."`                                              | `AUTHENTICATED` com `?email=` presente       | `F1 src/modules/requests/requests.controller.ts:154-157`                                                |
| 400    | —      | `"Parâmetro obrigatório ausente: email"`                                                               | `PUBLIC` sem `email`                         | `F1 src/modules/requests/requests.controller.ts:173-175`                                                |
| 400    | —      | mensagem agregada `"Campos inválidos: <path> — <mensagem>"` / `"Campos obrigatórios ausentes: <path>"` | `email`/`status`/`page`/`pageSize` inválidos | `F1 src/modules/requests/requests.controller.ts:159-181`; `F1 src/shared/validation/zodErrors.ts:57-91` |
| 400    | —      | `"Status inválido."`                                                                                   | `status` não existe como status público      | `F1 src/modules/requests/requests.service.ts:157-159`                                                   |
| 401    | —      | `"Token não fornecido"`                                                                                | `AUTHENTICATED` sem cookie                   | `F1 src/shared/middleware/auth.ts:27-45` (§3.2)                                                         |
| 401    | —      | `"Token inválido ou expirado"`                                                                         | cookie inválido/expirado/usuário inativo     | `F1 src/shared/middleware/auth.ts:87-95` (§3.2)                                                         |
| 403    | —      | `"Troca de senha obrigatória antes de continuar"`                                                      | sessão com `must_change_password`            | `F1 src/shared/middleware/auth.ts:49-61` (§3.2)                                                         |
| 500    | —      | `"Erro interno do servidor"`                                                                           | falha não prevista                           | `F1 src/shared/middleware/errorHandler.ts:32-44`                                                        |

#### Transporte

JSON; envelope de paginação sem `limit`/`total` aninhado; timestamps ISO-8601 UTC;
cookie `session_id` só no modo `AUTHENTICATED`; datas puras não aparecem nesta rota.

#### Evidência

`F1 src/modules/requests/requests.router.ts:24`; `F1 src/modules/requests/requests.controller.ts:152-186`; `F1 src/modules/requests/requests.service.ts:141-167`; `F1 src/modules/requests/requests.repository.ts:353-420`.

### 9.4 GET `/requests/assignees`

#### Request

- Path: `/requests/assignees` (`F1 src/modules/requests/requests.router.ts:27-32`).
- Sem path param, sem query e sem paginação (`F1 src/modules/requests/requests.controller.ts:188-190`).
- Auth: `authMiddleware` + `requireRole("Analista", "Gestor", "Administrador")`.

#### Response 2xx

`200` com lista direta de `AssigneeSummary`, ordenada por `name` asc
(`F1 src/modules/requests/requests.repository.ts:643-658`):

| Campo      | Tipo           | Origem                                 |
| ---------- | -------------- | -------------------------------------- |
| `id`       | string (UUID)  | `details_professional.professional_id` |
| `name`     | string         | `users.full_name`                      |
| `email`    | string         | `users.email`                          |
| `jobTitle` | string \| null | `details_professional.job_title`       |
| `capacity` | number         | `details_professional.capacity`        |

Critério de elegibilidade aplicado no SQL: `details_professional.status = 'active'`,
`users.is_active = true` e `profiles.name` em `ASSIGNABLE_PROFILES`
(`F1 src/modules/requests/requests.repository.ts:640-658`).

`ASSIGNABLE_PROFILES` contém **apenas** `"analista"` (`F1 src/modules/requests/requests.repository.ts:641`).

```json
[
  {
    "id": "0f6f2b7a-6d1c-4c1e-9d0a-2b6b4f6e1a11",
    "name": "Pessoa Responsável",
    "email": "pessoa.responsavel@example.com",
    "jobTitle": "Mapeamento de Processos",
    "capacity": 6
  }
]
```

#### Erros

| Status | `code` | Mensagem literal                                                  | Condição               | Evidência                                        |
| ------ | ------ | ----------------------------------------------------------------- | ---------------------- | ------------------------------------------------ |
| 401    | —      | `"Token não fornecido"`                                           | sem cookie             | `F1 src/shared/middleware/auth.ts:27-45`         |
| 401    | —      | `"Token inválido ou expirado"`                                    | sessão inválida        | `F1 src/shared/middleware/auth.ts:87-95`         |
| 403    | —      | `"Acesso restrito ao perfil Analista ou Gestor ou Administrador"` | perfil `Solicitante`   | `F1 src/shared/middleware/requireRole.ts:21-22`  |
| 403    | —      | `"Troca de senha obrigatória antes de continuar"`                 | `must_change_password` | `F1 src/shared/middleware/requireRole.ts:11-13`  |
| 500    | —      | `"Erro interno do servidor"`                                      | falha não prevista     | `F1 src/shared/middleware/errorHandler.ts:32-44` |

**Desatualizado no legado:** `F1 docs/requests-assignment-contract.md` §Modelo afirma que o
responsável é elegível com perfil `analista` **ou** `gestor` (critério 3, linha 28 do documento),
mas o código restringe a `analista` (`F1 src/modules/requests/requests.repository.ts:641`).

**Divergente (legado vigente):** listagem não paginada sem linha na tabela de exceções — convenção
§4.3 de `docs/04-API-Conventions.md` (a §4.3 só admite listagem não paginada com uma linha
registrada, e não há linha para `/requests/assignees`).

#### Transporte

JSON, array cru (sem envelope de paginação).

#### Evidência

`F1 src/modules/requests/requests.router.ts:27-32`; `F1 src/modules/requests/requests.controller.ts:188-190`; `F1 src/modules/requests/requests.service.ts:821-823`; `F1 src/modules/requests/requests.repository.ts:640-658`.

### 9.5 PATCH `/requests/:protocol/internal/assignee`

#### Request

- Path param `protocol` (`F1 src/modules/requests/requests.controller.ts:210-212`; guarda de
  protocolo vazio em `F1 src/modules/requests/requests.controller.ts:73-81`).
- Auth: `authMiddleware` + `requireRole("Analista", "Administrador")` — **Gestor não passa no
  router** (`F1 src/modules/requests/requests.router.ts:38-43`).
- Headers: `Cookie: session_id`; `Content-Type: application/json`.
- Body JSON com **exatamente um** de `assigneeId` ou `mappingAssigneeId`
  (`F1 src/modules/requests/requests.schema.ts:187-202`):

  | Campo               | Tipo           | Regra                                                                                      |
  | ------------------- | -------------- | ------------------------------------------------------------------------------------------ |
  | `assigneeId`        | string \| null | `users.user_id` serializado como string (ex.: `"20"`), com `trim` não vazio; `null` remove |
  | `mappingAssigneeId` | string \| null | idem, para o designado do mapeamento                                                       |

  A presença dos dois ou de nenhum é rejeitada pelo `superRefine` com
  `"Informe exatamente um de assigneeId ou mappingAssigneeId."` (`F1 src/modules/requests/requests.schema.ts:192-202`).
  Chaves extras são descartadas (objeto sem `.strict()`, `F1 src/modules/requests/requests.schema.ts:187-191`).

**Regras de escrita** (`F1 src/modules/requests/requests.service.ts:955-1136`):

| Situação                                                                            | Efeito                                                                                                                                                     |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `assigneeId: null`                                                                  | limpa `requests.professional_id`; auditoria `request.unassign`                                                                                             |
| `assigneeId: "<user_id>"`                                                           | resolve o candidato, grava `professional_id` e **limpa `requests.mapping_professional_id`** (exclusividade); auditoria `request.assign`/`request.reassign` |
| `mappingAssigneeId: null`                                                           | limpa `requests.mapping_professional_id`; auditoria `request.unassign`                                                                                     |
| `mappingAssigneeId: "<user_id>"`                                                    | grava `mapping_professional_id` e **limpa `requests.professional_id`**                                                                                     |
| Atribuição de triagem com `status = "Em triagem"` e `screening_result = "elegivel"` | status avança para `"Aguardando mapeamento"` (RN-010) com auditoria `request.status_change` e `note = "RN-010"`                                            |

A RN-010 só existe no ramo de triagem (`F1 src/modules/requests/requests.service.ts:1013-1061`);
o ramo de mapeamento não verifica status (`F1 src/modules/requests/requests.service.ts:1064-1132`).
Tudo é gravado na mesma transação da atribuição (`F1 src/modules/requests/requests.service.ts:1016-1062,1098-1131`).

**Autorização:** `canAssignRequest` libera `Administrador` e libera o usuário que é responsável
**da triagem ou do mapeamento** da solicitação; os demais recebem `403`
(`F1 src/modules/requests/requests.service.ts:1141-1154`).

#### Response 2xx

`200` com o DTO interno completo, idêntico ao de §9.10, relido após a escrita
(`F1 src/modules/requests/requests.service.ts:1135`):

```json
{
  "protocol": "MAAT-8K3P-9X2M",
  "status": "Aguardando mapeamento",
  "assignee": {
    "id": "20",
    "name": "Pessoa Responsável",
    "email": "pessoa.responsavel@example.com"
  },
  "mappingAssignee": null,
  "lastUpdate": "2026-09-18T10:30:00.000Z"
}
```

(O exemplo mostra só os campos afetados; o corpo real tem todos os campos da tabela de §9.10.)

#### Erros

| Status | `code`                            | Mensagem literal                                                                          | Condição                                                               | Evidência                                                                                                                                                     |
| ------ | --------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400    | —                                 | `"Campos inválidos: payload — Informe exatamente um de assigneeId ou mappingAssigneeId."` | os dois campos presentes ou nenhum                                     | `F1 src/modules/requests/requests.controller.ts:213-216`; `F1 src/modules/requests/requests.schema.ts:192-202`; `F1 src/shared/validation/zodErrors.ts:71-86` |
| 400    | —                                 | `"Campos inválidos: assigneeId — analystId não pode ser vazio."`                          | valor string vazio/só espaços                                          | `F1 src/modules/requests/requests.schema.ts:185`                                                                                                              |
| 400    | —                                 | `"Campos inválidos: mappingAssigneeId — analystId não pode ser vazio."`                   | idem no campo de mapeamento                                            | idem                                                                                                                                                          |
| 400    | —                                 | `"Responsável inativo."`                                                                  | `details_professional.status != "active"` ou `users.is_active = false` | `F1 src/modules/requests/requests.service.ts:841-843`                                                                                                         |
| 400    | —                                 | `"Perfil do responsável não permite atribuição."`                                         | perfil fora de `ASSIGNABLE_PROFILES`                                   | `F1 src/modules/requests/requests.service.ts:844-846`                                                                                                         |
| 401    | —                                 | `"Token não fornecido"` / `"Token inválido ou expirado"`                                  | sem sessão/sessão inválida                                             | `F1 src/shared/middleware/auth.ts:27-45,87-95`                                                                                                                |
| 403    | —                                 | `"Acesso restrito ao perfil Analista ou Administrador"`                                   | Gestor ou Solicitante                                                  | `F1 src/modules/requests/requests.router.ts:41`; `F1 src/shared/middleware/requireRole.ts:21-22`                                                              |
| 403    | `"INSUFFICIENT_ROLE_PERMISSIONS"` | `"Ação restrita ao Administrador ou ao Analista responsável pela demanda."`               | não é Administrador nem responsável vigente                            | `F1 src/modules/requests/requests.service.ts:968-974`                                                                                                         |
| 404    | —                                 | `"Analista não encontrado"`                                                               | `user_id` inexistente ou não numérico                                  | `F1 src/modules/requests/requests.service.ts:837-840`; `F1 src/modules/requests/requests.repository.ts:661-684`                                               |
| 404    | —                                 | `"Solicitação não encontrada"`                                                            | protocolo inexistente                                                  | `F1 src/modules/requests/requests.service.ts:961-964`                                                                                                         |
| 500    | —                                 | `"Erro interno do servidor"`                                                              | falha não prevista                                                     | `F1 src/shared/middleware/errorHandler.ts:32-44`                                                                                                              |

Notas factuais:

- As mensagens usam o rótulo `analystId` e `"Analista não encontrado"` embora o campo do contrato
  seja `assigneeId` (`F1 src/modules/requests/requests.schema.ts:183-202`;
  `F1 src/modules/requests/requests.service.ts:831-853`).
- As guardas `"analystId vazio"` do service (`F1 src/modules/requests/requests.service.ts:834-836,1000-1002,1085-1087`) são defensivas: o schema
  já rejeita string vazia.
- A resposta é montada por `findInternalByProtocol(protocol)` **sem** o ator (`F1 src/modules/requests/requests.service.ts:1135`), portanto o escopo de leitura do Analista de
  §9.10 não é reaplicado nessa resposta.

#### Transporte

JSON; sem justificativa e sem corpo multipart; `updated_at`/`updated_by` são
atualizados nas duas colunas de responsável (`F1 src/modules/requests/requests.repository.ts:748-772`).

#### Evidência

`F1 src/modules/requests/requests.router.ts:34-43`; `F1 docs/contract-assign-action.md` §`PATCH /requests/{protocol}/internal/assignee`.

### 9.6 PATCH `/requests/:protocol/assignee`

#### Request

- Path `/requests/:protocol/assignee` — alias legado mantido ao lado da rota `/internal/assignee`
  (`F1 src/modules/requests/requests.router.ts:34-50`).
- Auth: `authMiddleware` + `requireRole("Analista", "Administrador")`
  (`F1 src/modules/requests/requests.router.ts:45-50`).
- Body JSON `{ "professionalId": string | null }` (`F1 src/modules/requests/requests.schema.ts:175-179`):

  | Campo            | Tipo                  | Regra                                                         |
  | ---------------- | --------------------- | ------------------------------------------------------------- |
  | `professionalId` | string (UUID) \| null | UUID de `details_professional.professional_id`; `null` remove |

  O schema é `nullable().optional()` e usa `.passthrough()` (`F1 src/modules/requests/requests.schema.ts:175-179`): corpo `{}` também remove o responsável,
  porque `undefined` é tratado como `null` (`F1 src/modules/requests/requests.service.ts:895-898`), e chaves extras não são recusadas.

**Regras de escrita** (`F1 src/modules/requests/requests.service.ts:874-953`):

- Resolve o responsável por `professional_id` (`F1 src/modules/requests/requests.service.ts:855-872`).
- RN-010: se a solicitação está em `"Em triagem"` com `screening_result = "elegivel"` e há novo
  responsável, o status avança para `"Aguardando mapeamento"` (`F1 src/modules/requests/requests.service.ts:913-916,932-945`).
- Não há exclusividade com o mapeamento nesta rota: apenas `professional_id` é atualizado
  (`F1 src/modules/requests/requests.repository.ts:748-759`).

#### Response 2xx

`200` com `AssignRequestResponse` (`F1 src/modules/DTOs/requests/RequestResponse.dto.ts:44-49`):

| Campo      | Tipo                          | Observação                                                                |
| ---------- | ----------------------------- | ------------------------------------------------------------------------- |
| `protocol` | string                        | protocolo da solicitação                                                  |
| `assignee` | `{ id, name, email }` \| null | `id` é `users.user_id` serializado como string; `null` quando removido    |
| `status`   | string                        | status após a operação; `"Aguardando mapeamento"` quando a RN-010 dispara |

```json
{
  "protocol": "MAAT-8K3P-9X2M",
  "assignee": {
    "id": "20",
    "name": "Pessoa Responsável",
    "email": "pessoa.responsavel@example.com"
  },
  "status": "Aguardando mapeamento"
}
```

#### Erros

| Status | `code`                            | Mensagem literal                                                            | Condição                                  | Evidência                                                                                                  |
| ------ | --------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 400    | —                                 | `"Campos inválidos: professionalId — professionalId deve ser um UUID."`     | valor não é UUID nem `null`               | `F1 src/modules/requests/requests.schema.ts:177`; `F1 src/modules/requests/requests.controller.ts:195-198` |
| 400    | —                                 | `"Responsável não encontrado."`                                             | UUID não existe em `details_professional` | `F1 src/modules/requests/requests.service.ts:859-863`                                                      |
| 400    | —                                 | `"Responsável inativo."`                                                    | responsável ou usuário inativo            | `F1 src/modules/requests/requests.service.ts:864-866`                                                      |
| 400    | —                                 | `"Perfil do responsável não permite atribuição."`                           | perfil fora de `ASSIGNABLE_PROFILES`      | `F1 src/modules/requests/requests.service.ts:867-869`                                                      |
| 401    | —                                 | `"Token não fornecido"` / `"Token inválido ou expirado"`                    | sem sessão/sessão inválida                | `F1 src/shared/middleware/auth.ts:27-45,87-95`                                                             |
| 403    | —                                 | `"Acesso restrito ao perfil Analista ou Administrador"`                     | Gestor ou Solicitante                     | `F1 src/modules/requests/requests.router.ts:48`                                                            |
| 403    | `"INSUFFICIENT_ROLE_PERMISSIONS"` | `"Ação restrita ao Administrador ou ao Analista responsável pela demanda."` | sem custódia                              | `F1 src/modules/requests/requests.service.ts:887-893`                                                      |
| 404    | —                                 | `"Solicitação não encontrada"`                                              | protocolo inexistente                     | `F1 src/modules/requests/requests.service.ts:880-883`                                                      |
| 500    | —                                 | `"Erro interno do servidor"`                                                | falha não prevista                        | `F1 src/shared/middleware/errorHandler.ts:32-44`                                                           |

**Desatualizado no legado:** `F1 docs/requests-assignment-contract.md` §2 exemplifica
`assignee.id` com o UUID de `details_professional.professional_id`, mas o código devolve
`users.user_id` como string (`F1 src/modules/requests/requests.service.ts:847-852,948-952`).

#### Transporte

JSON; corpo pequeno; a auditoria registra `request.assign` /
`request.reassign` / `request.unassign` com os ids de usuário (`F1 src/modules/requests/requests.service.ts:921-930`).

#### Evidência

`F1 src/modules/requests/requests.router.ts:45-50`; `F1 src/modules/requests/requests.controller.ts:192-208`; `F1 src/modules/requests/requests.service.ts:855-953`.

### 9.7 GET `/requests/:protocol/tracking`

#### Request

- Path param `protocol`.
- Credencial decidida pelo middleware dual, **nesta ordem** (`F1 src/shared/middleware/dualAuth.ts:19-40`):
  1. cookie `session_id` presente → `authMiddleware` (modo `authenticated`);
  2. sem cookie → header `X-Requester-Identity` com JSON `{ "name": string, "email": string }`
     (modo `public`);
  3. sem cookie e sem header válido → `401 "Valide seus dados para acompanhar esta solicitação."`.
- Cookie e header juntos: a sessão vence (`F1 src/shared/middleware/dualAuth.ts:20-25`).
- O header só é parseado; a checagem de posse fica no service (`F1 src/shared/middleware/dualAuth.ts:27-38`).
- O middleware grava `req.requesterVerifiedProtocol` (`F1 src/shared/middleware/dualAuth.ts:38`), mas **nenhum leitor** consome esse campo: o service não
  exige que a chamada tenha passado pelo `POST /requests/:protocol/public/verify` (§13). O gate
  descrito em `F1 docs/contract-pendencias_03.md` §7 é, portanto, apenas do consumidor.

#### Response 2xx

`200` com união discriminada `{ mode, details }` (`F1 src/modules/DTOs/requests/RequestTracking.dto.ts:21,57-79`).

Modo `public` — `PublicRequestDetails` (`F1 src/modules/requests/requests.service.ts:493-510`):

| Campo                  | Tipo                                                                                    | Observação                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `protocol`             | string                                                                                  |                                                                                   |
| `status`               | string                                                                                  | status público; fallback `"Solicitação enviada"` quando a coluna calculada é nula |
| `openedAt`             | string ISO-8601 UTC                                                                     | `requests.created_at`                                                             |
| `lastUpdate`           | string ISO-8601 UTC                                                                     | `last_external_update_at`, senão `updated_at`, senão `openedAt`                   |
| `lastTechnicalMessage` | string \| null                                                                          | último retorno público                                                            |
| `meeting`              | `{ scheduledFor, link }` \| null                                                        | `null` sem `meeting_scheduled_for`                                                |
| `requester`            | `RequesterBlock`                                                                        | nome, e-mail, área, departamento, gestor, contato adicional                       |
| `demand`               | `DemandBlock`                                                                           | título, tipo, categoria, processo, descrição, problema, resultado, justificativa  |
| `impacts`              | `{ mainRisks, clientImpact, operationalImpact, perceivedCriticality, desiredDeadline }` | `desiredDeadline` em `yyyy-mm-dd`                                                 |

Modo `authenticated` — `RequesterRequestDetails` = base do modo público **sem `impacts`**, mais
(`F1 src/modules/requests/requests.service.ts:512-561`):

| Campo                 | Tipo              | Observação                                                                                                                                                                              |
| --------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `operational`         | objeto            | `impacts` + `processDescription`, `processSteps`, `systemsUsed`, `executionFrequency`, `volumetry`, `peopleInvolved`, `averageExecutionTime`, `monthlyEffortHours`, `hasManualControls` |
| `complementary`       | objeto \| ausente | chave omitida quando nenhum dos 5 campos foi respondido                                                                                                                                 |
| `schedulePreferences` | string[] \| null  | `yyyy-mm-ddThh:mm`, ordenado asc                                                                                                                                                        |
| `mappingDate`         | string \| null    | parte-data de `meeting.scheduledFor` em America/Sao_Paulo                                                                                                                               |
| `attachments`         | array             | `id`, `fileName`, `mimeType`, `sizeBytes`, `downloadUrl: ""`, `canDownload: false`                                                                                                      |

```json
{
  "mode": "public",
  "details": {
    "protocol": "MAAT-8K3P-9X2M",
    "status": "Em triagem",
    "openedAt": "2026-08-25T14:03:11.000Z",
    "lastUpdate": "2026-08-26T10:12:40.000Z",
    "lastTechnicalMessage": null,
    "meeting": null,
    "requester": {
      "fullName": "Pessoa Solicitante",
      "corporateEmail": "pessoa.solicitante@example.com",
      "area": "Financeiro",
      "department": "Contabilidade",
      "manager": "Gestor Exemplo",
      "additionalContact": "<contato-adicional>"
    },
    "demand": {
      "title": "Conferência de diárias",
      "requestType": "Automação",
      "category": "Automação",
      "processName": "Conferência de diárias",
      "description": "Conferência manual em planilha.",
      "problem": "Retrabalho por erro de digitação.",
      "expectedResult": "Reduzir o tempo de conferência.",
      "justification": "Consome cerca de 60 horas/mês."
    },
    "impacts": {
      "mainRisks": "Erro de digitação em valores.",
      "clientImpact": "Atraso no reembolso.",
      "operationalImpact": "Alto",
      "perceivedCriticality": "Alta",
      "desiredDeadline": "2026-09-30"
    }
  }
}
```

#### Erros

| Status | `code` | Mensagem literal                                            | Condição                                                              | Evidência                                                                                                     |
| ------ | ------ | ----------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 400    | —      | `"Protocolo é obrigatório"`                                 | protocolo vazio após `trim` (guarda defensiva)                        | `F1 src/modules/requests/requests.service.ts:654-658`; `F1 src/modules/requests/requests.controller.ts:73-81` |
| 401    | —      | `"Valide seus dados para acompanhar esta solicitação."`     | sem cookie e sem header válido                                        | `F1 src/shared/middleware/dualAuth.ts:31-33`                                                                  |
| 401    | —      | `"Valide seus dados para acompanhar esta solicitação."`     | modo `PUBLIC` com identidade ausente                                  | `F1 src/modules/requests/requests.service.ts:619-622`                                                         |
| 401    | —      | `"Valide seus dados para acompanhar esta solicitação."`     | protocolo inexistente **ou** nome/e-mail divergentes no modo `PUBLIC` | `F1 src/modules/requests/requests.service.ts:629-640`                                                         |
| 401    | —      | `"Token não fornecido"` / `"Token inválido ou expirado"`    | cookie presente porém inválido                                        | `F1 src/shared/middleware/dualAuth.ts:22-24`; `F1 src/shared/middleware/auth.ts:27-45,87-95`                  |
| 403    | —      | `"Verificação indisponível no modo atual"`                  | header de identidade com portal em `AUTHENTICATED`                    | `F1 src/modules/requests/requests.service.ts:613-617`                                                         |
| 403    | —      | `"Perfis internos devem acompanhar pela consulta interna."` | sessão de perfil diferente de `Solicitante`                           | `F1 src/modules/requests/requests.service.ts:588-593`                                                         |
| 404    | —      | `"Protocolo não encontrado"`                                | sessão `Solicitante` com protocolo inexistente ou de terceiro         | `F1 src/modules/requests/requests.service.ts:600-604`                                                         |
| 500    | —      | `"Erro interno do servidor"`                                | falha não prevista                                                    | `F1 src/shared/middleware/errorHandler.ts:32-44`                                                              |

Regra de posse no modo `authenticated`: o vínculo `requests.requester_user_id` é a fonte primária;
sem vínculo (nulo), compara o e-mail normalizado de `requesters` com o da sessão (`F1 src/modules/requests/requests.service.ts:563-582`). No modo `public`, **nome e e-mail** precisam
conferir após normalização (`F1 src/modules/requests/requests.service.ts:627-640`).

**Divergente (legado vigente):** credencial pública por `X-Requester-Identity` com nome+e-mail e
`401` genérico; a convenção §15.3 e o ADR-0023 apontam `X-Requester-Email`, comparação só por
e-mail e `404` no lugar de `401`.

**Desatualizado no legado:** `F1 docs/contract-pendencias_03.md` §7 registra `403` para "portal
`AUTHENTICATED` sem sessão"; no código, quem não tem cookie nem header recebe `401` do
`requesterDualAuth`, e o `403 "Verificação indisponível no modo atual"` só ocorre quando há header
de identidade (`F1 src/modules/requests/requests.service.ts:613-617`).

#### Transporte

header `X-Requester-Identity` carrega JSON (não é cookie, não é JWT); a resposta
não emite cookie; datas em ISO-8601 UTC, exceto `desiredDeadline`/`mappingDate` (`yyyy-mm-dd`);
`attachments[].downloadUrl` é string vazia (diferente do `null` da consulta interna). O middleware
dual testa o cookie **literal** `session_id`, não `Config.COOKIE_NAME` (`F1 src/shared/middleware/dualAuth.ts:20`) — ver §3.2.

#### Evidência

`F1 src/modules/requests/requests.router.ts:52-55`; `F1 src/modules/requests/requests.controller.ts:44-56`; `F1 src/modules/requests/requests.service.ts:412-665`.

### 9.8 PATCH `/requests/:protocol/status`

#### Request

- Path param `protocol`.
- Auth: `authMiddleware` + `requireRole("Analista", "Gestor", "Administrador")`
  (`F1 src/modules/requests/requests.router.ts:60-65`); a autorização por custódia acontece no
  service.
- Headers: `Cookie: session_id`; `Content-Type: application/json`.
- Body JSON **strict** (`F1 src/modules/requests/requests.schema.ts:212-221`):

  | Campo                  | Tipo           | Regra                                          |
  | ---------------------- | -------------- | ---------------------------------------------- |
  | `targetStatus`         | number         | inteiro > 0; é o `statuses.status_id` numérico |
  | `justification`        | string         | 1–4.000 caracteres, `trim` não vazio           |
  | `lastTechnicalMessage` | string \| null | opcional, 1–4.000 quando string                |

  Não há `expectedStatus`, `force`, `override` nem `note`: o campo `note` da auditoria recebe
  `justification` (`F1 src/modules/requests/requests.service.ts:1314`). `.strict()` recusa chave
  desconhecida com `400` agregado (`F1 src/modules/requests/requests.schema.ts:221`).

**Regras de autorização e alcance** (`F1 src/modules/requests/requests.service.ts:1189-1285`):

| Ator                                             | Regra                                                                                       | Negativa                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `Administrador`                                  | bypass de `triageMode`/`mappingMode`/`isRestricted`; ainda exige destino `isActive`         | `409` se destino inativo                  |
| `Gestor`                                         | sempre negado (`F1 src/modules/requests/requests.service.ts:1206-1218`)                     | `403` + auditoria `request.access_denied` |
| Analista responsável (triagem **ou** mapeamento) | só destino ativo, `isRestricted = false` e `triageMode` **ou** `mappingMode` igual a `free` | `403`                                     |
| Qualquer outro perfil interno                    | sem custódia                                                                                | `403`                                     |

Regras adicionais, na ordem em que o código as aplica:

1. protocolo inexistente → `404 "Protocolo não encontrado"` (`F1 src/modules/requests/requests.service.ts:1195-1198`);
2. `targetStatus` inexistente em `statuses` → `404 "Status de destino não encontrado"` (`F1 src/modules/requests/requests.service.ts:1200-1203`);
3. mesmo status atual → `422 "A solicitação já está neste status."` (`F1 src/modules/requests/requests.service.ts:1240-1242`);
4. destino inativo → `409 "Status inativo não pode ser alvo."`, inclusive para Administrador
   (`F1 src/modules/requests/requests.service.ts:1244-1252`);
5. destino restrito por não-Administrador →
   `403 "Status Priorizado só pode ser definido por Administrador."` (`F1 src/modules/requests/requests.service.ts:1254-1267`);
6. destino sem `free` →
   `403 "Só é possível definir status ativo com triageMode ou mappingMode free."` (`F1 src/modules/requests/requests.service.ts:1268-1281`);
7. destino público sem `lastTechnicalMessage` →
   `400 "Retorno ao solicitante obrigatório para status público."` (`F1 src/modules/requests/requests.service.ts:1283-1285`);
8. destino público com `lastTechnicalMessage` só de espaços →
   `422 "Informe o retorno ao solicitante para um status público."` (`F1 src/modules/requests/statusTransition.ts:28-32`).

**Concorrência:** não há precondição enviada pelo cliente. `expectedStatusId` recebe o status lido
no início da mesma request (`F1 src/modules/requests/requests.service.ts:1302`); se a linha mudou
entre a leitura e o `UPDATE`, a transição falha com
`409 "Solicitação foi atualizada por outra operação"` (`F1 src/modules/requests/statusTransition.ts:38-51`).

**Desatualizado no legado:** o comentário do schema e do service afirma que status terminais nunca são
saída e que a tentativa responde `422` (`F1 src/modules/requests/requests.schema.ts:206-210`;
`F1 src/modules/requests/requests.service.ts:1156-1166`), mas `updateRequestStatus` não consulta
`current_is_terminal`: a coluna é selecionada em `F1 src/modules/requests/requests.repository.ts:826` e não tem leitor nesta rota (`F1 src/modules/requests/requests.service.ts:1189-1330`). Nenhuma outra rota deste domínio aplica o
bloqueio.

#### Response 2xx

`200` (`F1 src/modules/DTOs/requests/RequestRequests.dto.ts:55-61`):

| Campo        | Tipo                | Observação                                                 |
| ------------ | ------------------- | ---------------------------------------------------------- |
| `protocol`   | string              |                                                            |
| `status`     | string              | nome do status de destino                                  |
| `previous`   | string              | nome do status anterior; `""` quando o status atual é nulo |
| `next`       | string              | nome do status de destino                                  |
| `lastUpdate` | string ISO-8601 UTC | `requests.updated_at` da transição                         |

```json
{
  "protocol": "MAAT-8K3P-9X2M",
  "status": "Em mapeamento",
  "previous": "Aguardando mapeamento",
  "next": "Em mapeamento",
  "lastUpdate": "2026-09-20T13:05:44.000Z"
}
```

#### Erros

| Status | `code`                            | Mensagem literal                                                            | Condição                                                                                       |
| ------ | --------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 400    | —                                 | `"Campos inválidos: <path> — <mensagem>"`                                   | corpo inválido, chave desconhecida, `targetStatus` não inteiro/positivo, `justification` vazia |
| 400    | —                                 | `"Retorno ao solicitante obrigatório para status público."`                 | destino `isPublic` sem `lastTechnicalMessage`                                                  |
| 401    | —                                 | `"Token não fornecido"` / `"Token inválido ou expirado"`                    | sem sessão/sessão inválida                                                                     |
| 403    | —                                 | `"Acesso restrito ao perfil Analista ou Gestor ou Administrador"`           | perfil `Solicitante`                                                                           |
| 403    | `"INSUFFICIENT_ROLE_PERMISSIONS"` | `"Ação restrita ao Administrador ou ao Analista responsável pela demanda."` | Gestor (auditado com `"perfil Gestor é somente leitura"`) ou sem custódia                      |
| 403    | `"INSUFFICIENT_ROLE_PERMISSIONS"` | `"Status Priorizado só pode ser definido por Administrador."`               | destino restrito por não-Administrador                                                         |
| 403    | `"INSUFFICIENT_ROLE_PERMISSIONS"` | `"Só é possível definir status ativo com triageMode ou mappingMode free."`  | destino não-`free` por não-Administrador                                                       |
| 404    | —                                 | `"Protocolo não encontrado"`                                                | protocolo inexistente                                                                          |
| 404    | —                                 | `"Status de destino não encontrado"`                                        | `targetStatus` sem linha em `statuses`                                                         |
| 409    | —                                 | `"Status inativo não pode ser alvo."`                                       | destino `isActive = false`                                                                     |
| 409    | —                                 | `"Solicitação foi atualizada por outra operação"`                           | linha alterada entre leitura e escrita                                                         |
| 422    | —                                 | `"A solicitação já está neste status."`                                     | destino igual ao status atual                                                                  |
| 422    | —                                 | `"Informe o retorno ao solicitante para um status público."`                | retorno público só com espaços                                                                 |
| 500    | —                                 | `"Erro interno do servidor"`                                                | falha não prevista                                                                             |

#### Transporte

JSON; a transição atualiza `status_id`, `updated_by`, `updated_at` e, **somente
quando o destino é público**, `last_public_status_id`, `last_technical_message` e
`last_external_update_at` (`F1 src/modules/requests/statusTransition.ts:22-36`). A auditoria grava
`request.override_status_admin` para Administrador e `request.status_change` para os demais (`F1 src/modules/requests/requests.service.ts:1287-1318`).

#### Evidência

`F1 src/modules/requests/requests.router.ts:57-65`; `F1 src/modules/requests/requests.controller.ts:228-244`; `F1 src/modules/requests/requests.service.ts:1156-1330`; `F1 src/modules/requests/statusTransition.ts:18-53`.

### 9.9 GET `/requests/:protocol`

#### Request

- Path param `protocol`; sem query (`F1 src/modules/requests/requests.controller.ts:36-42`).
- Guard `requireAccessMode()` (`F1 src/modules/requests/requests.router.ts:67`).
- Modo `AUTHENTICATED`: exige sessão e confere a posse pelo e-mail do cadastro; protocolo de
  terceiro responde `404`, igual a inexistente (`F1 src/modules/requests/requests.service.ts:93-100`).

#### Response 2xx

`200` com `RequestDetail` (`F1 src/modules/DTOs/requests/RequestResponse.dto.ts:3-24`; mapeamento em `F1 src/modules/requests/requests.repository.ts:428-490`):

| Campo                  | Tipo                             | Origem/observação                                                                  |
| ---------------------- | -------------------------------- | ---------------------------------------------------------------------------------- |
| `protocol`             | string                           |                                                                                    |
| `demandTitle`          | string                           | `requests.title`; `""` se nulo                                                     |
| `processName`          | string                           | `requests.process_name`; `""` se nulo                                              |
| `status`               | string                           | status público calculado (mesmo SQL de §9.3)                                       |
| `assigneeName`         | string \| null                   | `users.full_name` do responsável da triagem                                        |
| `openedAt`             | string ISO-8601 UTC              | `requests.created_at`                                                              |
| `estimatedCompletion`  | string \| null                   | `requests.estimated_completion`, data pura `yyyy-mm-dd`                            |
| `mappingDate`          | string \| null                   | parte-data de `meeting.scheduledFor` em America/Sao_Paulo                          |
| `meeting`              | `{ scheduledFor, link }` \| null | `null` sem `meeting_scheduled_for`                                                 |
| `pendingIssues`        | string[]                         | **sempre `[]`** no código (`F1 src/modules/requests/requests.repository.ts:482`)   |
| `nextStep`             | string                           | `requests.next_steps`; default `"Aguarde o contato do analista"`                   |
| `lastTechnicalMessage` | string \| null                   | `requests.last_technical_message`                                                  |
| `lastUpdate`           | string ISO-8601 UTC              | `last_external_update_at`, senão `openedAt`                                        |
| `conclusion`           | objeto \| null                   | **sempre `null`** no código (`F1 src/modules/requests/requests.repository.ts:486`) |

```json
{
  "protocol": "MAAT-8K3P-9X2M",
  "demandTitle": "Conferência de diárias",
  "processName": "Conferência de diárias",
  "status": "Em triagem",
  "assigneeName": null,
  "openedAt": "2026-08-25T14:03:11.000Z",
  "estimatedCompletion": null,
  "mappingDate": null,
  "meeting": null,
  "pendingIssues": [],
  "nextStep": "Aguarde o contato do analista",
  "lastTechnicalMessage": null,
  "lastUpdate": "2026-08-26T10:12:40.000Z",
  "conclusion": null
}
```

#### Erros

| Status | `code` | Mensagem literal                                         | Condição                                                     | Evidência                                              |
| ------ | ------ | -------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| 400    | —      | `"Protocolo é obrigatório"`                              | protocolo vazio após `trim` (guarda defensiva)               | `F1 src/modules/requests/requests.controller.ts:73-81` |
| 401    | —      | `"Token não fornecido"` / `"Token inválido ou expirado"` | `AUTHENTICATED` sem sessão/sessão inválida                   | `F1 src/shared/middleware/auth.ts:27-45,87-95`         |
| 401    | —      | `"Sessão inválida"`                                      | usuário da sessão inexistente/inativo na resolução do dono   | `F1 src/modules/requests/requests.service.ts:71-79`    |
| 403    | —      | `"Troca de senha obrigatória antes de continuar"`        | `must_change_password`                                       | `F1 src/shared/middleware/auth.ts:49-61`               |
| 404    | —      | `"Protocolo não encontrado"`                             | protocolo inexistente **ou** de terceiro no modo autenticado | `F1 src/modules/requests/requests.service.ts:87-100`   |
| 500    | —      | `"Erro interno do servidor"`                             | falha não prevista                                           | `F1 src/shared/middleware/errorHandler.ts:32-44`       |

**Desatualizado no legado:** `F1 docs/solicitations-api-requests-0_4.md` §3 exemplifica o erro de
protocolo inexistente como `"Solicitação não encontrada"`; o código responde
`"Protocolo não encontrado"` (`F1 src/modules/requests/requests.service.ts:89-91`).

#### Transporte

JSON; sem query params; timestamps ISO-8601 UTC, `estimatedCompletion` e
`mappingDate` em `yyyy-mm-dd`.

#### Evidência

`F1 src/modules/requests/requests.router.ts:67`; `F1 src/modules/requests/requests.controller.ts:36-42`; `F1 src/modules/requests/requests.service.ts:81-103`; `F1 src/modules/requests/requests.repository.ts:422-490`.

### 9.10 GET `/requests/:protocol/internal`

#### Request

- Path param `protocol` (`F1 src/modules/requests/requests.controller.ts:61-70`).
- Auth: `authMiddleware` + `requireRole("Analista", "Gestor", "Administrador")` — o perfil
  `Solicitante` não acessa (`F1 src/modules/requests/requests.router.ts:68-75`).
- Escopo adicional no service: `Administrador` e `Gestor` veem qualquer solicitação; `Analista`
  só as atribuídas a ele, por triagem (`assignee_user_id`) ou mapeamento
  (`mapping_assignee_user_id`) (`F1 src/modules/requests/requests.service.ts:207-217`).

#### Response 2xx

`200` com `RequestInternalDetailDTO` (`F1 src/modules/DTOs/requests/RequestInternalDetail.dto.ts:62-85`):

| Campo                     | Tipo                                         | Observação                                                                                   |
| ------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `protocol`                | string                                       |                                                                                              |
| `status`                  | string                                       | **nome do status interno** (`statuses.name`), podendo ser um status não público              |
| `priority`                | string \| null                               | `priorities.level`                                                                           |
| `prioritization.score`    | number \| null                               | `prioritization_evaluations.score`                                                           |
| `prioritization.maxScore` | 50                                           | constante                                                                                    |
| `prioritization.label`    | string \| null                               | `prioritization_evaluations.classification`                                                  |
| `assignee`                | `{ id, name, email }` \| null                | `id` é `assignee_user_id` como string; `null` sem responsável                                |
| `mappingAssignee`         | `{ id, name, email }` \| null                | sempre presente no corpo; `id` é `mapping_user_id`                                           |
| `correctionAlert`         | `{ count, batchId }` \| null                 | derivado de pendências                                                                       |
| `pendingSummary`          | `{ total, requested, responded, validated }` | zeros quando a consulta de pendências falha                                                  |
| `unread`                  | `{ count, hasUnread, lastUnreadAt }`         | idem                                                                                         |
| `requester`               | `RequesterBlock`                             | `area`/`manager` com fallback `""`; `department`/`additionalContact` omitidos quando nulos   |
| `demand`                  | `DemandBlock`                                |                                                                                              |
| `operational`             | `OperationalBlock`                           | `desiredDeadline` em `yyyy-mm-dd`; `monthlyEffortHours` convertido para number               |
| `complementary`           | objeto \| ausente                            | chave omitida quando nenhum dos 5 campos foi respondido                                      |
| `schedulePreferences`     | string[] \| null                             | `yyyy-mm-ddThh:mm`, asc; `null` quando vazio                                                 |
| `mappingDate`             | string \| null                               | parte-data de `meeting.scheduledFor`                                                         |
| `meeting`                 | `{ scheduledFor, link }` \| null             |                                                                                              |
| `attachments`             | array                                        | `fileName`, `mimeType`, `sizeBytes`, `downloadUrl: null`, `canDownload: false`; **sem `id`** |
| `openedAt`                | string ISO-8601 UTC                          | `created_at`                                                                                 |
| `lastUpdate`              | string ISO-8601 UTC                          | `updated_at`                                                                                 |
| `internalObservations`    | string \| null                               | extraído de `requests.internal_notes`, descartando o wrapper `__triage`                      |

O mapeador completo está em `F1 src/modules/requests/requests.service.ts:194-374`; a extração de
notas internas em `F1 src/modules/requests/requests.service.ts:376-410`. O bloco de
pendências tem degradação silenciosa para zeros em caso de erro (`F1 src/modules/requests/requests.service.ts:236-258`).

```json
{
  "protocol": "MAAT-8K3P-9X2M",
  "status": "Aguardando mapeamento",
  "priority": "Alta",
  "prioritization": { "score": null, "maxScore": 50, "label": null },
  "assignee": {
    "id": "20",
    "name": "Pessoa Responsável",
    "email": "pessoa.responsavel@example.com"
  },
  "mappingAssignee": null,
  "correctionAlert": null,
  "pendingSummary": { "total": 0, "requested": 0, "responded": 0, "validated": 0 },
  "unread": { "count": 0, "hasUnread": false, "lastUnreadAt": null },
  "requester": {
    "fullName": "Pessoa Solicitante",
    "corporateEmail": "pessoa.solicitante@example.com",
    "area": "Financeiro",
    "department": "Contabilidade",
    "manager": "Gestor Exemplo",
    "additionalContact": "<contato-adicional>"
  },
  "demand": {
    "title": "Conferência de diárias",
    "requestType": "Automação",
    "category": "Automação",
    "processName": "Conferência de diárias",
    "description": "Conferência manual em planilha.",
    "problem": "Retrabalho por erro de digitação.",
    "expectedResult": "Reduzir o tempo de conferência.",
    "justification": "Consome cerca de 60 horas/mês."
  },
  "operational": {
    "processDescription": "RH recebe planilha por e-mail.",
    "processSteps": "1. Receber\n2. Conferir",
    "systemsUsed": "Excel, ERP",
    "executionFrequency": "Mensal",
    "volumetry": "500 transações/mês",
    "peopleInvolved": 3,
    "averageExecutionTime": "15 minutos",
    "monthlyEffortHours": 60,
    "hasManualControls": "Conferência dupla assinada pelo gestor.",
    "mainRisks": "Erro de digitação em valores.",
    "clientImpact": "Atraso no reembolso.",
    "operationalImpact": "Alto",
    "desiredDeadline": "2026-09-30",
    "perceivedCriticality": "Alta"
  },
  "complementary": {
    "hasProcessDocumentation": "Fluxo desenhado no Visio.",
    "hasSimilarSolution": false,
    "additionalNotes": "Planilha modelo anexa."
  },
  "schedulePreferences": ["2026-09-02T08:00", "2026-09-03T14:00"],
  "mappingDate": null,
  "meeting": null,
  "attachments": [
    {
      "fileName": "fluxo-atual.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 412000,
      "downloadUrl": null,
      "canDownload": false
    }
  ],
  "openedAt": "2026-07-01T09:00:00.000Z",
  "lastUpdate": "2026-07-08T12:00:00.000Z",
  "internalObservations": null
}
```

#### Erros

| Status | `code` | Mensagem literal                                                  | Condição                                                      | Evidência                                              |
| ------ | ------ | ----------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| 401    | —      | `"Token não fornecido"` / `"Token inválido ou expirado"`          | sem sessão/sessão inválida                                    | `F1 src/shared/middleware/auth.ts:27-45,87-95`         |
| 401    | —      | `"Token inválido ou expirado"`                                    | `req.user` ausente ou `id` não inteiro na montagem do ator    | `F1 src/modules/requests/requests.controller.ts:84-93` |
| 403    | —      | `"Acesso restrito ao perfil Analista ou Gestor ou Administrador"` | perfil `Solicitante`                                          | `F1 src/shared/middleware/requireRole.ts:21-22`        |
| 403    | —      | `"Acesso negado a esta solicitação"`                              | `Analista` que não é responsável de triagem nem de mapeamento | `F1 src/modules/requests/requests.service.ts:210-217`  |
| 404    | —      | `"Solicitação não encontrada"`                                    | protocolo inexistente                                         | `F1 src/modules/requests/requests.service.ts:203-205`  |
| 500    | —      | `"Erro interno do servidor"`                                      | falha não prevista                                            | `F1 src/shared/middleware/errorHandler.ts:32-44`       |

**Desatualizado no legado:** `F1 docs/requests-internal-query-contract.md` §Limitações afirma que
`meeting`/`mappingDate` e `correctionAlert` são **sempre `null`**, e o DTO documentado em §Response
200 não tem `mappingAssignee`/`pendingSummary`/`unread`; o código lê
`meeting_scheduled_for`/`meeting_link` (`F1 src/modules/requests/requests.service.ts:226-234`),
deriva o alerta de pendências (`F1 src/modules/requests/requests.service.ts:236-258`) e devolve os
três campos novos (`F1 src/modules/requests/requests.service.ts:313-318`).

**Desatualizado no legado:** o mesmo documento tipa `CorrectionAlert` como `{ count, message }`;
o DTO vigente é `{ count, batchId }` (`F1 src/modules/DTOs/requests/RequestInternalDetail.dto.ts:36-39`).

**Desatualizado no legado:** o documento tipa `Assignee.name` como `string`; o DTO aceita
`string | null` (`F1 src/modules/DTOs/requests/RequestInternalDetail.dto.ts:19-23`).

#### Transporte

JSON; `attachments[].downloadUrl` é `null` (não `""`); não há endpoint de
download; `schedulePreferences` usam `yyyy-mm-ddThh:mm` sem fuso.

#### Evidência

`F1 src/modules/requests/requests.router.ts:68-75`; `F1 src/modules/requests/requests.controller.ts:58-70`; `F1 src/modules/requests/requests.service.ts:169-410`; `F1 src/modules/requests/requests.repository.ts:492-638`.

### 9.11 PATCH `/requests/:protocol/internal`

#### Request

- Path param `protocol`.
- Auth: `authMiddleware` + `requireRole("Analista", "Gestor", "Administrador")`
  (`F1 src/modules/requests/requests.router.ts:79-84`).
- Body JSON (`F1 src/modules/requests/requests.schema.ts:143-148`):

  | Bloco           | Campos                                                                                                         | Observação                                                                                            |
  | --------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
  | `requester`     | `area`, `department?`, `manager`, `additionalContact?`                                                         | `fullName`/`corporateEmail` **não existem** no schema; se enviados, são descartados pelo strip do Zod |
  | `demand`        | `title`, `requestType`, `category`, `processName`, `description`, `problem`, `expectedResult`, `justification` | mesmos limites do POST                                                                                |
  | `operational`   | os 14 campos do POST                                                                                           | `desiredDeadline` precisa ser **hoje ou futura** em America/Sao_Paulo                                 |
  | `complementary` | os 5 campos opcionais                                                                                          | opcional                                                                                              |

- Semântica de **substituição completa**: chave ausente no payload vira `NULL` no banco, inclusive
  `complementary` omitido por inteiro (`F1 src/modules/requests/requests.repository.ts:910-978`;
  `F1 src/modules/requests/requests.service.ts:667-670`).
- `last_external_update_at` não é tocado (`F1 src/modules/requests/requests.repository.ts:911-914`).
- Chaves desconhecidas são descartadas (strip), não recusadas (`F1 src/modules/requests/requests.schema.ts:139-141`).

**Autorização de escrita:** `Administrador` e `Gestor` editam qualquer solicitação; `Analista`
apenas aquelas em que `requests.professional_id` é o seu `details_professional.professional_id`
(`F1 src/modules/requests/requests.service.ts:787-798`). Solicitação sem responsável não é
editável por Analista.

#### Response 2xx

`200` com o mesmo `RequestInternalDetailDTO` de §9.10, relido após a transação
(`F1 src/modules/requests/requests.service.ts:816-818`).

#### Erros

| Status | `code` | Mensagem literal                                                                                        | Condição                               | Evidência                                                                                                |
| ------ | ------ | ------------------------------------------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 401    | —      | `"Token não fornecido"` / `"Token inválido ou expirado"`                                                | sem sessão/sessão inválida             | `F1 src/shared/middleware/auth.ts:27-45,87-95`                                                           |
| 403    | —      | `"Acesso restrito ao perfil Analista ou Gestor ou Administrador"`                                       | perfil `Solicitante`                   | `F1 src/shared/middleware/requireRole.ts:21-22`                                                          |
| 403    | —      | `"Acesso restrito às solicitações atribuídas a você"`                                                   | `Analista` sem custódia da solicitação | `F1 src/modules/requests/requests.service.ts:791-798`                                                    |
| 404    | —      | `"Solicitação não encontrada"`                                                                          | protocolo inexistente                  | `F1 src/modules/requests/requests.service.ts:781-785`                                                    |
| 422    | —      | mensagem agregada (`"Campos obrigatórios ausentes: ..."` / `"Campos inválidos: ..."`) + `fields` objeto | corpo inválido                         | `F1 src/modules/requests/requests.controller.ts:104-108`; `F1 src/shared/validation/zodErrors.ts:99-117` |
| 500    | —      | `"Erro interno do servidor"`                                                                            | falha não prevista                     | `F1 src/shared/middleware/errorHandler.ts:32-44`                                                         |

O `422` é o único erro de validação do domínio que devolve `fields` como objeto chave→mensagem
(`F1 src/shared/middleware/errorHandler.ts:23-30`), com a chave de UI
`operational.hasManualControlsDetail` para o campo `operational.hasManualControls`
(`F1 src/shared/validation/zodErrors.ts:13-21`). Exemplo de corpo:

```json
{
  "status": "error",
  "statusCode": 422,
  "message": "Campos obrigatórios ausentes: operational.hasManualControlsDetail",
  "fields": {
    "operational.hasManualControlsDetail": "Campo obrigatório."
  }
}
```

#### Transporte

JSON; a transação grava blocos, dados editáveis do solicitante e auditoria
`request.update` com `previousValue`/`newValue` serializados (`F1 src/modules/requests/requests.service.ts:800-814`).

#### Evidência

`F1 src/modules/requests/requests.router.ts:76-84`; `F1 src/modules/requests/requests.controller.ts:95-118`; `F1 src/modules/requests/requests.service.ts:667-819`; `F1 src/modules/requests/requests.repository.ts:910-993`.

### 9.12 POST `/requests`

#### Request

- Path `/requests`; `requireAccessMode()` **antes** de `uploadFields` (`F1 src/modules/requests/requests.router.ts:86-88`).
- `multipart/form-data` com duas partes nomeadas (`F1 src/shared/middleware/upload.ts:35-38`):

  | Parte  | Nome          | Quantidade   | Conteúdo                                            |
  | ------ | ------------- | ------------ | --------------------------------------------------- |
  | JSON   | `payload`     | exatamente 1 | texto cujo valor é o JSON de `CreateRequestPayload` |
  | anexos | `attachments` | 0 a 5        | binário                                             |

- Limites do multer (`F1 src/shared/middleware/upload.ts:13-23`): 10 MB por arquivo, 5 arquivos,
  2 MB por campo de texto.
- Sem arquivos, a rota também aceita `application/json` com `payload` como string JSON; o
  `express.json` popula `req.body` antes de `uploadFields` e o multer ignora requisições não
  multipart (`F1 src/app.ts:26`; `F1 src/shared/middleware/upload.ts:48-64`).
- MIME aceito (`F1 src/shared/middleware/upload.ts:5-11`): `application/pdf`,
  `application/vnd.openxmlformats-officedocument.wordprocessingml.document`,
  `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `image/png`,
  `image/jpeg`.
- Payload JSON (`F1 src/modules/requests/requests.schema.ts:90-117`):

  | Bloco                  | Campos e limites                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
  | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
  | `requester`            | `fullName` (150), `corporateEmail` (e-mail, 254), `area` (100), `department?` (100), `manager` (150), `additionalContact?` (100)                                                                                                                                                                                                                                                                                                                                               |
  | `demand`               | `title` (150), `requestType` (80), `category` (80), `processName` (150), `description` (4.000), `problem` (4.000), `expectedResult` (4.000), `justification` (4.000)                                                                                                                                                                                                                                                                                                           |
  | `operational`          | `processDescription` (4.000), `processSteps` (4.000), `systemsUsed` (255), `executionFrequency` (50), `volumetry` (100), `peopleInvolved` (inteiro > 0), `averageExecutionTime` (60), `monthlyEffortHours` (0–99.999.999,99), `hasManualControls` (`false` ou texto 1–1.000), `mainRisks` (2.000), `clientImpact` (2.000), `operationalImpact` (`Baixo`/`Médio`/`Alto`/`Crítico`), `desiredDeadline` (`yyyy-mm-dd`), `perceivedCriticality` (`Baixa`/`Média`/`Alta`/`Crítica`) |
  | `complementary?`       | `hasProcessDocumentation?`, `hasSimilarSolution?`, `dependsOnOtherAreas?`, `handlesRestrictedInfo?`, `additionalNotes?` (2.000)                                                                                                                                                                                                                                                                                                                                                |
  | `schedulePreferences?` | 1 a 3 strings `yyyy-mm-ddThh:mm`, sem duplicatas, data de calendário válida                                                                                                                                                                                                                                                                                                                                                                                                    |

- Em modo `AUTHENTICATED`, `requester.fullName` e `requester.corporateEmail` do payload são
  **sobrescritos** pelo cadastro do usuário da sessão (`F1 src/modules/requests/requests.service.ts:111-116,125-139`); os campos continuam obrigatórios na
  validação. O vínculo `requests.requester_user_id` é gravado; em `PUBLIC` fica `NULL` (`F1 src/modules/requests/requests.repository.ts:190-203`).
- `demand.category` precisa existir em `categories` com `status = 'active'` (`F1 src/modules/requests/requests.repository.ts:55-61,306-310`). A solicitação nasce no status
  `"Solicitação enviada"` (`F1 src/modules/requests/requests.repository.ts:36,312`).
- Protocolo: `generateProtocol(request_id)` produz `MAAT-XXXX-XXXX` por cifra de Feistel/HMAC sobre
  o id interno, alfabeto `0123456789ABCDEFGHJKMNPQRSTVWXYZ` (sem `I`, `L`, `O`, `U`), 8 caracteres
  (`F1 src/shared/protocol/generateProtocol.ts:4-10,46-58`); máscara fixa `"MAAT-"` no código
  (`F1 src/shared/protocol/generateProtocol.ts:57`).
- Os arquivos são gravados em disco **antes** do insert; qualquer falha posterior remove os
  arquivos (`F1 src/modules/requests/requests.service.ts:119-122`; `F1 src/shared/storage/fileStorage.ts:14-54`).

#### Response 2xx

`201` com `CreateRequestResponse` (`F1 src/modules/requests/requests.controller.ts:149`; `F1 src/modules/DTOs/requests/RequestResponse.dto.ts:26-32`):

| Campo       | Tipo                | Observação                     |
| ----------- | ------------------- | ------------------------------ |
| `protocol`  | string              | `MAAT-XXXX-XXXX`               |
| `status`    | string              | sempre `"Solicitação enviada"` |
| `createdAt` | string ISO-8601 UTC | `requests.created_at`          |

```json
{
  "protocol": "MAAT-8K3P-9X2M",
  "status": "Solicitação enviada",
  "createdAt": "2026-08-25T14:03:11.000Z"
}
```

#### Erros

| Status | `code` | Mensagem literal                                                                                        | Condição                                                                       | Evidência                                                                                                |
| ------ | ------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| 400    | —      | `"Parte 'payload' ausente no corpo da requisição."`                                                     | parte `payload` ausente, vazia ou não textual                                  | `F1 src/modules/requests/requests.controller.ts:121-125`                                                 |
| 400    | —      | `"A parte 'payload' contém um JSON inválido."`                                                          | `JSON.parse` falha                                                             | `F1 src/modules/requests/requests.controller.ts:127-131`                                                 |
| 400    | —      | mensagem agregada `"Campos obrigatórios ausentes: <paths>"` / `"Campos inválidos: <path> — <mensagem>"` | payload fora do schema                                                         | `F1 src/modules/requests/requests.controller.ts:134-137`; `F1 src/shared/validation/zodErrors.ts:57-91`  |
| 400    | —      | `"Formato de arquivo não permitido. Aceitos: PDF, DOCX, XLSX, PNG e JPG."`                              | MIME fora da allowlist                                                         | `F1 src/shared/middleware/upload.ts:24-32`                                                               |
| 400    | —      | `"Cada anexo deve ter no máximo 10MB."`                                                                 | `LIMIT_FILE_SIZE`                                                              | `F1 src/shared/middleware/upload.ts:42-46`                                                               |
| 400    | —      | `"Máximo de 5 anexos por solicitação."`                                                                 | `LIMIT_FILE_COUNT`                                                             | idem                                                                                                     |
| 400    | —      | `"Parte de arquivo inesperada na requisição."`                                                          | `LIMIT_UNEXPECTED_FILE`                                                        | idem                                                                                                     |
| 400    | —      | `"Erro ao processar o upload dos anexos."`                                                              | outro `MulterError` (ex.: `LIMIT_FIELD_VALUE` do `payload` acima de 2 MB)      | `F1 src/shared/middleware/upload.ts:54-60`                                                               |
| 400    | —      | `"Categoria inválida — selecione uma opção da lista."`                                                  | `demand.category` não está ativa em `categories`                               | `F1 src/modules/requests/requests.repository.ts:308-310`                                                 |
| 401    | —      | `"Token não fornecido"` / `"Token inválido ou expirado"`                                                | `AUTHENTICATED` sem sessão/sessão inválida                                     | `F1 src/shared/middleware/auth.ts:27-45,87-95`                                                           |
| 401    | —      | `"Sessão inválida"`                                                                                     | usuário da sessão inativo ao resolver a identidade                             | `F1 src/modules/requests/requests.service.ts:71-79`                                                      |
| 403    | —      | `"Troca de senha obrigatória antes de continuar"`                                                       | `must_change_password`                                                         | `F1 src/shared/middleware/auth.ts:49-61`                                                                 |
| 500    | —      | `"Erro interno do servidor"`                                                                            | falha não prevista (inclusive status inicial ausente, que lança `Error` comum) | `F1 src/shared/middleware/errorHandler.ts:32-44`; `F1 src/modules/requests/requests.repository.ts:63-73` |

**Divergente (legado vigente):** MIME inválido e estouro de tamanho respondem `400`, não `415`/
`413` — convenção §9 de `docs/04-API-Conventions.md` (harmonização registrada na própria §9).

**Divergente (legado vigente):** a parte `payload` acima de 2 MiB cai em `LIMIT_FIELD_VALUE` e
recebe a mensagem genérica com `400`; a convenção §9 pede `413 payload_too_large` para a parte JSON.

**Divergente (legado vigente):** o prefixo `MAAT` é constante de código; o ADR-0008 define o
prefixo como máscara configurada no portal (`protocol_mask`).

#### Transporte

multipart ou JSON sem anexos; o `Content-Type` da parte `payload` é ignorado pelo parser de campos de
texto (`F1 docs/solicitations-api-requests-0_4.md` §1 — nota de implementação); os metadados do
anexo (`fileName`, `mimeType`, `sizeBytes`) são derivados da parte, nunca declarados no payload
(`F1 src/shared/storage/fileStorage.ts:34-40`); o nome em disco recebe um UUID, e o nome original
fica só no banco (`F1 src/shared/storage/fileStorage.ts:31-38`). `201` é o único `201` deste
domínio — todas as outras escritas respondem `200`.

#### Evidência

`F1 src/modules/requests/requests.router.ts:86-88`; `F1 src/modules/requests/requests.controller.ts:120-150`; `F1 src/shared/middleware/upload.ts:5-64`; `F1 src/modules/requests/requests.service.ts:105-139`; `F1 src/modules/requests/requests.repository.ts:173-335`; `F1 src/shared/protocol/generateProtocol.ts:46-58`.

### 9.13 Visão do consumidor (F2) e drift

O consumidor cobre 8 das 10 rotas; duas não têm chamada em F2.

| Rota                                          | Chamada em F2                                                                                 | Observação                                                                                              |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `GET /requests`                               | `listRequests` (`F2 src/lib/api/request.api.ts:44-66`)                                        | envia `search` quando presente                                                                          |
| `GET /requests/assignees`                     | **nenhuma**                                                                                   | a lista de responsáveis vem de `GET /users/analysts` (`F2 src/lib/services/assignment.service.ts:1-40`) |
| `PATCH /requests/:protocol/internal/assignee` | `assignAnalyst` (`F2 src/lib/api/request.api.ts:160-186`)                                     | envia `assigneeId` ou `mappingAssigneeId` conforme `responsibility`                                     |
| `PATCH /requests/:protocol/assignee`          | **nenhuma**                                                                                   | alias legado sem consumidor em F2                                                                       |
| `GET /requests/:protocol/tracking`            | `getPublicTracking` / `getSessionTracking` (`F2 src/lib/api/requester-tracking.api.ts:41-68`) | mesmo endpoint, credencial diferente                                                                    |
| `PATCH /requests/:protocol/status`            | `updateRequestStatus` (`F2 src/lib/api/status.api.ts:9-34`)                                   | corpo `{ targetStatus, justification, lastTechnicalMessage? }`                                          |
| `GET /requests/:protocol`                     | `getRequestByProtocol` (`F2 src/lib/api/request.api.ts:107-120`)                              | usado pela busca por protocolo (`F2 src/lib/services/request.service.ts:202-239`)                       |
| `GET /requests/:protocol/internal`            | `getInternalRequest` (`F2 src/lib/api/request.api.ts:122-133`)                                |                                                                                                         |
| `PATCH /requests/:protocol/internal`          | `updateInternalRequest` (`F2 src/lib/api/request.api.ts:137-156`)                             | comentário do F2 ainda chama o método de "proposto"                                                     |
| `POST /requests`                              | `createRequest` (`F2 src/lib/api/request.api.ts:21-42`)                                       | `FormData` com `payload` + N `attachments`                                                              |

Drift anotado, sem decisão:

- **`search` sem efeito:** F2 envia `search` em `GET /requests` (`F2 src/lib/api/request.api.ts:57`) e o tipo declara o campo (`F2 src/lib/types/request.ts:344-348`),
  mas o schema do backend não tem `search` e o `z.object` descarta a chave (§9.3).
- **`email` opcional no tipo, obrigatório em `PUBLIC`:** `ListRequestsQuery.email?` (`F2 src/lib/types/request.ts:344-348`) contra a exigência do backend em modo público (§9.3).
- **Protocolo e status tipados de forma diferente:** F2 fecha `RequestStatus` em união literal
  (`F2 src/lib/types/request.ts:4-21`) e valida protocolo só por estrutura
  (`/^[A-Za-z0-9]{1,10}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/`, `F2 src/lib/utils/validations.ts:252-256`), enquanto o backend tipa `RequestStatus = string` (`F1 src/shared/types/requests.ts:26`) e devolve o protocolo sem validação de máscara (§9.9).
- **Campos que F2 espera e o backend não devolve no DTO interno:** `assigneeDeadline` (`F2 src/lib/types/request.ts:442-443`), `mappingAssigneeId` (`F2 src/lib/types/request.ts:439-441`),
  `lastExternalUpdateAt` (`F2 src/lib/types/request.ts:463`), `lastTechnicalMessage` (`F2 src/lib/types/request.ts:466`), `triage` (`F2 src/lib/types/request.ts:468`) e
  `prioritization.notes` (`F2 src/lib/types/request.ts:401-407`). O DTO de `F1` não tem esses
  campos (`F1 src/modules/DTOs/requests/RequestInternalDetail.dto.ts:62-85`).
- **Campos que o backend devolve e F2 marca como opcionais:** `correctionAlert`,
  `pendingSummary`, `unread` (`F2 src/lib/types/request.ts:444-449`) são sempre emitidos por
  `F1` (`F1 src/modules/requests/requests.service.ts:313-318`).
- **`RequestSummary.demandTitle?`:** declarado opcional em F2 (`F2 src/lib/types/request.ts:358-367`) e nunca emitido pelo backend (§9.3).
- **Retirada de responsável não é exercitada:** `assignAnalyst` sempre envia um id string e nunca
  `null` (`F2 src/lib/api/request.api.ts:172-183`); o caminho de remoção existe só no backend
  (§9.5).
- **`assigneeDeadline` enviado ao mock, não ao backend:** a assinatura carrega o prazo e há `TODO`
  explícito para incluí-lo no payload quando o contrato suportar (`F2 src/lib/api/request.api.ts:164-176`); `assignRequestSchema`/`assignAnalystSchema` não têm esse
  campo (`F1 src/modules/requests/requests.schema.ts:175-202`).
- **Acompanhamento convive com o detalhe público:** a página `/acompanhar/[protocolo]` usa
  `tracking` (`F2 src/routes/(public)/acompanhar/[protocolo]/+page.svelte:97-98,161-162`), e a
  busca por protocolo continua usando `GET /requests/:protocol` (`F2 src/lib/services/request.service.ts:223-224`).
- **Tradução de erro no consumidor:** F2 troca a mensagem do backend por texto próprio em vários
  fluxos, por exemplo `"Não foi possível carregar as solicitações."` (`F2 src/lib/services/request.service.ts:50-58`) e
  `"Você não tem permissão para atribuir um analista."` para `403` (`F2 src/lib/services/assignment.service.ts:90-97`).

### 9.14 Confronto com `docs/04-API-Conventions.md`

| Convenção                                                   | Legado nesta seção                                                                                   | Confronto                                            |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| §1 base path `/api/v1`                                      | rotas na raiz (`F1 src/router.ts:24`)                                                                | Divergente (legado vigente)                          |
| §2 envelope de erro                                         | `{ status, statusCode, message }` + `code` aditivo                                                   | Compatível                                           |
| §2.3/§11 `code` em `snake_case`                             | `"INSUFFICIENT_ROLE_PERMISSIONS"` em maiúsculas (`F1 src/modules/requests/requests.service.ts:891`)  | Divergente (legado vigente)                          |
| §3 validação `400` + `fields` array                         | `422` + `fields` objeto em `PATCH .../internal` (§9.11); `400` + mensagem agregada nas demais        | Divergente (legado vigente) — C2; spec de `requests` |
| §4/§4.2 paginação `20`/`100` + clamp                        | `GET /requests` usa `10`/`10` e não faz clamp (`F1 src/modules/requests/requests.schema.ts:155-165`) | Divergente (legado vigente)                          |
| §4.3 listagem não paginada                                  | `GET /requests/assignees` sem paginação e sem linha de exceção (§9.4)                                | Divergente (legado vigente)                          |
| §8.1 concorrência com `targetStatusKey`/`expectedStatusKey` | `targetStatus` numérico e precondição lida no servidor (§9.8)                                        | Divergente (legado vigente)                          |
| §8.2 idempotência                                           | `POST` não idempotente; `PATCH` de status repetido devolve `422`, não `409`                          | Divergente (legado vigente)                          |
| §9 content types e multipart                                | MIME e tamanho respondem `400`; parte JSON grande responde `400` genérico (§9.12)                    | Divergente (legado vigente)                          |
| §10 datas                                                   | timestamps ISO-8601 UTC; `desiredDeadline`/`mappingDate`/`estimatedCompletion` em `yyyy-mm-dd`       | Compatível                                           |
| §11 idioma                                                  | chaves camelCase, valores pt-BR                                                                      | Compatível (exceto `code`, acima)                    |
| §12 `x-request-id`                                          | ausente                                                                                              | Divergente (legado vigente) — ver §3.10              |
| §13 rate limit do tracking                                  | rota sem limite próprio; o gate do `verify` não é verificado no servidor (§9.7)                      | Divergente (legado vigente)                          |
| §15.1 status por `key`, sem id numérico no wire             | `targetStatus` é `status_id` numérico (§9.8)                                                         | Divergente (legado vigente) — ADR-0021               |
| §15.3 header do solicitante                                 | `X-Requester-Identity` com nome+e-mail e `401` genérico (§9.7)                                       | Divergente (legado vigente) — ADR-0023               |
| §15.4 códigos de sucesso                                    | `200` em leitura/atualização, `201` só na criação (§9.12)                                            | Compatível                                           |
| ADR-0008 máscara de protocolo                               | prefixo `MAAT` fixo no código (§9.12)                                                                | Divergente (legado vigente)                          |
| ADR-0017 Gestor somente leitura                             | Gestor recebe `403` ao atribuir e ao trocar status (§9.5, §9.6, §9.8)                                | Compatível                                           |

## 10. triage

Leitura da triagem vigente e gravação append-only; o veredito move o status da solicitação.

### 10.1 Fontes

| Ref | Caminho                                                                       | Uso                                                                      |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| F1  | `src/modules/requests/triage/triage.router.ts`                                | montagem, autenticação e perfis                                          |
| F1  | `src/modules/requests/triage/triage.controller.ts`                            | handlers, validação de body e de path                                    |
| F1  | `src/modules/requests/triage/triage.schema.ts`                                | `TriageAssessment`, `CreateTriagePayload` e `createTriagePayloadSchema`  |
| F1  | `src/modules/requests/triage/triage.service.ts`                               | autorização, resoluções de banco, efeitos e auditoria                    |
| F1  | `src/modules/requests/triage/triage.repository.ts`                            | leitura da triagem vigente, resolução de status/categoria, transação     |
| F1  | `src/modules/DTOs/internalNotes/InternalNotes.dto.ts`                         | histórico `triages[]` (consumidor da mesma entidade)                     |
| F1  | `src/modules/DTOs/requests/RequestResponse.dto.ts`                            | `conclusion.result` no detalhe público (campo distinto, não é a triagem) |
| F1  | `docs/contract-triage_04.md`                                                  | contrato do legado (parcialmente desatualizado — ver §10.4 e §10.5)      |
| F1  | `docs/internal-observations.md`                                               | histórico completo em `triages[]` (§1 do documento)                      |
| F2  | `src/lib/api/triage.api.ts`                                                   | chamadas HTTP                                                            |
| F2  | `src/lib/types/triage.ts`                                                     | tipos e `createEmptyTriageAssessment`                                    |
| F2  | `src/lib/services/triage.service.ts`                                          | tradução de erro por status                                              |
| F2  | `src/routes/(admin)/fila/[protocolo]/components/triagem/triage-validation.ts` | espelho da validação no cliente                                          |
| F2  | `src/routes/(admin)/fila/[protocolo]/components/triagem/TriageSection.svelte` | gate de prioridade e modo somente leitura                                |

Não existe DTO de triagem em `F1 src/modules/DTOs/requests/*`: o contrato do recurso é o tipo `TriageAssessment` de `F1 src/modules/requests/triage/triage.schema.ts:9-24`, reutilizado pelo histórico de `internal-notes` (`F1 src/modules/DTOs/internalNotes/InternalNotes.dto.ts:6,42-56`).

### 10.2 Rotas

| #   | Método | Path                         | Autenticação/autorização                                                                                                 | Handler      | Sucesso                            | Erros                                           |
| --- | ------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------ | ---------------------------------- | ----------------------------------------------- |
| 33  | GET    | `/requests/:protocol/triage` | sessão (`authMiddleware`) + `requireRole("Analista", "Gestor", "Administrador")`; Analista restrito ao responsável atual | `getTriage`  | `200` `TriageAssessment` ou `null` | `400`, `401`, `403`, `404`, `500`               |
| 34  | POST   | `/requests/:protocol/triage` | sessão + `requireRole("Administrador", "Analista")`; escrita restrita a Administrador ou Analista responsável            | `saveTriage` | `201` `TriageAssessment`           | `400`, `401`, `403`, `404`, `409`, `422`, `500` |

- O router aplica `authMiddleware` a todas as rotas (`F1 src/modules/requests/triage/triage.router.ts:8`); o path é montado sob `/requests` (`F1 src/router.ts:24-25`).
- Gestor é somente leitura: não está na lista de perfis do POST (`F1 src/modules/requests/triage/triage.router.ts:17-19`).
- "Responsável" é `requests.professional_id` resolvido para `details_professional.user_id`, comparado com o `user_id` numérico do ator (`F1 src/modules/requests/triage/triage.repository.ts:30-46`; `F1 src/modules/requests/triage/triage.service.ts:16-20`).

### 10.3 GET `/requests/:protocol/triage`

#### Request

| Parte   | Conteúdo                                                                                                                               |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Path    | `protocol` — `z.string().trim().min(1, "Protocolo é obrigatório.")` (`F1 src/modules/requests/triage/triage.controller.ts:9-11,31-38`) |
| Query   | nenhuma                                                                                                                                |
| Body    | não há                                                                                                                                 |
| Headers | cookie de sessão (`session_id`)                                                                                                        |

O `400` de path é produzido por `formatZodIssues` (`F1 src/modules/requests/triage/triage.controller.ts:33-35`), mas o padrão de rota `/:protocol/triage` não casa com protocolo vazio — na prática o `400` não é alcançável por HTTP.

#### Autorização

1. `requireRole("Analista", "Gestor", "Administrador")` — outro perfil recebe `403 "Acesso restrito ao perfil Analista ou Gestor ou Administrador"` (`F1 src/shared/middleware/requireRole.ts:21-22`); sessão em `must_change_password` recebe `403 "Troca de senha obrigatória antes de continuar"` (`F1 src/shared/middleware/requireRole.ts:11-13`).
2. Protocolo inexistente → `404 "Protocolo não encontrado"` (`F1 src/modules/requests/triage/triage.service.ts:44-47`).
3. `Gestor` acessa qualquer solicitação; `Administrador` e `Analista` passam por `isAdminOrAssignee` (`F1 src/modules/requests/triage/triage.service.ts:16-20,51-55`). Sem custódia (ou solicitação sem responsável) → `403 "Acesso negado a esta solicitação"` (`F1 src/modules/requests/triage/triage.service.ts:53-55`).
4. A leitura **não** aplica os gates de status terminal ou de status restrito (`Priorizado`) e **não** audita a negação — diferente do POST (`F1 src/modules/requests/triage/triage.service.ts:43-58`).

#### Response 200

`TriageAssessment` da triagem vigente, ou o literal `null` quando a solicitação nunca foi triada (`F1 src/modules/requests/triage/triage.service.ts:57`; `F1 src/modules/requests/triage/triage.controller.ts:46`).

| Campo                               | Tipo                                                                          | Origem/regra                                                                                                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                | `string` (uuid v4)                                                            | `triages.triage_id`, gerado no POST (`F1 src/modules/requests/triage/triage.service.ts:139`)                                                                      |
| `adherentToScope`                   | `"Sim" \| "Não" \| ""`                                                        | coluna `adherent_to_scope`                                                                                                                                        |
| `adherentJustification`             | `string` (≤ 1000)                                                             | `""` quando `adherentToScope !== "Não"`                                                                                                                           |
| `changeCategory`                    | `"Sim" \| "Não" \| ""`                                                        | coluna `change_category`                                                                                                                                          |
| `newCategory`                       | `string` (≤ 40)                                                               | nome canônico da categoria; `""` quando `changeCategory !== "Sim"`                                                                                                |
| `preliminaryComplexity`             | `string` (≤ 4000)                                                             | `""` quando `adherentToScope !== "Sim"`                                                                                                                           |
| `perceivedRisks`                    | `string` (≤ 4000)                                                             | idem                                                                                                                                                              |
| `suggestedResponsible`              | `string` (≤ 150)                                                              | sugestão do analista, não o autor                                                                                                                                 |
| `suggestedResponsibleJustification` | `string` (≤ 1000)                                                             |                                                                                                                                                                   |
| `exitStatus`                        | `number`                                                                      | `statuses.status_id` numérico (não a `name` e não um literal de `TriageResult`)                                                                                   |
| `result`                            | `string` (≤ 1000)                                                             | **existe** no corpo e é persistido em `triages.result` (`F1 src/modules/requests/triage/triage.repository.ts:39,100`)                                             |
| `conclusionJustification`           | `string` (≤ 4000)                                                             |                                                                                                                                                                   |
| `assignee`                          | `{ id: string \| null, name: string \| null, email: string \| null } \| null` | snapshot do autor do POST; `null` só quando `assignee_user_id` e `assignee_name` são ambos `null` (`F1 src/modules/requests/triage/triage.repository.ts:102-109`) |
| `lastTechnicalMessage`              | `string \| null`                                                              | retorno ao solicitante; `null` quando o status de saída não é público (`F1 src/modules/requests/triage/triage.repository.ts:110`)                                 |

- Não há timestamp no corpo: `occurredAt` da triagem não é exposto por esta rota (a proveniência vive no `audit_history` — `F1 src/modules/requests/triage/triage.repository.ts:230-235`).
- `assignee.id` é `String(users.user_id)`; o `professional_id` (uuid) não aparece na triagem.
- Nome de campo `exitStatus` numérico: o valor é id de `statuses`, não a `key` (ver §10.7).

#### Erros

| Status | Mensagem literal                                                  | Condição                                                               | Evidência                                                   |
| ------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------- |
| 400    | `"Protocolo é obrigatório."`                                      | protocolo vazio (guarda defensiva; `/:protocol` vazio não casa a rota) | `F1 src/modules/requests/triage/triage.controller.ts:31-37` |
| 401    | `"Token não fornecido"`                                           | sem cookie                                                             | `F1 src/shared/middleware/auth.ts:27-45`                    |
| 401    | `"Token inválido ou expirado"`                                    | token inválido/expirado/usuário inativo                                | `F1 src/shared/middleware/auth.ts:87-95`                    |
| 403    | `"Troca de senha obrigatória antes de continuar"`                 | `must_change_password`                                                 | `F1 src/shared/middleware/requireRole.ts:11-13`             |
| 403    | `"Acesso restrito ao perfil Analista ou Gestor ou Administrador"` | perfil fora da lista                                                   | `F1 src/shared/middleware/requireRole.ts:21-22`             |
| 404    | `"Protocolo não encontrado"`                                      | protocolo inexistente                                                  | `F1 src/modules/requests/triage/triage.service.ts:44-47`    |
| 403    | `"Acesso negado a esta solicitação"`                              | Analista sem custódia                                                  | `F1 src/modules/requests/triage/triage.service.ts:53-55`    |
| 500    | `"Erro interno do servidor"`                                      | falha não prevista                                                     | `F1 src/shared/middleware/errorHandler.ts:32-44`            |

O `403` da leitura é `AppError` sem `code` (`F1 src/modules/requests/triage/triage.service.ts:54`), ao contrário do `403` da escrita.

#### Transporte

JSON `200`; sem paginação e sem multipart. O `protocol` vem do path e não há query.

#### Evidência

`F1 src/modules/requests/triage/triage.router.ts:12-16`;
`F1 src/modules/requests/triage/triage.controller.ts:31-47`;
`F1 src/modules/requests/triage/triage.service.ts:22-60`.

### 10.4 POST `/requests/:protocol/triage`

#### Request

`Content-Type: application/json`. Body validado por `createTriagePayloadSchema`, um objeto `.strict()` (`F1 src/modules/requests/triage/triage.schema.ts:42-79`): chave não prevista é rejeitada. Em particular **`assignee` não é aceito** — o autor vem da sessão — e `id` também não.

| Campo                               | Tipo/limite                              | Obrigatório                    | Observação                                                                                                |
| ----------------------------------- | ---------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `adherentToScope`                   | `"Sim" \| "Não" \| ""`                   | sim; `""` rejeitado            | `"Informe se a demanda é aderente ao escopo"` (`F1 src/modules/requests/triage/triage.schema.ts:81-87`)   |
| `adherentJustification`             | string, trim, ≤ 1000, default `""`       | se `adherentToScope === "Não"` | `"Informe a justificativa quando não aderente ao escopo"` (`:97-103`)                                     |
| `changeCategory`                    | `"Sim" \| "Não" \| ""`                   | sim; `""` rejeitado            | `"Informe se houve troca de categoria"` (`:89-95`)                                                        |
| `newCategory`                       | string, trim, ≤ 40, default `""`         | se `changeCategory === "Sim"`  | `"Selecione a categoria de destino"` (`:105-111`); name-string do cadastro ativo                          |
| `preliminaryComplexity`             | string, trim, ≤ 4000, default `""`       | se `adherentToScope === "Sim"` | `"Descreva a complexidade preliminar"` (`:113-119`)                                                       |
| `perceivedRisks`                    | string, trim, ≤ 4000, default `""`       | se `adherentToScope === "Sim"` | `"Descreva os riscos percebidos"` (`:121-127`)                                                            |
| `suggestedResponsible`              | string, trim, ≤ 150, default `""`        | não                            | `"Máximo de 150 caracteres."`                                                                             |
| `suggestedResponsibleJustification` | string, trim, ≤ 1000, default `""`       | não                            |                                                                                                           |
| `exitStatus`                        | inteiro positivo (`number`)              | sim                            | `"Selecione o status de saída"` (ausente) / `"Status de saída inválido."` (não inteiro ou ≤ 0) (`:57-60`) |
| `result`                            | string, trim, 1..1000                    | sim                            | `"Informe o resultado da triagem"` / `"Máximo de 1.000 caracteres."` (`:61-65`)                           |
| `conclusionJustification`           | string, trim, 1..4000                    | sim                            | `"Informe a justificativa final"` / `"Máximo de 4.000 caracteres."` (`:66-70`)                            |
| `lastTechnicalMessage`              | string, trim, 1..4000, `null` ou ausente | condicional                    | `"Informe o retorno ao solicitante"`; exigido de fato quando o status de saída é público (`:71-77`)       |

Limpeza condicional feita no próprio schema: `newCategory` vira `""` quando `changeCategory !== "Sim"` e `adherentJustification` vira `""` quando `adherentToScope !== "Não"` (`F1 src/modules/requests/triage/triage.schema.ts:129-135`). O trim é feito de novo no service (`F1 src/modules/requests/triage/triage.service.ts:141-157`).

Body fora do schema → `422` com `message` agregada (`"Campos obrigatórios ausentes: …"`, `"Campos inválidos: <campo> — <mensagem>"`) e `fields` como **objeto** campo → mensagem (`F1 src/shared/validation/zodErrors.ts:57-117`; `F1 src/modules/requests/triage/triage.controller.ts:53-57`).

#### Ordem das checagens no service

1. Protocolo inexistente → `404 "Protocolo não encontrado"` (`F1 src/modules/requests/triage/triage.service.ts:66-69`).
2. Status terminal (`statuses.is_terminal`) → `422 "Solicitação encerrada."` (`:74-76`). Não há reabertura.
3. Status restrito (`statuses.is_restricted`, "Priorizado") e ator não-Administrador → auditoria `request.access_denied` com `note` `"Triagem negada: solicitação priorizada"` e `403 "Ação restrita ao Administrador ou ao Analista responsável pela demanda."` com `code: "INSUFFICIENT_ROLE_PERMISSIONS"` (`:78-85`; `:22-41`).
4. Sem custódia (`isAdminOrAssignee`) → auditoria `request.access_denied` com `note` `"Triagem negada: sem custódia da solicitação"` e o mesmo `403`/`code` (`:87-95`).
5. `exitStatus` resolvido contra `statuses` — ver abaixo.
6. `lastTechnicalMessage` obrigatório se o status de saída for público.
7. `newCategory` resolvida quando `changeCategory === "Sim"`.
8. Transação única: insert em `triages`, update da solicitação, auditoria e liberação do responsável.

#### Regra do `exitStatus`

`resolveExitStatus` aceita **apenas** status com `is_active = true`, `is_restricted = false` e `triage_mode = 'conclusion_only'`, casando `status_id` numérico (`F1 src/modules/requests/triage/triage.repository.ts:137-154`). Não há aceitação de nome/literal antigo (`F1 src/modules/requests/triage/triage.repository.ts:141-143`).

Falha → `422` `message: "Validação falhou"` e `fields.exitStatus: "Status de saída deve ser um status ativo com triageMode conclusion_only e isRestricted=false"` (`F1 src/modules/requests/triage/triage.service.ts:102-111`).

**Desatualizado no legado:** `F1 docs/contract-triage_04.md` §1/§4 e `F1 docs/contract-triage_04.md` "Observações" dizem `triageMode IN ('conclusion_only','free')` e o comentário de `F1 src/modules/requests/triage/triage.schema.ts:53-56` repete isso; o código filtra **só** `conclusion_only`. A mensagem de erro do documento (`"Status de saída deve ser um status ativo elegível para triagem"`) também não é a do código.

#### `lastTechnicalMessage`

- Obrigatório quando `exitStatus.is_public` é verdadeiro: ausente/`null` → `422` `"Validação falhou"` com `fields.lastTechnicalMessage: "Retorno ao solicitante obrigatório para status público (1..4000 caracteres)."` (`F1 src/modules/requests/triage/triage.service.ts:112-120`; `F1 src/modules/requests/triage/triage.repository.ts:197-204`).
- Quando o status não é público, o valor é descartado: a triagem e o `audit_history` recebem `null` (`F1 src/modules/requests/triage/triage.service.ts:154-157`; `F1 src/modules/requests/triage/triage.repository.ts:305-308`).

#### `newCategory`

Resolvida por nome exato contra `categories` com `status = 'active'` (`F1 src/modules/requests/triage/triage.repository.ts:156-168`). Não encontrada → `422` `fields.newCategory: "Categoria de destino inválida ou inativa"` (`F1 src/modules/requests/triage/triage.service.ts:124-131`). O nome **canônico** do cadastro é o persistido em `triages.new_category` e em `requests.category_id` (`F1 src/modules/requests/triage/triage.service.ts:132-135,144`; `F1 src/modules/requests/triage/triage.repository.ts:206-208`).

O comentário de `F1 src/modules/requests/triage/triage.service.ts:133-135` menciona compatibilidade com id numérico, mas a resolução compara apenas `name` (`F1 src/modules/requests/triage/triage.repository.ts:161-167`) — um id numérico não resolve.

#### Response 201

Mesmo shape do GET (`§10.3`), com duas diferenças:

- `assignee` é sempre objeto, com o snapshot de quem executou: `{ id: String(actor.id), name, email }` (`F1 src/modules/requests/triage/triage.service.ts:153`).
- `lastTechnicalMessage` só vem preenchido quando o status de saída é público (`F1 src/modules/requests/triage/triage.service.ts:154-157`).

```json
{
  "id": "b1c0f0a2-7d55-4a4e-9a3e-5d0d1f2a9c11",
  "adherentToScope": "Sim",
  "adherentJustification": "",
  "changeCategory": "Não",
  "newCategory": "",
  "preliminaryComplexity": "Média — depende de integração com sistema externo",
  "perceivedRisks": "Divergência de dados entre as bases",
  "suggestedResponsible": "Pessoa Analista",
  "suggestedResponsibleJustification": "Experiência prévia no processo",
  "exitStatus": 5,
  "result": "Encaminhada para mapeamento",
  "conclusionJustification": "Demanda aderente ao escopo",
  "assignee": {
    "id": "20",
    "name": "Pessoa Responsável",
    "email": "pessoa.responsavel@example.com"
  },
  "lastTechnicalMessage": null
}
```

#### Efeitos colaterais (mesma transação)

| Efeito                   | Regra                                                                                                                                                                          | Evidência                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| append em `triages`      | uma linha por POST, `triage_id` = uuid gerado no service                                                                                                                       | `F1 src/modules/requests/triage/triage.repository.ts:236-263`; `F1 migrations/requester_request/20260923000000_create_triages.js` |
| status da solicitação    | passa a `exitStatus` (grava `status_id`)                                                                                                                                       | `F1 src/modules/requests/triage/triage.repository.ts:183-187,210-213`                                                             |
| categoria                | `requests.category_id` atualizado quando `changeCategory === "Sim"`                                                                                                            | `F1 src/modules/requests/triage/triage.repository.ts:206-208`                                                                     |
| status público           | grava `last_public_status_id`, `last_technical_message` e `last_external_update_at`                                                                                            | `F1 src/modules/requests/triage/triage.repository.ts:197-204`                                                                     |
| liberação do responsável | **sempre** na conclusão: `requests.professional_id = null` (`applyRequestOutcome` chamado com `releaseAssignee: true`)                                                         | `F1 src/modules/requests/triage/triage.repository.ts:189-195,288`                                                                 |
| auditoria da triagem     | `request.triage`, `previousValue` `{status, category}`, `newValue` `{triageId, exitStatus, status}`, `note` = `conclusionJustification`, `changeOrigin` `"admin"`/`"internal"` | `F1 src/modules/requests/triage/triage.repository.ts:291-311`; `F1 src/modules/requests/triage/triage.service.ts:171-179`         |
| auditoria da liberação   | `request.unassign`, `previousValue` = `user_id` anterior, `changeOrigin: "system"`, só quando havia vínculo                                                                    | `F1 src/modules/requests/triage/triage.repository.ts:313-327`                                                                     |

O evento `request.unassign` é emitido com base em `professional_id !== null` da leitura do contexto, não no status de destino; a solicitação fica órfã mesmo quando o status de saída não é terminal (`F1 src/modules/requests/triage/triage.repository.ts:193-195,316-327`; `F1 src/modules/requests/triage/triage.service.ts:170`).

#### Erros

| Status | Corpo/mensagem literal                                                                                                | Condição                                                             | Evidência                                                                                             |
| ------ | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 401    | `"Token não fornecido"` / `"Token inválido ou expirado"`                                                              | sessão                                                               | `F1 src/shared/middleware/auth.ts:27-45,87-95`                                                        |
| 403    | `"Troca de senha obrigatória antes de continuar"`                                                                     | `must_change_password`                                               | `F1 src/shared/middleware/requireRole.ts:11-13`                                                       |
| 403    | `"Acesso restrito ao perfil Administrador ou Analista"`                                                               | Gestor, Solicitante                                                  | `F1 src/modules/requests/triage/triage.router.ts:19`; `F1 src/shared/middleware/requireRole.ts:21-22` |
| 404    | `"Protocolo não encontrado"`                                                                                          | protocolo inexistente                                                | `F1 src/modules/requests/triage/triage.service.ts:66-69`                                              |
| 422    | `"Solicitação encerrada."`                                                                                            | status terminal                                                      | `F1 src/modules/requests/triage/triage.service.ts:74-76`                                              |
| 403    | `"Ação restrita ao Administrador ou ao Analista responsável pela demanda."` + `code: "INSUFFICIENT_ROLE_PERMISSIONS"` | status restrito (não-Admin) ou sem custódia                          | `F1 src/modules/requests/triage/triage.service.ts:78-95`                                              |
| 422    | `"Campos obrigatórios ausentes: …"` / `"Campos inválidos: …"` + `fields`                                              | body fora do schema                                                  | `F1 src/modules/requests/triage/triage.controller.ts:52-57`                                           |
| 422    | `"Validação falhou"` + `fields`                                                                                       | `exitStatus` inelegível, categoria inválida, retorno público ausente | `F1 src/modules/requests/triage/triage.service.ts:102-131`                                            |
| 409    | `"Solicitação foi atualizada por outra operação."`                                                                    | `status_id` mudou entre a leitura e o update                         | `F1 src/modules/requests/triage/triage.repository.ts:210-217`                                         |

O `409` não é uma precondição enviada pelo cliente: o `expectedStatusId` é lido do próprio banco no início do POST (`F1 src/modules/requests/triage/triage.service.ts:168`). Não há `Idempotency-Key`; repetir o POST cria outra triagem.

#### Transporte

JSON puro, sem multipart e sem paginação. Não há campo de data no request nem no response. O `ip` da requisição é gravado na auditoria (`F1 src/modules/requests/triage/triage.controller.ts:59`; `F1 src/modules/requests/triage/triage.service.ts:64`).

### 10.5 Semântica de append-only e triagem vigente

- `triages` é histórico versionado: cada POST insere uma linha; não há update nem delete (`F1 src/modules/requests/triage/triage.repository.ts:230-263`; cabeçalho da migration `F1 migrations/requester_request/20260923000000_create_triages.js`).
- A "triagem vigente" é a **última**, e o critério de ordem é a auditoria, não o uuid: `audit_history` com `entity_type = 'request'`, `action_type = 'request.triage'`, junção por `new_value->>'triageId'`, ordenado por `occurred_at desc, audit_id desc` (`F1 src/modules/requests/triage/triage.repository.ts:114-135`).
- Não há unicidade por solicitação: "nunca duas triagens simultâneas" é regra de fluxo declarada no contrato (`F1 docs/contract-triage_04.md` §1), não constraint de banco (`F1 src/modules/requests/triage/triage.repository.ts:114-120`).
- O histórico completo (`triages[]`, `oldest → newest`) é servido por `GET /requests/:protocol/internal-notes` (§17 deste documento) — `F1 src/modules/DTOs/internalNotes/InternalNotes.dto.ts:42-56`; `F1 docs/internal-observations.md` §1.
- O detalhe público `GET /requests/:protocol` expõe `conclusion.result` tipado como `TriageResult` (sete literais antigos), que **não** é a triagem (`F1 src/modules/DTOs/requests/RequestResponse.dto.ts:20-23`; `F1 src/shared/types/requests.ts:45-52`). `GET /requests/:protocol/internal` não embute triagem (`F1 src/modules/DTOs/requests/RequestInternalDetail.dto.ts:1-4`).

**Desatualizado no legado:** em `F1 docs/contract-triage_04.md`, com o código do mesmo commit como referência:

- §Tipos declara `TriageAssessment` sem `assignee` e sem `lastTechnicalMessage`, e `CreateTriagePayload = Omit<TriageAssessment, "id">` (§1) — os dois campos existem no código, na resposta e no body opcional (`F1 src/modules/requests/triage/triage.schema.ts:3-31,42-79`).
- Os exemplos de response `201` (§1) e `200` (§2) não trazem `assignee` nem `lastTechnicalMessage`, ambos presentes no código (`F1 src/modules/requests/triage/triage.service.ts:138-158`).
- §1 e §Observações dão a mensagem de `exitStatus` inelegível como `"Status de saída deve ser um status ativo elegível para triagem"`; o código devolve `"Status de saída deve ser um status ativo com triageMode conclusion_only e isRestricted=false"` (§10.4).
- §4 e §Observações aceitam `triageMode` `conclusion_only` **ou** `free`; o repositório filtra apenas `conclusion_only` (§10.4).
- §4 afirma que `isRestricted` bloqueia triagem "de qualquer perfil"; no POST de triagem o `Administrador` passa (§10.4). No mapeamento o bloqueio vale para todos os perfis (§11.4).
- A tabela de erros do §2 diz que o `403` do GET segue "mesma regra `Admin|assignee`"; o código concede leitura ao `Gestor` (`F1 src/modules/requests/triage/triage.service.ts:49-55`).

### 10.6 Visão do consumidor (F2) e drift

`F2 src/lib/api/triage.api.ts:7-45` chama exatamente `POST`/`GET /requests/{protocol}/triage` (protocolo com `encodeURIComponent`), com `credentials: 'include'` herdado de `F2 src/lib/api/client.ts:55-62`, e devolve `TriageAssessment` / `TriageAssessment | null` — alinhado ao backend.

Drift observado (sem decisão):

| Ponto                             | F2                                                                                                                                                                                                                                                                        | Backend (F1)                                                                                                                    | Evidência                                                                                                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exitStatus` no tipo              | `number \| ''`                                                                                                                                                                                                                                                            | sempre `number` na resposta                                                                                                     | `F2 src/lib/types/triage.ts:13`; `F1 src/modules/requests/triage/triage.service.ts:150`                                                                                                         |
| `assignee`                        | opcional, `email?` opcional                                                                                                                                                                                                                                               | sempre presente no POST; `email` sempre `string \| null`                                                                        | `F2 src/lib/types/triage.ts:22`; `F1 src/modules/requests/triage/triage.service.ts:153`                                                                                                         |
| `CreateTriagePayload`             | omite `id` e `assignee`                                                                                                                                                                                                                                                   | o tipo do backend também remove `lastTechnicalMessage` e o reabre como opcional; o schema `.strict()` rejeita `id` e `assignee` | `F2 src/lib/types/triage.ts:27`; `F1 src/modules/requests/triage/triage.schema.ts:26-31,42-79`                                                                                                  |
| `lastTechnicalMessage` no tipo    | `string` opcional (não anulável)                                                                                                                                                                                                                                          | `string \| null` na resposta                                                                                                    | `F2 src/lib/types/triage.ts:17`; `F1 src/modules/requests/triage/triage.schema.ts:23`                                                                                                           |
| `lastTechnicalMessage` no payload | enviado **só** quando o status escolhido é público                                                                                                                                                                                                                        | exigido quando público; descartado quando não público                                                                           | `F2 src/routes/(admin)/fila/[protocolo]/components/triagem/triage-validation.ts:70-72`; `F1 src/modules/requests/triage/triage.service.ts:112-120,154-157`                                      |
| Priorização antes de finalizar    | bloqueia o envio com `"Calcule a prioridade antes de finalizar a triagem."`                                                                                                                                                                                               | o POST não verifica priorização                                                                                                 | `F2 src/routes/(admin)/fila/[protocolo]/components/triagem/TriageSection.svelte:169-179,283-285,302-304`; `F1 src/modules/requests/triage/triage.service.ts:60-182`                             |
| Mensagens de erro                 | substitui pelo status: 404 `"Solicitação não encontrada."`, 403 `"Você não tem permissão para realizar a triagem."`, resto `"Não foi possível salvar a triagem."` (GET: `"Você não tem permissão para visualizar a triagem."` / `"Não foi possível carregar a triagem."`) | mensagens literais do §10.4 (ex.: `"Solicitação encerrada."`, `"Protocolo não encontrado"`)                                     | `F2 src/lib/services/triage.service.ts:15-20,36-41`                                                                                                                                             |
| `422` de regra de negócio         | cai no genérico `"Não foi possível salvar a triagem."`                                                                                                                                                                                                                    | `"Solicitação encerrada."` / `"Validação falhou"` + `fields`                                                                    | `F2 src/lib/services/triage.service.ts:14-23`                                                                                                                                                   |
| Estado finalizado                 | somente leitura quando o GET devolve objeto; edição conforme `canEditSolicitation` (Admin ou responsável)                                                                                                                                                                 | GET permitido a Gestor; POST restrito a Admin ou responsável                                                                    | `F2 src/routes/(admin)/fila/[protocolo]/components/triagem/TriageSection.svelte:56-71`; `F2 src/lib/services/access.service.ts:35-42`; `F1 src/modules/requests/triage/triage.service.ts:51-55` |
| Validação local                   | replica limites e condicionais, com mensagens próprias (ex.: `"Selecione o status de saída."`, `"Informe o resultado."`)                                                                                                                                                  | mensagens do schema (`"Informe o resultado da triagem"`)                                                                        | `F2 src/routes/(admin)/fila/[protocolo]/components/triagem/triage-validation.ts:76-170`; `F1 src/modules/requests/triage/triage.schema.ts:61-70`                                                |
| Rascunho                          | persistido em `sessionStorage` por protocolo, com precedência sobre o GET                                                                                                                                                                                                 | não há rascunho no servidor                                                                                                     | `F2 src/routes/(admin)/fila/[protocolo]/components/triagem/TriageSection.svelte:73-99,133-153`                                                                                                  |

O rascunho inicial de `createEmptyTriageAssessment` traz `lastTechnicalMessage: ''` (`F2 src/lib/types/triage.ts:29-44`), mas `toTriagePayload` omite o campo quando o destino não é público e o envia com `trim` quando é (`F2 src/routes/(admin)/fila/[protocolo]/components/triagem/triage-validation.ts:70-72`) — string vazia só chega ao backend se o usuário deixar o campo em branco num destino público, caso em que o backend responde `422`.

### 10.7 Confronto com `docs/04-API-Conventions.md`

| Assunto             | Confronto                                                                                                                                                                                              | Ponteiro                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| Base path           | Divergente (legado vigente): rotas na raiz, sem `/api/v1`                                                                                                                                              | convenção §1                               |
| Sucesso             | Compatível: `200` leitura, `201` criação                                                                                                                                                               | tabela 0.1 #20 / §15.4                     |
| Validação           | Divergente (legado vigente): `422` + `fields` como objeto; `400` de path via mensagem agregada                                                                                                         | tabela 0.1 #5 / §3; spec de `requests`     |
| `code` de erro      | Divergente (legado vigente): `code` de domínio em `UPPER_SNAKE` (`INSUFFICIENT_ROLE_PERMISSIONS`) em vez de snake_case do catálogo; a ausência de `code` nos demais erros é compatível (aditivo, §2.1) | tabela 0.1 #4 / §2.3                       |
| Referência a status | Divergente (legado vigente): `exitStatus` é `statuses.status_id` numérico; a `key` não vai ao wire                                                                                                     | tabela 0.1 #18 / ADR-0003, ADR-0021; §15.1 |
| Concorrência        | Divergente (legado vigente): o `409` existe, mas o corpo não traz `currentStatusKey`/`currentStatusId` e o cliente não envia precondição                                                               | tabela 0.1 #10 / §8.1                      |
| Idempotência        | Compatível: `POST` de criação não idempotente e não deduplicado                                                                                                                                        | tabela 0.1 #11 / §8.2                      |
| Autorização         | Divergente (legado vigente): perfis por nome de perfil em `requireRole` + custódia no service, em vez de capability keys com escopo `own`/`all`                                                        | tabela 0.1 #8 / ADR-0025; §6               |
| Datas               | Não se aplica: a rota não expõe timestamp                                                                                                                                                              | §10                                        |
| Request-id          | Divergente (legado vigente): sem header `x-request-id`; o `requestId` do envelope é aditivo (§2.1)                                                                                                     | tabela 0.1 #15 / §12                       |
| Rate limit          | Não se aplica: rota autenticada                                                                                                                                                                        | §13                                        |

## 11. mapping

Sessão de mapeamento (participantes, agenda e destino), montada sob `/queue` no legado.

### 11.1 Fontes

| Ref | Caminho                                                                        | Uso                                                                 |
| --- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| F1  | `src/modules/queue/queue.router.ts`                                            | montagem, autenticação e perfis                                     |
| F1  | `src/modules/queue/mapping.controller.ts`                                      | handlers, protocolo e precedência de autenticação sobre validação   |
| F1  | `src/modules/queue/mapping.schemas.ts`                                         | forma do payload do PUT                                             |
| F1  | `src/modules/queue/mapping.service.ts`                                         | autorização, merge, conclusão, efeitos e auditoria                  |
| F1  | `src/modules/queue/mapping.repository.ts`                                      | consultas de mapeamento, participantes, designado e contexto        |
| F1  | `src/modules/DTOs/queue/mapping.dto.ts`                                        | `MappingResponseDTO`, `MappingPayloadDTO`, `MappingAssignee`        |
| F1  | `src/modules/requests/statusTransition.ts`                                     | transição de status na conclusão                                    |
| F1  | `src/modules/requests/requests.repository.ts`                                  | `ASSIGNABLE_PROFILES`                                               |
| F1  | `docs/contract-assign-action.md`                                               | documento do legado sobre atribuição (não é contrato de mapeamento) |
| F1  | `docs/internal-observations.md`                                                | histórico `mappings[]` (§1 do documento)                            |
| F2  | `src/lib/api/mapping.api.ts`                                                   | chamadas HTTP                                                       |
| F2  | `src/lib/types/mapping.ts`                                                     | tipos, constantes de UI e `MAPPING_SCHEDULED_STATUS_ID`             |
| F2  | `src/lib/services/mapping.service.ts`                                          | montagem do payload, conversão de data e tradução de erro           |
| F2  | `src/routes/(admin)/fila/[protocolo]/components/mapping/mapping-validation.ts` | espelho da validação no cliente                                     |
| F2  | `src/routes/(admin)/fila/[protocolo]/components/mapping/MappingSection.svelte` | consumo do GET/PUT e modo somente leitura                           |

**Não existe contrato de mapeamento no legado:** nenhum arquivo em `F1 docs/` descreve `GET`/`PUT /queue/requests/:protocol/mapping`. O comentário de `F1 src/modules/DTOs/queue/mapping.dto.ts:2` cita `contrato-mapeamento.md`, que não está versionado em F1. O único documento próximo é `F1 docs/contract-assign-action.md`, que trata de `PATCH /requests/:protocol/internal/assignee` e registra como pendência "Confirmar se `GET /queue` deve refletir `mappingAssignee` ou só `assignee` — hoje só `assignee`" (`F1 docs/contract-assign-action.md` §Pendências). O contrato efetivo desta seção é o código.

### 11.2 Rotas

| #   | Método | Path                                | Autenticação/autorização                                                                                          | Handler                | Sucesso                                                            | Erros                                           |
| --- | ------ | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| 35  | GET    | `/queue/requests/:protocol/mapping` | sessão + `requireRole("Analista", "Gestor", "Administrador")`; leitura sem restrição por solicitação              | `getMappingController` | `200` `MappingResponseDTO` (estado vazio quando não há mapeamento) | `400`, `401`, `403`, `404`, `500`               |
| 36  | PUT    | `/queue/requests/:protocol/mapping` | sessão + `requireRole("Analista", "Gestor", "Administrador")`; escrita restrita no service (Gestor nunca escreve) | `putMappingController` | `200` `MappingResponseDTO` (inclusive na criação)                  | `400`, `401`, `403`, `404`, `409`, `422`, `500` |

- A montagem é `/queue` (`F1 src/router.ts:28`), portanto o path completo é `/queue/requests/:protocol/mapping` — **fora** do recurso `/requests` (`F1 src/modules/queue/queue.router.ts:25-40`).
- O comentário do router declara que o `GET` é de leitura para todos os perfis internos e que a autorização de edição é do service (`F1 src/modules/queue/queue.router.ts:25-27`).

### 11.3 GET `/queue/requests/:protocol/mapping`

#### Request

| Parte   | Conteúdo                                                                                                        |
| ------- | --------------------------------------------------------------------------------------------------------------- |
| Path    | `protocol`; vazio/espaço → `400 "Protocolo é obrigatório"` (`F1 src/modules/queue/mapping.controller.ts:12-20`) |
| Query   | nenhuma                                                                                                         |
| Body    | não há                                                                                                          |
| Headers | cookie de sessão (`session_id`)                                                                                 |

O `400` de protocolo não é alcançável pelo roteamento (`/requests/:protocol/mapping` não casa com segmento vazio).

#### Autorização

1. `requireRole("Analista", "Gestor", "Administrador")` → outro perfil recebe `403 "Acesso restrito ao perfil Analista ou Gestor ou Administrador"`; `must_change_password` recebe `403 "Troca de senha obrigatória antes de continuar"` (`F1 src/shared/middleware/requireRole.ts:11-22`).
2. Protocolo inexistente → `404 "Solicitação não encontrada"` (`F1 src/modules/queue/mapping.service.ts:284-288`).
3. Não há checagem de custódia, de status terminal, de status restrito nem de escopo por analista: qualquer perfil interno lê o mapeamento de qualquer protocolo (`F1 src/modules/queue/mapping.service.ts:284-306`). A restrição da fila por analista é de `GET /queue` e `GET /queue/metrics`, e o próprio `F1 docs/issues/102-scope-queue-to-analyst.md` declara o mapeamento fora do escopo (`F1 docs/issues/102-scope-queue-to-analyst.md` §Escopo).

#### Qual mapeamento é devolvido

`findCurrentMapping` devolve o mapeamento **mais recente da solicitação, inclusive concluído**, ordenado por `created_at desc, updated_at desc` (`F1 src/modules/queue/mapping.repository.ts:172-184`). Não existe parâmetro para pedir uma versão específica: o GET sempre devolve a última linha de `mappings`.

Sem nenhuma linha, a resposta é o estado vazio — `id: null`, todos os campos `null`, `participants: []`, `mappingAssignee: null` (`F1 src/modules/queue/mapping.service.ts:166-180,290-293`). É `200`, não `404`.

#### Response 200

| Campo             | Tipo                                                                                            | Origem/regra                                                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `protocol`        | `string`                                                                                        | protocolo da solicitação                                                                                                                                 |
| `id`              | `string \| null`                                                                                | `mappings.mapping_id` (uuid); `null` no estado vazio                                                                                                     |
| `targetStatus`    | `number \| null`                                                                                | `mappings.target_status_id` — id numérico de `statuses` (`F1 src/modules/queue/mapping.service.ts:118`; `F1 src/modules/queue/mapping.repository.ts:21`) |
| `scheduledFor`    | `string \| null`                                                                                | ISO-8601 UTC com sufixo `Z` e **precisão de segundos**                                                                                                   |
| `durationMinutes` | `number \| null`                                                                                | 15..480 no payload                                                                                                                                       |
| `modality`        | `"REMOTE" \| "IN_PERSON" \| null`                                                               |                                                                                                                                                          |
| `meetingLink`     | `string \| null`                                                                                | ≤ 500 no payload                                                                                                                                         |
| `location`        | `string \| null`                                                                                | ≤ 500 no payload                                                                                                                                         |
| `participants`    | `Array<{ id: string \| null, name: string, email: string }>`                                    | `id` = `users.user_id` serializado; `null` para participante externo; nome/e-mail de cadastrado vêm do `users` na leitura (`COALESCE`)                   |
| `notes`           | `string \| null`                                                                                | ≤ 2000                                                                                                                                                   |
| `mappingAssignee` | `{ id: string, userId: string, name: string, email: string, jobTitle: string \| null } \| null` | `id` = `details_professional.professional_id` (uuid); `userId` = `users.user_id` (string); `null` quando não há designado                                |

- `justification` e `lastTechnicalMessage` existem no DTO como opcionais (`F1 src/modules/DTOs/queue/mapping.dto.ts:81-82`), mas o mapeador da resposta nunca os preenche — **não saem no GET** (`F1 src/modules/queue/mapping.service.ts:109-132`).
- `mappingAssigneeId` **não** é devolvido; o designado vai só resolvido no objeto `mappingAssignee`.
- `scheduledFor` é normalizado por `toIsoSeconds` (remove milissegundos) tanto na leitura quanto na resposta do PUT (`F1 src/modules/queue/mapping.service.ts:57-63,119,151`).
- `mappingDate`, `meeting` e `mappingAssignee` também aparecem no detalhe interno, que é outro contrato (`F1 src/modules/DTOs/requests/RequestInternalDetail.dto.ts:68,78-79`).

```json
{
  "protocol": "MAAT-8K3P-9X2M",
  "id": "5b0f1c9e-2f3a-4b7c-9d10-6a2e0c4d8f77",
  "targetStatus": 6,
  "scheduledFor": "2026-10-15T13:30:00Z",
  "durationMinutes": 60,
  "modality": "REMOTE",
  "meetingLink": "https://meet.example.com/sala-mapeamento",
  "location": null,
  "participants": [
    { "id": "20", "name": "Pessoa Responsável", "email": "pessoa.responsavel@example.com" },
    { "id": null, "name": "Convidado Externo", "email": "convidado@example.com" }
  ],
  "notes": "Alinhamento inicial do escopo",
  "mappingAssignee": {
    "id": "3f6c1a54-0a1b-4c2d-8e9f-7a6b5c4d3e2f",
    "userId": "20",
    "name": "Pessoa Responsável",
    "email": "pessoa.responsavel@example.com",
    "jobTitle": "Analista de processos"
  }
}
```

#### Erros

| Status | Mensagem literal                                                  | Condição                                                               | Evidência                                          |
| ------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------- |
| 400    | `"Protocolo é obrigatório"`                                       | protocolo vazio (guarda defensiva; `/:protocol` vazio não casa a rota) | `F1 src/modules/queue/mapping.controller.ts:13-21` |
| 401    | `"Token não fornecido"` / `"Token inválido ou expirado"`          | sessão                                                                 | `F1 src/shared/middleware/auth.ts:27-45,87-95`     |
| 403    | `"Troca de senha obrigatória antes de continuar"`                 | `must_change_password`                                                 | `F1 src/shared/middleware/requireRole.ts:11-13`    |
| 403    | `"Acesso restrito ao perfil Analista ou Gestor ou Administrador"` | perfil fora da lista                                                   | `F1 src/shared/middleware/requireRole.ts:21-22`    |
| 404    | `"Solicitação não encontrada"`                                    | protocolo inexistente (sem ponto final)                                | `F1 src/modules/queue/mapping.service.ts:285-288`  |
| 500    | `"Erro interno do servidor"`                                      | falha não prevista                                                     | `F1 src/shared/middleware/errorHandler.ts:32-44`   |

#### Transporte

JSON `200`; sem paginação e sem multipart. Sem mapeamento, a resposta é o estado vazio (`200`, não
`404`).

#### Evidência

`F1 src/modules/queue/queue.router.ts:28-33`;
`F1 src/modules/queue/mapping.controller.ts:23-27`;
`F1 src/modules/queue/mapping.service.ts:166-180,290-306`.

### 11.4 PUT `/queue/requests/:protocol/mapping`

#### Request

`Content-Type: application/json`. O ator é validado **antes** do body: sessão inválida responde `401` mesmo com corpo malformado (`F1 src/modules/queue/mapping.controller.ts:42-47`). Body que não seja objeto JSON → `400 "O payload deve ser um objeto JSON."` (`F1 src/modules/queue/mapping.controller.ts:49-52`). Chaves desconhecidas são **descartadas** (o schema não é `.strict()`, ao contrário do de triagem) — `F1 src/modules/queue/mapping.schemas.ts:62-119`.

| Campo                  | Tipo/limite                                                        | Obrigatório                                             | Regra                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------ | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                   | uuid                                                               | não                                                     | Seleciona o mapeamento alvo; ausente → mapeamento **aberto** mais recente                                                                                               |
| `mappingAssigneeId`    | uuid de `details_professional` ou `null`                           | não                                                     | Ausente mantém; `null` em mapeamento existente **remove** a designação; `null` na criação equivale a herdar o responsável                                               |
| `scheduledFor`         | ISO-8601 com offset (`z.iso.datetime({ offset: true })`) ou `null` | não                                                     | `"Data/hora inválida — envie ISO-8601 com offset (ex.: 2026-10-15T10:30:00-03:00)."`                                                                                    |
| `durationMinutes`      | inteiro, 15..480, ou `null`                                        | não                                                     | `"Deve ser um número inteiro."` / `"Mínimo de 15 minutos."` / `"Máximo de 480 minutos."`                                                                                |
| `modality`             | `"REMOTE"` \| `"IN_PERSON"` \| `null`                              | não                                                     | `"Modalidade inválida — opções: REMOTE ou IN_PERSON."`                                                                                                                  |
| `meetingLink`          | string ≤ 500 ou `null`                                             | não                                                     | `"Máximo de 500 caracteres."`                                                                                                                                           |
| `location`             | string ≤ 500 ou `null`                                             | não                                                     | `"Máximo de 500 caracteres."`                                                                                                                                           |
| `notes`                | string ≤ 2000 ou `null`                                            | não                                                     | `"Máximo de 2.000 caracteres."`                                                                                                                                         |
| `participants`         | array (≤ 20) de `{ id?, name (≤255), email }`                      | não                                                     | `id` aceita número, string numérica ou `null` (vira ausente = externo); e-mail válido e ≤ 254; duplicados rejeitados (`"Participantes duplicados não são permitidos."`) |
| `completeMapping`      | boolean                                                            | **sim**                                                 | `"Informe completeMapping (true ou false)."`                                                                                                                            |
| `targetStatus`         | inteiro positivo                                                   | não (obrigatório quando `completeMapping: true`)        | `"Status de destino inválido."`                                                                                                                                         |
| `justification`        | string 1..4000                                                     | não (obrigatório na conclusão com `targetStatus !== 6`) | `"Campo obrigatório."` / `"Máximo de 4.000 caracteres."`; **não aceita `null`**                                                                                         |
| `lastTechnicalMessage` | string 1..4000 ou `null`                                           | condicional                                             | Obrigatório quando o destino é público                                                                                                                                  |

Evidência: `F1 src/modules/queue/mapping.schemas.ts:20-119`; `F1 src/shared/validation/fieldSchemas.ts:5-10,20-25` (`requiredString`, `emailSchema`).

Forma inválida → `422` `message` agregada + `fields` objeto (`F1 src/modules/queue/mapping.controller.ts:54-58`; `F1 src/shared/validation/zodErrors.ts:57-117`). O erro de tipo do próprio objeto (`"O payload deve ser um objeto JSON com a chave completeMapping."`) também é do schema (`F1 src/modules/queue/mapping.schemas.ts:116-118`), mas o controller já barra não-objeto com `400` antes.

#### Semântica: merge, não substituição

`mergeValues` é PATCH-like: campo **ausente** mantém o valor atual; `null` **ou string vazia** limpa; valor presente sobrescreve (`F1 src/modules/queue/mapping.service.ts:182-204`). `participants` presente **substitui a lista inteira** (delete + insert na mesma transação) — `F1 src/modules/queue/mapping.repository.ts:361-382`.

Alvo do PUT: `id` explícito (`findMappingById`, restrito à solicitação) ou, sem `id`, o mapeamento **aberto** mais recente (`is_concluded = false`) — `F1 src/modules/queue/mapping.repository.ts:186-211`. Sem mapeamento aberto, o PUT **cria** um novo registro (`F1 src/modules/queue/mapping.service.ts:542-556`).

`id` funciona como **seletor de alvo**, não como trava de concorrência: não há versão nem `expectedVersion`. `id` inexistente na solicitação → `404 "Mapeamento não encontrado."`; `id` de mapeamento já concluído → `422 "Este mapeamento já foi concluído e não pode ser editado."` (`F1 src/modules/queue/mapping.service.ts:362-371`).

Nenhum campo de atualização e `completeMapping: false` → `400 "Informe ao menos um campo para atualizar o mapeamento."` (`F1 src/modules/queue/mapping.service.ts:407-425`).

#### Autorização (no service, dentro da transação)

| Ação                                                                          | Quem passa                                                                                                                           |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Editar campos / concluir (`contentAction`)                                    | Administrador; **designado atual** do mapeamento; na **criação** sem designação, o responsável pela solicitação ou o designado atual |
| Designar (`mappingAssigneeId` presente, ou `null` sobre mapeamento existente) | Administrador; **responsável pela solicitação**; designado atual                                                                     |

- Gestor: `403 "Ação restrita ao Administrador ou ao Analista responsável pela demanda."` com `code: "INSUFFICIENT_ROLE_PERMISSIONS"`, com auditoria `request.access_denied` e `note` `"Mapping negado: perfil Gestor é somente leitura"` (`F1 src/modules/queue/mapping.service.ts:322-334`).
- Status terminal → `422 "Solicitação encerrada."`, com auditoria (`note` `"Mapping negado: demanda encerrada"`) (`F1 src/modules/queue/mapping.service.ts:336-341`).
- Status restrito (`Priorizado`) → `403` com o mesmo par mensagem/`code`, **inclusive para Administrador**, com auditoria (`note` `"Mapping negado: demanda priorizada"`) (`F1 src/modules/queue/mapping.service.ts:343-353`). Difere da triagem, onde Administrador passa (§10.4).
- Sem permissão para designar → `403 "Você não tem permissão para designar o mapeamento: apenas o responsável pela solicitação ou Administrador."` + `code`, com auditoria (`note` `"Mapping negado: sem permissão para designar o mapeamento"`) (`F1 src/modules/queue/mapping.service.ts:427-439`).
- Sem permissão para editar → `403 "Você não tem permissão para editar este mapeamento."` + `code`, com auditoria (`note` `"Mapping negado: sem custódia para editar o mapeamento"`) (`F1 src/modules/queue/mapping.service.ts:440-452`).
- Os dois eixos são independentes: enviar `mappingAssigneeId` não dispensa a checagem de edição (`F1 src/modules/queue/mapping.service.ts:404-421`).
- O contexto é relido **dentro** da transação com `forUpdate` na solicitação, fechando a janela entre checagem e commit (`F1 src/modules/queue/mapping.repository.ts:75-111`; `F1 src/modules/queue/mapping.service.ts:314-320`).

#### Designado

- `mappingAssigneeId` é `details_professional.professional_id` (uuid) — não `users.user_id` (`F1 src/modules/queue/mapping.service.ts:454-476`).
- Sem designação explícita: mantém o atual; ao criar, herda `requests.mapping_professional_id ?? requests.professional_id` (`F1 src/modules/queue/mapping.service.ts:470-476`).
- Candidato inexistente → `422 "Designado não encontrado."`; `details_professional.status !== 'active'` ou usuário inativo → `422 "Designado inativo."`; perfil fora de `ASSIGNABLE_PROFILES` (`["analista"]`) → `422 "Perfil do designado não permite executar o mapeamento."` (`F1 src/modules/queue/mapping.service.ts:274-282,457-467`; `F1 src/modules/requests/requests.repository.ts:641`).

#### Conclusão (`completeMapping: true`)

1. `targetStatus` ausente → `422` `"Validação falhou"` + `fields.targetStatus: "Informe o status de destino ao concluir o mapeamento"` (`F1 src/modules/queue/mapping.service.ts:483-489`).
2. Elegibilidade: `is_active = true`, `is_restricted = false` e `mapping_mode = 'conclusion_only'` — igualmente só `conclusion_only` (`F1 src/modules/queue/mapping.repository.ts:113-137`). Falha → `422` + `fields.targetStatus: "Status deve ter mappingMode conclusion_only e isRestricted=false"` (`F1 src/modules/queue/mapping.service.ts:491-499`).
3. **Destino diferente de `6`** — `6` é o status `"Mapeamento agendado"` do cadastro (`F1 migrations/requester_request/20260926000000_complete_status_transition_v4.js:57-67`): `justification` obrigatória (`422` + `fields.justification: "Justificativa obrigatória ao concluir o mapeamento (1..4000 caracteres)."`), `lastTechnicalMessage` obrigatório se o destino é público (`422` + `fields.lastTechnicalMessage: "Retorno ao solicitante obrigatório para status público (1..4000 caracteres)."`), e **todos os campos do mapeamento são zerados** (`values = emptyValues()`), com `participants: []` (`F1 src/modules/queue/mapping.service.ts:500-519,532-537`).
4. **Destino `6`** (agendamento): exige modalidade compatível e os campos do mapeamento completos (`F1 src/modules/queue/mapping.service.ts:520-526`; ver abaixo). `justification` e `lastTechnicalMessage` não são exigidos e são gravados como `null` (`F1 src/modules/queue/mapping.service.ts:549-553,566-567`).
5. Transição de status na mesma transação: `applyStatusTransition` com `expectedStatusId` lido do contexto; se o status mudou nesse intervalo → `409 "Solicitação foi atualizada por outra operação"` (`F1 src/modules/requests/statusTransition.ts:38-51`; `F1 src/modules/queue/mapping.service.ts:619-630`).
6. `requests.meeting_scheduled_for`/`meeting_link` são atualizados **só** quando o destino é `6`; nos demais casos são zerados (`F1 src/modules/queue/mapping.service.ts:632-638`).
7. Liberação automática do designado: quando o destino **não** é `6` e havia `mapping_professional_id`, `requests.mapping_professional_id = null` com auditoria `mapping.assign` `newValue: null`, `changeOrigin: "system"`. Agendar (6) mantém o designado (`F1 src/modules/queue/mapping.service.ts:657-672`; `F1 src/modules/queue/mapping.repository.ts:343-359`).
8. `mappings.is_concluded = true` e `concluded_at` só na conclusão; rascunho não reescreve esses campos (`F1 src/modules/queue/mapping.repository.ts:311-341`).

Regras de completude (rascunho **e** conclusão):

| Regra                                                                   | Mensagem literal                                               | Evidência                                                 |
| ----------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------- |
| `modality === "REMOTE"` sem `meetingLink`                               | `"Modalidade remota exige o link da reunião (meetingLink)."`   | `F1 src/modules/queue/mapping.service.ts:206-214,528-530` |
| `modality === "IN_PERSON"` sem `location`                               | `"Modalidade presencial exige o local da reunião (location)."` | `F1 src/modules/queue/mapping.service.ts:206-214,528-530` |
| conclusão sem `modality`/`scheduledFor`/`durationMinutes`/link ou local | `422 "Revise os campos do mapeamento: informe \"<campo>\"."`   | `F1 src/modules/queue/mapping.service.ts:216-224,521-525` |

#### Participantes

- Com `id`: nome/e-mail vêm do cadastro e a divergência do payload é **ignorada**; `id` inexistente/inativo (usuário ou perfil) → `422 "Participante inválido: usuário inexistente ou inativo."` (`F1 src/modules/queue/mapping.service.ts:226-252`; `F1 src/modules/queue/mapping.repository.ts:236-276`).
- Sem `id`: participante externo, persistido como enviado, e-mail em minúsculas (`F1 src/modules/queue/mapping.service.ts:242-245`; `F1 src/modules/queue/mapping.repository.ts:373-380`).
- Unicidade revalidada após a resolução, por e-mail (case-insensitive) e por `user_id` → `422 "Participantes duplicados não são permitidos."` (`F1 src/modules/queue/mapping.service.ts:254-269`).

#### Auditoria

| Evento                  | Quando                                             | Corpo                                                                                                                                                                               | Evidência                                         |
| ----------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `mapping.save`          | todo PUT que não conclui (inclusive só designação) | `entityType: "mapping"`, `entityId` = `mapping_id`, `previousValue`/`newValue` com os seis campos + `mappingAssigneeId` + `targetStatus` (+ `justification`/`lastTechnicalMessage`) | `F1 src/modules/queue/mapping.service.ts:576-604` |
| `mapping.complete`      | PUT que conclui                                    | idem, `actionType: "mapping.complete"`                                                                                                                                              | `F1 src/modules/queue/mapping.service.ts:595-604` |
| `mapping.assign`        | designação alterada                                | `previousValue`/`newValue` = `professional_id`                                                                                                                                      | `F1 src/modules/queue/mapping.service.ts:606-617` |
| `request.status_change` | conclusão                                          | `previousValue` = status anterior, `newValue` = nome do destino, `note` = justificativa (exceto destino 6), `changeOrigin: "system"`                                                | `F1 src/modules/queue/mapping.service.ts:640-655` |
| `request.access_denied` | toda negação do PUT                                | `note` = `"Mapping negado: <detalhe>"`, `changeOrigin: "system"`                                                                                                                    | `F1 src/modules/queue/mapping.service.ts:35-55`   |

`changeOrigin` das escritas é `"admin"` quando o ator é Administrador e `"internal"` nos demais casos (`F1 src/modules/queue/mapping.service.ts:574`).

#### Response 200

Mesmo shape do GET (`§11.3`), montado a partir dos valores em memória já persistidos (`F1 src/modules/queue/mapping.service.ts:134-164,690-697`). `targetStatus` reflete o destino da conclusão quando houve, senão o valor persistido (`F1 src/modules/queue/mapping.service.ts:693`). A criação também responde `200` (`F1 src/modules/queue/mapping.controller.ts:62`).

#### Erros

| Status | Mensagem literal                                                                                                              | Condição                                                  | Evidência                                                 |
| ------ | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------- |
| 400    | `"Protocolo é obrigatório"`                                                                                                   | protocolo vazio (não alcançável pelo roteamento)          | `F1 src/modules/queue/mapping.controller.ts:15-17`        |
| 401    | `"Token inválido ou expirado"`                                                                                                | `req.user` ausente ou `id` não inteiro                    | `F1 src/modules/queue/mapping.controller.ts:23-34`        |
| 400    | `"O payload deve ser um objeto JSON."`                                                                                        | body `null`, array ou primitivo                           | `F1 src/modules/queue/mapping.controller.ts:49-52`        |
| 422    | `"Campos obrigatórios ausentes: …"` / `"Campos inválidos: …"` + `fields`                                                      | forma do payload                                          | `F1 src/modules/queue/mapping.controller.ts:54-58`        |
| 422    | `"Validação falhou"` + `fields`                                                                                               | `targetStatus`, `justification`, `lastTechnicalMessage`   | `F1 src/modules/queue/mapping.service.ts:484-518`         |
| 404    | `"Solicitação não encontrada"`                                                                                                | protocolo inexistente                                     | `F1 src/modules/queue/mapping.service.ts:317-320`         |
| 403    | `"Ação restrita ao Administrador ou ao Analista responsável pela demanda."` + `code: "INSUFFICIENT_ROLE_PERMISSIONS"`         | Gestor, ou status restrito (qualquer perfil)              | `F1 src/modules/queue/mapping.service.ts:329-353`         |
| 422    | `"Solicitação encerrada."`                                                                                                    | status terminal                                           | `F1 src/modules/queue/mapping.service.ts:338-341`         |
| 404    | `"Mapeamento não encontrado."`                                                                                                | `id` inexistente na solicitação                           | `F1 src/modules/queue/mapping.service.ts:366-368`         |
| 422    | `"Este mapeamento já foi concluído e não pode ser editado."`                                                                  | alvo concluído                                            | `F1 src/modules/queue/mapping.service.ts:369-371`         |
| 400    | `"Informe ao menos um campo para atualizar o mapeamento."`                                                                    | sem `contentAction` e sem designação                      | `F1 src/modules/queue/mapping.service.ts:423-425`         |
| 403    | `"Você não tem permissão para designar o mapeamento: apenas o responsável pela solicitação ou Administrador."` + `code`       | sem permissão de designar                                 | `F1 src/modules/queue/mapping.service.ts:427-439`         |
| 403    | `"Você não tem permissão para editar este mapeamento."` + `code`                                                              | sem custódia                                              | `F1 src/modules/queue/mapping.service.ts:440-452`         |
| 422    | `"Designado não encontrado."` / `"Designado inativo."` / `"Perfil do designado não permite executar o mapeamento."`           | designação inválida                                       | `F1 src/modules/queue/mapping.service.ts:274-282,462-467` |
| 422    | `"Modalidade remota exige o link da reunião (meetingLink)."` / `"Modalidade presencial exige o local da reunião (location)."` | modalidade incompleta                                     | `F1 src/modules/queue/mapping.service.ts:206-214`         |
| 422    | `"Revise os campos do mapeamento: informe \"<campo>\"."`                                                                      | conclusão em `6` incompleta                               | `F1 src/modules/queue/mapping.service.ts:524`             |
| 422    | `"Participante inválido: usuário inexistente ou inativo."` / `"Participantes duplicados não são permitidos."`                 | participantes                                             | `F1 src/modules/queue/mapping.service.ts:249,259-265`     |
| 422    | `"Informe o retorno ao solicitante para um status público."`                                                                  | destino público sem retorno (checagem final da transição) | `F1 src/modules/requests/statusTransition.ts:28-32`       |
| 409    | `"Solicitação foi atualizada por outra operação"`                                                                             | status mudou entre a leitura e o update (sem ponto final) | `F1 src/modules/requests/statusTransition.ts:44-50`       |

#### Transporte

JSON puro, sem multipart e sem paginação. `scheduledFor` de entrada aceita offset (`-03:00` ou `Z`) e a resposta sempre devolve UTC `Z` com precisão de segundos (`F1 src/modules/queue/mapping.schemas.ts:71-77`; `F1 src/modules/queue/mapping.service.ts:57-63`). `ip` da requisição vai para a auditoria (`F1 src/modules/queue/mapping.controller.ts:60`).

### 11.5 Visão do consumidor (F2) e drift

`F2 src/lib/api/mapping.api.ts:9-45` chama `GET`/`PUT /queue/requests/{protocol}/mapping` com `encodeURIComponent` e `credentials: 'include'` (`F2 src/lib/api/client.ts:55-62`), e o tipo do payload espelha os campos do backend (`F2 src/lib/types/mapping.ts:53-69`).

| Ponto                              | F2                                                                                                                                                                                                        | Backend (F1)                                                                              | Evidência                                                                                                                                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Estado vazio                       | `getMapping` tipado `MappingResponse \| null` e comentário fala em "estado vazio… resposta válida"                                                                                                        | nunca devolve `null`: devolve objeto com todos os campos `null` e `participants: []`      | `F2 src/lib/api/mapping.api.ts:7-20`; `F1 src/modules/queue/mapping.service.ts:166-180,290-293`                                                                                                  |
| `completeMapping`                  | sempre `true`; o rascunho (`false`) não é usado                                                                                                                                                           | aceita `false` (rascunho: `mapping.save`) e `true` (conclusão: `mapping.complete`)        | `F2 src/lib/api/mapping.api.ts:23-24`; `F2 src/lib/services/mapping.service.ts:67`; `F1 src/modules/queue/mapping.service.ts:595-598`                                                            |
| Designado                          | `buildMappingPayload` envia `mappingAssigneeId: null` sempre que o rascunho está vazio                                                                                                                    | `null` sobre mapeamento existente **remove** a designação (passa por `designationAction`) | `F2 src/lib/services/mapping.service.ts:69`; `F1 src/modules/queue/mapping.service.ts:383-385,456-476`                                                                                           |
| Origem do designado no formulário  | lê `saved.mappingAssigneeId`, que o GET nunca devolve — o rascunho parte de `''`                                                                                                                          | GET devolve só `mappingAssignee` resolvido                                                | `F2 src/routes/(admin)/fila/[protocolo]/components/mapping/mapping-validation.ts:79`; `F2 src/lib/types/mapping.ts:47`; `F1 src/modules/queue/mapping.service.ts:124-131`                        |
| Campos write-only no tipo          | declara `justification`/`lastTechnicalMessage` no `MappingResponse`                                                                                                                                       | não são devolvidos pelo GET/PUT                                                           | `F2 src/lib/types/mapping.ts:45-50`; `F1 src/modules/queue/mapping.service.ts:109-132`                                                                                                           |
| `justification` vazia              | omitida do body, nunca `null` (o schema rejeita `null`)                                                                                                                                                   | `justification` é `requiredString(4000).optional()`; `null` dá `422`                      | `F2 src/lib/services/mapping.service.ts:70-75`; `F1 src/modules/queue/mapping.schemas.ts:111-114`                                                                                                |
| Data                               | `datetime-local` → `new Date(...).toISOString()` (com milissegundos); valida "futuro ou hoje" no cliente                                                                                                  | aceita offset e normaliza para UTC com precisão de **segundos**; não valida data futura   | `F2 src/lib/services/mapping.service.ts:24-33`; `F2 src/routes/(admin)/fila/[protocolo]/components/mapping/mapping-validation.ts:16-31,199-208`; `F1 src/modules/queue/mapping.service.ts:57-63` |
| Limite de `location`               | 255 caracteres no cliente                                                                                                                                                                                 | 500 no schema                                                                             | `F2 src/lib/types/mapping.ts:116`; `F1 src/modules/queue/mapping.schemas.ts:92`                                                                                                                  |
| Duração                            | opções de UI até 120 minutos                                                                                                                                                                              | schema aceita 15..480                                                                     | `F2 src/lib/types/mapping.ts:106-113`; `F1 src/modules/queue/mapping.schemas.ts:78-84`                                                                                                           |
| Modalidade                         | pré-seleciona `REMOTE` no rascunho vazio                                                                                                                                                                  | sem default: `null` é válido no rascunho, obrigatório na conclusão em `6`                 | `F2 src/routes/(admin)/fila/[protocolo]/components/mapping/mapping-validation.ts:33-48`; `F1 src/modules/queue/mapping.service.ts:217-224`                                                       |
| Reunião travada quando destino ≠ 6 | envia `scheduledFor`/`modality`/`meetingLink`/`location`/`participants`/`notes` como `null`/`[]`                                                                                                          | conclusão ≠ 6 zera os valores no servidor de qualquer forma                               | `F2 src/lib/services/mapping.service.ts:52-66`; `F1 src/modules/queue/mapping.service.ts:519`                                                                                                    |
| Estado concluído                   | deduz de `solicitation.status` contra uma lista fixa de status "pré-mapeamento"                                                                                                                           | o GET não expõe `is_concluded`/`concluded_at`                                             | `F2 src/routes/(admin)/fila/[protocolo]/components/mapping/mapping-validation.ts:88-98`; `F1 src/modules/queue/mapping.repository.ts:17-34`                                                      |
| Erros                              | traduz por status: 400 `"Dados inválidos. Revise os campos do mapeamento."`, 403 `"Você não tem permissão para editar o mapeamento."`, 404 `"Solicitação não encontrada."`, 422 usa a mensagem do backend | três `403` distintos; `404` também cobre `"Mapeamento não encontrado."`                   | `F2 src/lib/services/mapping.service.ts:80-104`; `F1 src/modules/queue/mapping.service.ts:366-368,427-452`                                                                                       |
| Participantes externos             | omite `id` quando vazio                                                                                                                                                                                   | `id` ausente ou `null` = externo                                                          | `F2 src/lib/services/mapping.service.ts:35-43`; `F1 src/modules/queue/mapping.schemas.ts:20-33`                                                                                                  |

### 11.6 Confronto com `docs/04-API-Conventions.md`

| Assunto               | Confronto                                                                                                                                                                                              | Ponteiro                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| Base path             | Divergente (legado vigente): recurso sob `/queue`, sem `/api/v1`                                                                                                                                       | tabela 0.1 #1 / §1                          |
| Sucesso               | Divergente (legado vigente): `PUT` que **cria** mapeamento responde `200`, não `201`                                                                                                                   | tabela 0.1 #20 / §15.4                      |
| Método e idempotência | Divergente (legado vigente): `PUT` faz **merge** (semântica de `PATCH`) em vez de substituir o recurso; repetir o PUT depois da conclusão devolve `422`, então a operação não é idempotente na prática | tabela 0.1 #11 / §8.2                       |
| Concorrência          | Divergente (legado vigente): mudança de status embutida no `PUT`, com `targetStatus` numérico e sem `targetStatusKey`/`expectedStatusKey`; o `409` não traz `currentStatusKey`/`currentStatusId`       | tabela 0.1 #10 / §8.1                       |
| Referência a status   | Divergente (legado vigente): `targetStatus` é `statuses.status_id` numérico; a `key` não vai ao wire                                                                                                   | tabela 0.1 #18 / ADR-0003, ADR-0021 / §15.1 |
| Ids no wire           | Divergente (legado vigente): `participants[].id` é `users.user_id` numérico serializado como string                                                                                                    | tabela 0.1 #18 / §15.1                      |
| Validação             | Divergente (legado vigente): `422` + `fields` objeto; `400` apenas para corpo não-objeto e para "nenhum campo"                                                                                         | tabela 0.1 #5 / §3; spec de `requests`      |
| `code` de erro        | Divergente (legado vigente): `INSUFFICIENT_ROLE_PERMISSIONS` em `UPPER_SNAKE` em vez de snake_case do catálogo; a ausência de `code` nos demais erros é compatível (aditivo, §2.1)                     | tabela 0.1 #4 / §2.3                        |
| Autorização           | Divergente (legado vigente): perfis + custódia no service, em vez de capability keys com escopo `own`/`all`                                                                                            | tabela 0.1 #8 / ADR-0025 / §6               |
| Datas                 | Compatível: `scheduledFor` trafega em ISO-8601 UTC com `Z` (entrada aceita offset e é normalizada)                                                                                                     | tabela 0.1 #13 / §10                        |
| Content types         | Compatível: só JSON                                                                                                                                                                                    | tabela 0.1 #12 / §9                         |
| Paginação             | Não se aplica: recurso único, sem listagem                                                                                                                                                             | §4                                          |
| Request-id            | Divergente (legado vigente): sem header `x-request-id`; o `requestId` do envelope é aditivo (§2.1)                                                                                                     | tabela 0.1 #15 / §12                        |
| Rate limit            | Não se aplica: rota autenticada                                                                                                                                                                        | §13                                         |

## 12. prioritization

Duas rotas do inventário (§4), montadas em `/prioritization` (`F1 src/router.ts:18`). O router aplica `authMiddleware` a todas as rotas (`F1 src/modules/prioritization/prioritization.router.ts:8`); não existe rota pública neste domínio.

O domínio lê os critérios e as faixas da configuração (`criteria`, `priorities`), calcula a nota e grava o estado atual em `prioritization_evaluations`; o histórico de reavaliações fica em `audit_history`, sem tabela própria (`F1 migrations/20260912010000_create_prioritization_evaluations.js:4-10`).

### 12.1 Fontes

| Ref | Caminho                                                                                                                                                                                                           | Uso                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| F1  | `src/modules/prioritization/prioritization.router.ts`                                                                                                                                                             | montagem, autenticação e autorização de perfil                    |
| F1  | `src/modules/prioritization/prioritization.controller.ts`                                                                                                                                                         | validação de path/body, ator e respostas                          |
| F1  | `src/modules/prioritization/prioritization.schema.ts`                                                                                                                                                             | corpo de `PUT .../score`                                          |
| F1  | `src/modules/prioritization/prioritization.service.ts`                                                                                                                                                            | autorização de custódia, cálculo, classificação e auditoria       |
| F1  | `src/modules/prioritization/prioritization.repository.ts`                                                                                                                                                         | consultas de critérios, faixas e upsert da avaliação              |
| F1  | `src/modules/DTOs/prioritization/PrioritizationRequests.dto.ts`                                                                                                                                                   | corpo e snapshot de auditoria                                     |
| F1  | `src/modules/DTOs/prioritization/PrioritizationResponse.dto.ts`                                                                                                                                                   | resposta das duas rotas                                           |
| F1  | `src/shared/types/criteria.ts`                                                                                                                                                                                    | ponte entre as chaves de `portal-config` e os `criterion_id`      |
| F1  | `src/shared/types/prioritization.ts`                                                                                                                                                                              | linhas de `criteria`, `priorities` e `prioritization_evaluations` |
| F1  | `src/modules/requests/requests.repository.ts`; `src/modules/requests/requests.service.ts`                                                                                                                         | leitura da Prioridade na solicitação e no detalhe interno         |
| F1  | `src/modules/queue/queue.repository.ts`; `src/modules/reports/reports.repository.ts`                                                                                                                              | leitura da Prioridade na fila e nos relatórios                    |
| F1  | `migrations/20260912010000_create_prioritization_evaluations.js`; `migrations/requester_request/20260912003734_create_criteria.js`; `migrations/requester_request/20260916170010_adjust_criteria_weight_check.js` | schema das tabelas e CHECK de peso                                |
| F1  | `seeds/requester_request/002_criteria.js`; `seeds/requester_request/003_priorities.js`                                                                                                                            | conteúdo de referência dos critérios e das faixas                 |
| F1  | `docs/portal-config-api-0_4.md` §8                                                                                                                                                                                | referência ao contrato de priorização citado pelo legado          |
| F1  | `docs/audit-events.md`                                                                                                                                                                                            | entidade e ação de auditoria `prioritization`/`evaluate`          |
| F2  | `src/lib/api/prioritization.api.ts`                                                                                                                                                                               | chamadas do consumidor                                            |
| F2  | `src/lib/types/prioritization.ts`                                                                                                                                                                                 | tipos de wire e de UI                                             |
| F2  | `src/lib/services/prioritization.service.ts`                                                                                                                                                                      | validação local, submissão e conversão de resultado               |
| F2  | `src/lib/types/request.ts`; `src/routes/(admin)/fila/[protocolo]/components/SolicitationSpecs.svelte`; `.../PrioritizationCalculator.svelte`                                                                      | leitura do detalhe interno e reavaliação                          |

**Contrato markdown no legado:** não existe contrato de priorização versionado em `F1 docs/`. Os comentários citam `RN-007`/`RN-008` e `issue-51`; o consumidor cita `docs/issue-51.md` (`F2 src/lib/types/prioritization.ts:25`), e `F1 docs/portal-config-api-0_4.md` §8 cita `prioritization-api.md`; nenhum desses arquivos está presente no tree de `F1`. O contrato efetivo desta seção é o código.

### 12.2 Rotas

| #   | Método | Path                              | Autenticação/autorização                                                                      | Handler         | Sucesso | Erros                             |
| --- | ------ | --------------------------------- | --------------------------------------------------------------------------------------------- | --------------- | ------- | --------------------------------- |
| 37  | GET    | `/prioritization/criteria`        | cookie de sessão; `Analista`, `Gestor` ou `Administrador`                                     | `listCriteria`  | `200`   | `401`, `403`, `500`               |
| 38  | PUT    | `/prioritization/:protocol/score` | cookie de sessão; `Analista` ou `Administrador`; no service, `Administrador` ou o Responsável | `evaluateScore` | `200`   | `400`, `401`, `403`, `404`, `500` |

Autenticação comum: `authMiddleware` exige o cookie de sessão e responde `401 "Token não fornecido"` na ausência e `401 "Token inválido ou expirado"` para token inválido/expirado/usuário inativo (`F1 src/shared/middleware/auth.ts:27-45,87-95`). Com `must_change_password`, qualquer rota deste domínio responde `403 "Troca de senha obrigatória antes de continuar"` (`F1 src/shared/middleware/auth.ts:49-61`). O `requireRole` responde `403 "Acesso restrito ao perfil <perfis unidos por ' ou '>"` (`F1 src/shared/middleware/requireRole.ts:21-23`). O envelope de erro não tem `code` nestas rotas (`F1 src/shared/errors/AppError.ts:1-11`).

### 12.3 GET `/prioritization/criteria`

Lista os critérios ativos com o peso vigente.

#### Request

| Parte   | Conteúdo                                    |
| ------- | ------------------------------------------- |
| Path    | —                                           |
| Query   | —                                           |
| Body    | —                                           |
| Headers | cookie de sessão (`session_id` por default) |

#### Response 200

`ListCriteriaResponse` (`F1 src/modules/DTOs/prioritization/PrioritizationResponse.dto.ts:10-13`):

```json
{
  "criteria": [
    { "id": "impacto_operacional", "name": "Impacto operacional", "weight": 10 },
    { "id": "risco_operacional", "name": "Risco operacional", "weight": 10 },
    { "id": "urgencia", "name": "Urgência", "weight": 10 },
    { "id": "volumetria", "name": "Volumetria", "weight": 10 },
    { "id": "esforco_manual", "name": "Esforço manual", "weight": 10 },
    { "id": "impacto_cliente", "name": "Impacto no cliente", "weight": 10 },
    { "id": "prazo_regulatorio", "name": "Prazo regulatório", "weight": 10 },
    { "id": "areas_impactadas", "name": "Áreas impactadas", "weight": 10 },
    { "id": "alinhamento_estrategico", "name": "Alinhamento estratégico", "weight": 10 },
    { "id": "complexidade_estimada", "name": "Complexidade estimada", "weight": 10 }
  ]
}
```

Regras efetivas:

- Só entram critérios com `active = true`, ordenados por `display_order` ascendente (`F1 src/modules/prioritization/prioritization.repository.ts:32-34`).
- O item expõe apenas `id`, `name` e `weight`; `id` é o `criterion_id` da tabela `criteria` (`F1 src/modules/prioritization/prioritization.service.ts:17-24`), em `snake_case` português, não a chave `camelCase` de `portal-config`.
- As dez chaves de `portal-config` mapeiam para esses `criterion_id` pela constante `CRITERION_KEY_TO_ID` (`F1 src/shared/types/criteria.ts:8-19`); a configuração administrativa expõe o inverso, de `criterion_id` para chave (`F1 src/modules/portalConfig/portalConfig.service.ts:89-94`).
- `weight` é inteiro lido direto de `criteria.weight`, sem normalização (`F1 src/modules/prioritization/prioritization.service.ts:19-23`; `F1 migrations/requester_request/20260912003734_create_criteria.js:5`). O seed grava `10` nos dez critérios (`F1 seeds/requester_request/002_criteria.js:4-98`).
- A escrita administrativa de pesos aceita inteiro de 1 a 10 (`F1 src/modules/portalConfig/portalConfig.schema.ts:228-232`), mas o CHECK do banco aceita 0 a 10 (`F1 migrations/requester_request/20260916170010_adjust_criteria_weight_check.js:10`).
- O payload **não** tem `maxScore`, `scale`, `total`, `page` nem qualquer envelope de paginação; a lista é o objeto `{ criteria }` completo.
- O nome e o peso vêm do banco: mudanças em `criteria` aparecem na resposta sem alteração de código.

#### Erros

| Status | `code` | Mensagem literal                                                  | Condição                                    |
| ------ | ------ | ----------------------------------------------------------------- | ------------------------------------------- |
| 401    | —      | `"Token não fornecido"`                                           | sem cookie de sessão                        |
| 401    | —      | `"Token inválido ou expirado"`                                    | token inválido, expirado ou usuário inativo |
| 401    | —      | `"Sua sessão foi revogada. Faça login novamente."`                | token emitido antes da troca/reset de senha |
| 403    | —      | `"Troca de senha obrigatória antes de continuar"`                 | `must_change_password` verdadeiro           |
| 403    | —      | `"Acesso restrito ao perfil Analista ou Gestor ou Administrador"` | outro perfil, inclusive `Solicitante`       |
| 500    | —      | `"Erro interno do servidor"`                                      | falha não prevista (envelope genérico)      |

Evidência: `F1 src/modules/prioritization/prioritization.router.ts:11-15`; `F1 src/modules/prioritization/prioritization.controller.ts:24-28`; `F1 src/shared/middleware/errorHandler.ts:39-43`.

### 12.4 PUT `/prioritization/:protocol/score`

Avalia ou reavalia a priorização de uma solicitação.

#### Request

| Parte | Campo           | Tipo                            | Obrigatório | Regra                                                                                      |
| ----- | --------------- | ------------------------------- | ----------- | ------------------------------------------------------------------------------------------ |
| Path  | `protocol`      | string                          | sim         | `trim` com mínimo 1; vazio → `400 "Campos inválidos: protocol — Protocolo é obrigatório."` |
| Body  | `notes`         | objeto `criterion_id` → inteiro | sim         | ao menos uma chave; chave com até 50 caracteres; nota inteira de 1 a 5                     |
| Body  | `justification` | string                          | não         | `trim`; até 500 caracteres; string vazia vira ausência                                     |

Headers: `Cookie: session_id`; `Content-Type: application/json`.

Exemplo de corpo (sem dados pessoais):

```json
{
  "notes": {
    "impacto_operacional": 5,
    "risco_operacional": 4,
    "urgencia": 4,
    "volumetria": 3,
    "esforco_manual": 2,
    "impacto_cliente": 5,
    "prazo_regulatorio": 4,
    "areas_impactadas": 3,
    "alinhamento_estrategico": 4,
    "complexidade_estimada": 2
  },
  "justification": "Reavaliação após reunião de priorização."
}
```

Regras de validação do corpo:

- `noteSchema` aceita apenas número inteiro; fora disso: `"Deve ser um número inteiro."`, abaixo de 1: `"Mínimo de 1."`, acima de 5: `"Máximo de 5."` (`F1 src/modules/prioritization/prioritization.schema.ts:4-9`).
- A chave de `notes` tem `trim` e máximo de 50, com a mensagem `"Identificador de critério inválido (máx. 50)."` (`F1 src/modules/prioritization/prioritization.schema.ts:11-15`).
- `notes` vazio é recusado com `"Informe ao menos uma nota."` no path `notes` (`F1 src/modules/prioritization/prioritization.schema.ts:24-28`).
- `justification` usa `optionalString(500)`; o limite gera `"Máximo de 500 caracteres."` (`F1 src/shared/validation/fieldSchemas.ts:12-18`).
- O objeto **não** é `.strict()`: chaves extras no body, como `pesos` ou `score`, são removidas pelo Zod e não chegam ao service (`F1 src/modules/prioritization/prioritization.schema.ts:17-23`).
- O score e o peso **não** são aceitos como entrada: o peso vem exclusivamente de `criteria.weight` (`F1 src/modules/prioritization/prioritization.schema.ts:20-22`).

Ordem efetiva de avaliação: path (`400`) → corpo (`400`) → existência do protocolo (`404`) → custódia (`403`) → quantidade de critérios (`500`) → cobertura das notas (`400`) → cálculo (`500`) → faixa de classificação (`500`) (`F1 src/modules/prioritization/prioritization.controller.ts:30-46`; `F1 src/modules/prioritization/prioritization.service.ts:44-73`).

#### Autorização

- O router exige `Analista` ou `Administrador`; `Gestor` e `Solicitante` recebem `403 "Acesso restrito ao perfil Analista ou Administrador"` (`F1 src/modules/prioritization/prioritization.router.ts:18-22`).
- No service, `Administrador` passa sempre; os demais só passam se o `user_id` do Responsável da solicitação for igual ao usuário autenticado (`F1 src/modules/prioritization/prioritization.service.ts:38-42`). O responsável é lido de `details_professional` pelo `requests.professional_id` (`F1 src/modules/prioritization/prioritization.repository.ts:21-30`).
- Sem Responsável, apenas `Administrador` avalia; `Analista` recebe `403 "Acesso negado a esta solicitação"` (`F1 src/modules/prioritization/prioritization.service.ts:54-60`).

#### Cálculo

- A quantidade de critérios ativos precisa ser exatamente 10; qualquer outra quantidade recusa a avaliação com `500 "Avaliação indisponível: esperados 10 critérios ativos (RN-007), encontrados <n>."` (`F1 src/modules/prioritization/prioritization.service.ts:121-128`).
- As notas precisam cobrir exatamente os critérios ativos: ausentes → `400 "Notas obrigatórias ausentes: <ids>"`; chaves desconhecidas → `400 "Critérios inválidos: <ids>"` (`F1 src/modules/prioritization/prioritization.service.ts:131-144`). As listas de erro mostram no máximo 10 ids e resumem o resto como `"… (+N mais)"` (`F1 src/modules/prioritization/prioritization.service.ts:147-150`).
- O score é a média ponderada das notas pelos pesos, multiplicada por 10, arredondada a uma casa: `Number(((somaPonderada / somaPesos) * 10).toFixed(1))` (`F1 src/modules/prioritization/prioritization.service.ts:153-165`). Com notas de 1 a 5, o resultado fica no intervalo 10,0 a 50,0.
- Soma de pesos menor ou igual a zero → `500 "Soma dos pesos dos critérios deve ser maior que zero"` (`F1 src/modules/prioritization/prioritization.service.ts:160-162`).
- A classificação é lida da tabela `priorities` pela faixa que contém o score arredondado a uma casa (`F1 src/modules/prioritization/prioritization.repository.ts:37-44`). O seed define `Baixa` em 10,0–20,0, `Média` em 20,1–30,0, `Alta` em 30,1–40,0 e `Crítica` em 40,1–50,0 (`F1 seeds/requester_request/003_priorities.js:5-38`).
- Nenhuma faixa encontrada → `500 "Nenhuma faixa de prioridade encontrada para o score <score>"` (`F1 src/modules/prioritization/prioritization.service.ts:168-174`).

#### Persistência e reavaliação

- Estado atual: upsert em `prioritization_evaluations` pela PK `protocol`, com `notes` em JSONB, `score` decimal(5,1), `classification` no enum nativo `request_priority`, `calculated_by` e `calculated_at` (`F1 src/modules/prioritization/prioritization.repository.ts:61-93`; `F1 migrations/20260912010000_create_prioritization_evaluations.js:15-41`).
- A avaliação anterior é lida com `FOR SHARE` na mesma transação, para o snapshot de auditoria (`F1 src/modules/prioritization/prioritization.repository.ts:46-59`).
- Auditoria: `entityType: "prioritization"`, `entityId: <protocol>`, `actionType: "prioritization.evaluate"`, snapshot anterior e novo (notas, score, classificação) em JSON canônico, `changeOrigin: "manual"`; `justification` vai apenas para o campo `note` da auditoria e **não** é persistida na avaliação nem devolvida na resposta (`F1 src/modules/prioritization/prioritization.service.ts:69-102`; `F1 src/modules/DTOs/prioritization/PrioritizationRequests.dto.ts:9-14`).
- Reavaliar é o mesmo `PUT`: sobrescreve a linha vigente e acumula um evento em `audit_history`; não há tabela de histórico de notas (`F1 migrations/20260912010000_create_prioritization_evaluations.js:8-10`).

#### Response 200

`EvaluatePrioritizationResponse` (`F1 src/modules/DTOs/prioritization/PrioritizationResponse.dto.ts:15-22`):

```json
{
  "protocol": "MAAT-8K3P-9X2M",
  "score": 36,
  "classification": "Alta",
  "calculatedAt": "2026-10-27T13:20:00.000Z",
  "calculatedBy": 12
}
```

`calculatedAt` é ISO-8601 UTC; `calculatedBy` é o `user_id` numérico (`F1 src/modules/prioritization/prioritization.service.ts:107-113`). A resposta não inclui as notas, o peso, o `maxScore`, o nome do responsável nem o status da solicitação.

#### Erros

| Status | `code` | Mensagem literal                                                                                             | Condição                                       |
| ------ | ------ | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| 400    | —      | `"Campos inválidos: protocol — Protocolo é obrigatório."`                                                    | `:protocol` vazio após `trim`                  |
| 400    | —      | `"Campos obrigatórios ausentes: notes"`                                                                      | corpo sem `notes`                              |
| 400    | —      | `"Campos inválidos: notes — Informe ao menos uma nota."`                                                     | `notes` vazio                                  |
| 400    | —      | `"Campos inválidos: notes.<id> — Deve ser um número inteiro."` / `"… — Mínimo de 1."` / `"… — Máximo de 5."` | nota fora do domínio                           |
| 400    | —      | `"Campos inválidos: justification — Máximo de 500 caracteres."`                                              | justificativa acima de 500                     |
| 400    | —      | `"Notas obrigatórias ausentes: <ids>"`                                                                       | falta nota de critério ativo                   |
| 400    | —      | `"Critérios inválidos: <ids>"`                                                                               | nota para chave que não é critério ativo       |
| 401    | —      | `"Token não fornecido"` / `"Token inválido ou expirado"`                                                     | sessão ausente/inválida                        |
| 403    | —      | `"Acesso restrito ao perfil Analista ou Administrador"`                                                      | perfil fora do router                          |
| 403    | —      | `"Acesso negado a esta solicitação"`                                                                         | `Analista` que não é o responsável             |
| 404    | —      | `"Solicitação não encontrada"`                                                                               | protocolo inexistente                          |
| 500    | —      | `"Avaliação indisponível: esperados 10 critérios ativos (RN-007), encontrados <n>."`                         | quantidade de critérios ativos diferente de 10 |
| 500    | —      | `"Soma dos pesos dos critérios deve ser maior que zero"`                                                     | soma dos pesos ≤ 0                             |
| 500    | —      | `"Nenhuma faixa de prioridade encontrada para o score <score>"`                                              | score fora das faixas de `priorities`          |
| 500    | —      | `"Erro interno do servidor"`                                                                                 | falha não prevista                             |

Evidência: `F1 src/modules/prioritization/prioritization.controller.ts:30-48`; `F1 src/modules/prioritization/prioritization.service.ts:49-73,121-174`.

#### Onde a Prioridade fica

- A avaliação grava somente `prioritization_evaluations` (`F1 src/modules/prioritization/prioritization.repository.ts:82-86`).
- `requests.priority_id` é preenchido com `null` na criação (`F1 src/modules/requests/requests.repository.ts:201`) e **não** é atualizado por `PUT /prioritization/:protocol/score`.
- A Prioridade devolvida em `GET /requests` e na fila vem do join com `priorities` por `requests.priority_id` (`F1 src/modules/requests/requests.repository.ts:365,395`; `F1 src/modules/queue/queue.repository.ts:68`; `F1 src/modules/reports/reports.repository.ts:225`).
- O detalhe interno expõe as duas leituras lado a lado: `priority` (join de `requests.priority_id`) e `prioritization { score, maxScore: 50, label }` (de `prioritization_evaluations`) (`F1 src/modules/requests/requests.service.ts:305-312`; `F1 src/modules/requests/requests.repository.ts:579-580,626-639`).

**Divergente (legado vigente):** a Prioridade tem duas casas no legado (`requests.priority_id` e `prioritization_evaluations.classification`) e a avaliação não mantém a primeira. O ADR-0016 fixa a faixa em uma única casa, lida por join no domínio `prioritization`. Ver ADR-0016.

### 12.5 Visão do consumidor (F2) e drift

- O consumidor usa exatamente os paths do legado, sob `PUBLIC_API_URL`: `GET /prioritization/criteria` e `PUT /prioritization/:protocol/score` com `protocol` em `encodeURIComponent` (`F2 src/lib/api/prioritization.api.ts:9,13-21,26-42`). As chamadas usam `credentials: "include"` e `Content-Type: application/json` por padrão (`F2 src/lib/api/client.ts:47-69`).
- O corpo enviado é apenas `notes` + `justification`; o comentário do consumidor registra que o score e a classificação são calculados no backend e que o frontend não envia score final como fonte de verdade (`F2 src/lib/api/prioritization.api.ts:23-25,36-41`).
- Os tipos de wire espelham o legado: `CriterionResponse`, `ListCriteriaResponse`, `EvaluatePrioritizationRequest` e `EvaluatePrioritizationResponse` (`F2 src/lib/types/prioritization.ts:28-52`).
- **Dois tipos de resultado no consumidor.** O tipo de wire tem `protocol`, `score`, `classification`, `calculatedAt` e `calculatedBy` (`F2 src/lib/types/prioritization.ts:46-52`); o tipo de UI `PrioritizationResult` tem `score`, `maxScore` e `level` (`F2 src/lib/types/prioritization.ts:19-23`). A conversão é feita no service: `score` do wire, `maxScore = criteria.length * MAX_NOTE` calculado no cliente, `level = classification` (`F2 src/lib/services/prioritization.service.ts:103-107`).
- **`maxScore` é derivação do consumidor.** Nenhuma das duas rotas devolve `maxScore`; o detalhe interno devolve `maxScore: 50` fixo (`F1 src/modules/requests/requests.service.ts:310`), e o consumidor usa `solicitation.prioritization.maxScore ?? 50` (`F2 src/routes/(admin)/fila/[protocolo]/components/SolicitationSpecs.svelte:237`). Com 10 critérios e nota máxima 5, a fórmula do cliente também resulta em 50 (`F2 src/lib/services/prioritization.service.ts:105`).
- O consumidor valida localmente que todos os critérios ativos têm nota de 1 a 5 antes de chamar o backend e monta mensagens próprias, como `"Preencha todos os critérios com uma nota de 1 a 5 antes de salvar."` e `"Faltam <n> critério(s): <nomes> — selecione nota de 1 a 5."` (`F2 src/lib/services/prioritization.service.ts:38-76`).
- `justification` é opcional: `trim` e omissão quando vazia (`F2 src/lib/services/prioritization.service.ts:96-101`).
- **Reavaliação no consumidor.** O comentário do service afirma que as notas já salvas para reavaliação vêm de `GET /requests/:protocol/internal` (`F2 src/lib/services/prioritization.service.ts:22-24`), e a tela passa `solicitation.prioritization.notes` como notas iniciais (`F2 src/routes/(admin)/fila/[protocolo]/components/SolicitationSpecs.svelte:537`). O DTO interno do legado devolve `prioritization` apenas com `score`, `maxScore` e `label`, sem `notes` (`F1 src/modules/DTOs/requests/RequestInternalDetail.dto.ts:25-29`; `F1 src/modules/requests/requests.service.ts:308-312`). O consumidor ainda tipa `prioritization` do detalhe interno como `PrioritizationResult` (`level`) e converte `label` para `level` (`F2 src/lib/types/request.ts:430`; `F2 src/routes/(admin)/fila/[protocolo]/components/SolicitationSpecs.svelte:329-334`), enquanto o wire usa `label`.
- O consumidor mantém rascunho em `sessionStorage` e dá prioridade a ele sobre as notas do servidor na abertura da calculadora (`F2 src/routes/(admin)/fila/[protocolo]/components/PrioritizationCalculator.svelte:85-99`).
- Em `DEV` com o domínio de mock ligado, as duas funções desviam para `$lib/mocks/prioritization.mock` (`F2 src/lib/api/prioritization.api.ts:15-18,31-34`).
- O consumidor também lê os pesos pela configuração do portal, não por `/prioritization/criteria`: `GET /portal-config` devolve `prioritizationWeights` com as dez chaves `camelCase` (`F2 src/lib/config/portal-config.service.ts:229-251`; `F1 src/modules/portalConfig/portalConfig.service.ts:89-94`).

### 12.6 Confronto com `docs/04-API-Conventions.md`

| Assunto          | Situação no legado                                                                                         | Confronto                                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Base path        | `/prioritization/*`, sem prefixo                                                                           | Divergente (legado vigente): `/api/v1` — §1                                                                                          |
| Envelope de erro | `{ status, statusCode, message }`                                                                          | Compatível com o envelope legado da §2.1                                                                                             |
| `code` no erro   | Ausente em todos os erros                                                                                  | Compatível: `code` é aditivo no envelope legado — §2.1; tabela 0.1 #2                                                                |
| Validação        | `400` com mensagem agregada, sem `code` e sem `fields`                                                     | Divergente (legado vigente): §3 congela `400` + `validation_error` + `fields` como lista                                             |
| Sucesso          | `200` em leitura e em atualização                                                                          | Compatível — §15.4                                                                                                                   |
| Paginação        | `GET /prioritization/criteria` é lista não paginada com envelope `{ criteria }`                            | Divergente (legado vigente): §4/§4.3 só admitem lista não paginada com linha de exceção registrada                                   |
| Autorização      | `GET /criteria` aceita `Gestor`                                                                            | Divergente (legado vigente): ADR-0017 retira a leitura de critérios do `Gestor`; a Prioridade continua visível pela solicitação — §6 |
| Prioridade       | Duas leituras: `requests.priority_id` e `prioritization_evaluations.classification`                        | Divergente (legado vigente): ADR-0016 fixa a faixa em uma única casa, no domínio `prioritization`                                    |
| Datas            | `calculatedAt` ISO-8601 UTC                                                                                | Compatível — §10                                                                                                                     |
| Idioma           | Chaves `camelCase`; valores de domínio em pt-BR; `id` de critério é um identificador opaco em `snake_case` | Compatível — §11                                                                                                                     |
| Idempotência     | `PUT` substitui a avaliação vigente                                                                        | Compatível — §8.2                                                                                                                    |
| Request-id       | Ausente                                                                                                    | Divergente (legado vigente): sem header `x-request-id`; o `requestId` do envelope é aditivo (§2.1) — §12; anotado na §3              |

## 13. pending-items

Seis rotas do inventário (§4). As cinco rotas de pendência são montadas em `/requests/:protocol/pending-items` (`F1 src/router.ts:22`); o verify público é montado em `/requests/:protocol/public` e responde em `/verify` (`F1 src/router.ts:23`).

O domínio usa dois transportes de identidade: cookie de sessão nas rotas internas de criação e revisão, e cookie **ou** header `X-Requester-Identity` nas rotas de leitura, resposta e anexo (`F1 src/shared/middleware/dualAuth.ts:6-18`). A posse é verificada no service, não no middleware (`F1 src/modules/pendingItems/pendingItems.service.ts:210-233`).

### 13.1 Fontes

| Ref | Caminho                                                                                                                          | Uso                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| F1  | `src/modules/pendingItems/pendingItems.router.ts`                                                                                | montagem, middlewares, multipart e handlers                 |
| F1  | `src/modules/pendingItems/pendingItems.controller.ts`                                                                            | validação de entrada, rate limit e códigos de sucesso       |
| F1  | `src/modules/pendingItems/pendingItems.schema.ts`                                                                                | corpos de criação, revisão e verify                         |
| F1  | `src/modules/pendingItems/pendingItems.service.ts`                                                                               | posse, regras de estado, catálogo de campos, anexo e verify |
| F1  | `src/modules/pendingItems/pendingItems.repository.ts`                                                                            | consultas, transações, auditoria e mapeamento               |
| F1  | `src/modules/DTOs/pendingItems/PendingItems.dto.ts`                                                                              | formatos de request/response                                |
| F1  | `src/shared/catalog/fieldCatalog.ts`                                                                                             | catálogo fechado de `fieldKey`, rótulos e snapshot          |
| F1  | `src/shared/middleware/dualAuth.ts`; `src/shared/utils/requesterIdentity.ts`                                                     | cookie OU header de identidade                              |
| F1  | `src/shared/utils/normalizeIdentity.ts`                                                                                          | normalização de nome e e-mail                               |
| F1  | `src/shared/middleware/upload.ts`                                                                                                | allowlist de MIME e limite de 10 MB                         |
| F1  | `src/shared/middleware/rateLimit.ts`                                                                                             | janela e limite do verify                                   |
| F1  | `docs/contract-pendencias_03.md`                                                                                                 | contrato de referência do próprio legado                    |
| F2  | `src/lib/api/pending-item.api.ts`                                                                                                | chamadas do consumidor                                      |
| F2  | `src/lib/types/pendency.ts`                                                                                                      | tipos de wire e de agrupamento                              |
| F2  | `src/lib/services/pendency.service.ts`; `src/lib/services/requester-tracking.service.ts`                                         | validação local, mensagens e agrupamento                    |
| F2  | `src/lib/pendency/pending-attachments.ts`; `src/lib/pendency/field-catalog.ts`                                                   | regras locais de anexo e catálogo de campos                 |
| F2  | `src/lib/types/request.ts`                                                                                                       | limites de anexo do consumidor                              |
| F2  | `src/lib/api/requester-tracking.api.ts`; `src/lib/types/requester-tracking.ts`; `src/lib/services/requester-identity.service.ts` | verify público e identidade em `sessionStorage`             |

O código não referencia `F1 docs/internal-observations.md`; o documento apenas menciona `pending_item.*` como fora da linha do tempo de notas internas (`F1 docs/internal-observations.md` §2).

### 13.2 Rotas

| #   | Método | Path                                                           | Autenticação/autorização                                                                      | Handler              | Sucesso | Erros                                    |
| --- | ------ | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------- | ------- | ---------------------------------------- |
| 39  | POST   | `/requests/:protocol/pending-items`                            | cookie; `Analista`, `Gestor` ou `Administrador`; no service, `Administrador` ou o Responsável | `createPendingItems` | `201`   | `400`, `401`, `403`, `404`, `409`, `500` |
| 40  | GET    | `/requests/:protocol/pending-items`                            | dual: cookie ou `X-Requester-Identity`                                                        | `listPendingItems`   | `200`   | `401`, `403`, `500`                      |
| 41  | PATCH  | `/requests/:protocol/pending-items/review`                     | cookie; `Analista`, `Gestor` ou `Administrador`; no service, `Administrador` ou o Responsável | `reviewPendingItems` | `200`   | `400`, `401`, `403`, `404`, `409`, `500` |
| 42  | PATCH  | `/requests/:protocol/pending-items/:pendingItemId`             | dual: cookie ou `X-Requester-Identity`                                                        | `respondPendingItem` | `200`   | `400`, `401`, `403`, `404`, `409`, `500` |
| 43  | POST   | `/requests/:protocol/pending-items/:pendingItemId/attachments` | dual: cookie ou `X-Requester-Identity`; multipart                                             | `attachPendingItem`  | `201`   | `400`, `401`, `403`, `404`, `500`        |
| 44  | POST   | `/requests/:protocol/public/verify`                            | pública; rate limit                                                                           | `publicVerify`       | `200`   | `400`, `401`, `403`, `429`, `500`        |

#### Cookie nas rotas internas

`authMiddleware` responde `401 "Token não fornecido"` sem cookie, `401 "Token inválido ou expirado"` para token inválido/expirado/usuário inativo, `401 "Sua sessão foi revogada. Faça login novamente."` para token anterior à troca de senha e `403 "Troca de senha obrigatória antes de continuar"` com `must_change_password` (`F1 src/shared/middleware/auth.ts:27-72`). O `requireRole` responde `403 "Acesso restrito ao perfil Analista ou Gestor ou Administrador"` (`F1 src/modules/pendingItems/pendingItems.router.ts:36-48`; `F1 src/shared/middleware/requireRole.ts:21-23`). Criar ou revisar exige `Administrador` ou o Responsável da solicitação; qualquer outro perfil interno recebe `403 "Acesso restrito ao responsável pela solicitação"` (`F1 src/modules/pendingItems/pendingItems.service.ts:194-208`).

#### Credencial dual nas rotas de leitura, resposta e anexo

O middleware testa o cookie literal `session_id`: com cookie, delega ao `authMiddleware` (mensagens de token acima); sem cookie, faz o parse de `X-Requester-Identity` como JSON `{ name, email }`; header ausente ou malformado responde `401 "Valide seus dados para acompanhar esta solicitação."` (`F1 src/shared/middleware/dualAuth.ts:19-40`; `F1 src/shared/utils/requesterIdentity.ts:1-13`). No service, o perfil `Solicitante` autenticado precisa ter nome e e-mail normalizados iguais aos da solicitação; qualquer outro perfil interno passa sem checagem de custódia; a identidade pública do header é comparada do mesmo modo (`F1 src/modules/pendingItems/pendingItems.service.ts:210-233`). Divergência de nome/e-mail e protocolo inexistente respondem o mesmo `401 "Valide seus dados para acompanhar esta solicitação."` (`F1 src/modules/pendingItems/pendingItems.service.ts:210-219,226-232`).

### 13.3 POST `/requests/:protocol/pending-items`

Cria um lote de pendências (observação e/ou campos) e move a solicitação para `Pendente de informações`.

#### Request

`application/json`, corpo `CreatePendingItemsBody` (`F1 src/modules/pendingItems/pendingItems.schema.ts:3-28`; `F1 src/modules/DTOs/pendingItems/PendingItems.dto.ts:53-57`):

| Campo               | Tipo                             | Obrigatório   | Regra                                                                                        |
| ------------------- | -------------------------------- | ------------- | -------------------------------------------------------------------------------------------- |
| `observation`       | string                           | não           | `trim`; mínimo 1 e máximo 2000; gera um item `type: "observation"`                           |
| `requestAttachment` | boolean                          | não           | default `false`; é flag do lote inteiro                                                      |
| `items`             | array de `{ fieldKey, comment }` | não           | default `[]`; `fieldKey` com `trim` e mínimo 1; `comment` com `trim`, mínimo 1 e máximo 2000 |
| `items[].fieldKey`  | string                           | sim, por item | precisa estar no catálogo fechado de 33 chaves                                               |
| `items[].comment`   | string                           | sim, por item | máximo 2000                                                                                  |

Pelo menos um entre `observation` não vazia e `items` não vazio é exigido (`F1 src/modules/pendingItems/pendingItems.schema.ts:17-27`).

Exemplo (sem dados pessoais):

```json
{
  "requestAttachment": true,
  "items": [
    {
      "fieldKey": "operational.volumetry",
      "comment": "Informe a volumetria real do processo."
    }
  ],
  "observation": "Ajustar os dados operacionais antes da triagem."
}
```

Regras efetivas:

- O schema **não** é `.strict()`: `type`, `responseComment`, `attachments` e outras chaves extras são descartadas pelo Zod e não chegam ao service (`F1 src/modules/pendingItems/pendingItems.schema.ts:3-28`). Anexo não entra neste corpo; existe apenas em `POST /requests/:protocol/pending-items/:pendingItemId/attachments`. Não há `responseComment` por campo; a resposta discursiva de uma observação fica em `responseText` (`F1 src/modules/DTOs/pendingItems/PendingItems.dto.ts:18-33`).
- `observation` não vazia gera **um** item `type: "observation"`, `field_key: null`, `comment` igual à observação e `description` igual à observação; cada item de `items` gera **um** item `type: "field_edit"` (`F1 src/modules/pendingItems/pendingItems.service.ts:142-174`).
- O `fieldKey` é validado contra `FIELD_KEYS`, o catálogo de 33 chaves (`F1 src/shared/catalog/fieldCatalog.ts:6-44`); fora dele: `400 "Campos inválidos: fieldKey — <fieldKey> não está no catálogo"` (`F1 src/modules/pendingItems/pendingItems.service.ts:114-118`).
- `requester.fullName` e `requester.corporateEmail` só podem ser pedidos quando a solicitação não tem `requester_user_id`; em solicitação autenticada: `400 "Campos inválidos: fieldKey — <fieldKey> só pode ser solicitado para solicitação pública"` (`F1 src/modules/pendingItems/pendingItems.service.ts:125-133`).
- O rótulo (`fieldLabel`) e o valor atual (`currentValue`) são derivados no servidor pelo catálogo; o cliente envia apenas `fieldKey` (`F1 src/modules/pendingItems/pendingItems.service.ts:157-173`; `F1 src/shared/catalog/fieldCatalog.ts:190-199`).
- Antes da autorização, o service valida existência, estado e conteúdo, nesta ordem: solicitação inexistente (`404 "Solicitação não encontrada"`), status `Concluído`/`Cancelado` (`409 "Solicitação já concluída ou cancelada"`), lote aberto (`409 "Já existe uma pendência em aberto para este protocolo"`), presença de `observation`/`items`, tamanho da observação, catálogo e comentários (`F1 src/modules/pendingItems/pendingItems.service.ts:86-135`). A checagem de custódia vem depois (`F1 src/modules/pendingItems/pendingItems.service.ts:137`).
- “Lote aberto” significa qualquer item `requested` ou `responded` da solicitação, de qualquer lote (`F1 src/modules/pendingItems/pendingItems.repository.ts:60-67`).
- O `batchId` é um UUID novo por chamada; todas as linhas recebem `status: "requested"`, `corrected_value: null`, `response_text: null`, `deadline: null`, `responded_at: null` e `validated_at: null` (`F1 src/modules/pendingItems/pendingItems.service.ts:139-183`; `F1 src/modules/pendingItems/pendingItems.repository.ts:324-343`).
- Na mesma transação, se o status atual não for `Pendente de informações`, a solicitação passa para esse status e são gravados dois eventos: `pending_item.create` (origem `admin`) e `request.status_change` (origem `system`); se o status já for `Pendente de informações`, grava apenas `pending_item.create`, com `newValue` igual ao `batchId` (`F1 src/modules/pendingItems/pendingItems.repository.ts:349-385`).

#### Response 201

`CreatePendingItemsResponse` (`F1 src/modules/DTOs/pendingItems/PendingItems.dto.ts:59-63`):

```json
{
  "batchId": "3f1c2c4e-7a0b-4f2e-9d3c-1b2a3c4d5e6f",
  "requestAttachment": true,
  "items": [
    {
      "id": "0b7e9a52-3c4d-4e5f-8a90-1b2c3d4e5f60",
      "protocol": "MAAT-8K3P-9X2M",
      "batchId": "3f1c2c4e-7a0b-4f2e-9d3c-1b2a3c4d5e6f",
      "type": "field_edit",
      "field": {
        "fieldKey": "operational.volumetry",
        "fieldLabel": "Volumetria",
        "currentValue": "1200"
      },
      "comment": "Informe a volumetria real do processo.",
      "status": "requested",
      "correctedValue": null,
      "responseText": null,
      "responseAttachments": [],
      "deadline": null,
      "createdAt": "2026-10-27T13:00:00.000Z",
      "respondedAt": null,
      "validatedAt": null
    }
  ]
}
```

A resposta não devolve `solicitationStatus`; a transição de status é observada por `GET /requests/:protocol/internal` ou `GET /requests/:protocol/tracking` (`F1 docs/contract-pendencias_03.md` §7, `D-P18` do contrato de pendências).

#### Erros

| Status | `code` | Mensagem literal                                                                                                 | Condição                                                                                     |
| ------ | ------ | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 400    | —      | `"Protocolo é obrigatório"`                                                                                      | `:protocol` vazio                                                                            |
| 400    | —      | `"Campos inválidos: observation — Pelo menos um de observation ou items deve ser informado"`                     | nem `observation` nem `items` informados                                                     |
| 400    | —      | `"Campos inválidos: items.<n>.comment — comment vazio"`                                                          | `comment` vazio após `trim`                                                                  |
| 400    | —      | `"Campos inválidos: fieldKey — <fieldKey> não está no catálogo"`                                                 | `fieldKey` fora das 33 chaves                                                                |
| 400    | —      | `"Campos inválidos: fieldKey — <fieldKey> só pode ser solicitado para solicitação pública"`                      | identidade do solicitante marcada em solicitação com usuário                                 |
| 400    | —      | `"Campos inválidos: observation — Máximo de 2.000 caracteres."`                                                  | observação acima de 2000 (checagem do service, posterior ao schema e não alcançada por HTTP) |
| 400    | —      | `"Campos inválidos: comment — Campo obrigatório."` / `"Campos inválidos: comment — Máximo de 2.000 caracteres."` | checagens do service, posteriores ao schema e não alcançadas por HTTP                        |
| 401    | —      | `"Token não fornecido"` / `"Token inválido ou expirado"`                                                         | sessão ausente/inválida                                                                      |
| 403    | —      | `"Acesso restrito ao perfil Analista ou Gestor ou Administrador"`                                                | perfil fora do router                                                                        |
| 403    | —      | `"Acesso restrito ao responsável pela solicitação"`                                                              | perfil interno que não é `Administrador` nem o Responsável                                   |
| 404    | —      | `"Solicitação não encontrada"`                                                                                   | protocolo inexistente                                                                        |
| 409    | —      | `"Solicitação já concluída ou cancelada"`                                                                        | status `Concluído` ou `Cancelado`                                                            |
| 409    | —      | `"Já existe uma pendência em aberto para este protocolo"`                                                        | existe item `requested`/`responded`                                                          |
| 500    | —      | `"Erro interno do servidor"`                                                                                     | falha não prevista                                                                           |

Limites de 2000 e o mínimo de `fieldKey` sem mensagem customizada no schema produzem a mensagem default do Zod, agregada por `formatZodIssues` no mesmo formato `"Campos inválidos: <path> — <mensagem>"` (`F1 src/shared/validation/zodErrors.ts:57-91`). As checagens equivalentes do service ficam depois do schema e não são alcançadas por HTTP quando o schema já recusa o corpo.

### 13.4 GET `/requests/:protocol/pending-items`

Lista todas as pendências da solicitação.

#### Request

| Parte   | Conteúdo                                                                 |
| ------- | ------------------------------------------------------------------------ |
| Path    | `:protocol`                                                              |
| Query   | nenhuma                                                                  |
| Body    | —                                                                        |
| Headers | cookie de sessão **ou** `X-Requester-Identity: {"name":"…","email":"…"}` |

#### Response 200

`ListPendingItemsResponse` (`F1 src/modules/DTOs/pendingItems/PendingItems.dto.ts:65-74`):

```json
{
  "batchId": "3f1c2c4e-7a0b-4f2e-9d3c-1b2a3c4d5e6f",
  "requestAttachment": true,
  "items": []
}
```

Regras efetivas:

- Todos os itens da solicitação, de todos os lotes, são devolvidos em ordem de `created_at` ascendente, sem filtro por status, lote ou visibilidade, e sem paginação (`F1 src/modules/pendingItems/pendingItems.repository.ts:69-78`).
- Sem nenhum item: `{ "batchId": null, "requestAttachment": false, "items": [] }` (`F1 src/modules/pendingItems/pendingItems.service.ts:245-247`). O shape de cada item está em §13.3.
- `batchId` é o primeiro item, na ordem cronológica, com status `requested` ou `responded`; se não houver, é o último item da lista (`F1 src/modules/pendingItems/pendingItems.service.ts:249-256`).
- `requestAttachment` é `true` quando qualquer item do lote escolhido tem a flag `true`; a flag é do lote e a resposta devolve apenas a do lote vigente (`F1 src/modules/pendingItems/pendingItems.service.ts:257-261`).
- Cada item segue `PendingItem` (`F1 src/modules/DTOs/pendingItems/PendingItems.dto.ts:18-33`): `field` é `null` em `observation`; `currentValue` e `correctedValue` são convertidos de JSON quando o valor é escalar; `deadline` é `yyyy-mm-dd` ou `null`; `createdAt`, `respondedAt` e `validatedAt` são ISO-8601 UTC; `responseAttachments` traz `downloadUrl: null` e `canDownload: false` (`F1 src/modules/pendingItems/pendingItems.service.ts:40-77`; `F1 src/modules/pendingItems/pendingItems.repository.ts:744-773`).
- Perfil `Solicitante` autenticado e identidade pública só leem a própria solicitação; perfis internos leem qualquer protocolo, sem custódia (`F1 src/modules/pendingItems/pendingItems.service.ts:210-231`).

#### Erros

| Status | `code` | Mensagem literal                                        | Condição                                                                                                                                                |
| ------ | ------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 401    | —      | `"Valide seus dados para acompanhar esta solicitação."` | sem cookie e sem header; header malformado; nome/e-mail divergentes; protocolo inexistente                                                              |
| 401    | —      | `"Token inválido ou expirado"`                          | cookie presente, mas inválido/expirado                                                                                                                  |
| 403    | —      | `"Troca de senha obrigatória antes de continuar"`       | cookie com `must_change_password`                                                                                                                       |
| 404    | —      | `"Solicitação não encontrada"`                          | presente no código, mas inalcançável: a checagem de acesso responde `401` antes (`F1 src/modules/pendingItems/pendingItems.service.ts:210-212,239-241`) |
| 500    | —      | `"Erro interno do servidor"`                            | falha não prevista                                                                                                                                      |

**Desatualizado no legado:** `F1 docs/contract-pendencias_03.md` §7 registra `404` para solicitação inexistente no `GET`; no código, protocolo inexistente responde `401 "Valide seus dados para acompanhar esta solicitação."` antes de qualquer `404` (`F1 src/modules/pendingItems/pendingItems.service.ts:210-212`).

### 13.5 PATCH `/requests/:protocol/pending-items/review`

Revisa um subconjunto de itens respondidos do lote.

#### Request

Cookie de sessão; `application/json`, corpo `ReviewPendingItemsBody` (`F1 src/modules/pendingItems/pendingItems.schema.ts:36-55`; `F1 src/modules/DTOs/pendingItems/PendingItems.dto.ts:76-86`):

| Campo               | Tipo                       | Obrigatório     | Regra                                                              |
| ------------------- | -------------------------- | --------------- | ------------------------------------------------------------------ |
| `batchId`           | string                     | sim             | `trim` e mínimo 1                                                  |
| `requestAttachment` | boolean                    | não             | quando presente, redefine a flag em **todas** as linhas do lote    |
| `items`             | array de decisão           | sim             | no mínimo 1                                                        |
| `items[].id`        | string                     | sim             | mínimo 1                                                           |
| `items[].decision`  | `"validate"` ou `"reopen"` | sim             | união discriminada                                                 |
| `items[].note`      | string                     | não             | só em `validate`; `trim`; máximo 2000; vai apenas para a auditoria |
| `items[].comment`   | string                     | sim em `reopen` | `trim`; mínimo 1 e máximo 2000                                     |

Exemplo:

```json
{
  "batchId": "3f1c2c4e-7a0b-4f2e-9d3c-1b2a3c4d5e6f",
  "items": [
    { "id": "0b7e9a52-3c4d-4e5f-8a90-1b2c3d4e5f60", "decision": "validate" },
    {
      "id": "1c8f0b63-4d5e-4f60-9ba1-2c3d4e5f6071",
      "decision": "reopen",
      "comment": "A volumetria não confere com o relatório."
    }
  ]
}
```

Regras efetivas:

- A solicitação precisa existir (`404 "Solicitação não encontrada"`); o lote precisa pertencer a ela (`404 "Lote não encontrado"`); cada `id` decidido precisa pertencer ao lote (`404 "Item <id> não pertence ao lote"`) (`F1 src/modules/pendingItems/pendingItems.service.ts:470-483`).
- Reenvio idempotente: `validate` em item já `validated` e `reopen` em item já `requested` são ignorados, sem novo evento de auditoria (`F1 src/modules/pendingItems/pendingItems.service.ts:485-487`).
- Qualquer outra decisão sobre item que não esteja `responded` responde `409 "Item <id> não está com status responded"` (`F1 src/modules/pendingItems/pendingItems.service.ts:488-490`).
- `validate` em `field_edit` aplica o `correctedValue` gravado no item ao campo correspondente da solicitação, com validação de vocabulário; `validate` em `observation` apenas marca o item (`F1 src/modules/pendingItems/pendingItems.repository.ts:535-552,602-742`).
- `reopen` exige `comment`; sobrescreve `comment`, limpa `corrected_value`, `response_text`, `responded_at` e `validated_at`, e redefine `created_at` para o instante da reabertura (`F1 src/modules/pendingItems/pendingItems.repository.ts:553-573`).
- `requestAttachment` booleano atualiza todas as linhas do lote antes das decisões; omitido, a flag não muda (`F1 src/modules/pendingItems/pendingItems.repository.ts:518-522`).
- Se a chamada tiver ao menos um `reopen` **efetivo** (o reenvio idempotente em item já `requested` não conta), a solicitação passa para `Pendente de informações` com auditoria `request.status_change` e nota `"reopen pending"`; se todas as decisões forem `validate`, o status da solicitação não muda (`F1 src/modules/pendingItems/pendingItems.service.ts:519`; `F1 src/modules/pendingItems/pendingItems.repository.ts:577-591`).
- Cada decisão nova grava `pending_item.validate` ou `pending_item.reopen` com anterior/novo (`F1 src/modules/pendingItems/pendingItems.repository.ts:542-573`).

#### Response 200

`{ batchId, items }`, com os itens decididos nesta chamada no estado atual; a ordem não é definida pela consulta (`F1 src/modules/pendingItems/pendingItems.service.ts:522-523`; `F1 src/modules/pendingItems/pendingItems.repository.ts:593-598`). A resposta não devolve `solicitationStatus`.

#### Validação do `correctedValue` na revisão

| `fieldKey`                                                     | Regra                                      | Mensagem                                                                                           |
| -------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `operational.peopleInvolved`, `operational.monthlyEffortHours` | precisa ser número                         | `"Campos inválidos: correctedValue — <fieldKey> deve ser número"`                                  |
| `operational.peopleInvolved`                                   | precisa ser maior que zero                 | `"Campos inválidos: correctedValue — peopleInvolved > 0"`                                          |
| `operational.hasManualControls`                                | `false` ou texto não vazio                 | `"Campos inválidos: correctedValue — hasManualControls deve ser false ou texto não vazio"`         |
| `operational.desiredDeadline`                                  | `yyyy-mm-dd`                               | `"Campos inválidos: correctedValue — desiredDeadline deve ser yyyy-mm-dd"` / `"… — data inválida"` |
| `operational.operationalImpact`                                | `Baixo`, `Médio`, `Alto` ou `Crítico`      | `"Campos inválidos: correctedValue — operationalImpact inválido"`                                  |
| `operational.perceivedCriticality`                             | `Baixa`, `Média`, `Alta` ou `Crítica`      | `"Campos inválidos: correctedValue — perceivedCriticality inválido"`                               |
| demais                                                         | texto ou `null`                            | `"Campos inválidos: correctedValue — <fieldKey> deve ser texto"`                                   |
| demais, string vazia                                           | apenas sete chaves anuláveis aceitam vazio | `"Campos inválidos: correctedValue — <fieldKey> não pode ser vazio"`                               |

As chaves que aceitam string vazia são `requester.department`, `requester.additionalContact`, `complementary.additionalNotes`, `complementary.hasProcessDocumentation`, `complementary.hasSimilarSolution`, `complementary.dependsOnOtherAreas` e `complementary.handlesRestrictedInfo` (`F1 src/modules/pendingItems/pendingItems.service.ts:392-453,440-451`). `demand.category` precisa existir e estar ativa em `categories`, senão `400 "Categoria inválida — selecione uma opção da lista."` (`F1 src/modules/pendingItems/pendingItems.repository.ts:648-655`).

#### Erros

| Status | `code` | Mensagem literal                                                  | Condição                                                          |
| ------ | ------ | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| 400    | —      | `"Campos inválidos: items.<n>.comment — comment vazio"`           | `comment` de `reopen` vazio após `trim`                           |
| 400    | —      | `"Campos obrigatórios ausentes: comment"`                         | checagem do service, posterior ao schema e não alcançada por HTTP |
| 400    | —      | mensagens da tabela de `correctedValue`                           | valor inválido para o campo validado                              |
| 401    | —      | `"Token não fornecido"` / `"Token inválido ou expirado"`          | sessão ausente/inválida                                           |
| 403    | —      | `"Acesso restrito ao perfil Analista ou Gestor ou Administrador"` | perfil fora do router                                             |
| 403    | —      | `"Acesso restrito ao responsável pela solicitação"`               | não é `Administrador` nem o Responsável                           |
| 404    | —      | `"Solicitação não encontrada"`                                    | protocolo inexistente                                             |
| 404    | —      | `"Lote não encontrado"`                                           | `batchId` inexistente ou de outra solicitação                     |
| 404    | —      | `"Item <id> não pertence ao lote"`                                | id fora do lote                                                   |
| 409    | —      | `"Item <id> não está com status responded"`                       | decisão sobre item em estado incompatível                         |
| 500    | —      | `"Erro interno do servidor"`                                      | falha não prevista                                                |

### 13.6 PATCH `/requests/:protocol/pending-items/:pendingItemId`

Registra a resposta de um item do lote, por identidade pública ou sessão.

#### Request

| Parte   | Conteúdo                                                                            |
| ------- | ----------------------------------------------------------------------------------- |
| Path    | `:protocol`, `:pendingItemId`                                                       |
| Body    | `{ correctedValue }` para item `field_edit`; `{ response }` para item `observation` |
| Headers | cookie de sessão **ou** `X-Requester-Identity`                                      |

Corpo discriminado pelo `type` armazenado (`F1 src/modules/pendingItems/pendingItems.service.ts:284-313`):

- `field_edit`: a chave `correctedValue` precisa existir e não pode ser `undefined`; `null` é aceito. Qualquer valor JSON é gravado como string JSON. Enviar `response` → `400 "Campos inválidos: response — não permitido para field_edit"`.
- `observation`: `response` precisa existir, ser string não vazia após `trim` e ter no máximo 2000 caracteres. Enviar `correctedValue` → `400 "Campos inválidos: correctedValue — não permitido para observation"`.
- O item precisa pertencer ao `:protocol`; item inexistente ou de outro protocolo → `404 "Solicitação não encontrada"` (mensagem anti-IDOR) (`F1 src/modules/pendingItems/pendingItems.service.ts:276-279`).
- Item que não está `requested` → `409 "Esta pendência já foi respondida."` (`F1 src/modules/pendingItems/pendingItems.service.ts:281-283`).
- Não há schema Zod nesta rota: chaves extras no body são ignoradas, e o `correctedValue` **não** é validado por vocabulário na resposta; essa validação acontece apenas na revisão (`F1 src/modules/pendingItems/pendingItems.service.ts:287-313`; `F1 src/modules/pendingItems/pendingItems.service.ts:392-453`).

#### Efeito

- O item passa a `responded`, com `responded_at` preenchido (`F1 src/modules/pendingItems/pendingItems.repository.ts:414-420`).
- Se não restar nenhum `requested` no lote, a exigência de anexo do lote estiver satisfeita (sem linha com `request_attachment = true` ou com ao menos um anexo no lote) e o status atual não for `Em triagem`, a solicitação passa para `Em triagem`; caso contrário, o status não muda (`F1 src/modules/pendingItems/pendingItems.service.ts:324-330`; `F1 src/modules/pendingItems/pendingItems.repository.ts:433-466`).
- Auditoria: `pending_item.respond` com origem `admin` quando há cookie de sessão (inclusive `Solicitante` autenticado) e `requester` quando a identidade vem apenas do header; a mudança de status grava `request.status_change` com nota `"pendencia respondida completa"` e origem `system` (`F1 src/modules/pendingItems/pendingItems.controller.ts:59-69`; `F1 src/modules/pendingItems/pendingItems.repository.ts:422-431,456-465`).

#### Response 200

O `PendingItem` atualizado (`F1 src/modules/pendingItems/pendingItems.service.ts:332-333`). A resposta não inclui `solicitationStatus`.

#### Erros

| Status | `code` | Mensagem literal                                                                         | Condição                                                                |
| ------ | ------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 400    | —      | `"pendingItemId é obrigatório"`                                                          | `:pendingItemId` vazio                                                  |
| 400    | —      | `"Campos obrigatórios ausentes: correctedValue"`                                         | `field_edit` sem a chave ou com `undefined`                             |
| 400    | —      | `"Campos inválidos: response — não permitido para field_edit"`                           | `response` em item de campo                                             |
| 400    | —      | `"Campos obrigatórios ausentes: response"`                                               | `observation` sem a chave                                               |
| 400    | —      | `"Campos inválidos: response — Campo obrigatório."`                                      | `response` não string ou vazia                                          |
| 400    | —      | `"Campos inválidos: response — Máximo de 2.000 caracteres."`                             | `response` acima de 2000                                                |
| 400    | —      | `"Campos inválidos: correctedValue — não permitido para observation"`                    | `correctedValue` em observação                                          |
| 401    | —      | `"Valide seus dados para acompanhar esta solicitação."` / `"Token inválido ou expirado"` | identidade ausente/divergente, sessão inválida ou protocolo inexistente |
| 403    | —      | `"Troca de senha obrigatória antes de continuar"`                                        | cookie com `must_change_password`                                       |
| 404    | —      | `"Solicitação não encontrada"`                                                           | item inexistente ou de outro protocolo                                  |
| 409    | —      | `"Esta pendência já foi respondida."`                                                    | status diferente de `requested`                                         |
| 500    | —      | `"Erro interno do servidor"`                                                             | falha não prevista                                                      |

### 13.7 POST `/requests/:protocol/pending-items/:pendingItemId/attachments`

Anexa um arquivo a um item, em requisição separada.

#### Request

`multipart/form-data` com uma parte de arquivo no campo `file` (`F1 src/modules/pendingItems/pendingItems.router.ts:19-33,50-67`).

| Regra                   | Valor                                                                                                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arquivos por requisição | 1 (`files: 1`)                                                                                                                                                                               |
| Tamanho por arquivo     | 10 MiB (`MAX_FILE_SIZE_BYTES`)                                                                                                                                                               |
| MIME aceitos            | `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `image/png`, `image/jpeg` |
| Storage                 | memória (`multer.memoryStorage()`), persistido depois por `saveFiles`                                                                                                                        |

Regras efetivas:

- MIME fora da allowlist → `400 "Formato de arquivo não permitido. Aceitos: PDF, DOCX, XLSX, PNG e JPG."`, tanto no `fileFilter` do multer quanto no service (`F1 src/modules/pendingItems/pendingItems.router.ts:22-30`; `F1 src/modules/pendingItems/pendingItems.service.ts:357-362`).
- Arquivo acima de 10 MiB → o multer aborta com `LIMIT_FILE_SIZE`, convertido em `400 "Cada anexo deve ter no máximo 10MB."` (`F1 src/modules/pendingItems/pendingItems.router.ts:54-60`).
- Sem parte `file` → `400 "Campos obrigatórios ausentes: file"` (`F1 src/modules/pendingItems/pendingItems.controller.ts:78-79`).
- Somente `LIMIT_FILE_SIZE` é convertido pelo router; os demais erros do multer não viram `AppError` e caem no handler genérico, que responde `500 "Erro interno do servidor"` (`F1 src/modules/pendingItems/pendingItems.router.ts:55-63`; `F1 src/shared/middleware/errorHandler.ts:34-43`).
- O item precisa pertencer ao `:protocol` (`404 "Solicitação não encontrada"` para item inexistente ou de outro protocolo) (`F1 src/modules/pendingItems/pendingItems.service.ts:349-355`).
- **Não há checagem de status nem da flag `requestAttachment`:** o anexo é aceito em item `requested`, `responded` ou `validated`, e mesmo quando o lote tem `requestAttachment: false` (`F1 src/modules/pendingItems/pendingItems.service.ts:336-390`).
- O anexo não altera o status do item nem o da solicitação; apenas insere uma linha em `attachments` (`F1 src/modules/pendingItems/pendingItems.repository.ts:474-504`).
- **Não há limite de quantidade por item, lote ou solicitação, nem deduplicação por nome/tamanho/MIME.** Cada requisição acrescenta uma linha em `attachments` (`F1 src/modules/pendingItems/pendingItems.repository.ts:474-504`).
- Não há validação de extensão; a decisão é apenas pelo `file.mimetype` (`F1 src/shared/middleware/upload.ts:5-11,22-30`).
- A gravação usa `uploaded_by: "requester"` e `is_restricted: false`; auditoria `pending_item.attach` com `changeOrigin: "requester"` (`F1 src/modules/pendingItems/pendingItems.repository.ts:480-503`).
- Não existe `expectedAttachmentType` nem limite de 3 anexos no backend. No legado, a coluna `expected_attachment_type` aparece apenas na documentação de persistência de `requests` (`F1 docs/database/requests-persistence.md:312`), sem uso por este domínio; o limite de 3 existe somente no consumidor (`F2 src/lib/types/request.ts:335`).

#### Response 201

`InternalAttachment` derivado do arquivo salvo (`F1 src/modules/pendingItems/pendingItems.service.ts:383-389`):

```json
{
  "fileName": "comprovante.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 245000,
  "downloadUrl": null,
  "canDownload": false
}
```

`downloadUrl` é sempre `null` e `canDownload` é sempre `false`; não há rota de download neste domínio (`F1 src/modules/pendingItems/pendingItems.service.ts:43-49,383-389`).

#### Erros

| Status | `code` | Mensagem literal                                                                         | Condição                                                                |
| ------ | ------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 400    | —      | `"pendingItemId é obrigatório"`                                                          | `:pendingItemId` vazio                                                  |
| 400    | —      | `"Campos obrigatórios ausentes: file"`                                                   | multipart sem parte `file`                                              |
| 400    | —      | `"Formato de arquivo não permitido. Aceitos: PDF, DOCX, XLSX, PNG e JPG."`               | MIME fora da allowlist                                                  |
| 400    | —      | `"Cada anexo deve ter no máximo 10MB."`                                                  | arquivo acima de 10 MiB                                                 |
| 401    | —      | `"Valide seus dados para acompanhar esta solicitação."` / `"Token inválido ou expirado"` | identidade ausente/divergente, sessão inválida ou protocolo inexistente |
| 403    | —      | `"Troca de senha obrigatória antes de continuar"`                                        | cookie com `must_change_password`                                       |
| 404    | —      | `"Solicitação não encontrada"`                                                           | protocolo/item inexistente ou item de outro protocolo                   |
| 500    | —      | `"Falha ao salvar anexo"`                                                                | falha ao persistir o arquivo no storage                                 |
| 500    | —      | `"Erro interno do servidor"`                                                             | falha não prevista, inclusive erro de multer não mapeado                |

### 13.8 POST `/requests/:protocol/public/verify`

Verifica nome, e-mail e protocolo no modo público e devolve um booleano, sem emitir sessão.

#### Request

`application/json` (`F1 src/modules/pendingItems/pendingItems.schema.ts:30-34`):

| Campo      | Tipo   | Obrigatório   | Regra                                                                                   |
| ---------- | ------ | ------------- | --------------------------------------------------------------------------------------- |
| `name`     | string | sim           | `trim`; 3 a 150 caracteres                                                              |
| `email`    | string | sim           | `trim`, minúsculas, e-mail válido, máximo 254                                           |
| `protocol` | string | sim no schema | `trim` e mínimo 1; se ausente no corpo, o controller preenche com o `:protocol` do path |

Exemplo:

```json
{
  "name": "Nome do Solicitante",
  "email": "solicitante@example.com",
  "protocol": "MAAT-8K3P-9X2M"
}
```

Ordem efetiva, verificada no controller e no service: rate limit → formato (`400`) → modo de acesso (`403`) → protocolo do corpo igual ao do path (`401`) → existência da solicitação (`401`) → nome/e-mail normalizados (`401`) (`F1 src/modules/pendingItems/pendingItems.controller.ts:103-124`; `F1 src/modules/pendingItems/pendingItems.service.ts:526-544`).

- O rate limit é de 10 tentativas por 10 minutos, chave `<ip>:<protocolo em minúsculas>`, em memória do processo; todas as tentativas contam, inclusive as inválidas (`F1 src/modules/pendingItems/pendingItems.controller.ts:8-12,109-112`; `F1 src/shared/middleware/rateLimit.ts:7-23`).
- O modo é lido de `portal-config`; fora de `PUBLIC` → `403 "Verificação indisponível no modo atual"` (`F1 src/modules/pendingItems/pendingItems.service.ts:531-533`).
- A comparação de nome remove acentos e ignora caixa; a de e-mail faz `trim` e minúsculas (`F1 src/shared/utils/normalizeIdentity.ts:1-11`).
- A resposta não tem `Set-Cookie`, JWT nem `expiresInMinutes` (`F1 src/modules/pendingItems/pendingItems.controller.ts:124`).

#### Response 200

```json
{
  "protocol": "MAAT-8K3P-9X2M",
  "canAccess": true
}
```

O `protocol` ecoado é o do path, já com `trim` (`F1 src/modules/pendingItems/pendingItems.controller.ts:124`).

#### Erros

| Status | `code` | Mensagem literal                                          | Condição                                                                               |
| ------ | ------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 400    | —      | `"Protocolo é obrigatório"`                               | `:protocol` vazio                                                                      |
| 400    | —      | mensagem agregada de `formatZodIssues`                    | corpo fora do schema                                                                   |
| 401    | —      | `"Valide seus dados para acompanhar esta solicitação."`   | protocolo do corpo diferente do path; solicitação inexistente; nome/e-mail divergentes |
| 403    | —      | `"Verificação indisponível no modo atual"`                | portal em modo diferente de `PUBLIC`                                                   |
| 429    | —      | `"Muitas tentativas. Tente novamente em alguns minutos."` | mais de 10 tentativas na janela de 10 minutos para o mesmo IP e protocolo              |
| 500    | —      | `"Erro interno do servidor"`                              | falha não prevista                                                                     |

**Desatualizado no legado:** `F1 docs/contract-pendencias_03.md` §7 apresenta `protocol` como parte obrigatória do corpo do verify; o controller preenche o campo a partir do path quando ele está ausente (`F1 src/modules/pendingItems/pendingItems.controller.ts:105-108`), então o corpo sem `protocol` passa pela validação e é comparado pelo valor do path.

### 13.9 Visão do consumidor (F2) e drift

- O consumidor usa exatamente os paths do legado, sem `/api/v1`: `/requests/:protocol/pending-items` (`F2 src/lib/api/pending-item.api.ts:18-21`), `.../:pendingItemId` (`F2 src/lib/api/pending-item.api.ts:90-98`), `.../:pendingItemId/attachments` (`F2 src/lib/api/pending-item.api.ts:130-138`), `.../review` (`F2 src/lib/api/pending-item.api.ts:154-161`) e `/requests/:protocol/public/verify` (`F2 src/lib/api/requester-tracking.api.ts:30-33`).
- O transporte é o do legado: `credentials: "include"` por padrão e `X-Requester-Identity` montado como JSON `{name,email}` quando há identidade pública (`F2 src/lib/api/client.ts:47-69`; `F2 src/lib/api/client.ts:36-43`).
- Os tipos de wire espelham o legado: `ListPendingItemsResponse` com `batchId`, `requestAttachment` e `items`; `CreatePendingItemsResponse`; `ReviewPendingItemsResponse`; `RespondPendingItemBody` como união `{response}`/`{correctedValue}` (`F2 src/lib/types/pendency.ts:54-108`). `ListPendenciesResponse` é um alias do mesmo tipo (`F2 src/lib/types/pendency.ts:107-108`).
- O consumidor agrupa os itens por `batchId` em `PendingBatch`, tipo que não existe no backend; deriva `observation`, `fields`, contadores e `resolved` (todos `validated`) localmente (`F2 src/lib/types/pendency.ts:131-149`; `F2 src/lib/services/pendency.service.ts:160-215`). `requestAttachment` só é `true` quando o lote é o `batchId` do envelope (`F2 src/lib/services/pendency.service.ts:170-177`).
- O consumidor bloqueia nova pendência quando existe lote não resolvido (`F2 src/lib/services/pendency.service.ts:217-221`), espelhando o `409` do backend.
- **Mensagens do consumidor.** O service do consumidor substitui as mensagens do backend por textos próprios: `"Já existe uma pendência em aberto para esta solicitação."`, `"Solicitação não encontrada."`, `"Você não tem permissão para solicitar alterações nesta tratativa."`, `"Não foi possível carregar as pendências por campo."`, `"Pendência não encontrada."`, `"Esta pendência já foi respondida."`, `"Resposta inválida. Confira o valor informado."`, `"Arquivo inválido. Use PDF, DOCX, XLSX, PNG ou JPG de até 10 MB."` (`F2 src/lib/services/pendency.service.ts:55-113,235-314`). O `apiClient` lê `body.message || body.error` do envelope legado (`F2 src/lib/api/client.ts:86-93`), mas as mensagens acima são escolhidas pelo status.
- O consumidor valida o corpo antes de enviar: criação com `observation`/`items` (`F2 src/lib/services/pendency.service.ts:410-423`), resposta por tipo e tamanho (`F2 src/lib/services/pendency.service.ts:353-372`), revisão com ao menos uma decisão e `comment` em `reopen` (`F2 src/lib/services/pendency.service.ts:425-431`).
- Em `field_edit`, o consumidor recusa `correctedValue: null` localmente com `"Informe o valor corrigido."` (`F2 src/lib/services/pendency.service.ts:366-370`); o backend aceita `null` (presença da chave basta) (`F1 src/modules/pendingItems/pendingItems.service.ts:287-297`).
- **Anexos no consumidor.** O consumidor aplica limite de **3 anexos por lote** (`MAX_PENDING_ATTACHMENTS_PER_BATCH = 3`) (`F2 src/lib/types/request.ts:335`; `F2 src/lib/pendency/pending-attachments.ts:8-14`), rejeita duplicados por `nome + tamanho + MIME` (`F2 src/lib/pendency/pending-attachments.ts:41-43,79-90`) e aceita arquivo por extensão quando o MIME vem vazio ou `application/octet-stream` (`F2 src/lib/pendency/pending-attachments.ts:30-39`). Nenhuma dessas três regras existe no backend (`F1 src/modules/pendingItems/pendingItems.router.ts:19-33`; `F1 src/shared/middleware/upload.ts:5-13`).
- O consumidor verifica o arquivo antes do envio e, sem arquivo, lança `ApiError(400, "Selecione um arquivo para enviar.")` localmente (`F2 src/lib/api/pending-item.api.ts:108-110`); o backend responderia `"Campos obrigatórios ausentes: file"` se recebesse a requisição sem a parte.
- O consumidor verifica o `protocol` no `sessionStorage` antes de reutilizar a identidade e limpa a identidade ao sair do protocolo (`F2 src/lib/services/requester-identity.service.ts:40-69`); a resposta do verify é tipada como `{ protocol, canAccess: true }` (`F2 src/lib/types/requester-tracking.ts:21-27`).
- O consumidor mapeia `429` para `"Muitas tentativas de validação. Aguarde alguns minutos antes de tentar novamente."` e `403` para `"A consulta pública não está habilitada neste portal."` (`F2 src/lib/services/requester-tracking.service.ts:52-74`).
- **Catálogo de campos no consumidor.** O consumidor tem a mesma lista de 33 `fieldKey`, mas monta rótulos próprios, diferentes dos `FIELD_LABELS` do backend (por exemplo `"Nome"` vs `"Nome completo"`, `"Área do solicitante"` vs `"Área"`, `"Gestor Responsável"` vs `"Gestor responsável"`, `"Contato adicional"` igual) (`F2 src/lib/pendency/field-catalog.ts:43-52`; `F1 src/shared/catalog/fieldCatalog.ts:46-52`).
- O consumidor deixa `requester.fullName`/`requester.corporateEmail` fora da seleção por default, atrás de `includeIdentityFields`, com o comentário de que o detalhe interno ainda não expõe o id de origem (`F2 src/lib/pendency/field-catalog.ts:27-45`). O backend aceita as duas chaves apenas quando `requester_user_id` é nulo (`F1 src/modules/pendingItems/pendingItems.service.ts:125-133`).
- A revisão feita pelo modal do analista envia apenas `{ batchId, items }`, sem `requestAttachment` (`F2 src/routes/(admin)/fila/[protocolo]/components/pendency/PendingItemsModal.svelte:167`); o campo existe no tipo do consumidor (`F2 src/lib/types/pendency.ts:80-84`).
- O consumidor deriva `overdue` de `requested + deadline` vencido e a completude do lote no solicitante (`F2 src/lib/services/pendency.service.ts:378-408`); o backend não expõe status `overdue` nem calcula completude (`F1 src/modules/DTOs/pendingItems/PendingItems.dto.ts:1`).

### 13.10 Confronto com `docs/04-API-Conventions.md`

| Assunto                   | Situação no legado                                                                                                          | Confronto                                                                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base path                 | `/requests/:protocol/pending-items` e `/requests/:protocol/public/verify`, sem prefixo                                      | Divergente (legado vigente): `/api/v1` — §1                                                                                                                               |
| Envelope de erro          | `{ status, statusCode, message }`                                                                                           | Compatível com o envelope legado da §2.1                                                                                                                                  |
| `code` no erro            | Ausente em todos os erros                                                                                                   | Compatível: `code` é aditivo no envelope legado — §2.1; tabela 0.1 #2                                                                                                     |
| Validação                 | `400` com mensagem agregada, sem `code` e sem `fields`; não há `422` neste domínio                                          | Divergente (legado vigente): §3 congela `400` + `validation_error` + `fields` como lista                                                                                  |
| Paginação                 | `GET .../pending-items` sem paginação e sem envelope de página                                                              | Compatível por exceção registrada — tabela 0.1 #6 e §4.3 (linha “Pendências”, `—`/`—`/`—`)                                                                                |
| `LIMIT` interno           | Consulta sem `LIMIT` interno (`F1 src/modules/pendingItems/pendingItems.repository.ts:69-78`)                               | Divergente (legado vigente): a §4.2 fixa que nenhum repositório consulta sem `limit`, e a §4.3 exige que a spec declare o `LIMIT` interno da listagem não paginada        |
| Multipart                 | 1 arquivo, 10 MiB, allowlist de MIME; MIME inválido → `400`; tamanho → `400`                                                | Limites compatíveis; status Divergente (legado vigente): §9 congela `415` para MIME e `413` para tamanho                                                                  |
| Rate limit                | 10 tentativas/10 min por IP+protocolo, em memória, `429` com mensagem textual                                               | Divergente (legado vigente): §13 congela `429` com `rate_limited`, `Retry-After` e storage compartilhado                                                                  |
| Identidade do solicitante | `X-Requester-Identity` com nome+e-mail; divergência → `401` genérico; protocolo inexistente → `401`                         | Divergente (legado vigente): §15.3 e ADR-0023 apontam `X-Requester-Email` como chave de busca e `404` para protocolo não encontrado                                       |
| Autorização               | Perfis `Analista`/`Gestor`/`Administrador` no router; custódia por `professional_id` em criar/revisar                       | Divergente (legado vigente): §6 e ADR-0025 usam as capabilities `pending_item:read`, `pending_item:write` e `pending_item:review`, com escopo `own`/`all`                 |
| Sucesso                   | `201` em criação e anexo; `200` em leitura, resposta, revisão e verify                                                      | Compatível — §15.4                                                                                                                                                        |
| Datas                     | timestamps ISO-8601 UTC; `deadline` como `yyyy-mm-dd`                                                                       | Compatível — §10                                                                                                                                                          |
| Idioma                    | Chaves `camelCase`; valores de enum (`field_edit`, `observation`, `requested`, `responded`, `validated`) em inglês          | Compatível — §11; os valores de enum são identificadores internos, não texto de UI                                                                                        |
| Idempotência              | `review` ignora reenvio de `id+decision`; `respond` não é idempotente (segunda chamada → `409`); `POST` não deduplica       | Compatível com a tabela da §8.2; a idempotência do `review` é regra do contrato legado (`F1 docs/contract-pendencias_03.md` §7; `D-P23` do contrato de pendências em §12) |
| Request-id                | Ausente                                                                                                                     | Divergente (legado vigente): sem header `x-request-id`; o `requestId` do envelope é aditivo (§2.1) — §12; anotado na §3                                                   |
| `deadline` no wire        | A chave é sempre emitida, com `null` quando não há prazo (`F1 src/modules/pendingItems/pendingItems.repository.ts:764-766`) | Desatualizado no legado: o contrato marca `deadline` como opcional (`F1 docs/contract-pendencias_03.md` §7)                                                               |

## 14. queue

Fila centralizada do painel interno: métricas agregadas e listagem paginada das solicitações. O
mesmo router monta o subfluxo de mapeamento (`GET`/`PUT /queue/requests/:protocol/mapping`), que é
contrato da §11 — esta seção cobre apenas as duas rotas de fila.

### 14.1 Fontes

| Ref | Caminho                                      | Uso                                                               |
| --- | -------------------------------------------- | ----------------------------------------------------------------- |
| F1  | `src/modules/queue/queue.router.ts`          | montagem, guards de perfil                                        |
| F1  | `src/modules/queue/queue.controller.ts`      | borda HTTP: validação da query e status                           |
| F1  | `src/modules/queue/queue.schemas.ts`         | `queueQuerySchema` e `queueFilterQuerySchema`                     |
| F1  | `src/modules/queue/queue.service.ts`         | escopo por perfil, paginação, serialização                        |
| F1  | `src/modules/queue/queue.repository.ts`      | SQL das métricas, da listagem e da lista de analistas             |
| F1  | `src/modules/queue/queue.filters.ts`         | semântica de filtros compartilhada com o CSV (§15)                |
| F1  | `src/modules/DTOs/queue/queue.dto.ts`        | `FindQueueParams`                                                 |
| F1  | `src/shared/types/queue.types.ts`            | shapes de request/response                                        |
| F1  | `src/shared/types/requests.ts`               | `IN_PROGRESS_STATUSES`, `TERMINAL_STATUSES`, `REQUEST_PRIORITIES` |
| F1  | `docs/issues/102-scope-queue-to-analyst.md`  | decisão do escopo por Analista                                    |
| F1  | `docs/contract-assign-action.md` §Pendências | `GET /queue` reflete só o responsável de triagem                  |
| F2  | `src/lib/types/queue.ts`                     | tipos do envelope e do item                                       |
| F2  | `src/lib/api/request.api.ts`                 | cliente de `GET /queue` e `GET /queue/metrics`                    |
| F2  | `src/routes/(admin)/fila/+page.server.ts`    | tradução da URL da tela para a query da API                       |

Não há documento do legado dedicado ao contrato de `GET /queue`: a semântica dos filtros só existe
como comentário no código (`F1 src/modules/queue/queue.filters.ts:8-12`). O contrato do CSV
(`F1 docs/queue-csv-export-contract.md:16-27`) descreve os mesmos filtros e é citado na §15. O
contrato de atribuição registra como pendência aberta a decisão entre refletir só o responsável de
triagem ou também o de mapeamento na fila (`F1 docs/contract-assign-action.md:180-183`).

### 14.2 Rotas

| #   | Método | Path             | Autenticação/autorização                         | Handler                | Sucesso  | Erros              |
| --- | ------ | ---------------- | ------------------------------------------------ | ---------------------- | -------- | ------------------ |
| 45  | GET    | `/queue/metrics` | sessão + `Analista`, `Gestor` ou `Administrador` | `getMetricsController` | 200 JSON | 401, 403, 500      |
| 46  | GET    | `/queue`         | sessão + `Analista`, `Gestor` ou `Administrador` | `centralizedQueue`     | 200 JSON | 400, 401, 403, 500 |

Evidência: `F1 src/modules/queue/queue.router.ts:11-23`; montagem em `F1 src/router.ts:28`.

Os dois handlers respondem `200` fixo, sem `201`/`204` (`F1 src/modules/queue/queue.controller.ts:10,22`).
O guard é `requireRole("Analista", "Gestor", "Administrador")`; a custódia por solicitação não existe
nesta rota — a restrição do Analista é aplicada no service (§14.4, "Escopo por perfil").

### 14.3 GET `/queue/metrics`

#### Request

Sem path params e sem query params: o controller não lê `req.query`, apenas repassa `req.user`
(`F1 src/modules/queue/queue.controller.ts:7-11`). Parâmetros enviados na URL são ignorados.

#### Response 200

```json
{
  "totalRequests": 42,
  "unassignedRequests": 7,
  "inProgressRequests": 12,
  "overdueRequests": 3
}
```

| Campo                | Tipo             | Definição no SQL                                                                                                        | Evidência                                                                                          |
| -------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `totalRequests`      | number (inteiro) | `COUNT(requests.*)`                                                                                                     | `F1 src/modules/queue/queue.repository.ts:35`                                                      |
| `unassignedRequests` | number (inteiro) | `requests.professional_id IS NULL`                                                                                      | `F1 src/modules/queue/queue.repository.ts:36-38`                                                   |
| `inProgressRequests` | number (inteiro) | `statuses.name IN ("Em triagem", "Em mapeamento", "Em análise de viabilidade", "Em desenvolvimento", "Em homologação")` | `F1 src/modules/queue/queue.repository.ts:39-42`; lista em `F1 src/shared/types/requests.ts:34-40` |
| `overdueRequests`    | number (inteiro) | `desired_deadline < CURRENT_DATE` **e** `statuses.name NOT IN ("Concluído", "Cancelado")`                               | `F1 src/modules/queue/queue.repository.ts:43-48`; lista em `F1 src/shared/types/requests.ts:42-43` |

- As quatro contagens vêm do mesmo `SELECT` com a mesma cláusula de escopo; `|| 0` cobre resultado
  nulo (`F1 src/modules/queue/queue.repository.ts:33-57`).
- "Atrasada" é prazo **já** vencido: vencer hoje ainda não conta
  (`F1 src/modules/queue/queue.repository.ts:43-44`).
- O corte de atraso usa `CURRENT_DATE` — o dia do processo do banco, sem conversão de fuso. O
  dashboard usa `CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'` (§15.3), portanto os dois
  números podem divergir na virada do dia.
- A lista de status "em andamento" é fixa em código; `inProgressRequests` não deriva de
  `statuses.closes_request`/`is_terminal`.
- **Divergente (legado vigente):** `overdueRequests` trata o prazo desejado como atraso; o ADR-0024
  fixa que o prazo desejado não é SLA.

#### Escopo por perfil

`resolveQueueScope` devolve `undefined` para qualquer perfil diferente de `Analista` e, para
`Analista`, `Number(actor.id)` — ou `0` quando o id não é inteiro positivo, valor que não existe em
`users.user_id` e por isso não casa nenhuma linha (`F1 src/modules/queue/queue.service.ts:9-22`).

Com escopo definido, o repositório passa a contar apenas solicitações em que o usuário é o
responsável de triagem **ou** o designado do mapeamento:

```sql
leftJoin details_professional as assignee          -- requests.professional_id
leftJoin details_professional as mapping_assignee  -- requests.mapping_professional_id
andWhere ( assignee.user_id = :scopedUserId OR mapping_assignee.user_id = :scopedUserId )
```

Evidência: `F1 src/modules/queue/queue.repository.ts:10-31`. Os joins são 1:1 por
`professional_id`, o que mantém as contagens sem inflação (`F1 src/modules/queue/queue.repository.ts:11-13`).

Consequência observável do SQL: para um `Analista`, `unassignedRequests` não é necessariamente
zero — uma solicitação sem `professional_id` em que ele seja o designado de mapeamento continua
casando o escopo e é contada como sem responsável **de triagem**.

#### Erros

| Status | Condição                                                            | Mensagem                                                                            | Evidência                                            |
| ------ | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 401    | sem cookie de sessão                                                | `"Token não fornecido"`                                                             | `F1 src/shared/middleware/auth.ts:27-30`             |
| 401    | token inválido/expirado, usuário ou perfil inativo, sessão revogada | `"Token inválido ou expirado"` / `"Sua sessão foi revogada. Faça login novamente."` | `F1 src/shared/middleware/auth.ts:37-45,69-72,87-95` |
| 403    | perfil fora de Analista/Gestor/Administrador                        | `"Acesso restrito ao perfil Analista ou Gestor ou Administrador"`                   | `F1 src/shared/middleware/requireRole.ts:21-22`      |
| 403    | `must_change_password` pendente                                     | `"Troca de senha obrigatória antes de continuar"`                                   | `F1 src/shared/middleware/auth.ts:58-61`             |
| 500    | falha não prevista                                                  | `"Erro interno do servidor"`                                                        | `F1 src/shared/middleware/errorHandler.ts:32-44`     |

### 14.4 GET `/queue`

#### Request — query

Validada por `queueQuerySchema` (`F1 src/modules/queue/queue.schemas.ts:50-66`) a partir de
`req.query` (`F1 src/modules/queue/queue.controller.ts:14-18`).

| Param        | Tipo aceito                                           | Regra                                   | Default | Mensagem literal                                                             | Evidência                                     |
| ------------ | ----------------------------------------------------- | --------------------------------------- | ------- | ---------------------------------------------------------------------------- | --------------------------------------------- |
| `page`       | inteiro ≥ 1                                           | obrigatório; `coerce`                   | —       | `"Deve ser um número."` / `"Deve ser um número inteiro."` / `"Mínimo de 1."` | `F1 src/modules/queue/queue.schemas.ts:54`    |
| `pageSize`   | inteiro 1..100                                        | obrigatório; `coerce`                   | —       | idem + `"Máximo de 100."`                                                    | `F1 src/modules/queue/queue.schemas.ts:55-59` |
| `search`     | string ≤ 254                                          | `trim`                                  | ausente | `"Máximo de 254 caracteres."`                                                | `F1 src/modules/queue/queue.schemas.ts:6`     |
| `status`     | string 1..100                                         | `trim`; comparado ao **nome** do status | ausente | `"Status inválido."` / `"Máximo de 100 caracteres."`                         | `F1 src/modules/queue/queue.schemas.ts:7-12`  |
| `priority`   | `Baixa` \| `Média` \| `Alta` \| `Crítica` \| `nenhum` | enum                                    | ausente | `"Prioridade inválida."`                                                     | `F1 src/modules/queue/queue.schemas.ts:13-15` |
| `assigneeId` | UUID \| dígitos \| `unassigned`                       | `trim`                                  | ausente | `"Identificador do responsável inválido."`                                   | `F1 src/modules/queue/queue.schemas.ts:16-22` |
| `unassigned` | `true` \| `false` \| `1` \| `0`                       | convertido para boolean                 | ausente | `"Valor inválido para \"unassigned\"."`                                      | `F1 src/modules/queue/queue.schemas.ts:23-26` |

Regras adicionais:

- `page` e `pageSize` são **obrigatórios** e não têm default (`F1 src/modules/queue/queue.schemas.ts:46-49,54-59`).
- `unassigned=true` combinado com `assigneeId` diferente de `unassigned` é rejeitado com
  `"\"unassigned\" e \"assigneeId\" não podem ser combinados."`, no path `unassigned`
  (`F1 src/modules/queue/queue.schemas.ts:29-35,63-66`).
- O schema **não** é `.strict()`: parâmetro desconhecido na query é descartado em silêncio
  (`F1 src/modules/queue/queue.schemas.ts:50-62`). O schema dos filtros sem paginação
  (`queueFilterQuerySchema`), usado pelo CSV, é `.strict()` (`F1 src/modules/queue/queue.schemas.ts:38-44`).
- `status` não é validado contra o catálogo de status; é comparado por igualdade ao rótulo
  (`statuses.name`) e um nome inexistente devolve lista vazia
  (`F1 src/modules/queue/queue.filters.ts:25`).

Semântica dos filtros (`F1 src/modules/queue/queue.filters.ts:13-50`):

| Filtro                                         | SQL                                                                                                                     |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `search`                                       | `protocol ILIKE %search%` **ou** `requester.corporate_email ILIKE %search%` **ou** `requester.full_name ILIKE %search%` |
| `status`                                       | `statuses.name = :status` (igualdade exata)                                                                             |
| `priority = "nenhum"`                          | `requests.priority_id IS NULL`                                                                                          |
| `priority` = nível                             | `priorities.level = :priority`                                                                                          |
| `unassigned=true` ou `assigneeId="unassigned"` | `requests.professional_id IS NULL`                                                                                      |
| `assigneeId` numérico                          | `assignee_user.user_id = :assigneeId`                                                                                   |
| `assigneeId` UUID                              | `requests.professional_id = :assigneeId`                                                                                |
| escopo do Analista                             | `assignee_user.user_id = :scopedUserId` **ou** `mapping_assignee.user_id = :scopedUserId`                               |

#### Response 200

```json
{
  "data": [
    {
      "protocol": "MAAT-0000-0000",
      "createdAt": "2026-10-27T12:00:00.000Z",
      "processName": "Conferência de notas fiscais",
      "priority": "Média",
      "status": "Em triagem",
      "assignee": "Analista Exemplo",
      "requesterName": "Solicitante Exemplo",
      "requesterEmail": "solicitante@example.com",
      "assigneeId": "20"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1,
  "totalPages": 1,
  "assignees": [{ "id": "20", "name": "Analista Exemplo" }]
}
```

| Campo                                     | Tipo                                        | Origem                                      | Evidência                                                                                       |
| ----------------------------------------- | ------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `data[].protocol`                         | string                                      | `requests.protocol`                         | `F1 src/modules/queue/queue.repository.ts:88`                                                   |
| `data[].createdAt`                        | string ISO-8601 UTC                         | `requests.created_at`, com `toIso`          | `F1 src/modules/queue/queue.repository.ts:89`; `F1 src/modules/queue/queue.service.ts:30-33,67` |
| `data[].processName`                      | string                                      | `requests.process_name`                     | `F1 src/modules/queue/queue.repository.ts:90`                                                   |
| `data[].priority`                         | `"Baixa"\|"Média"\|"Alta"\|"Crítica"\|null` | `priorities.level` (LEFT JOIN)              | `F1 src/modules/queue/queue.repository.ts:91`                                                   |
| `data[].status`                           | string (nome do status)                     | `statuses.name`                             | `F1 src/modules/queue/queue.repository.ts:92`                                                   |
| `data[].assignee`                         | string \| null                              | `users.full_name` do responsável de triagem | `F1 src/modules/queue/queue.repository.ts:95`; `F1 src/modules/queue/queue.service.ts:71`       |
| `data[].requesterName`                    | string                                      | `requesters.full_name`                      | `F1 src/modules/queue/queue.repository.ts:96`                                                   |
| `data[].requesterEmail`                   | string                                      | `requesters.corporate_email`                | `F1 src/modules/queue/queue.repository.ts:97`                                                   |
| `data[].assigneeId`                       | string \| null                              | `assignee_user.user_id::text`               | `F1 src/modules/queue/queue.repository.ts:93-94`; `F1 src/modules/queue/queue.service.ts:74`    |
| `page`, `pageSize`, `total`, `totalPages` | number                                      | ver paginação abaixo                        | `F1 src/modules/queue/queue.service.ts:77-84`                                                   |
| `assignees[]`                             | `{ id: string, name: string }`              | lista completa de analistas                 | `F1 src/modules/queue/queue.repository.ts:109-121`                                              |

Campos que **não** existem no item: `mappingAssigneeId`, `mappingAssigneeName` e `demandTitle`. O
contrato de atribuição registra que `GET /queue` reflete apenas o responsável de triagem
(`F1 docs/contract-assign-action.md:95-96,183`).

`assignees`:

- vem de `details_professional` ⋈ `users` ⋈ `profiles`, filtrando `details_professional.status =
'active'`, `users.is_active = true`, `profiles.is_active = true` e `profiles.name = 'analista'`,
  ordenado por `users.full_name` ascendente (`F1 src/modules/queue/queue.repository.ts:109-121`);
- é buscado em paralelo com a página e **não** recebe os filtros nem o escopo do Analista
  (`F1 src/modules/queue/queue.service.ts:46-58`); `id` é o `user_id` serializado como texto.

#### Ordenação e paginação

- Ordem fixa: `requests.created_at DESC`, sem critério de desempate
  (`F1 src/modules/queue/queue.repository.ts:99`).
- `totalPages = 0` quando `total = 0`; caso contrário `ceil(total / pageSize)`
  (`F1 src/modules/queue/queue.service.ts:60`).
- `page` devolvido é preso ao intervalo: `1` quando não há resultados, `min(page, totalPages)`
  quando há (`F1 src/modules/queue/queue.service.ts:61-63`).
- O `offset` da consulta é calculado sobre a página **solicitada**, antes do ajuste
  (`F1 src/modules/queue/queue.service.ts:40,54-55`). Pedir `page` além do fim devolve
  `data: []` com `page` igual à última página válida e `totalPages` coerente — o ajuste é só do eco,
  não da janela consultada.
- `pageSize` acima de 100 é rejeitado com 400 (não é truncado)
  (`F1 src/modules/queue/queue.schemas.ts:55-59`).

#### Escopo por perfil

O mesmo `resolveQueueScope` das métricas (`F1 src/modules/queue/queue.service.ts:17-22,53`) é
repassado como `scopedUserId` para a listagem (`F1 src/modules/queue/queue.service.ts:46-56`) e
aplicado como `OR` entre responsável de triagem e designado de mapeamento
(`F1 src/modules/queue/queue.filters.ts:43-50`). O join `mapping_assignee` existe sempre na query da
listagem (`F1 src/modules/queue/queue.repository.ts:75-80`).

Efeitos registrados em `F1 docs/issues/102-scope-queue-to-analyst.md`: solicitações sem responsável não aparecem para o Analista; `total` e
paginação refletem o conjunto filtrado; Gestor e Administrador permanecem sem restrição
(`F1 docs/issues/102-scope-queue-to-analyst.md:18-23,37-42`). O escopo é resolvido no servidor, sem
parâmetro de cliente (`F1 docs/issues/102-scope-queue-to-analyst.md:41`).

#### Erros

| Status | Condição                                  | Mensagem                                                                                                                                   | Evidência                                                                                       |
| ------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| 400    | query fora do schema                      | agregada por `formatZodIssues(..., "query")`, no formato `Campos inválidos: <campo> — <motivo>` / `Campos obrigatórios ausentes: <campos>` | `F1 src/modules/queue/queue.controller.ts:16-18`; `F1 src/shared/validation/zodErrors.ts:57-91` |
| 400    | `page`/`pageSize` ausentes                | `"Campos inválidos: page — Deve ser um número.; pageSize — Deve ser um número."`                                                           | `F1 src/modules/queue/queue.schemas.ts:54-59`                                                   |
| 400    | `pageSize` > 100                          | `"Campos inválidos: pageSize — Máximo de 100."`                                                                                            | `F1 src/modules/queue/queue.schemas.ts:55-59`                                                   |
| 400    | `unassigned` + `assigneeId` incompatíveis | `"Campos inválidos: unassigned — \"unassigned\" e \"assigneeId\" não podem ser combinados."`                                               | `F1 src/modules/queue/queue.schemas.ts:41-44`                                                   |
| 401    | sem sessão / sessão inválida              | `"Token não fornecido"` / `"Token inválido ou expirado"`                                                                                   | `F1 src/shared/middleware/auth.ts:27-45`                                                        |
| 403    | perfil não interno ou senha pendente      | `"Acesso restrito ao perfil Analista ou Gestor ou Administrador"` / `"Troca de senha obrigatória antes de continuar"`                      | `F1 src/shared/middleware/requireRole.ts:11-22`                                                 |
| 500    | falha não prevista                        | `"Erro interno do servidor"`                                                                                                               | `F1 src/shared/middleware/errorHandler.ts:32-44`                                                |

O erro de validação é `400` (não `422`) e traz só `message`, sem `fields`
(`F1 src/modules/queue/queue.controller.ts:17`).

#### Transporte

JSON, sem headers próprios: a rota não define `Cache-Control` nem `ETag`. Datas do item são
serializadas em ISO-8601 UTC por `toIso` (`F1 src/modules/queue/queue.service.ts:30-33`); as
métricas não expõem data.

### 14.5 Visão do consumidor (F2) e drift

O frontend não tem `queue.api.ts`: as duas chamadas vivem em `request.api.ts`.

| Chamada             | Path             | Query montada                                                                          | Evidência                              |
| ------------------- | ---------------- | -------------------------------------------------------------------------------------- | -------------------------------------- |
| `listQueueRequests` | `/queue`         | `page`, `pageSize`, `search`, `status`, `priority`, `assigneeId` — só quando definidos | `F2 src/lib/api/request.api.ts:68-95`  |
| `getQueueMetrics`   | `/queue/metrics` | nenhuma                                                                                | `F2 src/lib/api/request.api.ts:97-105` |

Drift observado:

- **`unassigned` não existe no consumidor.** `QueueFilterQuery` do F2 declara só `search`, `status`,
  `priority`, `assigneeId` (`F2 src/lib/types/queue.ts:20-25`); a query nunca envia `unassigned`
  (`F2 src/lib/api/request.api.ts:78-92`). O filtro "sem responsável" é feito pelo sentinela
  `assigneeId: "unassigned"` (`F2 src/routes/(admin)/fila/+page.server.ts:10,40-46`).
- **Campos de item que o backend não envia.** `QueueItem` do F2 declara `mappingAssigneeId?` e
  `mappingAssigneeName?` como opcionais (`F2 src/lib/types/queue.ts:29-34`); nenhum dos dois aparece
  no `SELECT` do repositório (`F1 src/modules/queue/queue.repository.ts:86-98`). O tipo base
  `RequestSummary` do F2 também declara `demandTitle?`
  (`F2 src/lib/types/request.ts:358-367`), ausente na resposta.
- **`pageSize` fixo em 5** na tela da fila (`F2 src/routes/(admin)/fila/+page.server.ts:8,18`); o
  backend exige o parâmetro, mas não tem default.
- **Clamp confiado ao backend.** O `load` usa `result.data.page` como página efetiva, com comentário
  de que o backend presa a página ao intervalo válido
  (`F2 src/routes/(admin)/fila/+page.server.ts:57-58`) — o eco é ajustado, mas a janela consultada
  não (§14.4).
- **Filtros locais que não chegam à API.** `status=all`, `priority=all` e `assigneeId` fora do padrão
  numérico/UUID são descartados na tradução da URL (`F2 src/routes/(admin)/fila/+page.server.ts:9-14,28-38,40-46`).
- **Rótulo do sentinela.** O F2 nomeia o tipo de `priority` como `PriorityFilter`
  (`F2 src/lib/types/queue.ts:16-18`); o backend usa `QueuePriorityFilter`
  (`F1 src/shared/types/queue.types.ts:21`). O valor `"nenhum"` coincide.
- O consumidor devolve `Result<QueueResponse>` e descarta a mensagem literal do backend, trocando-a
  por `"Não foi possível carregar a fila centralizada."`
  (`F2 src/lib/services/request.service.ts:70-99`).

### 14.6 Confronto com `docs/04-API-Conventions.md`

- **Divergente (legado vigente):** paths sem `/api/v1` — convenção §1.
- **Divergente (legado vigente):** `page` e `pageSize` obrigatórios, sem default 20; a §4.2 fixa
  default 20 e máximo 100, e a §4.3 não tem linha para a fila — o parágrafo de migração registra
  que os valores legados não são herdados. O máximo 100 e o `totalPages: 0` quando vazio coincidem
  com §4.1/§4.2; o clamp ajusta só o eco, não a janela consultada (§14.4).
- **Divergente (legado vigente):** `status` filtra pelo **nome** do status, rótulo editável no
  Admin, em vez de `status.key` — convenção §15.1 e ADR-0021.
- **Divergente (legado vigente):** identificadores de usuário numéricos no wire (`assigneeId` como
  `user_id::text`) — PKs de entidade em UUID (§15.1, ADR-0003).
- **Divergente (legado vigente):** `assigneeId` aceita duas identidades no mesmo parâmetro (UUID de
  `details_professional` e inteiro de `users`), além do sentinela `"unassigned"`
  (`F1 src/modules/queue/queue.schemas.ts:16-22`; `F1 src/modules/queue/queue.filters.ts:33-41`).
  A §15.1 prevê referência por `<nome>Id` a um único identificador.
- **Divergente (legado vigente):** o escopo do Analista é derivado do nome do perfil no service
  (`F1 src/modules/queue/queue.service.ts:17-22`), não de capability/escopo `own`/`all` — ADR-0025 e
  convenção §6.
- **Compatível:** envelope `{ data, page, pageSize, total, totalPages }` com `totalPages = 0` quando
  vazio (§4.1); `page` 1-based; `assignees` é campo aditivo no envelope (§2.1 admite aditivos).
- **Compatível:** datas de timestamp em ISO-8601 UTC (§10).
- **Divergente (legado vigente):** erro de validação em `400` com mensagem agregada e sem `fields`
  — a §3 e a tabela 0.1 #5 congelam `400` + `validation_error` + `fields: [{ path, message }]`.

## 15. reports

Relatórios gerenciais: o painel agregado e a exportação CSV da fila. Nenhuma das duas rotas aplica
escopo por perfil além do guard de perfil — Gestor e Administrador veem o conjunto inteiro.

### 15.1 Fontes

| Ref | Caminho                                                                             | Uso                                        |
| --- | ----------------------------------------------------------------------------------- | ------------------------------------------ |
| F1  | `src/modules/reports/reports.router.ts`                                             | montagem e guards                          |
| F1  | `src/modules/reports/reports.controller.ts`                                         | borda HTTP, validação, headers do CSV      |
| F1  | `src/modules/reports/reports.schema.ts`                                             | `dashboardQuerySchema`                     |
| F1  | `src/modules/reports/reports.service.ts`                                            | composição do payload, formatação do CSV   |
| F1  | `src/modules/reports/reports.repository.ts`                                         | SQL dos agregados e das linhas exportadas  |
| F1  | `src/modules/DTOs/reports/Dashboard.dto.ts`                                         | `DashboardQuery`, `DashboardResponse`      |
| F1  | `src/modules/DTOs/reports/QueueExport.dto.ts`                                       | `QueueExportRow`, `QueueCsvExport`         |
| F1  | `src/modules/queue/queue.schemas.ts`                                                | `queueFilterQuerySchema`, reusado pelo CSV |
| F1  | `src/modules/queue/queue.filters.ts`                                                | semântica dos filtros do CSV               |
| F1  | `src/shared/types/systemTheme.ts`                                                   | `STATUS_TONES` / `StatusTone`              |
| F1  | `docs/dashboard-metrics-contract.md`                                                | contrato do dashboard                      |
| F1  | `docs/queue-csv-export-contract.md`                                                 | contrato da exportação                     |
| F2  | `src/lib/api/dashboard.api.ts`                                                      | cliente do dashboard                       |
| F2  | `src/lib/api/report.api.ts`                                                         | cliente do CSV                             |
| F2  | `src/lib/types/dashboard.ts`, `src/lib/types/metrics.ts`, `src/lib/types/report.ts` | tipos                                      |

### 15.2 Rotas

| #   | Método | Path                    | Autenticação/autorização             | Handler                    | Sucesso        | Erros              |
| --- | ------ | ----------------------- | ------------------------------------ | -------------------------- | -------------- | ------------------ |
| 47  | GET    | `/reports/dashboard`    | sessão + `Gestor` ou `Administrador` | `getDashboardController`   | 200 JSON       | 400, 401, 403, 500 |
| 48  | GET    | `/reports/requests.csv` | sessão + `Gestor` ou `Administrador` | `exportQueueCsvController` | 200 `text/csv` | 400, 401, 403, 500 |

Evidência: `F1 src/modules/reports/reports.router.ts:8-20`; montagem em `F1 src/router.ts:30`.

`Analista` e `Solicitante` recebem `403 "Acesso restrito ao perfil Gestor ou Administrador"`
(`F1 src/shared/middleware/requireRole.ts:21-22`), coerente com o registro do contrato do CSV
(`F1 docs/queue-csv-export-contract.md:8-10`).

### 15.3 GET `/reports/dashboard`

#### Request — query

Validada por `dashboardQuerySchema`, que é `.strict()`
(`F1 src/modules/reports/reports.schema.ts:7-20`; chamada em
`F1 src/modules/reports/reports.controller.ts:9-13`). Param desconhecido → 400.

| Param        | Tipo aceito                                     | Regra                         | Mensagem literal                                                                                    | Evidência                                       |
| ------------ | ----------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `from`       | data `AAAA-MM-DD`                               | data inicial de abertura      | `"Data inválida — use o formato AAAA-MM-DD."`                                                       | `F1 src/modules/reports/reports.schema.ts:4,9`  |
| `to`         | data `AAAA-MM-DD`                               | data final, inclusiva         | idem                                                                                                | `F1 src/modules/reports/reports.schema.ts:4,10` |
| `situation`  | `open` \| `closed` \| `overdue` \| `unassigned` | recorte operacional           | Zod (inglês): `"Invalid option: expected one of \"open\"\|\"closed\"\|\"overdue\"\|\"unassigned\""` | `F1 src/modules/reports/reports.schema.ts:11`   |
| `statusId`   | inteiro positivo                                | id numérico do status         | Zod: `"Deve ser um número."`                                                                        | `F1 src/modules/reports/reports.schema.ts:5,12` |
| `categoryId` | inteiro positivo                                | id numérico da categoria      | idem                                                                                                | `F1 src/modules/reports/reports.schema.ts:5,13` |
| `priorityId` | inteiro positivo \| `unassigned`                | `unassigned` = sem prioridade | Zod (inglês): `"Invalid input"`                                                                     | `F1 src/modules/reports/reports.schema.ts:14`   |

- `from > to` → 400 com `"A data inicial não pode ser posterior à data final."`, no path `from`
  (`F1 src/modules/reports/reports.schema.ts:17-20`).
- Sem `from`/`to`, o recorte temporal não é aplicado
  (`F1 src/modules/reports/reports.repository.ts:68-78`).
- Os ids são `coerce`, então `statusId=7` e `statusId="7"` são aceitos
  (`F1 src/modules/reports/reports.schema.ts:5`).

Semântica do recorte (`F1 src/modules/reports/reports.repository.ts:68-107`):

| Filtro                    | SQL                                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `from`                    | `r.created_at >= (:from::date AT TIME ZONE 'America/Sao_Paulo')`                                                |
| `to`                      | `r.created_at < ((:to::date + INTERVAL '1 day') AT TIME ZONE 'America/Sao_Paulo')`                              |
| `situation=open`          | `s.is_terminal = false`                                                                                         |
| `situation=closed`        | `s.is_terminal = true`                                                                                          |
| `situation=overdue`       | `s.is_terminal = false` **e** `r.desired_deadline < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date` |
| `situation=unassigned`    | `s.is_terminal = false` **e** `r.professional_id IS NULL`                                                       |
| `statusId`                | `r.status_id = :statusId`                                                                                       |
| `categoryId`              | `r.category_id = :categoryId`                                                                                   |
| `priorityId="unassigned"` | `r.priority_id IS NULL`                                                                                         |
| `priorityId` numérico     | `r.priority_id = :priorityId`                                                                                   |

**Desatualizado no legado:** `F1 docs/dashboard-metrics-contract.md:32-35` define `open`/`closed`
por `statuses.closes_request`. O código lê `statuses.is_terminal`
(`F1 src/modules/reports/reports.repository.ts:81-83,116-117,146`), e a coluna `closes_request` foi
**removida** de `statuses` pelo fechamento do motor de status v4
(`F1 migrations/requester_request/20260926000000_complete_status_transition_v4.js:296`); o nome
aparece hoje apenas no `down()` dessa migration
(`F1 migrations/requester_request/20260926000000_complete_status_transition_v4.js:320-322`). O campo
exposto continua se chamando `closesRequest` e carrega `is_terminal`
(`F1 src/modules/reports/reports.service.ts:91`).

#### Response 200

```json
{
  "filters": {
    "from": "2026-07-01",
    "to": null,
    "situation": null,
    "statusId": null,
    "categoryId": null,
    "priorityId": null
  },
  "filterOptions": {
    "statuses": [{ "id": 1, "name": "Solicitação enviada" }],
    "categories": [{ "id": 1, "name": "Automação" }],
    "priorities": [{ "id": 1, "label": "Baixa" }]
  },
  "summary": { "total": 20, "open": 18, "closed": 2, "overdue": 0, "unassigned": 5 },
  "byStatus": [
    {
      "id": 1,
      "name": "Solicitação enviada",
      "count": 1,
      "tone": "info",
      "closesRequest": false
    }
  ],
  "byPriority": [{ "id": null, "label": "Não priorizada", "count": 14 }],
  "byCategory": [{ "id": 1, "name": "Automação", "count": 3 }],
  "openedOverTime": [{ "period": "2026-07", "count": 8 }]
}
```

| Bloco                        | Campos                                                            | Regra                                                                                                                       | Evidência                                                                                                                                           |
| ---------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `filters`                    | `from`, `to`, `situation`, `statusId`, `categoryId`, `priorityId` | eco dos filtros aplicados; ausente → `null`                                                                                 | `F1 src/modules/reports/reports.service.ts:57-64`                                                                                                   |
| `filterOptions.statuses[]`   | `{ id: number, name: string }`                                    | `statuses` com `is_active = true`, ordem `order_number`                                                                     | `F1 src/modules/reports/reports.repository.ts:203-206`                                                                                              |
| `filterOptions.categories[]` | `{ id: number, name: string }`                                    | `categories` com `status = 'active'`, ordem `display_order`                                                                 | `F1 src/modules/reports/reports.repository.ts:207-210`                                                                                              |
| `filterOptions.priorities[]` | `{ id: number, label: string }`                                   | todas as prioridades, ordem `min_score`                                                                                     | `F1 src/modules/reports/reports.repository.ts:211-213`                                                                                              |
| `summary`                    | `total`, `open`, `closed`, `overdue`, `unassigned`                | `COUNT(*)` com `FILTER` sobre o mesmo recorte                                                                               | `F1 src/modules/reports/reports.repository.ts:112-131`                                                                                              |
| `byStatus[]`                 | `{ id, name, count, tone, closesRequest }`                        | `GROUP BY status`, ordem `order_number`; `tone` ∈ `error\|success\|info\|warning\|neutral`; `closesRequest` = `is_terminal` | `F1 src/modules/reports/reports.repository.ts:137-154`; `F1 src/modules/reports/reports.service.ts:86-92`; `F1 src/shared/types/systemTheme.ts:1-3` |
| `byPriority[]`               | `{ id: number \| null, label, count }`                            | LEFT JOIN `priorities`; sem prioridade → `id: null` e `label: "Não priorizada"`; ordem `min_score` com nulos por último     | `F1 src/modules/reports/reports.repository.ts:156-169`                                                                                              |
| `byCategory[]`               | `{ id, name, count }`                                             | INNER JOIN `categories`, ordem `display_order`                                                                              | `F1 src/modules/reports/reports.repository.ts:171-183`                                                                                              |
| `openedOverTime[]`           | `{ period: "YYYY-MM", count }`                                    | mês de `created_at` no fuso `America/Sao_Paulo`, ordem ascendente                                                           | `F1 src/modules/reports/reports.repository.ts:9-12,185-199`                                                                                         |

Regras de composição:

- Todos os agregados de `summary` e das séries recebem os **mesmos** filtros
  (`F1 src/modules/reports/reports.repository.ts:133,152,167,181,197`);
  `filterOptions` **não** recebe filtro nenhum (`F1 src/modules/reports/reports.service.ts:53`;
  `F1 src/modules/reports/reports.repository.ts:201-217`).
- As séries não são preenchidas com zero: `byStatus`/`byCategory`/`byPriority`/`openedOverTime` só
  têm linha para grupo com pelo menos uma solicitação no recorte (é o resultado de `GROUP BY`).
- `closed`/`open` usam `is_terminal`, e não a lista de status terminais da fila; os dois critérios
  podem divergir se um status for terminal em `is_terminal` e não estiver em `TERMINAL_STATUSES`
  (`F1 src/shared/types/requests.ts:42-43`).
- `overdue` do dashboard converte o dia para `America/Sao_Paulo`; o de
  `GET /queue/metrics` usa `CURRENT_DATE` do processo (§14.3).
- `situation=overdue` e `summary.overdue` compartilham a mesma definição "não terminal e prazo
  anterior a hoje" (`F1 src/modules/reports/reports.repository.ts:84-89,118-124`).

#### Erros

| Status | Condição                                | Mensagem                                                                                                  | Evidência                                            |
| ------ | --------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 400    | query fora do schema                    | agregada por `formatZodIssues(..., "query")`                                                              | `F1 src/modules/reports/reports.controller.ts:11-13` |
| 400    | intervalo invertido                     | `"Campos inválidos: from — A data inicial não pode ser posterior à data final."`                          | `F1 src/modules/reports/reports.schema.ts:17-20`     |
| 400    | data fora de `AAAA-MM-DD`               | `"Data inválida — use o formato AAAA-MM-DD."`                                                             | `F1 src/modules/reports/reports.schema.ts:4`         |
| 400    | param desconhecido                      | 400 pelo `.strict()`                                                                                      | `F1 src/modules/reports/reports.schema.ts:16`        |
| 401    | sem sessão / sessão inválida            | `"Token não fornecido"` / `"Token inválido ou expirado"`                                                  | `F1 src/shared/middleware/auth.ts:27-45`             |
| 403    | perfil não autorizado ou senha pendente | `"Acesso restrito ao perfil Gestor ou Administrador"` / `"Troca de senha obrigatória antes de continuar"` | `F1 src/shared/middleware/requireRole.ts:11-22`      |

#### Transporte

JSON `200`, sem `Cache-Control` próprio. Datas puras trafegam como `AAAA-MM-DD` (eco dos filtros) e
`period` como `AAAA-MM`; não há timestamp no payload.

**Divergente (legado vigente):** `overdue` e `situation=overdue` tratam o prazo desejado como SLA;
o ADR-0024 fixa que ele não é.

### 15.4 GET `/reports/requests.csv`

#### Request — query

Validada por `queueFilterQuerySchema` — o schema de filtros da fila **sem** paginação, `.strict()`
(`F1 src/modules/reports/reports.controller.ts:19-23`; `F1 src/modules/queue/queue.schemas.ts:37-44`).

| Param        | Tipo aceito                                           | Regra                                    | Mensagem literal                                     | Evidência                                     |
| ------------ | ----------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------- | --------------------------------------------- |
| `search`     | string ≤ 254                                          | protocolo, nome ou e-mail do solicitante | `"Máximo de 254 caracteres."`                        | `F1 src/modules/queue/queue.schemas.ts:6`     |
| `status`     | string 1..100                                         | nome exato do status                     | `"Status inválido."` / `"Máximo de 100 caracteres."` | `F1 src/modules/queue/queue.schemas.ts:7-12`  |
| `priority`   | `Baixa` \| `Média` \| `Alta` \| `Crítica` \| `nenhum` | `nenhum` = prioridade nula               | `"Prioridade inválida."`                             | `F1 src/modules/queue/queue.schemas.ts:13-15` |
| `assigneeId` | UUID \| dígitos \| `unassigned`                       | responsável de triagem                   | `"Identificador do responsável inválido."`           | `F1 src/modules/queue/queue.schemas.ts:16-22` |
| `unassigned` | `true` \| `false` \| `1` \| `0`                       | compatibilidade com "sem responsável"    | `"Valor inválido para \"unassigned\"."`              | `F1 src/modules/queue/queue.schemas.ts:23-26` |

- `page`/`pageSize` **não** fazem parte do schema e, por `.strict()`, a presença deles gera 400
  (`F1 src/modules/queue/queue.schemas.ts:38-40`; `F1 docs/queue-csv-export-contract.md:11-12`).
- `unassigned=true` com `assigneeId` diferente de `unassigned` → 400
  `"\"unassigned\" e \"assigneeId\" não podem ser combinados."`
  (`F1 src/modules/queue/queue.schemas.ts:29-35,41-44`).
- Os filtros usam exatamente `applyQueueFilters`, o mesmo da fila
  (`F1 src/modules/reports/reports.repository.ts:274`; `F1 src/modules/queue/queue.filters.ts:13-50`).
- **Não** há escopo por Analista no CSV: `applyQueueFilters` é chamado sem `scopedUserId`
  (`F1 src/modules/reports/reports.repository.ts:274`), e a rota já é restrita a Gestor/Administrador.

#### Response 200

```http
200 OK
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="solicitacoes-2026-10-27.csv"
Cache-Control: no-store
X-Content-Type-Options: nosniff
```

Evidência: `F1 src/modules/reports/reports.controller.ts:27-35`.

- `Cache-Control` é `no-store` (sem `private`).
- O nome do arquivo é `solicitacoes-AAAA-MM-DD.csv`, com a data de **hoje** em `America/Sao_Paulo`
  (`F1 src/modules/reports/reports.service.ts:38-43,169`).
- O corpo é a string CSV entregue por `res.send`; `Content-Length` não é definido pela aplicação
  (`F1 src/modules/reports/reports.controller.ts:35`).

**Corpo CSV:**

- UTF-8 com BOM (`\uFEFF`), linhas terminadas em CRLF (`\r\n`), inclusive a última
  (`F1 src/modules/reports/reports.service.ts:166-168`).
- Delimitador `;` (`F1 src/modules/reports/reports.service.ts:159,164`).
- **Todos** os campos saem entre aspas duplas, inclusive o cabeçalho; aspas internas são duplicadas
  (RFC 4180) (`F1 src/modules/reports/reports.service.ts:136-141,164`).
- Valor iniciado por `=`, `+`, `-` ou `@` (após espaços opcionais) recebe `'` na frente, para
  neutralizar fórmula de planilha (`F1 src/modules/reports/reports.service.ts:136-141`).
- Sem paginação: todas as linhas que casam os filtros, ordenadas por `requests.created_at DESC`,
  sem desempate (`F1 src/modules/reports/reports.repository.ts:272`).

Colunas, na ordem (`F1 src/modules/reports/reports.service.ts:13-26,143-160`):

| #   | Cabeçalho                    | Origem                                                                               | Formato                                   |
| --- | ---------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------- |
| 1   | `Protocolo`                  | `requests.protocol`                                                                  | texto                                     |
| 2   | `Data de Abertura`           | `requests.created_at`                                                                | `dd/mm/aaaa HH:MM` em `America/Sao_Paulo` |
| 3   | `Área`                       | `requesters.area`                                                                    | texto ou vazio                            |
| 4   | `Processo`                   | `requests.process_name`                                                              | texto                                     |
| 5   | `Categoria`                  | `categories.name` (INNER JOIN)                                                       | texto                                     |
| 6   | `Status`                     | `statuses.name`                                                                      | texto                                     |
| 7   | `Prioridade`                 | `priorities.level`                                                                   | texto ou vazio                            |
| 8   | `Responsável`                | `users.full_name` do responsável de triagem                                          | texto ou vazio                            |
| 9   | `Data de Mapeamento`         | último `mappings.scheduled_for`                                                      | `dd/mm/aaaa HH:MM` ou vazio               |
| 10  | `Data da Última Atualização` | `COALESCE(requests.updated_at, requests.created_at)`                                 | `dd/mm/aaaa HH:MM`                        |
| 11  | `Resultado da Triagem`       | `requests.internal_notes` (JSON)                                                     | texto ou vazio                            |
| 12  | `Data de Conclusão`          | último `audit_history.occurred_at` de `request.status_change` para o status terminal | `dd/mm/aaaa HH:MM` ou vazio               |

Regras de composição:

- Formatação de data/hora usa `Intl.DateTimeFormat("pt-BR")` com hora 24h e remoção da vírgula:
  `"27/10/2026, 09:30"` → `"27/10/2026 09:30"` (`F1 src/modules/reports/reports.service.ts:28-36,110-115`).
- Valor `null`/`undefined` vira célula vazia `""`; data inválida também
  (`F1 src/modules/reports/reports.service.ts:111,138`).
- **Data de Mapeamento**: `LEFT JOIN LATERAL` sobre `mappings` com
  `ORDER BY m.is_concluded ASC, m.created_at DESC LIMIT 1` — prioriza mapeamento não concluído e,
  entre iguais, o mais recente (`F1 src/modules/reports/reports.repository.ts:232-242`).
- **Data de Conclusão**: `LEFT JOIN LATERAL` sobre `audit_history` que exige
  `status.is_terminal = TRUE`, `entity_type = 'request'`, `entity_id = requests.protocol`,
  `action_type = 'request.status_change'` e `new_value = status.name`; sem evento confiável a célula
  fica vazia (`F1 src/modules/reports/reports.repository.ts:243-257`). A comparação é pelo **nome**
  do status, não por id (`F1 src/modules/reports/reports.repository.ts:252`).

  **Desatualizado no legado:** `F1 docs/queue-csv-export-contract.md:57-59` descreve o status
  terminal como `closes_request = true`; o código usa `status.is_terminal` e a coluna
  `closes_request` não existe mais no schema (`docs/03-Data-Model.md` §17.4).

- **Resultado da Triagem**: lê `requests.internal_notes` e faz `JSON.parse`; usa
  `__triage.result` quando existe o objeto aninhado, senão o `result` de topo; qualquer falha de
  parse, tipo inesperado ou `result` não textual devolve célula vazia
  (`F1 src/modules/reports/reports.service.ts:117-134`). A coluna é declarada legada e fora do
  contrato de observações (`F1 docs/internal-notes-contract.md:9`).
- Linhas são montadas por concatenação de arrays fixos: um registro sem `category` não é exportado,
  porque o join com `categories` é INNER (`F1 src/modules/reports/reports.repository.ts:224`).

#### Erros

| Status | Condição                                                         | Mensagem                                                                                                    | Evidência                                                                                        |
| ------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 400    | filtro inválido, param desconhecido, `page`/`pageSize` presentes | agregada por `formatZodIssues(..., "query")`, e.g. `"Campos inválidos: query — Unrecognized key: \"page\""` | `F1 src/modules/reports/reports.controller.ts:21-23`; `F1 src/modules/queue/queue.schemas.ts:40` |
| 401    | sem sessão / sessão inválida                                     | `"Token não fornecido"` / `"Token inválido ou expirado"`                                                    | `F1 src/shared/middleware/auth.ts:27-45`                                                         |
| 403    | perfil não autorizado                                            | `"Acesso restrito ao perfil Gestor ou Administrador"`                                                       | `F1 src/shared/middleware/requireRole.ts:21-22`                                                  |
| 500    | falha inesperada ao gerar o arquivo                              | `"Erro interno do servidor"`                                                                                | `F1 src/shared/middleware/errorHandler.ts:32-44`                                                 |

O `.strict()` não distingue "param desconhecido" de "filtro inválido": ambos saem com 400 e mensagem
do formatter; não há como o cliente saber qual chave foi rejeitada além do texto.

### 15.5 Visão do consumidor (F2) e drift

Dashboard (`F2 src/lib/api/dashboard.api.ts:7-28`):

- envia `from`, `to`, `situation`, `statusId`, `categoryId`, `priorityId` apenas quando truthy,
  sempre como string (`F2 src/lib/api/dashboard.api.ts:16-22`); `DashboardQuery` do F2 declara os
  três ids como `string` (`F2 src/lib/types/dashboard.ts:4-11`), enquanto o backend devolve os ecos
  como número (`F1 src/modules/reports/reports.service.ts:61-63`).
- o tipo de resposta do F2 espelha o payload campo a campo, inclusive `tone`
  (`F2 src/lib/types/dashboard.ts:1-70`).
- `metrics.ts` do F2 (`MetricItem`, `MetricTone`) é só apresentação da tela e não tem
  correspondência no wire (`F2 src/lib/types/metrics.ts:1-10`).

CSV (`F2 src/lib/api/report.api.ts:27-39`):

- monta só `search`, `status`, `priority` e `assigneeId` (`F2 src/lib/api/report.api.ts:9-19`):
  **não** envia `unassigned` — o filtro "sem responsável" do consumidor é o sentinela
  `assigneeId="unassigned"` de `QueueFilterQuery` (`F2 src/lib/types/queue.ts:20-25`).
- usa `apiFetch` (resposta crua, não JSON) e devolve `{ blob, filename }`
  (`F2 src/lib/types/report.ts:1-4`); o nome vem de `Content-Disposition` por regex
  `filename="([^"]+)"`, com fallback `"solicitacoes.csv"`
  (`F2 src/lib/api/report.api.ts:7,21-25`).
- o download depende de o header estar exposto por CORS
  (`F1 src/app.ts:11-18`; `F1 src/configs.ts:19-21`).
- `exportQueueCsv` do F2 traduz `403` para `"Seu perfil não possui permissão para exportar a fila."`
  e os demais erros para `"Não foi possível exportar a fila centralizada."`
  (`F2 src/lib/services/report.service.ts:6-27`) — a mensagem literal do backend não é exibida.

### 15.6 Confronto com `docs/04-API-Conventions.md`

- **Divergente (legado vigente):** paths sem `/api/v1` — convenção §1.
- **Divergente (legado vigente):** `GET /reports/requests.csv` é listagem **não paginada** e não tem
  linha na tabela de exceções — §4.3 exige linha para qualquer listagem sem paginação.
- **Divergente (legado vigente):** referências a status e categoria no wire por **id numérico**
  (`statusId`, `categoryId`, `priorityId`) — §15.1, ADR-0003 e ADR-0021 determinam UUID/`key` e
  proíbem id numérico de status no wire.
- **Divergente (legado vigente):** erro de validação em `400` com mensagem agregada e sem `fields`
  — a §3 e a tabela 0.1 #5 congelam `400` + `validation_error` + `fields: [{ path, message }]`; o
  envelope de erro legado é compatível com a §2.1.
- **Compatível:** `201`/`204` não se aplicam (ambas as rotas são leitura, §15.4).
- **Compatível:** datas puras do dashboard em `yyyy-mm-dd` (§10); o CSV usa formato de apresentação
  `dd/mm/aaaa`, que não é payload JSON e não é regido por §10.
- **Registrado (sem convenção correspondente):** o CSV coloca `requests.internal_notes` (coluna
  legada) no relatório como "Resultado da Triagem"
  (`F1 src/modules/reports/reports.service.ts:155`), enquanto o contrato de observações declara a
  coluna fora de escopo (`F1 docs/internal-notes-contract.md:9`). Nenhuma convenção transversal trata
  o uso dessa coluna; o estado vigente é este.
- Sem conflito registrado: `text/csv` não é tratado pela §9 (que cobre JSON e multipart).
- Sem conflito registrado: `Cache-Control: no-store` e `X-Content-Type-Options: nosniff` no CSV não
  são previstos nem proibidos pelas convenções.

## 16. audit

Trilha de auditoria somente leitura. Três rotas: a tabela administrativa (`/audit-history`), o
detalhe de um evento (`/audit-history/:id`) e a linha do tempo de uma solicitação (`/audit-logs/:protocol`).
Não existe rota de escrita: `audit_history` é só-INSERT no banco
(`F1 docs/audit-history-contract.md:372-374`; `F1 docs/audit-events.md:47`).

### 16.1 Fontes

| Ref | Caminho                                               | Uso                                                    |
| --- | ----------------------------------------------------- | ------------------------------------------------------ |
| F1  | `src/modules/auditHistory/auditHistory.router.ts`     | montagem, guards, `Cache-Control`                      |
| F1  | `src/modules/auditHistory/auditHistory.controller.ts` | borda HTTP, validação, `:id` numérico                  |
| F1  | `src/modules/auditHistory/auditHistory.schema.ts`     | `auditHistoryQuerySchema`                              |
| F1  | `src/modules/auditHistory/auditHistory.service.ts`    | rótulos, ator, custódia de `audit-logs`                |
| F1  | `src/modules/auditHistory/auditHistory.repository.ts` | SQL das três leituras                                  |
| F1  | `src/modules/DTOs/auditHistory/AuditHistory.dto.ts`   | shapes de lista e detalhe                              |
| F1  | `src/shared/audit/auditCatalog.ts`                    | vocabulário de `entity_type` / `action_type` e rótulos |
| F1  | `migrations/202609100009_create_audit_history.js`     | colunas base (`audit_id` bigint, `occurred_at`)        |
| F1  | `docs/audit-history-contract.md`                      | contrato das três rotas                                |
| F1  | `docs/audit-events.md`                                | modelo de gravação dos eventos                         |
| F2  | `src/lib/api/audit-history.api.ts`                    | cliente de lista e detalhe                             |
| F2  | `src/lib/types/audit.ts`                              | tipos do consumidor                                    |

### 16.2 Rotas

| #   | Método | Path                    | Autenticação/autorização                                              | Handler                            | Sucesso          | Erros                   |
| --- | ------ | ----------------------- | --------------------------------------------------------------------- | ---------------------------------- | ---------------- | ----------------------- |
| 49  | GET    | `/audit-history`        | sessão + `Administrador` ou `Gestor`                                  | `listAuditHistoryController`       | 200 JSON         | 400, 401, 403, 500      |
| 50  | GET    | `/audit-history/:id`    | sessão + `Administrador` ou `Gestor`                                  | `getAuditHistoryDetailController`  | 200 JSON         | 400, 401, 403, 404, 500 |
| 51  | GET    | `/audit-logs/:protocol` | sessão + `Analista`, `Gestor` ou `Administrador`; custódia no service | `getAuditLogsByProtocolController` | 200 JSON (array) | 400, 401, 403, 404, 500 |

Evidência: `F1 src/modules/auditHistory/auditHistory.router.ts:19-31,38-45`; montagens em
`F1 src/router.ts:31-32`.

`Cache-Control: private, no-store` é aplicado por um middleware montado apenas no router de
`/audit-history` (`F1 src/modules/auditHistory/auditHistory.router.ts:14-17`); o router de
`/audit-logs` é criado depois e **não** herda esse middleware
(`F1 src/modules/auditHistory/auditHistory.router.ts:38-45`).

**Desatualizado no legado:** `F1 docs/audit-history-contract.md:102-104` afirma que "as respostas"
trafegam com `Cache-Control: private, no-store`. Vale para `/audit-history` e `/audit-history/:id`,
não para `/audit-logs/:protocol`.

### 16.3 GET `/audit-history`

#### Request — query

Validada por `auditHistoryQuerySchema` (`F1 src/modules/auditHistory/auditHistory.schema.ts:11-34`;
chamada em `F1 src/modules/auditHistory/auditHistory.controller.ts:12-16`). Headers:
`Cookie: session_id`; a resposta leva `Cache-Control: private, no-store`.

| Param        | Tipo aceito                                                                          | Regra                     | Default | Mensagem                                               | Evidência                                                                                              |
| ------------ | ------------------------------------------------------------------------------------ | ------------------------- | ------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `page`       | inteiro ≥ 1                                                                          | `coerce`                  | 1       | Zod (inglês): `"Too small: expected number to be >0"`  | `F1 src/modules/auditHistory/auditHistory.schema.ts:5,13,31`                                           |
| `limit`      | inteiro 1..100                                                                       | `coerce`                  | 20      | Zod (inglês): `"Too big: expected number to be <=100"` | `F1 src/modules/auditHistory/auditHistory.schema.ts:14,32`                                             |
| `entityType` | `user` \| `prioritization` \| `request` \| `mapping` \| `settings` \| `pending_item` | enum derivado do catálogo | ausente | mensagem do Zod listando os valores válidos            | `F1 src/modules/auditHistory/auditHistory.schema.ts:9,15`; `F1 src/shared/audit/auditCatalog.ts:13-57` |

O schema declara também as refines `"Page deve ser maior ou igual a 1."` e
`"Limit não pode exceder 100."` (`F1 src/modules/auditHistory/auditHistory.schema.ts:18-25`), mas
elas repetem a condição já coberta por `.int().positive()` e `.max(100)` no tipo base. Como refine
de objeto só roda depois de o shape base passar, valor fora da faixa é reportado com a mensagem
padrão do Zod, não com esses textos.

- O schema é `.strict()`: query param desconhecido → 400
  (`F1 src/modules/auditHistory/auditHistory.schema.ts:17`; `F1 docs/audit-history-contract.md:259`).
- A lista de `entityType` é gerada de `Object.keys(auditCatalog)`, então incluir entidade no catálogo
  inclui a opção de filtro automaticamente
  (`F1 src/modules/auditHistory/auditHistory.schema.ts:7-9`).
- Não há filtro por `entity_id`, ator, ação ou período — registrado como fora de escopo no contrato
  (`F1 docs/audit-history-contract.md:375-376`).

#### Response 200

```json
{
  "items": [
    {
      "audit_id": 9,
      "entity_type": "settings",
      "entity_type_label": "Configuração do portal",
      "action_type": "settings.update",
      "actor": { "kind": "user", "userId": 102, "displayName": "Administrador Exemplo" },
      "occurred_at": "2026-09-21T04:15:49.041Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

| Campo                       | Tipo                   | Regra                                                 | Evidência                                                                                                        |
| --------------------------- | ---------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `items[].audit_id`          | number                 | `Number(bigint)`; a coluna é `bigIncrements` no banco | `F1 src/modules/auditHistory/auditHistory.service.ts:23`; `F1 migrations/202609100009_create_audit_history.js:7` |
| `items[].entity_type`       | string                 | `audit_history.entity_type` (vocabulário do catálogo) | `F1 src/modules/auditHistory/auditHistory.service.ts:24`                                                         |
| `items[].entity_type_label` | string                 | rótulo PT-BR do catálogo; fallback = `entity_type`    | `F1 src/modules/auditHistory/auditHistory.service.ts:13-15,25`                                                   |
| `items[].action_type`       | string                 | ação composta `<entidade>.<ação>`                     | `F1 src/modules/auditHistory/auditHistory.service.ts:26`; `F1 src/shared/audit/auditCatalog.ts:9-12`             |
| `items[].actor.kind`        | `"system"` \| `"user"` | `"system"` quando `user_id` é nulo                    | `F1 src/modules/auditHistory/auditHistory.service.ts:27-31`                                                      |
| `items[].actor.userId`      | number \| null         | `audit_history.user_id`                               | `F1 src/modules/auditHistory/auditHistory.service.ts:29`                                                         |
| `items[].actor.displayName` | string \| null         | `users.full_name` via LEFT JOIN                       | `F1 src/modules/auditHistory/auditHistory.repository.ts:37,43`                                                   |
| `items[].occurred_at`       | string ISO-8601        | `occurred_at.toISOString()`                           | `F1 src/modules/auditHistory/auditHistory.service.ts:32`                                                         |
| `total`                     | number                 | `COUNT(*)` com o mesmo filtro de `entityType`         | `F1 src/modules/auditHistory/auditHistory.repository.ts:52-60`                                                   |
| `page`, `limit`             | number                 | eco dos valores aplicados (ou do default)             | `F1 src/modules/auditHistory/auditHistory.service.ts:38-39`                                                      |

Paginação:

- Ordem fixa `occurred_at DESC`, **sem** desempate por `audit_id`
  (`F1 src/modules/auditHistory/auditHistory.repository.ts:46`); eventos no mesmo instante podem
  trocar de posição entre requisições.
- Não há `totalPages` e o frontend deriva `Math.ceil(total / limit)`
  (`F1 src/modules/auditHistory/auditHistory.service.ts:35-40`; `F1 docs/audit-history-contract.md:56-63`).
- Não há clamp: `page` além do fim devolve `items: []` com o `page` solicitado ecoado
  (`F1 src/modules/auditHistory/auditHistory.repository.ts:62-65`).
- Consulta vazia devolve `200` com `items: []`
  (`F1 docs/audit-history-contract.md:110-112,224-235`).

#### Erros

| Status | Condição                                                                                       | Mensagem                                                                                                                                                  | Evidência                                                                                              |
| ------ | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 400    | `page`/`limit` não numéricos, fora da faixa, `entityType` fora do catálogo, param desconhecido | agregada por `formatZodIssues(..., "query")`                                                                                                              | `F1 src/modules/auditHistory/auditHistory.controller.ts:14-16`                                         |
| 400    | `entityType` inválido                                                                          | `"Campos inválidos: entityType — Invalid option: expected one of \"user\"\|\"prioritization\"\|\"request\"\|\"mapping\"\|\"settings\"\|\"pending_item\""` | `F1 docs/audit-history-contract.md:243-250`                                                            |
| 400    | query param desconhecido                                                                       | `"Campos inválidos: query — Unrecognized key: \"foo\""`                                                                                                   | `F1 src/modules/auditHistory/auditHistory.schema.ts:17`; `F1 src/shared/validation/zodErrors.ts:74,84` |
| 401    | sem sessão / sessão inválida                                                                   | `"Token não fornecido"` / `"Token inválido ou expirado"`                                                                                                  | `F1 src/shared/middleware/auth.ts:27-45`                                                               |
| 403    | perfil fora de Administrador/Gestor ou senha pendente                                          | `"Acesso restrito ao perfil Administrador ou Gestor"` / `"Troca de senha obrigatória antes de continuar"`                                                 | `F1 src/shared/middleware/requireRole.ts:11-22`; `F1 docs/audit-history-contract.md:96`                |
| 500    | falha não prevista                                                                             | `"Erro interno do servidor"`                                                                                                                              | `F1 src/shared/middleware/errorHandler.ts:32-44`                                                       |

### 16.4 GET `/audit-history/:id`

#### Request

- `:id` é o `audit_id` **numérico**; o controller faz `Number(req.params.id)` e exige inteiro ≥ 1,
  senão 400 `"ID inválido"` (`F1 src/modules/auditHistory/auditHistory.controller.ts:25-29`).
- Sem query params: nada além de `:id` é lido
  (`F1 src/modules/auditHistory/auditHistory.controller.ts:21-33`).

#### Response 200

```json
{
  "audit_id": 9,
  "entity_type": "request",
  "entity_id": "MAAT-0000-0000",
  "action_type": "request.status_change",
  "actor": { "kind": "user", "userId": 7, "displayName": "Analista Exemplo" },
  "previous_value": "Em triagem",
  "new_value": "Em mapeamento",
  "note": null,
  "last_technical_message": null,
  "ip_address": null,
  "change_origin": "admin",
  "occurred_at": "2026-09-21T04:15:49.041Z"
}
```

| Campo                    | Tipo                            | Origem                                                          | Evidência                                                                                                              |
| ------------------------ | ------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `audit_id`               | number                          | `audit_id`                                                      | `F1 src/modules/auditHistory/auditHistory.service.ts:50`                                                               |
| `entity_type`            | string                          | `audit_history.entity_type`                                     | `F1 src/modules/auditHistory/auditHistory.service.ts:51`                                                               |
| `entity_id`              | string                          | `audit_history.entity_id` (protocolo, para `request`)           | `F1 src/modules/auditHistory/auditHistory.service.ts:52`                                                               |
| `action_type`            | string                          | `audit_history.action_type`                                     | `F1 src/modules/auditHistory/auditHistory.service.ts:53`                                                               |
| `actor`                  | `{ kind, userId, displayName }` | `user_id` + `users.full_name`; `kind` = `"system"` se nulo      | `F1 src/modules/auditHistory/auditHistory.service.ts:48,54-58`                                                         |
| `previous_value`         | string \| null                  | valor anterior, texto livre (pode ser JSON serializado)         | `F1 src/modules/auditHistory/auditHistory.service.ts:59`; `F1 docs/audit-history-contract.md:363-365`                  |
| `new_value`              | string \| null                  | valor novo, texto livre                                         | `F1 src/modules/auditHistory/auditHistory.service.ts:60`                                                               |
| `note`                   | string \| null                  | justificativa interna da transição                              | `F1 src/modules/auditHistory/auditHistory.service.ts:61`; `F1 src/modules/DTOs/auditHistory/AuditHistory.dto.ts:32-33` |
| `last_technical_message` | string \| null                  | snapshot do retorno público da transição                        | `F1 src/modules/auditHistory/auditHistory.service.ts:62`; `F1 src/modules/DTOs/auditHistory/AuditHistory.dto.ts:34-35` |
| `ip_address`             | string \| null                  | IP do ator no evento                                            | `F1 src/modules/auditHistory/auditHistory.service.ts:63`                                                               |
| `change_origin`          | string \| null                  | origem (`admin`, `system`, `internal`, ou nulo em linha legada) | `F1 src/modules/auditHistory/auditHistory.service.ts:64`; `F1 src/shared/types/internalNotes.ts:38`                    |
| `occurred_at`            | string ISO-8601                 | instante do evento                                              | `F1 src/modules/auditHistory/auditHistory.service.ts:46-47,65`                                                         |

- O detalhe **não** tem `entity_type_label`; o rótulo só existe no item de lista
  (`F1 src/modules/DTOs/auditHistory/AuditHistory.dto.ts:24-39`).
- `null` significa "não registrado para este evento", não string vazia
  (`F1 docs/audit-history-contract.md:363-365`).

#### Erros

| Status | Condição                            | Mensagem                                                 | Evidência                                                      |
| ------ | ----------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------- |
| 400    | `:id` não inteiro ou < 1            | `"ID inválido"`                                          | `F1 src/modules/auditHistory/auditHistory.controller.ts:27-29` |
| 401    | sem sessão / sessão inválida        | `"Token não fornecido"` / `"Token inválido ou expirado"` | `F1 src/shared/middleware/auth.ts:27-45`                       |
| 403    | perfil fora de Administrador/Gestor | `"Acesso restrito ao perfil Administrador ou Gestor"`    | `F1 src/shared/middleware/requireRole.ts:21-22`                |
| 404    | `audit_id` inexistente              | `"Log não encontrado"`                                   | `F1 src/modules/auditHistory/auditHistory.service.ts:69-74`    |
| 500    | falha não prevista                  | `"Erro interno do servidor"`                             | `F1 src/shared/middleware/errorHandler.ts:32-44`               |

### 16.5 GET `/audit-logs/:protocol`

#### Request

- `:protocol` é o protocolo da solicitação (`entity_id` dos eventos `request.*`); não há query
  params lidos (`F1 src/modules/auditHistory/auditHistory.controller.ts:35-53`).
- `:protocol` só com espaços → 400 `"Protocolo é obrigatório"`
  (`F1 src/modules/auditHistory/auditHistory.controller.ts:43-46`).
- O protocolo é aparado antes da consulta
  (`F1 src/modules/auditHistory/auditHistory.controller.ts:43`; `F1 src/modules/auditHistory/auditHistory.service.ts:86`).

#### Autorização e custódia

1. `requireRole("Analista", "Gestor", "Administrador")` no router
   (`F1 src/modules/auditHistory/auditHistory.router.ts:40-45`).
2. No service, `Administrador` e `Gestor` são "admin-like" e passam sem checagem de custódia
   (`F1 src/modules/auditHistory/auditHistory.service.ts:87`).
3. Para os demais, a solicitação é resolvida por `findRequestStatusContext`; se não existir,
   recebe 403 genérico — só perfil admin-like vê o 404 real
   (`F1 src/modules/auditHistory/auditHistory.service.ts:89-101`).
4. A custódia é do responsável de triagem **ou** do designado de mapeamento, comparados por
   `user_id` da sessão (`F1 src/modules/auditHistory/auditHistory.service.ts:103-115`).

#### Response 200

`AuditHistoryDetail[]`, sem envelope, na ordem `occurred_at DESC` e, no empate, `audit_id DESC`
(`F1 src/modules/auditHistory/auditHistory.repository.ts:117-123`). Os campos de cada item são
exatamente os da §16.4.

- **Sem paginação e sem `limit`**: a consulta não aplica `limit`/`offset`
  (`F1 src/modules/auditHistory/auditHistory.repository.ts:99-124`;
  `F1 docs/audit-history-contract.md:330-332`).
- Filtro fixo no repositório: `entity_type = 'request' AND entity_id = :protocol`. Não há allowlist
  de `action_type`, então **toda** ação registrada em `request.*` aparece — inclusive
  `request.triage`, `request.update`, `request.access_denied` e
  `request.override_status_admin` sem normalização
  (`F1 src/modules/auditHistory/auditHistory.repository.ts:119-120`;
  `F1 src/shared/audit/auditCatalog.ts:30-44`).
  A linha do tempo de notas internas, ao contrário, filtra 5 ações e normaliza o override (§17.3).
- Eventos de `mapping` não entram: o `entity_id` deles é o `mapping_id`, não o protocolo
  (`F1 src/modules/auditHistory/auditHistory.repository.ts:119`;
  `F1 src/modules/internalNotes/internalNotes.repository.ts:95-103`).
- A rota **não** emite `Cache-Control` (§16.2).

#### Erros

| Status | Condição                                                      | Mensagem / `code`                                                                                                                 | Evidência                                                                                                |
| ------ | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 400    | `:protocol` vazio após `trim`                                 | `"Protocolo é obrigatório"`                                                                                                       | `F1 src/modules/auditHistory/auditHistory.controller.ts:44-46`                                           |
| 401    | sem sessão / sessão inválida                                  | `"Token não fornecido"` / `"Token inválido ou expirado"`; o controller repete `"Token inválido ou expirado"` se `req.user` faltar | `F1 src/modules/auditHistory/auditHistory.controller.ts:39-41`; `F1 src/shared/middleware/auth.ts:27-45` |
| 403    | perfil fora dos três internos                                 | `"Acesso restrito ao perfil Analista ou Gestor ou Administrador"`                                                                 | `F1 src/shared/middleware/requireRole.ts:21-22`                                                          |
| 403    | protocolo inexistente para não admin-like                     | `"Ação restrita ao Administrador ou ao Analista responsável pela demanda."`, `code: "INSUFFICIENT_ROLE_PERMISSIONS"`              | `F1 src/modules/auditHistory/auditHistory.service.ts:90-99`                                              |
| 403    | sem custódia (não é responsável de triagem nem de mapeamento) | idem acima                                                                                                                        | `F1 src/modules/auditHistory/auditHistory.service.ts:109-115`                                            |
| 404    | protocolo inexistente para Administrador/Gestor               | `"Protocolo não encontrado"`                                                                                                      | `F1 src/modules/auditHistory/auditHistory.service.ts:100`                                                |
| 500    | falha não prevista                                            | `"Erro interno do servidor"`                                                                                                      | `F1 src/shared/middleware/errorHandler.ts:32-44`                                                         |

O contrato registra o mesmo recorte de permissão e de erros
(`F1 docs/audit-history-contract.md:341-354`).

### 16.6 Visão do consumidor (F2) e drift

- O F2 consome apenas `/audit-history` e `/audit-history/:id`
  (`F2 src/lib/api/audit-history.api.ts:10-53`). **Não há cliente para `/audit-logs/:protocol`** em
  `src/lib/api` nem `src/lib/types` do F2.
- A query é montada com `page`, `limit` e `entityType`, só quando definidos
  (`F2 src/lib/api/audit-history.api.ts:21-35`).
- O detalhe é buscado por id numérico, interpolado no path
  (`F2 src/lib/api/audit-history.api.ts:44-53`).
- `AuditHistoryDetail` do F2 **omite** `last_technical_message` e `ip_address`: são enviados pelo
  backend e não declarados no tipo do consumidor
  (`F2 src/lib/types/audit.ts:44-55`; `F1 src/modules/DTOs/auditHistory/AuditHistory.dto.ts:24-39`).
- `AuditEntityType` do F2 lista as mesmas 6 entidades
  (`F2 src/lib/types/audit.ts:7-8`), e `AuditHistoryListResponse` declara
  `{ items, total, page, limit }` sem `totalPages`, com o total de páginas derivado no cliente
  (`F2 src/lib/types/audit.ts:34-41`).
- `entity_type_label` é consumido do item de lista (`F2 src/lib/types/audit.ts:25-32`); o detalhe do
  F2 não o declara, o que coincide com o detalhe do backend, que também não o envia (§16.4).
- As chaves snake_case são consumidas como estão (`F2 src/lib/types/audit.ts:1-4`); não há camada de
  tradução no cliente.
- Erros são lidos de `body.message` (`F2 src/lib/api/client.ts:86-92`): o `code`
  `INSUFFICIENT_ROLE_PERMISSIONS` do 403 não é usado.

### 16.7 Confronto com `docs/04-API-Conventions.md`

- **Divergente (legado vigente):** paths sem `/api/v1` — convenção §1.
- **Compatível por exceção registrada:** chaves de topo em snake_case (`audit_id`, `entity_type`,
  `entity_type_label`, `action_type`, `entity_id`, `previous_value`, `new_value`, `note`,
  `change_origin`, `last_technical_message`, `ip_address`, `occurred_at`) e ator interno em
  camelCase (`userId`, `displayName`) — é exatamente a exceção legada de auditoria da convenção §11.
- **Compatível por exceção registrada:** envelope `{ items, total, page, limit }` sem `totalPages`,
  item com `audit_id` numérico e `entity_type_label` — convenção §15.2 (legado), com linha na §4.3
  ("Auditoria (legado)": default 20, máximo 100, sem clamp). A ausência de clamp de `page` é o
  desvio que a própria §4.3 registra para a auditoria; não é uma segunda divergência. O alvo é
  `id` UUID (§15.2 alvo; ADR-0003) e a migração fica para a spec de auditoria (tabela 0.2 #23).
- **Divergente (legado vigente):** `GET /audit-logs/:protocol` devolve array sem envelope e sem
  paginação, e não tem linha na tabela de exceções da §4.3.
- **Divergente (legado vigente):** `action_type` composto; o ADR-0020 separa `entity_type` e
  `action` no modelo novo.
- **Divergente (legado vigente):** `code` de domínio em `UPPER_SNAKE_CASE`
  (`INSUFFICIENT_ROLE_PERMISSIONS`) — §11 e §2.3 exigem `snake_case` minúsculo e catálogo estável.
- **Divergente (legado vigente):** protocolo inexistente devolve `403` para perfil não admin-like,
  escondendo a existência; §2.3 define `not_found` "também para protocolo não encontrado, sem 403"
  (ADR-0023). O comportamento é intencional e comentado no legado
  (`F1 src/modules/auditHistory/auditHistory.service.ts:91-92`).
- **Registrado (sem convenção correspondente):** `Cache-Control: private, no-store` existe em
  `/audit-history` e `/audit-history/:id` e não existe em `/audit-logs/:protocol`
  (`F1 src/modules/auditHistory/auditHistory.router.ts:14-17,38-45`). Nenhuma seção de
  `docs/04-API-Conventions.md` trata cache de resposta.
- **Desatualizado no legado:** `F1 docs/audit-events.md:13-20` lista 4 entidades e 14 ações; o
  catálogo vigente tem 6 entidades e 25 ações — faltam `mapping` (`assign`, `save`, `complete`),
  `pending_item` (`create`, `respond`, `attach`, `validate`, `reopen`), `user.update_profile`,
  `user.update` e `request.update` (`F1 src/shared/audit/auditCatalog.ts:13-57`). O mesmo documento
  descreve a coluna `created_at` (`F1 docs/audit-events.md:7`), mas a coluna é `occurred_at`
  (`F1 migrations/202609100009_create_audit_history.js:14`), e omite `ip_address` e
  `last_technical_message`, criados depois
  (`F1 migrations/requester_request/20260926000000_complete_status_transition_v4.js:256-260`).

## 17. internal-notes

Linha do tempo interna da solicitação: notas internas escritas, eventos leves de
atribuição/status/mapeamento e os registros completos de triagem e mapeamento. Três rotas, todas sob
`/requests/:protocol/internal-notes` e todas com o mesmo gate de perfil.

### 17.1 Fontes

| Ref | Caminho                                                                         | Uso                                                  |
| --- | ------------------------------------------------------------------------------- | ---------------------------------------------------- |
| F1  | `src/modules/internalNotes/internalNotes.router.ts`                             | montagem com `mergeParams` e guards                  |
| F1  | `src/modules/internalNotes/internalNotes.controller.ts`                         | borda HTTP, ordem de validação, 201/204              |
| F1  | `src/modules/internalNotes/internalNotes.schema.ts`                             | params, body, `limit`/`cursor`                       |
| F1  | `src/modules/internalNotes/internalNotes.service.ts`                            | merge keyset, textos, snapshots                      |
| F1  | `src/modules/internalNotes/internalNotes.repository.ts`                         | SQL das duas fontes e dos históricos                 |
| F1  | `src/modules/DTOs/internalNotes/InternalNotes.dto.ts`                           | shapes da timeline e dos históricos                  |
| F1  | `src/shared/types/internalNotes.ts`                                             | enums de ação/origem e linhas                        |
| F1  | `src/modules/requests/triage/triage.schema.ts`                                  | `TriageAssessment` (referenciado)                    |
| F1  | `src/modules/DTOs/queue/mapping.dto.ts`                                         | `MappingResponseDTO` (referenciado)                  |
| F1  | `docs/internal-observations.md`                                                 | contrato vigente da timeline unificada (v2.0, draft) |
| F1  | `docs/internal-notes-contract.md`                                               | contrato v1, só de observações                       |
| F2  | `src/lib/api/internal-note.api.ts`, `src/lib/services/internal-note.service.ts` | cliente                                              |
| F2  | `src/lib/types/internal-note.ts`                                                | tipos do consumidor                                  |

### 17.2 Rotas

| #   | Método | Path                                      | Autenticação/autorização                         | Handler                 | Sucesso           | Erros                   |
| --- | ------ | ----------------------------------------- | ------------------------------------------------ | ----------------------- | ----------------- | ----------------------- |
| 52  | GET    | `/requests/:protocol/internal-notes`      | sessão + `Analista`, `Gestor` ou `Administrador` | `listInternalNotes`     | 200 JSON          | 400, 401, 403, 404, 500 |
| 53  | POST   | `/requests/:protocol/internal-notes`      | idem                                             | `createInternalNote`    | **201** JSON      | 400, 401, 403, 404, 500 |
| 54  | PUT    | `/requests/:protocol/internal-notes/read` | idem                                             | `markInternalNotesRead` | **204** sem corpo | 400, 401, 403, 404, 500 |

Evidência: `F1 src/modules/internalNotes/internalNotes.router.ts:10-17`; montagem em
`F1 src/router.ts:21`.

- O router usa `express.Router({ mergeParams: true })` para ler `:protocol` do mount
  (`F1 src/modules/internalNotes/internalNotes.router.ts:10`).
- `authMiddleware` e `requireRole("Analista", "Gestor", "Administrador")` são aplicados com `use`,
  então valem para as três rotas (`F1 src/modules/internalNotes/internalNotes.router.ts:12-13`).
- O controller repete um check de `Solicitante` com 403 `"Acesso restrito aos perfis internos"`
  (`F1 src/modules/internalNotes/internalNotes.controller.ts:31-33`), inalcançável: o `requireRole`
  do router barra o perfil antes, com a mensagem
  `"Acesso restrito ao perfil Analista ou Gestor ou Administrador"`
  (`F1 src/shared/middleware/requireRole.ts:16-22`).
- Não há checagem de custódia: qualquer perfil interno lê e escreve a linha do tempo de qualquer
  solicitação. A leitura embutida dos históricos de triagem/mapeamento segue o gate da rota, sem o
  check de responsável do `GET /requests/:protocol/triage` — spec de `internal-notes`
  (`F1 docs/internal-observations.md:91-95,641`).

### 17.3 GET `/requests/:protocol/internal-notes`

#### Request

| Parte           | Regra                                 | Mensagem literal                                                              | Evidência                                                                                                                    |
| --------------- | ------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| path `protocol` | `trim` e mínimo 1                     | `"Protocolo é obrigatório."` (agregada como `Campos inválidos: protocol — …`) | `F1 src/modules/internalNotes/internalNotes.schema.ts:3-5`; `F1 src/modules/internalNotes/internalNotes.controller.ts:13-19` |
| query `limit`   | inteiro 1..50, default 20             | `"limit inválido."` / `"limit deve estar entre 1 e 50."`                      | `F1 src/modules/internalNotes/internalNotes.schema.ts:38-43`                                                                 |
| query `cursor`  | opaco: base64url de `{ t, type, id }` | `"Cursor inválido."`                                                          | `F1 src/modules/internalNotes/internalNotes.schema.ts:44-67`                                                                 |

Payload do cursor (`F1 src/modules/internalNotes/internalNotes.schema.ts:22-33`):

- `t` — instante ISO-8601 com offset (`z.iso.datetime({ offset: true })`);
- `type` — `"note"` ou `"event"`;
- `id` — `"note"`: inteiro positivo (`/^[1-9]\d*$/`); `"event"`: `audit:<id>` (`/^audit:[1-9]\d*$/`).

O servidor só aceita o cursor que decodificar nessa forma; valor adulterado, base64 inválido ou JSON
fora do shape → 400 com `"Cursor inválido."`. O cliente não interpreta o conteúdo — apenas repassa o
`nextCursor` de uma resposta para a requisição seguinte
(`F1 docs/internal-observations.md:223-226`).

Ordem de validação do GET: query (400) → ator da sessão (401/403) → `protocol` (400) → existência da
solicitação (404) (`F1 src/modules/internalNotes/internalNotes.controller.ts:38-51`;
`F1 src/modules/internalNotes/internalNotes.service.ts:45-51`).

#### Response 200

```json
{
  "items": [
    {
      "type": "event",
      "id": "audit:63",
      "action": "request.status_change",
      "text": "Status alterado: Mapeamento agendado",
      "occurredAt": "2026-09-19T14:11:03.000Z",
      "actor": null,
      "changeOrigin": "system",
      "justification": null,
      "lastTechnicalMessage": null
    },
    {
      "type": "note",
      "id": "12",
      "content": "Confirmar alçada antes do mapeamento.",
      "createdAt": "2026-09-19T14:10:00.000Z",
      "author": { "id": "7", "name": "Analista Exemplo", "role": "Analista" }
    }
  ],
  "nextCursor": "eyJ0IjoiMjAyNi0wOS0xOVQxNDoxMDowMC4wMDBaIiwidHlwZSI6Im5vdGUiLCJpZCI6IjEyIn0",
  "unseenCount": 1,
  "triages": [],
  "mappings": []
}
```

| Campo de topo | Tipo                                | Regra                                                                    | Evidência                                                                                                                           |
| ------------- | ----------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `items`       | `(TimelineNote \| TimelineEvent)[]` | página mais-recente-primeiro, no máximo `limit` itens                    | `F1 src/modules/DTOs/internalNotes/InternalNotes.dto.ts:52-58`                                                                      |
| `nextCursor`  | string \| null                      | cursor do item mais antigo da página; `null` = não há página mais antiga | `F1 src/modules/internalNotes/internalNotes.service.ts:94-105`                                                                      |
| `unseenCount` | number                              | notas de outros autores após o checkpoint, na solicitação inteira        | `F1 src/modules/internalNotes/internalNotes.service.ts:308-316`; `F1 src/modules/internalNotes/internalNotes.repository.ts:138-153` |
| `triages`     | `TriageHistoryEntry[]`              | histórico completo, `oldest → newest`, não paginado                      | `F1 src/modules/internalNotes/internalNotes.service.ts:314,326`                                                                     |
| `mappings`    | `MappingHistoryEntry[]`             | histórico completo, `oldest → newest`, não paginado                      | `F1 src/modules/internalNotes/internalNotes.service.ts:315,327`                                                                     |

`TimelineNote` (`F1 src/modules/internalNotes/internalNotes.service.ts:31-43`):

| Campo         | Tipo                                      | Origem                                                       |
| ------------- | ----------------------------------------- | ------------------------------------------------------------ |
| `type`        | `"note"`                                  | literal                                                      |
| `id`          | string                                    | `internal_note_id` (BIGINT serializado como string)          |
| `content`     | string                                    | `content`                                                    |
| `createdAt`   | string ISO-8601                           | `created_at.toISOString()`                                   |
| `author.id`   | string                                    | `author_user_id` como string                                 |
| `author.name` | string                                    | `users.full_name` via JOIN                                   |
| `author.role` | `Analista` \| `Gestor` \| `Administrador` | `author_role_at_creation` (snapshot do perfil na publicação) |

`TimelineEvent` (`F1 src/modules/internalNotes/internalNotes.service.ts:282-296`):

| Campo                  | Tipo                                                                                                        | Regra                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `type`                 | `"event"`                                                                                                   | literal                                                                                    |
| `id`                   | string                                                                                                      | `audit:<audit_id>`                                                                         |
| `action`               | `request.assign` \| `request.reassign` \| `request.unassign` \| `request.status_change` \| `mapping.assign` | lista fechada de 5 ações                                                                   |
| `text`                 | string                                                                                                      | frase pt-BR já renderizada no backend (tabela abaixo)                                      |
| `occurredAt`           | string ISO-8601                                                                                             | `audit_history.occurred_at`                                                                |
| `actor`                | `{ id, name, role }` \| null                                                                                | `null` quando não há usuário, nome ou perfil, ou quando o perfil resolvido é `Solicitante` |
| `changeOrigin`         | `"admin"` \| `"system"` \| `"internal"` \| null                                                             | `audit_history.change_origin`                                                              |
| `justification`        | string \| null (opcional)                                                                                   | presente **só** em `request.status_change`; é `audit_history.note`                         |
| `lastTechnicalMessage` | string \| null (opcional)                                                                                   | presente **só** em `request.status_change`; é `audit_history.last_technical_message`       |

Composição de `text` (`F1 src/modules/internalNotes/internalNotes.service.ts:129-163`):

| `action`                | `text`                                                                                                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `request.status_change` | `Status alterado: <nome do status>`; sem `new_value` → `Status alterado`                                                                                                               |
| `request.assign`        | `Responsável atribuído: <nome>`; sem resolução → `Responsável atribuído`                                                                                                               |
| `request.reassign`      | `Responsável substituído: <nome>`; sem resolução → `Responsável substituído`                                                                                                           |
| `request.unassign`      | `Responsável removido`                                                                                                                                                                 |
| `mapping.assign`        | `new_value` nulo → `Responsável pelo mapeamento removido`; com nome resolvido → `Responsável pelo mapeamento alterado: <nome>`; sem resolução → `Responsável pelo mapeamento alterado` |

Regras de leitura dos eventos:

- `request.override_status_admin` é gravado pelo bypass de Administrador no
  `PATCH /requests/:protocol/status` e **entra** no filtro da linha do tempo, mas é normalizado na leitura
  para `action: "request.status_change"`, herdando `text`, `justification` e `lastTechnicalMessage`; a
  ação bruta nunca sai (`F1 src/modules/internalNotes/internalNotes.service.ts:113-127,282-296`;
  `F1 src/modules/internalNotes/internalNotes.repository.ts:19-28`;
  `F1 src/shared/types/internalNotes.ts:29-36`).
- `request.triage`, `mapping.save` e `mapping.complete` **não** viram evento; a informação deles vive
  em `triages`/`mappings` (`F1 docs/internal-observations.md:32-45,386-391`;
  `F1 src/modules/internalNotes/internalNotes.repository.ts:30`).
- `mapping.assign` entra por `entity_type = 'mapping'` e `entity_id IN (SELECT mapping_id::text FROM
mappings WHERE request_id = :requestId)`; as demais ações de `mapping` não entram
  (`F1 src/modules/internalNotes/internalNotes.repository.ts:87-104`).
- `actor.role` é o perfil **vigente** no momento da leitura (reidratado de `profiles`), diferente do
  autor de nota, que preserva o perfil da publicação
  (`F1 src/modules/internalNotes/internalNotes.service.ts:172-182`;
  `F1 docs/internal-observations.md:360-365`).

`TriageHistoryEntry` — `{ triage: TriageAssessment, occurredAt }`
(`F1 src/modules/internalNotes/internalNotes.service.ts:192-219`): cada linha vem de `triages` ⋈
`audit_history` por `request.triage` e `new_value->>'triageId'`, ordenada `occurred_at`/`audit_id`
**ascendente** (`F1 src/modules/internalNotes/internalNotes.repository.ts:184-195`). Campos de
`triage`: `id` (uuid), `adherentToScope` (`"Sim"` \| `"Não"` \| `""`), `adherentJustification`,
`changeCategory`, `newCategory`, `preliminaryComplexity`, `perceivedRisks`, `suggestedResponsible`,
`suggestedResponsibleJustification`, `exitStatus` (number), `result`, `conclusionJustification`,
`assignee` (`{ id: string \| null, name, email }` \| null) e `lastTechnicalMessage`
(`F1 src/modules/requests/triage/triage.schema.ts:9-24`).

`MappingHistoryEntry` — `{ mapping: MappingResponseDTO, occurredAt }`
(`F1 src/modules/internalNotes/internalNotes.service.ts:221-253`): a proveniência é a **última** linha
`mapping.save`/`mapping.complete`/`mapping.assign` daquele `mapping_id` (`DISTINCT ON` por
`occurred_at desc`), e a lista é ordenada `oldest → newest`
(`F1 src/modules/internalNotes/internalNotes.repository.ts:204-236`). Campos de `mapping`:
`protocol`, `id`, `targetStatus` (número de status), `scheduledFor` (ISO-8601 **sem** milissegundos),
`durationMinutes`, `modality` (`"REMOTE"` \| `"IN_PERSON"` \| null), `meetingLink`, `location`,
`participants[]` (`{ id: string \| null, name, email }`; `id` nulo = participante externo), `notes`,
`justification`, `lastTechnicalMessage` e `mappingAssignee`
(`{ id, userId, name, email, jobTitle }` \| null) (`F1 src/modules/DTOs/queue/mapping.dto.ts:15-19,58-84`).

#### Ordenação e paginação

- A página é o merge das duas fontes ordenado de forma **decrescente** por: instante
  (`createdAt` da nota / `occurredAt` do evento); no empate, rank (evento antes de nota, pois
  `EVENT_RANK = 1` e `NOTE_RANK = 0`); no empate de rank, id decrescente
  (`F1 src/modules/internalNotes/internalNotes.service.ts:28-29,75-92`).
- Cada fonte é consultada com `limit + 1` itens estritamente mais antigos que o cursor, para detectar
  fim da linha do tempo sem varrer a tabela
  (`F1 src/modules/internalNotes/internalNotes.service.ts:306-312`).
- O predicado de cursor é assimétrico entre as fontes: com cursor de nota, as notas usam
  `created_at < t OR (created_at = t AND id < cursorId)` e os eventos usam `occurred_at < t`; com
  cursor de evento, os eventos usam `occurred_at < t OR (= t AND audit_id < cursorId)` e as notas usam
  `created_at <= t` — o `<=` cobre os itens do outro tipo no mesmo instante, que ainda não foram
  devolvidos (`F1 src/modules/internalNotes/internalNotes.repository.ts:57-69,106-117`).
- `nextCursor` é `null` quando o número de entradas não excede `limit`; caso contrário, carrega a
  posição do item mais antigo da página (`F1 src/modules/internalNotes/internalNotes.service.ts:100-104`).
- `triages`/`mappings` são idênticos em todas as páginas: não recebem `cursor` nem `limit`
  (`F1 src/modules/internalNotes/internalNotes.service.ts:310-316,322-328`).
- `unseenCount` é global: conta notas da solicitação com `author_user_id <> :userId` e
  `internal_note_id > last_read_note_id` (BIGINT); sem checkpoint, conta todas as notas de outros
  autores (`F1 src/modules/internalNotes/internalNotes.repository.ts:138-153`). O próprio GET **não**
  grava checkpoint.

#### Erros

| Status | Condição                                                | Mensagem                                                          | Evidência                                                                                                  |
| ------ | ------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 400    | `limit`/`cursor` inválidos                              | agregada por `formatZodIssues(..., "query")`                      | `F1 src/modules/internalNotes/internalNotes.controller.ts:39-42`                                           |
| 400    | `protocol` vazio após `trim`                            | `"Protocolo é obrigatório."`                                      | `F1 src/modules/internalNotes/internalNotes.schema.ts:3-5`                                                 |
| 401    | sem sessão / sessão inválida / id de sessão não inteiro | `"Token não fornecido"` / `"Token inválido ou expirado"`          | `F1 src/shared/middleware/auth.ts:27-45`; `F1 src/modules/internalNotes/internalNotes.controller.ts:21-29` |
| 403    | perfil `Solicitante`                                    | `"Acesso restrito ao perfil Analista ou Gestor ou Administrador"` | `F1 src/shared/middleware/requireRole.ts:21-22`                                                            |
| 403    | `must_change_password` pendente                         | `"Troca de senha obrigatória antes de continuar"`                 | `F1 src/shared/middleware/requireRole.ts:11-14`                                                            |
| 404    | protocolo sem solicitação                               | `"Solicitação não encontrada"`                                    | `F1 src/modules/internalNotes/internalNotes.service.ts:45-51`                                              |
| 500    | falha não prevista                                      | `"Erro interno do servidor"`                                      | `F1 src/shared/middleware/errorHandler.ts:32-44`                                                           |

### 17.4 POST `/requests/:protocol/internal-notes`

#### Request

```json
{ "content": "Confirmar alçada antes do mapeamento." }
```

Headers: `Cookie: session_id`; `Content-Type: application/json`.

- `content` é aparado, mínimo 1 e máximo 4.000 caracteres
  (`F1 src/modules/internalNotes/internalNotes.schema.ts:7-13`), com mensagens
  `"A observação não pode estar vazia."` e `"A observação deve ter no máximo 4000 caracteres."`.
- Body fora do schema → 400 agregada por `formatZodIssues` com `rootLabel` default `payload`
  (`F1 src/modules/internalNotes/internalNotes.controller.ts:54-57`;
  `F1 src/shared/validation/zodErrors.ts:89-91`).
- Autoria vem exclusivamente da sessão: `author_user_id` = `req.user.id` e
  `author_role_at_creation` = perfil vigente; o cliente não envia autoria
  (`F1 src/modules/internalNotes/internalNotes.service.ts:331-344`;
  `F1 src/modules/internalNotes/internalNotes.repository.ts:345-364`).

Ordem de validação: body (400) → `protocol` (400) → ator (401/403) → existência (404)
(`F1 src/modules/internalNotes/internalNotes.controller.ts:53-65`).

#### Response 201

```json
{
  "type": "note",
  "id": "13",
  "content": "Confirmar alçada antes do mapeamento.",
  "createdAt": "2026-09-22T17:12:00.000Z",
  "author": { "id": "7", "name": "Analista Exemplo", "role": "Analista" }
}
```

`TimelineNote` completo, já com `type: "note"` (`F1 src/modules/internalNotes/internalNotes.controller.ts:59-64`).
Criar não altera o checkpoint do autor e, como nota própria não conta em `unseenCount`, não gera badge
para quem publicou (`F1 docs/internal-observations.md:275`).

#### Erros

| Status    | Condição                                     | Mensagem                                                                                                                                              | Evidência                                                                                                         |
| --------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 400       | `content` ausente                            | `"Campos obrigatórios ausentes: content"`                                                                                                             | `F1 src/modules/internalNotes/internalNotes.controller.ts:54-57`; `F1 src/shared/validation/zodErrors.ts:65-70`   |
| 400       | `content` vazio após `trim` / acima de 4.000 | `"Campos inválidos: content — A observação não pode estar vazia."` / `"Campos inválidos: content — A observação deve ter no máximo 4000 caracteres."` | `F1 src/modules/internalNotes/internalNotes.schema.ts:7-13`                                                       |
| 400       | `protocol` vazio                             | `"Protocolo é obrigatório."`                                                                                                                          | `F1 src/modules/internalNotes/internalNotes.schema.ts:3-5`                                                        |
| 401 / 403 | idem §17.3                                   | idem §17.3                                                                                                                                            | `F1 src/shared/middleware/auth.ts:27-45`; `F1 src/shared/middleware/requireRole.ts:11-22`                         |
| 404       | protocolo sem solicitação                    | `"Solicitação não encontrada"`                                                                                                                        | `F1 src/modules/internalNotes/internalNotes.service.ts:336`                                                       |
| 500       | nota salva e não relida para retorno         | erro interno (`"Observação interna salva, mas não encontrada para retorno."` não é exposta; o envelope devolve `"Erro interno do servidor"`)          | `F1 src/modules/internalNotes/internalNotes.service.ts:340-342`; `F1 src/shared/middleware/errorHandler.ts:32-44` |

### 17.5 PUT `/requests/:protocol/internal-notes/read`

#### Request

```json
{ "lastReadNoteId": "12" }
```

- `lastReadNoteId` é **string** numérica, `^[1-9]\d*$` — o formato preserva o BIGINT sem perda de
  precisão (`F1 src/modules/internalNotes/internalNotes.schema.ts:15-20`;
  `F1 docs/internal-observations.md:279-281`). Fora do padrão →
  `"Identificador da observação inválido."`.
- A nota informada precisa existir e pertencer à solicitação da URL, senão 400
  `"Observação interna não pertence à solicitação"`
  (`F1 src/modules/internalNotes/internalNotes.service.ts:346-356`).
- O checkpoint é um upsert por `(request_id, user_id)` com `GREATEST` no id e `read_at` preservado
  quando o id não avança: nunca regride
  (`F1 src/modules/internalNotes/internalNotes.repository.ts:374-398`;
  `F1 docs/internal-observations.md:137-144`).

Ordem de validação: body (400) → ator (401/403) → `protocol` (400) → existência/posse (404/400)
(`F1 src/modules/internalNotes/internalNotes.controller.ts:67-75`).

#### Response 204

Sem corpo (`F1 src/modules/internalNotes/internalNotes.controller.ts:75`).

#### Erros

| Status    | Condição                                           | Mensagem                                                                                                                                 | Evidência                                                                                 |
| --------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 400       | `lastReadNoteId` ausente ou fora de `/^[1-9]\d*$/` | `"Campos inválidos: lastReadNoteId — Identificador da observação inválido."` (ausente: `"Campos obrigatórios ausentes: lastReadNoteId"`) | `F1 src/modules/internalNotes/internalNotes.schema.ts:16-19`                              |
| 400       | nota de outra solicitação ou inexistente           | `"Observação interna não pertence à solicitação"`                                                                                        | `F1 src/modules/internalNotes/internalNotes.service.ts:352-356`                           |
| 400       | `protocol` vazio                                   | `"Protocolo é obrigatório."`                                                                                                             | `F1 src/modules/internalNotes/internalNotes.schema.ts:3-5`                                |
| 401 / 403 | idem §17.3                                         | idem §17.3                                                                                                                               | `F1 src/shared/middleware/auth.ts:27-45`; `F1 src/shared/middleware/requireRole.ts:11-22` |
| 404       | protocolo sem solicitação                          | `"Solicitação não encontrada"`                                                                                                           | `F1 src/modules/internalNotes/internalNotes.service.ts:351`                               |
| 500       | falha não prevista                                 | `"Erro interno do servidor"`                                                                                                             | `F1 src/shared/middleware/errorHandler.ts:32-44`                                          |

### 17.6 Visão do consumidor (F2) e drift

- Cliente: `/requests/{protocol}/internal-notes` com `encodeURIComponent` no protocolo; GET com
  `limit`/`cursor` só quando definidos, POST e PUT com body JSON
  (`F2 src/lib/api/internal-note.api.ts:11-70`).
- Tipos alinhados campo a campo, inclusive `nextCursor`, `unseenCount`, `triages` e `mappings`
  (`F2 src/lib/types/internal-note.ts:81-92`); as constantes de `limit` são espelhadas no cliente
  (1/50/20 em `F2 src/lib/types/internal-note.ts:102-105`).
- O cursor é transportado como string opaca, sem conversão numérica
  (`F2 src/lib/types/internal-note.ts:89-92`; `F2 src/lib/api/internal-note.api.ts:15-21`).
- O F2 reimplementa a ordem canônica na apresentação, com `BigInt` nos ids para comparar
  `internal_note_id`/`audit_id` sem perda (`F2 src/routes/(admin)/fila/[protocolo]/components/InternalNotesSection.svelte:186-204`).
- **Composição só do cliente:** o F2 cria itens sintéticos `type: "ref"` (um por entrada de
  `triages`/`mappings`, com rank 2 no empate) para ancorar as tabelas de histórico na linha do tempo
  (`F2 src/routes/(admin)/fila/[protocolo]/components/InternalNotesSection.svelte:88-99`).
  Nada disso existe no wire: o backend devolve `triages`/`mappings` apenas como listas de topo.
- O F2 valida `content` antes de enviar, com a mesma regra de 4.000 caracteres, e mensagem própria
  `"Escreva uma observação antes de publicar."`
  (`F2 src/lib/services/internal-note.service.ts:26-33`).
- O F2 substitui as mensagens do backend por textos próprios: `403` →
  `"Você não tem permissão para acessar as observações internas."`, `404` →
  `"Solicitação não encontrada."`, demais → fallback por operação
  (`F2 src/lib/services/internal-note.service.ts:15-24`).
- `markThrough` só é disparado a partir da página inicial (sem cursor), com a nota mais recente
  carregada (`F2 src/routes/(admin)/fila/[protocolo]/components/InternalNotesSection.svelte:233-235,298`),
  coerente com "GET não marca lido" (`F1 docs/internal-observations.md:263,288-295`).

### 17.7 Confronto com `docs/04-API-Conventions.md`

- **Divergente (legado vigente):** paths sem `/api/v1` — convenção §1.
- **Compatível por exceção registrada:** paginação keyset `{ items, nextCursor }` com `limit` default
  20 e máximo 50 — a linha "Linha do tempo" da §4.3 registra essa exceção.
- **Compatível:** `201` na criação e `204` sem corpo na marcação — §15.4.
- **Compatível:** datas de timestamp em ISO-8601 UTC (§10). Observação de forma: `occurredAt` e
  `createdAt` levam milissegundos, enquanto `mapping.scheduledFor` é serializado com precisão de
  segundos por `toIsoSeconds` (`F1 src/modules/internalNotes/internalNotes.service.ts:184-190,227`).
- **Compatível por exceção registrada:** valores de domínio em pt-BR (`text`, `role`) com chaves
  camelCase — §11.
- **Divergente (legado vigente):** ids de nota são BIGINT serializados como string
  (`F1 src/modules/internalNotes/internalNotes.service.ts:34`) e o checkpoint usa o mesmo BIGINT
  (`F1 src/modules/internalNotes/internalNotes.schema.ts:15-20`). §15.1/ADR-0003 determinam PK UUID
  v4 gerada pela aplicação; a §11 só admite exceção de auditoria, não de observações.
- **Divergente (legado vigente):** ids numéricos de status no wire (`triages[].triage.exitStatus` e
  `mappings[].mapping.targetStatus`) — §15.1, ADR-0021.
- **Divergente (legado vigente):** a autorização é só por nome de perfil, sem capability nem escopo
  `own`/`all`, e a leitura dos históricos de triagem/mapeamento ignora a custódia que a rota de
  triagem exige (§6; spec de `internal-notes`) — ADR-0025 e convenção §6 ("autorização
  verificada no servidor em um lugar só por domínio").
- **Desatualizado no legado:** `F1 docs/internal-notes-contract.md` descreve a v1 do endpoint —
  "Lista todas as observações em ordem cronológica crescente" sem paginação
  (`F1 docs/internal-notes-contract.md:37-40`), resposta só com `items`/`unseenCount` e sem `type`
  (`F1 docs/internal-notes-contract.md:44-60,72-76`) e ausência de `triages`/`mappings`. O código
  vigente pagina por keyset, devolve `nextCursor`, adiciona os tipos `note`/`event` e os dois
  históricos de topo (`F1 src/modules/DTOs/internalNotes/InternalNotes.dto.ts:52-58`;
  `F1 docs/internal-observations.md:1-14`). O documento v1 continua citando `requests.internal_notes`
  como legado fora do contrato (`F1 docs/internal-notes-contract.md:9`), o que o código atual mantém.
- **Desatualizado no legado:** `F1 docs/internal-observations.md:87` grafia a mensagem de senha
  pendente como `"Troca de senha obrigatórica antes de continuar"`; a mensagem emitida é
  `"Troca de senha obrigatória antes de continuar"` (`F1 src/shared/middleware/auth.ts:59`).
- **Desatualizado no legado:** `F1 docs/internal-observations.md:597-601` exemplifica o 403 com
  `"Acesso restrito aos perfis internos"` (mensagem do controller, inalcançável); o 403 efetivo de
  perfil vem do `requireRole` (`F1 src/shared/middleware/requireRole.ts:21-22`).

## 18. Divergências anotadas (índice)

Este índice não decide nada: ele apenas agrupa, por assunto, onde o legado diverge das convenções
congeladas. As decisões correspondentes estão nas specs de domínio e nos ADRs em `docs/adr/`. A
fonte de cada assunto é o confronto da própria seção; esta lista só serve de atalho.

| Assunto                   | Onde aparece                                                                     | Ponteiro                            |
| ------------------------- | -------------------------------------------------------------------------------- | ----------------------------------- |
| Base path                 | §3.1; todas as seções                                                            | convenção §1                        |
| Envelope de erro          | §3.3; todas as seções                                                            | ADR-0005; convenções §2 e §12       |
| Validação                 | §3.4; §5.8; §6.7; §7.12; §8.14; §9.14; §10.7; §11.6; §12.6; §13.10; §14.6; §15.6 | convenção §3 (C2); tabela 0.1 #5    |
| Paginação                 | §3.6; §14.4; §16.5                                                               | convenção §4; tabela 0.1 #6         |
| Ids                       | §5.3; §7; §10.3; §12.3; §14.4; §16.3; §17                                        | ADR-0003; ADR-0021; convenção §15.1 |
| Status no wire            | §9; §10; §11; §14; §15; §16                                                      | ADR-0021; convenção §15.1           |
| Perfis e autorização      | §3.2; §7; §8; §9; §10.7; §11.6; §12.6; §13.10; §14; §15; §16; §17.7              | ADR-0006; ADR-0017; ADR-0025        |
| Identidade do solicitante | §3.9; §9.7; §13.8                                                                | ADR-0023; convenção §15.3           |
| Multipart e MIME          | §3.7; §7.7; §8.5; §9.12; §13.7                                                   | convenção §9; tabela 0.1 #22        |
| Anexos                    | §9.13; §13.9                                                                     | sem convenção correspondente        |
| Prazo e atraso            | §9; §14.3; §15                                                                   | ADR-0024                            |
| Prioridade                | §9; §12; §14                                                                     | ADR-0016                            |
| Mapeamento                | §11                                                                              | ADR-0001                            |
| Auditoria                 | §16                                                                              | ADR-0020; convenção §15.2           |
| Notas internas            | §17                                                                              | ADR-0003; ADR-0021; ADR-0025        |
| Formulário                | §6                                                                               | ADR-0012; ADR-0019; ADR-0022        |
| Portal-config             | §7                                                                               | ADR-0015; ADR-0018; ADR-0021        |
