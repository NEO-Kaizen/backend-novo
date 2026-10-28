# Padrões de código — backend Node.js

Este documento define **como escrever código** neste repositório. Ele não redefine contrato HTTP, schema, arquitetura ou decisões registradas: aponta para o documento dono de cada assunto.

**Contexto:** Node.js 24+, ESM, TypeScript `~6.0.3` direto e Express 5. O TypeScript 7.0 já existe, mas a adoção está bloqueada até a API do 7.1 e o suporte do `typescript-eslint`; o upgrade é decisão do ADR-0026. O Node 24 executa `.ts` por type stripping; o build usa `tsc`. Versões exatas, scripts, lint, formatação e CI vivem em `package.json`, `tsconfig.json`, `eslint.config.js`, `.prettierrc` e `.github/workflows/ci.yml`.

## Como usar

| Vou…                                            | Leia                                                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| escrever ou alterar handler, middleware ou rota | §6.1, §7; contrato em `docs/04-API-Conventions.md` e `docs/04-HTTP-Contract.md`            |
| escrever service ou regra de domínio            | §3, §4, §5; camadas em `docs/02-Architecture.md` §6–§8                                     |
| escrever repository, query ou migration         | §6.2; persistência em `docs/02-Architecture.md` §10–§11; schema em `docs/03-Data-Model.md` |
| escrever teste                                  | §10; runner e harness em `test/README.md`                                                  |
| revisar um PR                                   | §12; checklists de `docs/02-Architecture.md` §21 e `docs/04-HTTP-Contract.md` §15          |
| mexer em erro ou envelope                       | §5; `docs/02-Architecture.md` §12, ADR-0005 e `docs/04-API-Conventions.md` §2              |

**Linguagem normativa:** **Sempre** = obrigatório; **Prefira** = default; **Nunca** = guardrail. Estes são os três únicos níveis.

**Critério de conclusão:** um PR está conforme quando `npm run check` e `npm run contract:check` passam, o checklist §12 está completo e as exceções estão registradas na descrição do PR. Quando a suíte existir, `npm test` também precisa passar.

## Vocabulário

- **Borda**: onde dados externos entram — HTTP, fila, banco. Tudo que vem da borda é `unknown` até validação.
- **Domínio**: regra de negócio pura, sem HTTP, banco ou framework.
- **Handler**: função que recebe a requisição, valida a entrada, chama o domínio e responde.
- **Erro exposto**: erro cuja mensagem pode ir ao cliente. O resto fica no log.

## 1. Nomenclatura e legibilidade

**Sempre** nomeie pela intenção: o nome diz o que o código garante, não como foi escrito.

- `camelCase` para variáveis e funções; `PascalCase` para tipos e classes; `UPPER_SNAKE_CASE` para constantes de módulo; `kebab-case` para arquivos `.ts`.
- Booleanos começam com `is`, `has`, `can` ou `should`; funções começam com um verbo; classes e tipos são substantivos.
- Use o termo do `GLOSSARY.md`. Se o conceito ainda não existe lá, resolva o vocabulário antes de nomear.
- Prefira o termo do domínio a `data`, `item`, `temp`, `manager`, `helper` e abreviações que não sejam universais.
- Interfaces dispensam prefixo `I`; classes dispensam sufixo `Impl` sem significado.
- Extraia números e strings mágicos para constantes nomeadas.
- Nome ruim se conserta renomeando, não comentando.

```ts
// Prefira
const ONE_DAY_MS = 86_400_000;
const isActive = user.status === "active";

// Não faça
const d = 86400000;
const flag = user.status === "active";
```

## 2. Módulos e imports

**Sempre** use ESM e imports que o Node 24 executa sem transpilação. `require`, `module.exports`, `__dirname` e `__filename` ficam fora de código novo.

