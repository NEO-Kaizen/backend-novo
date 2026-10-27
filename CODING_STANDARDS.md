# Padrões de código — backend Node.js

Este documento define como escrever código de aplicação neste repositório. Ele cobre nomes, tipos, funções, erros, validação, Express, segurança, logging, testes e comentários.

**Contexto:** Node.js 24+, ESM, TypeScript 7 (alvo) com `~6.0.3` direto por enquanto, e Express 5. Gerenciador de pacotes npm, linter (ESLint flat config) e formatter (Prettier) estão definidos em `package.json`, `tsconfig.json`, `eslint.config.js`, `.prettierrc` e `.github/workflows/ci.yml`. Versões exatas, estrutura de diretórios, CI e operação são a fonte de verdade nesses arquivos.

## Como aplicar

1. Leia a seção da área que você vai alterar.
2. Aplique as regras. Exceção precisa de justificativa no PR; exceção recorrente vira decisão registrada.
3. Garanta que o type-check e os testes relevantes passam.
4. Preencha o checklist de code review.

**Linguagem normativa:** **Sempre** = obrigatório; **Prefira** = default; **Nunca** = guardrail.

**Critério de conclusão:** um PR está conforme quando o checklist está completo, o type-check passa e os testes relevantes passam.

## Vocabulário

- **Borda**: onde dados externos entram — HTTP, fila, banco. Tudo que vem da borda é `unknown` até validação.
- **Domínio**: regra de negócio pura, sem HTTP, banco ou framework.
- **Handler**: função que recebe a requisição, valida a entrada, chama o domínio e responde.
- **Erro exposto**: erro cuja mensagem pode ir ao cliente. O resto fica no log.

## 1. Nomenclatura e legibilidade

**Sempre** nomeie pelo que o código faz, não por como foi escrito.

- `camelCase` para variáveis e funções; `PascalCase` para tipos e classes; `UPPER_SNAKE_CASE` para constantes de módulo; `kebab-case` para arquivos `.ts`.
- Booleanos começam com `is`, `has`, `can` ou `should`; funções começam com um verbo; classes e tipos são substantivos.
- Use o termo do domínio. Evite `data`, `item`, `temp`, `manager`, `helper` e abreviações que não sejam universais.
- Não use prefixo `I` em interfaces nem sufixo `Impl` sem significado.
- Extraia números e strings mágicos para constantes nomeadas.
- Comentário não conserta nome ruim: renomeie.

```ts
// Prefira
const ONE_DAY_MS = 86_400_000;
const isActive = user.status === "active";

// Evite
const d = 86400000;
const flag = user.status === "active";
```

## 2. Módulos e imports

**Sempre** use ESM. Não use `require`, `module.exports`, `__dirname` ou `__filename` em código novo.

- Prefixo `node:` em builtins (`node:fs/promises`, `node:crypto`).
- Extensão `.ts` em imports relativos (`./user.ts`); o TypeScript reescreve para `.js` na emissão (`rewriteRelativeImportExtensions`).
- `import type` / `export type` para tipos.
- Exports nomeados; use default export só quando a ferramenta exigir.
- `import.meta.dirname` / `import.meta.filename` no lugar de `__dirname` / `__filename`.
- JSON modules com `with { type: "json" }`.
- Evite imports circulares; extraia contratos compartilhados.
- Evite `import * as` quando só alguns símbolos são usados.

```ts
import { readFile } from "node:fs/promises";
import type { User } from "./user.ts";
```

## 3. Tipos

**Sempre** trate dados da borda como `unknown` até a validação. **Nunca** use `any` em código de aplicação; a exceção é teste de tipo ou declaração de módulo de terceiro.

- Estreite com type guards ou schema; use `satisfies` para checar shape sem alargar o tipo.
- Modele variantes com união discriminada; prefira uniões e `as const` a `enum`/`namespace`.
- Marque dados imutáveis como `readonly`.
- Use `as` só depois de validação ou em fronteira documentada; prefira guard/`satisfies`.
- Evite `!` (non-null assertion); trate o caso ausente.
- Declare retorno explícito em APIs públicas para não alargar o contrato por acidente.
- `catch (err)` é `unknown`; não acesse `err.message` direto.

## 4. Funções e assincronismo

**Sempre** mantenha funções pequenas, com uma responsabilidade e retorno cedo.

- Domínio puro: sem HTTP, banco, `Date.now()` ou `Math.random()`. Injete clock, gerador de ID, clientes, repositórios e configuração validada.
- Evite parâmetro booleano de controle; prefira funções separadas ou um objeto de opções.
- Toda promise é `await`ed, retornada ou tratada com `catch`. Não deixe floating promise.
- `Promise.all` para operações independentes; `Promise.allSettled` quando falha parcial é aceitável. Limite a concorrência de chamadas externas.
- Não use callback `async` em `forEach`; use `for...of` ou `Promise.all(map)`.
- Toda chamada externa tem timeout: `AbortSignal.timeout(...)`; combine com `AbortSignal.any([...])` quando houver cancelamento do cliente.
- Nada de trabalho síncrono pesado no caminho da requisição (`readFileSync`, CPU-bound, criptografia síncrona). Mova para worker ou processo separado.
- Evite `await` em loop para I/O independente; paralelize com limite.

