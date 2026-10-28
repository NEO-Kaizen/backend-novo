---
status: aceito
---

# Adotar OpenAPI 3.1 gerado dos schemas Zod como contrato publicado

O backend-novo não tinha contrato HTTP publicado. Uma proposta não mergeada do legado tem um `src/swagger.json` escrito à mão em OpenAPI 3.0.0, servido em `/docs` por `swagger-ui-express`. Esse arquivo documenta só `/auth/login` e `/auth/logout`, fixa `http://localhost:3000` e declara `bearerAuth`, embora a sessão real seja cookie HttpOnly. Não havia contrato HTTP de máquina nem documento de contrato versionado neste repositório.

Decidimos adotar **OpenAPI 3.1.0 gerado a partir dos schemas Zod**, com metadados de rota co-localizados no domínio, como fonte única de contrato HTTP, publicado em `/api/v1/openapi.json` e visualizado por uma UI dedicada (Scalar).

## Decisões

| Decisão               | Escolha                                                                                                                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Versão OpenAPI        | 3.1.0                                                                                                                                                                                                                |
| Gerador               | `zod-openapi` 6.x (sem monkey patch; `.meta()`), validado no spike em **6.0.2** (`~6.0.2` é o pin)                                                                                                                   |
| UI                    | Scalar self-hosted via `@scalar/express-api-reference` + `@scalar/api-reference`: HTML em `/api/v1/docs` e bundle UMD local em `/api/v1/docs/assets/standalone.js`, sem CDN em runtime                               |
| Fonte de verdade      | Zod + metadados de rota                                                                                                                                                                                              |
| Artefato              | `openapi/openapi.json`, commitado e versionado                                                                                                                                                                       |
| Versionamento         | `/api/v1` para todos os endpoints                                                                                                                                                                                    |
| Autenticação          | `sessionCookie` (`apiKey`, `in: cookie`, `name: session_id`), não `bearerAuth`                                                                                                                                       |
| Header do solicitante | `X-Requester-Email` (aceitar `X-Requester-Identity` por uma release — janela de compatibilidade)                                                                                                                     |
| Envelope de erro      | Legado `{ status, statusCode, message }` + `code` (ADR-0005); `requestId`/`fields` em `04-API-Conventions.md` §2; variantes `ValidationError`, `LegacyValidationError` e `ConflictError` em `04-HTTP-Contract.md` §6 |
| Paginação             | `{ data, page, pageSize, total, totalPages }`                                                                                                                                                                        |
| Exposição             | Não-produção por padrão; produção só com opt-in                                                                                                                                                                      |
| Validação de resposta | Testes de contrato (sem runtime em produção)                                                                                                                                                                         |
| Drift de rotas        | `app.router` (Express 5)                                                                                                                                                                                             |
| Breaking change       | Exige label e plano de `/api/v2`; `oasdiff breaking` quando o workflow existir                                                                                                                                       |
| Depreciação           | `deprecated: true`, remoção só em v2                                                                                                                                                                                 |

## Spike de compatibilidade

Executado em **2026-10-28** com Node **24.22.1**, TypeScript **6.0.3**, Zod **4.6.7** e `zod-openapi` **6.0.2**, em modo `nodenext`. O spike é um script `.ts` avulso num projeto descartável fora do repositório (`/tmp/opencode/issue34-spike`), verificado com `npx tsc --noEmit` e executado com `node` (type stripping do Node 24), chamando `createDocument` do `zod-openapi` e validando a saída com `node:assert`.

```bash
npm install zod@4.6.7 zod-openapi@6.0.2 typescript@6.0.3 @types/node@24
npx tsc --noEmit
node spike.ts
# spike OK: openapi=3.1.0, file={"type":"string","format":"binary","contentEncoding":"binary"}, security={"type":"apiKey","in":"cookie","name":"session_id"}
```

Resultados:

- `createDocument` produz `openapi: "3.1.0"`.
- `.meta({ id, example })` registra componentes reutilizáveis e emite `$ref`.
- `z.iso.datetime()` renderiza `format: date-time`.
- `z.file()` dentro de `multipart/form-data` renderiza `{ type: "string", format: "binary", contentEncoding: "binary" }`.
- O security scheme de cookie renderiza `{ type: "apiKey", in: "cookie", name: "session_id" }`.
- `components.parameters` com `meta` no `param` renderiza `PageSize` com default 20 e máximo 100.