- Prefixo `node:` em builtins (`node:fs/promises`, `node:crypto`).
- Extensão `.ts` em imports relativos (`./user.ts`); o TypeScript reescreve para `.js` na emissão (`rewriteRelativeImportExtensions`).
- `import type` / `export type` para tipos.
- Exports nomeados; use default export só quando a ferramenta exigir.
- `import.meta.dirname` / `import.meta.filename` no lugar de `__dirname` / `__filename`.
- JSON modules com `with { type: "json" }` exigem `resolveJsonModule` no `tsconfig.json`; sem o flag, o type-check rejeita o import.
- Prefira import direto a `import * as` quando só alguns símbolos são usados.
- Prefira a stdlib do Node a uma dependência para uma função trivial.
- Mantenha o grafo de imports acíclico; se dois módulos precisam do mesmo contrato, extraia o contrato.
- `erasableSyntaxOnly` é o guard do type stripping, não uma conveniência: não habilite `--experimental-transform-types` para contornar (ver §3).

```ts
import { readFile } from "node:fs/promises";
import type { User } from "./user.ts";
```

## 3. Tipos

**Sempre** trate dados da borda como `unknown` até a validação. **Nunca** use `any` em código de aplicação; a exceção é teste de tipo ou declaração de módulo de terceiro.

- Estreite com type guards ou schema; use `satisfies` para checar shape sem alargar o tipo.
- Modele variantes com união discriminada; prefira uniões e `as const` a `enum`/`namespace`.
- `enum`, `namespace` com código de runtime, parameter properties, `import x = require()` e decorators ficam fora: o Node 24 faz type stripping e `erasableSyntaxOnly` rejeita sintaxe que exigiria transformação. `.tsx` não é suportado.
- Marque dados imutáveis como `readonly`.
- Use `as` só depois de validação ou em fronteira documentada; prefira guard/`satisfies`.
- Trate o caso ausente em vez de usar `!` (non-null assertion).
- Declare retorno explícito em APIs públicas para não alargar o contrato por acidente.
- `catch (err)` é `unknown`; não acesse `err.message` direto.

## 4. Funções e assincronismo

**Sempre** mantenha uma responsabilidade por função, retorno cedo e efeitos explícitos.

- Domínio puro: sem HTTP, banco, `Date.now()` ou `Math.random()`. Injete clock, gerador de ID, clientes, repositórios e configuração validada.
- Prefira funções separadas ou um objeto de opções a parâmetro booleano de controle.
- Toda promise é `await`ed, retornada ou tratada. Se a promise for intencionalmente solta, marque `void` e garanta o `catch` dentro dela.
- `Promise.all` para operações independentes; `Promise.allSettled` quando falha parcial é aceitável. Limite a concorrência de chamadas externas.
- Use `for...of` ou `Promise.all(map)` em vez de callback `async` em `forEach`.
- Toda chamada externa tem timeout: `AbortSignal.timeout(...)`; combine com `AbortSignal.any([...])` quando houver cancelamento do cliente. `Promise.race` sozinho não cancela a operação.
- No Express não existe `req.signal`: crie um `AbortController` no middleware, aborte quando a conexão morrer antes do fim (`req.destroyed` ou `!res.writableFinished`) e combine o sinal com o timeout.
- Mova trabalho síncrono pesado (`readFileSync`, CPU-bound, criptografia síncrona) para worker ou processo separado; ele não cabe no caminho da requisição.
- Paralelize I/O independente com limite em vez de `await` em loop.
- Configuração é lida e validada no boot; `process.env` só em `src/platform/config` (`docs/02-Architecture.md` §16).

```ts
const [user, orders] = await Promise.all([users.findById(id), orders.listByUser(id)]);
```

## 5. Erros

**Sempre** lance `Error` ou subclasse. **Nunca** lance string, objeto ou `unknown`.

- `AppError` carrega `code` estável (`snake_case`), `status`, `expose` e `cause` (`src/core/errors/app-error.ts`).
- Erro de domínio não conhece HTTP. O tipo alvo é `DomainError` (`docs/02-Architecture.md` §12.1); até ele existir, o `AppError` carrega o status e o mapeamento fica em `toHttpAppError`/`error-mapper`.
- `catch` recebe `unknown`; estreite com `isAppError` e, na borda HTTP, `toHttpAppError`.
- Se recuperar um erro, registre o motivo e o que foi feito; caso contrário, deixe-o subir.
- A causa é logada uma vez, na borda; camadas internas deixam o erro subir.
- `code` é estável em `snake_case` e não é traduzido; `message` é em português e só é exposta quando `expose` é true, o código está no catálogo exposto e não é `internal_error` — o resto vira `internal_error` com mensagem genérica e status 500.
- O runtime segue o envelope do ADR-0005 (legado com `code` e `requestId` aditivos). O alvo e a migração estão em `docs/04-API-Conventions.md` §2 e no ADR-0005. Use `errorEnvelope(...)` (`src/core/http/error-envelope.ts`); o JSON não é montado à mão.
- No corpo do erro, `requestId` é o id HTTP (emenda ao C11 em `docs/04-API-Conventions.md` §12); no log estruturado, o id HTTP é `correlationId`. Fora do envelope, `requestId` é o id da solicitação de negócio.
- Nunca devolva stack, SQL, path, nome de tabela ou versão interna. Em produção, `NODE_ENV=production`; teste o próprio error handler (inclusive falha de serialização) para o handler default do Express não vazar stack.
- Use exceção para condição excepcional; validação de entrada responde 400.

