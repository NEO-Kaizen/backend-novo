# Operação do Banco

> **Contrato operacional, não normativo.** O modelo é [`../03-Data-Model.md`](../03-Data-Model.md). Este arquivo descreve como criar, migrar, semear, verificar e diagnosticar o banco. O repositório ainda não tem código: os comandos marcados como **previstos** são a interface que o scaffolding deve expor, não scripts que já existem.

## Engines

O schema é portátil entre **PostgreSQL**, **MySQL** e **SQLite**, atrás da porta `Dialect` ([ADR-0003](../adr/0003-knex-dialect-portability.md), [02-Architecture § 10.2](../02-Architecture.md#102-o-dialect)):

| Engine     | Uso previsto                             | Observações                                                        |
| ---------- | ---------------------------------------- | ------------------------------------------------------------------ |
| PostgreSQL | Desenvolvimento compartilhado e produção | Engine de referência do legado                                     |
| MySQL      | Portabilidade verificável                | Sem `ENUM`, sem `ARRAY`, sem índice funcional e sem `jsonb_typeof` |
| SQLite     | Testes rápidos e ambiente local          | Não bloqueia linha (`forUpdate`), `returning` e upsert variam      |

A regra de portabilidade é a de [§ 10.3](../02-Architecture.md#103-regras-de-portabilidade): `raw()` fora do `Dialect` (via `db` ou `client`) é proibido, o repositório usa só o query builder, e tipo de UUID, JSON, timestamp e booleano vêm do `Dialect`.

Texto **indexado ou único** é `varchar(n)` com `ck_` de comprimento; texto longo (descrição, nota, resposta) é `text` e não é indexado pelo valor inteiro. Busca em texto longo usa projeção curta — `form_answers.value_lookup` para o e-mail ([§ 2.9](../03-Data-Model.md#29-texto-números-e-json)).

## Configuração

O boot valida a configuração ([02-Architecture § 16](../02-Architecture.md#16-configuração)). O bloco de banco é:

```ts
DATABASE: {
  ENGINE: "postgres" | "sqlite" | "mysql",
  HOST: string,
  PORT: number,
  NAME: string,
  USER: string,
  PASSWORD: string,
}
```

O schema de ambiente é `z.strictObject`, então variável desconhecida ou ausente derruba o boot. O `.env.example` documenta as variáveis; segredo nunca vai para o repositório.

> **Lacuna conhecida.** O legado usa variáveis planas `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASSWORD`; o modelo novo define o bloco `DATABASE`, mas os nomes das variáveis de ambiente ainda não foram decididos. Não invente um prefixo: a decisão entra com o adapter de configuração.

> **Seed do Admin Root.** O comando de seed lê `ADMIN_ROOT_EMAIL` e `ADMIN_ROOT_PASSWORD` do ambiente; elas são **seed-only** e não entram no `EnvironmentSchema` do boot. O e-mail é normalizado e validado; a senha tem ≥ 14 caracteres e é gravada só como hash. Se a conta não existe, `users` e `credentials` são criadas na mesma transação com `must_change_password = true`. Se o e-mail já existe com outro perfil, o seed falha; se já é `Admin Root`, a senha não é reescrita. Sem as duas variáveis, o seed falha antes de escrever.

> **Credencial de auditoria.** O append-only de `audit_entries` é garantido no banco: triggers `BEFORE UPDATE`/`BEFORE DELETE` nas três engines e, no Postgres/MySQL, uma credencial de aplicação sem `UPDATE`/`DELETE`/`DROP`/`TRUNCATE`. Isso exige **duas credenciais** — runtime e migração — e o bloco `DATABASE` atual tem uma. A separação é pendência de deploy ([02-Architecture § 22](../02-Architecture.md#22-pendências-de-arquitetura)).

## Schema, migrations e seeds

Cada domínio é dono do seu schema ([ADR-0004](../adr/0004-domain-owned-schema-and-migrations.md)):

```text
src/domains/<domínio>/schema/   # definição Knex das tabelas
migrations/<domínio>/           # migrations do domínio
seeds/<domínio>/                # seeds do domínio
knexfile.ts                     # lista os diretórios por domínio
```

- **Uma migration altera tabelas de um domínio só.** FK para outro domínio é declarada na migration do domínio que referencia.
- **A ordem de criação é a ordem dos timestamps das migrations** ([§ 4](../03-Data-Model.md#4-integridade-referencial-e-ordem-de-criação)). A tabela referenciada precisa existir antes da que a referencia.
- **Renomear ou excluir uma tabela referenciada** exige remover antes a FK que a aponta; essa migration é do domínio que referencia.
- **Seeds são separados por domínio** e o seed de referência é create-if-absent ([`04-seeds.md`](./04-seeds.md)). `pending_batches` e `pending_items` não são semeados: dependem de uma solicitação.

### Ordem dos seeds

O Knex ordena os seeds pelo caminho completo por padrão, e isso agrupa por diretório — não pela ordem de dependência. Como há um seed por domínio ([`04-seeds.md`](./04-seeds.md)), a ordem entre domínios precisa ser explícita: o `knexfile.ts` deve listar `seeds.directory` na ordem das dependências — `users` → `auth` → `forms` → `portal-config` → `prioritization` — e usar `sortDirsSeparately: true`, **ou** um seed orquestrador deve chamar os seeds de domínio nessa ordem. Dentro do domínio, o próprio seed insere as tabelas na ordem das FKs: `profiles` antes de `users`, `themes` antes de `portal_settings` e `forms` antes de `form_blocks`/`form_fields`. Sem essa ordem, a FK `users.profile_id` falha; e sem `forms` antes de `portal-config`, falha `categories.form_id`.

### Semântica de atraso

`overdue` **não** é derivado de `operational.desiredDeadline`. O prazo desejado é uma expectativa do solicitante, não um SLA; a fila e o dashboard não publicam atraso até a regra de SLA por etapa/prioridade existir ([ADR-0024](../adr/0024-requested-deadline-is-not-sla.md), [§ 21](../03-Data-Model.md#21-pendências)). Se o produto quiser um sinal provisório, ele se chama “prazo desejado vencido”.

## Fluxo local

Os comandos abaixo são a interface prevista: `knexfile.ts`, `migrations/` e `seeds/` nascem no scaffolding. No Node 24 o type stripping é nativo, então o `--knexfile knexfile.ts` não exige o flag `--experimental-strip-types` nem um loader.

1. **Criar o banco** (exemplo; o nome é o de `DATABASE.NAME`):

   ```bash
   # PostgreSQL
   createdb neo_dev

   # MySQL
   mysql -e 'create database neo_dev character set utf8mb4 collate utf8mb4_unicode_ci;'

   # SQLite
   # O arquivo é criado pela conexão; use o caminho em DATABASE.NAME.
   ```

2. **Configurar o ambiente** com o bloco `DATABASE` e os segredos. O arquivo `.env` fica fora do versionamento.

3. **Rodar as migrations**:

   ```bash
   npx knex migrate:latest --knexfile knexfile.ts
   npx knex migrate:list --knexfile knexfile.ts
   ```

4. **Rodar os seeds**:

   ```bash
   npx knex seed:run --knexfile knexfile.ts
   ```

5. **Verificar** as contagens do [`04-seeds.md`](./04-seeds.md) e o checklist de paridade do [`README.md`](./README.md).

### Rollback

O Knex expõe `migrate:rollback`, mas a **política de rollback não está decidida**. Até que esteja, toda migration declara `down`, e o rollback é testado em banco descartável — nunca em um ambiente compartilhado sem backup.

```bash
npx knex migrate:rollback --knexfile knexfile.ts   # previsto
```

### Reset local

Reset é destrutivo. O caminho seguro é descartar o banco e recriar:

```bash
dropdb neo_dev          # PostgreSQL; confirme o nome antes
createdb neo_dev
npx knex migrate:latest --knexfile knexfile.ts
npx knex seed:run --knexfile knexfile.ts
```

Não trunque tabelas em um ambiente compartilhado. Reexecutar o seed **não** restaura valores editados: ele preserva a linha existente.

## Testes de banco

A camada de testes ainda não existe ([02-Architecture § 18](../02-Architecture.md#18-costuras-de-testabilidade)). O que já está decidido:

- A mesma suíte de repositório deve poder rodar em **duas engines** — é o que torna a portabilidade verificável ([ADR-0003](../adr/0003-knex-dialect-portability.md)).
- SQLite é o candidato para testes rápidos, mas `forUpdate`, `returning` e upsert não se comportam igual; o teste que depende dessas capacidades consulta o `Dialect`.
- Teste de integração recria o schema do zero (migrations) e roda o seed de referência; não depende de banco pré-existente.

A estratégia concreta (in-memory, arquivo temporário, container) está **em aberto**; não invente uma configuração de teste antes da decisão.

## Verificação

- **Paridade documento × derivados:** checklist do [`README.md`](./README.md). É revisão humana; não há gerador.
- **Paridade especificação × Knex:** revisão humana da definição em `src/domains/<domínio>/schema/` contra [`../03-Data-Model.md`](../03-Data-Model.md). O comparador automático citado na [ADR-0010](../adr/0010-data-model-doc-is-the-spec.md) só existe quando a ferramenta for decidida.
- **Seeds:** as consultas de [`04-seeds.md`](./04-seeds.md).
- **Portabilidade:** as regras de [§ 10.3](../02-Architecture.md#103-regras-de-portabilidade) e a suíte em duas engines.
- **Índices:** confira no `EXPLAIN` só depois de haver volume; o modelo não promete plano, promete os índices listados.

## Diagnóstico

| Sintoma                                                       | Causa provável                                         | O que fazer                                                                                                                   |
| ------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Migration falha ao criar FK                                   | Tabela referenciada ainda não existe                   | Confira a ordem em [§ 4](../03-Data-Model.md#4-integridade-referencial-e-ordem-de-criação) e o timestamp da migration         |
| Seed falha em `users.profile_id`                              | O seed do domínio `users` não inseriu `profiles` antes | Insira `profiles` antes de `users` no seed do domínio                                                                         |
| Seed duplica linha                                            | A busca pela chave natural não foi usada               | Implemente create-if-absent; não use id fixo nem `merge`                                                                      |
| `ENUM`/`ARRAY`/`jsonb` funciona no Postgres e quebra no MySQL | Tipo nativo fora do `Dialect`                          | Use coluna com `ck_`, tabela filha e `dialect.jsonType()`                                                                     |
| Índice funcional `LOWER(name)` quebra no MySQL                | `LOWER()` em índice não é portátil                     | Use coluna normalizada mantida pela aplicação (`normalized_name`)                                                             |
| `forUpdate` não bloqueia                                      | SQLite não suporta row lock                            | Consulte `dialect.supportsRowLocks()` e degrade                                                                               |
| Upsert com merge falha                                        | Engine não suporta merge no alvo                       | Consulte `dialect.supportsUpsertMerge()` e faça insert + update                                                               |
| Migration parcialmente aplicada                               | Falha no meio do batch                                 | Verifique `knex_migrations`; recupere conforme a engine, em banco descartável ou com backup                                   |
| Protocolo duplicado                                           | Leitura por protocolo com `.first()`                   | Use a sondagem `LIMIT 2` que falha explicitamente ([§ 8.1](../03-Data-Model.md#81-requests))                                  |
| Predicado de cor hexadecimal quebra em uma engine             | `INSTR`/regex fora do `Dialect`                        | Use `dialect.hexColorCheck(column)`; o predicado é por engine ([02-Architecture § 10.2](../02-Architecture.md#102-o-dialect)) |
| Auditoria aceita `UPDATE`/`DELETE`                            | Guarda só na aplicação, sem trigger/privilégio         | Use `dialect.auditAppendOnlyGuard()` e a credencial de runtime sem escrita ([§ 15.1](../03-Data-Model.md#151-audit_entries))  |

## Segurança, acesso e retenção

- **Acesso ao banco:** o modelo não define papéis de banco, usuário de aplicação nem usuário de leitura para relatórios. É uma decisão de operação em aberto; o princípio é o menor privilégio. O append-only da auditoria exige a separação entre runtime e migração descrita acima.
- **Autorização:** as 26 chaves `recurso:ação` são matriz em código ([Apêndice B](../03-Data-Model.md#23-apêndice-b--catálogo-de-permissões)); o alvo com `permissions`/`profile_permissions` está no [Apêndice C](../03-Data-Model.md#24-apêndice-c--modelo-alvo-de-rbac-configurável) e não é schema vigente.
- **Segredos:** senha e hash nunca em log, resposta ou fixture; o `.env` não é versionado. `ADMIN_ROOT_PASSWORD` existe só no ambiente do seed e não é impresso; a senha inicial é trocada no primeiro acesso.
- **PII:** o banco guarda nome, e-mail, área, departamento e contato do solicitante; a auditoria guarda autor e IP. A retenção e a anonimização não estão definidas.
- **Exclusão:** `ON DELETE RESTRICT` em todas as FKs; nada é apagado. Solicitação encerra (`closed_at`), usuário desativa (`is_active = false`), configuração desativa. A lista completa está em [§ 2.11](../03-Data-Model.md#211-política-de-exclusão).
- **Anexo restrito:** `attachments.is_restricted` existe sem regra; a decisão de LGPD está em [§ 21](../03-Data-Model.md#21-pendências).
- **Backup e restauração:** não definidos. Enquanto não estiverem, nenhum ambiente é considerado recuperável.

## Checklist de mudança de schema

- [ ] A especificação [`../03-Data-Model.md`](../03-Data-Model.md) foi alterada primeiro.
- [ ] A migration do domínio dono foi criada/alterada; nenhuma migration toca dois domínios.
- [ ] A FK foi declarada no domínio que referencia, com `ON DELETE RESTRICT`.
- [ ] O nome da constraint segue [§ 2.8](../03-Data-Model.md#28-índices-e-constraints).
- [ ] Os três derivados foram atualizados no mesmo PR: [`02-reference.md`](./02-reference.md), [`03-erd.md`](./03-erd.md) e [`schema.dbml`](./schema.dbml).
- [ ] O seed precisou mudar? Se for valor de linha existente, é migration; se for linha nova de referência, atualize o [Apêndice D](../03-Data-Model.md#25-apêndice-d--seed-de-referência) e o [`04-seeds.md`](./04-seeds.md).
- [ ] O checklist de paridade do [`README.md`](./README.md) passou.