```ts
const [user, orders] = await Promise.all([users.findById(id), orders.listByUser(id)]);
```

## 5. Erros

**Sempre** lance `Error` ou subclasse; **nunca** lance string/objeto.

- `AppError` carrega `code` estável (`snake_case`), `status`, `expose` e `cause`.
- Erros de domínio não conhecem HTTP; o mapeamento para status acontece na borda.
- `catch` recebe `unknown`; estreite com `isAppError`/`toAppError`.
- Não engula erro. Se recuperar, registre o motivo e o que foi feito.
- Logue a causa uma vez, na borda; não faça log-and-rethrow em cada camada.
- Resposta de erro: `{ error: { code, message, requestId } }`. `code` é estável em `snake_case` e não é traduzido; `message` é em português e só é exposta quando `expose` é true — o resto vira `internal_error` com mensagem genérica.
- No corpo do erro, `requestId` é o id HTTP (emenda ao C11 em `docs/04-API-Conventions.md` §12); no log estruturado, o id HTTP é `correlationId`. Fora do envelope, `requestId` é o id da solicitação de negócio.
- Nunca devolva stack, SQL, path, nome de tabela ou versão interna.
- Use exceção para condição excepcional; validação de entrada retorna 400, não lança erro genérico.

```ts
export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly expose: boolean;

  constructor(
    code: string,
    status: number,
    message: string,
    options: { cause?: unknown; expose?: boolean } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.expose = options.expose ?? false;
  }
}
```

## 6. Entrada, validação e dados

**Sempre** valide na borda antes de usar o dado.

- `params`, `query`, `body` e headers relevantes passam por schema (Zod ou equivalente).
- Use `strictObject` para rejeitar campos desconhecidos e limite strings, arrays, números e profundidade.
- `safeParse` → 400 `validation_error` com detalhes por campo; `Content-Type` errado → 415.
- Mensagens de validação vêm de um catálogo pt-BR por campo; não use a mensagem default do Zod (inglês) nem um texto genérico para todos os campos.
- Normalize antes de comparar. Valide formato; não “sanitize” substituindo caracteres — encode na saída.
- Não faça mass assignment: mapeie os campos validados explicitamente para o input do domínio.
- SQL sempre parametrizado (`$1`, `?`); nunca interpole valor em string.
- Ordenação, colunas e filtros dinâmicos passam por allowlist.
- Transações para operações multi-tabela; timeout de query; paginação com limite máximo; nada de query sem limite.
- Evite N+1: carregue em lote ou use join/estratégia equivalente.
- Toda rota documentada no OpenAPI tem schema de request, quando houver, e de response explícito, com exemplos.
- Timestamps usam `z.iso.datetime()` (UTC) e datas puras usam `z.iso.date()`; serialize sempre em ISO.
- Exemplos no spec são obrigatórios e não podem conter PII.

```ts
const CreateUser = z.strictObject({
  email: z.email(),
  name: z.string().min(1).max(120),
});

const parsed = CreateUser.safeParse(req.body);
if (!parsed.success) {
  return res.status(400).json({
    error: {
      code: "validation_error",
      message: "Dados inválidos.",
      requestId: req.id,
      fields: parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: fieldMessage(i), // catálogo pt-BR por campo
      })),
    },
  });
}
```

## 7. Express

**Sempre** mantenha o handler fino: valide a entrada, chame o domínio e responda.

- Regra de negócio fica no domínio/serviço; middleware e handler orquestram.
- Express 5 encaminha rejeição async para o error handler; não adicione `express-async-errors`.
- Declare o 404 antes do error handler; o error handler tem quatro parâmetros e fica por último.
- Depois de `headersSent`, delegue com `next(err)`; não tente responder de novo.
- Tipar handlers evita `any`: `RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals>`; tipar `res.locals` com um `AppLocals` compartilhado.
- `req.query` é read-only no Express 5; copie/valide antes de usar.
- `req.params` e `req.query` são strings; converta e valide.
- Ordem mínima: contexto/logging antes das rotas; 404 antes do error handler.
- Use `res.status(...).json(...)`; não responda duas vezes.
- Metadados de rota (OpenAPI) ficam co-localizados em `*.openapi.ts` no domínio; o handler não define contrato.

```ts
const getUser: RequestHandler<{ id: string }, UserDto, never, never, AppLocals> = async (
  req,
  res,
) => {
  const user = await users.findById(req.params.id);
  res.status(200).json(user);
};
```

```ts
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  const appErr = toAppError(err);
  req.log.error({ err, code: appErr.code }, "falha ao processar requisição");

  res.status(appErr.status).json({
    error: {
      code: appErr.code,
      message: appErr.expose ? appErr.message : "Erro interno do servidor",
      requestId: req.id,
    },
  });
};
```

## 8. Segurança no código

**Sempre** autorize no servidor. CORS não é controle de acesso.

