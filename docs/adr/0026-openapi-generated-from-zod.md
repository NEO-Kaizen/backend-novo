---
status: aceito
---

# Adotar OpenAPI 3.1 gerado dos schemas Zod como contrato publicado

O backend-novo não tinha contrato HTTP publicado. Uma proposta não mergeada do legado tem um `src/swagger.json` escrito à mão em OpenAPI 3.0.0, servido em `/docs` por `swagger-ui-express`. Esse arquivo documenta só `/auth/login` e `/auth/logout`, fixa `http://localhost:3000` e declara `bearerAuth`, embora a sessão real seja cookie HttpOnly. Não havia contrato HTTP de máquina nem documento de contrato versionado neste repositório.

Decidimos adotar **OpenAPI 3.1.0 gerado a partir dos schemas Zod**, com metadados de rota co-localizados no domínio, como fonte única de contrato HTTP, publicado em `/api/v1/openapi.json` e visualizado por uma UI dedicada (Scalar self-hosted).

## Decisões

| Decisão               | Escolha                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Versão OpenAPI        | 3.1.0                                                                                                            |
| Gerador               | `zod-openapi` 6.x (sem monkey patch; `.meta()`)                                                                  |
| UI                    | Scalar self-hosted (fallback `swagger-ui-express` se assets locais forem obrigatórios)                           |
| Fonte de verdade      | Zod + metadados de rota                                                                                          |
| Artefato              | `openapi/openapi.json`, commitado e versionado                                                                   |
| Versionamento         | `/api/v1` para todos os endpoints                                                                                |
| Autenticação          | `sessionCookie` (`apiKey`, `in: cookie`, `name: session_id`), não `bearerAuth`                                   |
| Header do solicitante | `X-Requester-Email` (aceitar `X-Requester-Identity` por uma release — janela de compatibilidade)                 |
| Envelope de erro      | Legado `{ status, statusCode, message }` + `code` (ADR-0005); `requestId`/`fields` em `04-API-Conventions.md` §2 |
| Paginação             | `{ data, page, pageSize, total, totalPages }`                                                                    |
| Exposição             | Não-produção por padrão; produção só com opt-in                                                                  |
| Validação de resposta | Testes de contrato (sem runtime em produção)                                                                     |
| Drift de rotas        | `app.router` (Express 5)                                                                                         |
| Breaking change       | Exige label e plano de `/api/v2`; `oasdiff breaking` quando o workflow existir                                   |
| Depreciação           | `deprecated: true`, remoção só em v2                                                                             |

## Validação pendente

A decisão de adotar OpenAPI 3.1 gerado está aceita; a escolha do gerador fica condicionada à validação abaixo. O spike de compatibilidade ainda não foi executado. Antes da adoção do gerador, validar `zod-openapi` 6.x com TypeScript 7 (alvo; `~6.0.3` no `package.json`), `nodenext`, Node 24, `z.iso.datetime()`/`z.iso.date()` e `z.file()`; registrar aqui o comando, as versões e a saída.

## Alternativas consideradas

- **`swagger-ui-express` + `src/swagger.json` à mão (proposta do legado).** Cobre só 2 endpoints, fixa `http://localhost:3000` e declara `bearerAuth` (incorreto, a sessão é cookie). Rejeitado por incompleto e por drift.
- **`tsoa`, decorators ou geração por AST do TypeScript.** Introduz decoradores/AST e viola a regra de DI manual e "sem decorator" de `02-Architecture.md` §8 e do ADR-0002. Rejeitado.
- **OpenAPI 3.2.** É a versão mais recente e aparece nas typings do `zod-openapi` 6.x, mas o suporte documentado cobre 3.1.x. Rejeitado até o spike comprovar o suporte completo.
- **Gerar SDK/client.** Fora de escopo; o frontend continua tipado manualmente até migração coordenada.
- **Validar resposta em runtime em produção.** Custo e risco; a validação fica em testes de contrato.

## Consequências

- A fonte de verdade passa a ser Zod + metadados de rota. O OpenAPI é o único artefato versionado do contrato HTTP; as regras de negócio ficam nos docs normativos e nas specs de domínio.
- Cada domínio expõe `*.schema.ts` e `*.openapi.ts`, sem importar `platform`.
- `src/docs/openapi.ts` compõe o documento; `src/docs/components.ts` define `ErrorEnvelope`, `PaginatedResponse` e os `securitySchemes`.
- `src/platform/http/docs-router.ts` serve `/api/v1/openapi.json` e `/api/v1/docs`; o `container.ts` monta o router e o `app.ts` o registra.
- O artefato `openapi/openapi.json` é commitado; quando o script existir, `npm run docs:check` regenera e falha se estiver desatualizado.
- Exemplos não podem conter PII; operações públicas declaram `security: []`.
- `POST /requests` documenta multipart (`payload` + `attachments`) e `415`; limites e MIME seguem `04-API-Conventions.md` §9.
- `Set-Cookie` e seus atributos são documentados nas respostas de login e troca de senha.
- A documentação e a UI ficam desabilitadas em produção por padrão.

## Gatilho da migração

A adoção do envelope alvo `{ error: { code, message, requestId } }` segue o gatilho do ADR-0005 (migração coordenada com o frontend). Até lá, o envelope legado é o contrato vigente e `code`/`requestId` são aditivos. A fonte única das convenções é `docs/04-API-Conventions.md`. A tabela completa de convenções e os critérios de revisão de spec estão nesse documento. O OpenAPI documenta o vigente, não o alvo. Ver ADR-0005 (envelope) e ADR-0023 (header do solicitante).
