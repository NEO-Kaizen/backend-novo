# Convenções transversais da API v1

Fonte única das convenções herdadas por todas as specs de domínio do backend-novo.
Toda spec de domínio **cita** este documento em vez de redefinir estas decisões;
divergência exige emenda aqui e emenda ao ADR correspondente.

**Status possíveis:**

- `decidido` — a convenção está congelada e pode ser herdada.
- `decisão necessária` — a decisão ainda não foi tomada; a linha traz recomendação, dono, destino e gatilho.
- `conflito` — as fontes divergem; a linha traz a recomendação, o dono, o destino e o gatilho da resolução.

**Citação:** arquivo/seção de origem da decisão.
**Dono:** responsável por fechar ou manter a convenção.
**Destino:** onde a pendência será fechada (apenas nas linhas abertas).
**Gatilho:** evento que obriga o fechamento (apenas nas linhas abertas).

## 0. Tabela de convenções

### 0.1 Congeladas

| # | Convenção | Status | Decisão (resumo) | Citação | Dono |
|---|---|---|---|---|---|
| 1 | Base path e versionamento | decidido | `/api/v1` para todos os endpoints; sem prefixo em v2 por ora | `02-Architecture.md` §15; `01-Overview.md` §3 | Backend |
| 2 | Envelope de erro (legado) | decidido | `{ status, statusCode, message }` + `code` e `requestId` aditivos; vigente até a migração | ADR-0005; `02-Architecture.md` §12.5 | Backend + FE |
| 3 | Envelope de erro (alvo) | decidido | `{ error: { code, message, requestId } }`, em cutover coordenado | `CODING_STANDARDS.md` §5; ADR-0005 | Backend + FE |
| 4 | Catálogo de códigos | decidido | snake_case; 400/401/403/404/409/413/415/429/500; regra de `expose` | `02-Architecture.md` §12.2/§12.4/§12.6; este §9 (415); C12 (429); contratos de upload (413) | Backend |
| 5 | Validação (400) | decidido | 400 + `validation_error` + mensagem pt-BR + `fields: [{ path, message }]`; o legado misto (422/objeto no fluxo de requests e 400/mensagem em outros endpoints) é unificado | `CODING_STANDARDS.md` §6; C2 | Backend + FE |
| 6 | Paginação | decidido | `{ data, page, pageSize, total, totalPages }`; default 20, máximo 100, clamp de página; `totalPages: 0` quando vazio; exceções em §4.2 | `02-Architecture.md` §10.6; C3/C4/C5 | Backend |
| 7 | Sessão e cookie | decidido | `session_id`, HttpOnly, SameSite=Lax, Secure em produção, TTL 1 dia; env `COOKIE_NAME` e `JWT_EXPIRES_IN` (implementação pendente) | `02-Architecture.md` §14.1; C6 | Backend + Infra |
| 8 | Autorização | decidido | 26 keys; escopo `none`/`owner` (`own`/`all`); atribuibilidade; 5 perfis; FE por perfil | ADR-0025; `02-Architecture.md` §14.4–§14.6 | Backend + FE |
| 9 | `/auth/me` — DTO | decidido | `id, name, email, role, permissions?, mustChangePassword, avatarUrl (string ou null)` | C7; `02-Architecture.md` §14.4; tipos do FE (`frontend/src/lib/types/auth.ts`) | Backend + FE |
| 10 | Concorrência | decidido | `PATCH` de status com `targetStatusKey` (destino) e `expectedStatusKey` (precondição); 409 com `currentStatusKey` e `currentStatusId?` no corpo do erro; leitura e escrita na mesma transação | C8; `02-Architecture.md` §11.1 | Backend + FE |
| 11 | Idempotência | decidido | Sem `Idempotency-Key` no v1; tabela de operações em §8.2 | C9 | Backend |
| 12 | Content types | decidido | JSON 1 MiB; multipart em §9; 400/413/415 | `02-Architecture.md` §15; este §9 | Backend |
| 13 | Datas e horas | decidido | ISO-8601 UTC para timestamps; `yyyy-mm-dd` para datas puras; tipo único via `dialect.timestampType()` | `03-Data-Model.md` §2.5 | Backend + FE |
| 14 | Idioma | decidido | Chaves EN camelCase; valores pt-BR; `code` em snake_case; exceção legada de auditoria em §11 | C14; `GLOSSARY.md` | Backend + FE |
| 15 | Request-id | decidido | `x-request-id` UUID, echo e log; `correlationId` (HTTP) × `requestId` (solicitação); exceção do envelope legado em §2.2 | C11; `02-Architecture.md` §9.4/§17 | Backend |
| 16 | Rate limiting (verify público) | decidido | 10 req/10 min por IP+protocolo; 429 `rate_limited`; `Retry-After`; storage compartilhado; login em §0.2 | C12; `02-Architecture.md` §14.2; `backend/docs/contract-pendencias_03.md` §7 | Backend + Infra |
| 17 | CORS | decidido | Origens explícitas, `credentials`, `exposedHeaders` (`Content-Disposition`, `x-request-id`), sem wildcard | C13; `02-Architecture.md` §15 | Backend + Infra |
| 18 | Ids e `key` de status | decidido | PKs de entidade em UUID v4 gerado pela app; `status.key` `varchar(50)` UNIQUE e imutável; referências a status usam `key`, e id numérico de status não vai ao wire | ADR-0003; ADR-0021; `02-Architecture.md` §10.4/§22.1 | Backend + FE |
| 19 | Header do solicitante | decidido | Aceitar `X-Requester-Email` e `X-Requester-Identity` por uma release; depois só Email; o header não autentica | C10; ADR-0023 | Backend + FE |
| 20 | Códigos de sucesso | decidido | 200 leitura/atualização; 201 criação; 204 sem corpo | contratos legados; `02-Architecture.md` §15 | Backend |
| 21 | Envelope de auditoria (legado) | decidido | `{ items, total, page, limit }`; item com `audit_id` numérico, `entity_type_label` e `action_type`; mantido até a migração | `02-Architecture.md` §22.1; tipos do FE (`frontend/src/lib/types/audit.ts`) | Backend + FE |
| 22 | Multipart — limites por rota | decidido | requests 10 MiB/5 arquivos; pendências 10 MiB/1; avatar 2 MiB/1; assets 1, 2 ou 5 MiB conforme a chave, 8 arquivos no total | `02-Architecture.md` §13; este §9 (fontes legadas) | Backend |

