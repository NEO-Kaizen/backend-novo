# Documentação do Banco de Dados

Esta pasta reúne a documentação **derivada** e **operacional** do banco. A especificação normativa continua sendo [`../03-Data-Model.md`](../03-Data-Model.md) ([ADR-0010](../adr/0010-data-model-doc-is-the-spec.md)): em qualquer divergência, vale o que está lá.

## Mapa

| Arquivo | O que é | Normativo? | Para quem |
| --- | --- | --- | --- |
| [`01-vocabulary.md`](./01-vocabulary.md) | Índice termo → tabela | Não | Quem está lendo o glossário ou o modelo |
| [`02-reference.md`](./02-reference.md) | Dicionário de dados: colunas, tipos, nulabilidade, defaults, constraints, índices e FKs | Não — derivado à mão | Quem implementa ou revisa uma tabela |
| [`03-erd.md`](./03-erd.md) | Mapa completo e diagramas por domínio, com atributos | Não | Quem precisa enxergar as relações |
| [`schema.dbml`](./schema.dbml) | Schema legível por ferramenta (dbdiagram.io, dbdocs.io) | Não | Quem quer abrir o modelo visualmente |
| [`04-seeds.md`](./04-seeds.md) | Inventário, ordem e idempotência dos seeds | Não — operacional | Quem implementa ou executa o seed |
| [`05-operations.md`](./05-operations.md) | Configuração, migrations, seeds, reset, testes e verificação | Não — operacional | Quem opera o banco em desenvolvimento ou produção |

Os valores do seed de referência estão no [Apêndice D](../03-Data-Model.md#25-apêndice-d--seed-de-referência) da especificação. Este conjunto de arquivos não repete a especificação inteira: ele organiza o acesso a ela.

## Por onde começar

- **Vou implementar uma tabela ou migration.** Leia [`../03-Data-Model.md`](../03-Data-Model.md) § 2 (convenções) e § 4 (ordem de criação), depois a seção do domínio. Use [`02-reference.md`](./02-reference.md) para conferir coluna, tipo e constraint.
- **Vou revisar um schema ou uma migration.** Use o [checklist de paridade](#checklist-de-paridade) abaixo, o catálogo de constraints em [`02-reference.md`](./02-reference.md) e o mapa em [`03-erd.md`](./03-erd.md).
- **Vou rodar o banco.** Leia [`05-operations.md`](./05-operations.md) e [`04-seeds.md`](./04-seeds.md).
- **Quero entender um termo.** Comece em [`01-vocabulary.md`](./01-vocabulary.md) e no [`../../GLOSSARY.md`](../../GLOSSARY.md).
- **Quero ver o modelo visualmente.** Abra [`03-erd.md`](./03-erd.md) ou importe [`schema.dbml`](./schema.dbml) no [dbdiagram.io](https://dbdiagram.io).

## Fonte de verdade e manutenção

`../03-Data-Model.md` é o único lugar onde o schema é decidido. Os arquivos `02-reference.md`, `03-erd.md` e `schema.dbml` são **derivados à mão** e precisam ser atualizados no **mesmo pull request** que altera a especificação. Não há gerador nem CI: a paridade é verificada na revisão humana.

Regras:

1. **Alterou o schema?** Altere primeiro a especificação.
2. **Atualize os três derivados no mesmo PR:** referência, ERD e DBML.
3. **Não invente um fato no derivado.** Se a informação não está na especificação, ela pertence à especificação — não ao derivado.
4. **Seeds e operações são runbooks.** Eles podem apontar para a especificação e para comandos, mas não podem redefinir tabela, coluna ou invariante.

## Checklist de paridade

Use antes de abrir ou aprovar um PR que toque o schema:

- [ ] As **29 tabelas** da especificação aparecem nos três derivados (28 de domínio + `code_counters`).
- [ ] Cada tabela tem a **PK** correta em [`02-reference.md`](./02-reference.md) e em [`schema.dbml`](./schema.dbml); as PKs compostas são `internal_note_read_states` (`request_id`, `user_id`) e a futura `profile_permissions`.
- [ ] Cada **FK** da especificação tem uma aresta no ERD e um `ref` no DBML. As exceções são as referências polimórficas `audit_entries.entity_id` e `attempts.entity_id`, que não têm FK; `attempts.correlation_id` é correlação HTTP, também sem FK.
- [ ] Cada **índice/unicidade** nomeado (`uk_`, `idx_`) aparece na referência e no DBML.
- [ ] Cada **constraint nomeada** (`ck_`, `uk_`, `idx_`, `pk_`) aparece na referência; o catálogo no fim da referência não tem nome inventado.
- [ ] Cada mudança de coluna tem o **tipo, a nulabilidade e o default** iguais aos da especificação.
- [ ] O **Apêndice D** e [`04-seeds.md`](./04-seeds.md) contam a mesma história: mesmas tabelas, mesmas chaves naturais, mesma ordem.
- [ ] O Mermaid de [`03-erd.md`](./03-erd.md) renderiza e o DBML importa sem erro.
- [ ] As decisões em aberto de [§ 21](../03-Data-Model.md#21-pendências) não foram resolvidas por conta própria em um derivado.

## Decisões em aberto

- **Identidade do `Admin Root`** — e-mail e senha inicial ([§ 21](../03-Data-Model.md#21-pendências)).
- **Terminalidade de `nao_elegivel`** — o v4 a deixa não terminal; o seed original a marcava final ([§ 21](../03-Data-Model.md#21-pendências)).
- **SLA e atraso** — `overdue` não é derivado do prazo desejado; a regra de SLA é pendência ([ADR-0024](../adr/0024-requested-deadline-is-not-sla.md)).
- **Credencial de auditoria** — o append-only exige runtime e migração separados; o bloco `DATABASE` atual tem uma credencial.
- **RBAC alvo** — `permissions`/`profile_permissions` estão no [Apêndice C](../03-Data-Model.md#24-apêndice-c--modelo-alvo-de-rbac-configurável), fora das 29 tabelas vigentes.

As demais escolhas do seed estão registradas em [`04-seeds.md`](./04-seeds.md).

## Status

O repositório ainda é **especificação**: não há código, migrations nem banco em execução. [`05-operations.md`](./05-operations.md) descreve o contrato de operação; os comandos marcados como “previstos” só passam a existir quando o scaffolding do backend chegar.
