# Backend Architecture

## 1. Objective

Este documento define como as partes do backend MAAT se relacionam e qual é a responsabilidade de cada camada.

A arquitetura separa:

- **HTTP** (rotas, controllers, middlewares);
- **regras de aplicação** (services);
- **persistência** (repositories, Knex);
- **infraestrutura** (banco, log, configuração, criptografia).

O objetivo é manter a estrutura modular, com dependências explícitas e banco de dados substituível, sem criar camadas que não paguem o custo de existir.

Documentos relacionados: [`01-Overview.md`](./01-Overview.md) (contexto), [`../GLOSSARY.md`](../GLOSSARY.md) (vocabulário), [`adr/`](./adr/) (decisões).

---

## 2. Guiding Principles

**P1 — O domínio é a unidade de modularização.**
O código é organizado por domínio (`requests`, `triage`, `audit`…), não por camada técnica. Tudo que pertence a um domínio — rotas, controller, service, repository, schemas — vive na pasta dele.

**P2 — Dependências apontam para dentro.**
`core` não conhece ninguém. `domains` conhecem `core`. `platform` conhece `core`. Só o *composition root* conhece todos.

**P3 — Portas e adaptadores nas bordas.**
Regras de negócio nunca conhecem Knex, Express ou `fetch`. A infraestrutura é injetada por trás de interfaces.

**P4 — Injeção por construtor, sem framework.**
Toda dependência chega pelo construtor. Não há container de injeção, decorator ou registro global.

**P5 — Persistência portátil.**
O SQL é escrito com o subset portátil do query builder. Detalhe específico de engine vive isolado em um `Dialect`.

**P6 — A borda fala HTTP; o domínio fala regra.**
Controller traduz requisição em chamada de serviço e resposta em HTTP. Service decide. Repository persiste.

**P7 — Uma transação, um dono.**
Só a camada de serviço abre transação. Repositório nunca abre e nunca recebe `trx` como parâmetro.

**P8 — Auditoria acompanha a mudança.**
Toda alteração relevante publica um evento; a auditoria é gravada na mesma transação da alteração que a originou.

---

## 3. Naming

O domínio fala português; o código fala inglês. A conversão é fixa e vale para identificadores, arquivos, tabelas e colunas.

| Conceito (`GLOSSARY.md`) | Identificador técnico |
| --- | --- |
| Solicitação | `request` |
| Protocolo | `protocol` |
| Solicitante | `requester` |
| Anexo | `attachment` |
| Fila | `queue` |
| Triagem | `triage` |
| Mapeamento | `mapping` |
| Priorização | `prioritization` |
| Pendência | `pending-item` |
| Nota interna | `internal-note` |
| Auditoria | `audit` |
| Perfil | `profile` |
| Responsável | `assignee` |
| Modo de acesso | `access-mode` |

Valores de domínio (status, prioridades, vereditos) permanecem em português, porque são exibidos ao usuário e gravados como dado de negócio.

---

## 4. Directory Structure

```text
src/
├── server.ts                  # bootstrap: config → container → app.listen
├── app.ts                     # montagem do Express a partir do container
├── container.ts               # composition root: monta e conecta tudo
│
├── core/                      # kernel — não conhece domains nem platform
│   ├── errors/                # AppError, DomainError, mapeamento HTTP
│   ├── http/                  # BaseController, HttpContext, envelopes
│   ├── service/               # BaseService, Clock, IdGenerator, Logger
│   ├── repository/            # BaseRepository, Database, Dialect, TransactionManager
│   ├── authorization/         # permissões, perfis, AuthorizationService
│   ├── events/                # DomainEvent, DomainEventPublisher
│   ├── pagination/            # PageQuery, Page
│   └── actor.ts               # quem está agindo na requisição
│
├── platform/                  # adaptadores concretos — conhecem core
│   ├── database/              # KnexDatabase, Dialect, TransactionManager
│   ├── http/                  # middlewares: request-id, auth, access-mode, erro
│   ├── events/                # publicador de eventos em memória
│   ├── logging/               # adapter do logger
│   ├── crypto/                # hash de senha, gerador de protocolo
│   └── config/                # leitura e validação de ambiente
│
└── domains/
    ├── auth/
    │   ├── index.ts            # createAuthModule(deps) → { router, service }
    │   ├── auth.router.ts
    │   ├── auth.controller.ts
    │   ├── auth.service.ts
    │   ├── auth.repository.ts
    │   ├── auth.port.ts        # interface publicada
    │   ├── auth.schema.ts      # schemas Zod
    │   ├── auth.types.ts
    │   └── schema/             # definição knex das tabelas
    ├── users/
    ├── requests/
    ├── triage/
    ├── mapping/
    ├── queue/
    ├── prioritization/
    ├── pending-items/
    ├── internal-notes/
    ├── audit/
    ├── reports/
    └── portal-config/

migrations/<domain>/            # migrações donas por cada domínio
seeds/<domain>/                # seeds donos por cada domínio
knexfile.ts
```