### 0.2 Decisões abertas

| # | Convenção | Status | Recomendação | Citação | Dono | Destino | Gatilho |
|---|---|---|---|---|---|---|---|
| 23 | Envelope de auditoria (alvo) | conflito | Envelope padrão camelCase; `id` UUID (alternativa: `auditId`); `action` separado de `entityType`; `entity_type_label` a definir | `02-Architecture.md` §22/§22.1; `03-Data-Model.md` §15.1; tipos do FE (`frontend/src/lib/types/audit.ts`) | Backend + FE | Spec de auditoria | Antes de congelar a spec de auditoria |
| 24 | Rate limiting de login | decisão necessária | 10 req/min por IP+e-mail; `rate_limited` + `Retry-After`; registrar janela e chave na spec | C15 (novo); `02-Architecture.md` §14.2 (verify); o legado não limita login | Backend + Infra | Spec de `auth` | Antes de congelar a spec de `auth` |

## 1. Base path e versionamento

- Todos os endpoints públicos vivem sob `/api/v1` (ex.: `POST /api/v1/requests`).
- Sem versionamento por header ou por conteúdo; a versão está no path.
- `v2` não existe; quando existir, convive com `v1` por janela documentada.
- O frontend configura a origem via `PUBLIC_API_URL`; o path do backend é fixo em `/api/v1`.
- Citação: `02-Architecture.md` §15; `01-Overview.md` §3.

## 2. Envelope de erro

### 2.1 Legado (vigente em v1)

```json
{ "status": "error", "statusCode": 404, "message": "Solicitação não encontrada." }
```

- Mantido por compatibilidade com o frontend (`readErrorMessage` lê `body.message || body.error`).
- **Aditivos permitidos (não quebram o cliente):**
  - `code` (snake_case estável) — já previsto em `core/errors/error-codes.ts`.
  - `requestId` (id HTTP de correlação) — aditivo desde C1.
  - `fields` (erros por campo) — em erros de validação (C2).
- O frontend ignora campos desconhecidos; o backend pode adicionar sem coordenação.
- Citação: ADR-0005; `02-Architecture.md` §12.5.

