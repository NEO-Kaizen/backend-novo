# Contrato legado — port fiel do backend atual

Este documento registra, domínio por domínio, o contrato HTTP **vigente no backend legado** no
commit `70acc02c89c58d9b0056f9f1615502212873c7e2` (referência `F1`). Ele descreve o que o sistema
faz hoje, para que o backend-novo tenha uma fonte única e fiel antes de qualquer alteração.

**Este documento não decide nada.** Não há renomeação de rota ou campo, não há correção de
divergência e não há recomendação. Onde o legado diverge das convenções congeladas do backend-novo,
a divergência é apenas **anotada**, com ponteiro para a decisão correspondente. Os deltas
intencionais vivem nas specs de domínio (issues #15–#27) e em `docs/adr/`.

## Como ler este documento

- **Legado vigente** — comportamento efetivo no commit `F1`, com evidência de código.
- **Divergente (legado vigente)** — o comportamento existe e é o que está documentado, mas contraria
  `docs/04-API-Conventions.md`. A anotação aponta a convenção e o destino da decisão; nada é
  alterado aqui.
- **Desatualizado no legado** — um documento do próprio legado (`F1 docs/...`) contradiz o código no
  mesmo commit. O código prevalece e a divergência é registrada.
- **Não verificado** — quando a evidência não permite afirmar o comportamento (por exemplo, regra
  que depende de dados ou de configuração externa).
- **Fora do inventário** — rota servida por middleware estático ou de infraestrutura, que não é
  contrato de domínio.

Citação: `F1 <caminho>:<linha>` para código e `F2 <caminho>:<linha>` para o consumidor; documentos
do legado são citados como `F1 docs/<arquivo>.md` (sem linha, salvo quando a seção é relevante).
Linhas foram lidas no commit fixado, nunca na árvore de trabalho.

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
- [18. Cobertura e checklist de aceite](#18-cobertura-e-checklist-de-aceite)
- [19. Divergências anotadas (índice)](#19-divergências-anotadas-índice)
- [20. Como atualizar este port](#20-como-atualizar-este-port)

## Template das seções de domínio

Cada domínio (§5 a §17) segue a mesma estrutura:

1. **Fontes** — código, documentos do legado e consumidor usados na seção.
2. **Rotas** — tabela com método, path completo, autenticação/autorização, handler, sucesso e erros.
3. **Uma subseção por rota** com: request (path/query/body/headers), response de sucesso, erros
   (status, `code` quando houver, mensagem literal e condição), transporte (cookie, multipart,
   paginação, datas) e evidência.
4. **Visão do consumidor (F2)** — o que o frontend chama e onde ele diverge do backend, sem decisão.
5. **Confronto com `docs/04-API-Conventions.md`** — `compatível` ou `divergente (legado vigente)`,
   com ponteiro para a convenção, o ADR ou a decisão da issue de origem.

Rotas públicas não recebem `security` explícito neste documento; a coluna de autenticação é a fonte.

## 1. Escopo e fora de escopo

**Escopo:** as 54 rotas registradas em `F1 src/router.ts:16-32` nos 10 routers de domínio, mais a
gramática do payload de formulário (§6) que não tem superfície HTTP própria.

**Fora de escopo:** deltas intencionais, geração de OpenAPI, implementação em `src/`, migração de
dados e qualquer julgamento sobre o que deveria ser diferente. Rotas de infraestrutura
(`GET /uploads/*`, `GET /health` quando existir) são citadas apenas como contexto de transporte.

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
- `F1` é o HEAD do backend no momento deste port (`git log -1`), mas o contrato é fixado por SHA:
  se o legado avançar, este documento não muda.

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

- O cookie é `Config.COOKIE_NAME`, default `session_id` (`F1 src/configs.ts:20`); o conteúdo é um
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
  `403 "Acesso restrito ao perfil <perfis unidos por ' ou '>"` (`F1 src/shared/middleware/requireRole.ts:9-23`).
- **Desatualizado no legado:** `F1 src/shared/middleware/dualAuth.ts:20` testa o cookie literal
  `session_id` em vez de `Config.COOKIE_NAME`; com `COOKIE_NAME` customizado, a rota dual-auth trata
  a sessão como anônima.

**Divergente (legado vigente):** `clearCookie` sem os demais atributos — anotado em #15
("Inconsistências a corrigir").

### 3.3 Envelope de erro

Formato vigente (`F1 src/shared/middleware/errorHandler.ts:9-45`):

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
  mensagem `"Erro interno do servidor"` para 5xx (`F1 src/shared/middleware/errorHandler.ts:32-45`).
- Não há `requestId` no envelope no legado.

**Divergente (legado vigente):** `fields` como objeto e uso de `422` em parte do fluxo — convenções
§5 e #5 de `docs/04-API-Conventions.md` (alvo `400` + `fields` como lista). Não há `requestId` —
convenção §15.

### 3.4 Validação

O legado usa dois caminhos:

| Caminho                                   | Status | Corpo                      | Evidência                                      |
| ----------------------------------------- | ------ | -------------------------- | ---------------------------------------------- |
| `formatZodIssues`                         | 400    | mensagem agregada em pt-BR | `F1 src/shared/validation/zodErrors.ts:89-91`  |
| `buildZodFieldErrors` → `ValidationError` | 422    | `{ message, fields }`      | `F1 src/shared/validation/zodErrors.ts:99-117` |

O primeiro é usado, por exemplo, em `auth` (`F1 src/modules/auth/auth.controller.ts:32-36`) e no
verify público (`F1 src/modules/pendingItems/pendingItems.controller.ts:114-115`); o segundo, no
fluxo de requests. A distribuição exata é registrada em cada seção de domínio.

**Divergente (legado vigente):** mistura 400/422 — convenção §5 (C2) e decisão D12 de #19.

### 3.5 Códigos de sucesso

Predomina `200` com corpo JSON, inclusive em criação e atualização. `201` e `204` só aparecem onde
a seção do domínio registra. Não há uso de `Location` nem de `ETag`.

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

O corpo JSON trafega como parte multipart quando a rota aceita arquivo (campo `payload` em
`POST /requests`; campo `assets` em `PATCH /portal-config/assets`; campo `avatar` convive com um
único campo JSON em `PUT /users/me`).

**Divergente (legado vigente):** 400 para MIME inválido em requests/pendências, 415 em avatar e
assets; convenção §9 e D6 de #17.

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
por `POST .../public/verify`; ADR-0023 e convenção §19 apontam `X-Requester-Email`, 404 e a
aposentadoria gradual do verify.

### 3.10 CORS, headers e request-id

- CORS com origens explícitas de `CORS_ORIGINS` (default `http://localhost:5173`), `credentials:
true` e `exposedHeaders: ["Content-Disposition"]` (`F1 src/app.ts:11-19`; `F1 src/configs.ts:16-19`).
- `x-powered-by` desligado (`F1 src/app.ts:21`).
- Não há middleware de `x-request-id` nem headers de segurança no legado; também não há handler de
  404 dedicado — rota inexistente cai no `errorHandler` (`F1 src/app.ts:28-31`).

**Divergente (legado vigente):** sem request-id, sem headers de segurança e sem 404 explícito —
convenções §15 e §17; `02-Architecture.md` §9.4.

### 3.11 Rate limit

Só o verify público de pendências aplica limite: 10 tentativas por 10 minutos, chave
`ip:protocolo` normalizado, storage em memória do processo; excedeu →
`429 "Muitas tentativas. Tente novamente em alguns minutos."`, sem `Retry-After`
(`F1 src/modules/pendingItems/pendingItems.controller.ts:8-12,109-112`;
`F1 src/shared/middleware/rateLimit.ts:7-29`).

**Divergente (legado vigente):** storage não compartilhado e ausência de `Retry-After` — convenção
§16 (C12). Login não tem limite no legado — decisão aberta #24.

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
| 13  | users          | GET    | `/users/analysts`                                              | sessão (qualquer perfil interno)                                  | `listAnalysts`                     | `F1 src/modules/users/users.router.ts:23`                      |
| 14  | users          | GET    | `/users/me`                                                    | sessão                                                            | `getMyProfile`                     | `F1 src/modules/users/users.router.ts:26`                      |
| 15  | users          | PUT    | `/users/me`                                                    | sessão; multipart opcional                                        | `updateMyProfile`                  | `F1 src/modules/users/users.router.ts:29`                      |
| 16  | users          | GET    | `/users/metrics`                                               | Administrador                                                     | `getUserMetrics`                   | `F1 src/modules/users/users.router.ts:32`                      |
| 17  | users          | GET    | `/users`                                                       | Administrador                                                     | `listUsers`                        | `F1 src/modules/users/users.router.ts:33`                      |
| 18  | users          | POST   | `/users`                                                       | Administrador                                                     | `createUser`                       | `F1 src/modules/users/users.router.ts:34`                      |
| 19  | users          | GET    | `/users/:id`                                                   | Administrador                                                     | `getUser`                          | `F1 src/modules/users/users.router.ts:35`                      |
| 20  | users          | PUT    | `/users/:id`                                                   | Administrador                                                     | `updateUser`                       | `F1 src/modules/users/users.router.ts:36`                      |
| 21  | users          | PATCH  | `/users/:id/status`                                            | Administrador                                                     | `changeUserStatus`                 | `F1 src/modules/users/users.router.ts:37`                      |
| 22  | users          | POST   | `/users/:id/reset-password`                                    | Administrador                                                     | `resetUserPassword`                | `F1 src/modules/users/users.router.ts:38`                      |
| 23  | requests       | GET    | `/requests`                                                    | modo do portal (`PUBLIC`/`AUTHENTICATED`)                         | `getRequestsByEmail`               | `F1 src/modules/requests/requests.router.ts:24`                |
| 24  | requests       | GET    | `/requests/assignees`                                          | Analista, Gestor, Administrador                                   | `getAssignees`                     | `F1 src/modules/requests/requests.router.ts:27-32`             |
| 25  | requests       | PATCH  | `/requests/:protocol/internal/assignee`                        | Analista, Administrador; custódia no service                      | `patchInternalAssignee`            | `F1 src/modules/requests/requests.router.ts:38-43`             |
| 26  | requests       | PATCH  | `/requests/:protocol/assignee`                                 | Analista, Administrador; alias legado                             | `patchAssignee`                    | `F1 src/modules/requests/requests.router.ts:45-50`             |
| 27  | requests       | GET    | `/requests/:protocol/tracking`                                 | dual (sessão ou `X-Requester-Identity`)                           | `getTracking`                      | `F1 src/modules/requests/requests.router.ts:55`                |
| 28  | requests       | PATCH  | `/requests/:protocol/status`                                   | Analista, Gestor, Administrador; custódia no service              | `patchRequestStatus`               | `F1 src/modules/requests/requests.router.ts:60-65`             |
| 29  | requests       | GET    | `/requests/:protocol`                                          | modo do portal                                                    | `getRequestsByProtocol`            | `F1 src/modules/requests/requests.router.ts:67`                |
| 30  | requests       | GET    | `/requests/:protocol/internal`                                 | Analista, Gestor, Administrador                                   | `getInternalRequestByProtocol`     | `F1 src/modules/requests/requests.router.ts:68-75`             |
| 31  | requests       | PATCH  | `/requests/:protocol/internal`                                 | Analista, Gestor, Administrador; custódia no service              | `patchInternalRequestByProtocol`   | `F1 src/modules/requests/requests.router.ts:79-84`             |
| 32  | requests       | POST   | `/requests`                                                    | modo do portal; multipart                                         | `postRequest`                      | `F1 src/modules/requests/requests.router.ts:88`                |
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

### 5.3 POST /auth/login

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
  "name": "Ana Souza",
  "email": "ana.souza@example.com",
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

- `Set-Cookie: <COOKIE_NAME>=<jwt>; Max-Age=<COOKIE_MAX_AGE em segundos>; Path=/; HttpOnly; SameSite=Lax[; Secure]`
  (`F1 src/modules/auth/auth.controller.ts:12-17,50,73`).
- `COOKIE_NAME` default `session_id` (`F1 src/configs.ts:23`). `COOKIE_MAX_AGE` é derivado de
  `JWT_EXPIRES_IN` (default `1d`) por `jwtExpiryToMs`, que lê o último caractere como unidade `d`/`h`/`m`
  e, na ausência dessas, trata o valor como segundos (`F1 src/configs.ts:17,22,28-35`). Com o default,
  `Max-Age=86400`.
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

### 5.4 POST /auth/logout

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
`docs/04-API-Conventions.md` e issue #15 ("Inconsistências a corrigir"); ver §3.2 deste documento.

#### Evidência

- `F1 src/modules/auth/auth.router.ts:8`
- `F1 src/modules/auth/auth.controller.ts:26-29`
- `F1 src/shared/middleware/auth.ts:63-72`

### 5.5 GET /auth/me

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
  "name": "Ana Souza",
  "email": "ana.souza@example.com",
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

### 5.6 PUT /auth/change-password

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
  "name": "Ana Souza",
  "email": "ana.souza@example.com",
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

| Item                                | Situação                                                                                                                                                    | Ponteiro                               |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Base path `/api/v1`                 | **Divergente (legado vigente):** rotas em `/auth/*`, sem prefixo                                                                                            | §1; §3.1 deste documento               |
| Envelope de erro legado             | `compatível` com o envelope vigente `{ status, statusCode, message }`, sem `requestId`                                                                      | §2.1; ADR-0005                         |
| `code` nos erros de `auth`          | `compatível` com o envelope vigente, em que `code` é aditivo; nenhum erro de `auth` o define, então `unauthorized`/`forbidden` do catálogo não aparecem     | §2.1; §2.3                             |
| Validação                           | **Divergente (legado vigente):** 400 apenas com `message` agregada, sem `code: "validation_error"` e sem `fields`                                           | §3 (C2); #5                            |
| Sessão e cookie na emissão          | `compatível`: `session_id` configurável, HttpOnly, SameSite=Lax, Secure em produção, TTL 1 dia                                                              | §5                                     |
| Limpeza do cookie no logout         | **Divergente (legado vigente):** `clearCookie` só com `httpOnly`                                                                                            | §5; #15; §3.2                          |
| `/auth/me` — DTO                    | **Divergente (legado vigente):** `name`, `email`, `mustChangePassword` e `avatarUrl (string \| null)` coincidem, mas não há `permissions`                   | §7; ADR-0025                           |
| `/auth/me` — `id`                   | **Divergente (legado vigente):** `id` é string decimal de `users.user_id`, não UUID                                                                         | §7 (exemplo `"uuid"`); §15.1; ADR-0003 |
| `/auth/me` — `role`                 | **Divergente (legado vigente):** quatro perfis (`Solicitante`, `Analista`, `Gestor`, `Administrador`), sem `Admin Root`; `role` vem do banco a cada request | §6; ADR-0006; ADR-0025                 |
| Rate limit de login                 | **Divergente (legado vigente):** sem limite e sem 429 na rota                                                                                               | §13; §0.2 #24                          |
| Idempotência                        | `compatível`: login não idempotente; logout repetível com 200                                                                                               | §8.2                                   |
| Datas e horas                       | `compatível`/não aplicável: nenhum campo de data nas respostas; `password_changed_at` só existe dentro do JWT                                               | §10                                    |
| Idioma                              | `compatível`: chaves camelCase, mensagens e valores em pt-BR                                                                                                | §11                                    |
| 403 de senha pendente               | `compatível` em status (403); a mensagem `"Troca de senha obrigatória antes de continuar"` não traz `code`                                                  | §2.3; §5                               |
| Revogação por `password_changed_at` | `compatível` com a validação por requisição descrita na convenção                                                                                           | §5                                     |

**Cobertura da seção:** 4 de 4 rotas do inventário.

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `PUT /auth/change-password`

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
`F1 src/shared/types/requests.ts:54-68` são referência de tipo, não allowlist de runtime: só os dois
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

**Correção do valor (`correctedValue`):** a revisão do lote valida por chave antes de aplicar
(`F1 src/modules/pendingItems/pendingItems.service.ts:392-453`):

| Chave                                                          | Regra na revisão                                                                                                                                          | Mensagem                                                                                                                     |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `operational.peopleInvolved`, `operational.monthlyEffortHours` | precisa ser número                                                                                                                                        | `Campos inválidos: correctedValue — <chave> deve ser número`                                                                 |
| `operational.peopleInvolved`                                   | precisa ser `> 0`                                                                                                                                         | `Campos inválidos: correctedValue — peopleInvolved > 0`                                                                      |
| `operational.hasManualControls`                                | `false` ou texto não vazio                                                                                                                                | `Campos inválidos: correctedValue — hasManualControls deve ser false ou texto não vazio`                                     |
| `operational.desiredDeadline`                                  | `AAAA-MM-DD` e data parseável                                                                                                                             | `Campos inválidos: correctedValue — desiredDeadline deve ser yyyy-mm-dd`; `Campos inválidos: correctedValue — data inválida` |
| `operational.operationalImpact`                                | vocabulário de impacto                                                                                                                                    | `Campos inválidos: correctedValue — operationalImpact inválido`                                                              |
| `operational.perceivedCriticality`                             | vocabulário de criticidade                                                                                                                                | `Campos inválidos: correctedValue — perceivedCriticality inválido`                                                           |
| demais                                                         | texto ou `null`; vazio só em `requester.department`, `requester.additionalContact`, `complementary.additionalNotes` e nas quatro flags de `complementary` | `Campos inválidos: correctedValue — <chave> deve ser texto`; `Campos inválidos: correctedValue — <chave> não pode ser vazio` |

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
catálogo (33 no total) em quatro seções e envia apenas `fieldKey`
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
top-level, fora do formulário; o wire de abertura mantém `demand.category` por compatibilidade até o
formulário configurável entrar (`docs/adr/0022-the-classification-picks-the-form.md`, "Emenda de
compatibilidade").

### 6.7 Confronto com `docs/04-API-Conventions.md`

| Convenção                                                                 | Comportamento no legado (§6)                                                | Situação                    | Ponteiro                                                           |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------ |
| §2 / §2.3 — envelope e `code`                                             | 400 `{ status, statusCode, message }`, sem `code` e sem `requestId`         | divergente (legado vigente) | ADR-0005; convenção §2.3                                           |
| §3 — validação `400` + `validation_error` + `fields: [{ path, message }]` | `POST /requests` responde 400 com **uma string agregada** e nenhum `fields` | divergente (legado vigente) | convenção §3 (C2) e tabela 0.1 #5; decisão D12 de #19              |
| §9 — MIME inválido → 415; arquivo acima do limite → 413                   | MIME e tamanho respondem 400, com mensagens próprias                        | divergente (legado vigente) | convenção §9                                                       |
| §9 — parte `payload` acima de 2 MiB → 413                                 | 400 com a mensagem de fallback do multer                                    | divergente (legado vigente) | convenção §9                                                       |
| §9 — 5 arquivos × 10 MiB, parte JSON de 2 MiB                             | mesmos limites                                                              | compatível                  | convenção §9; `F1 src/shared/middleware/upload.ts:13-22,35-38`     |
| §10 — datas puras `yyyy-mm-dd`                                            | `desiredDeadline` segue o formato                                           | compatível                  | convenção §10                                                      |
| §10 — timestamps ISO-8601 UTC                                             | `schedulePreferences` usa `AAAA-MM-DDTHH:MM`, sem fuso e sem segundos       | divergente (legado vigente) | convenção §10; `F1 src/modules/requests/requests.schema.ts:96-104` |
| §11 — chaves EN camelCase, valores pt-BR                                  | blocos e chaves em camelCase; enums e mensagens em pt-BR                    | compatível                  | convenção §11                                                      |
| §1 — base path `/api/v1`                                                  | o transportador vive em `/requests`                                         | divergente (legado vigente) | já registrado em §3.1 e §9                                         |
| #22 — multipart com limites por rota                                      | limites coincidem; status divergem (acima)                                  | divergente (legado vigente) | convenção §9; tabela 0.1 #22                                       |

Contexto de delta intencional (ponteiro, sem decisão nesta seção): o formulário fixo em código é
substituído por `forms` → `form_blocks` → `form_fields`, com respostas em `requests.form_answers`
(ADR-0012); a definição é editada no lugar, sem versionamento (ADR-0019); a categoria passa a ser
classificação top-level que escolhe o formulário, com `categories.form_id` (ADR-0022). O seed desses
ADRs tem 32 campos — as 33 chaves do catálogo legado menos `demand.category`
(`docs/adr/0012-form-is-a-configurable-entity.md`, "Consequências").

**Cobertura da seção:** 0 rotas (sem superfície HTTP); 33 chaves de campo catalogadas.

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
| F1  | `src/modules/portalConfig/portalConfig.mappers.ts`                                                                                  | tema (contrato ↔ colunas planas) e defaults             |
| F1  | `src/shared/middleware/uploadAssets.ts`                                                                                             | multipart de `/assets`                                  |
| F1  | `src/shared/types/portalConfig.ts`                                                                                                  | tipos do contrato, allowlists, `CORE_STATUS_IDS`        |
| F1  | `src/shared/types/systemSettings.ts`, `src/shared/types/systemTheme.ts`, `src/shared/types/criteria.ts`, `src/shared/types/role.ts` | linhas de banco e ponte de critérios/perfis             |
| F1  | `src/modules/DTOs/portalConfig/PortalConfigResponse.dto.ts`, `src/modules/DTOs/portalConfig/PortalConfigRequests.dto.ts`            | DTOs das respostas e corpos                             |
| F1  | `docs/portal-config-api-0_4.md`, `docs/portal-config-endpoints.md`, `docs/portal-config-statuses-amend.md`                          | documentos do legado                                    |
| F2  | `src/lib/config/portal-config.api.ts`                                                                                               | chamadas HTTP por seção                                 |
| F2  | `src/lib/config/portal-config.service.ts`                                                                                           | sanitize de leitura/escrita, fallback e validação local |
| F2  | `src/lib/config/portal-config-load.ts`                                                                                              | flag de falha de carregamento                           |
| F2  | `src/lib/types/portal-config.ts`                                                                                                    | tipos espelhados e aliases legados                      |

Contexto transversal já fixado na §3: envelope de erro (`F1 src/shared/middleware/errorHandler.ts:9-45`),
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
- Toda escrita roda em transação com `lockSettings` (e `lockTheme` no tema) e grava auditoria
  `entityType: "settings"`, `entityId: "settings"`, `actionType: "settings.update"`
  (`F1 src/modules/portalConfig/portalConfig.service.ts:106-122,135-160,173-191,204-223,236-257,270-346,357-378`).
- `GET /uploads/*` é `express.static` público sobre `Config.UPLOAD_DIR` com `fallthrough: false`
  (`F1 src/app.ts:24`): serve os binários de `/assets`, é infraestrutura e **não** integra o
  inventário da §4 (mesma classificação da §3.1).

**Divergente (legado vigente):** ausência de `/api/v1` nas 8 rotas — convenção §1 de
`docs/04-API-Conventions.md`.

### 7.3 GET /portal-config

**Request:** sem path param, query, body ou header obrigatório. Antes dos guardas
(`F1 src/modules/portalConfig/portalConfig.router.ts:19`), portanto anônimo.

**Response 200** — `PortalConfig` (`F1 src/modules/DTOs/portalConfig/PortalConfigResponse.dto.ts:1-2`),
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

**Erros**

| Status | `code` | Mensagem                     | Condição                                                                                                                                                                                                                       |
| ------ | ------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 500    | —      | `"Erro interno do servidor"` | falha de banco; singleton `system_settings` ausente lança `Error` (`F1 src/modules/portalConfig/portalConfig.repository.ts:21-29`) e cai no ramo genérico do `errorHandler` (`F1 src/shared/middleware/errorHandler.ts:32-45`) |

O outro único erro possível é o encaminhamento de exceção não prevista pelo `errorHandler`, com a
mesma mensagem genérica para 5xx. Não há 401/403 nesta rota.

**Transporte:** JSON; resposta completa `200` (sem `201`/`204`); nenhum header de cache.

**Evidência:** `F1 src/modules/portalConfig/portalConfig.router.ts:19`;
`F1 src/modules/portalConfig/portalConfig.controller.ts:50-53`;
`F1 src/modules/portalConfig/portalConfig.service.ts:65-96`;
`F1 src/modules/portalConfig/portalConfig.repository.ts:21-74`.

### 7.4 PATCH /portal-config/access

**Request** (`F1 src/modules/portalConfig/portalConfig.schema.ts:70-76`):

| Campo              | Tipo                            | Regra                           |
| ------------------ | ------------------------------- | ------------------------------- |
| `solicitationMode` | `"PUBLIC"` \| `"AUTHENTICATED"` | obrigatório; objeto `.strict()` |

```http
PATCH /portal-config/access HTTP/1.1
Content-Type: application/json
Cookie: session_id=<sessão de Administrador>

{ "solicitationMode": "AUTHENTICATED" }
```

**Response 200** — `AccessSection`, eco do valor gravado
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

**Erros**

| Status | `code` | Mensagem                                                                                            | Condição                                                                                                                                               |
| ------ | ------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 400    | —      | `"Campos inválidos: solicitationMode — Modo de acesso inválido — opções: PUBLIC ou AUTHENTICATED."` | ausência **ou** valor fora da allowlist — o enum responde a mesma mensagem nos dois casos (`F1 src/modules/portalConfig/portalConfig.schema.ts:72-74`) |
| 400    | —      | `"Campos inválidos: payload — Unrecognized key: \"modo\""`                                          | chave desconhecida (objeto `.strict()`; issue sem path é rotulada `payload` — `F1 src/shared/validation/zodErrors.ts:74,89-91`)                        |
| 401    | —      | `"Token não fornecido"`                                                                             | sem cookie de sessão (`F1 src/shared/middleware/auth.ts:27-31`)                                                                                        |
| 401    | —      | `"Token inválido ou expirado"`                                                                      | token inválido/expirado, usuário inativo ou sessão revogada (`F1 src/shared/middleware/auth.ts:37-52,68-76`)                                           |
| 403    | —      | `"Troca de senha obrigatória antes de continuar"`                                                   | `must_change_password` (`F1 src/shared/middleware/auth.ts:39-42`)                                                                                      |
| 403    | —      | `"Acesso restrito ao perfil Administrador"`                                                         | perfil diferente de Administrador (`F1 src/shared/middleware/requireRole.ts:21-22`)                                                                    |
| 500    | —      | `"Erro interno do servidor"`                                                                        | falha não prevista                                                                                                                                     |

O 400 de validação **não** traz `code` nem `fields`: a mensagem vai agregada em `message`
(`F1 src/modules/portalConfig/portalConfig.controller.ts:60-63`;
`F1 src/shared/validation/zodErrors.ts:89-91`).

**Transporte:** JSON; resposta `200` com a seção; o cookie é o único estado de sessão.

**Evidência:** `F1 src/modules/portalConfig/portalConfig.router.ts:25`;
`F1 src/modules/portalConfig/portalConfig.controller.ts:59-67`;
`F1 src/modules/portalConfig/portalConfig.service.ts:102-125`.

### 7.5 PATCH /portal-config/identity

**Request** (`F1 src/modules/portalConfig/portalConfig.schema.ts:78-100`):

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

**Response 200** — `IdentitySection`, **relido** do banco após o update, portanto sempre com os dois
campos (`F1 src/modules/portalConfig/portalConfig.service.ts:146-161`):

| Campo          | Tipo   | Regra            |
| -------------- | ------ | ---------------- |
| `platformName` | string | valor persistido |
| `protocolMask` | string | valor persistido |

```json
{ "platformName": "NEO", "protocolMask": "NEO" }
```

**Erros**

| Status | `code` | Mensagem                                                                                       | Condição                                                                                                          |
| ------ | ------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 400    | —      | `"Campos inválidos: platformName — Informe ao menos um campo."`                                | body `{}` (o `refine` aponta o path `platformName` — `F1 src/modules/portalConfig/portalConfig.schema.ts:94-100`) |
| 400    | —      | `"Campos inválidos: platformName — Campo obrigatório."`                                        | `platformName` só com espaços/inválido (`F1 src/modules/portalConfig/portalConfig.schema.ts:80-84`)               |
| 400    | —      | `"Campos inválidos: protocolMask — Máscara do protocolo deve conter apenas letras e números."` | caractere fora de `[A-Za-z0-9]` (`F1 src/modules/portalConfig/portalConfig.schema.ts:86-90`)                      |
| 400    | —      | mensagem agregada do Zod em `payload`                                                          | chave desconhecida (`.strict()`)                                                                                  |
| 401    | —      | `"Token não fornecido"` / `"Token inválido ou expirado"`                                       | ausência/invalidade de sessão (`F1 src/shared/middleware/auth.ts:27-45,68-76`)                                    |
| 403    | —      | `"Acesso restrito ao perfil Administrador"`                                                    | perfil diferente de Administrador (`F1 src/shared/middleware/requireRole.ts:21-22`)                               |
| 403    | —      | `"Troca de senha obrigatória antes de continuar"`                                              | `must_change_password` (`F1 src/shared/middleware/auth.ts:39-42`)                                                 |
| 500    | —      | `"Erro interno do servidor"`                                                                   | falha não prevista                                                                                                |

**Transporte:** JSON; `updated_by`/`updated_at` gravados em `system_settings`
(`F1 src/modules/portalConfig/portalConfig.repository.ts:104-117`), sem exposição no payload.

**Evidência:** `F1 src/modules/portalConfig/portalConfig.router.ts:26`;
`F1 src/modules/portalConfig/portalConfig.controller.ts:73-81`;
`F1 src/modules/portalConfig/portalConfig.service.ts:131-163`.

### 7.6 PATCH /portal-config/theme

**Request** (`F1 src/modules/portalConfig/portalConfig.schema.ts:17-68`) — **atômico**: as duas
paletas completas, sem merge por token. Objetos `.strict()` em todos os níveis.

| Campo                     | Tipo          | Regra                                                                                                                                                                                                                                                                                            |
| ------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `theme.light`             | `ThemeTokens` | obrigatório                                                                                                                                                                                                                                                                                      |
| `theme.dark`              | `ThemeTokens` | obrigatório                                                                                                                                                                                                                                                                                      |
| `<paleta>.<token>`        | string hex    | os 13 `THEME_TOKEN_KEYS` obrigatórios: `background`, `surface`, `border`, `textPrimary`, `textSecondary`, `heading`, `richBlack`, `primary`, `secondary`, `tint`, `onPrimary`, `onDark`, `onGradient` (`F1 src/shared/types/portalConfig.ts:55-71`); regex `^#([0-9A-Fa-f]{6}\|[0-9A-Fa-f]{8})$` |
| `<paleta>.gradient.from`  | string hex    | obrigatório                                                                                                                                                                                                                                                                                      |
| `<paleta>.gradient.to`    | string hex    | obrigatório                                                                                                                                                                                                                                                                                      |
| `<paleta>.gradient.angle` | inteiro       | opcional; 0..360 — `"Ângulo deve ser inteiro."`, `"Ângulo mínimo de 0."`, `"Ângulo máximo de 360."`                                                                                                                                                                                              |
| `<paleta>.statuses.<tom>` | objeto        | os 5 tons `error`, `success`, `info`, `warning`, `neutral`; cada um com `color`, `background` (hex) e `backgroundLocked` (boolean)                                                                                                                                                               |

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

**Response 200** — `ThemeSection`, **eco do body recebido**
(`F1 src/modules/portalConfig/portalConfig.service.ts:192`):

| Campo                       | Tipo          | Regra                        |
| --------------------------- | ------------- | ---------------------------- |
| `theme.light`, `theme.dark` | `ThemeTokens` | exatamente o que foi enviado |

O eco tem uma consequência observável: `gradient.angle` omitido **não** aparece na resposta, enquanto
o banco recebe `143` (`F1 src/modules/portalConfig/portalConfig.mappers.ts:128`) e o `GET` passa a
devolver `143` (`F1 src/modules/portalConfig/portalConfig.mappers.ts:159-161`). Um `theme.light`
válido enviado com `angle: 200` volta como `200` e é persistido como `200`.

Forma abreviada (as duas paletas voltam completas, com os 13 tokens + `gradient` + `statuses`):

```json
{
  "theme": {
    "light": { "background": "#f0f4f8", "...": "..." },
    "dark": { "background": "#0b0f1a", "...": "..." }
  }
}
```

**Erros**

| Status | `code` | Mensagem                                                                                        | Condição                                                                                                                                                                 |
| ------ | ------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 400    | —      | `"Campos obrigatórios ausentes: theme.dark.background, theme.dark.surface, …"`                  | paleta ausente: a mensagem lista **todas** as folhas faltantes daquela paleta (issue de tipo sem valor → `missing`, `F1 src/shared/validation/zodErrors.ts:28-31,65-70`) |
| 400    | —      | `"Campos inválidos: theme.light.background — Cor inválida — use #RRGGBB ou #RRGGBBAA."`         | hex fora do formato (`F1 src/modules/portalConfig/portalConfig.schema.ts:18-20`)                                                                                         |
| 400    | —      | `"Campos inválidos: theme.light.gradient.angle — Ângulo máximo de 360."`                        | `angle > 360` (`F1 src/modules/portalConfig/portalConfig.schema.ts:26-31`)                                                                                               |
| 400    | —      | `"Campos inválidos: theme.dark.statuses.info — Cor inválida — use #RRGGBB ou #RRGGBBAA."`       | hex inválido em um tom (`F1 src/modules/portalConfig/portalConfig.schema.ts:35-45`)                                                                                      |
| 400    | —      | `"Campos inválidos: theme.light.gradient — Deve ser um objeto."`                                | `gradient` com tipo errado (tradução de tipo em `F1 src/shared/validation/zodErrors.ts:3-8,33-37`)                                                                       |
| 400    | —      | mensagem agregada do Zod em `payload`                                                           | token/chave desconhecida (`.strict()` em todos os níveis)                                                                                                                |
| 401    | —      | `"Token não fornecido"` / `"Token inválido ou expirado"`                                        | ausência/invalidade de sessão                                                                                                                                            |
| 403    | —      | `"Acesso restrito ao perfil Administrador"` / `"Troca de senha obrigatória antes de continuar"` | perfil ou `must_change_password`                                                                                                                                         |
| 500    | —      | `"Erro interno do servidor"`                                                                    | falha não prevista                                                                                                                                                       |

**Transporte:** JSON; `themeToColumns` grava colunas planas em `system_themes` (`theme_id = 1`) e
`updated_at`, além de `updated_by`/`updated_at` em `system_settings`
(`F1 src/modules/portalConfig/portalConfig.mappers.ts:118-139`;
`F1 src/modules/portalConfig/portalConfig.repository.ts:119-135`).

**Evidência:** `F1 src/modules/portalConfig/portalConfig.router.ts:27`;
`F1 src/modules/portalConfig/portalConfig.controller.ts:87-95`;
`F1 src/modules/portalConfig/portalConfig.service.ts:169-194`.

### 7.7 PATCH /portal-config/assets

**Request** — `multipart/form-data` com uma parte JSON opcional e até 8 partes de arquivo
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

**Response 200** — `AssetsSection`, **relido** do banco (todas as 9 chaves, inclusive as não
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

**Erros**

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
| 415    | —      | `"Campo de arquivo inesperado: \"logo\"."`                                                      | `fieldname` fora das 8 chaves (`F1 src/shared/middleware/uploadAssets.ts:68-73`)                                                                                       |
| 415    | —      | `"Extensão \".gif\" não permitida para logoLightUrl. Aceitas: .png, .svg."`                     | extensão fora da regra da chave (`F1 src/shared/middleware/uploadAssets.ts:75-84`)                                                                                     |
| 415    | —      | `"MIME \"image/gif\" não permitido para logoLightUrl. Aceitos: image/png, image/svg+xml."`      | MIME fora da regra da chave (`F1 src/shared/middleware/uploadAssets.ts:86-94`)                                                                                         |
| 500    | —      | `"Erro interno do servidor"`                                                                    | falha não prevista                                                                                                                                                     |

Notas de comportamento verificáveis:

- A checagem "ao menos uma chave" roda **depois** do multer: multipart vazio chega ao controller e
  recebe 400; multipart com chave de arquivo inválida recebe 415 antes disso.
- Um corpo `application/json` **plano** (chaves `logoLightUrl` etc. no topo, como nos curls de
  `F1 docs/portal-config-endpoints.md`) não define `req.body.assets` e não tem arquivos → 400
  `"Envie ao menos uma chave de asset (JSON ou arquivo)."`. Um corpo JSON com
  `{ "assets": { ... } }` é aceito, porque o controller usa o objeto quando não é string
  (`F1 src/modules/portalConfig/portalConfig.controller.ts:106-126`).
- `logoUsePrimaryColor` não pode ser alterado por binário, apenas pela parte JSON.
- Nenhum endpoint separado de upload existe; o commit do binário e da config é a mesma chamada.

**Transporte:** `multipart/form-data`; binários em `uploads/portal/`; URLs relativas
`/uploads/portal/{variante}-{uuid}.{ext}`, servidas por `express.static` público
(`F1 src/app.ts:24`; `F1 docs/portal-config-endpoints.md` §"Decisões de produto").

**Evidência:** `F1 src/modules/portalConfig/portalConfig.router.ts:28`;
`F1 src/modules/portalConfig/portalConfig.controller.ts:101-174`;
`F1 src/shared/middleware/uploadAssets.ts:11-166`;
`F1 src/modules/portalConfig/portalConfig.repository.ts:137-160`.

### 7.8 PATCH /portal-config/categories

**Request** (`F1 src/modules/portalConfig/portalConfig.schema.ts:102-139`) — lista **atômica**:

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

**Response 200** — `CategoriesSection`, **eco da lista enviada**
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

**Erros**

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

**Transporte:** JSON; o `id` de item novo é gerado pelo cliente (maior id + 1) e aceito pelo backend
(`F1 src/shared/types/portalConfig.ts:104-112`).

**Evidência:** `F1 src/modules/portalConfig/portalConfig.router.ts:29`;
`F1 src/modules/portalConfig/portalConfig.controller.ts:180-188`;
`F1 src/modules/portalConfig/portalConfig.service.ts:232-260`.

### 7.9 PATCH /portal-config/statuses

**Request** (`F1 src/modules/portalConfig/portalConfig.schema.ts:141-221`) — lista **atômica**, sem
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

**Response 200** — `StatusesSection`, **eco da lista enviada**
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

Exemplo abreviado: como a lista é atômica e os sete ids de núcleo são obrigatórios, uma lista real
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

**Erros**

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

**Transporte:** JSON; os `code` de 409 são o único uso de `code` na seção (aditivo no envelope,
`F1 src/shared/middleware/errorHandler.ts:18-21`).

**Evidência:** `F1 src/modules/portalConfig/portalConfig.router.ts:30`;
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

### 7.10 PATCH /portal-config/prioritization-weights

**Request** (`F1 src/modules/portalConfig/portalConfig.schema.ts:228-253`) — **objeto atômico** com
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

**Response 200** — `PrioritizationWeightsSection`, **eco do objeto enviado**
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
Critérios com `active = false` não aparecem no `GET` e não recebem peso por esta rota
(`F1 src/modules/portalConfig/portalConfig.repository.ts:68-74`).

**Erros**

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

**Transporte:** JSON; sem paginação; no máximo 10 chaves.

**Evidência:** `F1 src/modules/portalConfig/portalConfig.router.ts:31`;
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

### 7.12 Confronto com docs/04-API-Conventions.md

| Tema                                 | Situação                                                                                                                                                                                    | Ponteiro                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Base path das 8 rotas                | divergente (legado vigente): `/portal-config` e `/portal-config/*`, sem `/api/v1`                                                                                                           | convenção §1; `F1 src/router.ts:29`                                                          |
| Envelope de erro                     | compatível com o envelope legado de `{ status, statusCode, message }`                                                                                                                       | convenção §2.1; `F1 src/shared/middleware/errorHandler.ts:11-31`                             |
| Erro de validação das 7 seções       | divergente (legado vigente): 400 com mensagem agregada, sem `code` e sem `fields`                                                                                                           | convenção §3 (C2) e #5; `F1 src/shared/validation/zodErrors.ts:89-91`                        |
| `code` em 409 de statuses            | compatível com o uso aditivo de `code` snake_case de domínio                                                                                                                                | convenção §2.3 e §11; `F1 src/modules/portalConfig/portalConfig.service.ts:281-331`          |
| Autorização dos `PATCH`              | divergente (legado vigente): perfil `Administrador` via `requireRole`, não capability key                                                                                                   | convenção §6; ADR-0025; ADR-0006; `F1 src/modules/portalConfig/portalConfig.router.ts:22-23` |
| `id` numérico de status no wire      | divergente (legado vigente): `statuses[].id` inteiro 1..50 é a referência; a convenção pede `key` varchar e nenhum id numérico de status no wire                                            | convenção §0 #18 e §15.1; ADR-0021; `F1 src/shared/types/portalConfig.ts:133-144`            |
| Chaves de JSON                       | compatível: camelCase em inglês, valores de domínio em pt-BR                                                                                                                                | convenção §11; `F1 src/shared/types/portalConfig.ts:1-11`                                    |
| Corpo JSON                           | divergente (legado vigente): `express.json()` sem limite explícito (default do Express), sem `JSON_BODY_MAX_BYTES` de 1 MiB                                                                 | convenção §9; `F1 src/app.ts:26`                                                             |
| `PATCH /assets` — limites            | compatível: 8 arquivos, favicon 1 MiB, logo/avatar 2 MiB, imagem de login 5 MiB, parte JSON de 2 MiB                                                                                        | convenção §9; `F1 src/shared/middleware/uploadAssets.ts:11-67`                               |
| `PATCH /assets` — erros de multipart | divergente (legado vigente): 413/415 sem `code` (`payload_too_large`, `invalid_content_type`) e parte JSON acima de 2 MiB respondendo **400** `"Erro ao processar o upload."` em vez de 413 | convenção §9 e §2.3; `F1 src/shared/middleware/uploadAssets.ts:112-134`                      |
| Códigos de sucesso                   | compatível: `200` em leitura e em todas as atualizações                                                                                                                                     | convenção §0 #20 e §15.4                                                                     |
| Paginação                            | não aplicável: a config é singleton e as listas (`categories`, `statuses`) são atômicas, sem envelope paginado                                                                              | convenção §4.3; `F1 docs/portal-config-api-0_4.md` §6–§7                                     |
| Datas no payload                     | compatível por ausência: a config não expõe timestamps                                                                                                                                      | convenção §10; `F1 src/modules/DTOs/portalConfig/PortalConfigResponse.dto.ts:1-12`           |
| `requestId`                          | divergente (legado vigente): ausente em todos os erros da seção                                                                                                                             | convenção §12 e §0 #15; `F1 src/shared/middleware/errorHandler.ts:11-31`                     |

**Cobertura da seção:** 8 de 8 rotas do inventário.

- #5 `GET /portal-config` (§7.3)
- #6 `PATCH /portal-config/access` (§7.4)
- #7 `PATCH /portal-config/identity` (§7.5)
- #8 `PATCH /portal-config/theme` (§7.6)
- #9 `PATCH /portal-config/assets` (§7.7)
- #10 `PATCH /portal-config/categories` (§7.8)
- #11 `PATCH /portal-config/statuses` (§7.9)
- #12 `PATCH /portal-config/prioritization-weights` (§7.10)
