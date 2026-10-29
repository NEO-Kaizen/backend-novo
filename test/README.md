# Testes

O harness usa **Vitest**, com **Supertest** contra `createApp(container)`. A decisão fecha a aberta desde o seeding do tooling (#31 e #70) e vale para a suíte inteira: o stack-alvo é o mesmo do app — Node 24, ESM, TypeScript direto — e o `node:test` fica para trás por não ter cobertura e mocking maduros no Node 24 (ver [CODING_STANDARDS.md § 10](../CODING_STANDARDS.md)).

## Duas esteiras

|            | Rápida — `npm test`                                  | Confiança — `npm run test:integration`                             |
| ---------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| Precisa de | apenas Node                                          | Postgres/MySQL/SQLite reais                                        |
| Prova      | regra de domínio, contrato HTTP, erros, paginação    | migrations, seeds, constraints, triggers, transações, concorrência |
| Banco      | `StubDatabase` (nada executa query)                  | engines reais, um schema/arquivo por suíte                         |
| Config     | `vitest.config.ts` (padrão)                          | `vitest.integration.config.ts`                                     |
| Regras     | sem `sleep` e sem rede externa; loopback é permitido | sem estado global; migrations + seeds no `beforeAll`               |

- `npm test` roda a esteira rápida e sai 0 sem Docker. Quebra se algum teste precisar de banco, fila ou rede real — isso é teste de integração.
- `test/**/*.integration.test.ts` entra na esteira de confiança; o `npm test` exclui pelo sufixo.
- `npm run test:all` roda as duas em série, na sua máquina. No CI de hoje só a esteira rápida tem job; o de integração entra com a fase 2 (ver [Pendências](#pendências-da-fase-2)).

## Como rodar

| Comando                                   | O que faz                                                |
| ----------------------------------------- | -------------------------------------------------------- |
| `npm test`                                | esteira rápida, uma passada                              |
| `npm run test:watch`                      | esteira rápida em watch                                  |
| `npm test -- test/health/health.test.ts`  | um arquivo só                                            |
| `npx vitest run --testNamePattern "ecoa"` | filtra por nome de teste                                 |
| `npm run test:coverage`                   | cobertura da esteira rápida (`coverage/fast/index.html`) |
| `npm run test:integration`                | esteira de confiança; vazia até a #28 do schema          |
| `npm run test:all`                        | as duas, em série                                        |

O arquivo de teste também é rota de depuração: `npx vitest run --reporter=verbose` lista cada comportamento, e `npx vitest run --inspect-brk --no-file-parallelism` para no breaker.

Como escrever, depurar e o que entra em cada esteira seguem a regra de `docs/02-Architecture.md` § 18: comportamento, não implementação; `describe("POST /api/v1/users")` e `it("retorna 400 quando o e-mail é inválido")`; um comportamento por teste.

## Estrutura

```text
test/
├── setup.ts        # roda antes de cada arquivo: Zod pt-BR (TZ vem do env do Vitest)
├── support/
│   ├── config.ts    # ambiente mínimo de teste, injetado no loadConfig
│   ├── container.ts # composition root de teste com fakes
│   ├── app.ts       # createApp(container) para o Supertest
│   └── fakes/       # implementações determinísticas das portas
├── health/         # suíte por domínio/rota; .integration.test.ts = esteira lenta
└── README.md
```

`src/app.ts` não cria dependência: o container é montado por `createTestContainer()` (`test/support/container.ts`), que devolve fakes nas portas. `TestContainer` é estruturalmente atribuível a `Container`, então `createApp` o aceita sem cast.

## Fakes disponíveis

| Fake                    | Porta                             | O que garante                                        |
| ----------------------- | --------------------------------- | ---------------------------------------------------- |
| `FixedClock`            | `Clock`                           | instante fixo; `advance(ms)` para avançar o tempo    |
| `SequentialIdGenerator` | `IdGenerator`                     | ids em sequência, válidos como uuid v4               |
| `RecordingLogger`       | `Logger`                          | grava em vez de escrever no stdout; `entries(level)` |
| `StubDatabase`          | `Database` + `TransactionManager` | nada executa query; `client` falha alto              |

O default de `createTestContainer()` é usar todos os fakes; para trocar qualquer um, passe no override:

```ts
const container = createTestContainer({
  clock: new FixedClock("2026-06-01T00:00:00.000Z"),
});
```

O que falta está pendente na porta, não no fake: `InMemoryEventPublisher` entra quando a #51 publicar `DomainEventPublisher`, e o storage em memória com a #54. Factories de dado entram com o primeiro domínio que tiver entidade.

Sem `sleep`, sem rede real, sem `Date.now()` e sem `Math.random()` no caminho do domínio: o tempo é o relógio injetado e a porta de teste é o lugar de controlar o não-determinístico (CODING_STANDARDS.md § 10).

## Banco na esteira rápida

`StubDatabase` é o default: o teste que toca nele recebe um erro explícito, sem abrir pool nem esperar rede. As transações seguem a mesma forma do `KnexDatabase` — `run`/`runSnapshot` abrem o contexto e `assertInTransaction` lança só fora dele — e o `Dialect` é trocável pelo construtor, para o fake não mascarar a portabilidade. O container é destruído no `afterEach` de cada teste (`container.database.destroy()`), seguindo o esqueleto de `docs/02-Architecture.md` § 18.

## Pendências da fase 2

A fase 1 não fecha a #70: os critérios de banco e engines ficam explícitos e pendentes, e os adiamentos abaixo são **decisão registrada**, não esquecimento.

- **Engines reais (SQLite, Postgres, MySQL):** o SQLite em memória da decisão da #70 volta a valer quando existir schema para exercitar (#28); hoje nenhuma suíte rápida executa query, e o `StubDatabase` cobre a costura sem banco. Postgres em serviço de CI e MySQL no job de portabilidade entram junto, na fase 2.
- **Banco isolado por suíte:** o helper `createTestDatabase()` nasce com a #28, junto do `knexfile.ts`, das migrations e dos seeds — o smoke de schema é o primeiro teste da esteira de confiança.
- **Fakes de eventos e storage:** `InMemoryEventPublisher` acompanha a porta `DomainEventPublisher` (#51); o storage em memória, a #54.
- **Factories:** entram com o primeiro domínio que tiver entidade; inventar shape de dado antes da #56/#57 seria adivinhar a spec.

## CI

O job `test` roda depois de `quality` no PR e no push da main (`contents: read`, concurrency e cache de npm já no workflow). Ele executa `npm run test:coverage` e publica o relatório como artefato. A esteira de integração entra como job separado quando o schema e as engines reais existirem (#28 e fase 2 da #70); até lá, `npm run test:integration` sai 0 com `passWithNoTests` temporário.
