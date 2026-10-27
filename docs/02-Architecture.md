# Arquitetura do Backend

## 1. Objetivo

Este documento define como as partes do backend MAAT se relacionam e qual é a responsabilidade de cada camada.

A arquitetura separa:

- **HTTP** — rotas, controllers, middlewares;
- **regras de aplicação** — services;
- **persistência** — repositories, Knex;
- **infraestrutura** — banco, log, configuração, criptografia.

O objetivo é manter a estrutura modular, com dependências explícitas e banco de dados substituível, sem criar camadas que não paguem o custo de existir.

Documentos relacionados: [`01-Overview.md`](./01-Overview.md) · [`../GLOSSARY.md`](../GLOSSARY.md) · [`adr/`](./adr/).

---

## 2. Princípios Norteadores

| # | Princípio | Regra | Detalhado em |
| --- | --- | --- | --- |
| P1 | O domínio é a unidade de modularização | Tudo que pertence a um domínio vive na pasta dele | [§ 4](#4-estrutura-de-diretórios) · [§ 5](#5-catálogo-de-domínios) |
| P2 | Dependências apontam para dentro | `core` não conhece ninguém; só o composition root conhece todos | [§ 19](#19-dependências-permitidas) |
| P3 | Portas e adaptadores nas bordas | Regra de negócio nunca conhece Knex, Express ou `fetch` | [§ 10.1](#101-a-porta-de-banco) · [§ 10.2](#102-o-dialect) |
| P4 | Injeção por construtor, sem framework | Sem container de DI, sem decorator, sem registro global | [§ 8](#8-injeção-de-dependência) |
| P5 | Persistência portátil | Query builder + `Dialect`; nada de SQL literal em repositório | [§ 10.3](#103-regras-de-portabilidade) |
| P6 | A borda fala HTTP, o domínio fala regra | Controller traduz, service decide, repository persiste | [§ 6](#6-responsabilidades-de-camada) |
| P7 | Uma transação, um dono | Service abre via `execute`; repositório exige transação corrente | [§ 11](#11-transações) |
| P8 | Auditoria acompanha a mudança | Evento publicado; trilha gravada na mesma transação | [§ 9.3](#93-auditoria-de-alteração-por-eventos) |

---

## 3. Nomenclatura

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
| Classificação (chave) | `classification_key` |
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
>
> O mapa é o **radical** do identificador, não o nome da tabela: a tabela concreta é o `snake_case` plural — `pending-item` → `pending_items` — e há casos em que o nome da tabela é outro substantivo: `audit` → `audit_entries`.

---

## 4. Estrutura de Diretórios

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

Schema e migrations pertencem ao domínio — a definição da tabela vive em `src/domains/<domínio>/schema/`, ao lado da regra que a usa. Ver [ADR-0004](./adr/0004-domain-owned-schema-and-migrations.md).

---

## 5. Catálogo de Domínios

| Domínio | Responsabilidade | Tabelas | Portas publicadas |
| --- | --- | --- | --- |
| `auth` | Login, logout, sessão, troca de senha | `credentials` — **não há tabela de sessões**: a sessão é o token | `AuthReader` |
| `users` | Cadastro, perfil, dados do usuário, avatar, contato | `profiles`, `users`, `analyst_details`, `analyst_detail_categories` | `UserReader` |
| `requests` | Ciclo de vida da solicitação, protocolo, anexos | `requests`, `form_answers`, `attachments`, `request_time_preferences` | `RequestReader` |
| `triage` | Triagem: aderência, escopo, veredito | `triages` | `TriageReader` |
| `mapping` | Sessão de mapeamento, participantes, agenda | `mappings`, `mapping_participants` | `MappingReader` |
| `queue` | Fila centralizada e métricas | — (lê de `requests`) | — (projeção: consome, não publica) |
| `prioritization` | Critérios, pesos e a Prioridade resultante | `criteria`, `priorities`, `prioritization_evaluations` | `PrioritizationReader` |
| `pending-items` | Pendências de campo e de observação | `pending_batches`, `pending_items` | `PendingItemReader` |
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
- **Toda porta publicada é um contrato de leitura**, com uma única exceção: `AttemptRecorder`, que é uma porta de escrita controlada pela borda — ver [§ 9.4](#94-auditoria-e-log-o-que-cada-um-garante).
- **Projeções de leitura não escrevem.** `queue` e `reports` recebem apenas portas `*Reader`; por isso não estendem `BaseService` e não têm transação.

---

## 6. Responsabilidades de Camada

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

## 7. Classes Base

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

```ts
// src/core/http/base-controller.ts
export abstract class BaseController {
  protected constructor(private readonly logger: Logger) {}

  /** Traduz a requisição em contexto. Depois disto o controller não toca em `req`/`res`. */
  protected context(req: Request, res: Response): HttpContext { /* ... */ }
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

Resolve as dependências transversais de um caso de uso (log, relógio, gerador de id, transações, eventos), a **política de transação** e as asserções que se repetem em todo serviço.

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

  /** Todas as leituras do bloco enxergam o mesmo snapshot; não impede escrita. */
  protected async readSnapshot<T>(work: () => Promise<T>): Promise<T> {
    return this.transactions.runSnapshot(work);
  }

  protected assert(condition: boolean, error: AppError): asserts condition {
    if (!condition) throw error;
  }

  protected notFound(entity: string): AppError {
    return new AppError("not_found", 404, `${entity} não encontrado.`, { expose: true });
  }
}
```

A base declara **exatamente o que usa**. O service de domínio não tipa o construtor com o objeto inteiro do módulo: ele declara o próprio tipo, que estende `ServiceDependencies` — ou `UseCaseDependencies`, definido em [§ 8.2](#82-fábrica-de-módulo), quando aplica autorização — e acrescenta o repositório e o que mais o caso de uso precisa, nunca a porta `Database`. O objeto que a fábrica monta por spread pode continuar mais largo em runtime; o que o compilador garante é o tipo que o construtor declara ([ADR-0027](./adr/0027-service-dependencies-are-capability-slices.md)).

```ts
// src/domains/requests/requests.service.ts
export interface RequestServiceDependencies extends UseCaseDependencies {
  readonly repository: RequestRepository;
  readonly counter: Counter;
  readonly protocol: ProtocolGenerator;
  readonly portalConfig: PortalConfigReader;
}

export class RequestService extends BaseService {
  private readonly repository: RequestRepository;
  private readonly counter: Counter;
  private readonly protocol: ProtocolGenerator;
  private readonly portalConfig: PortalConfigReader;

  constructor(dependencies: RequestServiceDependencies) {
    super(dependencies);
    this.repository = dependencies.repository;
    this.counter = dependencies.counter;
    this.protocol = dependencies.protocol;
    this.portalConfig = dependencies.portalConfig;
  }
}
```

A fábrica do módulo monta esse recorte e entrega a porta `Database` apenas ao repositório ([§ 8.2](#82-fábrica-de-módulo)). `this.dependencies.database` não compila: o service não recebe a porta do banco, então não pode montar SQL fora do repositório.

A distinção é o **nome do método**:

| Tipo de operação | Forma | Transação |
| --- | --- | --- |
| Escrita | `executeChangeStatus()`, `executeCreateRequest()` | Sim, aberta pela classe base |
| Leitura simples | `findByProtocol()` — uma tabela, um statement | Não |
| Leitura agregada | `listTimeline()` — agrega várias tabelas | Transação de leitura com snapshot (`readSnapshot`) |

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

  public async findById(id: string): Promise<TEntity | null> { /* ... */ }
  protected async paginate(query: PageQuery): Promise<Page<TEntity>> { /* ... */ }
  protected async insertOne(values: Record<string, unknown>): Promise<TEntity> { /* ... */ }
}
```

`protected` é para o que a **subclasse** chama: `paginate` e `insertOne` existem para os repositórios de domínio montarem as próprias queries. `findById` é chamado pelo **service** — que recebe o repositório pelo construtor e não é subclasse dele —, então é `public`. Visibilidade não substitui a regra de camadas (o controller nunca recebe o repositório); `protected` ali só tornaria inválido o exemplo de [§ 11.1](#111-uma-transação-um-dono).

O repositório **nunca** recebe `trx` como parâmetro e **nunca** abre transação. Ele usa `this.database.client`, que já aponta para a transação corrente quando existe (ver [§ 11](#11-transações)).

**O repositório exige a transação.** Todo método de escrita chama `this.database.assertInTransaction()` antes de gravar:

```ts
protected async insertOne(values: Record<string, unknown>): Promise<TEntity> {
  this.database.assertInTransaction();
  // ...
}
```

Assim a garantia é do **repositório**, não da herança: uma escrita fora de transação falha com `transaction_required` (erro interno, não exposto) em vez de fazer commit parcial. Vale para qualquer service, herde ou não — a herança só evita o erro, não o impede.

**Exceção: a trilha de tentativas.** `AttemptRecorder.record()` grava em `attempts` **fora** de transação, por construção ([§ 9.4](#94-auditoria-e-log-o-que-cada-um-garante)) — a recusa existe justamente porque a transação foi desfeita. Por isso o repositório de auditoria tem um método de escrita específico (`insertAttempt`) que **não** chama `assertInTransaction()`. É o único método de escrita do modelo que não exige transação corrente; nenhuma outra escrita pode ser feita sem `execute()`.

### 7.4 Regra de Herança

> _domain_ **herda** da classe base quando usa o comportamento dela. Não existe "classe base obrigatória": uma classe que não usa nada da base é um passe-through e deve ser eliminada, não herdada.

O que um service pode fazer depende da **porta que ele recebe**, não da herança:

| Service | Herda `BaseService`? | Portas que recebe | Pode escrever? |
| --- | --- | --- | --- |
| Caso de uso | Sim | repositório de escrita | Sim — via `execute()` |
| Projeção de leitura (fila, relatórios) | Não | apenas `*Reader` publicados | **Não** — não tem o que escrever |
| Service que não herda por engano | Não | repositório de escrita | Só se abrir transação; se não, `transaction_required` |

Um service de leitura não precisa herdar a base: a incapacidade de escrever é **estrutural**, porque ele não recebe porta de escrita — não é uma regra de disciplina. A mesma lógica vale para o banco: nenhum service recebe a porta `Database`; ela aparece em `Container.database` ([§ 8.1](#81-o-composition-root)), em `ModuleDependencies` ([§ 8.2](#82-fábrica-de-módulo)) e em `RepositoryDependencies` ([§ 7.3](#73-baserepository)), não no tipo de dependências do service ([§ 7.2](#72-baseservice)).

---

## 8. Injeção de Dependência

Não há container de injeção, decorator ou registro global. A injeção é por construtor, e a montagem é explícita — a decisão e as alternativas descartadas estão em [ADR-0002](./adr/0002-manual-dependency-injection.md).

### 8.1 O Composition Root

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
    readonly audit: AuditModule;
    readonly portalConfig: PortalConfigModule;
    // ...
  };
}

export function createContainer(config: Config): Container {
  const logger = createLogger(config);
  const database = createDatabase(config);
  const clock = new SystemClock();
  const ids = new UuidGenerator();
  const protocol = new FeistelProtocolGenerator(config.protocolSecret);
  const counter = new KnexCounter(database);
  const events = new InMemoryDomainEventPublisher();
  const authorization = new StaticAuthorizationService();

  // `database` implementa as duas portas de persistência; o container
  // entrega o mesmo adapter nos dois papéis.
  const transactions: TransactionManager = database;

  const portalConfig = createPortalConfigModule({
    database, transactions, logger, clock, ids, events, authorization,
  });

  const modules = {
    auth: createAuthModule({ database, transactions, logger, clock, ids, events, authorization }),
    users: createUsersModule({ database, transactions, logger, clock, ids, events, authorization }),
    requests: createRequestsModule({
      database, transactions, logger, clock, ids, events, authorization,
      counter, protocol, portalConfig: portalConfig.reader,
    }),
    audit: createAuditModule({ database, transactions, logger, clock, ids, events, authorization }),
    portalConfig,
  };

  modules.audit.registerSubscriptions();

  return {
    config, logger, clock, ids, protocol, counter, database, transactions, events, authorization,
    attempts: modules.audit.attempts,
    modules,
  };
}
```

> **Todo módulo é construído uma vez e retido.** A montagem usa a instância retida, nunca uma segunda chamada à fábrica. O `audit` é o caso que prova a regra: ele assina um evento no boot, e uma segunda instância registraria o mesmo handler duas vezes — a alteração seria auditada em duplicidade, dentro da transação do emitente.

Adicionar um domínio toca quatro pontos explícitos — `knexfile.ts`, `container.ts`, `app.ts` e a matriz de permissões. É o custo aceito da composição manual ([ADR-0002](./adr/0002-manual-dependency-injection.md)); em troca, o grafo inteiro é legível em um arquivo.

### 8.2 Fábrica de Módulo

Cada domínio expõe uma fábrica que recebe as dependências e devolve o que a aplicação precisa montar. As dependências são divididas por **quem as usa**: a base enxerga só os transversais, o service que autoriza enxerga também `authorization`, e `database` não chega ao service — o container o cria, a fábrica o repassa ao repositório e entrega ao service um recorte sem ele ([§ 7.2](#72-baseservice)). No nível da fábrica, `ModuleDependencies` estende `UseCaseDependencies` com `database`; é o recorte que a fábrica recebe.

```ts
// src/core/service/use-case-dependencies.ts — o que o service que autoriza usa
export interface UseCaseDependencies extends ServiceDependencies {
  readonly authorization: AuthorizationService;
}

// src/core/service/module-dependencies.ts — o que a fábrica usa
export interface ModuleDependencies extends UseCaseDependencies {
  readonly database: Database;
}

// src/domains/requests/index.ts
export interface RequestsModule {
  readonly router: Router;
  readonly service: RequestService;
}

export interface RequestsModuleDependencies extends ModuleDependencies {
  /** Do caso de uso, não da classe base. */
  readonly counter: Counter;
  readonly protocol: ProtocolGenerator;
  /** Porta publicada por `portal-config`: de onde sai a máscara vigente. */
  readonly portalConfig: PortalConfigReader;
}

export function createRequestsModule(
  dependencies: RequestsModuleDependencies,
): RequestsModule {
  const { database, ...serviceDependencies } = dependencies;

  const repository = new RequestRepository({
    database,
    logger: dependencies.logger,
  });

  const service = new RequestService({ ...serviceDependencies, repository });
  const controller = new RequestController(dependencies.logger, service);
  const router = createRequestRouter(controller);

  return { router, service };
}
```

Todo módulo expõe a mesma forma — `router` para a montagem e `service` para o teste. O de auditoria publica ainda a porta de escrita e a assinatura explícita:

```ts
// src/domains/auth/index.ts · src/domains/users/index.ts
export interface AuthModule {
  readonly router: Router;
  readonly service: AuthService;
}

export interface UsersModule {
  readonly router: Router;
  readonly service: UsersService;
}

// src/domains/audit/index.ts
export interface AuditModule {
  readonly router: Router;
  readonly service: AuditService;
  readonly attempts: AttemptRecorder;
  registerSubscriptions(): void;
}

// src/domains/portal-config/index.ts
export interface PortalConfigModule {
  readonly router: Router;
  readonly service: PortalConfigService;
  /** Porta de leitura consumida por quem precisa da máscara, dos status públicos ou da Aparência. */
  readonly reader: PortalConfigReader;
}

// src/domains/portal-config/portal-config.port.ts
export interface PortalConfigReader {
  /** Máscara vigente do protocolo; a leitura pública devolve o mesmo valor. */
  protocolMask(): Promise<string>;
}
```

Qualquer domínio que publique uma porta de leitura expõe a instância em `reader`, como `portal-config`: é assim que outro domínio a recebe sem importar o módulo ([§ 8.4](#84-dependências-entre-domínios)). O `service` de um módulo é a classe de casos de uso do domínio — `AuthService`, `UsersService`, `PortalConfigService` — e nunca é importado por outro domínio.

### 8.3 Ciclo de Vida

| Componente | Ciclo de vida | Por quê |
| --- | --- | --- |
| Adaptadores (`database`, `logger`, `clock`, `ids`, `protocol`, `counter`) | Singleton | Criados uma vez no boot |
| Módulos (`modules.*`) | Singleton | A fábrica é chamada **uma vez**; a instância é retida no container |
| Services e repositories | Singleton | Sem estado; o estado do caso de uso vive nas variáveis locais |
| Controllers | Singleton | Idem, sem estado |
| `HttpContext` | Por requisição | Único objeto que carrega estado da requisição |

### 8.4 Dependências entre Domínios

Um domínio **nunca** importa o repositório, o service ou o controller de outro domínio. Quando precisa de dados de outro domínio, consome a **porta publicada** por ele:

```ts
// src/domains/queue/queue.service.ts
import type { RequestReader } from "../requests/requests.port.js";

export class QueueService {
  constructor(private readonly requests: RequestReader) {}
}
```

O import é de **tipo**. A implementação nunca atravessa a fronteira. E como `QueueService` não escreve, ele **não estende** `BaseService` — ver [§ 7.4](#74-regra-de-herança).

### 8.5 Ciclos entre Domínios

Um ciclo entre domínios não se resolve com injeção de dependência: se A depende de B e B depende de A, qualquer ordem de construção falha. Ciclos se quebram com **eventos de domínio** (ver [§ 9](#9-eventos-de-domínio)) ou com portas publicadas que não dependem do outro lado.

---

## 9. Eventos de Domínio

### 9.1 Definição de Evento

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

> Eventos são o canal **dentro** da transação. Fatos que precisam ser gravados fora dela — como a recusa de uma ação — não são eventos: ver [§ 9.4](#94-auditoria-e-log-o-que-cada-um-garante).

```ts
// src/platform/events/in-memory-domain-event-publisher.ts
export class InMemoryDomainEventPublisher implements DomainEventPublisher {
  private readonly handlers = new Map<string, Array<(event: DomainEvent<unknown>) => Promise<void>>>();

  async publish<TPayload>(event: DomainEvent<TPayload>): Promise<void> { /* percorre em série e aguarda */ }
  subscribe<TPayload>(name: string, handler: (event: DomainEvent<TPayload>) => Promise<void>): void {
    // O nome do evento é o contrato; o handler tipado é guardado com payload `unknown`.
    const handlers = this.handlers.get(name) ?? [];
    handlers.push(handler as (event: DomainEvent<unknown>) => Promise<void>);
    this.handlers.set(name, handlers);
  }
}
```

### 9.2 Regras

| Regra | Consequência se ignorada |
| --- | --- |
| O payload é um snapshot, nunca uma referência a entidade | O consumidor puxa o agregado de volta e o ciclo nasce |
| A publicação acontece dentro da transação | A trilha de auditoria fica fora do fato que descreve |
| A entrega é síncrona e awaited | Falha silenciosa; sem fila, sem `setImmediate`, sem retry assíncrono |
| Eventos são fatos, não comandos | O nome passa a descrever o que deve ser feito, não o que aconteceu |

### 9.3 Auditoria de Alteração por Eventos

A auditoria do que foi **commitado** é o primeiro consumidor de eventos. O domínio que causa a alteração publica; o domínio de auditoria assina e grava.

```ts
// src/domains/audit/index.ts
export type AuditModuleDependencies = ModuleDependencies;

export function createAuditModule(
  dependencies: AuditModuleDependencies,
): AuditModule {
  const { database, ...serviceDependencies } = dependencies;

  const repository = new AuditRepository({
    database,
    logger: dependencies.logger,
  });
  const service = new AuditService({ ...serviceDependencies, repository });

  return {
    router: createAuditRouter(service),
    service,
    // A porta publicada é de uma operação só: o service inteiro não atravessa a fronteira.
    attempts: { record: (entry) => service.record(entry) },
    registerSubscriptions() {
      dependencies.events.subscribe(
        "request.status_changed",
        (event: DomainEvent<StatusChangedPayload>) => service.recordStatusChange(event.payload),
      );
    },
  };
}
```

```ts
// src/domains/audit/audit.service.ts
export interface AuditServiceDependencies extends UseCaseDependencies {
  readonly repository: AuditRepository;
}

export class AuditService extends BaseService {
  private readonly repository: AuditRepository;

  constructor(dependencies: AuditServiceDependencies) {
    super(dependencies);
    this.repository = dependencies.repository;
  }

  /** Leitura da trilha: aplica `audit:read` e custódia ([§ 14.5](#145-compatibilidade-com-o-frontend-atual)), com o envelope de paginação ([§ 10.6](#106-paginação)). */
  async list(actor: Actor, query: PageQuery): Promise<Page<AuditEntry>> { /* ... */ }

  /** Trilha de alteração: grava na transação do emitente. */
  async recordStatusChange(payload: StatusChangedPayload): Promise<void> { /* ... */ }

  /** Trilha de tentativa: chamada pela borda, fora da transação do emitente. */
  async record(entry: AttemptRecord): Promise<void> { /* ... */ }
}
```

```ts
// src/domains/requests/requests.port.ts
export interface StatusChangedPayload {
  readonly requestId: string;
  readonly from: string;
  readonly to: string;
  readonly actorId: string;
}
```

Propriedades:

- o domínio que altera **não conhece** o domínio de auditoria — a dependência é de mão única;
- a escrita acontece na transação do emitente, porque o handler roda inline dentro dela;
- falha do handler **desfaz a alteração** — a trilha de alteração é obrigatória, não best-effort;
- **construir o módulo não assina nada** — a assinatura é `registerSubscriptions()`, chamada uma vez pelo container ([§ 8.1](#81-o-composition-root)); um teste constrói o módulo sem tocar no publicador.

Ver [ADR-0007](./adr/0007-event-driven-audit.md).

### 9.4 Auditoria e Log: o que cada um garante

Existem **duas trilhas**, com garantias diferentes.

| Trilha | O que registra | Garantia | Onde é gravada | Se a gravação falhar |
| --- | --- | --- | --- | --- |
| **Alteração** | O que foi commitado | Atômica com a mudança | Dentro da transação do caso de uso | A mudança é desfeita |
| **Tentativa** | O que foi recusado | Independente — a recusa aconteceu de fato | Fora da transação | Vira registro de tentativa; a resposta não é bloqueada |

A tentativa **não pode** estar dentro da transação: ela existe justamente porque a transação foi desfeita.

#### Onde a Tentativa É Registrada

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
  /** A solicitação de negócio, quando a recusa ocorre no contexto de uma. */
  readonly requestId?: string;
}
```

```ts
// src/domains/requests/requests.service.ts
throw new DomainError(
  "not_the_assignee",
  "Você não é o responsável por esta solicitação.",
  {
    context: {
      action: "request.status_changed",
      resource: "request",
      resourceId: request.id,
      requestId: request.id,
    },
  },
);
```

O *error handler* reconhece o erro auditável e delega à porta de escrita:

```ts
// src/core/audit/attempt-recorder.ts
export interface AttemptRecord extends RefusalContext {
  readonly actor: Actor;
  readonly reason: string;
  /** Id da requisição HTTP; sempre presente, e não é a solicitação de negócio. */
  readonly correlationId: string;
  readonly occurredAt: Date;
}

export interface AttemptRecorder {
  record(entry: AttemptRecord): Promise<void>;
}
```

```ts
// src/platform/http/error-handler.ts
export function createErrorHandler(dependencies: {
  readonly attempts: AttemptRecorder;
  readonly clock: Clock;
  readonly logger: Logger;
}): ErrorRequestHandler {
  return async (error, req, res, next) => {
    if (isAuditable(error)) {
      try {
        await dependencies.attempts.record({
          ...error.context,
          actor: res.locals.actor,
          reason: error.code,
          correlationId: req.id,
          occurredAt: dependencies.clock.now(),
        });
      } catch (recordError) {
        // A recusa aconteceu; falhar ao gravá-la não bloqueia a resposta.
        dependencies.logger.error({ err: recordError, requestId: req.id }, "attempt not recorded");
      }
    }

    // Log da causa, uma única vez, e envelope de resposta ([§ 12](#12-erros)).
  };
}
```

`AttemptRecorder` é a **única porta de escrita publicada por um domínio**. A porta mora em `core/audit/`; o adapter mora em `domains/audit/`, que é o dono da tabela `attempts`. O *error handler* recebe a porta pelo container — ele nunca importa o domínio.

`requestId` não é o id HTTP: ele vem do contexto da recusa e é nulo fora de uma solicitação; o `correlationId` é sempre o `req.id`.

#### O que Conta como Tentativa Auditável

| Caso | Auditada? | Por quê |
| --- | --- | --- |
| Recusa de autorização (`forbidden`) | Sim | Alguém tentou algo que não podia — tem responsabilidade |
| Recusa de regra de negócio (status inválido, transição proibida) | Sim | Tentativa deliberada de um humano |
| Erro de validação (`400`) | Não | Ruído de entrada, alto volume, sem identidade garantida |
| Falha de autenticação (`401`) | Não, aqui | É log de **segurança** do domínio `auth`, não trilha de negócio |

O critério é **explícito no erro** (`DomainError.context`), não inferido de uma lista na borda: quem recusa decide se a tentativa merece rastro, porque só ele sabe o que tentou.

#### Auditoria e Log Não São a Mesma Coisa

- **Auditoria** é o fato: está no banco, dentro ou fora de transação conforme a trilha, e é append-only.
- **Registro de tentativa** é o **rastro da recusa**: sai quando a requisição foi atendida, na borda, e pode existir para uma operação que foi desfeita. Uma transação que faz *rollback* pode deixar um registro dizendo que o status mudou, sem auditoria correspondente.

Append-only **não é só ausência de rota**: a guarda é de banco, com trigger e privilégio ([ADR-0020](./adr/0020-audit-trail-shape.md)).

Regra: **o registro de tentativa nunca é evidência.** Para saber o que aconteceu, olhe a auditoria. E o registro de sucesso sai **depois** do commit — ver [§ 17](#17-log).

---

## 10. Persistência com Knex

As tabelas, colunas, relações e invariantes do modelo estão em [`03-Data-Model.md`](./03-Data-Model.md), que é a especificação do schema; a definição em Knex de cada domínio a implementa. As convenções de nomenclatura e de constraints do schema estão na [ADR-0009](./adr/0009-schema-naming-and-constraints.md).

A portabilidade entre engines é decisão registrada em [ADR-0003](./adr/0003-knex-dialect-portability.md): o repositório usa o query builder e o `Dialect` isola o que é específico de cada banco.

### 10.1 A Porta de Banco

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
  /** Transação de leitura com snapshot: isolamento `repeatable read` onde a engine suportar. */
  runSnapshot<T>(work: () => Promise<T>): Promise<T>;
}
```

`KnexDatabase` (`src/platform/database/knex-database.ts`) implementa as duas portas. Trocar a engine significa trocar o `client` do Knex e o `Dialect` — nenhum repositório muda.

```ts
const database = createDatabase(config);
// config.database.engine === "postgres" → KnexDatabase com PostgresDialect
// config.database.engine === "sqlite"   → KnexDatabase com SqliteDialect
```

```ts
// src/platform/database/create-database.ts
export function createDatabase(config: Config): KnexDatabase {
  // KnexDatabase + Dialect escolhido pela engine; implementa Database e TransactionManager.
}
```

### 10.2 O Dialect

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
  /** Predicado de cor hexadecimal válida, na sintaxe da engine. */
  hexColorCheck(column: string): string;
  /** DDL da guarda append-only da auditoria, na sintaxe da engine. */
  auditAppendOnlyGuard(): readonly string[];
}
```

Implementações: `PostgresDialect`, `SqliteDialect`, `MySqlDialect`. O `supportsUpsertMerge()` declara se a engine aceita merge no alvo do conflito: quem precisa de upsert consulta a capacidade e degrada para `insert` + `update` quando ela é falsa — a divergência fica declarada no `Dialect`, não espalhada em `if` de repositório.

### 10.3 Regras de Portabilidade

Estas regras são o que torna a troca de banco uma realidade e não uma intenção:

| Regra | Por quê |
| --- | --- |
| **`raw()` proibido fora do `Dialect`** (via `db` ou `client`) | SQL literal quebra em outra engine |
| Repositório usa **apenas o query builder** do Knex | Preserva a diferença entre as engines |
| **IDs gerados pela aplicação** (`crypto.randomUUID()`) | Elimina `nextval()`, `::uuid`, sequences e colunas `serial` |
| **Sem tipo `ENUM`** | Use coluna com constraint de check ou tabela de lookup ([`03-Data-Model.md` § 2.9](./03-Data-Model.md#29-texto-números-e-json)) |
| **Sem coluna `ARRAY`** | Use tabela filha (`mapping_participants`, `analyst_detail_categories`) |
| **Sem `tsvector` / full-text search do Postgres** | Use `like`/`ilike` ou índice dedicado |
| **Sem `COUNT(*) FILTER (WHERE …)`** | Reescreva com agregação condicional via query builder |
| **Booleanos** via `dialect.booleanType()` | Postgres `boolean`, MySQL `tinyint(1)`, SQLite inteiro |
| **JSON** via `dialect.jsonType()` | Postgres `jsonb`, MySQL `json`, SQLite `text` |
| **Timestamp** via `dialect.timestampType()` | `timestamptz` vs `datetime` |
| **Row lock** (`forUpdate`) só onde `dialect.supportsRowLocks()` | SQLite não bloqueia linha |
| **Predicado com função de engine vem do `Dialect`** | `table.check` recebe SQL cru e não traduz; `INSTR` não existe no Postgres |
| **Texto indexado é `varchar(n)`; texto longo não é indexado** | MySQL não indexa `TEXT` sem prefixo; Postgres limita a entrada de B-tree |
| **Toda consulta tem limite** | `paginate` exige `pageSize` máximo; nunca há query sem `limit` |

### 10.4 Identificadores

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

As portas usam `string` deliberadamente: o documento fixa o contrato, não a marca de tipo. `Protocol`, `CounterName` ou `EntityId` nominais podem entrar na implementação sem mudar o formato público.

### 10.5 Protocolo

O protocolo é o identificador público, curto e opaco que o solicitante usa para acompanhar a solicitação.

Ele é derivado por **cifra de Feistel sobre um contador**, não por hash do id:

```text
counter (inteiro) → Feistel(secret, counter) → 8 caracteres base32 → <protocol_mask>-XXXX-XXXX
```

```ts
// src/core/repository/counter.ts
export interface Counter {
  next(name: string): Promise<number>;
}

// src/core/crypto/protocol-generator.ts
export interface ProtocolGenerator {
  /** Deriva os 8 caracteres do contador e os exibe com a máscara vigente do portal. */
  generate(value: number, mask: string): string;
}

// src/platform/crypto/feistel-protocol-generator.ts
export class FeistelProtocolGenerator implements ProtocolGenerator {
  constructor(private readonly secret: string) {}

  generate(value: number, mask: string): string { /* Feistel sobre [0, 2⁴⁰) + base32 de Crockford */ }
}
```

Propriedades:

- **sem colisão por construção** — a Feistel é uma bijeção sobre `[0, 2⁴⁰)`; dois contadores diferentes nunca geram o mesmo protocolo. Ver [ADR-0008](./adr/0008-protocol-without-collision-risk.md);
- **opaco, não secreto** — sem o segredo não se deriva o próximo protocolo, mas o espaço de 40 bits pode ser varrido por completo. A defesa contra enumeração é de borda, não criptográfica: rate limit do endpoint público, conferência do e-mail do solicitante ([§ 14.2](#142-atores)) e resposta `404` no lugar de `403` — a formulação canônica está no [ADR-0008](./adr/0008-protocol-without-collision-risk.md);
- **independente da engine** — o contador vem de uma tabela, não de uma sequence do banco;
- **prefixo configurável** — o `MAAT` é apenas o valor padrão da máscara configurada no portal (`protocol_mask`, até 10 caracteres). Trocar a máscara muda só os protocolos emitidos depois; os existentes nunca são reescritos, e a unicidade continua sendo a do protocolo inteiro. A máscara **não acrescenta entropia**: ela é pública;
- **formato estável** — `<protocol_mask>-XXXX-XXXX`; o frontend aceita prefixo de 1 a 10 caracteres.

Os 8 caracteres usam **base32 de Crockford** (`0-9` e `A-Z` sem `I`, `L`, `O`, `U`): 32 símbolos cobrem `[0, 2⁴⁰)` exatamente. A máscara é `^[A-Z0-9]{1,10}$`, **sem hífen** — ele é o separador do formato.

O contador vive em uma tabela `code_counters(name, value)`, com uma linha por domínio, e é incrementado dentro da mesma transação do insert. O service **não conhece a tabela**: ele recebe a porta `Counter`, e o adapter mora em `platform`.

```ts
// src/platform/database/knex-counter.ts
export class KnexCounter implements Counter {
  constructor(private readonly database: Database) {}

  async next(name: string): Promise<number> {
    this.database.assertInTransaction();
    await this.database.client("code_counters").where({ name }).increment("value", 1);
    const counter = await this.database.client("code_counters").where({ name }).first("value");
    if (counter === undefined) throw new AppError("counter_missing", 500, "contador ausente");
    return counter.value;
  }
}
```

> O `increment` e o `select` rodam na mesma transação: o Postgres e o MySQL mantêm o lock da linha do `UPDATE` até o commit, e o SQLite serializa escritores. **Sem `raw()`, sem `RETURNING` e sem `FOR UPDATE`** — o construtor de query do Knex é idêntico nas três engines. Se um dia o contador migrar para um Redis, `KnexCounter` vira outro adapter da mesma porta, sem tocar no gerador.

A máscara vem de `portal-config`, pela porta de leitura que ele publica ([§ 8.4](#84-dependências-entre-domínios)):

```ts
// src/domains/requests/requests.service.ts
async executeCreateRequest(input: CreateRequestInput): Promise<CreatedRequest> {
  return this.execute(async () => {
    const mask = await this.portalConfig.protocolMask();
    const protocol = this.protocol.generate(await this.counter.next("requests"), mask);
    // ...
  });
}
```

Regras de uso:

- o protocolo tem constraint `UNIQUE` — belt-and-braces, já que a bijeção impede a duplicata;
- **a leitura por protocolo nunca usa `.first()`**: é uma sondagem com `LIMIT 2` que falha explicitamente se duas linhas corresponderem. É essa sondagem que impede a exposição de dados de outra solicitação;
- o contador **nunca é resetado nem renumerado**; o limite de domínio (`< 2⁴⁰`) é verificado na geração.

Ver [§ 11](#11-transações) para o vínculo entre o contador e a transação, e [ADR-0008](./adr/0008-protocol-without-collision-risk.md) para a decisão completa.

### 10.6 Paginação

Toda listagem devolve o envelope que o frontend já consome:

```json
{ "data": [], "page": 1, "pageSize": 20, "total": 0, "totalPages": 0 }
```

`pageSize` tem limite máximo definido em `core/pagination`; nenhum repositório consulta sem `limit`.

---

## 11. Transações

### 11.1 Uma Transação, Um Dono

**Toda operação de escrita é um método `execute*` do service, e o `BaseService` abre a transação.** Repositório nunca abre e nunca recebe `trx` como parâmetro — e exige uma transação corrente para gravar.

A fronteira da transação é uma afirmação de negócio: "isto é um fato". O *como* — `knex.transaction` — fica atrás da porta `TransactionManager`; o service declara atomicidade, não SQL.

A fronteira é **por caso de uso**, não por statement: autocommit já paga uma transação e um COMMIT por statement, então agrupar os statements de um caso de uso em uma transação é um desconto, não um custo.

```ts
// src/domains/requests/requests.service.ts
async executeChangeStatus(input: ChangeStatusInput): Promise<void> {
  await this.execute(async () => {
    const request = await this.repository.findById(input.requestId);
    this.assert(request !== null, this.notFound("Solicitação"));

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

### 11.2 Transações Implícitas

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

  async runSnapshot<T>(work: () => Promise<T>): Promise<T> {
    return this.nested(async (trx) => this.scope.run(trx, work), "repeatable read");
  }

  private async nested<T>(
    use: (trx: Knex.Transaction) => Promise<T>,
    isolationLevel?: Knex.IsolationLevels,
  ): Promise<T> {
    const current = this.scope.getStore();
    if (current) {
      // Transação aninhada herda o isolamento da externa: é savepoint, não uma
      // transação independente. O nível só vale quando a transação é raiz.
      return current.transaction((nested) => use(nested));
    }
    return this.knex.transaction({ isolationLevel }, (trx) => use(trx));
  }
}
```

Efeito: dentro de `execute`, qualquer repositório chamado — inclusive de outro domínio — usa a mesma transação, sem que nenhum deles saiba que ela existe.

| Cenário | Semântica |
| --- | --- |
| **Aninhamento** | O `execute` de um service chamado dentro de outro vira **savepoint**. Só a transação externa faz commit; um savepoint pode ser desfeito sozinho, mas nunca confirma por conta própria. |
| **Lote** | Processamento em lote faz `execute` por chunk, não um por item — cada chunk é uma transação, e um chunk que falha não desfaz os anteriores. |
| **Leitura agregada** | Leitura que junta várias tabelas dentro de um domínio (a linha do tempo) usa `this.readSnapshot(...)`, para que todos os statements vejam o mesmo snapshot. O `KnexDatabase` abre a transação raiz com `isolationLevel: "repeatable read"` no Postgres e no MySQL; no SQLite o nível é ignorado, porque o driver serializa escritores. Não é um modo *read only* imposto pelo banco — a transação é de leitura por decisão do caso de uso — e o nome diz o que ela entrega: snapshot, não permissão. Sem isso, o resultado pode ser uma leitura rasgada — o que a linha do tempo mostra pode não ter coexistido. |
| **Leitura simples** | Uma tabela, um statement: sem transação, sem snapshot retido. |
| **Leitura entre domínios** | Projeção (`reports`) que agrega portas de vários domínios não tem snapshot único: cada porta responde na sua própria leitura. Consistência entre domínios é eventual — é o custo de a projeção receber apenas `*Reader` ([§ 7.4](#74-regra-de-herança)). |

### 11.3 O que Pertence à Mesma Transação

| Dentro | Por quê |
| --- | --- |
| A alteração de negócio e a trilha de auditoria que a descreve | Atomicidade da trilha |
| Alterações em tabelas diferentes que descrevem o mesmo fato | O fato é indivisível |
| O registro de evento e o efeito que o evento descreve | O efeito é consequência do evento |

### 11.4 O que Não Pertence

| Fora | Motivo |
| --- | --- |
| Chamada HTTP externa, e-mail ou envio de anexo | Latência e lock retido |
| Leitura usada apenas para montar log | Não é parte do fato |
| Qualquer coisa acima do timeout da transação | Transação aberta prende o snapshot MVCC e impede o *vacuum* de remover tuplas mortas — é o que gera bloat |

### 11.5 Garantia em Runtime

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

## 12. Erros

### 12.1 Tipos

| Tipo | Quando | Carrega status HTTP? |
| --- | --- | --- |
| `DomainError` | Regra de negócio violada; recusa com contexto | Não — vem do registro |
| `AppError` | Erro de aplicação com código estável | Sim |
| `Error` comum | Falha inesperada | Não |

### 12.2 Códigos Estáveis

Todo erro exposto tem um `code` em `snake_case`, estável entre versões. O `code` é o que o frontend deve usar para decidir comportamento; a `message` é para o humano e pode mudar.

| Registro | Códigos | Quem usa |
| --- | --- | --- |
| `core/errors/error-codes.ts` | `validation_error`, `not_found`, `conflict`, `unauthorized`, `forbidden`, `internal_error` | Erros expostos ao cliente |
| Códigos de domínio | `not_the_assignee`, `invalid_status_transition`, … | Erros de `DomainError` |
| `core/errors/internal-codes.ts` | `transaction_required`, `protocol_collision`, `counter_missing` | Erros internos; nunca expostos |

### 12.3 Erro de Domínio com Contexto de Recusa

Um erro de domínio não conhece HTTP. Quando a recusa merece rastro, ele carrega o contexto — a definição de `DomainError` e de `RefusalContext` está em [§ 9.4](#94-auditoria-e-log-o-que-cada-um-garante).

```ts
// src/core/errors/is-auditable.ts
export function isAuditable(error: unknown): error is DomainError & { context: RefusalContext } {
  return error instanceof DomainError && error.context !== undefined;
}
```

O `context` carrega **o que** foi tentado; a borda completa com **quem** e **onde**. O critério de auditabilidade é explícito no erro, não inferido de uma lista na borda.

### 12.4 Mapeamento HTTP

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

### 12.5 Envelope de Resposta

O contrato vigente com o frontend é o do backend legado:

```json
{ "status": "error", "statusCode": 404, "message": "Solicitação não encontrada." }
```

Esse envelope é **temporário**. O `CODING_STANDARDS.md` define `{ "error": { "code", "message", "requestId" } }`, que adiciona código estável e correlação por requisição, e deve ser adotado em uma migração coordenada com o frontend — o cliente atual lê `body.message || body.error` e passaria a exibir `[object Object]`. Ver [ADR-0005](./adr/0005-legacy-error-envelope-temporary.md).

### 12.6 Exposição

| Regra | Efeito |
| --- | --- |
| `expose: true` | A mensagem vai para o cliente |
| `expose: false` (padrão) | O cliente recebe `internal_error` com mensagem genérica |
| Stack, SQL, nome de tabela, path e versão interna | Nunca saem do servidor |
| Causa do erro | Registrada **uma vez**, na borda; camada interna não faz log-and-rethrow |

---

## 13. Validação e a Borda

Tudo que entra pela borda é `unknown` até ser validado.

```ts
// src/domains/requests/requests.schema.ts
export const CreateRequest = z.strictObject({
  demand: z.strictObject({
    category: z.string().min(1).max(40), // classificação no wire vigente
    title: z.string().min(1).max(150),
    description: z.string().min(1).max(4000),
  }),
  requester: z.strictObject({
    fullName: z.string().min(1).max(150),
    corporateEmail: z.email().max(254),
  }),
});
```

> `demand` é o nome do bloco no contrato público já acordado; ver a exceção em [§ 3](#3-nomenclatura). `category` é a **Classificação**; no wire vigente ela viaja em `demand.category`, e a promoção para o topo acompanha o formulário configurável ([`03-Data-Model.md` § 21](./03-Data-Model.md#21-pendências), [ADR-0022](./adr/0022-the-classification-picks-the-form.md)).
>
> Os limites por campo são os do **seed do formulário** ([`03-Data-Model.md` Apêndice A](./03-Data-Model.md#22-apêndice-a--o-seed-do-formulário)); este exemplo é ilustrativo do formato, não da fonte dos limites. A definição do formulário é a fonte única: o schema da borda é gerado a partir dela **e do catálogo de classificações** — a classificação não tem linha na definição, e a borda a valida pelo nome, contra as categorias ativas.

| Regra | Efeito |
| --- | --- |
| `strictObject` rejeita campo desconhecido | Campo novo exige contrato novo |
| O controller repassa ao service um objeto tipado | O service nunca vê o `req.body` cru |
| Sem *mass assignment* | O service mapeia explicitamente os campos validados |
| Erro de validação | `400` com `code: "validation_error"` |
| `Content-Type` inesperado | `415` |

---

## 14. Autenticação e Autorização

### 14.1 Sessão

Login emite JWT em cookie `HttpOnly`. A cada requisição, o middleware:

1. valida a assinatura e a expiração;
2. relê usuário e perfil no banco — desativação e mudança de perfil valem na hora;
3. compara `password_changed_at` com o do token — senha trocada invalida sessões antigas;
4. monta o `Actor` e o coloca em `res.locals`.

### 14.2 Atores

O ator descreve **o estado de autenticação** da requisição:

```ts
// src/core/actor.ts
export type Actor =
  | { readonly kind: "authenticated"; readonly userId: string; readonly profile: Profile }
  | { readonly kind: "requester"; readonly email: string }
  | { readonly kind: "anonymous" };
```

- `authenticated` — há sessão. O `profile` diz o que a pessoa pode fazer.
- `requester` — sem sessão. O e-mail vem do header `X-Requester-Email` e serve **como chave de busca, não como autenticação**: o header não prova identidade e não autoriza nada por si. Vale só no modo de acesso público; no modo autenticado ele é ignorado. O ator cobre o acompanhamento por protocolo e a resposta a pendências de campo. O serviço libera o acesso apenas quando o e-mail confere com a resposta `corporateEmail` da **própria** solicitação (trim e comparação case-insensitive); sem correspondência, a resposta é `404`, nunca `403` — `403` confirmaria que o protocolo existe. O nome exibido vem da resposta gravada, nunca do cliente. O endpoint público tem rate limit por IP e por protocolo.
- `anonymous` — sem sessão e sem identidade.

O header é validado na borda (formato de e-mail, Zod) e o middleware monta o ator; a comparação com o e-mail gravado é feita no serviço, em um lugar só. O `CODING_STANDARDS.md` § 8 proíbe confiar em identidade enviada pelo cliente — este header não autoriza nada: ele só localiza uma solicitação cujo e-mail já gravado coincide. A decisão está em [ADR-0023](./adr/0023-requester-email-is-a-lookup-key.md).

O **perfil** não é um tipo de ator: ele qualifica um ator autenticado. Um solicitante autenticado é `authenticated` com `profile: "solicitante"`; um solicitante anônimo é `requester`.

### 14.3 Perfis

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
| **Analista** | Triar, mapear, priorizar e ler as solicitações sob sua custódia; é o **Responsável** quando designado | Ler solicitações fora da custódia; gerenciar usuários ou configuração |
| **Gestor** | Ler as áreas internas; escrever nota interna | Alterar a solicitação, o status, o responsável e a configuração |
| **Administrador** | Gerenciar Solicitante, Analista e Gestor; conteúdo e configuração | Gerenciar Administrador ou Admin Root; promover a eles |
| **Admin Root** | Todas as permissões; gerencia Administradores | Atribuir Admin Root; alterar o próprio perfil, status ou senha pelas rotas administrativas |

> *Admin Root* existe apenas no seed; nunca há auto-registro nem promoção pela API. A matriz de gestão de contas — ator × operação × perfil atual × perfil de destino — está em [`03-Data-Model.md` § 7.5](./03-Data-Model.md#75-gestão-de-contas).
>
> A hierarquia define **escopo de leitura**, não herança de permissão: o Gestor enxerga mais que o Analista e escreve menos. Permissão não se herda por posição.

### 14.4 Autorização

A autorização é uma **matriz de capabilities escrita em código**, atrás de uma interface. O catálogo tem **26 chaves `recurso:ação`**, em oito verbos, e está em [`03-Data-Model.md` Apêndice B](./03-Data-Model.md#23-apêndice-b--catálogo-de-permissões). A matriz de perfil → chave fica em `core/authorization/profile-permissions.ts`.

Três coisas são diferentes e não se derivam uma da outra:

- **Capability** — a chave, como `triage:write`.
- **Escopo** — `none` ou `owner`; quando `owner`, `own` ou `all`.
- **Atribuibilidade** — o perfil pode receber solicitações; é uma flag explícita, validada pelas chaves de trabalho.

`request:assign` não deriva de `triage:write`: um perfil pode triar sem transferir, ou distribuir sem triar. A atribuibilidade é derivada das chaves de leitura e escrita, mas a participação no pool é uma decisão explícita (`profiles.is_assignable_*`).

```ts
export interface AuthorizationService {
  can(actor: Actor, permission: Permission): boolean;
  assert(actor: Actor, permission: Permission): void;
  scopeOf(actor: Actor, permission: Permission): "own" | "all";
}
```

`Admin Root` recebe todas as permissões. Para chaves `none`, `scopeOf` devolve `all` e o serviço não aplica custódia. `request:status_override` substitui a regra hardcoded “status restrito é do Administrador”; `assignee_directory:read` é a lista de atribuíveis, distinta de `user:read`. A decisão está na [ADR-0025](./adr/0025-authorization-capability-scope.md).

| Nível | O que verifica | Onde |
| --- | --- | --- |
| Rota | Gate grosso por perfil | Middleware |
| Serviço | Capability e escopo — o solicitante só vê a própria solicitação, e só quando o e-mail declarado confere com a resposta gravada; o Responsável atua sobre a que lhe foi designada | Service, em um lugar só por domínio |

**O frontend continua por perfil.** `GET /auth/me` passa a devolver `role` e, como campo aditivo, `permissions: [{ key, scope }]`. O frontend ignora a lista até ter o consumidor de RBAC. A troca é coordenada; nenhuma tela muda por causa desta seção.

### 14.5 Compatibilidade com o frontend atual

Enquanto o frontend não consome chaves, esta tabela é o contrato manual entre `access.service.ts` e a matriz:

| Guarda / ação | Hoje | Alvo |
| --- | --- | --- |
| `internalArea` (fila e detalhe) | `requireRole` por união de perfis | `queue:read` + `request:read`; `own` no Analista, `all` no Gestor/Admin/Root |
| `canEditSolicitation` | Admin ou Responsável | `request:write`; `own`/`all` |
| `canViewTriage` | Admin/Gestor ou Responsável | `triage:read`; `own`/`all` |
| `canCalculatePriority` | Admin ou Responsável | `prioritization:write`; `own`/`all` |
| `canChangeStatusRole` | Admin bypass ou custódia | `request:status_change` `own`/`all` + `request:status_override` `none` |
| `canAssignAnalyst` + modal | Admin; `/users/analysts` aberto a qualquer interno | `request:assign` `own`/`all` + `assignee_directory:read` `none` |
| `managementOnly` | Gestor/Admin | `reports:read` `none` + `queue:export` `owner`/`all` |
| `adminOnly` | Admin | `user:manage`, `portal_config:manage`, `form:manage`; `none` |
| Notas internas | Analista/Gestor/Admin | `internal_note:read`/`write`; `own`/`all` |
| Auditoria | Admin/Gestor; Analista custodial | `audit:read`; `own`/`all` |

**Drifts conhecidos, para a release coordenada:**

- O Analista ainda vê mais solicitações do que a custódia permite. O alvo é `request:read`/`queue:read` em `own`; o frontend precisa filtrar a fila antes de o backend apertar.
- `Admin Root` não existe na união de perfis do frontend. Até a união incluí-lo, ele não deve ser atribuído como perfil de um usuário de UI.
- O Gestor perde `GET /prioritization/criteria`; continua vendo a prioridade pela solicitação e pela fila.

**Regra de mudança:** toda alteração de chave, escopo, atribuibilidade ou matriz de perfil atualiza o Apêndice B e esta tabela na mesma mudança.

### 14.6 Preparação para o RBAC configurável

O modelo alvo completo está no [`03-Data-Model.md` Apêndice C](./03-Data-Model.md#24-apêndice-c--modelo-alvo-de-rbac-configurável): escopo por atribuição, gestão de perfis, separação da configuração do portal, claim e contrato do frontend. Ele não é o contrato vigente.

A transição começa quando o frontend consome `permissions`; a gestão de perfis faz parte do Apêndice C, não é pré-requisito. Até lá, o Apêndice B e esta seção são a fonte da verdade. A [ADR-0025](./adr/0025-authorization-capability-scope.md) registra a decisão.

---

## 15. Roteamento e Montagem da Aplicação

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
  app.use("/api/v1/audit", container.modules.audit.router);
  // ...

  app.use(notFoundHandler);
  app.use(
    createErrorHandler({
      attempts: container.attempts,
      clock: container.clock,
      logger: container.logger,
    }),
  ); // quatro parâmetros, sempre por último
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

## 16. Configuração

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

```ts
// src/core/config/config.ts
export interface Config {
  readonly environment: "development" | "test" | "production";
  readonly port: number;
  /** Espelha o bloco `DATABASE` do schema de ambiente. */
  readonly database: DatabaseConfig;
  readonly cors: { readonly origins: readonly string[] };
  readonly jwtSecret: string;
  readonly protocolSecret: string;
}
```

> **Seed-only.** `ADMIN_ROOT_EMAIL` e `ADMIN_ROOT_PASSWORD` são lidas pelo comando de seed, não pelo `EnvironmentSchema`; o boot da aplicação não as exige. A regra e o comportamento do seed estão em [`03-Data-Model.md` § 25.3](./03-Data-Model.md#253-admin-root).

| Regra | Motivo |
| --- | --- |
| Segredo ausente ou curto demais derruba o boot em produção | Falhar cedo é melhor que falhar no primeiro request |
| `.env.example` documenta as variáveis | Segredo nunca vai para o repositório |
| Nenhum `process.env` fora de `platform/config` | Uma fonte de configuração |
| `Config` (interface) e `EnvironmentSchema` (Zod) têm nomes distintos | O schema valida; a interface é o contrato interno |

---

## 17. Log

O logger é um adapter (`platform/logging`) por trás de uma porta em `core/service`. `createLogger(config: Config): Logger` devolve o adapter concreto, com redaction dos campos sensíveis.

```ts
// src/core/service/logger.ts
export interface Logger {
  info(fields: Record<string, unknown>, message: string): void;
  warn(fields: Record<string, unknown>, message: string): void;
  error(fields: Record<string, unknown>, message: string): void;
}
```

| Regra | Motivo |
| --- | --- |
| Log estruturado em JSON, com nível e campos estáveis | Parseável |
| **Request id** em todo log, aceito de `x-request-id` apenas se for UUID válido | Correlação entre requisição e erro |
| Campos, não concatenação: `logger.info({ requestId, userId }, "request loaded")` | Busca por campo funciona |
| Redação de `authorization`, `cookie`, `set-cookie`, `password`, `token` e `secret` | Segredo não vaza em log |
| PII não entra em log | Dado pessoal não é log |
| A causa de um erro é logada **uma vez**, na borda | Camada interna não faz log-and-rethrow |
| Método, rota, status e duração em todo log de requisição | Métrica de saúde |

**O log é rastro de tentativa, não de fato.** Uma transação que faz *rollback* pode deixar um log dizendo que o status mudou, sem auditoria correspondente. Por isso o log de sucesso sai **depois** do commit, e para saber o que de fato aconteceu se olha a **auditoria** — ver [§ 9.4](#94-auditoria-e-log-o-que-cada-um-garante).

---

## 18. Costuras de Testabilidade

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

## 19. Dependências Permitidas

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
| Um service **nunca** recebe a porta `Database` | A fábrica passa o banco ao repositório, não ao service ([§ 8.2](#82-fábrica-de-módulo)); sem a capacidade, o service não monta SQL fora do repositório |
| `platform` **nunca** importa de `domains` | Inclusive o *error handler*: ele recebe a porta `AttemptRecorder`, não o domínio |
| `app.ts` e `server.ts` **nunca** criam dependência | Eles consomem o `Container` |

---

## 20. Anti-padrões

Os padrões abaixo são os que o backend legado usa e que esta arquitetura existe para não repetir.

| Padrão | Por que é problema | O que fazer |
| --- | --- | --- |
| `import { db } from "../database/conexion.js"` dentro de um service | Dependência implícita, banco travado, nada testável | Injetar o repositório pelo construtor |
| Regra de negócio dentro do repository | Repositório deixa de ser persistência e vira regra sem lugar de teste | Regra no service; repositório só lê e escreve |
| Regra de negócio dentro do controller | Regra não é testável sem HTTP | Regra no service |
| Service **e** repository abrindo transação | Escopo de transação indefinido | Só o service abre |
| Escrita fora de transação | Commit parcial silencioso | `execute()` no service; `assertInTransaction()` no repositório |
| `new XService(dependencies)` com o objeto inteiro do módulo | O service passa a carregar `database` e pode montar query fora do repositório | Tipar o construtor com `XServiceDependencies` ([§ 7.2](#72-baseservice)) e retirar o banco na fábrica ([§ 8.2](#82-fábrica-de-módulo)) |
| `trx` como parâmetro em todo método de repositório | Ruído em todas as assinaturas | Transação implícita por `TransactionManager` |
| `raw()` espalhado em repositório | SQL não portável | `Dialect` ou query builder |
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

## 21. Checklist de Revisão

Cada linha aponta a seção que define a regra. Um PR que muda mais de uma camada marca mais de uma linha.

| [ ] | Regra | Onde | Como verificar |
| --- | --- | --- | --- |
| [ ] | O código pertence a um domínio | [§ 4](#4-estrutura-de-diretórios) | O arquivo está em `src/domains/<domínio>/` |
| [ ] | Toda dependência externa chega pelo construtor | [§ 8](#8-injeção-de-dependência) | Nenhum import de `platform` dentro de `domains` |
| [ ] | Service não recebe a porta `Database`; a fábrica retira o banco antes do construtor | [§ 7.2](#72-baseservice) e [§ 8.2](#82-fábrica-de-módulo) | `rg -e 'new \w+Service\(dependencies' -e 'new \w+Service\(\{\s*\.\.\.' src/domains` é **inspeção**, não "sem achados": o caso legítimo `new XService({ ...serviceDependencies, repository })` aparece. `rg -e 'extends \w*ModuleDependencies' -e '\w+: \w*ModuleDependencies' src/domains -g '*.service.ts'` e `rg 'readonly database: Database' src/domains -g '*.service.ts'` saem vazios; enquanto `src/domains` não existir, o critério pula (`rg` sai com código 2) |
| [ ] | Nenhum repositório, service ou controller de outro domínio é importado | [§ 19](#19-dependências-permitidas) | Só `import type` de uma `*.port.ts` |
| [ ] | Regras no service; tradução HTTP no controller; SQL no repository | [§ 6](#6-responsabilidades-de-camada) | O controller não monta query |
| [ ] | `core` não importa nada de `domains` ou `platform` | [§ 19](#19-dependências-permitidas) | `rg "from \"\.\./(domains\|platform)" src/core` |
| [ ] | Entrada validada na borda com Zod | [§ 13](#13-validação-e-a-borda) | O service recebe objeto tipado, não `req.body` |
| [ ] | Sem `any`; `unknown` na borda; sem assertion sem validação | `CODING_STANDARDS.md` | Type-check estrito passa |
| [ ] | Erros tipados, com `cause`; causa logada uma vez, na borda | [§ 12](#12-erros) | Nenhum `log-and-rethrow` |
| [ ] | Toda escrita é um `execute*`; nenhuma fora de transação — exceto a trilha de tentativas | [§ 11](#11-transações) | `assertInTransaction()` no repositório, com a exceção de `insertAttempt` |
| [ ] | Leitura agregada usa `this.readSnapshot()` | [§ 11.2](#112-transações-implícitas) | Linha do tempo |
| [ ] | Mudança relevante publica evento; trilha da alteração na mesma transação | [§ 9.3](#93-auditoria-de-alteração-por-eventos) | Assinatura no `domains/audit` |
| [ ] | Recusa auditável carrega contexto e é gravada na borda | [§ 9.4](#94-auditoria-e-log-o-que-cada-um-garante) | `DomainError` com `context` |
| [ ] | SQL portátil: sem `raw()` fora do `Dialect` (em `db` ou `client`) | [§ 10.3](#103-regras-de-portabilidade) | `rg "\.raw\(" src/domains` |
| [ ] | ID gerado pela aplicação; protocolo com `UNIQUE` e sondagem `LIMIT 2` | [§ 10.5](#105-protocolo) | Leitura por protocolo |
| [ ] | O service não monta SQL: o contador vem da porta `Counter` | [§ 10.5](#105-protocolo) | `rg "code_counters" src/domains` |
| [ ] | Schema segue as convenções de nomenclatura e constraints | [`03-Data-Model.md` § 2](./03-Data-Model.md#2-convenções-de-nomenclatura) | `ck_`, `uk_`, `idx_`, `fk_` + tabela |
| [ ] | Nenhuma coluna `ENUM`; conjunto fechado é `text` + `ck_` ou tabela de referência | [`03-Data-Model.md` § 2.7](./03-Data-Model.md#27-conjuntos-fechados) | `rg "\.enu\(" src/domains` |
| [ ] | `ON DELETE RESTRICT` em toda chave estrangeira; nada é apagado | [`03-Data-Model.md` § 2.11](./03-Data-Model.md#211-política-de-exclusão) | `rg "onDelete\(" src/domains` |
| [ ] | Schema alterado, modelo documentado atualizado | [ADR-0010](./adr/0010-data-model-doc-is-the-spec.md) | Diff em `03-Data-Model.md` no mesmo PR |
| [ ] | Autorização verificada no servidor, em um lugar só por domínio | [§ 14.4](#144-autorização) | `AuthorizationService.assert` |
| [ ] | Log estruturado com request id; sem PII; sem `console.log` | [§ 17](#17-log) | `rg "console\.(log\|error)" src/` |
| [ ] | Segredo vem de ambiente validado; nunca no repositório | [§ 16](#16-configuração) | `.env.example` sem valor |

---

## 22. Pendências de Arquitetura

As pendências de **schema** estão no [`03-Data-Model.md` § 21](./03-Data-Model.md#21-pendências). As de arquitetura são as daqui:

| Pendência | Impacto | Gatilho |
| --- | --- | --- |
| Envelope de erro `{ error: { code, message, requestId } }` | Frontend precisa ajustar `readErrorMessage` | Release coordenada com o frontend |
| Contratos publicados: ids numéricos e 4 perfis | O frontend atual descarta id que não seja número em categorias e status | Release coordenada; ver § 22.1 |
| Suíte de testes automatizados | Rede de segurança ausente para a reescrita | Ferramentas de teste decididas |
| Credencial de runtime e de migração | O append-only por privilégio exige duas credenciais no Postgres/MySQL; hoje o schema de ambiente tem uma | Implementação do deploy |
| Contrato da API de auditoria | A rota é montada; o formato de resposta não está acordado. O `Page<AuditEntry>` de [§ 9.3](#93-auditoria-de-alteração-por-eventos) é o contrato do service; a tradução para o formato da rota é do controller ([§ 6](#6-responsabilidades-de-camada)) | Formalização do domínio de auditoria |
| RBAC configurável | Desenho no Apêndice C; o Apêndice B continua sendo o contrato | Frontend consumir `permissions` |

### 22.1 Contratos afetados pelo schema

O banco nasce vazio, então não há dado a migrar; há **consumidores** a migrar. A troca de id numérico por UUID é decisão do [ADR-0003](./adr/0003-knex-dialect-portability.md), e o contrato segue o schema — não o contrário.

| Contrato | Hoje | Com o schema novo | Estratégia |
| --- | --- | --- | --- |
| `GET /portal-config` | `categories[].id` e `statuses[].id` são `number`; o status de núcleo é reconhecido por id numérico | Ids UUID; o status ganha `key` estável e o frontend deixa de usar `CORE_STATUS_IDS` numérico | Frontend aceita id string e passa a usar `key`; depois o backend troca |
| `PATCH /requests/:protocol/status` | `targetStatus` é `number` | Id UUID, ou a `key` do status | Preferir `key`; o frontend troca na mesma release |
| `GET /reports/dashboard` | Ids de status, categoria e prioridade são `number` | Ids UUID | Atualizar tipos e filtros do frontend |
| `GET /audit-history` | `audit_id` é `number`; `action_type` é composto | `audit_id` UUID; `action` separado da entidade | Atualizar tipos e rótulos; o vocabulário muda |
| `GET /auth/me`, `GET /users` | Quatro perfis | Cinco perfis, com `Admin Root` | Atualizar as uniões de perfil do frontend |
| `POST /requests` | Categoria em `demand.category` | **Sem mudança agora**; passa a `category` no topo quando o formulário configurável entrar ([`03-Data-Model.md` § 21](./03-Data-Model.md#21-pendências)) | Coordenar na release do formulário configurável |
| `queue.overdueRequests`, `dashboard.overdue`, `situation=overdue` | Derivados de `operational.desiredDeadline` | Indefinidos até a regra de SLA ([ADR-0024](./adr/0024-requested-deadline-is-not-sla.md)) | Não publicar atraso derivado do prazo desejado |

A release é um **cutover coordenado**, não um adapter numérico: devolver id numérico ao frontend reintroduziria a decisão que o ADR-0003 eliminou. A ordem segura é o frontend aceitar os dois formatos e passar a usar a `key` do status; depois o backend novo entra.

---

## 23. Índice

```text
§ 4  Estrutura de Diretórios      § 14 Autenticação e Autorização
§ 5  Catálogo de Domínios         § 15 Roteamento e Montagem da Aplicação
§ 6  Responsabilidades de Camada  § 16 Configuração
§ 7  Classes Base                 § 17 Log
§ 8  Injeção de Dependência       § 18 Costuras de Testabilidade
§ 9  Eventos de Domínio           § 19 Dependências Permitidas
§ 10 Persistência com Knex        § 20 Anti-padrões
§ 11 Transações                   § 21 Checklist de Revisão
§ 12 Erros                        § 22 Pendências de Arquitetura
§ 13 Validação e a Borda
```