> Pastas e arquivos são criados conforme a necessidade. Um domínio não precisa ter todos os arquivos listados: um domínio sem auditoria não tem `schema/`, um domínio sem rotas públicas não precisa de subpastas.

---

## 5. Domain Catalog

| Domínio | Responsabilidade | Tabelas (previsão) | Portas publicadas |
| --- | --- | --- | --- |
| `auth` | Login, logout, sessão, troca de senha | credenciais, sessões | `AuthReader` |
| `users` | Cadastro, perfil, estado, avatar | usuários, perfis | `UserReader` |
| `requests` | Ciclo de vida da solicitação, protocolo, anexos, status | solicitações, solicitantes, categorias, status, anexos | `RequestReader` |
| `triage` | Triagem: aderência, escopo, veredito | triagens | `TriageReader` |
| `mapping` | Sessão de mapeamento, participantes, agenda | mapeamentos, participantes | `MappingReader` |
| `queue` | Fila centralizada e métricas | — (lê de `requests`) | `QueueReader` |
| `prioritization` | Critérios, pesos, pontuação | critérios, priorizações | `PrioritizationReader` |
| `pending-items` | Pendências de campo e de observação | pendências, respostas | `PendingItemReader` |
| `internal-notes` | Notas internas e linha do tempo | notas internas, estados de leitura | `InternalNoteReader` |
| `audit` | Trilha de auditoria imutável | auditoria | `AuditReader` |
| `reports` | Dashboard, métricas, exportações | — (lê de vários domínios) | — |
| `portal-config` | Configuração do portal, temas, modo de acesso | configurações, temas | `PortalConfigReader` |

Regras do catálogo:

- **Um domínio é dono das suas tabelas.** Nenhum outro domínio escreve nelas.
- **`queue` e `reports` não têm tabelas.** São projeções de leitura sobre outros domínios e consomem as portas publicadas por eles.
- **Toda porta publicada é um contrato de leitura.** O acesso de escrita entre domínios não existe: quem escreve é o dono da tabela.

---

## 6. Layer Responsibilities

| Camada | Responsabilidade | Não pode |
| --- | --- | --- |
| Router | Montar endpoints, aplicar middleware, vincular handlers | Ter regra de negócio, tocar no banco |
| Controller | Validar entrada, extrair o ator, chamar o service, formatar a resposta | Decidir regra, montar SQL, abrir transação |
| Service | Orquestrar o caso de uso, aplicar regra, autorizar, abrir transação, publicar evento | Conhecer Express, construir SQL |
| Repository | Ler e escrever as tabelas do domínio, mapear linha em entidade | Ter regra de negócio, abrir transação, conhecer HTTP |
| Database | Persistir, garantir constraints, transacionar | — |

O fluxo de uma requisição:

```text
Request
   ↓  middleware (request-id, autenticação, modo de acesso)
Router
   ↓
Controller  ── valida com schema Zod
   ↓
Service     ── regra, autorização, transação, evento
   ↓
Repository  ── Knex
   ↓
Database
```

O retorno percorre o caminho inverso, e o erro é traduzido **uma única vez**, na borda.

---

## 7. Base Classes

As três classes base existem para concentração de comportamento compartilhado. Elas são profundas: escondem muita coisa atrás de uma interface pequena. Uma classe de domínio **herda** da base correspondente quando usa esse comportamento.

### 7.1 BaseController

Resolve: o contrato de resposta HTTP (envelope de erro, envelope de paginação, status code) e a tradução de requisição em contexto.

```ts
// src/core/http/http-context.ts
export interface HttpContext {
  readonly request: {
    readonly body: unknown;
    readonly params: Readonly<Record<string, string>>;
    readonly query: Readonly<Record<string, unknown>>;
    readonly headers: Readonly<Record<string, string | undefined>>;
  };
  readonly actor: Actor;
  readonly requestId: string;
  readonly ok: (body: unknown) => void;
  readonly created: (body: unknown) => void;
  readonly noContent: () => void;
  readonly paginated: (page: Page<unknown>) => void;
  readonly fail: (error: unknown) => void;
}
```

```ts
// src/core/http/base-controller.ts
export abstract class BaseController {
  protected constructor(protected readonly logger: Logger) {}

  protected context(req: Request, res: Response): HttpContext {
    // ...
  }
}
```

Um controller de domínio declara apenas seus endpoints:

```ts
// src/domains/requests/requests.controller.ts
export class RequestController extends BaseController {
  constructor(
    logger: Logger,
    private readonly requests: RequestService,
  ) {
    super(logger);
  }

  async show(req: Request, res: Response): Promise<void> {
    const ctx = this.context(req, res);
    const request = await this.requests.findByProtocol(ctx.request.params.protocol);
    ctx.ok(request);
  }
}
```

