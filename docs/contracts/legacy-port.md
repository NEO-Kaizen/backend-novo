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