```ts
throw new AppError("not_found", 404, "Solicitação não encontrada.", {
  expose: true,
});
```

## 6. Entrada, validação e dados

**Sempre** valide na borda antes de usar o dado.

### 6.1 Validação

- `params`, `query`, `body` e headers relevantes passam por schema (Zod ou equivalente).
- Use `strictObject` para rejeitar campos desconhecidos e limite strings, arrays, números e profundidade.
- `safeParse` → 400 `validation_error` com detalhes por campo. Rota com body JSON obrigatório verifica `req.is("application/json")` e charset antes do Zod; `Content-Type` errado → 415 `invalid_content_type`.
- Configure `z.config(z.locales.ptBR())` uma vez no boot/teste como fallback e mantenha o catálogo pt-BR por campo para as mensagens de domínio. Não use a mensagem default em inglês nem um texto genérico para todos os campos.
- Em PATCH, diferencie campo ausente de `undefined` com `.optional()`/`.exactOptional()`; os dois não são o mesmo contrato.
- Normalize antes de comparar. Valide formato e encode na saída; substituir caracteres não é validação.
- Mapeie explicitamente os campos validados para o input do domínio; o body cru não vira input por spread.
- O valor da borda continua `unknown` até o `safeParse`. `z.input` descreve o wire; `z.output` descreve o valor validado que o domínio recebe.
- IDs de entidade usam `z.uuid({ version: "v4" })` (ADR-0003); `x-request-id` aceita qualquer UUID com `z.uuid()`.

```ts
const CreateUser = z.strictObject({
  email: z.email(),
  name: z.string().min(1).max(120),
});

type CreateUserField = keyof z.input<typeof CreateUser>;

// Catálogo pt-BR: `satisfies` exige uma mensagem para cada campo de topo.
const FIELD_MESSAGE = {
  email: "Informe um e-mail válido.",
  name: "Informe o nome.",
} as const satisfies Record<CreateUserField, string>;

const isCreateUserField = (path: string): path is CreateUserField =>
  Object.hasOwn(FIELD_MESSAGE, path);

const toFieldErrors = (issue: z.core.$ZodIssue): { path: string; message: string }[] => {
  if (issue.code === "unrecognized_keys") {
    return issue.keys.map((key) => ({
      path: [...issue.path, key].join("."),
      message: "Campo não permitido.",
    }));
  }

  const path = issue.path.join(".");
  if (path === "") {
    return [{ path, message: "Corpo da requisição inválido." }];
  }

  return [
    {
      path,
      message: isCreateUserField(path) ? FIELD_MESSAGE[path] : "Valor inválido.",
    },
  ];
};
```

Use `parsed.error.issues.flatMap(toFieldErrors)` para montar `fields`. O catálogo `satisfies` cobre os campos de topo; para schema aninhado, use o path completo (`demand.title`) e normalize índice de array (`tags.0` → `tags[]`) antes da busca. `unrecognized_keys` na raiz tem `path: []`; em objeto aninhado, o path é o do objeto e as chaves desconhecidas vêm em `issue.keys`.

### 6.2 Persistência

