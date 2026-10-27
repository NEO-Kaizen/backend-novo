# Contrato HTTP (OpenAPI)

Política normativa do contrato HTTP versionado. Fonte única do padrão OpenAPI do backend-novo. Toda spec de domínio cita este documento em vez de redefinir estas decisões; divergência exige emenda aqui e emenda ao ADR-0026.

Decisões transversais (base path, envelope de erro, paginação, sessão, autorização, concorrência, content types, datas, idioma, request-id, rate limit, CORS) estão em `docs/04-API-Conventions.md` e são herdadas, não redefinidas aqui.

## 1. Fonte de verdade

Hierarquia:

1. **Schemas Zod + metadados de rota** (código) — fonte única.
2. **OpenAPI 3.1.0** (`openapi/openapi.json`) — artefato versionado; gerado e publicado quando o pipeline existir.

Documentos normativos (`04-API-Conventions.md`, `02-Architecture.md`, `03-Data-Model.md`) complementam regras que o OpenAPI não expressa, mas não são contrato de máquina.

Não há contratos Markdown por domínio no backend-novo: este documento é a política normativa e as specs de domínio são narrativa, não contrato de máquina. DTOs não são duplicados fora dos schemas Zod.

## 2. Versão e gerador

- OpenAPI **3.1.0** — versão estável adotada. O `zod-openapi` 6.x também lista `3.2.0` nas typings, mas o suporte documentado cobre 3.1.x; a adoção de 3.2 fica para o spike.
- Gerador: **`zod-openapi` 6.x**, sem monkey patch, usando `.meta()` nativo do Zod.
- Proibido: `tsoa`, decorators, geração baseada em AST do TypeScript.
- A adoção do gerador exige o spike de compatibilidade previsto no ADR-0026: `zod-openapi`, TypeScript 7 como alvo (o `package.json` fixa `~6.0.3`), `nodenext`, Node 24, `z.iso.datetime()`/`z.iso.date()` e `z.file()`.

## 3. Estrutura alvo

```
src/
├── docs/
│   ├── openapi.ts          # compõe createDocument a partir dos *.openapi.ts
│   ├── components.ts       # ErrorEnvelope, PaginatedResponse, securitySchemes
│   └── generate-openapi.ts  # escreve openapi/openapi.json
├── domains/
│   └── <domínio>/
│       ├── <domínio>.schema.ts   # schemas Zod (request/response)
│       └── <domínio>.openapi.ts  # metadados de rota (sem import de platform)
└── platform/
    └── http/
        └── docs-router.ts  # serve /api/v1/openapi.json e /api/v1/docs
openapi/
└── openapi.json            # artefato commitado
docs/openapi/
└── README.md               # comandos e regra do artefato
.spectral.yaml              # lint
```

Regra de dependências (`docs/02-Architecture.md` §19): `domains` não importa `platform`; `*.openapi.ts` não importa `platform`. A composição dos metadados de rota acontece em `src/docs/openapi.ts`.

## 4. Metadados de rota

- `operationId`: `<domínio>.<ação>` em camelCase (ex.: `requests.create`, `auth.login`).
- `tags`: um por domínio, em inglês (ex.: `auth`, `requests`).
- `summary` e `description` em português.
- Toda operação tem schema de request (quando aplicável) e schema de response explícito.
- Toda rota Express 5 tem operação documentada e vice-versa (cobertura bidirecional).
- Exemplos obrigatórios em schemas e responses; **sem PII** (sem e-mail, nome, telefone ou dado real de pessoa).

## 5. Segurança

- `securitySchemes.sessionCookie`: `{ type: "apiKey", in: "cookie", name: "session_id" }`. O nome é o default de `COOKIE_NAME` (`docs/04-API-Conventions.md` §5).
- Segurança global: `security: [{ sessionCookie: [] }]`.
- `servers[0].url` é o base path relativo (`/api/v1`); host e esquema vêm do ambiente, nunca do artefato.
- Operações públicas declaram `security: []` explicitamente (login, verificação pública por protocolo, etc.).
- Nunca usar `bearerAuth`; a sessão é cookie HttpOnly.

## 6. Envelope de erro no OpenAPI

O contrato vigente é o legado (ADR-0005). O OpenAPI documenta o vigente, não o alvo.

```json
{ "status": "error", "statusCode": 404, "message": "Solicitação não encontrada." }
```