- Verifique permissão em toda operação sobre recurso; não confie em role/ID enviado pelo cliente.
- Não hardcode segredo, token, senha ou chave; não logue, não devolva em erro e não use em fixture.
- Não use `eval`, `new Function` ou `vm` com input; não use `child_process.exec` com interpolação; não acesse `fs` com path de usuário sem canonicalização e allowlist.
- SSRF: URL fornecida por usuário não escolhe host; use allowlist e timeout.
- XSS: API JSON; se gerar HTML, faça escaping e não interpole input em template sem escape.
- Prototype pollution: não faça merge recursivo de input não validado.
- PII não entra em log, erro, fixture ou resposta desnecessária.

## 9. Logging

**Sempre** use o logger da aplicação; `console.log` não é logging de produção.

- Log estruturado (JSON), com nível e campos estáveis.
- Header `x-request-id`: aceite só se for UUID válido; senão gere um; devolva no header.
- Logue método, rota, status, duração e correlation ID (`correlationId`). Não logue body por default.
- `correlationId` é o mesmo id HTTP do header `x-request-id`; no corpo do erro ele mantém o nome `requestId` por compatibilidade (ver §5).
- Redija `authorization`, `cookie`, `set-cookie`, `password`, `token` e `secret`.
- Não logue PII.
- Logue a causa do erro uma vez, na borda; não faça log-and-rethrow.
- Campos, não concatenação: `logger.info({ userId }, "user loaded")`.

## 10. Testes

**Sempre** teste comportamento, não implementação.

- `describe("POST /api/v1/users")` + `it("retorna 400 quando o e-mail é inválido")`.
- Um comportamento por teste; arrange-act-assert; evite múltiplos `expect` não relacionados.
- Injete clock, ID e RNG; não use `Date.now()`, `new Date()` ou `Math.random()` no domínio.
- Sem `sleep`; use fake timers e aguarde sinais/promessas.
- Unit sem I/O; integração nas fronteiras (HTTP, banco, fila). Sem estado global compartilhado; recrie deps em `beforeEach`.
- Sem rede real; use fakes ou mock de rede. Prefira fake em memória a `vi.mock`; mock só do que é lento/indeterminístico/externo.
- Teste HTTP contra a instância da aplicação, sem `listen` fixo.
- Cubra caminhos de erro e regras de negócio; não persiga cobertura.
- Fixtures com builders e defaults seguros; sem PII ou dado real.
- Testes de contrato validam respostas representativas contra `openapi/openapi.json`.

```ts
describe("POST /api/v1/users", () => {
  it("retorna 400 quando o e-mail é inválido", async () => {
    const res = await request(app).post("/api/v1/users").send({ email: "x" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });
});
```

## 11. Comentários e código morto

- Comentário explica **por que**, não **o que**. Se o código não é óbvio, primeiro tente nomes e estrutura melhores.
- JSDoc em contratos públicos quando parâmetros, retorno ou erros não forem óbvios.
- TODO com referência: `// TODO(#123): ...`. Sem TODO anônimo.
- Remova comentário obsoleto junto com o código que ele descreve.
- Não deixe código comentado; use o histórico do Git.
- Não comente código óbvio.

## 12. Checklist de code review

- [ ] Nomes revelam intenção; sem abreviação vaga.
- [ ] Sem `any`; `unknown` na borda; sem assertion sem validação.
- [ ] Funções pequenas, retorno cedo, sem trabalho síncrono pesado.
- [ ] Promises tratadas; sem floating promise; timeouts em chamadas externas.
- [ ] Erros tipados com `cause`; sem swallow; sem stack/PII na resposta.
- [ ] Entrada validada; SQL parametrizado; autorização no servidor.
- [ ] Sem segredo/PII em código, log ou fixture; sem `eval`/`exec` com input.
- [ ] Logs estruturados, com `correlationId` e redaction.
- [ ] Testes cobrem comportamento e caminhos de erro; determinísticos e isolados.
- [ ] Sem N+1, query sem limite ou payload sem paginação.
- [ ] Comentários explicam o porquê; sem código morto.
- [ ] Schema alterado? `docs/03-Data-Model.md` e os derivados `docs/db/02-reference.md`, `docs/db/03-erd.md` e `docs/db/schema.dbml` foram atualizados no mesmo PR.
- [ ] Rota alterada? `*.openapi.ts` e `openapi/openapi.json` atualizados (via `docs:generate`, quando o script existir); `docs:check` verde quando disponível.
- [ ] Exemplos no spec sem PII.
- [ ] Exceções a este documento registradas no PR.

## Referências

- Node.js — [ESM](https://nodejs.org/docs/latest-v24.x/api/esm.html) · [packages](https://nodejs.org/docs/latest-v24.x/api/packages.html)
- TypeScript — [Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) · [Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- Express — [Error handling](https://expressjs.com/en/guide/error-handling.html) · [Migrating 5](https://expressjs.com/en/guide/migrating-5.html)
- OWASP — [Node.js Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html) · [ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- Testes — [Vitest guide](https://vitest.dev/guide/) · [Supertest](https://github.com/ladjs/supertest)
