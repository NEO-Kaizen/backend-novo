# Knex com dialeto e identificadores gerados pela aplicação

O backend legado usa Knex, mas o Postgres está em toda parte: `nextval()` para obter o id antes do insert, casts `::uuid` e `::int`, `COUNT(*) FILTER (WHERE …)`, `setval` em sequences de seed e colunas do tipo `jsonb`. Além disso, o protocolo público é derivado por uma cifra de Feistel sobre o id numérico da sequência — o que amarra o formato do protocolo ao banco.

Decidimos manter **Knex como query builder, sem ORM**, e tornar a portabilidade uma regra verificável: o repositório usa apenas o subset portátil do builder, `db.raw()` é proibido fora de uma porta `Dialect` (com implementações `PostgresDialect`, `SqliteDialect` e `MySqlDialect`), e **todo identificador primário é um UUID v4 gerado pela aplicação**. O protocolo passa a ser derivado do id por HMAC-SHA256 truncado em 40 bits, preservando o formato `MAAT-XXXX-XXXX` que o frontend já valida.

## Alternativas consideradas

- **Prisma ou Drizzle.** Drizzle dá tipagem de schema e migrações geradas, mas é orientado a Postgres; Prisma acrescenta um engine binário ao build. Ambos aumentam a dependência de toolchain sem resolver a portabilidade entre engines.
- **Aceitar o Postgres como escolha definitiva.** É a opção mais simples e a mais rápida de entregar, mas contradiz o requisito de trocar de banco sem retrabalho, e a remodelagem do schema seria a última chance de corrigir.
- **Manter a cifra de Feistel sobre id numérico.** Mantém o protocolo bijetivo, mas exige id inteiro vindo do banco, o que reintroduz sequences e a dependência de engine.

## Consequências

- Sem convenências de ORM: relações, cascatas e migrações geradas são escritas à mão. É mais código, e é código explícito.
- O protocolo deixa de ser bijetivo: com 40 bits de espaço, colisão é possível em volume alto. `protocol` ganha constraint `UNIQUE` e o repositório tenta até três vezes antes de falhar com `protocol_collision`.
- A portabilidade passa a ser testável: a mesma suíte de repositório pode rodar em duas engines.
