# Convenções transversais da API v1

Fonte única das convenções herdadas por todas as specs de domínio do backend-novo.
Toda spec de domínio **cita** este documento em vez de redefinir estas decisões;
divergência exige emenda aqui e emenda ao ADR correspondente.

**Status possíveis:** `decidido` · `decisão necessária` · `conflito`.
**Citação:** arquivo/seção de origem da decisão.
**Dono:** responsável por fechar ou manter a convenção.

## 0. Tabela de convenções (congelada)

| # | Convenção | Status | Decisão (resumo) | Citação | Dono |
|---|---|---|---|---|---|
| 1 | Base path e versionamento | decidido | `/api/v1` para todos os endpoints; sem prefixo em v2 por ora | `02-Architecture.md` §15; `01-Overview.md` §3 | Backend |
| 2 | Envelope de erro (legado) | decidido (transitório) | `{ status, statusCode, message }` + `code` (e `requestId`) aditivos | ADR-0005; `02-Architecture.md` §12.5 | Backend + FE |
| 3 | Envelope de erro (alvo) | decidido | `{ error: { code, message, requestId } }` | `CODING_STANDARDS.md` §5; ADR-0005 | Backend + FE |
| 4 | Catálogo de códigos | decidido | snake_case, 400/401/403/404/409/413/415/429/500; regra de `expose` | `02-Architecture.md` §12.2/§12.4/§12.6 | Backend |
| 5 | Validação (400) | decidido | 400 + `validation_error` + mensagem pt-BR + `fields` aditivo | C2; `CODING_STANDARDS.md` §6 | Backend + FE |
| 6 | Paginação | decidido (exceções registradas) | `{ data, page, pageSize, total, totalPages }`; default 20, máx 100, clamp; `totalPages: 0` quando vazio | `02-Architecture.md` §10.6; C3/C4/C5 | Backend |
| 7 | Sessão/cookie | decidido (lacuna no env) | `session_id`, HttpOnly, SameSite=Lax, Secure em prod, TTL 1d; env `COOKIE_NAME`/`JWT_EXPIRES_IN` | `02-Architecture.md` §14.1; C6 | Backend + Infra |
| 8 | Autorização | decidido | 26 keys, escopo `none`/`owner` (`own`/`all`), atribuibilidade, 5 perfis; FE por perfil | ADR-0025; `02-Architecture.md` §14.4–§14.6 | Backend + FE |
| 9 | `/auth/me` DTO | decidido | `id, name?, email, role, permissions?, mustChangePassword, avatarUrl?` | C7; `02-Architecture.md` §14.4 | Backend + FE |
| 10 | Concorrência | decidido | `expectedStatusKey` → 409; tabela de operações idempotentes | C8; `02-Architecture.md` §11.1 | Backend + FE |
| 11 | Idempotência | decidido | Sem `Idempotency-Key` no v1; endpoints idempotentes documentados | C9 | Backend |
| 12 | Content types | decidido | JSON × multipart; limites; 400/413/415 | C2; `02-Architecture.md` §13 | Backend |
| 13 | Datas e horas | decidido | ISO-8601 UTC para timestamps; `yyyy-mm-dd` para datas puras | `03-Data-Model.md` §2.9 | Backend + FE |
| 14 | Idioma | decidido (exceção eliminada) | Chaves EN camelCase; valores pt-BR; auditoria camelCase | C14; `GLOSSARY.md` | Backend + FE |
| 15 | Request-id | decidido | `x-request-id` UUID, echo e log; `correlationId` (HTTP) × `requestId` (solicitação) | C11; `02-Architecture.md` §9.4/§17 | Backend |
| 16 | Rate limiting | decidido (parcial→completo) | rotas, janela, chave, 429, storage compartilhado, headers | C12 | Backend + Infra |
| 17 | CORS | decidido (parcial→completo) | origens explícitas, credentials, `exposedHeaders`, sem wildcard | C13 | Backend + Infra |
| 18 | Ids e `key` de status | decidido | UUID v4 gerado pela app; status referenciado por `key` estável | ADR-0003; `02-Architecture.md` §10.4/§22.1 | Backend + FE |
| 19 | Envelope de auditoria | decidido (exceção eliminada) | `{ data, page, pageSize, total, totalPages }` camelCase | C5/C14 | Backend + FE |
| 20 | Header do solicitante | decidido (janela) | aceitar `X-Requester-Email` e `X-Requester-Identity` por uma release; depois só Email | C10; ADR-0023 | Backend + FE |
| 21 | DTO de sessão | decidido | `role`, `permissions` aditivo, `mustChangePassword`, `avatarUrl` | C7; `02-Architecture.md` §14.4 | Backend + FE |
| 22 | Códigos de sucesso | decidido | 200 (leitura/atualização), 201 (criação), 204 (sem corpo) | `02-Architecture.md` §15 | Backend |