### 2.2 Alvo (pós-migração)

```json
{ "error": { "code": "not_found", "message": "Solicitação não encontrada.", "requestId": "b3f1…-uuid" } }
```

- Migração coordenada (ver ADR-0005 §Gatilho da migração).
- `requestId` aqui é o id HTTP (correlação), aditivo ao envelope legado. Em código de domínio, o id HTTP é `correlationId` e o id de negócio é `requestId` (C11); a exceção de nomenclatura está em §12.

### 2.3 Catálogo de códigos

| Código | Status HTTP | Exposto? | Uso |
|---|---|---|---|
| `validation_error` | 400 | sim | entrada inválida na borda |
| `unauthorized` | 401 | sim | sem sessão / sessão inválida |
| `forbidden` | 403 | sim | capability ausente |
| `not_found` | 404 | sim | recurso inexistente (também para protocolo não encontrado, sem 403) |
| `conflict` | 409 | sim | concorrência / estado incompatível |
| `payload_too_large` | 413 | sim | corpo acima do limite |
| `invalid_content_type` | 415 | sim | `Content-Type` inesperado |
| `rate_limited` | 429 | sim | limite de taxa excedido |
| `internal_error` | 500 | não (genérico) | falha inesperada |
| (domínio) `not_the_assignee`, `invalid_status_transition`, … | conforme mapeamento | conforme `expose` | regras de negócio |

- Códigos estáveis em `snake_case`, registrados em `core/errors/error-codes.ts` (expostos) e `core/errors/internal-codes.ts` (internos, nunca expostos).
- Regra de `expose`: `expose: true` envia a mensagem; `expose: false` (padrão) envia `internal_error` com mensagem genérica. Stack, SQL, nome de tabela, path e versão interna **nunca** saem do servidor.
- Códigos de domínio entram em `STATUS_BY_CODE` (`core/http/error-mapper.ts`) para mapear para status HTTP.
- `413`, `415` e `429` são extensões desta convenção; `02-Architecture.md` §12.2 e `core/errors/error-codes.ts` devem espelhá-los na implementação.

## 3. Forma do erro de validação (C2)

- Status alvo: **400**. O legado é misto: o fluxo de requests usa **422** com `fields` como objeto indexado pelo campo; outros endpoints já usam **400** com mensagem. A v1 unifica em 400 + `validation_error` + `fields` array, em migração coordenada com o FE.
- Corpo 422 do fluxo de requests (vigente até a migração): `{ status: "error", statusCode: 422, message: "…", fields: { "demand.title": "mensagem" } }`.
- Corpo 400 transitório (envelope legado): `{ status: "error", statusCode: 400, message: "…", code: "validation_error", fields: [{ path, message }] }`.
- Corpo 400 no envelope alvo: `{ error: { code: "validation_error", message: "…", requestId, fields: [{ path, message }] } }`.
- `fields` no 400 é um array de `{ path: string (caminho do campo, ex. "demand.title"), message: string (pt-BR) }`; a passagem de 422/objeto (requests) e 400/mensagem (demais) para 400/array é coordenada com o FE (C2).
- `details` foi renomeado para `fields`; o exemplo do `CODING_STANDARDS.md` §6 usa `fields`.
- `Content-Type` inesperado → **415** (ver §9).
- Corpo muito grande → **413**.

## 4. Paginação

### 4.1 Envelope (decidido)

```json
{ "data": [], "page": 1, "pageSize": 20, "total": 0, "totalPages": 0 }
```

- `totalPages = ceil(total / pageSize)`; quando `total = 0`, `totalPages = 0` (não 1).
- `page` é 1-based.
- Sem resultados, a resposta canônica é `page = 1` e `totalPages = 0`.

### 4.2 Limites e clamp

