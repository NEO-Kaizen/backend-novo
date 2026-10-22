---
status: aceito
---

# Knex com dialeto e identificadores gerados pela aplicação

O backend legado usa Knex, mas o Postgres está em toda parte: `nextval()` para obter o id antes do insert, casts `::uuid` e `::int`, `COUNT(*) FILTER (WHERE …)`, `setval` em sequences de seed e colunas do tipo `jsonb`. Trocar de engine exigiria reescrever cada repositório.

Decidimos manter **Knex como query builder, sem ORM**, e tornar a portabilidade uma regra verificável: o repositório usa apenas o subset portátil do builder, `db.raw()` é proibido fora de uma porta `Dialect` (com implementações `PostgresDialect`, `SqliteDialect` e `MySqlDialect`), e **todo identificador primário é um UUID v4 gerado pela aplicação**. O contador que alimenta o protocolo é uma tabela comum, não uma sequence — ver [ADR-0008](./0008-protocol-without-collision-risk.md).

## Alternativas consideradas

- **Prisma ou Drizzle.** Drizzle dá tipagem de schema e migrações geradas, mas é orientado a Postgres; Prisma acrescenta um engine binário ao build. Ambos aumentam a dependência de toolchain sem resolver a portabilidade entre engines.
- **Aceitar o Postgres como escolha definitiva.** É a opção mais simples e a mais rápida de entregar, mas contradiz o requisito de trocar de banco sem retrabalho, e a remodelagem do schema seria a última chance de corrigir.
- **Manter sequences do banco para o id inteiro.** Garante colisão zero no protocolo, mas amarra a aplicação ao Postgres e reintroduz `nextval` em cada repositório.

## Consequências

- Sem convenções de ORM: relações, cascatas e migrações geradas são escritas à mão. É mais código, e é código explícito.
- O schema não depende de sequence, `serial` ou `auto_increment`; o id é conhecido antes do insert.
- A portabilidade passa a ser testável: a mesma suíte de repositório pode rodar em duas engines.
- O `Dialect` não é uma abstração vazia: ele concentra `uuidType`, `jsonType`, `timestampType`, `booleanType` e as três capacidades que diferem entre engines (`returning`, row lock, upsert merge).
