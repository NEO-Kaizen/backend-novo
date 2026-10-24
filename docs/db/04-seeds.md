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

## O que cada grupo semeia

### Perfis

Cinco linhas: `Solicitante`, `Analista`, `Gestor`, `Administrador`, `Admin Root`, todas ativas. As flags de atribuibilidade nascem explícitas: só o `Analista` tem `is_assignable_triage` e `is_assignable_mapping` em `true`; os demais perfis, em `false`, mesmo quando têm as chaves ([§ 7.6](../03-Data-Model.md#76-atribuibilidade)). Os nomes são exatamente os do catálogo de permissões em código ([ADR-0006](../adr/0006-static-profile-authorization.md)); divergência é bug de autorização silencioso.

### Admin Root

Uma conta com `users.name = 'Admin Root'`, `profile_id` de `Admin Root`, `is_active = true`, e uma credencial com `must_change_password = true`. O e-mail e a senha inicial **não estão definidos** — ver [§ 21](../03-Data-Model.md#21-pendências). A senha nunca é versionada: o seed recebe o segredo do ambiente e grava apenas o hash. O e-mail deve ser normalizado (`trim().toLowerCase()`) como qualquer conta.

### Aparências e configuração do portal

Duas Aparências nomeadas, `Claro` e `Escuro`, com os tokens do design system atual e os assets **nulos** — o frontend aplica os defaults locais por token, como o contrato permite. `portal_settings` nasce com `PUBLIC`, `MAAT`, `MAAT`, e aponta os dois slots para essas Aparências. `logo_use_primary_color = true` preserva o contrato atual do frontend.

As URLs de asset do legado (`/uploads/portal/...`) **não** são copiadas para o novo seed: o caminho de upload do backend novo ainda não foi decidido. O frontend cai nos assets locais até que uma Aparência com assets seja configurada.

### Categorias

Dez categorias ativas, `display_order` 1–10, `normalized_name` em minúsculas, e `form_id` apontando para o formulário `solicitacao`. Nenhuma categoria nasce sem formulário: a invariante “categoria ativa tem formulário” vale desde o seed.

### Status

Os 17 status do ciclo de referência, com as chaves estáveis do código e a matriz de flags do motor v4:

- **7 core:** `solicitacao_enviada`, `em_triagem`, `pendente_de_informacoes`, `mapeamento_agendado`, `em_mapeamento`, `concluido`, `cancelado`.
- **2 terminais:** `concluido`, `cancelado`.
- **1 restrito:** `priorizado` — exige `request:status_override` para ser assumido; o flag não é “ninguém pode”, é “só com a chave”.
- **8 públicos:** `solicitacao_enviada`, `aguardando_triagem`, `em_triagem`, `pendente_de_informacoes`, `aguardando_mapeamento`, `em_mapeamento`, `concluido`, `cancelado`.

O legado v4 tem 17 status; as saídas de triagem 18/19 da versão anterior foram removidas do contrato. O desfecho da triagem é um status com `triage_mode = conclusion_only`, não um vocabulário paralelo. `nao_elegivel` fica com `is_terminal = false` no v4; a terminalidade é uma decisão de produto em aberto ([§ 21](../03-Data-Model.md#21-pendências)).

### Critérios

Dez critérios ativos, todos com peso 10. O peso é uma razão relativa; pesos iguais não mudam o resultado. O `code` usa a chave do contrato (`operationalImpact`, …), e `prioritization_evaluations.notes` é indexado por ele. O legado usava ids em português (`impacto_operacional`) e mantinha uma ponte português ↔ inglês; o modelo novo elimina a ponte.

### Faixas de prioridade

Quatro faixas, contíguas na precisão de um decimal: 10,0–20,0 (`Baixa`), 20,1–30,0 (`Média`), 30,1–40,0 (`Alta`) e 40,1–50,0 (`Crítica`). `default_weight` é referência da faixa e nenhum cálculo o usa. A ausência de sobreposição e de lacuna é regra de aplicação, verificada quando a faixa é salva — uma constraint de check não enxerga outras linhas.

### Formulário

`forms.key = 'solicitacao'`, nome `Solicitação`, quatro blocos (`requester`, `demand`, `operational`, `complementary`) e os 32 campos do [Apêndice A](../03-Data-Model.md#22-apêndice-a--o-seed-do-formulário). `display_order` é a posição dentro do bloco; `help_text` é nulo. A categoria não é campo: é a classificação em `requests.category_id`; no wire vigente ela viaja em `demand.category`.

### Pendências

`pending_batches` e `pending_items` não são semeados. O seed de referência não cria solicitação, e um lote de pendência depende de uma. O runbook não cria lote “vazio”: todo lote tem ao menos um item ([§ 13.1](../03-Data-Model.md#131-pending_batches)).

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