## 1. Base path e versionamento

- Todos os endpoints públicos vivem sob `/api/v1` (ex.: `POST /api/v1/requests`).
- Sem versionamento por header ou por conteúdo; a versão está no path.
- `v2` não existe; quando existir, convive com `v1` por janela documentada.
- Origem (`PUBLIC_API_URL`) é configurável por ambiente; o path permanece `/api/v1`.
- Citação: `02-Architecture.md` §15; `01-Overview.md` §3.

## 2. Envelope de erro

### 2.1 Legado (vigente em v1)

```json
{ "status": "error", "statusCode": 404, "message": "Solicitação não encontrada." }
```

- Mantido por compatibilidade com o frontend (`readErrorMessage` lê `body.message || body.error`).
- **Aditivos permitidos (não quebram o cliente):**
  - `code` (snake_case estável) — já previsto em `core/errors/error-codes.ts`.
  - `requestId` (HTTP correlation id) — se C1 = sim (decidido: sim).
  - `fields` (erros por campo) — em erros de validação (C2).
- O frontend ignora campos desconhecidos; o backend pode adicionar sem coordenação.
- Citação: ADR-0005; `02-Architecture.md` §12.5.

### 2.2 Alvo (pós-migração)

```json
{ "error": { "code": "not_found", "message": "Solicitação não encontrada.", "requestId": "b3f1…-uuid" } }
```

- Migração coordenada (ver ADR-0005 §Gatilho da migração).
- `requestId` aqui = id HTTP (correlation), mantido por compat; em código de domínio o id HTTP é `correlationId` e o id de negócio é `requestId` (C11).

### 2.3 Catálogo de códigos

| Código | Status HTTP | Exposto? | Uso |
|---|---|---|---|
| `validation_error` | 400 | sim | entrada inválida na borda |
| `unauthorized` | 401 | sim | sem sessão / sessão inválida |
| `forbidden` | 403 | sim | capability ausente |
| `not_found` | 404 | sim | recurso inexistente (também para protocolo não encontrado, sem 403) |
| `conflict` | 409 | sim | concorrência / estado incompatível |
| `rate_limited` | 429 | sim | limite de taxa excedido |
| `invalid_content_type` | 415 | sim | `Content-Type` inesperado |
| `payload_too_large` | 413 | sim | corpo acima do limite |
| `internal_error` | 500 | não (genérico) | falha inesperada |
| (domínio) `not_the_assignee`, `invalid_status_transition`, … | conforme mapeamento | conforme `expose` | regras de negócio |

- Códigos estáveis em `snake_case`, registrados em `core/errors/error-codes.ts` (expostos) e `core/errors/internal-codes.ts` (internos, nunca expostos).
- Regra de `expose`: `expose: true` envia a mensagem; `expose: false` (padrão) envia `internal_error` com mensagem genérica. Stack, SQL, nome de tabela, path e versão interna **nunca** saem do servidor.
- Códigos de domínio entram em `STATUS_BY_CODE` (`core/http/error-mapper.ts`) para mapear para status HTTP.

## 3. Forma do erro de validação (C2)

- Status: **400** (o legado também usava 422 `{ message, fields }`; aposentado).
- Corpo (legado): `{ status: "error", statusCode: 400, message: "…", code: "validation_error", fields: [{ path, message }] }`.
- Corpo (alvo): `{ error: { code: "validation_error", message: "…", requestId, fields: [{ path, message }] } }`.
- `fields` é aditivo: array de `{ path: string (caminho do campo, ex. "demand.title"), message: string (pt-BR) }`.
- `details` (citado em `CODING_STANDARDS.md` §6) é renomeado para `fields` para unificar com o legado; o exemplo do `CODING_STANDARDS` deve ser atualizado.
- `Content-Type` inesperado → **415** (ver §9).
- Corpo muito grande → **413**.

## 4. Paginação

### 4.1 Envelope (decidido)

```json
{ "data": [], "page": 1, "pageSize": 20, "total": 0, "totalPages": 0 }
```

- `totalPages = ceil(total / pageSize)`; quando `total = 0`, `totalPages = 0` (não 1).
- `page` é 1-based.

### 4.2 Limites e clamp