### 7.2 BaseService

Resolve: as dependências transversais de um caso de uso (log, relógio, gerador de id, transações) e as asserções que se repetem em todo serviço.

```ts
// src/core/service/base-service.ts
export interface ServiceDependencies {
  readonly logger: Logger;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly transactions: TransactionManager;
}

export abstract class BaseService {
  protected readonly logger: Logger;
  protected readonly clock: Clock;
  protected readonly ids: IdGenerator;
  private readonly transactions: TransactionManager;

  protected constructor(dependencies: ServiceDependencies) {
    this.logger = dependencies.logger;
    this.clock = dependencies.clock;
    this.ids = dependencies.ids;
    this.transactions = dependencies.transactions;
  }

  protected runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    return this.transactions.run(work);
  }

  protected assert(condition: boolean, error: AppError): asserts condition {
    if (!condition) throw error;
  }

  protected notFound(entity: string, id: string): AppError {
    return new AppError("not_found", 404, `${entity} não encontrado.`, { expose: true });
  }
}
```

### 7.3 BaseRepository

Resolve: o trabalho repetitivo de falar com Knex — tabela, mapeamento de linha, paginação, soft delete — e a propagação da transação corrente.

```ts
// src/core/repository/base-repository.ts
export interface RepositoryDependencies {
  readonly database: Database;
  readonly logger: Logger;
}

export abstract class BaseRepository<TEntity, TRow> {
  protected readonly database: Database;
  protected readonly logger: Logger;
  protected abstract readonly tableName: string;

  protected constructor(dependencies: RepositoryDependencies) {
    this.database = dependencies.database;
    this.logger = dependencies.logger;
  }

  protected abstract toEntity(row: TRow): TEntity;

  protected async findById(id: string): Promise<TEntity | null> { /* ... */ }
  protected async paginate(query: PageQuery): Promise<Page<TEntity>> { /* ... */ }
  protected async insertOne(values: Record<string, unknown>): Promise<TEntity> { /* ... */ }
}
```

