# Seeds

> **Operacional, não normativo.** Os valores do seed de referência estão no [Apêndice D](../03-Data-Model.md#25-apêndice-d--seed-de-referência) da especificação. Este arquivo descreve a ordem, a idempotência e a proveniência; em caso de divergência, vale o Apêndice D.

## O que é seed de referência

O seed de referência é o conjunto mínimo para o portal funcionar: perfis, `Admin Root`, configuração do portal, Aparências, categorias, status, critérios, faixas de prioridade e o formulário de abertura. Ele **não** contém dados de demonstração — solicitações, usuários fictícios, notas e cenários de dashboard. Esses dados, quando existirem, ficam em um seed separado e nunca são necessários para o sistema subir.

O seed de referência é diferente de uma migration: migration muda **estrutura**; seed cria **linhas iniciais**. Mudança de valor em linha existente é migration, não seed.

## Ordem

A ordem respeita as FKs do [§ 4](../03-Data-Model.md#4-integridade-referencial-e-ordem-de-criação):

| # | Grupo | Tabela | Chave natural | Depende de |
| --- | --- | --- | --- | --- |
| 1 | Perfis | `profiles` | `name` | — |
| 2 | Admin Root | `users` | `email` | `profiles` |
| 3 | Credencial do Admin Root | `credentials` | `user_id` | `users` |
| 4 | Formulário | `forms` | `key` | — |
| 5 | Blocos | `form_blocks` | (`form_id`, `key`) | `forms` |
| 6 | Campos | `form_fields` | (`form_id`, `key`) | `forms`, `form_blocks` |
| 7 | Aparências | `themes` | `name` | — |
| 8 | Configuração do portal | `portal_settings` | singleton | `themes` |
| 9 | Categorias | `categories` | `normalized_name` | `forms` |
| 10 | Status | `statuses` | `key` | — |
| 11 | Critérios | `criteria` | `code` | — |
| 12 | Faixas de prioridade | `priorities` | `level` | — |

`code_counters` não é semeado: o contador começa vazio e a primeira emissão consome o valor 1. `pending_batches` e `pending_items` também não são semeados: dependem de uma solicitação. `permissions` e `profile_permissions` só entram quando o RBAC configurável chegar.

A ordem entre domínios não é garantida pelo Knex por padrão: ele ordena os arquivos pelo caminho completo, o que agrupa por diretório. Para respeitar a tabela acima, o `knexfile.ts` lista `seeds.directory` na ordem das dependências e usa `sortDirsSeparately: true`, ou um seed orquestrador chama os seeds de domínio na ordem. Detalhes em [`05-operations.md`](./05-operations.md#ordem-dos-seeds).

## Idempotência

O seed é **create-if-absent pela chave natural**: se a linha existe, ela é preservada. Não use `onConflict().merge()` nem upsert de configuração — a configuração é editável no lugar ([ADR-0019](../adr/0019-form-is-editable-in-place.md)), e reexecutar o seed não pode desfazer uma edição administrativa.

Regras:

- O seed **não usa id fixo**. O `id` é UUID gerado pela aplicação; a identidade é a chave natural.
- O seed **não sobrescreve** linha existente. Se a chave existe com valor diferente, a linha é preservada e a divergência é registrada no log do seed.
- `Admin Root` cria `users` e `credentials` na **mesma transação**; se a conta já existe, a credencial não é reescrita.
- `portal_settings` é singleton: insere apenas se não houver linha.
- O formulário é andaime: se o campo já existe, o seed não altera tipo, limites, obrigatoriedade nem rótulo. Ajuste de definição é migration.
- Um seed por domínio, como as migrations ([ADR-0004](../adr/0004-domain-owned-schema-and-migrations.md)).

## O que o seed garante

Os valores estão no [Apêndice D](../03-Data-Model.md#25-apêndice-d--seed-de-referência); aqui fica o que o runbook precisa saber.

| Grupo | Regra |
| --- | --- |
| Perfis | Cinco nomes; só o `Analista` nasce com `is_assignable_triage` e `is_assignable_mapping` em `true` ([§ 7.6](../03-Data-Model.md#76-atribuibilidade)). |
| Admin Root | Conta ativa, perfil `Admin Root`, credencial com `must_change_password = true`; e-mail e senha inicial **pendentes** ([§ 21](../03-Data-Model.md#21-pendências)). |
| Aparências e portal | Dois temas (`Claro`, `Escuro`) com tokens e assets nulos; `portal_settings` com `PUBLIC`, `MAAT`, `MAAT`, apontando os dois slots. |
| Categorias | Dez ativas, `display_order` 1–10, `form_id` para o formulário `solicitacao`. |
| Status | Dezessete do v4: 7 core, 2 terminais, 1 restrito (`priorizado`, que exige `request:status_override`). |
| Critérios | Dez ativos, peso 10, `code` na chave do contrato (`operationalImpact`, …). |
| Prioridades | Quatro faixas contíguas de 10,0 a 50,0; `default_weight` é referência e não entra no cálculo. |
| Formulário | Quatro blocos e 32 campos do Apêndice A; a categoria é coluna, não campo, e viaja em `demand.category`. |
| Pendências | `pending_batches`/`pending_items` **não** são semeados: dependem de uma solicitação. |

`form_answers.value_lookup` é projeção derivada da resposta de e-mail, mantida na escrita e na correção; não é semeada.

## Proveniência e conflitos

Os valores foram extraídos do workspace legado — os caminhos abaixo são relativos à raiz deste repositório, não a esta pasta — com esta precedência:

1. **`docs/03-Data-Model.md`** — o modelo novo decide.
2. **`../frontend/src/lib/config/portal-defaults.ts`** — o contrato v4 de status, categorias, temas e rótulos de critério.
3. **`../backend/seeds/requester_request/002_criteria.js` e `003_priorities.js`** — os valores de referência do legado.
4. **`../backend/migrations/requester_request/20260924000000_*` e `20260926000000_*`** — a matriz de status v4.
5. **`../tirador-pedidos-NEO/docs/produto/`** — as decisões de produto.

Conflitos encontrados e a escolha registrada:

| Conflito | Legado | Modelo novo | Escolha |
| --- | --- | --- | --- |
| Peso dos critérios | Backend `10`; frontend `1.0` | Inteiro 0–10 | **10** |
| Código dos critérios | Português (`impacto_operacional`) com ponte para inglês | `code` é a chave do contrato | **Inglês** (`operationalImpact`) |
| Status `nao_elegivel` | Seed original `is_final = true`; v4 `is_terminal = false` | Segue o v4 | **`false`**, com pendência |
| Quantidade de status | 17 no v4/frontend; 19 nas migrations antigas (18/19) | 17 | **17** |
| Reexecução do seed | `.ignore()` em categorias; `.merge()` em critérios/prioridades | Configuração editável no lugar | **Create-if-absent** |
| Aparências no seed | Legado começava vazio; frontend tem defaults | Pode começar vazio | **Dois temas com tokens; assets nulos** |
| `logo_use_primary_color` | Coluna `false`; sync do legado grava `true` | Default `false` | **`true` no seed** |
| `Admin Root` | Não existe no legado | Existe só no seed | **Pendente** (e-mail/senha) |
| `display_order` das categorias | Backfill = `category_id` (1–10) | Inteiro | **1–10** |
| `statuses.is_restricted` | “status protegido” misturava visibilidade e autorização | Exige `request:status_override`; `priorizado` continua `true` | **Flag + chave**, não perfil fixo |

## Validação depois do seed

Consultas de sanidade, portáveis nas três engines:

```sql
select count(*) from profiles;                    -- 5
select count(*) from profiles where is_assignable_triage; -- 1 (Analista)
select count(*) from profiles where is_assignable_mapping; -- 1 (Analista)
select count(*) from statuses;                    -- 17
select count(*) from statuses where is_core;      -- 7
select count(*) from statuses where is_terminal;  -- 2
select count(*) from statuses where is_restricted;-- 1
select count(*) from categories;                  -- 10
select count(*) from categories where form_id is null; -- 0
select count(*) from criteria where is_active;    -- 10
select sum(weight) from criteria where is_active; -- > 0
select count(*) from priorities;                  -- 4
select count(*) from themes;                      -- 2
select count(*) from portal_settings;             -- 1
select count(*) from forms where key = 'solicitacao'; -- 1
select count(*) from form_blocks;                 -- 4
select count(*) from form_fields;                 -- 32
select count(*) from pending_batches;             -- 0 (seed de referência)
select count(*) from pending_items;               -- 0 (seed de referência)
```

Contagem de campos por bloco:

```sql
select b.key, count(*)
from form_fields f
join form_blocks b on b.id = f.block_id
group by b.key;
-- requester 6 · demand 7 · operational 14 · complementary 5
```

Faixas de prioridade, em ordem:

```sql
select level, min_score, max_score, default_weight
from priorities
order by min_score;
```

Reexecutar o seed não restaura valores editados. Para voltar ao estado de referência, recrie o banco e rode migrations + seed ([`05-operations.md`](./05-operations.md)); não trunque tabelas em um ambiente compartilhado.

## Decisões em aberto

- **Identidade do `Admin Root`** — e-mail e senha inicial ([§ 21](../03-Data-Model.md#21-pendências)).
- **Terminalidade de `nao_elegivel`** — v4 `false`; o seed original o marcava final ([§ 21](../03-Data-Model.md#21-pendências)).