- `pageSize` default **20**, máximo global **100**. O servidor ignora/limita valor enviado acima do máximo (não erro).
- Página solicitada maior que `totalPages` → **clamp** para `totalPages` (ou 1 se vazio), como a fila faz.
- Nenhum repositório consulta sem `limit`; toda listagem é paginada.
- Exceções registradas (C5):
  - **Timeline (linha do tempo):** keyset/cursor — usa `cursor`/`nextCursor`, não `page`/`pageSize`. Registrado com dono (Backend) e justificativa (ordem temporal estável, leitura agregada).
  - **Auditoria:** migrada para o envelope padrão camelCase (ver §15.2); `items`/`limit` do legado aposentados.

### 4.3 Defaults por endpoint (a registrar nas specs de domínio)

Cada spec de domínio lista, para cada endpoint de listagem: default, máximo e exceção. O máximo global é 100 salvo exceção registrada aqui.

## 5. Sessão e cookie (C6)

- Cookie: nome `session_id` (configurável via `COOKIE_NAME`, default `session_id`).
- Conteúdo: JWT assinado (HS256, segredo `JWT_SECRET` ≥ 32 chars).
- Atributos: `HttpOnly`, `SameSite=Lax`, `Secure` em produção, `Path=/`, `credentials: true` no CORS.
- TTL: 1 dia (configurável via `JWT_EXPIRES_IN`, default `1d`).
- Validação por requisição: assinatura + expiração; relê usuário/perfil no banco; compara `password_changed_at` com o do token.
- Env schema (`platform/config/environment-schema.ts`) deve incluir `COOKIE_NAME` e `JWT_EXPIRES_IN` (lacuna atual).
- Credenciais nunca em URL ou body.

## 6. Autorização (C7, ADR-0025)

- 5 perfis: `Solicitante`, `Analista`, `Gestor`, `Administrador`, `Admin Root` (capitalizados, vocabulário do `GLOSSARY.md`).
- 26 capability keys `recurso:ação` (Apêndice B do modelo de dados); matriz em `core/authorization/profile-permissions.ts`.
- Escopo: `none` (global) ou `owner` → `own`/`all`.
- Atribuibilidade: flag explícita por perfil (`profiles.is_assignable_*`).
- `Admin Root` recebe todas as permissões; não há auto-registro nem promoção pela API.
- FE continua por perfil até a release de RBAC; `/auth/me` expõe `permissions` como campo aditivo.
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

- `permissions` é **aditivo**: FE ignora até ter consumidor de RBAC.
- `avatarUrl` mantido (FE e legado usam).
- `role` usa os 5 perfis capitalizados.

## 8. Idempotência e concorrência (C8, C9)

### 8.1 Concorrência otimista

- PATCH de status aceita `expectedStatusKey` (key do status que o cliente acredita ser o atual).
- Se não bater → **409** `conflict`, corpo: `{ currentStatusKey, currentStatusId? }`.
- Leitura e escrita na mesma transação (`02-Architecture.md` §11.1).

### 8.2 Idempotência

- Sem header `Idempotency-Key` no v1.
- Endpoints idempotentes documentados por spec de domínio (ex.: login, logout, leituras). Requisições não-idempotentes (POST de criação) não são deduplicadas pelo servidor.
- Operações idempotentes conhecidas: a registrar nas specs (ex.: `POST /api/v1/auth/login` com mesma credencial, `PUT` de configuração).

## 9. Content types (C2)

- `application/json` para requests/responses JSON.
- `multipart/form-data` para uploads (avatar, assets, anexos de solicitação e de pendência).
- `Content-Type` inesperado → **415** com `code: "invalid_content_type"`.
- Corpo acima do limite → **413** com `code: "payload_too_large"`.
- Limites: JSON body 1 MiB (`express.json({ limit: "1mb" })`); arquivos: a definir por rota (ex.: 5 MiB por arquivo, 10 arquivos por request) — registrar nas specs de domínio.
- Rotas multipart: `POST /api/v1/requests` (anexos), `PATCH /api/v1/portal-config/assets`, `POST .../pending-items/:id/attachments`, avatar do usuário.

## 10. Datas e horas

- Timestamps (criação, atualização, eventos): ISO-8601 UTC com `Z` (ex.: `2026-10-25T14:00:00.000Z`).
- Datas puras (prazo desejado, data de nascimento): `yyyy-mm-dd`.
- O banco armazena em `timestamptz`/`date` conforme o campo; a serialização na borda é sempre ISO.
- Citação: `03-Data-Model.md` §2.9.

## 11. Idioma (C14)

- Chaves de JSON: **inglês, camelCase** (`corporateEmail`, `desiredDeadline`).
- Valores/textos voltados ao usuário: **português do Brasil**.
- Códigos de erro (`code`): `snake_case` inglês, estáveis, não traduzidos.
- Auditoria: chaves em camelCase (exceção snake_case eliminada); migração coordenada (C14).
- Exceção registrada: nomes de coluna no banco seguem `snake_case` (convenção de schema, `03-Data-Model.md` §2); a tradução para camelCase ocorre no repositório.

