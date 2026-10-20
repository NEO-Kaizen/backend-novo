---
status: aceito
---

# Schema e migrações pertencem ao domínio

O backend legado tem 55 arquivos de migration distribuídos em três diretórios (`migrations/`, `migrations/requester_request/`, `migrations/users/`) sem que exista uma definição de tabela em código — o schema existe apenas como sequência de migrations. Não há quem responda "de quem é a tabela `triages`?".

Decidimos que **cada domínio é dono do seu schema**: a definição knex das tabelas vive em `src/domains/<domain>/schema/`, as migrations em `migrations/<domain>/` e os seeds em `seeds/<domain>/`. O `knexfile.ts` lista os diretórios por domínio, e o schema completo é a soma das definições.

## Alternativas consideradas

- **Tudo centralizado em `db/`** — schema, migrations e seeds num único lugar. Facilita ver o modelo total, mas quebra a localize: a tabela deixa de estar ao lado da regra que a usa, e a migration continua órfã de um dono.
- **Manter migrations em pasta única, só com prefixo do domínio no nome.** O nome indica o dono, mas o arquivo continua longe do código que depende da tabela.

## Consequências

- O `knexfile.ts` ganha uma entrada por domínio; um domínio novo exige uma entrada nova.
- Uma migration que altera tabelas de dois domínios é cheiro de domínio mal separado — o comportamento esperado é um evento mais uma migration por domínio.
- A remodelagem do banco começa do zero, com o schema escrito junto do código que o usa.
