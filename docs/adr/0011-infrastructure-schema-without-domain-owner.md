---
status: aceito
---

# Schema de infraestrutura sem dono de domínio

A [ADR-0004](./0004-domain-owned-schema-and-migrations.md) estabelece que cada domínio é dono do seu schema: a definição em Knex vive em `src/domains/<domain>/schema/`, as migrations em `migrations/<domain>/` e os seeds em `seeds/<domain>/`. O objetivo da regra é simples — **toda tabela tem um dono, e ninguém mais escreve nela**. A pergunta "de quem é a tabela X?" sempre tem resposta.

A [ADR-0008](./0008-protocol-without-collision-risk.md) introduziu a tabela `code_counters`, que alimenta o gerador de protocolo através da porta `Counter`. Ela não tem dono de domínio: não pertence a `requests` nem a nenhum outro — é infraestrutura, consumida por qualquer domínio que precise de um contador, e usada hoje pelo gerador de protocolo.

Decidimos **estender a regra da ADR-0004** para tabelas de infraestrutura sem dono de domínio: o schema delas vive em `src/platform/database/schema/` e as migrations em `migrations/platform/`. `code_counters` é o primeiro — e hoje único — caso. O `knexfile.ts` ganha uma entrada por diretório de migrations, como já ganha uma por domínio.

## Alternativas consideradas

- **`requests` como dono de `code_counters`.** O protocolo é o único uso atual, e `requests` já é dono de `requests.protocol`. Mas a ADR-0008 prevê uma linha por domínio: o primeiro consumidor de outra área passaria a escrever na tabela de outro domínio, que é exatamente o que a ADR-0004 proíbe.
- **Uma pasta de migrations única para infraestrutura, ao lado das migrations de domínio.** Mistura o ordenamento global por timestamp entre tabelas de domínios diferentes e tabelas de infraestrutura, sem que a fronteira de posse fique visível.
- **Schema de infraestrutura em `platform`.** `platform` é onde vivem os adaptadores concretos (banco, http, ids, crypto) e onde o `Dialect` mora; a porta `Counter` está em `core/repository/`. O schema segue a porta: onde a interface é, a implementação fica — e a implementação inclui a tabela. Escolhido.

## Consequências

- A ADR-0004 passa a valer assim: **toda tabela tem um dono**, e o dono é um domínio ou, para infraestrutura, `platform`.
- O `knexfile.ts` ganha `migrations/platform` na lista de diretórios.
- `platform` não publica porta de leitura nem de escrita para outros domínios: o acesso ao contador passa pela porta `Counter`, em `core`. A tabela continua sendo detalhe de implementação.
- Se um dia o contador migrar para um Redis, a porta `Counter` substitui a tabela sem alterar o gerador — o ponto de troca fica explícito, como já previa a ADR-0008.