## 12. Request-id (C11)

- Header: `x-request-id` (minúsculo na entrada; echo no response).
- Aceito apenas se for UUID válido; senão o servidor gera um.
- Echo no header de resposta e no corpo do erro (campo `requestId`, por compat).
- Log estruturado inclui o id em todo log de requisição.
- Naming interno: `correlationId` = id HTTP (`req.id`); `requestId` = id da solicitação de negócio. `AttemptRecord.correlationId` é sempre o `req.id`.
- Citação: `02-Architecture.md` §9.4, §17.

## 13. Rate limiting (C12)

- Rotas limitadas: endpoint público de verificação por protocolo (`POST .../public/verify`), login, e demais rotas públicas registradas nas specs.
- Janela e chave: a definir por rota (ex.: 5 req/min por IP+protocolo no verify); registrar nas specs.
- Resposta: **429** com `code: "rate_limited"`, header `Retry-After` (segundos).
- Storage: compartilhado entre instâncias (Redis quando disponível; em dev, in-memory).
- Headers opcionais: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

## 14. CORS (C13)

- Origens explícitas (lista configurável), nunca wildcard em produção.
- `credentials: true`.
- `exposedHeaders`: `Content-Disposition` (obrigatório, para downloads) e `x-request-id`.
- Métodos e headers permitidos registrados no bootstrap (`app.ts`).

## 15. Convenções correlatas

### 15.1 Ids e `key` de status

- Toda PK é UUID v4 gerado pela aplicação (`crypto.randomUUID()` via `IdGenerator`).
- `status` tem `key` estável (`varchar(40)`, UNIQUE, imutável) usado pelo cliente; o `id` (UUID) é interno.
- FE migra de id numérico para `key`; backend não devolve id numérico.
- Citação: ADR-0003; `02-Architecture.md` §10.4/§22.1.

### 15.2 Envelope de auditoria

- Mesmo envelope de paginação, camelCase (exceção snake_case eliminada).
- `action` separado da entidade; `audit_id` UUID.
- Citação: `02-Architecture.md` §9; ADR-0020.

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
- [ ] Paginação: default/máximo/exceção por endpoint registrados (ou "não paginado" justificado).
- [ ] Erros: códigos do catálogo + códigos de domínio registrados em `error-codes.ts` (a implementar).
- [ ] Validação: campos, limites e mensagens pt-BR.
- [ ] Multipart: rotas, limites, 400/413/415.
- [ ] Concorrência: operações com `expectedStatusKey` listadas.
- [ ] Idempotência: endpoints idempotentes listados.
- [ ] Datas: tipo (timestamp vs data pura) por campo.
- [ ] `/auth/me` impacto (se aplicável).
- [ ] Sem linha "decisão necessária" sem dono, recomendação e destino.
- [ ] Status, citação e dono em toda linha de convenção herdada.

## Apêndice A — Decisões C1–C14 (rastreio)

| ID | Questão | Decisão aplicada | Status |
|---|---|---|---|
| C1 | `requestId` aditivo no envelope legado? | Sim, aditivo (HTTP correlation) | decidido |
| C2 | Validação `400` × `422`; `fields` × `details` | `400` + mensagem pt-BR + `fields` aditivo | decidido |
| C3 | `pageSize` default/máximo por rota | default 20, máx global 100, exceções registradas | decidido |
| C4 | Página > `totalPages` | Clamp (como a fila) | decidido |
| C5 | Exceções de paginação (auditoria, timeline) | Registradas com dono e prazo | decidido |
| C6 | Cookie: nome/TTL/atributos e env vars | `session_id`/1d/Lax; acrescentar `COOKIE_NAME`/`JWT_EXPIRES_IN` | decidido |
| C7 | `avatarUrl` no `SessionUser` | Manter (FE e legado usam) | decidido |
| C8 | `expectedStatusId` no wire | Sim, com `statusKey` (`expectedStatusKey`) | decidido |
| C9 | `Idempotency-Key` no v1 | Não; documentar endpoints idempotentes | decidido |
| C10 | Header do solicitante | Aceitar os dois por uma release; depois `X-Requester-Email` | decidido |
| C11 | `requestId` = id HTTP ou da solicitação | `correlationId` para HTTP; `requestId` para solicitação | decidido |
| C12 | 429: código e headers | `rate_limited`, `Retry-After`, storage compartilhado | decidido |
| C13 | CORS `exposedHeaders` | `Content-Disposition` obrigatório (+ `x-request-id`) | decidido |
| C14 | Chaves de auditoria | camelCase, salvo decisão contrária (eliminada a exceção) | decidido |
