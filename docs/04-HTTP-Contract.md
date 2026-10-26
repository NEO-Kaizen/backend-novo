# Contrato HTTP (OpenAPI)

Política normativa do contrato HTTP publicado. Fonte única do padrão OpenAPI do backend-novo. Toda spec de domínio cita este documento em vez de redefinir estas decisões; divergência exige emenda aqui e emenda ao ADR-0026.

Decisões transversais (base path, envelope de erro, paginação, sessão, autorização, concorrência, content types, datas, idioma, request-id, rate limit, CORS) estão em `docs/04-API-Conventions.md` e são herdadas, não redefinidas aqui.

## 1. Fonte de verdade

Hierarquia:

1. **Schemas Zod + metadados de rota** (código) — fonte única.
2. **OpenAPI 3.1.0** (`openapi/openapi.json`) — gerado, versionado, publicado.

Documentos normativos (`04-API-Conventions.md`, `02-Architecture.md`, `03-Data-Model.md`) complementam regras que o OpenAPI não expressa, mas não são contrato de máquina.

Não há contratos Markdown versionados no backend-novo. DTOs não são duplicados fora dos schemas Zod.

## 2. Versão e gerador

- OpenAPI **3.1.0** (mínimo suportado pelo gerador).
- Gerador: **`zod-openapi` 6.x**, sem monkey patch, usando `.meta()` nativo do Zod.
- Proibido: `tsoa`, decorators, geração baseada em AST do TypeScript.
- Spike validado: TS 6 + `nodenext` + Node 24 + `z.iso.datetime()` + `z.file()` (multipart) — ver ADR-0026.

## 3. Estrutura de arquivos

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
└── README.md               # comandos
.spectral.yaml              # lint
```

Regra de dependências (`docs/02-Architecture.md` §19): `domains` não importa `platform`; `*.openapi.ts` não importa `platform`. A composição acontece em `src/docs/openapi.ts` (composition root do docs).

## 4. Metadados de rota

- `operationId`: `<domínio>.<ação>` em camelCase (ex.: `requests.create`, `auth.login`).
- `tags`: um por domínio, em inglês (ex.: `auth`, `requests`).
- `summary` e `description` em português.
- Toda operação tem schema de request (quando aplicável) e schema de response explícito.
- Toda rota Express 5 tem operação documentada e vice-versa (cobertura bidirecional).
- Exemplos obrigatórios em schemas e responses; **sem PII** (sem e-mail, nome, telefone ou dado real de pessoa).

## 5. Segurança

- `securitySchemes.sessionCookie`: `{ type: "apiKey", in: "cookie", name: "session_id" }`.
- Segurança global: `security: [{ sessionCookie: [] }]`.
- Operações públicas declaram `security: []` explicitamente (login, verificação pública por protocolo, etc.).
- Nunca usar `bearerAuth`; a sessão é cookie HttpOnly.

## 6. Envelope de erro (documentado uma vez)

O contrato vigente é o legado (ADR-0005). O OpenAPI documenta o vigente, não o alvo.

```json
{ "status": "error", "statusCode": 404, "message": "Solicitação não encontrada." }
```

Aditivos permitidos (não quebram o cliente): `code` (snake_case estável), `requestId` (correlation HTTP), `fields` (erros por campo, em validação). O componente `ErrorEnvelope` em `src/docs/components.ts` é a única definição; todas as respostas de erro a referenciam.

## 7. Paginação (documentada uma vez)

```json
{ "data": [], "page": 1, "pageSize": 20, "total": 0, "totalPages": 0 }
```

O componente `PaginatedResponse` em `src/docs/components.ts` é a única definição. Exceções registradas em `docs/04-API-Conventions.md` (timeline por cursor; auditoria padrão) são documentadas na spec de domínio correspondente.

## 8. Multipart e content types

- `application/json` para JSON; `multipart/form-data` para uploads.
- `Content-Type` inesperado → `415` (`invalid_content_type`).
- Corpo acima do limite → `413` (`payload_too_large`).
- `POST /api/v1/requests`: `payload` + `attachments` (0–5 arquivos, 10 MB por arquivo, MIME allowlist). Documentado com `z.file()` (renderiza `format: binary`).
- Limites de arquivo por rota são registrados na spec de domínio.

## 9. Header do solicitante

- Aceitar `X-Requester-Email` e `X-Requester-Identity` por uma release (janela de compatibilidade).
- Depois, apenas `X-Requester-Email`.
- O header é chave de busca, não autenticação (ADR-0023); sem correspondência, resposta `404` (nunca `403`).
- Documentar ambos os parâmetros no OpenAPI durante a janela, marcando `X-Requester-Identity` como `deprecated`.

## 10. Datas e horas

- Timestamps: ISO-8601 UTC com `Z` — usar `z.iso.datetime()`.
- Datas puras: `yyyy-mm-dd` — usar `z.iso.date()`.
- Serialização na borda sempre ISO (`docs/04-API-Conventions.md` §10).

## 11. Versionamento, breaking change e depreciação

- Base path: `/api/v1` para todos os endpoints (`docs/04-API-Conventions.md` §1).
- `v2` não existe; quando existir, convive com `v1` por janela documentada.
- Breaking change: exige label `breaking-change` no PR, plano de `/api/v2` e aprovação. `oasdiff breaking` compara base × PR e falha se houver breaking sem a label.
- Depreciação: `deprecated: true` no OpenAPI, com prazo documentado; remoção só em `v2`.
- Idempotência e concorrência seguem `docs/04-API-Conventions.md` §8.

## 12. Comandos

```bash
npm run docs:generate   # regenera openapi/openapi.json a partir dos schemas Zod
npm run docs:lint       # spectral lint openapi/openapi.json
npm run docs:check     # regenera e falha se o artefato estiver desatualizado
```

- O artefato `openapi/openapi.json` é **commitado**. Edição manual é proibida; toda mudança passa por `docs:generate`.
- Em CI: `docs:generate` → `docs:lint` → `docs:check`, mais `oasdiff breaking` contra a base.

## 13. Exposição por ambiente

- Documentação e UI desabilitadas em produção por padrão.
- Habilitação em produção apenas com opt-in explícito (`DOCS_ENABLED=true`).
- Em desenvolvimento e teste: habilitadas.

## 14. Lint do spec

- `spectral lint openapi/openapi.json` com `spectral:oas` + regras customizadas (`.spectral.yaml`).
- Regras mínimas: `operation-operationId`, `operation-tags`, schemas com `description`/`example`.
- Exemplos sem PII verificados por script auxiliar.

## 15. Checklist de revisão (OpenAPI)

- [ ] Rota documentada no OpenAPI com request/response schemas explícitos.
- [ ] `operationId` e `tags` definidos.
- [ ] Exemplos presentes e sem PII.
- [ ] Timestamps usam `z.iso.datetime()`; datas puras usam `z.iso.date()`.
- [ ] Operações públicas declaram `security: []`.
- [ ] Multipart documenta limites e `415`.
- [ ] Artefato regenerado (`docs:check` verde).

## 16. Referências

- ADR-0005 — envelope de erro legado.
- ADR-0023 — header do solicitante.
- ADR-0026 — esta decisão.
- `docs/04-API-Conventions.md` — convenções transversais.
- `docs/02-Architecture.md` §15 — roteamento.