- Valores usam `?`/`$1`; identificadores usam `??`/`ref()` e só depois de allowlist. `raw()` fica restrito a `platform/database/*-dialect.ts` (ADR-0003).
- Ordenação, colunas e filtros dinâmicos passam por allowlist fechada.
- Use a porta `Database`/`TransactionManager`; o domínio não importa Knex. Regras de portabilidade, transação e snapshot estão em `docs/02-Architecture.md` §10–§11.
- O pool configura `statement_timeout`, `query_timeout`, `connectionTimeoutMillis`, `acquireTimeoutMillis`, `idle_in_transaction_session_timeout` e `lock_timeout`; o `query_timeout` fica um pouco acima do `statement_timeout` para o servidor ser o sinal primário.
- Transações usam a forma handler (`transaction(async (trx) => …)`) e não fazem I/O externo dentro da transação. Transações de escrita em `repeatable read` podem falhar com `40001`/`40P01`: faça retry limitado no boundary, com backoff, sem repetir efeito externo e sem retry cego de `23505`/`57014`.
- Toda listagem tem limite; paginação usa o envelope e o máximo de `docs/04-API-Conventions.md` §4.
- Resolva N+1 com `whereIn`, join/`with` ou `pluck`; em listas grandes, faça chunk. `Promise.all` por linha continua sendo N round trips.
- Erro do driver vira `AppError` na borda; nunca vaze SQL, nome de tabela ou detalhe do banco.

### 6.3 Contrato

O contrato vive em `docs/04-HTTP-Contract.md` (§4–§6, §10) e em `docs/04-API-Conventions.md` (§2, §3, §10); o handler o consome. Schemas, exemplos, erros e datas não são redefinidos no handler. O contrato é gerado dos schemas Zod; metadados de rota ficam em `*.openapi.ts`.

## 7. Express

**Sempre** mantenha o handler fino: valide a entrada, chame o domínio e responda.

- Regra de negócio fica no domínio/serviço; middleware e handler orquestram.
- Express 5 encaminha rejeição async para o error handler; `express-async-errors` é desnecessário. Callbacks e eventos fora da cadeia precisam de `try/catch` e `next(err)`.
- Declare o 404 antes do error handler; o error handler tem quatro parâmetros e fica por último.
- Depois de `headersSent`, delegue com `next(err)`.
- Tipar handlers evita `any`: `RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals>`; tipe `res.locals` com um `AppLocals` compartilhado.
- `req.query` é read-only no Express 5. Valide os valores como `string | string[] | ParsedQs` (o parser default é `simple`); rejeite array onde o contrato pede escalar. `req.params` é string, exceto wildcard, que é array.
- Ordem mínima: contexto/logging antes das rotas; 404 antes do error handler.
- Use `res.status(...).json(...)` e responda uma vez.
- Metadados de rota (OpenAPI) ficam co-localizados em `*.openapi.ts` no domínio; o contrato vem de lá, não do handler.
- Body JSON tem limite (`JSON_BODY_MAX_BYTES`, montado em `src/app.ts`); todo parser novo declara limite.
- `trust proxy` fica `false` por default; atrás de proxy conhecido, configure o número exato de hops ou as sub-redes confiáveis — `true` cego deixa `X-Forwarded-For` spoofável e contamina `req.ip` e rate limit.
- O boot declara `requestTimeout`, `headersTimeout`, `keepAliveTimeout` e `keepAliveTimeoutBuffer` derivados do proxy e do maior upload; não dependa dos defaults do Node (5 min de request timeout e 5 s de keep-alive). No shutdown, `server.close()` e, se o deadline estourar, `server.closeAllConnections()`.

**Nomenclatura de middleware.** Middleware de plataforma vive em `platform/http/<conceito>.middleware.ts` e exporta `create<Conceito>Middleware(...)`, que devolve `RequestHandler` — inclusive quando não recebe dependência. O error handler mantém `createErrorHandler`, pela assinatura de quatro parâmetros do Express. Rotas de domínio seguem `docs/02-Architecture.md` §4 (`<domínio>.router.ts`, `.controller.ts`, …).

## 8. Segurança no código

**Sempre** autorize no servidor. CORS não é controle de acesso.

