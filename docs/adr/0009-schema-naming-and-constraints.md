---
status: aceito
---

# Convenções de nomenclatura e constraints do schema

Cada domínio é dono do seu schema e escreve as tabelas à mão, em Knex, sem ORM (ver [ADR-0004](./0004-domain-owned-schema-and-migrations.md)). A portabilidade entre engines é uma regra verificável, não uma intenção (ver [ADR-0003](./0003-knex-dialect-portability.md)). Sem convenções, cada domínio inventa os próprios nomes — e o legado mostra o custo: 55 migrations com `btrim` (inexistente no MySQL), índice único funcional sobre `LOWER(name)` (Postgres apenas), `ENUM` nativo em nove colunas, e `ON DELETE` misturando `CASCADE`, `SET NULL` e `RESTRICT` sem critério.

Decidimos que **o schema segue um conjunto único de convenções**, registradas em [`docs/03-Data-Model.md`](../03-Data-Model.md) § 2 e aplicadas à revisão:

- **Tabelas** em `snake_case` no plural, em inglês, com o nome do domínio como prefixo natural (`requests`, `internal_notes`).
- **Colunas** em `snake_case`; booleanos com prefixo `is_` ou `has_`; campos de texto com limite de tamanho têm constraint `ck_` própria.
- **Chave primária** sempre `id`, UUID v4 gerado pela aplicação; chave estrangeira `<entidade_no_singular>_id`.
- **Timestamps**: `created_at` e `updated_at` em linhas mutáveis; `occurred_at` em linhas de evento (`triages`, `audit_entries`, `attempts`); um único tipo de timestamp em toda a base.
- **Exclusão**: `ON DELETE RESTRICT` em todas as chaves estrangeiras. Nenhum `CASCADE`, nenhum `SET NULL`.
- **Conjuntos fechados de valores**: se o código enumera os valores, `text` com constraint `ck_` espelhando o catálogo do código; se o negócio administra os valores, tabela de referência.
- **Normalização**: e-mail é armazenado em minúsculas e único sobre o valor armazenado; unicidade sem distinção de caixa que não possa ser feita por `LOWER()` usa coluna normalizada mantida pela aplicação.

O critério por trás da política de exclusão é que **nada é apagado**: solicitações, usuários e linhas de configuração são desativados, nunca excluídos. Por isso `RESTRICT` é universal e a ausência de `CASCADE`/`SET NULL` é uma afirmação sobre o domínio, não uma omissão.

## Alternativas consideradas

- **Deixar o knex decidir os nomes.** Nomes gerados (`users_user_id_seq`, `triage_triages_id_foreign`) são legíveis para quem lê o DDL, mas não dão o mesmo poder para quem escreve migration: a constraint de unicidade continua se chamando `users_email_unique`. A convenção explícita deixa o nome da constraint dizer o que ela garante.
- **Um ORM com tipagem de schema.** Drizzle e Prisma geram migrations e nomes de constraint sozinho, e resolveriam a divergência de nomenclatura entre domínios. Ambos são orientados a um dialeto específico e quebram a portabilidade que [ADR-0003](./0003-knex-dialect-portability.md) exige.
- **Deixar cada domínio escolher.** É o que o legado fez: `idx_requests_status`, `idx_categories_status`, `idx_professionals_status`, `idx_details_professional_status` — quatro domínios, quatro maneiras de nomear a mesma coisa, e nenhuma revisão com um padrão contra o qual conferir.
- **Validador automático de convenções.** Um linter que valida nomes de coluna e de constraint contra a convenção pegaria a divergência na máquina. É uma boa evolução, mas depende de uma decisão de ferramentas que o repositório ainda não tomou; enquanto isso, a convenção vive na revisão.

## Consequências

- O catálogo de constraints de uma tabela é previsível: `ck_<tabela>_<assunto>`, `uk_<tabela>_<colunas>`, `idx_<tabela>_<colunas>`, `fk_<tabela>_<coluna>`.
- Constraints são declaradas com o construtor do knex (`table.check(predicate, undefined, "ck_nome")`), nunca com `ALTER TABLE` escrito à mão — `db.raw()` fora da porta `Dialect` é proibido por [ADR-0003](./0003-knex-dialect-portability.md).
- Uma constraint de check não enxerga outras linhas: invariantes que dependem de mais de uma linha (faixas de prioridade que não podem se sobrepor, por exemplo) são regras de aplicação e aparecem listadas como invariantes na documentação do modelo.
- Mudar de convenção depois custa uma migration por tabela; por isso a convenção é decidida uma vez, aqui.