- `pageSize` default **20**, máximo global **100**. Valor acima do máximo → **400** `validation_error`.
- Quando `total > 0`, página solicitada maior que `totalPages` é ajustada para `totalPages`.
- Quando `total = 0`, a página devolvida é **1**, mesmo que `page` tenha sido maior: `page = 1`, `totalPages = 0`.
- Nenhum repositório consulta sem `limit`; toda listagem é paginada.
- Exceções registradas (C5):
  - **Timeline (linha do tempo):** keyset/cursor — usa `cursor`/`nextCursor`, não `page`/`pageSize`. Dono: Backend. Destino: spec de `requests`. Gatilho: antes de congelar a spec de `requests`. Justificativa: ordem temporal estável e leitura agregada.
  - **Auditoria:** o contrato legado usa `{ items, total, page, limit }` (§0.1 #21); o alvo é o envelope padrão camelCase (§0.2 #23). Dono: Backend + FE. Destino: spec de auditoria. Gatilho: antes de congelar a spec de auditoria.

### 4.3 Defaults por endpoint

- Sem exceção registrada neste documento, valem o default 20 e o máximo 100.
- A spec de domínio lista cada endpoint de listagem e, se usar outro default ou máximo, a exceção é registrada **na seção de exceções (§4.2)** e citada pela spec — não redefinida apenas na spec.
- As exceções já registradas são as de §4.2 (timeline e auditoria legada).
- **Migração dos contratos legados:** `GET /requests` usa default 10/máximo 10; `GET /users` usa 10/50; `GET /queue` exige `page` e `pageSize` e só ele faz clamp; a auditoria usa `limit` e não devolve `totalPages`. A v1 unifica em 20/100 e clamp de página; os valores legados não são herdados. A spec de domínio registra apenas desvios desta convenção.

## 5. Sessão e cookie (C6)

- Cookie: nome `session_id` (configurável via `COOKIE_NAME`, default `session_id`).
- Conteúdo: JWT assinado (HS256, segredo `JWT_SECRET` ≥ 32 caracteres).
- Atributos: `HttpOnly`, `SameSite=Lax`, `Secure` em produção, `Path=/`, `credentials: true` no CORS.
- TTL: 1 dia (configurável via `JWT_EXPIRES_IN`, default `1d`).
- Validação por requisição: assinatura + expiração; relê usuário/perfil no banco; compara `password_changed_at` com o do token.
- **Pendência de implementação (não é decisão de API):** o env schema (`platform/config/environment-schema.ts`) ainda não tem `COOKIE_NAME` nem `JWT_EXPIRES_IN`. Dono: Backend + Infra. Destino: o próprio env schema. Gatilho: antes do primeiro deploy com sessão.
- Credenciais nunca em URL ou body.

## 6. Autorização (ADR-0025)

- 5 perfis: `Solicitante`, `Analista`, `Gestor`, `Administrador`, `Admin Root` (capitalizados, vocabulário do `GLOSSARY.md`).
- 26 capability keys `recurso:ação` (Apêndice B do modelo de dados); matriz em `core/authorization/profile-permissions.ts`.
- Escopo: `none` (global) ou `owner` → `own`/`all`.
- Atribuibilidade: flag explícita por perfil (`profiles.is_assignable_*`).
- `Admin Root` recebe todas as permissões; não há auto-registro nem promoção pela API.
- O FE continua por perfil até a release de RBAC; `/auth/me` expõe `permissions` como campo aditivo.
- Autorização verificada no servidor em um lugar só por domínio.

## 7. `/auth/me` — DTO congelado (C7)

```json
{
  "id": "uuid",
  "name": "…",
  "email": "…",
  "role": "Analista",
  "permissions": [{ "key": "queue:read", "scope": "own" }],
  "mustChangePassword": false,
  "avatarUrl": "https://…"
}
```

- `permissions` é **aditivo**: o FE ignora até ter consumidor de RBAC.
- `avatarUrl` mantido (FE e legado usam) e é `string | null`; `name` é `string` (a coluna `users.name` é NOT NULL).
- `role` usa os 5 perfis capitalizados.

## 8. Idempotência e concorrência (C8, C9)

### 8.1 Concorrência otimista

- `PATCH` de status aceita `targetStatusKey` (a `key` do status de destino) e `expectedStatusKey` (a `key` que o cliente acredita ser a atual, para concorrência otimista).
- Se `expectedStatusKey` não bater → **409** `conflict`; o corpo do erro (§2) acrescenta `currentStatusKey` e, opcionalmente, `currentStatusId?`. No envelope alvo os campos ficam em `error.currentStatusKey`/`error.currentStatusId?`; no legado, no topo do corpo. `currentStatusKey` é a referência canônica; `currentStatusId` (UUID) é fallback de migração, nunca id numérico.
- Leitura e escrita na mesma transação (`02-Architecture.md` §11.1).
- **Migração do FE:** hoje o contrato envia `targetStatus: number` (`02-Architecture.md` §22.1); o alvo é `targetStatusKey` (destino) + `expectedStatusKey` (precondição). A troca do FE é na mesma release; o backend novo não devolve nem aceita id numérico de status.

### 8.2 Idempotência (C9)

- Sem header `Idempotency-Key` no v1.
- Classificação de idempotência:

| Operação | Idempotente? | Observação |
|---|---|---|
| `GET`/`HEAD` | sim | leitura sem efeito colateral |
| `PUT` | sim | substitui o recurso |
| `PATCH` de status com `targetStatusKey` + `expectedStatusKey` | condicional | repetir depois do sucesso devolve 409 (o estado já mudou) |
| `PATCH` que não seja de status | não | salvo indicação em contrário na spec; não há deduplicação no v1 |
| `DELETE` (quando existir) | sim | 204/404; o efeito é o mesmo |
| `POST` de criação | não | não há deduplicação no v1 |

- `POST /api/v1/auth/login` cria sessão, emite cookie e grava auditoria: não é idempotente e não é deduplicado.
- `POST /api/v1/auth/logout` limpa o cookie e é seguro repetir (200), mas é `POST` e não entra na deduplicação.
- Cada spec de domínio referencia esta tabela e lista os endpoints que se aplicam; não redefine idempotência.

## 9. Content types

- `application/json` para requests/responses JSON.
- `multipart/form-data` para uploads.
- `Content-Type` inesperado → **415** com `code: "invalid_content_type"`.
- Corpo acima do limite → **413** com `code: "payload_too_large"`.
- Multipart malformado, parte obrigatória ausente, parte de arquivo inesperada ou quantidade de arquivos acima do limite → **400** com `code: "validation_error"`.
- MIME ou extensão de arquivo não permitido → **415** com `code: "invalid_content_type"`; o legado de requests usava 400 para o mesmo caso, e a convenção harmoniza em 415.
- Parte JSON do multipart (`payload`/`assets`) acima de 2 MiB → **413** com `code: "payload_too_large"`.

**Limites por rota:**

| Rota | Arquivos | Limite por arquivo | MIME |
|---|---|---|---|
| `POST /api/v1/requests` (anexos) | 5 | 10 MiB | PDF, DOCX, XLSX, PNG, JPEG |
| `POST /api/v1/requests/:protocol/pending-items/:pendingItemId/attachments` | 1 | 10 MiB | PDF, DOCX, XLSX, PNG, JPEG |
| `PUT /api/v1/users/me` (avatar) | 1 | 2 MiB | JPEG, PNG |
| `PATCH /api/v1/portal-config/assets` | 8 no total | favicon 1 MiB; logo e avatar 2 MiB; imagem de login 5 MiB | conforme a chave (PNG, SVG, ICO, JPEG, WebP) |

- JSON body: 1 MiB (`express.json({ limit: "1mb" })`); quando a rota tiver parte JSON no multipart (`payload` ou `assets`), o limite da parte é 2 MiB.
- **Harmonização registrada:** o legado de requests e de pendências devolvia 400 para arquivo acima do tamanho; a convenção nova devolve **413**. O FE lê `message`, então a mudança de status não quebra a renderização.
- Rotas multipart: requests (anexos), pendências (anexos), avatar do usuário e assets do portal.
- Fontes dos limites: `backend/docs/solicitations-api-requests-0_4.md` §1; `backend/docs/contract-pendencias_03.md` §7; `backend/docs/portal-config-api-0_4.md` §5; `backend/docs/users-api-profile-0_1.md` (avatar); `backend/src/shared/middleware/upload*.ts`.

## 10. Datas e horas

- Timestamps (criação, atualização, eventos): ISO-8601 UTC com `Z` (ex.: `2026-10-25T14:00:00.000Z`).
- Datas puras (ex.: `desiredDeadline`): `yyyy-mm-dd`.
- O banco usa **um único tipo de timestamp**, via `dialect.timestampType()`, e `date` para datas puras; não há tipo fixo por engine.
- `occurred_at` é tempo de negócio, não ordem de commit (ADR-0007).
- Citação: `03-Data-Model.md` §2.5.

## 11. Idioma (C14)

- Chaves de JSON: **inglês, camelCase** (`corporateEmail`, `desiredDeadline`).
- Valores/textos voltados ao usuário: **português do Brasil**.
- Códigos de erro (`code`): `snake_case` inglês, estáveis, não traduzidos.
- Id próprio de um recurso: `id`; referências por id: `<nome>Id` (`requestId`, `entityId`, `assigneeId`); referências por key: `<nome>Key` (`currentStatusKey`).
- **Exceção legada temporária:** o contrato vigente de auditoria usa `audit_id` (snake_case) e `action_type`; o alvo é `id` camelCase e `action` separado. A exceção sai com a migração da auditoria (§0.2 #23).
- Nomes de coluna no banco seguem `snake_case` (convenção de schema, `03-Data-Model.md` §2); a tradução para camelCase ocorre no repositório.

## 12. Request-id (C11)

- Header: `x-request-id` (minúsculo na entrada; echo no response).
- Aceito apenas se for UUID válido; senão o servidor gera um.
- Echo no header de resposta e no corpo do erro (campo `requestId`, aditivo ao envelope legado).
- Log estruturado inclui o id em todo log de requisição.
- Naming interno: `correlationId` = id HTTP (`req.id`); `requestId` = id da solicitação de negócio. `AttemptRecord.correlationId` é sempre o `req.id`.
- **Exceção do envelope legado:** no corpo de erro, `requestId` carrega o id HTTP por compatibilidade (§2.2); fora do envelope, `requestId` é sempre o id de negócio.
- Citação: `02-Architecture.md` §9.4, §17.

## 13. Rate limiting (C12)

| Rota | Janela | Limite | Chave |
|---|---|---|---|
| `POST /api/v1/requests/:protocol/public/verify` | 10 min | 10 | IP + protocolo |
| `POST /api/v1/auth/login` | — | — | ver §0.2 #24 |

- Verificação pública: **429** com `code: "rate_limited"` e header `Retry-After` (segundos).
- Storage compartilhado entre instâncias (Redis quando disponível; em dev, in-memory).
- Headers opcionais: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
- O legado do verify usa 10 tentativas/10 min por IP+protocolo, em memória e sem headers; a convenção nova mantém a janela e acrescenta o código, os headers e o storage compartilhado.
- `GET /api/v1/requests/:protocol/tracking` não tem limite próprio: o gate é o `verify` (`backend/docs/contract-pendencias_03.md` §7); não é rota anônima independente.
- Novas rotas públicas só entram com uma linha nesta tabela; não há limite implícito.

## 14. CORS (C13)

- Origens explícitas (lista configurável), nunca wildcard em produção.
- `credentials: true`.
- `exposedHeaders`: `Content-Disposition` (obrigatório, para downloads) e `x-request-id`.
- Métodos e headers permitidos registrados no bootstrap (`app.ts`).

## 15. Convenções correlatas

### 15.1 Ids e `key` de status

- As PKs de entidade são UUID v4 gerado pela aplicação (`crypto.randomUUID()` via `IdGenerator`); as exceções de chave natural ou composta estão em `03-Data-Model.md` §2.3.
- `status` tem `key` estável (`varchar(50)`, UNIQUE, imutável, `ck_statuses_key_length` ≤ 50), usada pelo cliente para referenciar o status; o `id` (UUID) identifica a linha e não substitui a `key` no wire.
- A `key` é a identidade do status e pertence ao código; o `name` é o rótulo que o Administrador edita.
- O FE migra de id numérico para `key`; referências a status no wire não usam id numérico.
- Citação: ADR-0003 (UUID); ADR-0021 (key); `02-Architecture.md` §10.4/§22.1; `03-Data-Model.md` §2.3/§17.4.

### 15.2 Envelope de auditoria

**Legado (vigente até a migração):**

- `GET /audit-history` → `{ items, total, page, limit }`; sem `totalPages` (o FE deriva `Math.ceil(total / limit)`).
- Item: `audit_id` (number, bigint), `entity_type`, `entity_type_label`, `action_type`, `actor { kind, userId, displayName }`, `occurred_at`.
- Detalhe acrescenta `entity_id`, `previous_value`, `new_value`, `note`, `change_origin`, `last_technical_message` e `ip_address`.
- O FE em `frontend/src/lib/types/audit.ts` consome o subconjunto de lista e de detalhe que usa; `GET /audit-history/:id` recebe id numérico. **Não renomear até a migração da auditoria.**

**Alvo (§0.2 #23, spec de auditoria):**

- Envelope padrão de paginação, camelCase.
- `id` UUID (fallback: `auditId` se a spec preferir manter o nome do campo legado).
- `action` separado de `entityType`; `entity_type_label` a definir (servidor ou catálogo do FE).
- Migração: `audit_id` number → `id` UUID; `action_type` composto → `entityType` + `action`; `entity_id` string → UUID; atualizar os tipos do FE e o parâmetro de `/audit-history/:id`.
- O formato completo continua não acordado (`02-Architecture.md` §22); a spec de auditoria fecha a §0.2 #23.

### 15.3 Header do solicitante (C10)

- Aceitar `X-Requester-Email` e `X-Requester-Identity` por uma release (janela de compatibilidade).
- Depois, apenas `X-Requester-Email`.
- O header é chave de busca, não autenticação (ADR-0023).

### 15.4 Códigos de sucesso

- 200 leitura/atualização; 201 criação; 204 sem corpo.

## 16. Checklist de revisão de spec de domínio

Uma spec de domínio só vira `frozen` se todas as caixas abaixo estiverem marcadas:

- [ ] Cita `docs/04-API-Conventions.md` em vez de redefinir envelope, paginação, sessão, ids, datas, request-id, CORS ou rate limit.
- [ ] Endpoints listados com método, path sob `/api/v1`, auth e capability.
- [ ] Paginação: default/máximo/exceção por endpoint registrados (ou "não paginado" justificado); exceções apontam para §4.2/§4.3.
- [ ] Erros: códigos do catálogo + códigos de domínio registrados em `error-codes.ts` (a implementar).
- [ ] Validação: campos, limites e mensagens pt-BR.
- [ ] Multipart: rota, quantidade, tamanho, MIME e 400/413/415 coerentes com §9.
- [ ] Concorrência: operações com `targetStatusKey` e `expectedStatusKey` listadas e corpo do 409.
- [ ] Idempotência: endpoints classificados pela tabela de §8.2.
- [ ] Datas: tipo (timestamp vs data pura) por campo, com o tipo único do dialeto.
- [ ] `/auth/me` impacto (se aplicável).
- [ ] Auditoria: legado `audit_id` não renomeado; alvo da §0.2 #23 citado.
- [ ] Rate limit: toda rota pública nova tem linha em §13; login segue a §0.2 #24.
- [ ] Nenhuma linha `decisão necessária` ou `conflito` sem dono, recomendação, citação, destino e gatilho.
- [ ] Status, citação e dono em toda linha de convenção herdada.

## Apêndice A — Decisões C1–C15 (rastreio)

| ID | Questão | Linha em §0 | Status |
|---|---|---|---|
| C1 | `requestId` aditivo no envelope legado? | #2 | decidido |
| C2 | Validação `400` × `422`; `fields` × `details` | #5 | decidido |
| C3 | `pageSize` default/máximo por rota | #6 | decidido |
| C4 | Página > `totalPages` | #6 | decidido |
| C5 | Exceções de paginação (auditoria, timeline) | #6 | decidido |
| C6 | Cookie: nome/TTL/atributos e env vars | #7 | decidido |
| C7 | `avatarUrl` no `SessionUser` | #9 | decidido |
| C8 | Status de destino e precondição no wire (`targetStatusKey` + `expectedStatusKey`) | #10 | decidido |
| C9 | `Idempotency-Key` no v1 | #11 | decidido |
| C10 | Header do solicitante | #19 | decidido |
| C11 | `requestId` = id HTTP ou da solicitação | #15 | decidido |
| C12 | 429: código e headers (verify) | #16 | decidido |
| C13 | CORS `exposedHeaders` | #17 | decidido |
| C14 | Chaves de auditoria (legado) | #14, #21 | decidido |
| C15 | Rate limit de login (novo) | #24 | decisão necessária |

> C14: o alvo da auditoria está aberto na §0.2 #23; a linha acima cobre a regra de idioma e o contrato legado.
