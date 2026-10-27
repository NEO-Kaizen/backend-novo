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