Aditivos permitidos (não quebram o cliente): `code` (snake_case estável), `requestId` (correlation HTTP), `fields` (erros por campo, em validação). No artefato (`openapi/openapi.json`), o componente `ErrorEnvelope` é a definição; quando o gerador existir, `src/docs/components.ts` será a única definição e todas as respostas de erro a referenciarão. O campo `code`, quando presente, referencia o componente `ErrorCode`, que será gerado de `core/errors/error-codes.ts`; no artefato, a lista é a do `docs/04-API-Conventions.md` §2.3, mais códigos de domínio conhecidos. `core/errors/internal-codes.ts` nunca é exposto. No 409 de concorrência, o corpo estende `ErrorEnvelope` com `currentStatusKey` e, opcionalmente, `currentStatusId` (`docs/04-API-Conventions.md` §8.1). O `code` é opcional no envelope legado e clientes devem ter fallback para valores desconhecidos.

## 7. Paginação no OpenAPI

```json
{ "data": [], "page": 1, "pageSize": 20, "total": 0, "totalPages": 0 }
```

No artefato (`openapi/openapi.json`), o componente `PaginatedResponse` é a definição; quando o gerador existir, `src/docs/components.ts` será a única definição. No request, o parâmetro `PageSize` tem default **20** e máximo **100**; acima do máximo é `400` `validation_error` (`docs/04-API-Conventions.md` §4.2). No response, `pageSize` é o tamanho efetivo e não declara default; `page` é a única clampada. Exceções registradas em `docs/04-API-Conventions.md` (timeline por cursor; auditoria padrão) são documentadas na spec de domínio correspondente.

## 8. Multipart

- Content types, limites e erros seguem `docs/04-API-Conventions.md` §9.
- `POST /api/v1/requests`: `payload` + `attachments`, documentado com `z.file()` (renderiza `format: binary`); os limites e a MIME allowlist vêm da §9.

## 9. Header do solicitante

- A janela de compatibilidade, a busca e o `404` estão em `docs/04-API-Conventions.md` §15.3 e no ADR-0023.
- No OpenAPI, documentar `X-Requester-Email` e `X-Requester-Identity` (marcado `deprecated`).

## 10. Datas e horas

- Timestamps usam `z.iso.datetime()`; datas puras usam `z.iso.date()`.
- Serialização e formato seguem `docs/04-API-Conventions.md` §10.

## 11. Versionamento e depreciação

- Base path, `v2` e idempotência seguem `docs/04-API-Conventions.md` §1 e §8.
- Breaking change: exige label `breaking-change`, plano de `/api/v2` e aprovação; o gate `oasdiff breaking` entra quando o workflow existir.
- Depreciação: `deprecated: true` no OpenAPI, com prazo documentado; remoção só em `v2`.
- `info.version` versiona o contrato publicado, não o `package.json`; é `0.0.0` até a primeira versão publicada e depois usa `1.x`, alinhado a `/api/v1`.

## 12. Comandos

```bash
npm run docs:generate   # regenera openapi/openapi.json a partir dos schemas Zod
npm run docs:lint       # spectral lint openapi/openapi.json
npm run docs:check      # regenera e falha se o artefato estiver desatualizado
```

- Os scripts acima serão adicionados com a automação do contrato. Enquanto eles não existirem, a validação manual do artefato é `npx @stoplight/spectral-cli lint openapi/openapi.json`.
- O artefato `openapi/openapi.json` é **commitado**. Enquanto o gerador não existir, ele é mantido manualmente; depois, edição manual é proibida e toda mudança passa por `docs:generate`.
- Em CI, quando o gate existir: `docs:generate` → `docs:lint` → `docs:check`, mais `oasdiff breaking` contra a base.

## 13. Exposição por ambiente

- Documentação e UI desabilitadas em produção por padrão.
- Habilitação em produção apenas com opt-in explícito (`DOCS_ENABLED=true`).
- Em desenvolvimento e teste: habilitadas quando o router existir.

## 14. Lint do spec

- `spectral lint openapi/openapi.json` usa `spectral:oas`; `.spectral.yaml` eleva `operation-operationId` e `operation-tags` a erro.
- Não há regras customizadas. As regras de `description`/`example` em schema e a verificação de PII serão adicionadas como regras customizadas.
- Exemplos sem PII serão verificados por script auxiliar quando o gerador existir.

## 15. Checklist de revisão (OpenAPI)

- [ ] Rota documentada no OpenAPI com request/response schemas explícitos.
- [ ] `operationId` e `tags` definidos.
- [ ] Exemplos presentes e sem PII.
- [ ] Timestamps usam `z.iso.datetime()`; datas puras usam `z.iso.date()`.
- [ ] Operações públicas declaram `security: []`.
- [ ] Multipart documenta limites e `415`.
- [ ] Artefato regenerado (`docs:check` verde, quando o script existir).

## 16. Referências

- ADR-0005 — envelope de erro legado.
- ADR-0023 — header do solicitante.
- ADR-0026 — OpenAPI gerado dos schemas Zod.
- `docs/04-API-Conventions.md` — convenções transversais.
- `docs/02-Architecture.md` §15 — roteamento.
