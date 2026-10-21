# Backend Architecture

## 1. Objective

Este documento define como as partes do backend MAAT se relacionam e qual é a responsabilidade de cada camada.

A arquitetura separa:

- **HTTP** — rotas, controllers, middlewares;
- **regras de aplicação** — services;
- **persistência** — repositories, Knex;
- **infraestrutura** — banco, log, configuração, criptografia.

O objetivo é manter a estrutura modular, com dependências explícitas e banco de dados substituível, sem criar camadas que não paguem o custo de existir.

Documentos relacionados: [`01-Overview.md`](./01-Overview.md) · [`../GLOSSARY.md`](../GLOSSARY.md) · [`adr/`](./adr/).

---

## 2. Guiding Principles

| # | Princípio | Regra | Detalhado em |
| --- | --- | --- | --- |
| P1 | O domínio é a unidade de modularização | Tudo que pertence a um domínio vive na pasta dele | [§ 4](#4-directory-structure) · [§ 5](#5-domain-catalog) |
| P2 | Dependências apontam para dentro | `core` não conhece ninguém; só o composition root conhece todos | [§ 19](#19-allowed-dependencies) |
| P3 | Portas e adaptadores nas bordas | Regra de negócio nunca conhece Knex, Express ou `fetch` | [§ 10.1](#101-the-database-port) · [§ 10.2](#102-the-dialect) |
| P4 | Injeção por construtor, sem framework | Sem container de DI, sem decorator, sem registro global | [§ 8](#8-dependency-injection) |
| P5 | Persistência portátil | Query builder + `Dialect`; nada de SQL literal em repositório | [§ 10.3](#103-portability-rules) |
| P6 | A borda fala HTTP, o domínio fala regra | Controller traduz, service decide, repository persiste | [§ 6](#6-layer-responsibilities) |
| P7 | Uma transação, um dono | Service abre via `execute`; repositório exige transação corrente | [§ 11](#11-transactions) |
| P8 | Auditoria acompanha a mudança | Evento publicado; trilha gravada na mesma transação | [§ 9.3](#93-change-audit-via-domain-events) |

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
| Status | `status` |
| Categoria | `category` |
| Prioridade | `priority` |
| Classificação | `classification` |
| Triagem | `triage` |
| Veredito | `verdict` — o Status de saída da triagem (`triage.triages.exit_status_id`) |
| Mapeamento | `mapping` |
| Análise de viabilidade | `viability_analysis` |
| Priorização | `prioritization` |
| Critério | `criterion` |
| Classificação | `classification_key` |
| Formulário | `form` |
| Bloco | `form_block` |
| Campo | `form_field` |
| Pendência | `pending_item` |
| Nota interna | `internal_note` |
| Linha do tempo | `timeline` |
| Auditoria | `audit` |
| Tentativa | `attempt` |
| Perfil | `profile` |
| Admin Root | `admin_root` |
| Responsável | `responsible` |
| Modo de acesso | `solicitation_mode` |
| Aparência | `appearance` |

Valores de domínio (status, prioridades, categorias) permanecem em português, porque são exibidos ao usuário e gravados como dado de negócio.

> **Exceção:** nomes de campo do contrato público seguem o formato já acordado em `tirador-pedidos-NEO/contratos/`. Quando o contrato existente usa um termo, o contrato prevalece sobre a tabela acima.

---

## 4. Directory Structure

```text
src/
├── server.ts                  # bootstrap: config → container → app.listen
├── app.ts                     # montagem do Express a partir do container
├── container.ts               # composition root: monta e conecta tudo
│
├── core/                      # kernel — não conhece domains nem platform
│   ├── actor.ts               # quem está agindo na requisição
│   ├── errors/                # AppError, DomainError, registro de códigos
│   ├── http/                  # BaseController, HttpContext, envelopes
│   ├── service/               # BaseService, Clock, IdGenerator, Logger
│   ├── repository/            # BaseRepository, Database, Dialect, TransactionManager
│   ├── authorization/         # Permission, perfis, AuthorizationService
│   ├── audit/                 # AttemptRecorder, AttemptRecord
│   ├── crypto/                # ProtocolGenerator
│   ├── config/                # Config
│   ├── events/                # DomainEvent, DomainEventPublisher
│   └── pagination/            # PageQuery, Page
│
├── platform/                  # adaptadores concretos — conhecem core
│   ├── database/              # KnexDatabase, PostgresDialect, SqliteDialect, MySqlDialect
│   ├── http/                  # middlewares: request-id, auth, access-mode, erro
│   ├── events/                # publicador de eventos em memória
│   ├── logging/               # adapter do logger
│   ├── authorization/         # StaticAuthorizationService
│   ├── clock/                 # SystemClock
│   ├── ids/                   # UuidGenerator
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
    ├── audit/                  # dono das tabelas audit_entries e attempts
    ├── reports/
    ├── portal-config/
    └── forms/              # dono de forms, form_blocks e form_fields

migrations/<domain>/            # migrações donas por cada domínio
seeds/<domain>/                # seeds donos por cada domínio
knexfile.ts
```

> Pastas e arquivos são criados conforme a necessidade. Um domínio sem tabelas próprias não tem `schema/`; um domínio sem rotas públicas não precisa de subpastas.

---

## 5. Domain Catalog

| Domínio | Responsabilidade | Tabelas | Portas publicadas |
| --- | --- | --- | --- |
| `auth` | Login, logout, sessão, troca de senha | `credentials` — **não há tabela de sessões**: a sessão é o token | `AuthReader` |
| `users` | Cadastro, perfil, dados do usuário, avatar, contato | `profiles`, `users`, `analyst_details`, `analyst_detail_categories` | `UserReader` |
| `requests` | Ciclo de vida da solicitação, protocolo, anexos | `requests`, `form_answers`, `attachments`, `request_time_preferences` | `RequestReader` |
| `triage` | Triagem: aderência, escopo, veredito | `triages` | `TriageReader` |
| `mapping` | Sessão de mapeamento, participantes, agenda | `mappings`, `mapping_participants` | `MappingReader` |
| `queue` | Fila centralizada e métricas | — (lê de `requests`) | `QueueReader` |
| `prioritization` | Critérios, pesos e a Prioridade resultante | `criteria`, `priorities`, `prioritization_evaluations` | `PrioritizationReader` |
| `pending-items` | Pendências de campo e de observação | `pending_items`, `pending_item_fields` | `PendingItemReader` |
| `internal-notes` | Notas internas, marcas de leitura, linha do tempo | `internal_notes`, `internal_note_read_states` | `InternalNoteReader` |
| `audit` | Trilha de auditoria imutável | `audit_entries`, `attempts` | `AuditReader` · `AttemptRecorder` |
| `reports` | Dashboard, métricas, exportações | — (lê de vários domínios) | — |
| `portal-config` | Configuração do portal, categorias, status, aparência, modo de acesso | `portal_settings`, `themes`, `categories`, `statuses` | `PortalConfigReader` |
| `forms` | Catálogo das definições de formulário: blocos e campos | `forms`, `form_blocks`, `form_fields` | `FormReader` |
| `platform` | Infraestrutura: contador de protocolo | `code_counters` | — (consumido pela porta `Counter`) |

Regras do catálogo:

- **Um domínio é dono das suas tabelas.** Nenhum outro domínio escreve nelas.
- **`forms` é um catálogo:** guarda a definição de um formulário, nunca a resposta. Quem responde é o domínio do sujeito — `requests.form_answers` — e liga por chave estrangeira (`requests.form_answers.field_id` → `forms.form_fields.id`).
- **A classificação é coluna, não pergunta:** status, prioridade e categoria são colunas da solicitação — ver [`03-Data-Model.md` § 8.1](./03-Data-Model.md#81-requests).
- **`queue` e `reports` não têm tabelas.** São projeções de leitura sobre outros domínios e consomem as portas publicadas por eles.
- **Toda porta publicada é um contrato de leitura**, com uma única exceção: `AttemptRecorder`, que é uma porta de escrita controlada pela borda — ver [§ 9.4](#94-audit-and-log-what-each-one-guarantees).
- **Projeções de leitura não escrevem.** `queue` e `reports` recebem apenas portas `*Reader`; por isso não estendem `BaseService` e não têm transação.

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

As três classes base concentram comportamento compartilhado atrás de uma interface pequena. Uma classe de domínio **herda** da base correspondente quando usa esse comportamento.

### 7.1 BaseController

Resolve o contrato de resposta HTTP — envelope de erro, envelope de paginação, status code — e a tradução de requisição em contexto.

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

Resolve as dependências transversais de um caso de uso (log, relógio, gerador de id, transações), a **política de transação** e as asserções que se repetem em todo serviço.

```ts
// src/core/service/base-service.ts
export interface ServiceDependencies {
  readonly logger: Logger;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly transactions: TransactionManager;
  readonly events: DomainEventPublisher;
}

export abstract class BaseService {
  protected readonly logger: Logger;
  protected readonly clock: Clock;
  protected readonly ids: IdGenerator;
  protected readonly events: DomainEventPublisher;
  private readonly transactions: TransactionManager;

  protected constructor(dependencies: ServiceDependencies) {
    this.logger = dependencies.logger;
    this.clock = dependencies.clock;
    this.ids = dependencies.ids;
    this.events = dependencies.events;
    this.transactions = dependencies.transactions;
  }

  /**
   * Único ponto de entrada de operação de escrita.
   * A transação é aberta aqui: o caso de uso declara a intenção de atomicidade,
   * e o mecanismo fica atrás da porta `TransactionManager`.
   */
  protected async execute<T>(work: () => Promise<T>): Promise<T> {
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

O service de domínio acrescenta as próprias dependências (o repositório) a esse objeto — por exemplo `new RequestService({ ...dependencies, repository })`.

A distinção é o **nome do método**:

| Tipo de operação | Forma | Transação |
| --- | --- | --- |
| Escrita | `executeChangeStatus()`, `executeCreateRequest()` | Sim, aberta pela classe base |
| Leitura simples | `findByProtocol()` — uma tabela, um statement | Não |
| Leitura agregada | `listTimeline()` — agrega várias tabelas | Read-only, com snapshot consistente |

### 7.3 BaseRepository

Resolve o trabalho repetitivo de falar com Knex — tabela, mapeamento de linha, paginação, soft delete — e a propagação da transação corrente.

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

O repositório **nunca** recebe `trx` como parâmetro e **nunca** abre transação. Ele usa `this.database.client`, que já aponta para a transação corrente quando existe (ver [§ 11](#11-transactions)).

**O repositório exige a transação.** Todo método de escrita chama `this.database.assertInTransaction()` antes de gravar:

```ts
protected async insertOne(values: Record<string, unknown>): Promise<TEntity> {
  this.database.assertInTransaction();
  // ...
}
```

Assim a garantia é do **repositório**, não da herança: uma escrita fora de transação falha com `transaction_required` (erro interno, não exposto) em vez de fazer commit parcial. Vale para qualquer service, herde ou não — a herança só evita o erro, não o impede.

**Exceção: a trilha de tentativas.** `AttemptRecorder.record()` grava em `attempts` **fora** de transação, por construção ([§ 9.4](#94-audit-and-log-what-each-one-guarantees)) — a recusa existe justamente porque a transação foi desfeita. Por isso o repositório de auditoria tem um método de escrita específico (`insertAttempt`) que **não** chama `assertInTransaction()`. É o único método de escrita do modelo que não exige transação corrente; nenhuma outra escrita pode ser feita sem `execute()`.

### 7.4 Inheritance Rule

> _domain_ **herda** da classe base quando usa o comportamento dela. Não existe "classe base obrigatória": uma classe que não usa nada da base é um passe-through e deve ser eliminada, não herdada.

O que um service pode fazer depende da **porta que ele recebe**, não da herança:

| Service | Herda `BaseService`? | Portas que recebe | Pode escrever? |
| --- | --- | --- | --- |
| Caso de uso | Sim | repositório de escrita | Sim — via `execute()` |
| Projeção de leitura (fila, relatórios) | Não | apenas `*Reader` publicados | **Não** — não tem o que escrever |
| Service que não herda por engano | Não | repositório de escrita | Só se abrir transação; se não, `transaction_required` |

Um service de leitura não precisa herdar a base: a incapacidade de escrever é **estrutural**, porque ele não recebe porta de escrita — não é uma regra de disciplina.

---

## 8. Dependency Injection

Não há container de injeção, decorator ou registro global. A injeção é por construtor, e a montagem é explícita.

### 8.1 The Composition Root

`src/container.ts` é o **único** arquivo que sabe quais implementações concretas existem.

```ts
// src/container.ts
export interface Container {
  readonly config: Config;
  readonly logger: Logger;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly protocol: ProtocolGenerator;
  readonly counter: Counter;
  readonly database: Database;
  readonly transactions: TransactionManager;
  readonly events: DomainEventPublisher;
  readonly authorization: AuthorizationService;
  readonly attempts: AttemptRecorder;
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
  const protocol = new FeistelProtocolGenerator(config.protocolSecret);
  const counter = new KnexCounter(database, logger);
  const events = new InMemoryDomainEventPublisher();
  const authorization = new StaticAuthorizationService();

  // `database` implementa as duas portas de persistência; o container
  // entrega o mesmo adapter nos dois papéis.
  const transactions: TransactionManager = database;
  const attempts = createAuditModule({ database, logger, clock, ids, events, authorization }).attempts;

  const modules = {
    auth: createAuthModule({ database, transactions, logger, clock, ids, events, authorization }),
    // ...
  };

  return { config, logger, clock, ids, protocol, counter, database, transactions, events, authorization, attempts, modules };
}
```

### 8.2 Module Factory

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

### 8.3 Lifecycle

| Componente | Ciclo de vida | Por quê |
| --- | --- | --- |
| Adaptadores (`database`, `logger`, `clock`, `ids`, `protocol`) | Singleton | Criados uma vez no boot |
| Services e repositories | Singleton | Sem estado; o estado do caso de uso vive nas variáveis locais |
| Controllers | Singleton | Idem, sem estado |
| `HttpContext` | Por requisição | Único objeto que carrega estado da requisição |

### 8.4 Cross-Domain Dependencies

Um domínio **nunca** importa o repositório, o service ou o controller de outro domínio. Quando precisa de dados de outro domínio, consome a **porta publicada** por ele:

```ts
// src/domains/queue/queue.service.ts
import type { RequestReader } from "../requests/requests.port.js";

export class QueueService {
  constructor(private readonly requests: RequestReader) {}
}
```

O import é de **tipo**. A implementação nunca atravessa a fronteira. E como `QueueService` não escreve, ele **não estende** `BaseService` — ver [§ 7.4](#74-inheritance-rule).

### 8.5 Cycles Between Domains

Um ciclo entre domínios não se resolve com injeção de dependência: se A depende de B e B depende de A, qualquer ordem de construção falha. Ciclos se quebram com **eventos de domínio** (ver [§ 9](#9-domain-events)) ou com portas publicadas que não dependem do outro lado.

---

## 9. Domain Events

### 9.1 Event Definition

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

> Eventos são o canal **dentro** da transação. Fatos que precisam ser gravados fora dela — como a recusa de uma ação — não são eventos: ver [§ 9.4](#94-audit-and-log-what-each-one-guarantees).

### 9.2 Rules

| Regra | Consequência se ignorada |
| --- | --- |
| O payload é um snapshot, nunca uma referência a entidade | O consumidor puxa o agregado de volta e o ciclo nasce |
| A publicação acontece dentro da transação | A trilha de auditoria fica fora do fato que descreve |
| A entrega é síncrona e awaited | Falha silenciosa; sem fila, sem `setImmediate`, sem retry assíncrono |
| Eventos são fatos, não comandos | O nome passa a descrever o que deve ser feito, não o que aconteceu |

### 9.3 Change Audit via Domain Events

A auditoria do que foi **commitado** é o primeiro consumidor de eventos. O domínio que causa a alteração publica; o domínio de auditoria assina e grava.

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

  return { router: createAuditRouter(service), service, attempts: service };
}
```

Propriedades:

- o domínio que altera **não conhece** o domínio de auditoria — a dependência é de mão única;
- a escrita acontece na transação do emitente, porque o handler roda inline dentro dela;
- falha do handler **desfaz a alteração** — a trilha de alteração é obrigatória, não best-effort.

Ver [ADR-0007](./adr/0007-event-driven-audit.md).

### 9.4 Audit and Log: What Each One Guarantees

Existem **duas trilhas**, com garantias diferentes.

| Trilha | O que registra | Garantia | Onde é gravada | Se a gravação falhar |
| --- | --- | --- | --- | --- |
| **Alteração** | O que foi commitado | Atômica com a mudança | Dentro da transação do caso de uso | A mudança é desfeita |
| **Tentativa** | O que foi recusado | Independente — a recusa aconteceu de fato | Fora da transação | Vira registro de tentativa; a resposta não é bloqueada |

A tentativa **não pode** estar dentro da transação: ela existe justamente porque a transação foi desfeita.

#### Where the Attempt Is Recorded

**Na borda, não no serviço.** O serviço recusa e **lança um erro tipado com contexto**; o erro sobe, a transação se desfaz, e o *error handler* grava a tentativa. Nesse momento o escopo da transação já foi desfeito, então a gravação acontece **fora da transação por construção** — sem mecanismo especial.

```ts
// src/core/errors/domain-error.ts
export class DomainError extends Error {
  readonly code: string;
  /** Presente quando a tentativa merece rastro. */
  readonly context?: RefusalContext;

  constructor(
    code: string,
    message: string,
    options: { context?: RefusalContext; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "DomainError";
    this.code = code;
    this.context = options.context;
  }
}

// src/core/errors/refusal-context.ts
export interface RefusalContext {
  readonly action: string;
  readonly resource: string;
  readonly resourceId: string;
}
```

```ts
// src/domains/requests/requests.service.ts
throw new DomainError(
  "not_the_assignee",
  "Você não é o responsável por esta solicitação.",
  { context: { action: "request.status_changed", resource: "request", resourceId: request.id } },
);
```

O *error handler* reconhece o erro auditável e delega à porta de escrita:

```ts
// src/core/audit/attempt-recorder.ts
export interface AttemptRecord extends RefusalContext {
  readonly actor: Actor;
  readonly reason: string;
  readonly requestId: string;
  readonly occurredAt: Date;
}

export interface AttemptRecorder {
  record(entry: AttemptRecord): Promise<void>;
}
```

```ts
// src/platform/http/error-handler.ts
if (isAuditable(error)) {
  await attempts.record({
    ...error.context,
    actor: res.locals.actor,
    reason: error.code,
    requestId,
    occurredAt: clock.now(),
  });
}
```

`AttemptRecorder` é a **única porta de escrita publicada por um domínio**. A porta mora em `core/audit/`; o adapter mora em `domains/audit/`, que é o dono da tabela `attempts`. O *error handler* recebe a porta pelo container — ele nunca importa o domínio.

#### What Counts as an Auditable Attempt

| Caso | Auditada? | Por quê |
| --- | --- | --- |
| Recusa de autorização (`forbidden`) | Sim | Alguém tentou algo que não podia — tem responsabilidade |
| Recusa de regra de negócio (status inválido, transição proibida) | Sim | Tentativa deliberada de um humano |
| Erro de validação (`400`) | Não | Ruído de entrada, alto volume, sem identidade garantida |
| Falha de autenticação (`401`) | Não, aqui | É log de **segurança** do domínio `auth`, não trilha de negócio |

O critério é **explícito no erro** (`DomainError.context`), não inferido de uma lista na borda: quem recusa decide se a tentativa merece rastro, porque só ele sabe o que tentou.

#### Audit and Log Are Not the Same Thing

- **Auditoria** é o fato: está no banco, dentro ou fora de transação conforme a trilha, e é append-only.
- **Registro de tentativa** é o **rastro da recusa**: sai quando a requisição foi atendida, na borda, e pode existir para uma operação que foi desfeita. Uma transação que faz *rollback* pode deixar um registro dizendo que o status mudou, sem auditoria correspondente.

Regra: **o registro de tentativa nunca é evidência.** Para saber o que aconteceu, olhe a auditoria. E o registro de sucesso sai **depois** do commit — ver [§ 17](#17-logging).

---

## 10. Persistence with Knex

As tabelas, colunas, relações e invariantes do modelo estão em [`03-Data-Model.md`](./03-Data-Model.md), que é a especificação do schema; a definição em Knex de cada domínio a implementa. As convenções de nomenclatura e de constraints do schema estão na [ADR-0009](./adr/0009-schema-naming-and-constraints.md).

### 10.1 The Database Port

O repositório fala com a porta `Database`, não com o Knex diretamente.

```ts
// src/core/repository/database.ts
export interface Database {
  /** Handle de consulta ativo: a transação em curso, quando existir. */
  readonly client: Knex;
  readonly dialect: Dialect;
  /** Falha se não houver transação corrente. */
  assertInTransaction(): void;
  destroy(): Promise<void>;
}

// src/core/repository/transaction-manager.ts
export interface TransactionManager {
  /** Transação de escrita. */
  run<T>(work: () => Promise<T>): Promise<T>;
  /** Transação de leitura, com snapshot consistente. */
  runReadOnly<T>(work: () => Promise<T>): Promise<T>;
}
```

`KnexDatabase` (`src/platform/database/knex-database.ts`) implementa as duas portas. Trocar a engine significa trocar o `client` do Knex e o `Dialect` — nenhum repositório muda.

```ts
const database = createDatabase(config);
// config.database.engine === "postgres" → KnexDatabase com PostgresDialect
// config.database.engine === "sqlite"   → KnexDatabase com SqliteDialect
```

### 10.2 The Dialect

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

### 10.3 Portability Rules

Estas regras são o que torna a troca de banco uma realidade e não uma intenção:

| Regra | Por quê |
| --- | --- |
| **`db.raw()` proibido fora do `Dialect`** | SQL literal quebra em outra engine |
| Repositório usa **apenas o query builder** do Knex | Preserva a diferença entre as engines |
| **IDs gerados pela aplicação** (`crypto.randomUUID()`) | Elimina `nextval()`, `::uuid`, sequences e colunas `serial` |
| **Sem tipo `ENUM`** | Use `text` com constraint de check ou tabela de lookup |
| **Sem coluna `ARRAY`** | Use tabela filha (`mapping_participants`, `analyst_detail_categories`) |
| **Sem `tsvector` / full-text search do Postgres** | Use `like`/`ilike` ou índice dedicado |
| **Sem `COUNT(*) FILTER (WHERE …)`** | Reescreva com agregação condicional via query builder |
| **Booleanos** via `dialect.booleanType()` | Postgres `boolean`, MySQL `tinyint(1)`, SQLite inteiro |
| **JSON** via `dialect.jsonType()` | Postgres `jsonb`, MySQL `json`, SQLite `text` |
| **Timestamp** via `dialect.timestampType()` | `timestamptz` vs `datetime` |
| **Row lock** (`forUpdate`) só onde `dialect.supportsRowLocks()` | SQLite não bloqueia linha |
| **Toda consulta tem limite** | `paginate` exige `pageSize` máximo; nunca há query sem `limit` |

### 10.4 Identifiers

Toda chave primária é um **UUID v4 gerado pela aplicação**, via a porta `IdGenerator`.

```ts
// src/core/service/id-generator.ts
export interface IdGenerator {
  next(): string;
}
```

Consequências:

- o schema não depende de sequence, `serial` ou `auto_increment`;
- o id é conhecido **antes** do insert;
- a chave é opaca e não revela volume de dados.

### 10.5 Protocol

O protocolo é o identificador público, curto e não enumerável que o solicitante usa para acompanhar a solicitação.

Ele é derivado por **cifra de Feistel sobre um contador**, não por hash do id:

```text
counter (inteiro) → Feistel(secret, counter) → 8 caracteres → MAAT-XXXX-XXXX
```

```ts
// src/core/repository/counter.ts
export interface Counter {
  next(name: string): Promise<number>;
}

// src/core/crypto/protocol-generator.ts
export interface ProtocolGenerator {
  generate(value: number): string;
}
```

Propriedades:

- **sem colisão por construção** — a Feistel é uma bijeção sobre `[0, 2⁴⁰)`; dois contadores diferentes nunca geram o mesmo protocolo. Ver [ADR-0008](./adr/0008-protocol-without-collision-risk.md);
- **não enumerável** — sem o segredo não se sai do contador;
- **independente da engine** — o contador vem de uma tabela, não de uma sequence do banco;
- **formato preservado** — `MAAT-XXXX-XXXX`, o mesmo que o frontend já valida.

O contador vive em uma tabela `code_counters(name, value)`, com uma linha por domínio, e é incrementado dentro da mesma transação do insert:

```ts
// dentro da transação do caso de uso
await this.database.client("code_counters")
  .where({ name: "requests" })
  .increment("value", 1);
```

> O incremento é feito pelo construtor do knex — sem `db.raw()`, que é proibido fora do `Dialect` ([§ 10.3](#103-portability-rules)) — e é idêntico em Postgres, MySQL e SQLite. Se um dia o contador migrar para um Redis, a porta `Counter` substitui a tabela sem alterar o gerador — o ponto de troca fica explícito.

Regras de uso:

- o protocolo tem constraint `UNIQUE` — belt-and-braces, já que a bijeção impede a duplicata;
- **a leitura nunca usa `.first()`**: a busca por protocolo é uma sondagem com `LIMIT 2` que falha explicitamente se duas linhas corresponderem. É essa sondagem que impede a exposição de dados de outra solicitação;
- o contador **nunca é resetado nem renumerado**; o limite de domínio (`< 2⁴⁰`) é verificado na geração.

Ver [§ 11](#11-transactions) para o vínculo entre o contador e a transação, e [ADR-0008](./adr/0008-protocol-without-collision-risk.md) para a decisão completa.

### 10.6 Pagination

Toda listagem devolve o envelope que o frontend já consome:

```json
{ "data": [], "page": 1, "pageSize": 20, "total": 0, "totalPages": 0 }
```

`pageSize` tem limite máximo definido em `core/pagination`; nenhum repositório consulta sem `limit`.

---

## 11. Transactions

### 11.1 One Transaction, One Owner

**Toda operação de escrita é um método `execute*` do service, e o `BaseService` abre a transação.** Repositório nunca abre e nunca recebe `trx` como parâmetro — e exige uma transação corrente para gravar.

A fronteira da transação é uma afirmação de negócio: "isto é um fato". O *como* — `knex.transaction` — fica atrás da porta `TransactionManager`; o service declara atomicidade, não SQL.

A fronteira é **por caso de uso**, não por statement: autocommit já paga uma transação e um COMMIT por statement, então agrupar os statements de um caso de uso em uma transação é um desconto, não um custo.

```ts
// src/domains/requests/requests.service.ts
async executeChangeStatus(input: ChangeStatusInput): Promise<void> {
  await this.execute(async () => {
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

A **leitura** fica dentro da transação: a checagem de concorrência otimista (`expectedStatusId` → 409) só vale se read e write estiverem no mesmo escopo.

Ver [ADR-0001](./adr/0001-layered-architecture-per-domain.md) para as alternativas descartadas.

### 11.2 Implicit Transactions

O `TransactionManager` usa `AsyncLocalStorage` para propagar a transação corrente sem poluir a assinatura de cada método.

```ts
// src/platform/database/knex-database.ts
export class KnexDatabase implements Database, TransactionManager {
  private readonly scope = new AsyncLocalStorage<Knex>();

  get client(): Knex {
    return this.scope.getStore() ?? this.knex;
  }

  async run<T>(work: () => Promise<T>): Promise<T> {
    return this.nested(async (trx) => this.scope.run(trx, work));
  }

  async runReadOnly<T>(work: () => Promise<T>): Promise<T> {
    return this.nested(async (trx) => this.scope.run(trx, work));
  }

  private async nested<T>(use: (trx: Knex.Transaction) => Promise<T>): Promise<T> {
    const current = this.scope.getStore();
    if (current) {
      return current.transaction((nested) => use(nested));
    }
    return this.knex.transaction((trx) => use(trx));
  }
}
```

Efeito: dentro de `execute`, qualquer repositório chamado — inclusive de outro domínio — usa a mesma transação, sem que nenhum deles saiba que ela existe.

| Cenário | Semântica |
| --- | --- |
| **Aninhamento** | O `execute` de um service chamado dentro de outro vira **savepoint**. Só a transação externa faz commit; um savepoint pode ser desfeito sozinho, mas nunca confirma por conta própria. |
| **Lote** | Processamento em lote faz `execute` por chunk, não um por item — cada chunk é uma transação, e um chunk que falha não desfaz os anteriores. |
| **Leitura agregada** | Leitura que junta várias tabelas (linha do tempo, agregações do dashboard) usa `runReadOnly`, para que todos os statements vejam o mesmo snapshot. Sem isso, o resultado pode ser uma leitura rasgada — o que a linha do tempo mostra pode não ter coexistido. |
| **Leitura simples** | Uma tabela, um statement: sem transação, sem snapshot retido. |

### 11.3 What Belongs in the Same Transaction

| Dentro | Por quê |
| --- | --- |
| A alteração de negócio e a trilha de auditoria que a descreve | Atomicidade da trilha |
| Alterações em tabelas diferentes que descrevem o mesmo fato | O fato é indivisível |
| O registro de evento e o efeito que o evento descreve | O efeito é consequência do evento |

### 11.4 What Does Not Belong

| Fora | Motivo |
| --- | --- |
| Chamada HTTP externa, e-mail ou envio de anexo | Latência e lock retido |
| Leitura usada apenas para montar log | Não é parte do fato |
| Qualquer coisa acima do timeout da transação | Transação aberta prende o snapshot MVCC e impede o *vacuum* de remover tuplas mortas — é o que gera bloat |

### 11.5 Runtime Guarantee

A regra "escrita só dentro de transação" é garantida pelo **repositório**, não por disciplina:

```ts
// src/platform/database/knex-database.ts
assertInTransaction(): void {
  if (!this.scope.getStore()) {
    throw new AppError("transaction_required", 500, "escrita fora de transação");
  }
}
```

O erro é interno e não exposto: chegar a ele é bug, não condição de negócio. Ele existe para transformar "esqueci a transação" de *estado parcial silencioso* em *falha barulhenta*.

---

## 12. Errors

### 12.1 Types

| Tipo | Quando | Carrega status HTTP? |
| --- | --- | --- |
| `DomainError` | Regra de negócio violada; recusa com contexto | Não — vem do registro |
| `AppError` | Erro de aplicação com código estável | Sim |
| `Error` comum | Falha inesperada | Não |

### 12.2 Stable Codes

Todo erro exposto tem um `code` em `snake_case`, estável entre versões. O `code` é o que o frontend deve usar para decidir comportamento; a `message` é para o humano e pode mudar.

| Registro | Códigos | Quem usa |
| --- | --- | --- |
| `core/errors/error-codes.ts` | `validation_error`, `not_found`, `conflict`, `unauthorized`, `forbidden`, `internal_error` | Erros expostos ao cliente |
| Códigos de domínio | `not_the_assignee`, `invalid_status_transition`, … | Erros de `DomainError` |
| `core/errors/internal-codes.ts` | `transaction_required`, `protocol_collision` | Erros internos; nunca expostos |

### 12.3 Domain Error with Refusal Context

Um erro de domínio não conhece HTTP. Quando a recusa merece rastro, ele carrega o contexto — a definição de `DomainError` e de `RefusalContext` está em [§ 9.4](#94-audit-and-log-what-each-one-guarantees).

```ts
// src/core/errors/is-auditable.ts
export function isAuditable(error: unknown): error is DomainError & { context: RefusalContext } {
  return error instanceof DomainError && error.context !== undefined;
}
```

O `context` carrega **o que** foi tentado; a borda completa com **quem** e **onde**. O critério de auditabilidade é explícito no erro, não inferido de uma lista na borda.

### 12.4 HTTP Mapping

Erro de domínio não conhece status HTTP. O mapeamento acontece **uma vez**, na borda:

```ts
// src/core/http/error-mapper.ts
const STATUS_BY_CODE: Readonly<Record<string, number>> = {
  validation_error: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  not_the_assignee: 403,
  invalid_status_transition: 409,
  internal_error: 500,
};
```

`AppError` carrega o próprio status; `DomainError` não — o dele vem deste registro. Uma fonte por tipo de erro.

### 12.5 Response Envelope

O contrato vigente com o frontend é o do backend legado:

```json
{ "status": "error", "statusCode": 404, "message": "Solicitação não encontrada." }
```

Esse envelope é **temporário**. O `CODING_STANDARDS.md` define `{ "error": { "code", "message", "requestId" } }`, que adiciona código estável e correlação por requisição, e deve ser adotado em uma migração coordenada com o frontend — o cliente atual lê `body.message || body.error` e passaria a exibir `[object Object]`. Ver [ADR-0005](./adr/0005-legacy-error-envelope-temporary.md).

### 12.6 Exposure

| Regra | Efeito |
| --- | --- |
| `expose: true` | A mensagem vai para o cliente |
| `expose: false` (padrão) | O cliente recebe `internal_error` com mensagem genérica |
| Stack, SQL, nome de tabela, path e versão interna | Nunca saem do servidor |
| Causa do erro | Registrada **uma vez**, na borda; camada interna não faz log-and-rethrow |

---

## 13. Validation and the Border

Tudo que entra pela borda é `unknown` até ser validado.

```ts
// src/domains/requests/requests.schema.ts
export const CreateRequest = z.strictObject({
  category: z.string().min(1).max(40),   // classificação: fora dos blocos
  demand: z.strictObject({
    title: z.string().min(1).max(150),
    description: z.string().min(1).max(4000),
  }),
  requester: z.strictObject({
    fullName: z.string().min(1).max(150),
    corporateEmail: z.email().max(254),
  }),
});
```

> `demand` é o nome do bloco no contrato público já acordado; ver a exceção em [§ 3](#3-naming). `category` é a **Classificação**, e é pedida **no topo** — fora dos blocos, porque ela escolhe o formulário.
>
> Os limites por campo são os do **seed do formulário** ([`03-Data-Model.md` Apêndice A](./03-Data-Model.md#22-appendix-a-the-form-seed)); este exemplo é ilustrativo do formato, não da fonte dos limites. A definição do formulário é a fonte única: o schema da borda é gerado a partir dela **e do catálogo de classificações** — a classificação não tem linha na definição, e a borda a valida pelo nome, contra as categorias ativas.

| Regra | Efeito |
| --- | --- |
| `strictObject` rejeita campo desconhecido | Campo novo exige contrato novo |
| O controller repassa ao service um objeto tipado | O service nunca vê o `req.body` cru |
| Sem *mass assignment* | O service mapeia explicitamente os campos validados |
| Erro de validação | `400` com `code: "validation_error"` |
| `Content-Type` inesperado | `415` |

---

## 14. Authentication and Authorization

### 14.1 Session

Login emite JWT em cookie `HttpOnly`. A cada requisição, o middleware:

1. valida a assinatura e a expiração;
2. relê usuário e perfil no banco — desativação e mudança de perfil valem na hora;
3. compara `password_changed_at` com o do token — senha trocada invalida sessões antigas;
4. monta o `Actor` e o coloca em `res.locals`.

### 14.2 Actors

O ator descreve **o estado de autenticação** da requisição:

```ts
// src/core/actor.ts
export type Actor =
  | { readonly kind: "authenticated"; readonly userId: string; readonly profile: Profile }
  | { readonly kind: "requester"; readonly name: string; readonly email: string }
  | { readonly kind: "anonymous" };
```

- `authenticated` — há sessão. O `profile` diz o que a pessoa pode fazer.
- `requester` — sem sessão, mas com identidade declarada no header `X-Requester-Identity`; usado no acompanhamento por protocolo e nas pendências.
- `anonymous` — sem sessão e sem identidade.

O **perfil** não é um tipo de ator: ele qualifica um ator autenticado. Um solicitante autenticado é `authenticated` com `profile: "solicitante"`; um solicitante anônimo é `requester`.

### 14.3 Profiles

Cinco perfis, com hierarquia:

```text
Admin Root
   └── Administrador
         └── Gestor
               └── Analista
Solicitante  (ator externo, fora da hierarquia)
```

| Perfil | Pode | Não pode |
| --- | --- | --- |
| **Solicitante** | Abrir e acompanhar solicitações | Ver as áreas internas |
| **Analista** | Triar, mapear, priorizar; é o **Responsável** quando designado | Gerenciar usuários ou configuração |
| **Gestor** | Ler as áreas internas; escrever nota interna | Alterar a solicitação, o status, o responsável e a configuração |
| **Administrador** | Gerenciar usuários, conteúdo e configuração | Gerenciar outros Administradores |
| **Admin Root** | Todas as permissões; gerencia Administradores | — |

> *Admin Root* existe apenas no seed; nunca há auto-registro.

### 14.4 Authorization

A autorização é uma **matriz de permissões escrita em código**, atrás de uma interface — a costura que vai receber o RBAC configurável no futuro.

```ts
// src/core/authorization/permissions.ts
export const PERMISSIONS = {
  REQUEST_READ: "request:read",
  REQUEST_WRITE: "request:write",
  REQUEST_ASSIGN: "request:assign",
  REQUEST_STATUS_CHANGE: "request:status_change",
  TRIAGE_WRITE: "triage:write",
  MAPPING_WRITE: "mapping:write",
  PRIORITIZATION_WRITE: "prioritization:write",
  PENDING_ITEM_REVIEW: "pending_item:review",
  INTERNAL_NOTE_WRITE: "internal_note:write",
  AUDIT_READ: "audit:read",
  USER_MANAGE: "user:manage",
  PORTAL_CONFIG_MANAGE: "portal_config:manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// src/core/authorization/authorization-service.ts
export interface AuthorizationService {
  can(actor: Actor, permission: Permission): boolean;
  assert(actor: Actor, permission: Permission): void;
}
```

A matriz (permissão → perfis) fica em `core/authorization/profile-permissions.ts`. *Admin Root* recebe todas as permissões.

O catálogo completo das chaves — 25 chaves `recurso:ação` — está em [`03-Data-Model.md` Apêndice B](./03-Data-Model.md#23-appendix-b-permission-catalogue). É o mesmo catálogo que vai semear `permissions` e `profile_permissions` quando o RBAC configurável entrar, sem que nenhum domínio mude — ver [ADR-0014](./adr/0014-permission-key-is-the-contract.md).

| Nível | O que verifica | Onde |
| --- | --- | --- |
| Rota | Gate grosso por perfil | Middleware |
| Serviço | Regra fina sobre o recurso — o solicitante só vê a própria solicitação; o Responsável atua sobre a que lhe foi designada | Service, em um lugar só por domínio |

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
  app.use(cors({ origin: container.config.cors.origins, credentials: true }));

  app.use("/api/v1/auth", container.modules.auth.router);
  app.use("/api/v1/requests", container.modules.requests.router);
  // ...

  app.use(notFoundHandler);
  app.use(errorHandler); // quatro parâmetros, sempre por último
  return app;
}
```

| Regra | Motivo |
| --- | --- |
| O 404 vem antes do error handler | O 404 é uma rota, não um erro |
| O error handler tem quatro parâmetros e é o último | O Express identifica o error handler pela assinatura |
| Depois de `headersSent`, o handler delega com `next(err)` | Não se responde duas vezes |
| `app.ts` não cria dependência | Recebe o `Container` pronto; a aplicação pode ser montada em teste sem subir servidor |

---

## 16. Configuration

A configuração é lida e validada **no boot**. Aplicação com configuração inválida não sobe.

```ts
// src/platform/config/environment-schema.ts
export const EnvironmentSchema = z.strictObject({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().int().positive(),
  DATABASE: z.strictObject({
    ENGINE: z.enum(["postgres", "sqlite", "mysql"]),
    HOST: z.string(),
    PORT: z.coerce.number().int().positive(),
    NAME: z.string(),
    USER: z.string(),
    PASSWORD: z.string(),
  }),
  CORS: z.strictObject({
    ORIGINS: z.array(z.string()),
  }),
  JWT_SECRET: z.string().min(32),
  PROTOCOL_SECRET: z.string().min(32),
});
```

| Regra | Motivo |
| --- | --- |
| Segredo ausente ou curto demais derruba o boot em produção | Falhar cedo é melhor que falhar no primeiro request |
| `.env.example` documenta as variáveis | Segredo nunca vai para o repositório |
| Nenhum `process.env` fora de `platform/config` | Uma fonte de configuração |
| `Config` (interface) e `EnvironmentSchema` (Zod) têm nomes distintos | O schema valida; a interface é o contrato interno |

---

## 17. Logging

O logger é um adapter (`platform/logging`) por trás de uma porta em `core/service`.

| Regra | Motivo |
| --- | --- |
| Log estruturado em JSON, com nível e campos estáveis | Parseável |
| **Request id** em todo log, aceito de `x-request-id` apenas se for UUID válido | Correlação entre requisição e erro |
| Campos, não concatenação: `logger.info({ requestId, userId }, "request loaded") | Busca por campo funciona |
| Redação de `authorization`, `cookie`, `set-cookie`, `password`, `token` e `secret` | Segredo não vaza em log |
| PII não entra em log | Dado pessoal não é log |
| A causa de um erro é logada **uma vez**, na borda | Camada interna não faz log-and-rethrow |
| Método, rota, status e duração em todo log de requisição | Métrica de saúde |

**O log é rastro de tentativa, não de fato.** Uma transação que faz *rollback* pode deixar um log dizendo que o status mudou, sem auditoria correspondente. Por isso o log de sucesso sai **depois** do commit, e para saber o que de fato aconteceu se olha a **auditoria** — ver [§ 9.4](#94-audit-and-log-what-each-one-guarantees).

---

## 18. Testability Seams

A arquitetura já expõe as costuras que a suíte de testes vai usar quando ela existir. Hoje **não há camada de testes** — a decisão é adiada, não as costuras.

| Costura | Interface | Por quê |
| --- | --- | --- |
| Relógio | `Clock` | `Date.now()` nunca é chamado direto no domínio |
| Identificador | `IdGenerator` | Id previsível em teste |
| Protocolo | `ProtocolGenerator` | Protocolo estável em teste |
| Contador | `Counter` | Protocolo previsível em teste |
| Persistência | `Database` | Adapter em memória sem banco real; `assertInTransaction()` testável sem banco |
| Autorização | `AuthorizationService` | Cenário de permissão sem banco |
| Eventos | `DomainEventPublisher` | Assert sobre evento publicado |
| Tentativas | `AttemptRecorder` | Assert sobre recusa registrada |
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

| Proibição | Por quê |
| --- | --- |
| `core` **nunca** importa de `domains` ou `platform` | O kernel não conhece ninguém |
| `domains` **nunca** importa de `platform` | A implementação concreta do adapter entra pelo container |
| Um domínio **nunca** importa repositório, service ou controller de outro domínio | Fronteira entre áreas |
| `platform` **nunca** importa de `domains` | Inclusive o *error handler*: ele recebe a porta `AttemptRecorder`, não o domínio |
| `app.ts` e `server.ts` **nunca** criam dependência | Eles consomem o `Container` |

---

## 20. Anti-Patterns

Os padrões abaixo são os que o backend legado usa e que esta arquitetura existe para não repetir.

| Padrão | Por que é problema | O que fazer |
| --- | --- | --- |
| `import { db } from "../database/conexion.js"` dentro de um service | Dependência implícita, banco travado, nada testável | Injetar `Database` pelo construtor |
| Regra de negócio dentro do repository | Repositório deixa de ser persistência e vira regra sem lugar de teste | Regra no service; repositório só lê e escreve |
| Regra de negócio dentro do controller | Regra não é testável sem HTTP | Regra no service |
| Service **e** repository abrindo transação | Escopo de transação indefinido | Só o service abre |
| Escrita fora de transação | Commit parcial silencioso | `execute()` no service; `assertInTransaction()` no repositório |
| `trx` como parâmetro em todo método de repositório | Ruído em todas as assinaturas | Transação implícita por `TransactionManager` |
| `db.raw()` espalhado em repositório | SQL não portável | `Dialect` ou query builder |
| `.first()` em busca por protocolo | Retorna a linha errada em silêncio quando há duplicata | Sondagem com `LIMIT 2` |
| `catch { return [] }` | Erro de banco virando "não tem resultado" | Deixar o erro subir; tratar no service |
| `switch` gigante mapeando coluna por campo | Regressão ao adicionar campo | Mapeamento por repositório, colunas por constante |
| String de erro repetida (`"INSUFFICIENT_ROLE_PERMISSIONS"`) | Código sem registro, divaga | Registro em `error-codes.ts` |
| Constante de status declarada em dois lugares | Divergência silenciosa | Uma fonte, importada pelas duas |
| `console.log` em produção | Sem correlação, sem redação | Logger da aplicação |
| DTOs de todos os domínios em uma pasta compartilhada | Dependência entre domínios por conveniência | DTO no próprio domínio |
| Pasta com dois domínios dentro | Fronteira invisível | Um domínio por pasta |
| `db.schema.hasColumn()` no caminho da requisição | Query extra por request, herança de migration em produção | Schema explícito, versionado |

---

## 21. Review Checklist

Cada linha aponta a seção que define a regra. Um PR que muda mais de uma camada marca mais de uma linha.

| [ ] | Regra | Onde | Como verificar |
| --- | --- | --- | --- |
| [ ] | O código pertence a um domínio | [§ 4](#4-directory-structure) | O arquivo está em `src/domains/<domínio>/` |
| [ ] | Toda dependência externa chega pelo construtor | [§ 8](#8-dependency-injection) | Nenhum import de `platform` dentro de `domains` |
| [ ] | Nenhum repositório, service ou controller de outro domínio é importado | [§ 19](#19-allowed-dependencies) | Só `import type` de uma `*.port.ts` |
| [ ] | Regras no service; tradução HTTP no controller; SQL no repository | [§ 6](#6-layer-responsibilities) | O controller não monta query |
| [ ] | `core` não importa nada de `domains` ou `platform` | [§ 19](#19-allowed-dependencies) | `rg "from \"\.\./(domains\|platform)" src/core` |
| [ ] | Entrada validada na borda com Zod | [§ 13](#13-validation-and-the-border) | O service recebe objeto tipado, não `req.body` |
| [ ] | Sem `any`; `unknown` na borda; sem assertion sem validação | `CODING_STANDARDS.md` | Type-check estrito passa |
| [ ] | Erros tipados, com `cause`; causa logada uma vez, na borda | [§ 12](#12-errors) | Nenhum `log-and-rethrow` |
| [ ] | Toda escrita é um `execute*`; nenhuma fora de transação — exceto a trilha de tentativas | [§ 11](#11-transactions) | `assertInTransaction()` no repositório, com a exceção de `insertAttempt` |
| [ ] | Leitura agregada usa `runReadOnly` | [§ 11.2](#112-implicit-transactions) | Timeline e dashboard |
| [ ] | Mudança relevante publica evento; trilha da alteração na mesma transação | [§ 9.3](#93-change-audit-via-domain-events) | Assinatura no `domains/audit` |
| [ ] | Recusa auditável carrega contexto e é gravada na borda | [§ 9.4](#94-audit-and-log-what-each-one-guarantees) | `DomainError` com `context` |
| [ ] | SQL portátil: sem `db.raw` fora do `Dialect` | [§ 10.3](#103-portability-rules) | `rg "db\.raw\(" src/domains` |
| [ ] | ID gerado pela aplicação; protocolo com `UNIQUE` e sondagem `LIMIT 2` | [§ 10.5](#105-protocol) | Leitura por protocolo |
| [ ] | Schema segue as convenções de nomenclatura e constraints | [`03-Data-Model.md` § 2](./03-Data-Model.md#2-naming-conventions) | `ck_`, `uk_`, `idx_`, `fk_` + tabela |
| [ ] | Nenhuma coluna `ENUM`; conjunto fechado é `text` + `ck_` ou tabela de referência | [`03-Data-Model.md` § 2.7](./03-Data-Model.md#27-closed-value-sets) | `rg "\.enu\(" src/domains` |
| [ ] | `ON DELETE RESTRICT` em toda chave estrangeira; nada é apagado | [`03-Data-Model.md` § 2.11](./03-Data-Model.md#211-delete-policy) | `rg "onDelete\(" src/domains` |
| [ ] | Schema alterado, modelo documentado atualizado | [ADR-0010](./adr/0010-data-model-doc-is-the-spec.md) | Diff em `03-Data-Model.md` no mesmo PR |
| [ ] | Autorização verificada no servidor, em um lugar só por domínio | [§ 14.4](#144-authorization) | `AuthorizationService.assert` |
| [ ] | Log estruturado com request id; sem PII; sem `console.log` | [§ 17](#17-logging) | `rg "console\.(log\|error)" src/` |
| [ ] | Segredo vem de ambiente validado; nunca no repositório | [§ 16](#16-configuration) | `.env.example` sem valor |

---

## 22. Pendências de Arquitetura

As pendências de **schema** estão no [`03-Data-Model.md` § 21](./03-Data-Model.md#21-pendências). As de arquitetura são as daqui:

| Pendência | Impacto | Gatilho |
| --- | --- | --- |
| Envelope de erro `{ error: { code, message, requestId } }` | Frontend precisa ajustar `readErrorMessage` | Release coordenada com o frontend |
| Perfis: 5 no backend, 4 nos contratos publicados | Contrato de API desatualizado | Atualizar `contratos/` no repositório de documentação |
| Suíte de testes automatizados | Rede de segurança ausente para a reescrita | Ferramentas de teste decididas |
| Trilha de auditoria exposta na API | Pendente de contrato | Formalização do domínio de auditoria |

---

## 23. Index

```text
§ 4  Directory Structure      § 14 Authentication and Authorization
§ 5  Domain Catalog           § 15 Routing and Application Assembly
§ 6  Layer Responsibilities   § 16 Configuration
§ 7  Base Classes             § 17 Logging
§ 8  Dependency Injection     § 18 Testability Seams
§ 9  Domain Events            § 19 Allowed Dependencies
§ 10 Persistence with Knex    § 20 Anti-Patterns
§ 11 Transactions             § 21 Review Checklist
§ 12 Errors                   § 22 Pendências de Arquitetura
§ 13 Validation and the Border
```