O `6.0.3` **não está publicado no registry npm**; o pin é `~6.0.2`. Quando o TypeScript 7 for adotado, o spike é repetido e a saída é registrada aqui.

## Alternativas consideradas

- **`swagger-ui-express` + `src/swagger.json` à mão (proposta do legado).** Cobre só 2 endpoints, fixa `http://localhost:3000` e declara `bearerAuth` (incorreto, a sessão é cookie). Rejeitado por incompleto e por drift.
- **`tsoa`, decorators ou geração por AST do TypeScript.** Introduz decoradores/AST e viola a regra de DI manual e "sem decorator" de `02-Architecture.md` §8 e do ADR-0002. Rejeitado.
- **OpenAPI 3.2.** É a versão mais recente e aparece nas typings do `zod-openapi` 6.x, mas o suporte documentado cobre 3.1.x. Rejeitado: o contrato adotado é 3.1.0, e 3.2 ainda não tem suporte documentado completo.
- **Gerar SDK/client.** Fora de escopo; o frontend continua tipado manualmente até migração coordenada.
- **Validar resposta em runtime em produção.** Custo e risco; a validação fica em testes de contrato.

## Consequências

- A fonte de verdade passa a ser Zod + metadados de rota. O OpenAPI é o único artefato versionado do contrato HTTP; as regras de negócio ficam nos docs normativos e nas specs de domínio.
- Cada domínio expõe `*.schema.ts` e `*.openapi.ts`, sem importar `platform`.
- `src/api-contract/openapi.ts` compõe o documento; `src/api-contract/components.ts` é a única definição de `ErrorEnvelope`, `ValidationError`, `LegacyValidationError`, `ConflictError`, `PaginatedResponse` e `securitySchemes`.
- `src/platform/http/api-contract-router.ts` serve `/api/v1/openapi.json` e `/api/v1/docs`; o `container.ts` monta o router e o `app.ts` o registra em `/api/v1`.
- O artefato `openapi/openapi.json` é commitado; `npm run docs:check` regenera e falha se estiver desatualizado. O gate de CI é um PR separado e ainda não existe.
- O artefato gerado é mais estrito que o esqueleto manual em `pattern` (uuid/email) e limites de inteiros; todas as descrições e exemplos do esqueleto foram preservados. Os envelopes de resposta (`ErrorEnvelope`, `ValidationError`, `LegacyValidationError`, `ConflictError` e `PaginatedResponse`) são a exceção declarada: usam `additionalProperties: true` para preservar a política de aditivos de `04-HTTP-Contract.md` §6 e §7.
- A UI usa `@scalar/express-api-reference` + `@scalar/api-reference`: o HTML é servido em `/api/v1/docs` e o backend serve o bundle UMD local em `/api/v1/docs/assets/standalone.js`, sem CDN em runtime. A spec continua local em `/api/v1/openapi.json`.
- Exemplos não podem conter PII; operações públicas declaram `security: []`.
- `POST /requests` documenta multipart (`payload` + `attachments`) e `415`; limites e MIME seguem `04-API-Conventions.md` §9.
- `Set-Cookie` e seus atributos são documentados nas respostas de login e troca de senha.
- A documentação e a UI ficam desabilitadas em produção por padrão; `DOCS_ENABLED=true` habilita em produção e `DOCS_ENABLED=false` desabilita em qualquer ambiente.

## Gatilho da migração

A adoção do envelope alvo `{ error: { code, message, requestId } }` segue o gatilho do ADR-0005 (migração coordenada com o frontend). Até lá, o envelope legado é o contrato vigente e `code`/`requestId` são aditivos. A variante `LegacyValidationError` (`422`/objeto) será removida quando a migração C2 (`04-API-Conventions.md` §3) concluir. A fonte única das convenções é `docs/04-API-Conventions.md`. A tabela completa de convenções e os critérios de revisão de spec estão nesse documento. O OpenAPI documenta o vigente, não o alvo. Ver ADR-0005 (envelope) e ADR-0023 (header do solicitante).