O repositório **nunca** recebe `trx` como parâmetro e **nunca** abre transação. Ele usa `this.database.client`, que já aponta para a transação corrente quando existe (ver [§ Transações](#11-transactions)).

### 7.4 Regra de herança

> _domain_ **herda** da classe base quando usa o comportamento dela. Não existe "classe base obrigatória": uma classe que não usa nada da base é um passe-through e deve ser eliminada, não herdada.

Na prática, quase todo controller, service e repository usa a base — o motivo é que o comportamento compartilhado é grande. A regra existe para que a herança não vire coleta de métodos herdados sem uso.

---

## 8. Dependency Injection

Não há container de injeção, decorator ou registro global. A injeção é por construtor, e a montagem é explícita.

### 8.1 O composition root

`src/container.ts` é o **único** arquivo que sabe quais implementações concretas existem.

```ts
// src/container.ts
export interface Container {
  readonly config: Config;
  readonly logger: Logger;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly database: Database;
  readonly events: DomainEventPublisher;
  readonly authorization: AuthorizationService;
  readonly modules: {
    readonly auth: AuthModule;
    readonly users: UsersModule;
    readonly requests: RequestsModule;
    // ...
  };
}

export function createContainer(config: Config): Container {
  const logger = createLogger(config);
  const database = createDatabase(config);
  const clock = new SystemClock();
  const ids = new UuidGenerator();
  const events = new InMemoryDomainEventPublisher();
  const authorization = new StaticAuthorizationService();

  const modules = {
    auth: createAuthModule({ database, logger, clock, ids, events, authorization }),
    // ...
  };

  return { config, logger, clock, ids, database, events, authorization, modules };
}
```

### 8.2 Fábrica de módulo

Cada domínio expõe uma fábrica que recebe as dependências e devolve o que a aplicação precisa montar.

```ts
// src/domains/requests/index.ts
export interface RequestsModule {
  readonly router: Router;
  readonly service: RequestService;
}

export function createRequestsModule(
  dependencies: RequestsModuleDependencies,
): RequestsModule {
  const repository = new RequestRepository({
    database: dependencies.database,
    logger: dependencies.logger,
  });

  const service = new RequestService({ ...dependencies, repository });
  const controller = new RequestController(dependencies.logger, service);
  const router = createRequestRouter(controller);

  return { router, service };
}
```

### 8.3 Ciclo de vida

- Adaptadores (`database`, `logger`, `clock`, `ids`) são **singletons** — criados uma vez no boot.
- Services e repositories são **singletons** — são sem estado; o estado do caso de uso vive nas variáveis locais e no contexto da requisição.
- Controllers são **singletons** — idem, sem estado.
- Só o que depende da requisição (o `HttpContext`) é criado por requisição.

### 8.4 Dependências entre domínios

Um domínio **nunca** importa o repositório, o service ou o controller de outro domínio. Quando precisa de dados de outro domínio, consome a **porta publicada** por ele:

```ts
// src/domains/queue/queue.service.ts
import type { RequestReader } from "../requests/requests.port.js";

export class QueueService extends BaseService {
  constructor(
    dependencies: QueueServiceDependencies,
    private readonly requests: RequestReader,
  ) {
    super(dependencies);
  }
}
```

O import é de **tipo**. A implementação nunca atravessa a fronteira.

### 8.5 Ciclos

Um ciclo entre domínios não se resolve com injeção de dependência: se A depende de B e B depende de A, qualquer ordem de construção falha. Ciclos se quebram com **eventos de domínio** (ver [§ Domain Events](#9-domain-events)) ou com portas publishadas que não dependem do outro lado.

---

## 9. Domain Events

### 9.1 O que é

Um evento de domínio é um fato já ocorrido, com um payload imutável e autocontido. Eventos são a forma de um domínio avisar outro sem conhecer o outro.

```ts
// src/core/events/domain-event.ts
export interface DomainEvent<TPayload> {
  readonly name: string;
  readonly occurredAt: Date;
  readonly payload: TPayload;
}

export interface DomainEventPublisher {
  publish<TPayload>(event: DomainEvent<TPayload>): Promise<void>;
  subscribe<TPayload>(
    name: string,
    handler: (event: DomainEvent<TPayload>) => Promise<void>,
  ): void;
}
```

### 9.2 Regras

- **O payload é um snapshot, nunca uma referência a entidade.** `RequestStatusChanged` carrega `requestId`, origem, destino e autor — não o objeto `Request`. Sem isso, o consumidor puxa o agregado de volta e o ciclo nasce.
- **A publicação acontece dentro da transação.** O evento é emitido durante o caso de uso, e quem o consome escreve na mesma transação.
- **A entrega é síncrona e awaited.** O publicador percorre os assinantes e aguarda cada um. Sem fila, sem `setImmediate`, sem retry assíncrono: um handler que falha aborta a transação.
- **Eventos são fatos, não comandos.** O nome descreve o que aconteceu (`request.status_changed`), nunca o que deve ser feito.

### 9.3 Auditoria orientada a evento

A auditoria é o primeiro consumidor de eventos. O domínio que causa a alteração publica; o domínio de auditoria assina e grava.

```ts
// src/domains/audit/index.ts
export function createAuditModule(
  dependencies: AuditModuleDependencies,
): AuditModule {
  const repository = new AuditRepository({
    database: dependencies.database,
    logger: dependencies.logger,
  });
  const service = new AuditService({ ...dependencies, repository });

  dependencies.events.subscribe("request.status_changed", (event) =>
    service.recordStatusChange(event.payload),
  );

  return { router: createAuditRouter(service), service };
}
```

Por que assim e não uma chamada explícita:

- o domínio que altera **não conhece** o domínio de auditoria — a dependência é de mão única;
- a escrita de auditoria acontece na transação do emitente porque o handler roda inline dentro dela;
- falha do handler de auditoria **desfaz a alteração** — auditoria é obrigatória, não best-effort.

---

## 10. Persistence with Knex

### 10.1 A porta `Database`

O repositório fala com a porta `Database`, não com o Knex diretamente.

```ts
// src/core/repository/database.ts
export interface Database {
  /** Handle de consulta ativo: a transação em curso, quando existir. */
  readonly client: Knex;
  readonly dialect: Dialect;
  destroy(): Promise<void>;
}

// src/core/repository/transaction-manager.ts
export interface TransactionManager {
  run<T>(work: () => Promise<T>): Promise<T>;
}
```

`KnexDatabase` (`src/platform/database/knex-database.ts`) é o adapter que implementa as duas portas. Trocar a engine significa trocar o `client` do Knex e o `Dialect` — nenhum repositório muda.

```ts
const database = createDatabase(config);
// config.database.client === "postgres" → KnexDatabase com PostgresDialect
// config.database.client === "sqlite"   → KnexDatabase com SqliteDialect
```

### 10.2 O `Dialect`

O `Dialect` isola tudo que é específico de uma engine.

```ts
// src/core/repository/dialect.ts
export interface Dialect {
  readonly name: "postgres" | "sqlite" | "mysql";
  uuidType(): string;
  jsonType(): string;
  timestampType(): string;
  booleanType(): string;
  supportsReturning(): boolean;
  supportsRowLocks(): boolean;
  supportsUpsertMerge(): boolean;
}
```

Implementações: `PostgresDialect`, `SqliteDialect`, `MySqlDialect`.

### 10.3 Regras de portabilidade

Estas regras são o que torna a troca de banco uma realidade e não uma intenção:

| Regra | Porquê |
| --- | --- |
| Repositório usa **apenas o query builder** do Knex | `db.raw()` é proibido fora de `Dialect` |
| **Sem `db.raw()`** em repositório | SQL literal quebra em outra engine |
| **IDs gerados pela aplicação** (`crypto.randomUUID()`) | Elimina `nextval()`, `::uuid`, sequences e colunas `serial` |
| **Sem tipo `ENUM`** | Use `text` com constraint de check ou tabela de lookup |
| **Sem coluna `ARRAY`** | Use tabela filha (`mapping_participants`, `attachments`) |
| **Sem `tsvector` / full-text search do Postgres** | Use `like`/`ilike` ou índice dedicado |
| **Sem `COUNT(*) FILTER (WHERE …)`** | Reescreva com agregação condicional via query builder |
| **Booleanos** via `dialect.booleanType()` | Postgres `boolean`, MySQL `tinyint(1)`, SQLite inteiro |
| **JSON** via `dialect.jsonType()` | Postgres `jsonb`, MySQL `json`, SQLite `text` |
| **Timestamp** via `dialect.timestampType()` | `timestamptz` vs `datetime` |
| **Row lock** (`forUpdate`) só onde `dialect.supportsRowLocks()` | SQLite não bloqueia linha |
| **Toda consulta tem limite** | `paginate` exige `pageSize` máximo; nunca há query sem `limit` |

### 10.4 Identificadores

Toda chave primária é um **UUID v4 gerado pela aplicação**, via a porta `IdGenerator`.

```ts
export interface IdGenerator {
  next(): string;
}
```

Consequências:

- o schema não depende de sequence, `serial` ou `auto_increment`;
- o id é conhecido **antes** do insert — o protocolo pode ser calculado na mesma viagem;
- a chave é opaca e não revela volume de dados.

### 10.5 Protocolo

O protocolo é o código público que o solicitante usa para acompanhar a solicitação. Ele precisa ser curto, não enumerável e estável.

A proposta é derivá-lo do id por HMAC, não por cifra de Feistel sobre inteiro:

```ts
// src/platform/crypto/hmac-protocol-generator.ts
export class HmacProtocolGenerator implements ProtocolGenerator {
  generate(entityId: string): string {
    const digest = createHmac("sha256", this.secret).update(entityId).digest();
    const code = encodeBase32(digest, PROTOCOL_LENGTH);
    return `${PROTOCOL_PREFIX}-${code.slice(0, 4)}-${code.slice(4)}`;
  }
}
```

Propriedades:

- **não enumerável** — sem segredo não se sai do id;
- **independente da engine** — não precisa de sequence nem de inteiro;
- **formato preservado** — `MAAT-XXXX-XXXX`, o mesmo que o frontend já valida;
- **40 bits de espaço** — colisões são possíveis em volume alto, então `protocol` tem constraint `UNIQUE` e o repositório tenta novamente (limite de três) antes de falhar com `protocol_collision`.

### 10.6 Paginação

Toda listagem devolve o envelope que o frontend já consome:

```json
{ "data": [], "page": 1, "pageSize": 20, "total": 0, "totalPages": 0 }
```

`pageSize` tem limite máximo definido em `core/pagination`; nenhum repositório consulta sem `limit`.

---

## 11. Transactions

### 11.1 Uma transação, um dono

**Só a camada de serviço abre transação.** Repositório nunca abre e nunca recebe `trx` como parâmetro. Essa é a regra que elimina o principal defeito do backend legado, onde serviços e repositórios abriam transações ao mesmo tempo e o escopo real da transação ficava indefinido.

```ts
// src/domains/requests/requests.service.ts
async changeStatus(input: ChangeStatusInput): Promise<void> {
  await this.runInTransaction(async () => {
    const request = await this.repository.findById(input.requestId);
    this.assert(request !== null, this.notFound("Solicitação", input.requestId));

    await this.repository.updateStatus(request, input.statusId);
    await this.events.publish({
      name: "request.status_changed",
      occurredAt: this.clock.now(),
      payload: { requestId: request.id, from: request.statusId, to: input.statusId, actorId: input.actorId },
    });
  });
}
```

### 11.2 Transação implícita

O `TransactionManager` usa `AsyncLocalStorage` para propagar a transação corrente sem poluir a assinatura de cada método.

```ts
// src/platform/database/knex-database.ts
export class KnexDatabase implements Database, TransactionManager {
  private readonly scope = new AsyncLocalStorage<Knex>();

  get client(): Knex {
    return this.scope.getStore() ?? this.knex;
  }

  async run<T>(work: () => Promise<T>): Promise<T> {
    const current = this.scope.getStore();
    if (current) {
      return current.transaction((nested) => this.scope.run(nested, work));
    }
    return this.knex.transaction((trx) => this.scope.run(trx, work));
  }
}
```

Efeito: dentro de `runInTransaction`, qualquer repositório chamado — inclusive de outro domínio — usa a mesma transação, sem que nenhum deles saiba que ela existe. Transação aninhada vira savepoint.

### 11.3 O que deve estar na mesma transação

- A alteração de negócio e o registro de auditoria que a descreve.
- Alterações em tabelas diferentes que descrevem o mesmo fato.
- O registro de evento e o efeito que o evento descreve.

### 11.4 O que não deve estar

- Chamada HTTP externa, e-mail ou upload de arquivo.
- Leitura usada apenas para montar log.
- Qualquer coisa que possa demorar mais que o timeout da transação.

---

## 12. Errors

### 12.1 Tipos

| Tipo | Quando | Conhece HTTP |
| --- | --- | --- |
| `DomainError` | Regra de negócio violada | Não |
| `AppError` | Erro de aplicação com código e status estáveis | Sim |
| `Error` comum | Falha inesperada | Não |

```ts
// src/core/errors/app-error.ts
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

### 12.2 Códigos estáveis

Todo erro exposto tem um `code` em `snake_case`, estável entre versões. O `code` é o que o frontend deve usar para decidir comportamento; a `message` é para o humano e pode mudar.

Registro canônico em `core/errors/error-codes.ts`: `validation_error`, `not_found`, `conflict`, `unauthorized`, `forbidden`, `protocol_collision`, `internal_error`.

### 12.3 Mapeamento

Erro de domínio não conhece status HTTP. O mapeamento acontece **uma vez**, na borda:

```ts
// src/core/http/error-mapper.ts
const STATUS_BY_CODE: Readonly<Record<string, number>> = {
  validation_error: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  protocol_collision: 409,
  internal_error: 500,
};
```

### 12.4 Envelope de resposta

O contrato vigente com o frontend é o do backend legado:

```json
{ "status": "error", "statusCode": 404, "message": "Solicitação não encontrada." }
```

Esse envelope é **temporário**. O `CODING_STANDARDS.md` define `{ "error": { "code", "message", "requestId" } }`, que é melhor (código estável, correlação por request) e deve ser adotado em uma migração coordenada com o frontend — o cliente atual lê `body.message || body.error` e passaria a exibir `[object Object]`. Ver [ADR-0005](./adr/0005-legacy-error-envelope-temporary.md).

### 12.5 Exposição

- `expose: true` → a mensagem vai para o cliente.
- `expose: false` (padrão) → o cliente recebe `internal_error` com mensagem genérica.
- Stack, SQL, nome de tabela, path e versão interna **nunca** saem do servidor.
- A causa é registrada **uma vez**, na borda. Camada interna não faz log-and-rethrow.

---

## 13. Validation and the Border

Tudo que entra pela borda é `unknown` até ser validado.

```ts
// src/domains/requests/requests.schema.ts
export const CreateRequest = z.strictObject({
  demand: z.strictObject({
    title: z.string().min(1).max(180),
    description: z.string().min(1).max(5000),
  }),
  requester: z.strictObject({
    fullName: z.string().min(1).max(120),
    corporateEmail: z.email().max(180),
  }),
});
```

Regras:

- `strictObject` rejeita campo desconhecido.
- O controller valida e repassa ao service **um objeto tipado**, nunca o `req.body` cru.
- Não há *mass assignment*: o service mapeia explicitamente os campos validados para a operação.
- Erro de validação responde `400` com `code: "validation_error"`.
- `Content-Type` diferente do esperado responde `415`.

---

## 14. Authentication and Authorization

### 14.1 Sessão

Login emite JWT em cookie `HttpOnly`. A cada requisição, o middleware:

1. valida a assinatura e a expiração;
2. relê usuário e perfil no banco (desativação e mudança de perfil valem na hora);
3. compara `password_changed_at` com o do token — senha trocada invalida sessões antigas;
4. monta o `Actor` e o coloca em `res.locals`.

### 14.2 Atores

```ts
// src/core/actor.ts
export type Actor =
  | { readonly kind: "authenticated"; readonly userId: string; readonly profile: Profile }
  | { readonly kind: "requester"; readonly name: string; readonly email: string }
  | { readonly kind: "anonymous" };
```

O terceiro tipo cobre o fluxo público: o header `X-Requester-Identity` identifica o solicitante sem sessão, usado no acompanhamento por protocolo e nas pendências.

### 14.3 Perfis

Cinco perfis, com hierarquia:

```text
Admin Root
   └── Administrador
         └── Gestor
               └── Analista
Solicitante  (ator externo, fora da hierarquia)
```

- **Solicitante** — abre e acompanha solicitações.
- **Analista** — tria, mapeia, prioriza; é o **Responsável** quando designado.
- **Gestor** — leitura sobre as áreas internas.
- **Administrador** — gerencia usuários, conteúdo e configuração; não gerencia outros Administradores.
- **Admin Root** — todas as permissões; gerencia Administradores. Existe apenas no seed; nunca há auto-registro.

### 14.4 Autorização

A autorização é uma **matriz em código**, atrás de uma interface — a costura que vai receber o RBAC configurável no futuro.

```ts
// src/core/authorization/authorization-service.ts
export interface AuthorizationService {
  can(actor: Actor, permission: Permission): boolean;
  assert(actor: Actor, permission: Permission): void;
}
```

- **Nível de rota**: gate grosso por perfil, no middleware.
- **Nível de serviço**: regra fina sobre o recurso — é aqui que mora a autorização de verdade (o solicitante só vê a própria solicitação; o Responsável atua sobre a que lhe foi designada).
- A verificação fina fica **em um lugar só** por domínio, não duplicada em seis arquivos.

Ver [ADR-0006](./adr/0006-static-profile-authorization.md).

---

## 15. Routing and Application Assembly

```ts
// src/app.ts
export function createApp(container: Container): Express {
  const app = express();

  app.use(requestIdMiddleware);
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(cors({ origin: config.cors.origins, credentials: true }));

  app.use("/api/v1/auth", container.modules.auth.router);
  app.use("/api/v1/requests", container.modules.requests.router);
  // ...

  app.use(notFoundHandler);
  app.use(errorHandler); // quatro parâmetros, sempre por último
  return app;
}
```

Regras:

- o 404 vem antes do error handler;
- o error handler tem quatro parâmetros e é o último middleware;
- depois de `headersSent`, o handler delega com `next(err)` e não responde de novo;
- `app.ts` não cria dependência — ele recebe o `Container` pronto. Isso permite montar a aplicação em teste sem subir servidor.

---

## 16. Configuration

A configuração é lida e validada **no boot**. Aplicação com configuração inválida não sobe.

```ts
// src/platform/config/environment.ts
const Environment = z.strictObject({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().int().positive(),
  DATABASE: z.strictObject({
    CLIENT: z.enum(["postgres", "sqlite", "mysql"]),
    HOST: z.string(),
    PORT: z.coerce.number().int().positive(),
    NAME: z.string(),
    USER: z.string(),
    PASSWORD: z.string(),
  }),
  JWT_SECRET: z.string().min(32),
  PROTOCOL_SECRET: z.string().min(32),
});
```

- Segredo ausente ou curto demais derruba o boot em produção.
- `.env.example` documenta as variáveis; segredo nunca vai para o repositório.
- Nenhum `process.env` fora de `platform/config`.

---

## 17. Logging

O logger é um adapter (`platform/logging`) por trás de uma porta em `core/service`.

Regras:

- log estruturado em JSON, com nível e campos estáveis — nunca `console.log`;
- **request id** em todo log, aceito do header `x-request-id` apenas se for UUID válido, gerado caso contrário, e devolvido na resposta;
- campos, não concatenação: `logger.info({ requestId, userId }, "request loaded")`;
- redação de `authorization`, `cookie`, `set-cookie`, `password`, `token` e `secret`;
- PII não entra em log;
- a causa de um erro é logada **uma vez**, na borda;
- método, rota, status e duração em todo log de requisição.

---

## 18. Testability Seams

A arquitetura já expõe as costuras que a suíte de testes vai usar quando ela existir. Hoje **não há camada de testes** — a decisão é adiada, não as costuras.

| Seam | Interface | Por quê |
| --- | --- | --- |
| Relógio | `Clock` | `Date.now()` nunca é chamado direto no domínio |
| Identificador | `IdGenerator` | Id previsível em teste |
| Protocolo | `ProtocolGenerator` | Protocolo estável em teste |
| Persistência | `Database` | Adapter em memória sem banco real |
| Autorização | `AuthorizationService` | Cenário de permissão sem banco |
| Eventos | `DomainEventPublisher` | Assert sobre evento publicado |
| HTTP | `HttpContext` | Controller testável sem subir servidor |

Com `Clock` e `IdGenerator` injetados, o domínio é determinístico: nada de `Math.random()`, `new Date()` ou `Date.now()` dentro de regra de negócio.

---

## 19. Allowed Dependencies

```text
core      → (nenhuma dependência interna)
domains   → core
domains   → outro domain: apenas via port publicada (import de tipo)
platform  → core
container → core + platform + domains
```

Proibições:

- `core` **nunca** importa de `domains` ou `platform`;
- `domains` **nunca** importa de `platform` — a implementação concreta do adapter entra pelo container;
- um domínio **nunca** importa repositório, service ou controller de outro domínio;
- `platform` **nunca** importa de `domains`;
- `app.ts` e `server.ts` **nunca** criam dependência — eles consomem o `Container`.

---

## 20. Anti-Patterns

Os padrões abaixo são os que o backend legado usa e que esta arquitetura existe para não repetir.

| Padrão | Por que é problema | O que fazer |
| --- | --- | --- |
| `import { db } from "../database/conexion.js"` dentro de um service | Dependência implícita, banco travado, nada testável | Injetar `Database` pelo construtor |
| Regra de negócio dentro do repository | Repositório deixa de ser persistência e vira regra sem lugar de teste | Regra no service; repositório só lê e escreve |
| Regra de negócio dentro do controller | Regra não é testável sem HTTP | Regra no service |
| `trx` como parâmetro em todo método de repositório | Ruído em todas as assinaturas | Transação implícita por `TransactionManager` |
| Service **e** repository abrindo transação | Escopo de transação indefinido | Só o service abre |
| `db.raw()` espalhado em repositório | SQL não portável | `Dialect` ou query builder |
| `catch { return [] }` | Erro de banco virando "não tem resultado" | Deixar o erro subir; tratar no service |
| `switch` gigante mapeando coluna por campo | Regressão ao adicionar campo | Mapeamento por repositório, colunas por constante |
| String de erro repetida (`"INSUFFICIENT_ROLE_PERMISSIONS"`) | Código sem registro, divaga | Registro em `error-codes.ts` |
| Constante de status declarada em dois lugares | Divergência silenciosa | Uma fonte, importada pelas duas |
| `console.log` em produção | Sem correlação, sem redação | Logger da aplicação |
| DTOs de todos os domínios em uma pasta compartilhada | Dependência entre domínios por conveniência | DTO no próprio domínio |
| Pasta com dois domínios dentro | Fronteira invisível | Um domínio por pasta |
| `db.schema.hasColumn()` no caminho da requisição | Query extra por request, herança de migration em produção | Schema explícito, versionado |

---

## 21. General Rules

- [ ] O código pertence a um domínio; nada vive em pasta transversal por conveniência.
- [ ] Toda dependência externa chega pelo construtor.
- [ ] Nenhum import de `platform` dentro de `domains`.
- [ ] Nenhum import de repositório de outro domínio.
- [ ] Regras de negócio no service; tradução HTTP no controller; SQL no repository.
- [ ] `core` não importa nada de `domains` ou `platform`.
- [ ] Entrada validada na borda com Zod; objeto tipado chega ao service.
- [ ] Sem `any`; `unknown` na borda; sem assertion sem validação.
- [ ] Erros tipados, com `cause`; causa logada uma vez, na borda.
- [ ] Toda consulta tem `limit`; toda listagem é paginada.
- [ ] Transação aberta só no service; repositório nunca recebe `trx`.
- [ ] Mudança relevante publica evento; auditoria é gravada na mesma transação.
- [ ] SQL portátil: sem `db.raw` fora do `Dialect`.
- [ ] ID gerado pela aplicação; protocolo com `UNIQUE` e retry.
- [ ] Autorização verificada no servidor, em um lugar só por domínio.
- [ ] Log estruturado com request id; sem PII; sem `console.log`.
- [ ] Segredo vem de ambiente validado; nunca no repositório.

---

## 22. Pending Changes

Pendências conhecidas, com o impacto e o gatilho de reavaliação:

| Pendência | Impacto | Gatilho |
| --- | --- | --- |
| Envelope de erro `{ error: { code, message, requestId } }` | Frontend precisa ajustar `readErrorMessage` | release coordenada com o frontend |
| RBAC configurável (tabelas `roles`, `permissions`) | Troca da matriz em código por adapter de banco | Demanda do produto por perfis configuráveis |
| Perfis: 5 no backend, 4 nos contratos publicados | Contrato de API desatualizado | Atualizar `contratos/` no repositório de documentação |
| Suíte de testes automatizados | Rede de segurança ausente para a reescrita | Ferramentas de teste decididas |
| Envelope de paginação | Já é o formato do frontend | — |
| Log de auditoria exposto na API | Pendente de contrato | Formalização do domínio de auditoria |

---

## 23. Summary

```text
O domínio é a unidade de modularização.

Router monta endpoint.
Controller valida entrada e formata resposta.
Service decide: regra, autorização, transação, evento.
Repository persiste, sem regra e sem transação própria.
Database garante o dado.

Dependências entram pelo construtor.
O composition root é o único que conhece as implementações.
Domínios conversam por portas publicadas e por eventos, nunca por repositório alheio.

O SQL é portátil; o detalhe de engine vive no Dialect.
Os IDs nascem na aplicação; o protocolo é derivado por HMAC.

A auditoria acompanha a alteração, na mesma transação.
O erro é traduzido uma vez, na borda.
```