- Verifique permissão em toda operação sobre recurso; não confie em role/ID enviado pelo cliente.
- Segredo só via configuração validada. Em produção, ele vem do gerenciador de segredos da plataforma, não de `.env` na imagem; `.env` é desenvolvimento. Nunca hardcode, logue, devolva em erro ou use em fixture.
- Não use `eval`, `new Function` ou `vm` com input; não use `child_process.exec` com interpolação; não acesse `fs` com path de usuário sem canonicalização e allowlist.
- SSRF: URL fornecida por usuário não escolhe host; use allowlist e timeout.
- XSS: API JSON; se gerar HTML, faça escaping e não interpole input em template sem escape. Se servir a UI de docs, defina CSP ou mantenha a UI desligada em produção.
- Prototype pollution: não faça merge recursivo de input não validado.
- Upload: valide a assinatura do conteúdo (magic bytes), não o MIME/extensão declarados; gere nome de armazenamento aleatório, guarde fora do webroot/em objeto storage, limite o total em memória e sirva download com `Content-Disposition: attachment` e `Content-Type` fixo. SVG só sanitizado ou como attachment. Regras de multipart em `docs/04-API-Conventions.md` §9; hoje o middleware (`src/platform/http/upload.middleware.ts`) cobre limites e MIME declarado, e a validação de conteúdo é obrigatória na rota.
- Sessão em cookie: `HttpOnly`, `SameSite=Lax`, `Secure` em produção e defesa CSRF (`Origin`/`Sec-Fetch-Site` ou token assinado) para métodos que mudam estado; CORS não substitui CSRF. Flags em `docs/04-API-Conventions.md` §5.
- PII não entra em log, erro, fixture ou resposta desnecessária; a redaction está em §9.

## 9. Logging

**Sempre** use o logger da aplicação; `console.log` não é logging de produção.

- Log estruturado (JSON), com nível e campos estáveis. A tabela canônica de campos e redaction está em `docs/02-Architecture.md` §17.
- Header `x-request-id`: aceite só se for UUID válido; senão gere um; devolva no header.
- Logue método, rota, status, duração e `correlationId`. Logue só a allowlist de campos; body e query ficam fora por default.
- `correlationId` é o mesmo id HTTP do header `x-request-id`; no corpo do erro ele mantém o nome `requestId` por compatibilidade (ver §5).
- Redaction cobre os campos de `docs/02-Architecture.md` §17; PII não entra no log. Connection string, SQL e fragmento de parser não entram em `Error.message`/`cause`.
- A causa do erro é logada uma vez, na borda; camadas internas deixam o erro subir. Exceção: 4xx não loga a causa (a `message` do parser pode ecoar trecho do body); 5xx mantém a causa.
- Logue falhas de autenticação, autorização e validação com `code`, rota e `correlationId`; sem e-mail, token ou body.
- Campos, não concatenação: `logger.info({ correlationId, userId }, "user loaded")`.

### 9.1 Observabilidade

Métricas, tracing e SLOs pertencem à arquitetura/operação, não a este padrão. Quando entrarem, a decisão passa por ADR, o log pode carregar `traceId`/`spanId`, e a instrumentação usa `http.route` (baixa cardinalidade) sem query string ou PII.

## 10. Testes

**Sempre** teste comportamento, não implementação.

- O runner e o harness definitivos estão em aberto; a decisão vive em `test/README.md`. Quando a suíte entrar, o caminho natural da stack é `node:test` + `node:assert/strict` + `fetch`; Vitest e Supertest não estão instalados.
- `describe("POST /api/v1/users")` + `it("retorna 400 quando o e-mail é inválido")`.
- Um comportamento por teste; arrange-act-assert; evite múltiplas asserções não relacionadas.
- Injete clock, ID e RNG; o domínio não chama `Date.now()`, `new Date()` ou `Math.random()`.
- Sem `sleep`; use fake timers do runner e aguarde sinais/promessas.
- Unit sem I/O; integração nas fronteiras (HTTP, banco, fila). Sem estado global compartilhado; recrie deps em `beforeEach`.
- Sem rede externa; loopback para o teste HTTP é permitido. Use fakes ou mock de rede; prefira fake em memória a mock de módulo e mocke só o que é lento/indeterminístico/externo.
- Teste HTTP contra `createApp(container)` em porta efêmera, sem `listen` fixo; o esqueleto está em `test/README.md`.
- Cubra caminhos de erro e regras de negócio; cobertura é consequência, não meta.
- Fixtures com builders e defaults seguros; sem PII ou dado real.
- Testes também passam pelo type-check. `tsconfig.json` hoje cobre só `src`; quando a suíte existir, um `tsconfig.test.json` que inclua `test/` entra junto.
- Cobertura e `mock.module` ainda são experimentais no Node 24; não condicione o build a elas.
- Testes de contrato validam respostas representativas contra `openapi/openapi.json` (`npm run contract:check`).

## 11. Comentários e código morto

- Comentário explica **por que**, não **o que**. Se o código não é óbvio, primeiro tente nomes e estrutura melhores.
- JSDoc em contratos públicos quando parâmetros, retorno ou erros não forem óbvios.
- TODO com referência: `// TODO(#123): ...`. Sem TODO anônimo.
- Remova comentário obsoleto junto com o código que ele descreve.
- Código comentado sai; o histórico do Git guarda.
- Comentário só para o porquê não óbvio.

## 12. Checklist de code review

- [ ] Nomes revelam intenção; termos do `GLOSSARY.md`.
- [ ] Sem `any`; `unknown` na borda; sem assertion sem validação.
- [ ] Funções pequenas, retorno cedo, sem trabalho síncrono pesado.
- [ ] Promises tratadas; sem floating promise; timeouts em chamadas externas; concorrência limitada.
- [ ] Erros tipados com `cause`; sem swallow; sem stack/SQL/PII na resposta.
- [ ] Entrada validada; SQL parametrizado; autorização no servidor.
- [ ] Upload valida conteúdo e limites; cookie/CSRF revisados quando aplicável.
- [ ] Sem segredo/PII em código, log ou fixture; sem `eval`/`exec` com input.
- [ ] Logs estruturados, com `correlationId` e redaction.
- [ ] Testes cobrem comportamento e caminhos de erro; determinísticos e isolados.
- [ ] Sem N+1, listagem sem limite ou payload sem paginação.
- [ ] Comentários explicam o porquê; sem código morto.
- [ ] Dependência nova justificada; a stdlib não foi reimplementada por pacote.
- [ ] Schema alterado? `docs/03-Data-Model.md` e os derivados `docs/db/02-reference.md`, `docs/db/03-erd.md` e `docs/db/schema.dbml` atualizados no mesmo PR (checklist em `docs/02-Architecture.md` §21).
- [ ] Rota alterada? `*.openapi.ts` e `openapi/openapi.json` atualizados via `npm run docs:generate`; `npm run docs:lint` e `npm run contract:check` verdes (checklist em `docs/04-HTTP-Contract.md` §15).
- [ ] Exemplos no spec sem PII.
- [ ] `npm run check` e `npm run contract:check` verdes; `npm test` quando a suíte existir; testes cobertos pelo type-check.
- [ ] Exceções a este documento registradas no PR.

## Referências

- Node.js — [ESM](https://nodejs.org/docs/latest-v24.x/api/esm.html) · [Type stripping](https://nodejs.org/docs/latest-v24.x/api/typescript.html) · [Test runner](https://nodejs.org/docs/latest-v24.x/api/test.html) · [HTTP](https://nodejs.org/docs/latest-v24.x/api/http.html)
- TypeScript — [Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) · [Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) · [`erasableSyntaxOnly`](https://www.typescriptlang.org/tsconfig/#erasableSyntaxOnly) · [TS 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- Express — [Error handling](https://expressjs.com/en/guide/error-handling.html) · [Migrating 5](https://expressjs.com/en/guide/migrating-5.html) · [Security best practices](https://expressjs.com/en/advanced/best-practice-security.html)
- Zod — [Documentation](https://zod.dev/) · [Error customization](https://zod.dev/error-customization)
- Knex — [Transactions](https://knexjs.org/guide/transactions.html) · [Query builder](https://knexjs.org/guide/query-builder.html)
- node-postgres — [Client](https://node-postgres.com/apis/client) · [Pool](https://node-postgres.com/apis/pool)
- PostgreSQL — [Statement timeout](https://www.postgresql.org/docs/current/runtime-config-client.html#GUC-STATEMENT-TIMEOUT) · [Transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html) · [Error codes](https://www.postgresql.org/docs/current/errcodes-appendix.html)
- OWASP — [Node.js Security](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html) · [File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) · [CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) · [Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) · [Secrets](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) · [ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- OpenAPI — [3.1 spec](https://spec.openapis.org/oas/v3.1.0.html) · [zod-openapi](https://github.com/samchungy/zod-openapi)
