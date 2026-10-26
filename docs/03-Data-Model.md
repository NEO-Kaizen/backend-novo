# Modelo de Dados

O modelo de dados do **MAAT** (Tirador de Pedidos): as tabelas, as colunas, as relações e as invariantes que a aplicação assume.

Este documento é **normativo**. A definição em Knex de cada domínio implementa o que está aqui; uma mudança de schema que não atualiza este documento é incompleta — ver [ADR-0010](./adr/0010-data-model-doc-is-the-spec.md). As convenções de nomenclatura e constraints estão em [ADR-0009](./adr/0009-schema-naming-and-constraints.md).

Documentos relacionados:

- [`01-Overview.md`](./01-Overview.md) — o sistema, o escopo, a stack.
- [`02-Architecture.md`](./02-Architecture.md) — camadas, injeção de dependências, persistência com Knex.
- [`db/README.md`](./db/README.md) — porta de entrada da documentação derivada do banco.
- [`db/01-vocabulary.md`](./db/01-vocabulary.md) — índice termo → tabela.
- [`db/02-reference.md`](./db/02-reference.md) — dicionário de dados para consulta.
- [`db/03-erd.md`](./db/03-erd.md) — diagramas de entidade.
- [`db/schema.dbml`](./db/schema.dbml) — schema para dbdiagram/dbdocs.
- [`db/04-seeds.md`](./db/04-seeds.md) — inventário e ordem dos seeds.
- [`db/05-operations.md`](./db/05-operations.md) — operação do banco, migrations e seeds.
- [`../GLOSSARY.md`](../GLOSSARY.md) — vocabulário do domínio.
- [`adr/`](./adr/) — decisões de arquitetura registradas.

> **Fonte de verdade.** Este documento é a especificação. Os arquivos em [`db/`](./db/) são derivados ou operacionais: quando divergirem, vale o que está aqui ([ADR-0010](./adr/0010-data-model-doc-is-the-spec.md)).

## Índice

| § | Seção |
| --- | --- |
| [1](#1-escopo-e-fonte-de-verdade) | Escopo e Fonte de Verdade |
| [2](#2-convenções-de-nomenclatura) | Convenções de Nomenclatura |
| [3](#3-vocabulário-para-schema) | Vocabulário para Schema |
| [4](#4-integridade-referencial-e-ordem-de-criação) | Integridade Referencial e Ordem de Criação |
| [5](#5-visão-geral-das-entidades) | Visão Geral das Entidades |
| [6](#6-domínio-auth) | Domínio `auth` — `credentials` |
| [7](#7-domínio-users) | Domínio `users` — `profiles`, `users`, `analyst_details`, `analyst_detail_categories` |
| [8](#8-domínio-requests) | Domínio `requests` — `requests`, `form_answers`, `attachments`, `request_time_preferences` |
| [9](#9-domínio-triage) | Domínio `triage` — `triages` |
| [10](#10-domínio-mapping) | Domínio `mapping` — `mappings`, `mapping_participants` |
| [11](#11-domínio-queue) | Domínio `queue` — projeção de leitura |
| [12](#12-domínio-prioritization) | Domínio `prioritization` — `criteria`, `priorities`, `prioritization_evaluations` |
| [13](#13-domínio-pending-items) | Domínio `pending-items` — `pending_batches`, `pending_items` |
| [14](#14-domínio-internal-notes) | Domínio `internal-notes` — `internal_notes`, `internal_note_read_states` |
| [15](#15-domínio-audit) | Domínio `audit` — `audit_entries`, `attempts` |
| [16](#16-domínio-reports) | Domínio `reports` — projeção de leitura |
| [17](#17-domínio-portal-config) | Domínio `portal-config` — `portal_settings`, `themes`, `categories`, `statuses` |
| [18](#18-domínio-forms) | Domínio `forms` — `forms`, `form_blocks`, `form_fields` |
| [19](#19-schema-de-infraestrutura) | Schema de Infraestrutura — `code_counters` |
| [20](#20-catálogo-de-tabelas) | Catálogo de Tabelas |
| [21](#21-pendências) | Pendências |
| [22](#22-apêndice-a--o-seed-do-formulário) | Apêndice A — o Seed do Formulário |
| [23](#23-apêndice-b--catálogo-de-permissões) | Apêndice B — Catálogo de Permissões |
| [24](#24-apêndice-c--modelo-alvo-de-rbac-configurável) | Apêndice C — Modelo alvo de RBAC configurável |
| [25](#25-apêndice-d--seed-de-referência) | Apêndice D — Seed de Referência |

---

## 1. Escopo e Fonte de Verdade

O backend é organizado em treze domínios, cada um dono das suas tabelas ([ADR-0004](./adr/0004-domain-owned-schema-and-migrations.md)). Este documento descreve o schema completo: a soma das tabelas de cada domínio, mais a tabela de infraestrutura que não tem dono de domínio ([ADR-0011](./adr/0011-infrastructure-schema-without-domain-owner.md)).

O modelo é **novo**, escrito do zero: as migrations do legado são referência de dados e de regras, não de estrutura. Não há dado a migrar — o backend novo nasce com o banco vazio.

Três coisas convivem neste documento:

| Camada | Onde vive | Quem muda |
| --- | --- | --- |
| **Estrutura** — tabela, coluna, tipo, nulabilidade, constraint, índice | § 6 a § 19 deste documento | Domain owner, na definição em Knex do domínio |
| **Regras de negócio** — o que a coluna significa e que comportamento ela carrega | "Regras de negócio" no fim de cada seção de domínio | Product + domain owner |
| **Decisões** — por que a estrutura é essa | [`adr/`](./adr/) | Architecture decision |

As regras de negócio têm **duas fontes**, e cada uma vale para um lado diferente:

- O **legado** é a fonte das *regras*: o que o produto faz, como o time trabalha, o que uma recusa significa. Onde o legado tinha um defeito técnico — `ENUM` nativo, `btrim`, índice funcional, `CASCADE` — a estrutura muda e a regra não.
- O **frontend** é a fonte do *contrato de entrada*: os campos do formulário, seus rótulos, suas obrigatoriedades e seus limites. O modelo aplica esse contrato na abertura da solicitação.

Por isso cada seção de domínio fecha com o bloco **Regras de negócio**, dividido em *preservadas do legado* e *acrescentadas pelo modelo novo*: uma coluna nova sem herança no legado é uma **decisão**.

### 1.1 Inventário

28 tabelas distribuídas por **11 dos 13 domínios** — `queue` e `reports` são projeções de leitura, sem tabela própria — mais 1 tabela de infraestrutura:

| Domínio | Tabelas | Escreve |
| --- | --- | --- |
| `auth` | `credentials` | `auth` |
| `users` | `profiles`, `users`, `analyst_details`, `analyst_detail_categories` | `users` |
| `requests` | `requests`, `form_answers`, `attachments`, `request_time_preferences` | `requests` |
| `triage` | `triages` | `triage` |
| `mapping` | `mappings`, `mapping_participants` | `mapping` |
| `queue` | — *(projeção de leitura)* | — |
| `prioritization` | `criteria`, `priorities`, `prioritization_evaluations` | `prioritization` |
| `pending-items` | `pending_batches`, `pending_items` | `pending-items` |
| `internal-notes` | `internal_notes`, `internal_note_read_states` | `internal-notes` |
| `audit` | `audit_entries`, `attempts` | `audit` |
| `reports` | — *(projeção de leitura)* | — |
| `portal-config` | `portal_settings`, `themes`, `categories`, `statuses` | `portal-config` |
| `forms` | `forms`, `form_blocks`, `form_fields` | `forms` |
| `platform` | `code_counters` | `platform` (infraestrutura) |

---

## 2. Convenções de Nomenclatura

As regras valem para todas as tabelas deste documento. A justificativa de cada uma está em [ADR-0009](./adr/0009-schema-naming-and-constraints.md).

### 2.1 Tabelas

`snake_case`, no plural, em inglês, com o nome do domínio refletido no nome quando a tabela é específica dele (`internal_notes`, `mapping_participants`). Tabela que descreve um **documento 1:1** com outro usa o nome do pai com o sufixo `_details` (`analyst_details`).

**Identificadores técnicos não são vocabulário.** Os nomes de tabela, coluna, constraint e chave de permissão seguem a convenção de nomenclatura em inglês e não o vocabulário do domínio, que está em [`GLOSSARY.md`](../GLOSSARY.md). Exceções, por usarem palavra do domínio: `themes` (a Aparência) e `pending_batches` / `pending_items` (a Pendência).

### 2.2 Colunas

`snake_case`. Booleanos com prefixo `is_` ou `has_`, com as exceções registradas em [§ 2.6](#26-booleanos).

Colunas de texto com limite de tamanho têm constraint `ck_` própria, nomeada `ck_<tabela>_<coluna>_length`. O `ck_` é necessário porque o SQLite ignora o comprimento declarado em `varchar(n)`; ele é o que torna o limite explícito e uniforme nas três engines. Onde a tabela deste documento escreve apenas "≤ N", o nome da constraint é o implícito acima.

O **tipo** — `varchar(n)` ou `text` — segue [§ 2.9](#29-texto-números-e-json).

Constraint que não é só de comprimento — faixa de valor, faixa numérica, formato — se nomeia `ck_<tabela>_<coluna>_<assunto>`: `ck_criteria_weight_range`, `ck_priorities_score_range`, `ck_priorities_min_score_range`, `ck_priorities_max_score_range`, `ck_analyst_details_capacity_non_negative`, `ck_themes_hex`, `ck_themes_gradient_angle`, `ck_mappings_duration_minutes`. A regra do comprimento continua valendo: `ck_internal_notes_content_length`, `ck_themes_avatar_url_length`, `ck_themes_login_image_url_length`, `ck_themes_favicon_url_length`.

Tabela que modela **uma instância** de um conceito repetível não prefixa as colunas com a instância: `themes` tem `background`, não `light_background` — a instância é a linha.

**Exceção: a chave de um campo de formulário é o contrato.** O valor de `form_fields.key` e de `form_blocks.key` é a chave que o frontend envia no payload (`processName`, `desiredDeadline`), em camelCase. Não é snake_case porque não é nome interno: é a chave que liga a definição ao contrato da API, e o frontend valida contra ela.

**Classificação.** Atributo da solicitação que **não é pergunta**: o modelo a mantém no topo, e o valor vive numa coluna da entidade, com FK e NOT NULL. O wire vigente manda `demand.category` (§21, [ADR-0022](./adr/0022-the-classification-picks-the-form.md)).

São três as classificações — Status, Prioridade e Categoria — e **só a Categoria é pedida ao solicitante**: o Status vem do ciclo, e a Prioridade é calculada.

A Categoria tem **dois papéis**: situa a solicitação no fluxo **e escolhe o formulário** que o solicitante preenche (`categories.form_id`).

Duas consequências, e ambas são mecânicas: **a classificação não tem linha em `form_fields`** — `form_fields` é a tabela das perguntas, e a classificação não é uma; e **não existe resposta para uma classificação**, porque a resposta aponta para uma linha de `form_fields`.

**Uma classificação que pode faltar não é classificação — é campo.** É o NOT NULL da coluna que faz a diferença, e é ele que impede o administrador de removê-la. No modelo ela não se move: a classificação não pertence a bloco nenhum, porque é ela que escolhe o formulário.

| Classificação | Onde vira coluna | Quem resolve | Quem pode pedir a correção |
| --- | --- | --- | --- |
| Categoria | `requests.category_id` | Abertura e correção por pendência, pelo nome, contra as categorias ativas | O solicitante, por pendência; a equipe, na triagem |

### 2.3 Chaves Primárias

Toda chave primária é `id`, UUID v4 gerado pela aplicação via porta `IdGenerator` ([ADR-0003](./adr/0003-knex-dialect-portability.md)). O schema não depende de `sequence`, `serial` ou `auto_increment`.

Três exceções, todas com chave natural ou composta, e nenhuma delas é um id sintético:

- **`code_counters`** usa `name` (varchar(50)) como chave, porque a linha é identificada pelo nome do contador — é o que a porta `Counter` recebe.
- **`internal_note_read_states`** usa a PK composta (`request_id`, `user_id`), porque a marca de leitura é única por usuário e por solicitação.
- **`profile_permissions`** usa a PK composta (`profile_id`, `permission_id`), quando o RBAC configurável chegar.

A tabela singleton `portal_settings` usa `id` UUID como chave e é garantida pela aplicação e pelo seed — nenhuma constraint portable conta linhas.

### 2.4 Chaves Estrangeiras

Coluna nomeada `<entidade_no_singular>_id`, referenciando `id` da outra tabela. `ON DELETE RESTRICT` em todas.

**Quando a FK carrega a função do ator**, o prefixo da função vem antes do nome da entidade: `actor_user_id`, `author_user_id`, `created_by_user_id`, `responsible_id`, `assignee_user_id`, `calculated_by_user_id`, `validated_by_user_id`, `updated_by_user_id`, `requester_user_id`. A entidade alvo é sempre `users.id`.

**Três colunas não seguem o padrão `<entidade>_id`**, porque o nome carrega a função e não o alvo: `form_answers.field_id` e `pending_items.form_field_id` apontam para `forms.form_fields.id`; `internal_note_read_states.last_read_note_id` aponta para `internal_notes.id`. São exceções intencionais.

`pending_items.classification_key` não é chave estrangeira: é o vocabulário de código das classificações, `∈ category`, espelhado em `ck_pending_items_classification_key` ([§ 2.7](#27-conjuntos-fechados)).

A referência aponta para a **entidade**, nunca para a sua extensão 1:1. A identidade de uma pessoa é `users.id`; `analyst_details` é extensão de `users` e nunca é referenciada. A mesma regra vale para qualquer extensão 1:1 — `analyst_details` também é alcançada por `users.id`.

Relações com **naturalmente mais de uma origem** são polimórficas e **não têm FK** — é o caso de `audit_entries.entity_id`, que aponta para qualquer entidade auditável. A regra é a exceção, não o padrão.

### 2.5 Timestamps

| Tipo de linha | Colunas |
| --- | --- |
| Linha mutável | `created_at` e `updated_at` |
| Linha de evento | `occurred_at` (tempo de negócio, não ordem de commit) |
| Linha append-only | `created_at` apenas |

**Exceções de forma, já no modelo:** `attachments` registra `uploaded_at`; `internal_note_read_states` registra `read_at`; `code_counters` registra apenas `updated_at`; `credentials` registra apenas `created_at` — a única mutação é a troca de senha, e ela já tem `password_changed_at`; `request_time_preferences` é append-only. O que vale para todas é o **tipo** único de timestamp.

Coluna que guarda um instante do processo, e não da escrita, é declarada por conta própria e não substitui `created_at`/`updated_at`: `prioritization_evaluations.calculated_at`, `pending_items.responded_at`, `pending_items.validated_at`, `requests.closed_at`, `requests.meeting_scheduled_for`, `requests.last_external_update_at`, `mappings.scheduled_for`, `mappings.concluded_at`.

**Quem tocou por último é coluna.** `requests.updated_by_user_id`, `mappings.updated_by_user_id` e `portal_settings.updated_by_user_id` respondem a pergunta "quem mexeu nisto" sem varrer a auditoria — a auditoria continua sendo o rastro completo.

Um único tipo de timestamp em toda a base, via `dialect.timestampType()`. `occurred_at` é tempo de negócio, não ordem de commit ([ADR-0007](./adr/0007-event-driven-audit.md)).

### 2.6 Booleanos

Prefixo `is_` ou `has_`. Um "enum" de dois valores é boolean: `categories.status` (active/inactive) virou `categories.is_active`, e `analyst_details.status` virou `analyst_details.is_available`.

**Exceções, já no modelo:** `form_fields.required` e `form_fields.must_be_future` (o prefixo seria redundante com o nome do campo); `credentials.must_change_password` e `pending_batches.request_attachment` (o prefixo repetiria o verbo do substantivo que já está no nome); `form_answers.value_boolean` (é a **coluna de valor** de uma resposta booleana, não uma marca); e os tokens de Aparência `themes.logo_use_primary_color` e `themes.status_*_background_locked` (o prefixo quebraria o nome do token que o frontend consome).

### 2.7 Conjuntos Fechados

Cada conjunto fechado de valores é decidido por três testes, em ordem:

1. **Quem possui o vocabulário?** O código — o conjunto é enumerado e fixo no código → coluna com constraint `ck_` espelhando o catálogo do código, que é a fonte da verdade — `text`, ou `varchar(n)` quando a coluna é única ou indexada ([§ 2.9](#29-texto-números-e-json)). O negócio — o conjunto cresce em tempo de execução → tabela de referência.
2. **É um estado que o código transiciona?** → coluna, nunca linha de referência.
3. **É um "enum" de dois valores?** → boolean.

O discriminante é **quem possui o vocabulário**, não quem edita a linha: um administrador que escolhe um `statuses.tone` não possui o conjunto de tons.

Há um caso misto: um conjunto com **dados de referência** e um rótulo enumerado — `priorities.level` é um rótulo de quatro níveis que o código conhece, e a tabela existe porque a faixa de score (`min_score`, `max_score`) é dado de referência administrável. Nesse caso o rótulo é coluna da tabela de referência, com a sua própria `ck_` (`ck_priorities_level`), e a tabela existe pelo dado, não pelo rótulo.

Consequências:

- O mesmo conjunto não é armazenado duas vezes **como coluna de classificação**. Onde existe tabela de referência, o resto referencia por FK — `prioritization_evaluations.priority_id` é a **única** casa da faixa ([ADR-0016](./adr/0016-priority-has-one-home.md)). *Exceção:* os campos `select` do formulário têm opções inline que coincidem com um conjunto do produto; são vocabulários de formulário, não de classificação, e não têm FK porque o formulário é um catálogo genérico. Nenhum deles é classificação — **status, prioridade e categoria são as três**.
- Os quatro `select` do formulário usam duas escalas de gravidade diferentes: `perceivedCriticality` (urgência percebida pelo solicitante) e `operationalImpact` (impacto do pedido no processo). São perguntas distintas e alimentam critérios distintos da priorização. **Todos os `select` do formulário têm opções inline.** A **categoria** não é um `select` do formulário: as suas opções são as **categorias ativas**, e elas vivem em `portal-config.categories` — o formulário não guarda cópia delas, e a classificação Categoria não tem linha em `form_fields`.
- Tabela de referência referenciada **pelo código** precisa de chave estável: `profiles.name` **é** a chave de `core/authorization/profile-permissions.ts`.
- Tabela de referência referenciada **por id** não precisa de chave estável para a FK: `statuses` usa `id` e `order_number`; a `key` existe porque o código a referencia, e é ela que o seed fixa.
- Adicionar um valor a um vocabulário do código toca o catálogo **e** a constraint `ck_` no mesmo pull request. São espelhos; um PR que muda um sem o outro está quebrado.

**Toda entidade que pode ser escrita tem tipo de entidade auditável.** A lista vive no catálogo de auditoria em código e é espelhada em `ck_audit_entries_entity_type` ([ADR-0020](./adr/0020-audit-trail-shape.md)). Entidade cujo ciclo de vida é controlado pelo pai é auditada sob o pai. Duas ficam de fora: `internal_note_read_state` é auditada sob `internal_note`, e `code_counters` é infraestrutura, fora do domínio.

### 2.8 Índices e Constraints

| Prefixo | Objeto |
| --- | --- |
| `pk_` | chave primária |
| `fk_` | chave estrangeira |
| `uk_` | unicidade |
| `idx_` | índice |
| `ck_` | constraint de check |

O nome carrega a tabela: `ck_attachments_size_bytes`, `uk_requests_protocol`, `idx_requests_status_id`, `fk_mapping_participants_mapping_id`. A tabela entra no nome porque MySQL e SQLite escopam nomes de constraint por tabela e o Postgres por schema. O nome da constraint de chave estrangeira é o implícito `fk_<tabela>_<coluna>`.

Constraints são declaradas com o construtor do knex (`table.check(predicate, undefined, "ck_nome")`), nunca com `ALTER TABLE` escrito à mão: `raw()` fora da porta `Dialect` é proibido ([ADR-0003](./adr/0003-knex-dialect-portability.md)).

Uma constraint de check **não enxerga outras linhas**. Invariante que depende de mais de uma linha — duas faixas de prioridade que não podem se sobrepor, por exemplo — é regra de aplicação e aparece listada como invariante na seção do domínio.

### 2.9 Texto, Números e JSON

- Texto limitado e **indexado ou único**: `varchar(n)` + `ck_` de comprimento. O `varchar` é o que o MySQL consegue indexar sem prefixo; o `ck_` cobre o SQLite, que ignora o `n`.
- Texto limitado e **não indexado** (descrições, notas, respostas longas): `text` + `ck_` de comprimento.
- **Texto longo não é indexado pelo valor inteiro.** No Postgres a entrada de B-tree tem limite de tamanho, e no MySQL o índice em `TEXT` exigiria prefixo. Quando a busca precisa de um texto longo, indexe uma projeção curta — como `form_answers.value_lookup` para o e-mail —, nunca o valor inteiro.
- Texto sem limite: `text`.
- Decimal com precisão explícita: `decimal(5,1)` para o score de priorização, `decimal(4,1)` para a faixa de score da prioridade, `decimal(3,2)` para o peso padrão da faixa, `decimal(10,2)` para o número de uma resposta de formulário e para os limites de um campo numérico.
- JSON via `dialect.jsonType()`. A **forma** do JSON é validada na borda, com Zod ([02-Architecture § 13](./02-Architecture.md#13-validação-e-a-borda)): `json_typeof()` é Postgres, e o equivalente diverge entre MySQL e SQLite.

### 2.10 Normalização

- **E-mail** é armazenado em minúsculas (`trim().toLowerCase()`) e único sobre o valor armazenado. O login normaliza antes de comparar.
- **Unicidade sem distinção de caixa** que não possa ser feita com `LOWER()` — porque índice funcional não é portátil — usa **coluna normalizada** mantida pela aplicação e única: `categories.normalized_name`.
- O e-mail do **solicitante** — a resposta de `requester.corporateEmail` — **não** é único, de propósito: mais de uma pessoa pode usar a mesma caixa corporativo. Não é um defeito. O e-mail da **conta** (`users.email`) é único.
- O e-mail do solicitante é **normalizado** como o da conta (`trim().toLowerCase()`), mesmo sem ser único — a busca por e-mail compara `form_answers.value_lookup`, a projeção normalizada, e não o `value_text` inteiro ([ADR-0023](./adr/0023-requester-email-is-a-lookup-key.md)).

### 2.11 Política de Exclusão

`ON DELETE RESTRICT` em todas as chaves estrangeiras. Não há `CASCADE` nem `SET NULL` em lugar nenhum do modelo.

A política é uma afirmação sobre o domínio: **nada é apagado**.

| Entidade | Como se retira |
| --- | --- |
| Solicitação | Encerrada (`closed_at`), nunca excluída |
| Usuário | Desativado (`users.is_active = false`), nunca excluído |
| Perfil, categoria, status, prioridade, critério | Desativado (`is_active = false`), nunca excluído |
| Nota interna, triagem, mapeamento, pendência, anexo | Não há rota de exclusão; a solicitação que os contém não é excluída |
| Formulário, bloco, campo | Desativado (`is_active = false`), nunca excluído: as respostas antigas continuam apontando para eles |

Esta tabela é a lista completa. Nenhuma seção de domínio repete a regra.

Por isso a exclusão de um status em uso é bloqueada pelo banco, e o caminho para retirá-lo é desativá-lo.

---

## 3. Vocabulário para Schema

O índice **termo → tabela** está em [`db/01-vocabulary.md`](./db/01-vocabulary.md). É um índice de leitura, não parte da especificação.

## 4. Integridade Referencial e Ordem de Criação

Toda referência entre tabelas é uma FK com `ON DELETE RESTRICT`, inclusive entre domínios — **exceto as referências polimórficas** listadas no fim desta seção. A FK é declarada **na migration do domínio que referencia** e altera só a tabela que referencia: a [ADR-0004](./adr/0004-domain-owned-schema-and-migrations.md) proíbe alterar tabelas de dois domínios, não apontar para a tabela de outro.

Duas consequências operacionais:

**Ordem de criação.** A tabela referenciada precisa existir antes da que a referencia — se a ordem for invertida, a migration falha ao declarar a FK, porque a tabela referenciada ainda não existe. O knex ordena as migrations globalmente pelo prefixo de timestamp, então a ordem abaixo é a ordem dos timestamps das migrations:

| # | Domínio | Tabelas |
| --- | --- | --- |
| 1 | `users` | `profiles`, `users`, `analyst_details` |
| 2 | `forms` | `forms`, `form_blocks`, `form_fields` |
| 3 | `portal-config` | `statuses`, `categories`, `themes`, `portal_settings` |
| 4 | `users` | `analyst_detail_categories` |
| 5 | `prioritization` | `criteria`, `priorities` |
| 6 | `auth` | `credentials` |
| 7 | `requests` | `requests`, `form_answers`, `request_time_preferences` |
| 8 | `triage` | `triages` |
| 9 | `mapping` | `mappings`, `mapping_participants` |
| 10 | `pending-items` | `pending_batches`, `pending_items` |
| 11 | `requests` | `attachments` |
| 12 | `internal-notes` | `internal_notes`, `internal_note_read_states` |
| 13 | `prioritization` | `prioritization_evaluations` |
| 14 | `audit` | `audit_entries`, `attempts` |
| 15 | `platform` | `code_counters` |

**Desmontagem.** Renomear ou excluir uma tabela referenciada exige antes remover a FK que a aponta — e essa migration é do domínio que referencia. É o único ponto em que a autonomia de um domínio toca a de outro, e ele é explícito.

**Exceções ao padrão.** Estas colunas não têm FK:

| Coluna | Por quê |
| --- | --- |
| `audit_entries.entity_id` → qualquer entidade | Referência polimórfica por natureza |
| `attempts.entity_id` → qualquer entidade | Referência polimórfica por natureza |
| `audit_entries.entity_type` / `action` | Vocabulário do código, espelhado em `ck_` |
| `attempts.entity_type` / `action` | Vocabulário do código, espelhado em `ck_` |
| `attempts.correlation_id` | Correlação HTTP, não referência |
| `pending_items.classification_key` | Vocabulário da classificação, sem FK |

---

## 5. Visão Geral das Entidades

O schema tem uma entidade central e quatro agrupamentos de leitura. A solicitação (`requests`) é o sujeito do ciclo; o conteúdo dela é uma resposta de formulário, e o que a situa no fluxo são as três classificações — Status, Categoria e Prioridade.

| Agrupamento | Entidades | Papel |
| --- | --- | --- |
| **Ciclo da solicitação** | `requests`, `form_answers`, `attachments`, `request_time_preferences`, `triages`, `mappings`, `mapping_participants`, `prioritization_evaluations`, `pending_batches`, `pending_items`, `internal_notes`, `internal_note_read_states` | O que acontece com a solicitação, da abertura ao encerramento |
| **Acesso e configuração** | `profiles`, `users`, `analyst_details`, `analyst_detail_categories`, `credentials`, `portal_settings`, `themes`, `categories`, `statuses`, `criteria`, `priorities`, `forms`, `form_blocks`, `form_fields` | Quem acessa, o que o portal oferece e como o formulário é definido |
| **Auditoria** | `audit_entries`, `attempts` | O que foi alterado e o que foi recusado |
| **Infraestrutura** | `code_counters` | O contador que alimenta o protocolo |

`queue` e `reports` não têm tabela: são projeções de leitura sobre as entidades acima. A linha do tempo também é projeção — `audit_entries` somados a `internal_notes`.

**Caminhos de leitura**

- Para implementar uma tabela: comece por [§ 2](#2-convenções-de-nomenclatura), confira a posição em [§ 4](#4-integridade-referencial-e-ordem-de-criação) e leia a seção do domínio. O dicionário de consulta está em [`db/02-reference.md`](./db/02-reference.md).
- Para revisar um schema ou uma migration: use o catálogo de [§ 20](#20-catálogo-de-tabelas), o catálogo de constraints em [`db/02-reference.md`](./db/02-reference.md) e os diagramas em [`db/03-erd.md`](./db/03-erd.md).
- Para operar o banco: leia [`db/04-seeds.md`](./db/04-seeds.md) e [`db/05-operations.md`](./db/05-operations.md).

Os diagramas são de **orientação** e não são normativos. O mapa completo e os diagramas por domínio estão em [`db/03-erd.md`](./db/03-erd.md); a versão legível por ferramenta está em [`db/schema.dbml`](./db/schema.dbml).

## 6. Domínio `auth`

Responsabilidade: login, logout, sessão, troca de senha. Publica a porta `AuthReader`. É o único domínio que enxerga material de senha.

### 6.1 `credentials`

Material de credencial do usuário. Separado de `users` para que o domínio `users` nunca segure segredo: `UserReader` não pode vazar hash, e nenhuma listagem de usuários precisa se lembrar de excluir uma coluna.

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | PK, UUID v4 gerado pela aplicação |
| `user_id` | uuid | não | — | FK → `users.id` (RESTRICT), UNIQUE `uk_credentials_user_id` |
| `password_hash` | text | não | — | `ck_credentials_password_hash_length` ≤ 255 |
| `password_changed_at` | timestamp | não | `now` | Época de revogação dos tokens |
| `must_change_password` | boolean | não | `true` | Trava todas as rotas exceto `/auth/me` e `/auth/change-password` |
| `created_at` | timestamp | não | `now` | Sem `updated_at`: a única mutação é a troca de senha, já marcada em `password_changed_at` |

**Relações** — `user_id` → `users.id`.

**Índices** — `uk_credentials_user_id` (único).

**Invariantes**

- Uma credencial por usuário, e todo usuário tem credencial. `Admin Root` é criado no seed.
- O hash é bcrypt (`$2b$10$…`): algoritmo e custo estão na própria string, então trocar de algoritmo não exige migration.
- `password_changed_at` nunca anda para trás. Um token emitido antes do valor atual é recusado — é o mecanismo de revogação.
- A senha nunca é armazenada; só o hash. A resposta de login é idêntica para e-mail inexistente, conta inativa e senha errada.
- **Não existe tabela de sessões.** A sessão é o token: JWT em cookie `HttpOnly`, relido do banco a cada requisição ([02-Architecture § 14.1](./02-Architecture.md#141-sessão)). Logout encerra o cookie; a janela de exposição é o TTL. Desativar a conta ou trocar a senha invalida todos os tokens emitidos.

**Regras de negócio**

*Preservadas do legado*

- Resposta única de login — "credenciais inválidas" — para e-mail inexistente, conta inativa, perfil inativo e senha errada, com comparação de tempo uniforme.
- `must_change_password` bloqueia tudo, exceto a própria troca e a consulta de sessão.
- Senha temporária gerada por CSPRNG, com 14 caracteres, exibida uma única vez ao administrador, e que obriga a troca.
- Troca de senha exige a senha atual e prohíbe que a nova seja igual à atual.
- A troca de senha grava o registro de auditoria **na mesma transação**; se a auditoria falhar, a troca é desfeita ([ADR-0007](./adr/0007-event-driven-audit.md)).

*Acrescentadas pelo modelo novo*

- A tabela `credentials` existe: o legado guardava `password_hash`, `must_change_password` e `password_changed_at` espalhados em `users`. A separação é o que permite ao domínio `users` nunca segurar segredo.

---

## 7. Domínio `users`

Responsabilidade: cadastro, perfil, dados do usuário, avatar. Publica a porta `UserReader`. As permissões são uma matriz em código ([ADR-0006](./adr/0006-static-profile-authorization.md)); o banco guarda **quem é** cada perfil, não **o que ele pode**.

### 7.1 `profiles`

Os cinco perfis do produto. `name` é a chave estável: é o mesmo valor usado em `core/authorization/profile-permissions.ts`.

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | PK, UUID v4 |
| `name` | varchar(50) | não | — | UNIQUE `uk_profiles_name`, `ck_profiles_name_length` ≤ 50. Valores: `Solicitante`, `Analista`, `Gestor`, `Administrador`, `Admin Root` |
| `is_active` | boolean | não | `true` | Perfil desativado impede o acesso de todos os usuários daquele perfil |
| `is_assignable_triage` | boolean | não | `false` | Usuários do perfil podem ser escolhidos como Responsável da triagem; validado contra as chaves de trabalho |
| `is_assignable_mapping` | boolean | não | `false` | Usuários do perfil podem ser escolhidos como Responsável do mapeamento; validado contra as chaves de trabalho |
| `created_at` | timestamp | não | `now` | |
| `updated_at` | timestamp | não | `now` | |

**Relações** — `users.profile_id` → `profiles.id` (RESTRICT).

**Índices** — `uk_profiles_name`.

**Invariantes**

- As linhas semeadas são exatamente os nomes de perfil do catálogo de permissões em código. Divergência entre o seed e a matriz é um bug de autorização silencioso.
- `Admin Root` existe apenas no seed. Não há auto-registro.
- **Atribuibilidade é explícita e validada.** O predicado é derivado das chaves de trabalho (§ 7.6); a flag é a decisão de participar do pool. A flag não concede trabalho.
- **O Administrador tem todas as chaves, mas não é atribuível por acidente.** `Administrador`, `Admin Root`, `Gestor` e `Solicitante` nascem com as duas flags em `false`; `Analista` nasce com `is_assignable_triage` e `is_assignable_mapping` em `true`. Até o RBAC configurável, as flags são seed-only.

### 7.2 `users`

A conta. Não carrega material de senha — esse é do domínio `auth`.

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | PK, UUID v4 |
| `name` | text | não | — | `ck_users_name_length` ≤ 150 |
| `email` | varchar(254) | não | — | UNIQUE `uk_users_email`, `ck_users_email_length` ≤ 254, armazenado em minúsculas |
| `profile_id` | uuid | não | — | FK → `profiles.id` (RESTRICT) |
| `area` | text | sim | — | `ck_users_area_length` ≤ 100 — área do usuário |
| `department` | text | sim | — | `ck_users_department_length` ≤ 100 |
| `manager_name` | text | sim | — | `ck_users_manager_name_length` ≤ 150 |
| `additional_contact` | text | sim | — | `ck_users_additional_contact_length` ≤ 100 |
| `is_active` | boolean | não | `true` | Desativar a conta invalida todos os tokens imediatamente |
| `avatar_url` | text | sim | — | `ck_users_avatar_url_length` ≤ 500 |
| `created_at` | timestamp | não | `now` | |
| `updated_at` | timestamp | não | `now` | |

**Relações** — `profile_id` → `profiles.id`. As colunas de ator, solicitante, responsável e autor nos outros domínios apontam para `users.id`.

**Índices** — `uk_users_email`.

**Invariantes**

- O e-mail é armazenado normalizado e único sobre o valor armazenado. E-mails que diferem só por caixa são o mesmo e-mail.
- A conta guarda a **própria cópia** de contato — área, departamento, gestor e contato adicional. O que a solicitação carrega é uma resposta, e não esta cópia ([ADR-0013](./adr/0013-requester-is-an-answer-not-a-table.md)).
- O token **não** carrega o perfil como autoridade: o middleware relê usuário e perfil do banco a cada requisição ([02-Architecture § 14.1](./02-Architecture.md#141-sessão)). Desativação e mudança de perfil valem na hora.

### 7.3 `analyst_details`

Dados profissionais do Analista: cargo, especialidades, áreas atendidas, disponibilidade. É a extensão 1:1 de `users`.

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | PK, UUID v4 |
| `user_id` | uuid | não | — | FK → `users.id` (RESTRICT), UNIQUE `uk_analyst_details_user_id` |
| `job_title` | text | sim | — | `ck_analyst_details_job_title_length` ≤ 100 |
| `specialties` | text | sim | — | Lista de especialidades do analista, separada por vírgula — cada uma com até 100 caracteres, ao menos uma |
| `is_available` | boolean | não | `true` | Disponibilidade do analista — **não** é a conta |
| `capacity` | integer | não | `5` | `ck_analyst_details_capacity_non_negative` ≥ 0 |
| `notes` | text | sim | — | `ck_analyst_details_notes_length` ≤ 500 |
| `created_at` | timestamp | não | `now` | |
| `updated_at` | timestamp | não | `now` | |

**Relações** — `user_id` → `users.id`.

**Índices** — `uk_analyst_details_user_id`.

**Invariantes**

- Um `analyst_details` por usuário, no máximo.
- **A extensão existe só para o perfil Analista**: criar ou promover a Analista exige a extensão, e nenhum outro perfil a tem.
- `is_available` e `users.is_active` são coisas diferentes: a conta pode estar ativa e o analista indisponível. Só `users.is_active` derruba token.

### 7.4 `analyst_detail_categories`

Áreas atendidas pelo Analista. Tabela filha, e não coluna `ARRAY` ou texto com ids ([02-Architecture § 10.3](./02-Architecture.md#103-regras-de-portabilidade)). Aponta para `users.id` — a identidade do analista é a conta, e não a extensão 1:1.

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | PK, UUID v4 |
| `user_id` | uuid | não | — | FK → `users.id` (RESTRICT) |
| `category_id` | uuid | não | — | FK → `portal-config.categories.id` (RESTRICT) |
| `created_at` | timestamp | não | `now` | |

**Relações** — `user_id` → `users.id`; `category_id` → `portal-config.categories.id`.

**Índices** — UNIQUE `uk_analyst_detail_categories_user_category` (`user_id`, `category_id`).

**Invariantes**

- A mesma categoria não é atendida duas vezes pelo mesmo usuário.
- Quem atende categorias tem extensão: uma linha em `analyst_detail_categories` pressupõe a linha correspondente em `analyst_details`, criada na mesma transação. É regra de aplicação — uma constraint de check não enxerga outras linhas.

**Regras de negócio**

*Preservadas do legado*

- Um profissional atende a um conjunto de categorias; a lista era uma coluna de texto com ids e virou tabela filha.
- O profissional tem documento próprio de dados — cargo, especialidades, disponibilidade, capacidade.

*Acrescentadas pelo modelo novo*

- A conta `users` carrega a própria cópia de contato — área, departamento, gestor e contato adicional ([ADR-0013](./adr/0013-requester-is-an-answer-not-a-table.md)).

### 7.5 Gestão de contas

A regra é uma matriz fechada de **ator × operação × perfil atual do alvo × perfil de destino**. Ela mora no serviço, porque depende de duas linhas — o ator e o alvo — e nenhuma constraint de check enxerga outra linha. A chave continua sendo `user:manage` ([ADR-0006](./adr/0006-static-profile-authorization.md)); o que muda é o escopo.

| Ator | Pode criar contas de | Gerencia contas cujo perfil atual é | Pode atribuir como perfil de destino | Resetar/ativar/desativar contas cujo perfil atual é |
| --- | --- | --- | --- | --- |
| Solicitante, Analista, Gestor | — | — | — | — |
| Administrador | Solicitante, Analista, Gestor | Solicitante, Analista, Gestor | Solicitante, Analista, Gestor | Solicitante, Analista, Gestor |
| Admin Root | Solicitante, Analista, Gestor, Administrador | Solicitante, Analista, Gestor, Administrador, Admin Root | Solicitante, Analista, Gestor, Administrador | Solicitante, Analista, Gestor, Administrador, Admin Root, exceto a própria conta |

**Invariantes**

- **Admin Root é seed-only.** Nenhuma rota cria nem promove para `Admin Root`; o perfil não é atribuível pela API.
- **Administrador não alcança Administrador nem Admin Root** — nem como alvo, nem como perfil de destino. Promover Analista a Administrador é operação do Admin Root.
- **A checagem olha o perfil atual e o de destino.** Criar, alterar perfil, resetar senha, ativar/desativar e autoedição passam pela mesma matriz; validar só o perfil atual permitiria promover um alvo permitido a um perfil superior.
- **Ninguém altera o próprio perfil, o próprio status nem a própria senha pelas rotas administrativas.** Autoedição é só dos dados básicos e do bloco `requester` do Administrador, como no legado.
- **O último Admin Root ativo não pode ser desativado nem trocado de perfil** — regra de aplicação, para não trancar o sistema.
- Toda operação da matriz é auditada em `user`, com o perfil anterior e o novo.

### 7.6 Atribuibilidade

Atribuível é o perfil cujos usuários podem ser escolhidos como **Responsável**. Não é uma permissão e não se confunde com `request:assign`:

- `request:assign` é a capability de **mudar** o Responsável;
- `is_assignable_*` é a propriedade de **receber** a solicitação e conseguir trabalhar nela.

O predicado é derivado das chaves, mas a participação no pool é explícita:

```text
is_assignable_triage  →  request:read + triage:read + triage:write (own ou all)
is_assignable_mapping →  request:read + mapping:read + mapping:write (own ou all)
```

O serviço de atribuição valida o alvo: se o perfil perdeu a chave de escrita depois da configuração, a atribuição é recusada com `400`, não cria um Responsável que não consegue agir. A regra é de aplicação, como a § 7.5, porque depende do perfil e da matriz de permissões, e nenhuma constraint enxerga os dois.

**Sem claim nesta fase.** Uma solicitação órfã não é triada por um Analista custodial, porque `responsible_id` é nulo e não há correspondência de custódia. Quem tem `request:assign` em `all` — o Administrador — atribui primeiro. A chave `request:claim` e a regra de auto-atribuição estão desenhadas no Apêndice C § 24.6, sem entrega nesta fase.

---

## 8. Domínio `requests`

Responsabilidade: ciclo de vida da solicitação, protocolo, anexos. Publica a porta `RequestReader`.

O **conteúdo** da solicitação não mora nesta tabela: o solicitante preenche um **formulário**, e cada resposta é uma linha de `form_answers`. A definição do formulário vem do domínio `forms`. A tabela `requests` guarda identidade, classificação de fluxo, ciclo de vida e o que é publicado ao solicitante.

### 8.1 `requests`

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | PK, UUID v4 |
| `protocol` | varchar(20) | não | — | UNIQUE `uk_requests_protocol`, `ck_requests_protocol_length` ≤ 20 |
| `form_id` | uuid | não | — | FK → `forms.forms.id` (RESTRICT) — o formulário da categoria escolhida |
| `requester_user_id` | uuid | sim | — | FK → `users.id` (RESTRICT) — nulo quando a solicitação é anônima |
| `status_id` | uuid | não | — | FK → `portal-config.statuses.id` (RESTRICT) — status interno atual |
| `category_id` | uuid | não | — | FK → `portal-config.categories.id` (RESTRICT) — a classificação da solicitação |
| `last_public_status_id` | uuid | sim | — | FK → `portal-config.statuses.id` (RESTRICT) — último status visível ao solicitante |
| `responsible_id` | uuid | sim | — | FK → `users.id` (RESTRICT) — o Responsável |
| `estimated_completion` | date | sim | — | Data estimada de conclusão — previsão publicada, não SLA; o legado não tem escritor (§21) |
| `meeting_scheduled_for` | timestamp | sim | — | Reunião combinada, publicada ao solicitante |
| `meeting_link` | text | sim | — | `ck_requests_meeting_link_length` ≤ 500 |
| `last_technical_message` | text | sim | — | Última mensagem técnica publicada |
| `last_external_update_at` | timestamp | sim | — | Última atualização feita pelo solicitante |
| `closed_at` | timestamp | sim | — | Momento do encerramento |
| `created_by` | text | não | — | `ck_requests_created_by_length` ≤ 254 — rótulo de quem abriu |
| `created_by_user_id` | uuid | sim | — | FK → `users.id` (RESTRICT) — nulo quando o registro é do portal público |
| `updated_by_user_id` | uuid | sim | — | FK → `users.id` (RESTRICT) — quem tocou a solicitação por último |
| `created_at` | timestamp | não | `now` | |
| `updated_at` | timestamp | não | `now` | |

**Relações** — `form_id` → `forms.forms.id`; `requester_user_id` → `users.id`; `status_id` e `last_public_status_id` → `portal-config.statuses.id`; `category_id` → `portal-config.categories.id`; `responsible_id` → `users.id`; `created_by_user_id` e `updated_by_user_id` → `users.id`.

**Índices** — UNIQUE `uk_requests_protocol`; `idx_requests_status_id`; `idx_requests_category_id`; `idx_requests_requester_user_id`; `idx_requests_responsible_id`; `idx_requests_created_at`.

**Invariantes**

- O protocolo é produzido pelo contador (`code_counters`), nunca reemitido, e único por constraint — belt-and-braces sobre a bijeção da cifra ([ADR-0008](./adr/0008-protocol-without-collision-risk.md)). A leitura por protocolo **nunca** usa `.first()`: é uma sondagem com `LIMIT 2` que falha explicitamente se duas linhas corresponderem.
- `last_public_status_id` nunca está à frente de `status_id`: quando o status interno é restrito, o solicitante continua vendo o último status público. É assim que a solicitação é encerrada para o solicitante sem revelar o trâmite interno.
- `closed_at` é gravado na mesma transação da mudança de status que entra num status terminal (`statuses.is_terminal`), e é zerado se a solicitação volta a um status não terminal.
- O solicitante pode ser anônimo: `requester_user_id` é nulo e a identidade do solicitante está nas respostas do bloco `requester`.
- **Toda solicitação nasce no status de `key = solicitacao_enviada`** — o status inicial do ciclo.
- `created_by` é um rótulo, não uma referência — o portal público não tem usuário. `created_by_user_id` é a referência quando existe.
- **A classificação é coluna, não pergunta.** Status, Prioridade e Categoria são as três classificações da solicitação: as três são lidas como colunas tipadas pela fila, pelo dashboard e pela exportação — status e categoria em `requests`, prioridade na avaliação corrente. A customização do formulário adiciona e remove perguntas e não toca nas classificações. Ver [ADR-0012](./adr/0012-form-is-a-configurable-entity.md).
- **A categoria é resolvida na escrita.** O frontend manda `demand.category` com o **nome** escolhido; o backend resolve o nome contra as categorias ativas, grava o `id` em `requests.category_id` e **acha o formulário pela categoria** (`categories.form_id`). Nome inválido é 400. A promoção para o topo acompanha o formulário configurável (§21).
- **O formulário respondido é o da categoria escolhida.** O payload não carrega o formulário: ele é derivado da categoria, e a borda valida o payload contra a definição **daquele** formulário.
- **Quem reescreve a classificação:** o solicitante, quando responde a uma pendência que pede a correção da categoria; a equipe, quando a triagem reclassifica. A pendência escreve `requests.category_id` — resolvendo o nome contra as categorias ativas — e **não** uma resposta: a classificação não tem resposta. A reclassificação chega ao `requests` por **evento de domínio** publicado pelo domínio `triage`: quem escreve `requests.category_id` é o domínio dono da coluna, e a reclassificação é aplicada na mesma transação que registra a triagem.
- **Toda mudança de status iniciada por usuário exige justificativa.** `justification` é obrigatória (1..4000, `trim`) em `PATCH /requests/:protocol/status`, inclusive no bypass do Administrador. Quando o status de destino é público (`statuses.is_public = true`), `last_technical_message` também é obrigatória (1..4000, `trim`). A justificativa é interna e vai para `audit_entries.note`; o retorno público vai para esta coluna e para o snapshot de auditoria, nunca concatenado. Transições automáticas — a atribuição que avança o status, a abertura e o fechamento de pendência — registram o motivo do sistema, não uma justificativa humana.
- **A Prioridade não mora aqui.** A faixa é atributo do domínio `prioritization` e é lida por join ou pela porta `PrioritizationReader` ([ADR-0016](./adr/0016-priority-has-one-home.md)).

**Regras de negócio**

*Preservadas do legado*

- O protocolo é público, curto e opaco — não é credencial e não revela a identidade interna.
- O solicitante acompanha pelo protocolo; no modo público, o serviço confere o e-mail declarado com o da resposta `requester` e responde `404` quando não confere ([ADR-0023](./adr/0023-requester-email-is-a-lookup-key.md)).
- A solicitação guarda data estimada de conclusão, reunião combinada e última mensagem técnica — o que o portal publica ao solicitante.
- A abertura no modo autenticado ignora o nome e o e-mail do payload e usa os da sessão.

*Acrescentadas pelo modelo novo*

- `closed_at`: o legado derivava o encerramento de `statuses.is_terminal` e não guardava o instante. A coluna registra **quando** a solicitação foi encerrada.
- `created_by_user_id`: o legado guardava só o rótulo `created_by`.
- O conteúdo do formulário sai das colunas e vira `form_answers`.

*Não preservadas do legado*

- O atraso calculado sobre `operational.desiredDeadline` não é preservado: o prazo desejado é do solicitante, não um compromisso da equipe. O SLA por etapa e prioridade é pendência (§21, [ADR-0024](./adr/0024-requested-deadline-is-not-sla.md)).

### 8.2 `form_answers`

As respostas do solicitante. Uma linha por campo preenchido.

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | PK, UUID v4 |
| `request_id` | uuid | não | — | FK → `requests.id` (RESTRICT) |
| `field_id` | uuid | não | — | FK → `forms.form_fields.id` (RESTRICT) |
| `value_text` | text | sim | — | Texto, e-mail, ou o **valor** da opção de um `select` — `ck_form_answers_value_text_length` ≤ 8000 |
| `value_lookup` | varchar(254) | sim | — | Projeção normalizada para busca — só para campo `email` — `ck_form_answers_value_lookup_length` ≤ 254 |
| `value_number` | decimal(10,2) | sim | — | Números e decimais |
| `value_date` | date | sim | — | Datas |
| `value_boolean` | boolean | sim | — | Booleanos |
| `value_json` | json | sim | — | Valores estruturados |
| `created_at` | timestamp | não | `now` | |
| `updated_at` | timestamp | não | `now` | |

**Relações** — `request_id` → `requests.id`; `field_id` → `forms.form_fields.id` (domínio `forms`).

**Índices** — UNIQUE `uk_form_answers_request_field` (`request_id`, `field_id`); `idx_form_answers_field_request` (`field_id`, `request_id`); `idx_form_answers_field_lookup` (`field_id`, `value_lookup`).

**Invariantes**

- Uma resposta por campo de uma solicitação. **Nenhuma classificação tem resposta** — a classificação não tem linha em `form_fields`, e a resposta só existe para uma linha de `form_fields`.
- A coluna de valor é determinada pelo tipo do campo: `text`, `long_text`, `email` e `select` → `value_text`; `number` e `decimal` → `value_number`; `date` → `value_date`; `boolean` → `value_boolean`; `yes_no_detail` → `value_boolean` **e** `value_text` (o detalhe). `value_json` fica para valor estruturado.
- `value_text` só pode coexistir com `value_boolean`; qualquer outra combinação de duas colunas **de valor** preenchidas é rejeitada por `ck_form_answers_value_shape`. `value_lookup` é projeção derivada e não conta na forma.
- As respostas de uma solicitação pertencem ao formulário em `requests.form_id`.
- O valor de um `select` é o **valor** da opção, não o rótulo. As opções inline de um `select` são strings do próprio contrato.
- **O banco não impõe os limites do campo.** O limite mora na definição (`form_fields.max_length`, `min_value`, `max_value`) e o valor em outra linha: a validação é da aplicação, na borda, guiada pela definição.
- **`ck_form_answers_value_text_length` é um piso da tabela, não o limite do campo.** Ele limita o tamanho de qualquer resposta de texto, sem saber a qual campo ela pertence; levantar o piso exige migration. Ele não substitui a validação da aplicação: um campo com `max_length` 150 continua aceitando mais, se a borda não validar.
- **O texto longo não é indexado.** `value_text` aceita até 8000 caracteres e não tem índice; a busca usa `value_lookup`, projeção normalizada e curta, mantida pela aplicação na escrita **e na correção** — só para campo `email` ([ADR-0023](./adr/0023-requester-email-is-a-lookup-key.md)).
- Corrigir um campo reescreve a resposta; o registro da correção fica na auditoria.

**Regras de negócio**

*Preservadas do legado*

- O formulário é o mesmo: os quatro blocos, os campos, as obrigatoriedades e os limites.
- A categoria é validada contra as categorias ativas no momento da abertura **e no momento da correção por pendência**, e gravada como coluna — não como resposta.

*Acrescentadas pelo modelo novo*

- `updated_at`: a resposta é reescrita quando o solicitante corrige um campo, e a correção precisa de data.

### 8.3 `attachments`

Arquivos enviados com a solicitação.

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | PK, UUID v4 |
| `request_id` | uuid | não | — | FK → `requests.id` (RESTRICT) |
| `pending_item_id` | uuid | sim | — | FK → `pending-items.pending_items.id` (RESTRICT) |
| `file_name` | text | não | — | `ck_attachments_file_name_length` ≤ 255 |
| `file_path` | text | não | — | `ck_attachments_file_path_length` ≤ 1000 — caminho do arquivo no armazenamento |
| `content_type` | text | não | — | `ck_attachments_content_type` ∈ `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `image/png`, `image/jpeg` |
| `size_bytes` | integer | não | — | `ck_attachments_size_bytes` > 0 e ≤ 10485760 |
| `is_restricted` | boolean | não | `false` | Anexo de conteúdo restrito — **sem regra implementada**; ver [§ 21](#21-pendências) |
| `uploaded_by` | text | sim | — | `ck_attachments_uploaded_by_length` ≤ 100 — rótulo de quem enviou |
| `uploaded_by_user_id` | uuid | sim | — | FK → `users.id` (RESTRICT) — nulo quando quem enviou é o solicitante anônimo |
| `uploaded_at` | timestamp | não | `now` | |

**Índices** — `idx_attachments_request_id`; `idx_attachments_pending_item_id`; `idx_attachments_is_restricted`.

**Relações** — `request_id` → `requests.id`; `pending_item_id` → `pending_items.id`; `uploaded_by_user_id` → `users.id`.

**Invariantes**

- O arquivo vive fora do banco; a tabela guarda o ponteiro, o tamanho e o tipo.
- `pending_item_id` liga o anexo ao item de pendência que ele atende.
- **O anexo pertence à solicitação do lote do item que ele atende.** Quando `pending_item_id` está preenchido, o lote do item tem o mesmo `request_id` do anexo; a FK simples não expressa o par, então a regra é da aplicação.
- No máximo cinco anexos por solicitação, e no máximo dez megabytes por arquivo.

### 8.4 `request_time_preferences`

Slots de horário que o solicitante marcou como preferência.

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | PK, UUID v4 |
| `request_id` | uuid | não | — | FK → `requests.id` (RESTRICT) |
| `scheduled_for` | timestamp | não | — | Mesmo tipo de timestamp do resto da base |
| `created_at` | timestamp | não | `now` | |

**Relações** — `request_id` → `requests.id`.

**Índices** — UNIQUE `uk_request_time_preferences_slot` (`request_id`, `scheduled_for`).

**Invariantes**

- O mesmo slot não é registrado duas vezes para a mesma solicitação.
- No máximo três slots por solicitação, e todos no futuro ou no dia de hoje.
- **`request_time_preferences.scheduled_for` é a fronteira do fuso.** O slot chega sem offset (`yyyy-mm-ddThh:mm`), é interpretado no fuso do portal e gravado em UTC como o resto da base; o frontend traduz de volta na leitura.

**Regras de negócio**

*Preservadas do legado*

- O protocolo é público, curto e opaco; o solicitante acompanha a solicitação pelo protocolo.
- Na abertura autenticada, nome e e-mail do payload são ignorados: valem os da sessão.
- A solicitação guarda data estimada de conclusão, reunião combinada e última mensagem técnica.
- O conteúdo do formulário é o mesmo: quatro blocos, campos, obrigatoriedades e limites.

*Acrescentadas pelo modelo novo*

- `closed_at` registra o instante do encerramento; o legado derivava o fato de `statuses.is_terminal`.
- `created_by_user_id` guarda a referência de quem abriu; `created_by` continua sendo o rótulo do portal público.
- O conteúdo do formulário sai das colunas e vira `form_answers`; a categoria continua coluna.

---

## 9. Domínio `triage`

Responsabilidade: triagem — aderência, escopo, veredito. Publica a porta `TriageReader`.

### 9.1 `triages`

Conjunto append-only de triagens. Cada triagem é uma linha nova; a triagem atual é a última.

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | PK, UUID v4 |
| `request_id` | uuid | não | — | FK → `requests.id` (RESTRICT) |
| `is_adherent_to_scope` | boolean | não | — | A aderência ao escopo é sempre avaliada |
| `adherent_justification` | text | não | `''` | Justificativa da aderência — vazia quando a solicitação é aderente |
| `is_category_change` | boolean | não | `false` | A triagem reclassifica a solicitação |
| `new_category_id` | uuid | sim | — | FK → `portal-config.categories.id` (RESTRICT) — a categoria proposta, resolvida pelo nome |
| `preliminary_complexity` | text | não | `''` | |
| `perceived_risks` | text | não | `''` | |
| `suggested_responsible` | text | não | `''` | `ck_triages_suggested_responsible_length` ≤ 150 — **texto livre**, é sugestão, não vínculo |
| `suggested_responsible_justification` | text | não | `''` | |
| `assignee_user_id` | uuid | sim | — | FK → `users.id` (RESTRICT) — o Responsável designado |
| `assignee_name` | text | sim | — | Rótulo do responsável no momento da triagem |
| `assignee_email` | text | sim | — | E-mail do responsável no momento da triagem |
| `exit_status_id` | uuid | não | — | FK → `portal-config.statuses.id` (RESTRICT) — status de saída da triagem; **é** o Veredito |
| `conclusion_justification` | text | não | — | O texto da conclusão — o que o triador concluiu e por quê |
| `last_technical_message` | text | sim | — | Mensagem técnica associada |
| `author_user_id` | uuid | não | — | FK → `users.id` (RESTRICT) — quem triou |
| `occurred_at` | timestamp | não | `now` | Tempo de negócio, não ordem de commit |

**Relações** — `request_id` → `requests.id`; `exit_status_id` → `portal-config.statuses.id`; `new_category_id` → `portal-config.categories.id`; `assignee_user_id` e `author_user_id` → `users.id`.

**Índices** — `idx_triages_request_id_occurred_at` (`request_id`, `occurred_at`).

**Invariantes**

- **`triages` é a única casa do desfecho da triagem.** A solicitação não tem cópia de triagem: as colunas de triagem que existiam em `requests` no legado foram removidas.
- **O Veredito é o Status de saída.** `exit_status_id` aponta para um status **ativo**, **não restrito**, com `statuses.triage_mode = conclusion_only` — os status que podem encerrar uma triagem. Não há vocabulário próprio de desfecho: o mesmo conjunto de status serve ao ciclo e ao desfecho, e é o Administrador quem o configura.
- **O desfecho e a etapa não têm correspondência 1:1.** Uma triagem que conclui "fora do escopo" sai em "Não elegível"; uma que conclui "duplicada" sai em "Cancelado". O que o solicitante vê vem do Status (`is_public`), nunca da triagem.
- **A triagem é append-only**: corrigir uma triagem é registrar outra linha.
- `suggested_responsible` é texto livre — a triagem sugere um nome. O vínculo é `assignee_user_id`, e é o responsável efetivo. O rótulo e o e-mail congelam quem era o responsável no momento.
- `occurred_at` ordena a linha do tempo da triagem por tempo de negócio.
- **Os campos condicionais seguem a aderência, e a exigência acompanha.** `adherent_justification` é obrigatória quando `is_adherent_to_scope` é falsa, e `preliminary_complexity` e `perceived_risks` são obrigatórias quando ela é verdadeira — o campo que não se aplica fica vazio. `new_category_id` só é gravado quando `is_category_change` é verdadeiro.
- **Solicitação em status terminal não aceita triagem.** Concluir uma solicitação encerra o fluxo, e o status terminal não volta.
- **A conclusão da triagem libera o responsável da solicitação.**
- **A linha da triagem é snapshot.** `author_user_id` e `assignee_user_id` registram quem conduziu; não concedem leitura depois que a solicitação deixa a custódia.
- **A conclusão exige `conclusion_justification` (1..4000, `trim`).** É a justificativa da transição; a explicação de aderência e a sugestão de responsável têm justificativas próprias, condicionais.
- **`last_technical_message` é obrigatório quando o Status de saída é público.** Se o solicitante vê o desfecho, há algo a dizer a ele.

**Regras de negócio**

*Preservadas do legado*

- A triagem registra aderência ao escopo, mudança de categoria, complexidade preliminar, riscos percebidos, responsável sugerido com justificativa, status de saída e a conclusão com justificativa.
- A proveniência (ator, momento, origem) fica na auditoria e, na triagem, na própria linha.

*Acrescentadas pelo modelo novo*

- A linha carrega o próprio autor e o próprio tempo, para ser legível sem JOIN.
- `new_category_id` é uma referência à categoria, resolvida pelo nome contra as categorias ativas — no legado era texto.
- `is_adherent_to_scope` e `is_category_change` são booleanos: o legado gravava "Sim", "Não" ou texto vazio em coluna de texto.

---

## 10. Domínio `mapping`

Responsabilidade: sessão de mapeamento, participantes, agenda. Publica a porta `MappingReader`.

### 10.1 `mappings`

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | PK, UUID v4 |
| `request_id` | uuid | não | — | FK → `requests.id` (RESTRICT) |
| `responsible_id` | uuid | sim | — | FK → `users.id` (RESTRICT) — quem conduz o mapeamento |
| `scheduled_for` | timestamp | sim | — | ISO-8601 com offset, persistido em UTC |
| `duration_minutes` | integer | sim | — | `ck_mappings_duration_minutes` ≥ 15 e ≤ 480 |
| `modality` | text | sim | — | `ck_mappings_modality` ∈ `REMOTE`, `IN_PERSON` |
| `meeting_link` | text | sim | — | `ck_mappings_meeting_link_length` ≤ 500 |
| `location` | text | sim | — | `ck_mappings_location_length` ≤ 500 |
| `notes` | text | sim | — | `ck_mappings_notes_length` ≤ 2000 |
| `justification` | text | sim | — | Justificativa da transição |
| `last_technical_message` | text | sim | — | Mensagem técnica associada |
| `target_status_id` | uuid | sim | — | FK → `portal-config.statuses.id` (RESTRICT) — status de destino do mapeamento |
| `is_concluded` | boolean | não | `false` | |
| `concluded_at` | timestamp | sim | — | |
| `created_by_user_id` | uuid | não | — | FK → `users.id` (RESTRICT) |
| `created_at` | timestamp | não | `now` | |
| `updated_by_user_id` | uuid | sim | — | FK → `users.id` (RESTRICT) |
| `updated_at` | timestamp | não | `now` | |

**Relações** — `request_id` → `requests.id`; `responsible_id`, `created_by_user_id` e `updated_by_user_id` → `users.id`; `target_status_id` → `portal-config.statuses.id`.

**Índices** — `idx_mappings_request_id`; `idx_mappings_request_id_is_concluded` (`request_id`, `is_concluded`).

**Invariantes**

- Uma solicitação pode ter vários mapeamentos, mas **no máximo um aberto** — o mapeamento atual é o mais recente não concluído. A unicidade é da aplicação, garantida na transação que conclui o anterior.
- `scheduled_for` é persistido em UTC e devolvido com `Z`.
- A duração, quando informada, está entre 15 e 480 minutos.
- **A modalidade obriga o dado do encontro:** `REMOTE` exige `meeting_link`, `IN_PERSON` exige `location`.
- **O destino do mapeamento é um status ativo, não restrito, com `mapping_mode` `conclusion_only`.**
- **A conclusão exige `justification` (1..4000, `trim`) quando o destino não é o de agendamento.** O agendamento usa os campos de agenda; a conclusão em outro status é uma transição e exige justificativa. Destino público exige também `last_technical_message` (1..4000, `trim`).
- **Solicitação em status terminal não aceita mapeamento.** Concluir o mapeamento libera o designado do mapeamento.
- **`mappings.responsible_id` é o condutor do mapeamento corrente.** Enquanto o mapeamento está aberto, ele é a custódia de `mapping:read`/`mapping:write`; concluído, a linha permanece como snapshot e não concede mais acesso. `request:assign` altera `requests.responsible_id`, não o responsável do mapeamento; este é definido no próprio mapeamento.
- **`requests.meeting_scheduled_for` e `requests.meeting_link` são a projeção da reunião agendada:** valem quando o destino é o status de mapeamento agendado, e são zerados quando o mapeamento conclui em outro destino. `mappings.scheduled_for` é a agenda do mapeamento.

### 10.2 `mapping_participants`

Participantes do mapeamento: internos (ligados a uma conta) ou externos (nome e e-mail informados na hora).

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | PK, UUID v4 |
| `mapping_id` | uuid | não | — | FK → `mappings.id` (RESTRICT) |
| `user_id` | uuid | sim | — | FK → `users.id` (RESTRICT) — participante interno |
| `name` | text | sim | — | `ck_mapping_participants_name_length` ≤ 255 |
| `email` | varchar(255) | sim | — | `ck_mapping_participants_email_length` ≤ 255 — armazenado em minúsculas |
| `created_at` | timestamp | não | `now` | |

**Relações** — `mapping_id` → `mappings.id`; `user_id` → `users.id`.

**Índices** — UNIQUE `uk_mapping_participants_user` (`mapping_id`, `user_id`); UNIQUE `uk_mapping_participants_email` (`mapping_id`, `email`).

**Invariantes**

- O mesmo usuário não aparece duas vezes no mesmo mapeamento. Participantes externos têm `user_id` nulo, e nulos não colidem entre si — vários externos são permitidos.
- **O nome e o e-mail do participante interno vêm do cadastro**, no momento do mapeamento; a divergência do payload é ignorada. O participante externo carrega os valores do payload.
- A unicidade por e-mail é case-insensitive sem índice funcional: o e-mail é normalizado na gravação e a unicidade é sobre o valor armazenado. O legado usava `lower(email)` num índice funcional, que não é portátil.

**Regras de negócio**

*Preservadas do legado*

- O mapeamento tem data, duração, modalidade, link, local e notas; e pode ser concluído, com registro de conclusão.
- Participante interno vem do cadastro; participante externo vem do payload, com nome e e-mail.

---

## 11. Domínio `queue`

Responsabilidade: fila centralizada e métricas. **Não tem tabelas** — é uma projeção de leitura sobre `requests` e as tabelas de configuração, e consome as portas publicadas por outros domínios ([02-Architecture § 5](./02-Architecture.md#5-catálogo-de-domínios)).

A ordenação na fila é **derivada**, nunca armazenada: `categories.display_order` ordena o card, `statuses.order_number` ordena a etapa, e a Prioridade vem da avaliação corrente, ordenada pela faixa de `prioritization.priorities.min_score`. Não existe coluna de ordenação em `requests` — ela envelheceria e passaria a discordar da configuração.

A projeção consome: `requests.requests`, `requests.form_answers`, `forms.form_fields`, `portal-config.statuses`, `portal-config.categories`, `prioritization.prioritization_evaluations`, `prioritization.priorities`, `users.users`. O nome do solicitante, o processo e o **prazo desejado** saem das respostas — a fila os lê por chave de campo. O prazo desejado é contexto, não SLA (§21, [ADR-0024](./adr/0024-requested-deadline-is-not-sla.md)).

---

## 12. Domínio `prioritization`

Responsabilidade: critérios, pesos e a Prioridade resultante. Publica a porta `PrioritizationReader`.

### 12.1 `criteria`

Quesitos ponderados do cálculo.

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | PK, UUID v4 |
| `code` | varchar(50) | não | — | UNIQUE `uk_criteria_code`, `ck_criteria_code_length` ≤ 50 — o identificador estável do critério |
| `name` | text | não | — | `ck_criteria_name_length` ≤ 100 |
| `weight` | integer | não | — | `ck_criteria_weight_range` — 0 a 10 |
| `is_active` | boolean | não | `true` | Critério desativado sai do cálculo |
| `display_order` | integer | não | — | |
| `created_at` | timestamp | não | `now` | |
| `updated_at` | timestamp | não | `now` | |

**Relações** — sem FK de saída. `criteria.code` é a chave usada no json `prioritization_evaluations.notes`, sem constraint.

**Índices** — UNIQUE `uk_criteria_code`.

**Invariantes**

- O peso é uma **razão relativa**, e não uma escala: só a proporção entre os pesos altera o resultado. A faixa de 0 a 10 é um limite de saneamento por critério. O número de critérios ativos não é fixo: o legado exigia dez, e o modelo novo usa a lista ativa — ver § 12.3. Critério desativado não participa do cálculo, mas mantém a linha e o registro do seu peso.

### 12.2 `priorities`

Faixas de criticidade. A faixa é definida por faixa de score — por isso a tabela mora no domínio da priorização, e não no de configuração do portal.

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | PK,UUID v4 |
| `level` | varchar(50) | não | — | UNIQUE `uk_priorities_level` ≤ 50 — `Baixa`, `Média`, `Alta`, `Crítica` — `ck_priorities_level` |
| `min_score` | decimal(4,1) | não | — | `ck_priorities_min_score_range` entre 10 e 50 |
| `max_score` | decimal(4,1) | não | — | `ck_priorities_max_score_range` entre 10 e 50 |
| `default_weight` | decimal(3,2) | não | — | Peso padrão da faixa |
| `color_code` | text | sim | — | `ck_priorities_color_code_length` ≤ 50 |
| `description` | text | sim | — | |
| `is_active` | boolean | não | `true` | Faixa desativada sai da classificação |
| `created_at` | timestamp | não | `now` | |
| `updated_at` | timestamp | não | `now` | |

**Relações** — `prioritization_evaluations.priority_id` → `priorities.id`.

**Índices** — UNIQUE `uk_priorities_level`.

**Invariantes**

- `min_score` ≤ `max_score`, garantido por constraint `ck_priorities_score_range`.
- A tabela existe pelo **dado de referência** — a faixa de score e o peso padrão, administráveis — e não pelo rótulo: `level` é um dos quatro níveis que o código conhece.
- **As faixas não podem se sobrepor nem deixar lacuna**: todo score entre 10 e 50 cai em exatamente uma faixa. A sobreposição e a lacuna são regra de aplicação, verificadas quando a faixa é salva — uma constraint de check não enxerga outras linhas.
- **`default_weight` é o peso de referência da faixa e nenhum cálculo o usa**: o score sai das notas e dos pesos dos critérios.

### 12.3 `prioritization_evaluations`

A avaliação corrente da solicitação. O registro de reavaliações **não** tem tabela própria: fica na auditoria ([ADR-0007](./adr/0007-event-driven-audit.md)) — estado atual na entidade, trilha imutável na auditoria.

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | PK, UUID v4 |
| `request_id` | uuid | não | — | FK → `requests.id` (RESTRICT), UNIQUE `uk_prioritization_evaluations_request_id` |
| `notes` | json | não | — | Snapshot das notas do cálculo — um objeto |
| `score` | decimal(5,1) | não | — | `ck_prioritization_evaluations_score_range` ≥ 10 e ≤ 50 |
| `priority_id` | uuid | não | — | FK → `priorities.id` (RESTRICT) — a faixa resultante |
| `calculated_by_user_id` | uuid | não | — | FK → `users.id` (RESTRICT) |
| `calculated_at` | timestamp | não | `now` | Momento do cálculo — tempo de negócio |
| `created_at` | timestamp | não | `now` | |
| `updated_at` | timestamp | não | `now` | |

**Relações** — `request_id` → `requests.id`; `priority_id` → `priorities.id`; `calculated_by_user_id` → `users.id`.

**Índices** — UNIQUE `uk_prioritization_evaluations_request_id`.

**Invariantes**

- Uma avaliação corrente por solicitação.
- **O score é a média ponderada das notas, na escala de 10 a 50.** `score = 10 × (Σ notasᵢ × pesoᵢ) / (Σ pesosᵢ)`, sobre os **critérios ativos**, com as notas na escala de 1 a 5 e o peso na de 0 a 10. O resultado é arredondado a uma casa decimal, como no legado. O denominador é a soma dos pesos dos critérios ativos, então **a fórmula acompanha a lista de critérios**: com dez critérios ou com doze, a faixa do score continua sendo 10 a 50.
- **A soma dos pesos dos critérios ativos tem de ser maior que zero.** Sem isso não há score — é erro de aplicação, não de banco.
- A faixa resultante é uma referência à tabela de faixas, não uma cópia do texto. O legado guardava a classificação como `ENUM` duplicado aqui.
- A reavaliação é auditada como `prioritization_evaluation`, com a ação `evaluate` — é o que guarda o registro de reavaliações que esta tabela não tem.
- **O `notes` é indexado por `criteria.code`.** O vocabulário das chaves do objeto é o dos critérios ativos, e o denominador da fórmula acompanha a lista.

**Regras de negócio**

*Preservadas do legado*

- O score é normalizado na faixa 10–50, e a classificação sai das faixas configuradas.
- As notas do cálculo são um snapshot, não uma referência.
- Reavaliar substitui a avaliação corrente; o registro fica na trilha de auditoria.

*Acrescentadas pelo modelo novo*

- O cardinal fixo de dez critérios do legado sai: o cálculo usa os critérios ativos e o denominador acompanha a lista. A soma dos pesos ativos continua tendo de ser maior que zero; a faixa 10–50 é preservada pela normalização.

---

## 13. Domínio `pending-items`

Responsabilidade: pendências de campo e de observação. Publica a porta `PendingItemReader`.

### 13.1 `pending_batches`

O lote: o pedido de alteração criado de uma vez. Ele agrupa itens e carrega o que é do lote, não de um item.

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | PK, UUID v4 |
| `request_id` | uuid | não | — | FK → `requests.id` (RESTRICT) |
| `request_attachment` | boolean | não | `false` | O lote inteiro pede um anexo |
| `expected_attachment_type` | text | sim | — | `ck_pending_batches_expected_attachment_type_length` ≤ 100 |
| `created_by_user_id` | uuid | não | — | FK → `users.id` (RESTRICT) |
| `created_at` | timestamp | não | `now` | |
| `updated_at` | timestamp | não | `now` | |

**Relações** — `request_id` → `requests.id`; `created_by_user_id` → `users.id`.

**Índices** — `idx_pending_batches_request_id`.

**Invariantes**

- A observação e os campos pedidos juntos compartilham o `batch_id`.
- **Todo lote tem ao menos um item** — regra de aplicação. O pedido de anexo é do lote, e o upload é associado a um item do lote; por isso um lote só de anexo não existe.
- **Há no máximo um lote aberto por solicitação**; abrir outro é 409. Aberto = tem ao menos um item em `requested` ou `responded`; o lote continua aberto para revisão depois que todos respondem. A regra é de aplicação, porque depende do estado dos itens.
- **Abrir um lote move a solicitação para o status de `key = pendente_de_informacoes`**; quando todos os itens do lote estão ao menos `responded`, ela volta para `key = em_triagem`; reabrir qualquer item devolve.
- O lote não tem prazo próprio. Quando o SLA existir, a proposta do produto prevê pausa enquanto a solicitação estiver em `pendente_de_informacoes` ([ADR-0024](./adr/0024-requested-deadline-is-not-sla.md)).

### 13.2 `pending_items`

Um item do lote: um campo do formulário, uma classificação ou uma observação. Cada um tem estado, comentário e resposta próprios.

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | PK, UUID v4 |
| `batch_id` | uuid | não | — | FK → `pending_batches.id` (RESTRICT) |
| `type` | text | não | — | `ck_pending_items_type` ∈ `field_edit`, `observation` |
| `form_field_id` | uuid | sim | — | FK → `forms.form_fields.id` (RESTRICT) — **nulo** quando o pedido é de uma classificação ou de uma observação |
| `classification_key` | varchar(50) | sim | — | A classificação pedida — `ck_pending_items_classification_key` ∈ `category` — **nulo** quando o pedido é de um campo ou de uma observação |
| `comment` | text | não | — | `ck_pending_items_comment_length` ≤ 2000 — o que é pedido; reabrir reescreve o comentário |
| `status` | varchar(20) | não | `requested` | `ck_pending_items_status` ∈ `requested`, `responded`, `validated` |
| `corrected_value` | json | sim | — | O valor corrigido, **estacionado** até a validação — para `field_edit` e classificação |
| `response_text` | text | sim | — | A resposta do solicitante — para `observation` — `ck_pending_items_response_text_length` ≤ 2000 |
| `responded_at` | timestamp | sim | — | Quando o solicitante respondeu |
| `validated_at` | timestamp | sim | — | Quando a equipe validou |
| `validated_by_user_id` | uuid | sim | — | FK → `users.id` (RESTRICT) — quem validou |
| `created_at` | timestamp | não | `now` | |
| `updated_at` | timestamp | não | `now` | |

**Relações** — `batch_id` → `pending_batches.id`; `form_field_id` → `forms.form_fields.id`; `validated_by_user_id` → `users.id`.

**Índices** — `idx_pending_items_batch_id`; `idx_pending_items_status`; `idx_pending_items_form_field_id`; UNIQUE `uk_pending_items_batch_field` (`batch_id`, `form_field_id`); UNIQUE `uk_pending_items_batch_classification` (`batch_id`, `classification_key`).

**Invariantes**

- **Cada item de pendência tem três estados: `requested`, `responded` e `validated`.** `overdue` não é estado armazenado, e a pendência não tem prazo próprio ([ADR-0024](./adr/0024-requested-deadline-is-not-sla.md)).
- **`requested` → `responded` → `validated`, por item.** O solicitante responde; a equipe revisa e valida. A revisão é **parcial**: só os itens enviados são decididos, e os não revisados mantêm o estado em que estavam (`requested` ou `responded`).
- **O item tem um sujeito só.** `observation` não tem `form_field_id` nem `classification_key`; `field_edit` tem **exatamente um** dos dois — `ck_pending_items_subject`. Um pedido é de um campo **ou** de uma classificação, nunca dos dois. A classificação usa `type = field_edit` com `classification_key`, e `corrected_value` é o nome da categoria; no campo, `corrected_value` é o valor tipado do campo.
- O mesmo campo não é pedido duas vezes no mesmo lote; a mesma classificação também não. A unicidade é do par com `batch_id`.
- **Uma observação por lote, no máximo** — regra de aplicação, porque nulos não colidem em índice único.
- O campo pedido pertence ao formulário da solicitação — regra de aplicação.
- **A correção fica estacionada até a validação.** O solicitante responde, e o valor corrigido espera em `corrected_value`; quem aplica é a validação, que reescreve a resposta do campo ou a coluna da entidade, conforme o pedido. Reabrir **descarta** a correção, reescreve o `comment` e limpa `response_text`, `corrected_value` e `responded_at`.
- **O item guarda duas vozes, e elas não se misturam:** `response_text`/`corrected_value` é o que o solicitante respondeu, e o `comment` é o que a equipe pediu. O texto da validação fica na auditoria, não em coluna.
- **Uma pendência pede a correção de um campo do formulário ou de uma classificação.** A classificação é o atributo que a pendência pode pedir ao solicitante que corrija: a correção vai para a coluna da entidade, resolvida pelo nome contra as categorias ativas. A classificação que a equipe muda — a categoria, na triagem — não é campo nem é pedida ao solicitante: é evento de domínio.
- **Toda pendência é para o solicitante.** Não há visibilidade a configurar.

**Regras de negócio**

*Preservadas do legado*

- Pendência pede correção de um campo/classificação ou uma observação; o pedido de anexo é do lote e acompanha ao menos um item.
- Resolver a pendência registra **quando** o solicitante respondeu e **quando** a equipe validou, por item.
- A revisão é por item: validar aplica a correção e fecha; reabrir volta o item para `requested` com novo comentário.

*Acrescentadas pelo modelo novo*

- A pendência registra **quem** validou, em `validated_by_user_id`.
- O lote é auditado como `pending_batch`; cada item, como `pending_item`.
- Abrir um lote e revisar itens é **custódia** (`pending_item:write`/`review`); responder é **posse do solicitante**, só na própria solicitação e em item `requested`.

---

## 14. Domínio `internal-notes`

Responsabilidade: notas internas, marcas de leitura, linha do tempo. Publica a porta `InternalNoteReader`.

### 14.1 `internal_notes`

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | PK, UUID v4 |
| `request_id` | uuid | não | — | FK → `requests.id` (RESTRICT) |
| `author_user_id` | uuid | não | — | FK → `users.id` (RESTRICT) |
| `author_profile_at_creation` | text | não | — | `ck_internal_notes_author_profile` ∈ `Analista`, `Gestor`, `Administrador`, `Admin Root` |
| `content` | text | não | — | `ck_internal_notes_content_length` — `trim(content)` entre 1 e 4000 |
| `created_at` | timestamp | não | `now` | |

**Relações** — `request_id` → `requests.id`; `author_user_id` → `users.id`.

**Índices** — `idx_internal_notes_request_id_created_at` (`request_id`, `created_at`); UNIQUE `uk_internal_notes_request_id_id` (`request_id`, `id`) — sustenta a FK composta das marcas de leitura.

**Invariantes**

- A nota é imutável: não há coluna de edição e não há rota de alteração.
- `author_profile_at_creation` congela o perfil do autor no momento da escrita. O perfil de uma conta pode mudar depois; o da nota, não.
- A nota é a integração da linha do tempo: a linha do tempo é a leitura de `internal_notes` somada a `audit_entries`.

**Regras de negócio**

*Preservadas do legado*

- Nota interna é registro de comunicação interna, visível só para o time e integrado à linha do tempo.
- O conteúdo tem limite de 4000 caracteres e não pode ser vazio.

*Acrescentadas pelo modelo novo*

- O perfil congelado registra quem escreveu a nota — e **só o time escreve nota interna**, então o vocabulário do `ck_` são os perfis do time.

### 14.2 `internal_note_read_states`

Marca de leitura por usuário.

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `request_id` | uuid | não | — | Parte da PK; FK → `requests.id` (RESTRICT) |
| `user_id` | uuid | não | — | Parte da PK; FK → `users.id` (RESTRICT) |
| `last_read_note_id` | uuid | não | — | Parte da FK composta (`request_id`, `last_read_note_id`) → `internal_notes` (`request_id`, `id`) — ver Relações |
| `read_at` | timestamp | não | `now` | |

**Relações** — PK composta (`request_id`, `user_id`); FK composta (`request_id`, `last_read_note_id`) → `internal_notes` (`request_id`, `id`), que impede marcar como lida uma nota de outra solicitação.

**Índices** — PK `pk_internal_note_read_states`; `idx_internal_note_read_states_last_read_note_id`.

**Invariantes**

- Uma marca por usuário por solicitação.
- A nota marcada como lida pertence à mesma solicitação da marca.

**Regras de negócio**

*Preservadas do legado*

- Nota interna é comunicação do time, visível só para o time e integrada à linha do tempo.
- O conteúdo tem limite de 4000 caracteres e não pode ser vazio.

*Acrescentadas pelo modelo novo*

- A nota é imutável: não há edição nem exclusão.
- `author_profile_at_creation` congela o perfil do autor no momento da escrita.
- A marca de leitura é por usuário e por solicitação, e só aponta para nota da mesma solicitação.

---

## 15. Domínio `audit`

Responsabilidade: trilha de auditoria imutável e trilha de tentativas. Publica `AuditReader` e `AttemptRecorder` — a única porta de escrita publicada por um domínio ([02-Architecture § 9.4](./02-Architecture.md#94-auditoria-e-log-o-que-cada-um-garante)).

### 15.1 `audit_entries`

O que foi de fato criado ou alterado. Gravada na mesma transação da alteração que descreve.

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | PK, UUID v4 |
| `request_id` | uuid | sim | — | FK → `requests.id` (RESTRICT) — a solicitação em cujo contexto o fato ocorreu |
| `entity_type` | varchar(50) | não | — | `ck_audit_entries_entity_type` — espelha o catálogo de auditoria em código (`core/audit/audit-catalogue.ts`): `request`, `form_answer`, `attachment`, `triage`, `mapping`, `mapping_participant`, `pending_batch`, `pending_item`, `internal_note`, `request_time_preference`, `user`, `analyst_detail`, `profile`, `status`, `category`, `priority`, `prioritization_evaluation`, `criterion`, `theme`, `portal_setting`, `form`, `form_block`, `form_field` |
| `entity_id` | uuid | não | — | Entidade auditada — **polimórfico, sem FK** |
| `action` | varchar(50) | não | — | `ck_audit_entries_action` — o verbo da ação, no vocabulário do catálogo |
| `actor_user_id` | uuid | sim | — | FK → `users.id` (RESTRICT) |
| `actor_profile_at_creation` | text | sim | — | Perfil do autor no momento do fato — `ck_audit_entries_actor_profile` ∈ `Solicitante`, `Analista`, `Gestor`, `Administrador`, `Admin Root` |
| `previous_value` | json | sim | — | Valor anterior |
| `new_value` | json | sim | — | Valor novo |
| `change_origin` | text | sim | — | `ck_audit_entries_change_origin_length` ≤ 50 — origem da mudança |
| `note` | text | sim | — | Justificativa interna da transição |
| `last_technical_message` | text | sim | — | Mensagem técnica associada |
| `ip_address` | text | sim | — | |
| `occurred_at` | timestamp | não | `now` | Tempo de negócio, não ordem de commit |

**Relações** — `request_id` → `requests.id`; `actor_user_id` → `users.id`. `entity_id` é polimórfico e não tem FK.

**Índices** — `idx_audit_entries_request_id` (`request_id`, `occurred_at`); `idx_audit_entries_entity` (`entity_type`, `entity_id`); `idx_audit_entries_action`; `idx_audit_entries_actor_user_id`; `idx_audit_entries_occurred_at`.

**Invariantes**

- A trilha é **append-only no banco**, e não só por ausência de rota: triggers `BEFORE UPDATE`/`BEFORE DELETE` cobrem as três engines; no Postgres/MySQL a credencial da aplicação não tem `UPDATE`, `DELETE` nem `DROP` (e `TRUNCATE` onde existir), com credencial de migração distinta. `ON DELETE RESTRICT` protege referências, não a própria linha ([ADR-0020](./adr/0020-audit-trail-shape.md)).
- O payload do evento de auditoria é um snapshot autocontido — nunca uma referência que obrigue o consumidor a puxar o agregado de volta ([ADR-0007](./adr/0007-event-driven-audit.md)).
- `occurred_at` é tempo de negócio: a ordem de commit não é a ordem de ocorrência, e a linha do tempo ordena por `occurred_at`.
- **O catálogo de entidades e de ações é o do código; as constraints `ck_` são o espelho.** `entity_type` e `action` são colunas separadas: a entidade nomeia *o que* foi escrito, a ação nomeia *o que aconteceu*. O par (entidade, ação) é validado pelo catálogo em código — `entity_type` tem a lista de entidades, `action` tem a união das ações de todas elas. Nenhuma ação é `read` nem `write`: a trilha registra criação e alteração, não leitura.
- **Toda entidade que pode ser escrita tem `entity_type`** — ver [§ 2.7](#27-conjuntos-fechados).
- **A justificativa da mudança de status vai em `note`; o retorno ao solicitante vai em `last_technical_message`.** O segundo só é gravado quando o destino é público, e os dois nunca são concatenados. A ação é `status_change`; o bypass é `status_override`, com `entity_type = request`.
- `request_id` é preenchido quando a entidade auditada pertence a uma solicitação, e é o que torna a **Linha do tempo** uma consulta indexada.
- Erro de validação (400) não é auditado. Falha de autenticação (401) pertence ao log de segurança do domínio `auth`.

### 15.2 `attempts`

O que foi recusado — por falta de permissão ou por regra de negócio. A recusa é o ato; a tentativa é o registro dele.

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | PK, UUID v4 |
| `correlation_id` | uuid | não | — | Id da requisição HTTP (`req.id`) — correlação, **não** é FK |
| `request_id` | uuid | sim | — | FK → `requests.id` (RESTRICT) — a solicitação de negócio, quando a recusa tem uma |
| `actor_user_id` | uuid | sim | — | FK → `users.id` (RESTRICT) |
| `action` | text | não | — | `ck_attempts_action` — a ação tentada |
| `entity_type` | text | sim | — | `ck_attempts_entity_type` — espelha o mesmo catálogo da auditoria |
| `entity_id` | uuid | sim | — | Entidade alvo — **polimórfico, sem FK** |
| `reason_code` | text | sim | — | `ck_attempts_reason_code_length` — código da recusa |
| `ip_address` | text | sim | — | |
| `occurred_at` | timestamp | não | `now` | Tempo de negócio |

**Relações** — `request_id` → `requests.id`; `actor_user_id` → `users.id` (RESTRICT).

**Índices** — `idx_attempts_correlation_id`; `idx_attempts_request_id`; `idx_attempts_actor_user_id`; `idx_attempts_occurred_at`.

**Mapeamento com a porta.** A porta `AttemptRecorder` grava assim: `correlationId` → `attempts.correlation_id`; `requestId` → `attempts.request_id` (`null` quando a recusa não tem solicitação); `action` → `attempts.action`; `resource` → `attempts.entity_type`; `resourceId` → `attempts.entity_id`; `reason` → `attempts.reason_code`; `actor` → `attempts.actor_user_id` (um ator sem sessão grava `null`); `occurredAt` → `attempts.occurred_at`.

**Invariantes**

- A tentativa é gravada **fora** da transação, na borda, a partir do `DomainError` que carrega o contexto da recusa. Ela existe justamente porque a transação foi desfeita.
- **`correlation_id` e `request_id` são coisas diferentes.** O primeiro identifica a requisição HTTP e existe sempre; o segundo identifica a solicitação de negócio e é nulo em recusas sobre usuário, configuração e outras operações sem solicitação. Trocar um pelo outro faria o INSERT falhar na FK e a recusa se perder.
- A gravação é best-effort: se falhar, o log estruturado registra e a resposta segue. A assimetria em relação à auditoria é deliberada.
- O critério de auditabilidade é explícito no erro, não inferido de uma lista na borda.
- `attempts` espelha o vocabulário de `audit_entries`: as duas trilhas respondem às mesmas perguntas do mesmo jeito.

**Regras de negócio**

*Preservadas do legado*

- A auditoria é imutável e registra autor, momento, valor anterior e novo.
- A recusa é registrada mesmo quando a transação é desfeita; a gravação é best-effort e não bloqueia a resposta.
- Erro de validação (400) não é auditado; falha de autenticação (401) pertence ao log de segurança.

*Acrescentadas pelo modelo novo*

- Alteração e recusa são trilhas separadas (`audit_entries` e `attempts`), com garantias diferentes.
- `attempts` é gravada fora da transação, pela porta `AttemptRecorder`, e é o único método de escrita que não exige transação corrente.
- A entidade auditada é identificada por `entity_type`/`entity_id`; a referência é polimórfica e não tem FK.

---

## 16. Domínio `reports`

Responsabilidade: dashboard, métricas, exportações. **Não tem tabelas** — é uma projeção de leitura sobre vários domínios, alimentada por consultas agregadas.

As métricas são **derivadas** na consulta: o recorte (`open`, `closed`, `unassigned`) sai do conjunto de status terminais, e a classificação por categoria sai da coluna `requests.category_id`; a Prioridade, da avaliação corrente. Nada disso é armazenado.

**O atraso não é derivado do prazo desejado.** Até a regra de SLA existir, o recorte `overdue` e a métrica de atraso não são publicados (§21, [ADR-0024](./adr/0024-requested-deadline-is-not-sla.md)).

---

## 17. Domínio `portal-config`

Responsabilidade: configuração do portal — categorias, status, aparência, modo de acesso. Publica a porta `PortalConfigReader`.

### 17.1 `portal_settings`

Configuração global do portal. Singleton.

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | PK — singleton, garantido pela aplicação e pelo seed |
| `solicitation_mode` | text | não | `PUBLIC` | `ck_portal_settings_solicitation_mode` ∈ `PUBLIC`, `AUTHENTICATED` |
| `platform_name` | text | não | `MAAT` | `ck_portal_settings_platform_name_length` ≤ 80 |
| `protocol_mask` | text | não | `MAAT` | `ck_portal_settings_protocol_mask_format` — `^[A-Z0-9]{1,10}$`, sem hífen |
| `light_theme_id` | uuid | sim | — | FK → `themes.id` (RESTRICT) — a Aparência clara vigente |
| `dark_theme_id` | uuid | sim | — | FK → `themes.id` (RESTRICT) — a Aparência escura vigente |
| `updated_by_user_id` | uuid | sim | — | FK → `users.id` (RESTRICT) |
| `created_at` | timestamp | não | `now` | |
| `updated_at` | timestamp | não | `now` | |

**Relações** — `light_theme_id` e `dark_theme_id` → `themes.id`; `updated_by_user_id` → `users.id`.

**Índices** — PK `pk_portal_settings` (singleton).

**Invariantes**

- Uma linha. A unicidade é da aplicação e do seed — nenhuma constraint portable conta linhas.
- `solicitation_mode` é o Modo de acesso: `PUBLIC` libera a abertura de solicitação; `AUTHENTICATED` exige conta.
- `protocol_mask` é o prefixo exibido no protocolo: `^[A-Z0-9]{1,10}$`, **sem hífen** — ele é o separador do formato `<mask>-XXXX-XXXX`. Trocar a máscara afeta só os protocolos emitidos depois; os existentes nunca são reescritos ([ADR-0008](./adr/0008-protocol-without-collision-risk.md)).
- `light_theme_id` e `dark_theme_id` apontam as duas **Aparências vigentes** — uma por slot de Aparência. Nulo em um slot significa "sem Aparência nesse slot", e o frontend cai nos padrões locais.
- A leitura consolidada do portal **compõe** `{ light, dark }` a partir dos dois slots: é o contrato que o frontend consome hoje, sem mudança. Ver [ADR-0015](./adr/0015-preserve-the-appearance-contract.md).
- As duas Aparências apontadas precisam estar ativas: apontar para uma inativa é erro de aplicação.
- Os assets (logo, avatar, tela de login, favicon) pertencem à Aparência, e não ao portal.

**A leitura tem duas portas.** A **leitura pública** não exige autenticação e devolve o que o solicitante vê antes de ter conta: `platform_name`, `solicitation_mode`, `protocol_mask`, a Aparência vigente com os seus assets, as categorias ativas e os status com `is_public = true`. A **leitura administrativa** é presa a `portal_config:read` e devolve o conjunto completo, incluindo os status internos e restritos e os pesos de priorização ([ADR-0018](./adr/0018-portal-read-has-two-doors.md)).

### 17.2 `themes`

As **aparências** do portal. Cada linha é um conjunto completo de cores e estilos. Colunas **explícitas por token**, sem JSON: o frontend consome token por token, e token em coluna é legível, indexável e validável por constraint.

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | PK, UUID v4 |
| `name` | varchar(60) | não | — | UNIQUE `uk_themes_name`, `ck_themes_name_length` ≤ 60 — nome da aparência |
| `is_active` | boolean | não | `true` | Aparência que pode ser oferecida ao solicitante |
| `background`, `surface`, `border`, `text_primary`, `text_secondary`, `heading`, `rich_black`, `primary`, `secondary`, `tint`, `on_primary`, `on_dark`, `on_gradient` | text | sim | — | `ck_themes_hex` — as treze cores da Aparência |
| `gradient_from`, `gradient_to` | text | sim | — | `ck_themes_hex` |
| `gradient_angle` | integer | sim | — | `ck_themes_gradient_angle` — 0 a 360, ou nulo |
| `status_{error,success,info,warning,neutral}_color`, `status_{error,success,info,warning,neutral}_background` | text | sim | — | `ck_themes_hex` — cor e fundo de cada tom |
| `status_{error,success,info,warning,neutral}_background_locked` | boolean | sim | — | O fundo do tom não é recalculado |
| `logo_url` | text | sim | — | `ck_themes_logo_url_length` ≤ 500 — asset da Aparência |
| `avatar_url` | text | sim | — | `ck_themes_avatar_url_length` ≤ 500 |
| `login_image_url` | text | sim | — | `ck_themes_login_image_url_length` ≤ 500 |
| `favicon_url` | text | sim | — | `ck_themes_favicon_url_length` ≤ 500 |
| `logo_use_primary_color` | boolean | não | `false` | O logo usa a cor primária da Aparência |
| `created_at` | timestamp | não | `now` | |
| `updated_at` | timestamp | não | `now` | |

**Relações** — inbound: `portal_settings.light_theme_id` e `portal_settings.dark_theme_id` → `themes.id`.

**Índices** — UNIQUE `uk_themes_name`; `idx_themes_is_active`.

**Invariantes**

- Uma linha = uma Aparência. O conjunto de tokens é definido **uma vez** — não há prefixo de Aparência nas colunas, e a duplicação `light_*`/`dark_*` do singleton do legado não existe.
- A Aparência pode começar **vazia** (tokens nulos): o frontend aplica os padrões locais por token, e o contrato permite o backend começar sem cores.
- Toda cor é hexadecimal válido ou nulo: `#RRGGBB` ou `#RRGGBBAA`. O predicado vem do `Dialect` — regex no Postgres/MySQL e `GLOB` no SQLite —, porque `INSTR` não existe no Postgres e o Knex não traduz função dentro de `table.check`. A migration precisa ser testada nas três engines com cor válida, inválida e nula ([02-Architecture § 10.2](./02-Architecture.md#102-o-dialect)); a suíte automatizada é pendência (§22 da arquitetura).
- Os cinco tons são vocabulário do código: são colunas, não linhas de referência.
- `name` é único — é o nome que o solicitante vê na escolha de aparência.
- Só uma Aparência **ativa** pode estar vigente, em cada slot (`portal_settings.light_theme_id` e `portal_settings.dark_theme_id`). Desativar a vigente de um slot exige repontar antes; sem vigente em um slot, o frontend aplica os padrões locais naquele slot.
- A escolha entre as Aparências é do frontend; o backend expõe a lista e a vigente, e não guarda preferência por solicitante.
- Os assets são da Aparência: cada linha carrega os seus quatro.
- A URL de um asset é relativa (`/…`) ou absoluta (`http(s)://…`) — regra de aplicação, porque o upload acontece depois da escrita.

**Regras de negócio**

*Preservadas do legado*

- O conjunto de tokens é o mesmo — treze cores de base, o gradiente (`from`, `to`, `angle`) e os cinco tons com cor, fundo e bloqueio de fundo.

### 17.3 `categories`

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | PK, UUID v4 |
| `name` | text | não | — | nome exibido — `ck_categories_name_length` ≤ 40 — é o limite do contrato da API |
| `normalized_name` | varchar(40) | não | — | UNIQUE `uk_categories_normalized_name`, `ck_categories_normalized_name_length` ≤ 40 — `trim().toLowerCase()` do nome, mantido pela aplicação |
| `description` | text | sim | — | |
| `is_active` | boolean | não | `true` | Categoria desativada sai da fila |
| `display_order` | integer | não | — | Ordem do card na fila |
| `form_id` | uuid | sim | — | FK → `forms.forms.id` (RESTRICT) — o formulário que esta categoria pede |
| `created_at` | timestamp | não | `now` | |
| `updated_at` | timestamp | não | `now` | |

**Relações** — `form_id` → `forms.forms.id`; inbound: `requests.requests.category_id`, `triage.triages.new_category_id` e `users.analyst_detail_categories.category_id` → `categories.id`.

**Índices** — UNIQUE `uk_categories_normalized_name`; `idx_categories_is_active`; `idx_categories_display_order`; `idx_categories_form_id`.

**Invariantes**

- A unicidade do nome é case-insensitive. Como índice funcional não é portátil, ela é garantida pela coluna normalizada, mantida pela aplicação — o nome exibido continua exatamente como o administrador digitou.
- **Uma categoria ativa tem sempre um formulário ligado.** Sem ele a solicitação não teria o que preencher, e a categoria não pode ser escolhida.
- **Duas categorias podem apontar o mesmo formulário** — quando as perguntas forem as mesmas.
- **Ao menos uma categoria deve estar ativa.** A fila ordena pelas categorias ativas, e o formulário oferece as mesmas.

### 17.4 `statuses`

As etapas do ciclo de vida — a configuração mais carregada do portal.

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | PK, UUID v4 |
| `key` | varchar(50) | não | — | UNIQUE `uk_statuses_key` — a identidade estável do status, do código — `ck_statuses_key_length` ≤ 50 |
| `order_number` | integer | não | — | UNIQUE `uk_statuses_order_number` — ordem do ciclo |
| `name` | varchar(40) | não | — | UNIQUE `uk_statuses_name` — nome exibido — `ck_statuses_name_length` ≤ 40 — é o limite do contrato da API, não a largura da coluna |
| `description` | text | sim | — | |
| `is_public` | boolean | não | `false` | Status visível ao solicitante |
| `is_active` | boolean | não | `true` | Status desativado sai do ciclo |
| `is_core` | boolean | não | `false` | Status central do fluxo |
| `is_restricted` | boolean | não | `false` | Status que exige `request:status_override` para ser alvo de `PATCH /status` |
| `is_terminal` | boolean | não | `false` | Status que encerra a solicitação |
| `triage_mode` | text | não | `none` | `ck_statuses_triage_mode` ∈ `none`, `free`, `conclusion_only` |
| `mapping_mode` | text | não | `none` | `ck_statuses_mapping_mode` ∈ `none`, `free`, `conclusion_only` |
| `tone` | text | não | `info` | `ck_statuses_tone` ∈ `error`, `success`, `info`, `warning`, `neutral` |
| `created_at` | timestamp | não | `now` | |
| `updated_at` | timestamp | não | `now` | |

**Relações** — inbound: `requests.requests.status_id` e `last_public_status_id`, `triage.triages.exit_status_id` e `mapping.mappings.target_status_id` → `portal-config.statuses.id`.

**Índices** — UNIQUE `uk_statuses_key`; UNIQUE `uk_statuses_order_number`; UNIQUE `uk_statuses_name`; `idx_statuses_is_active`.

**Invariantes**

- **A `key` é a identidade do status, e ela é do código.** O código referencia status por `key` — nunca por `id`, nunca por `name`. O `name` é o rótulo que o Administrador edita; a `key` é o endereço.
- **A `key` do seed do ciclo de referência:** `solicitacao_enviada`, `aguardando_triagem`, `em_triagem`, `pendente_de_informacoes`, `aguardando_mapeamento`, `mapeamento_agendado`, `em_mapeamento`, `em_analise_de_viabilidade`, `elegivel`, `nao_elegivel`, `priorizado`, `backlog`, `direcionada_para_outra_area`, `em_desenvolvimento`, `em_homologacao`, `concluido`, `cancelado`.
- **Os status de núcleo são imutáveis.** São os sete com `is_core = true`: a `key` é reservada, e nem o nome, nem `is_public`, `is_terminal`, `is_restricted`, `triage_mode` ou `mapping_mode` podem mudar — nem a linha pode ser desativada.
- A visibilidade tem **dois** predicados independentes: `is_public` (visível ao solicitante) e `is_restricted` (exige `request:status_override` para um perfil assumir). Não há coluna de visibilidade — a combinação dos dois é o que o glossário chama de "pública, interna ou restrita".
- **Um status restrito tem `triage_mode` e `mapping_mode` `none`** — ele não é alvo de triagem nem de mapeamento. `request:status_override` libera a entrada por `PATCH /status`; não transforma o status em alvo de conclusão de triagem ou mapeamento.
- `is_terminal` marca o status que encerra a solicitação; é o que dispara `requests.closed_at`. Só `concluido` e `cancelado` são terminais no seed v4; `nao_elegivel` e `direcionada_para_outra_area` são desfechos não terminais e a solicitação continua no fluxo até um status terminal.
- `triage_mode` e `mapping_mode` dizem o que é permitido fazer no status: nada, livremente, ou só a conclusão da etapa. A regra de transição mora aqui, e não numa tabela de transições.
- **Quem tem custódia da solicitação só alcança um status ativo, não restrito, com `triage_mode` ou `mapping_mode` `free`.** `request:status_override` libera status restrito e os modos; o Administrador e o Admin Root têm a chave. Um status terminal não é saída.
- **Ao menos um status deve estar ativo, e ao menos um status terminal.** Toda solicitação precisa poder chegar a um encerramento.
- **O Status de saída de uma triagem é um status com `triage_mode = conclusion_only`.** É o que define o conjunto de desfechos possíveis, e o que faz do Veredito uma etapa do ciclo e não um vocabulário paralelo.
- **A mudança para um status com `is_restricted` exige `request:status_override`.** O flag diz quais status são protegidos; a chave diz quem pode entrar neles. Administrador e Admin Root têm a chave; um perfil sem ela não assume o status, mesmo com `triage_mode` ou `mapping_mode` `free`.
- **Status inativo não é alvo de ninguém.** `is_active = false` sai do ciclo; nenhuma chave o reabilita.

**Regras de negócio**

*Preservadas do legado*

- Os status de referência do ciclo, com ordem, nome único, descrição e estado ativo.
- Cada status sabe se é público, se encerra a solicitação, se é central, se é restrito e qual o seu tom.
- As regras de triagem e de mapeamento por status.

---

## 18. Domínio `forms`

Responsabilidade: o catálogo das definições de formulário — o que um sujeito pede. Publica a porta `FormReader`.

O domínio é um **catálogo**: guarda a definição, nunca a resposta. Quem responde é o domínio do sujeito — no caso da solicitação, `requests.form_answers`. Vários formulários podem existir: o de abertura de solicitação é um deles, e um formulário de outro assunto (uma pendência, um mapeamento) teria a mesma forma.

**O seed é andaime.** O formulário é **editado no lugar**, sem versionamento ([ADR-0019](./adr/0019-form-is-editable-in-place.md)).

### 18.1 `forms`

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | PK, UUID v4 |
| `key` | varchar(60) | não | — | UNIQUE `uk_forms_key`, `ck_forms_key_length` ≤ 60 — `solicitacao` no seed |
| `name` | text | não | — | `ck_forms_name_length` ≤ 80 |
| `description` | text | sim | — | |
| `is_active` | boolean | não | `true` | |
| `created_at` | timestamp | não | `now` | |
| `updated_at` | timestamp | não | `now` | |

**Relações** — inbound: `form_blocks.form_id`, `form_fields.form_id`, `categories.form_id` e `requests.form_id` → `forms.forms.id`.

**Índices** — UNIQUE `uk_forms_key`.

**Invariantes** — a chave do formulário é estável e é o que a API e as seeds referenciam.

### 18.2 `form_blocks`

As seções do formulário. A chave do bloco é a chave do bloco no payload.

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | PK, UUID v4 |
| `form_id` | uuid | não | — | FK → `forms.id` (RESTRICT) |
| `key` | varchar(100) | não | — | Vocabulário **aberto** por formulário — o seed está no Apêndice A — `ck_form_blocks_key_length` ≤ 100 |
| `title` | text | não | — | `ck_form_blocks_title_length` ≤ 100 |
| `display_order` | integer | não | — | |
| `is_active` | boolean | não | `true` | |
| `created_at` | timestamp | não | `now` | |
| `updated_at` | timestamp | não | `now` | |

**Relações** — `form_id` → `forms.forms.id`; inbound: `form_fields.block_id` → `form_blocks.id`.

**Índices** — UNIQUE `uk_form_blocks_form_key` (`form_id`, `key`).

**Invariantes** — a chave do bloco é o nome da chave do payload, e é única dentro do formulário.

### 18.3 `form_fields`

As perguntas. A chave do campo é a chave do campo no payload.

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | PK, UUID v4 |
| `form_id` | uuid | não | — | FK → `forms.id` (RESTRICT) — desnormalizado, para a chave ser única no formulário inteiro |
| `block_id` | uuid | não | — | FK → `form_blocks.id` (RESTRICT) |
| `key` | varchar(100) | não | — | Vocabulário **aberto** por formulário — o seed está no Apêndice A — `ck_form_fields_key_length` ≤ 100 |
| `label` | text | não | — | `ck_form_fields_label_length` ≤ 100 — rótulo exibido |
| `type` | text | não | — | `ck_form_fields_type` ∈ `text`, `long_text`, `email`, `number`, `decimal`, `boolean`, `date`, `select`, `yes_no_detail` |
| `required` | boolean | não | `true` | |
| `help_text` | text | sim | — | |
| `options` | json | sim | — | Opções de um `select`, como valor → rótulo |
| `max_length` | integer | sim | — | Para `text`, `long_text`, `email` e para o detalhe de um `yes_no_detail` — o limite do detalhe é o mesmo `max_length` |
| `min_value` | decimal(10,2) | sim | — | Para `number` e `decimal` |
| `max_value` | decimal(10,2) | sim | — | Para `number` e `decimal` |
| `must_be_future` | boolean | não | `false` | A data tem de ser hoje ou futura |
| `is_active` | boolean | não | `true` | |
| `display_order` | integer | não | — | |
| `created_at` | timestamp | não | `now` | |
| `updated_at` | timestamp | não | `now` | |

**Relações** — `form_id` → `forms.forms.id`; `block_id` → `form_blocks.id`; inbound: `form_answers.field_id` e `pending_items.form_field_id` → `form_fields.id`.

**Índices** — UNIQUE `uk_form_fields_form_key` (`form_id`, `key`); `idx_form_fields_block_id`.

**Invariantes**

- **A chave do campo é o contrato** — ver [§ 2.2](#22-colunas).
- **A chave é única no formulário inteiro**, e o banco garante — é a `uk_form_fields_form_key`. Uma chave repetida entre blocos seria um contrato ambíguo para o frontend.
- O **tipo** de um campo não muda depois que ele tem respostas — regra de aplicação.
- `options` só existe para `select`. O **valor** da opção é o que se guarda; o rótulo é o que se mostra. No seed, valor e rótulo são a mesma string.
- Os limites do campo são validados pela aplicação, na borda — o banco não os impõe, porque o valor vive em outra tabela.

**Regras de negócio**

*Preservadas do legado*

- O formulário de abertura tem quatro blocos e 32 campos, com os rótulos, obrigatoriedades e limites do contrato atual.
- A categoria escolhe o formulário; no wire vigente ela é pedida em `demand.category` (§21).
- A chave do campo é a chave do payload; o frontend valida contra ela.

*Acrescentadas pelo modelo novo*

- O formulário é uma entidade editável in-place; o seed é andaime, não a definição imutável.
- A definição é a fonte única dos limites; o banco não impõe `max_length`, `min_value` ou `max_value`.
- A chave é única no formulário inteiro; o tipo de um campo não muda depois que ele tem respostas.
- Uma categoria ativa tem sempre um formulário ligado; duas categorias podem apontar o mesmo formulário.

---

## 19. Schema de Infraestrutura

Schema sem dono de domínio ([ADR-0011](./adr/0011-infrastructure-schema-without-domain-owner.md)). A tabela é consumida pela porta `Counter`, em `core/repository/`.

### 19.1 `code_counters`

| Coluna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `name` | varchar(50) | não | — | PK, `ck_code_counters_name_length` ≤ 50 — nome do contador, uma linha por domínio |
| `value` | bigint | não | `0` | Valor corrente do contador |
| `updated_at` | timestamp | não | `now` | |

**Relações** — sem FK. O contador é referenciado pelo código, via porta `Counter`.

**Índices** — PK `pk_code_counters` (`name`).

**Invariantes**

- O contador **nunca** é resetado nem renumerado.
- O incremento acontece dentro da mesma transação do insert que consome o valor.
- O limite de domínio do valor é verificado na geração, não no banco.

---

## 20. Catálogo de Tabelas

Para colunas, tipos, constraints e índices por tabela, use o dicionário de consulta em [`db/02-reference.md`](./db/02-reference.md).

| # | Tabela | Domínio | No legado |
| --- | --- | --- | --- |
| 1 | `profiles` | `users` | `profiles` |
| 2 | `users` | `users` | `users` |
| 3 | `analyst_details` | `users` | `details_professional` |
| 4 | `analyst_detail_categories` | `users` | `attended_category_ids` (texto) |
| 5 | `credentials` | `auth` | `users` (colunas soltas) |
| 6 | `forms` | `forms` | — (novo) |
| 7 | `form_blocks` | `forms` | — (novo) |
| 8 | `form_fields` | `forms` | `fieldCatalog.ts` (código) |
| 9 | `requests` | `requests` | `requests` |
| 10 | `form_answers` | `requests` | `requests` (colunas do formulário) |
| 11 | `attachments` | `requests` | `attachments` |
| 12 | `request_time_preferences` | `requests` | `request_time_preferences` |
| 13 | `triages` | `triage` | `triages` |
| 14 | `mappings` | `mapping` | `mappings` |
| 15 | `mapping_participants` | `mapping` | `mapping_participants` |
| 16 | `criteria` | `prioritization` | `criteria` |
| 17 | `priorities` | `prioritization` | `priorities` |
| 18 | `prioritization_evaluations` | `prioritization` | `prioritization_evaluations` |
| 19 | `pending_batches` | `pending-items` | `pending_items` (`batch_id`) |
| 20 | `pending_items` | `pending-items` | `pending_items` |
| 21 | `internal_notes` | `internal-notes` | `request_internal_notes` |
| 22 | `internal_note_read_states` | `internal-notes` | `request_internal_note_read_states` |
| 23 | `audit_entries` | `audit` | `audit_history` |
| 24 | `attempts` | `audit` | — (novo) |
| 25 | `portal_settings` | `portal-config` | `system_settings` |
| 26 | `themes` | `portal-config` | `system_themes` |
| 27 | `categories` | `portal-config` | `categories` |
| 28 | `statuses` | `portal-config` | `statuses` |
| 29 | `code_counters` | `platform` | — (novo) |

### 20.1 O que Mudou em Relação ao Legado

| Mudança | Por quê |
| --- | --- |
| `users` → `users` + `credentials` | O domínio `users` não guarda segredo; `UserReader` não pode vazar hash |
| `requests` → `requests` + `form_answers` + `forms` | O formulário deixa de ser colunas e passa a ser definição + respostas |
| `requesters` → respostas do bloco `requester` | O solicitante é o que foi preenchido, não uma linha por e-mail — [ADR-0013](./adr/0013-requester-is-an-answer-not-a-table.md) |
| `requests.title`, `process_name` → respostas | O conteúdo do formulário tem uma casa só; a classificação (a categoria) continua sendo coluna |
| `requests.priority_id` → sai | A faixa tem uma casa só: a avaliação corrente — [ADR-0016](./adr/0016-priority-has-one-home.md) |
| `triages.result` (texto) → sai | O desfecho da triagem é o Status de saída, e o texto é a justificativa da conclusão |
| `details_professional` → `analyst_details` + `analyst_detail_categories` | O profissional é o usuário interno; a lista de categorias vira tabela filha |
| `audit_history` → `audit_entries` + `attempts` | Alteração e recusa são trilhas com garantias diferentes ([ADR-0007](./adr/0007-event-driven-audit.md)) |
| `professional_id` → `responsible_id` → `users.id` | O profissional é 1:1 com a conta; a referência aponta para a conta |
| `request_internal_notes` → `internal_notes` | Nome no vocabulário do domínio |
| `system_themes` → `themes` | A singleton com as duas paletas duplicadas em colunas vira entidade: uma Aparência por linha, com nome; e os assets migram para a Aparência |
| `system_settings` → `portal_settings` | Nome no vocabulário do domínio; e os dois slots de Aparência |
| `criteria.criterion_id` (texto) → `id` (uuid) + `code` | Chave primária uniforme, com código estável preservado |
| `prioritization_evaluations.classification` (ENUM) → `priority_id` (FK) | O mesmo conjunto não é armazenado duas vezes |
| `categories.status` (ENUM) → `is_active` (boolean) | Enum de dois valores é boolean |
| `analyst_details.status` (ENUM) → `is_available` (boolean) | Enum de dois valores é boolean, e nome que não colide com o da conta |
| `statuses.visibility` (ENUM) → `is_public` (boolean) | O `visibility` foi descartado no legado; o que resta é `is_public` |
| `pending_items.status` — sem mudança de conjunto | O estado é por item; `overdue` não é estado e a pendência não tem prazo próprio |
| `pending_items.type` (ENUM) → `field_edit`/`observation` | O `ENUM` legado tinha quatro valores; o modelo novo reduz o tipo aos dois casos de negócio, e o pedido de anexo passa a ser do lote |
| `pending_items.batch_id` → `pending_batches` | O lote vira tabela própria: o pedido de anexo e o criador são do lote, e não repetidos em cada item |
| `pending_items.deadline` → sai | O legado só gravava `null`; a pendência não tem prazo próprio ([ADR-0024](./adr/0024-requested-deadline-is-not-sla.md)) |
| `requests.internal_notes`, `next_steps`, triagem duplicada | Uma casa por fato: `triages` |
| Convenções alteradas (`ENUM` nativo, `CASCADE`/`SET NULL`, `sequence`, `btrim`, índice funcional, `jsonb_typeof`) | Estão em [§ 2](#2-convenções-de-nomenclatura) — e em [ADR-0009](./adr/0009-schema-naming-and-constraints.md) |

---

## 21. Pendências

| Pendência | Impacto | Gatilho |
| --- | --- | --- |
| Formulário configurável | Hoje o formulário é fixo e semeado. A customização pede uma tela de administração e um contrato de renderização dinâmica no frontend. O vínculo já existe — `categories.form_id` é obrigatório para categoria ativa, e as categorias semeadas apontam para `solicitacao`; falta a tela/contrato para cada categoria escolher o seu. Nesse passo a categoria sai de `demand.category` e passa a `category` no topo, porque o bloco `demand` deixa de ser garantido | Demanda do produto por formulário configurável |
| SLA por etapa e prioridade | O legado calcula atraso sobre `operational.desiredDeadline`, que é o prazo **desejado** do solicitante, não um compromisso. O SLA por etapa/prioridade, em horas úteis, com pausa em `Pendente de informações`, é regra de produto ainda não aprovada; até lá `overdue` não é publicado ([ADR-0024](./adr/0024-requested-deadline-is-not-sla.md)) | Aprovação da proposta de SLA pelo P.O./cliente |
| Previsão de conclusão | `requests.estimated_completion` é a previsão publicada e não é SLA, mas o legado não tem rota que a escreva. Definir quem a atualiza — triagem, mapeamento ou ambos | Definição de quem publica a previsão |
| Aparências nomeadas | O contrato devolve `{ light, dark }`. A lista de aparências, com escolha do solicitante, é a etapa seguinte do contrato de aparência | Evolução do frontend para o contrato de aparência |
| RBAC configurável | As permissões são matriz em código. O alvo — `permissions`, `profile_permissions` com escopo, perfis customizados, configuração do portal separada e claim — está no Apêndice C ([ADR-0025](./adr/0025-authorization-capability-scope.md)) | Frontend consumir `permissions` |
| Preferência de aparência por solicitante | A escolha entre as aparências fica no cliente; o servidor não guarda preferência | A preferência precisar ser do servidor |
| Projeção da fila | Nome do solicitante, processo e prazo desejado saem das respostas, e a fila os junta por chave de campo. Uma tabela de projeção é a alternativa se a junção pesar | Volume da fila |
| Identidade do solicitante | O bloco `requester` é resposta; a busca por e-mail usa a projeção `form_answers.value_lookup`. O e-mail declarado é chave de busca, não autenticação, e a recusa é `404` ([ADR-0023](./adr/0023-requester-email-is-a-lookup-key.md)) | Volume de solicitações |
| Anexo restrito | A coluna `attachments.is_restricted` existe, mas nenhuma regra a implementa e nada a lê. Decidir se o conceito é implementado — quem enxerga o arquivo, e o que o solicitante vê — ou se a coluna sai | Decisão de produto sobre conteúdo restrito (LGPD) |

---

## 22. Apêndice A — o Seed do Formulário

O formulário de abertura de solicitação, como nasce. São **32 campos** em 4 blocos, com os rótulos que o produto já usa.

A 33ª chave do catálogo do legado — `demand.category` — **não é um campo**: é a **Classificação**, que vive em `requests.category_id`. O frontend manda `demand.category` com o nome, dentro do bloco `demand`, como no contrato vigente; o backend resolve o nome, grava o id e **acha o formulário pela categoria**. A mudança para `category` no topo acontece quando o formulário configurável entrar (§21).

O seed é andaime: a definição semeada é editável in-place e descreve o formulário de abertura de solicitação ([ADR-0019](./adr/0019-form-is-editable-in-place.md)).

**Bloco `requester` — Identificação**

| Chave | Rótulo | Tipo | Obrigatório | Limites |
| --- | --- | --- | --- | --- |
| `fullName` | Nome completo | text | sim | 150 |
| `corporateEmail` | E-mail corporativo | email | sim | 254 |
| `area` | Área | text | sim | 100 |
| `department` | Departamento | text | não | 100 |
| `manager` | Gestor responsável | text | sim | 150 |
| `additionalContact` | Contato adicional | text | não | 100 |

**Bloco `demand` — Demanda**

| Chave | Rótulo | Tipo | Obrigatório | Limites |
| --- | --- | --- | --- | --- |
| `title` | Título resumido | text | sim | 150 |
| `requestType` | Tipo de solicitação | select | sim | `Automação`, `Melhoria`, `Manutenção` |
| `processName` | Nome do processo | text | sim | 150 |
| `description` | Descrição da necessidade | text | sim | 4000 |
| `problem` | Problema/oportunidade | text | sim | 4000 |
| `expectedResult` | Resultado esperado | text | sim | 4000 |
| `justification` | Justificativa | text | sim | 4000 |

**Bloco `operational` — Operacional**

| Chave | Rótulo | Tipo | Obrigatório | Limites |
| --- | --- | --- | --- | --- |
| `processDescription` | Descrição do processo atual | text | sim | 4000 |
| `processSteps` | Etapas do processo | text | sim | 4000 |
| `systemsUsed` | Sistemas utilizados | text | sim | 255 |
| `executionFrequency` | Frequência de execução | select | sim | `Diária`, `Semanal`, `Mensal`, `Por Demanda` |
| `volumetry` | Volumetria | text | sim | 100 |
| `peopleInvolved` | Pessoas envolvidas | number | sim | ≥ 1 |
| `averageExecutionTime` | Tempo médio por ciclo | text | sim | 60 |
| `monthlyEffortHours` | Esforço mensal (horas) | number | sim | ≥ 0 |
| `hasManualControls` | Controles manuais | yes_no_detail | sim | detalhe ≤ 1000 |
| `mainRisks` | Principais riscos | text | sim | 2000 |
| `clientImpact` | Impacto no cliente | text | sim | 2000 |
| `operationalImpact` | Impacto operacional | select | sim | `Baixo`, `Médio`, `Alto`, `Crítico` |
| `desiredDeadline` | Prazo desejado | date | sim | hoje ou futuro |
| `perceivedCriticality` | Criticidade percebida | select | sim | `Baixa`, `Média`, `Alta`, `Crítica` |

**Bloco `complementary` — Complementar**

| Chave | Rótulo | Tipo | Obrigatório | Limites |
| --- | --- | --- | --- | --- |
| `hasProcessDocumentation` | Documentação do processo | yes_no_detail | não | detalhe ≤ 1000 |
| `hasSimilarSolution` | Solução semelhante | yes_no_detail | não | detalhe ≤ 1000 |
| `dependsOnOtherAreas` | Dependência de outras áreas | yes_no_detail | não | detalhe ≤ 1000 |
| `handlesRestrictedInfo` | Informação restrita (LGPD) | yes_no_detail | não | detalhe ≤ 1000 |
| `additionalNotes` | Observações adicionais | text | não | 2000 |

**Regras de negócio**

*Preservadas do legado*

- O formulário é o mesmo: os quatro blocos, os campos, os rótulos, as obrigatoriedades e os limites.
- O payload continua sendo `{ requester, demand, operational, complementary }` — a categoria viaja em `demand.category`, e os quatro blocos ficam como estão. A API resolve as chaves e devolve a mesma forma, agrupando as respostas por bloco.
- `schedulePreferences` **não** é um campo de formulário: é a lista de slots, e vive em `request_time_preferences`.

*Acrescentadas pelo modelo novo*

- **`demand.requestType`, `operational.executionFrequency` e `operational.desiredDeadline` fecham no contrato do frontend.** O backend legado aceitava texto livre em `requestType` e em `executionFrequency`, e só validava a data futura na edição, não na abertura. O modelo novo aplica os três na abertura — é o contrato que o frontend já impõe, e a diferença está registrada aqui para que ninguém a leia como herança do backend.
- **`options` guarda valor → rótulo, e no seed valor e rótulo são a mesma string.** Os quatro `select` do seed não têm rótulo distinto do valor.
- **`long_text` existe no vocabulário e o seed não o usa.** Os seis campos de 4000 caracteres são `text` com `max_length` 4000.

---

## 23. Apêndice B — Catálogo de Permissões

A chave de permissão é `recurso:ação` e é **contrato**: o frontend decide o que mostrar a partir dela, e o RBAC configurável vai semear exatamente estas chaves. O recurso da chave é o **nome do domínio em inglês**, com `_` como separador interno, ou um read model declarado (`assignee_directory`); a ação é um dos oito verbos do catálogo. A matriz continua em código ([ADR-0006](./adr/0006-static-profile-authorization.md)); o catálogo abaixo é a lista única que a matriz usa e que a futura tabela `permissions` recebe.

| Chave | Recurso | Ação | O que permite | Equivalente no legado |
| --- | --- | --- | --- | --- |
| `request:read` | request | read | Ler a solicitação na visão interna | `requireRole(Analista, Gestor, Administrador)` em `GET /requests/:protocol/internal` |
| `request:write` | request | write | Editar o conteúdo interno da solicitação | `PATCH /requests/:protocol/internal` + `canEditSolicitation` |
| `request:assign` | request | assign | Atribuir e reatribuir o Responsável | `PATCH .../assignee` + `canAssignRequest` |
| `request:status_change` | request | status_change | Mudar o status da solicitação | `PATCH .../status` — o Gestor nunca muda status |
| `request:status_override` | request | status_override | Mudar status para alvo restrito ou fora do modo da etapa via `PATCH .../status`; não torna o status alvo de triagem/mapeamento | bypass do Administrador em `PATCH .../status` |
| `queue:read` | queue | read | Ler a fila e suas métricas | `requireRole(...)` em `/queue` |
| `queue:export` | queue | export | Exportar a fila em CSV | `GET /reports/requests.csv` |
| `reports:read` | reports | read | Ler o dashboard e as métricas | `GET /reports/dashboard` |
| `triage:read` | triage | read | Ler a triagem | `GET /requests/:protocol/triage` |
| `triage:write` | triage | write | Registrar uma triagem | `POST .../triage` + `isAdminOrAssignee` |
| `mapping:read` | mapping | read | Ler o mapeamento | `GET /queue/requests/:protocol/mapping` |
| `mapping:write` | mapping | write | Registrar e concluir o mapeamento | `PUT .../mapping` |
| `prioritization:write` | prioritization | write | Registrar avaliação e ler os critérios necessários ao cálculo | `PUT /prioritization/:protocol/score` + `GET /prioritization/criteria` |
| `pending_item:read` | pending_item | read | Ler as pendências | rotas de pendência |
| `pending_item:write` | pending_item | write | Abrir lote de pendências, no escopo de custódia | `POST .../pending-items` + `assertCanCreateOrReview` |
| `pending_item:review` | pending_item | review | Revisar e validar os itens de um lote, no escopo de custódia | `PATCH .../pending-items/review` + `assertCanCreateOrReview` |
| `internal_note:read` | internal_note | read | Ler as notas internas e a linha do tempo | `GET .../internal-notes` |
| `internal_note:write` | internal_note | write | Escrever notas internas | `POST .../internal-notes` |
| `audit:read` | audit | read | Ler a trilha de auditoria | `GET /audit-history` + leitura escopada |
| `assignee_directory:read` | assignee_directory | read | Ler a lista de usuários ativos que podem receber solicitações | `GET /users/analysts` |
| `user:read` | user | read | Ler usuários | `GET /users/...` |
| `user:manage` | user | manage | Criar, editar, ativar e resetar senha de usuários | `requireRole(Administrador)` em `/users` + `assertRoleIsManageable` |
| `portal_config:read` | portal_config | read | Ler a configuração do portal | `GET /portal-config` |
| `portal_config:manage` | portal_config | manage | Alterar a configuração do portal | `PATCH /portal-config/*` |
| `form:read` | form | read | Ler a definição do formulário | — (novo) |
| `form:manage` | form | manage | Alterar a definição do formulário | — (novo) |

São 26 chaves, em oito verbos: `read`, `write`, `assign`, `status_change`, `status_override`, `export`, `review` e `manage`.

Onze já constavam da matriz do [ADR-0006](./adr/0006-static-profile-authorization.md) — `request:read`, `request:write`, `request:assign`, `triage:write`, `mapping:write`, `prioritization:write`, `pending_item:review`, `internal_note:write`, `audit:read`, `user:manage` e `portal_config:manage` — e as outras quinze cobrem o que o legado e o frontend já gateavam sem uma chave ([ADR-0014](./adr/0014-permission-key-is-the-contract.md), [ADR-0025](./adr/0025-authorization-capability-scope.md)).

**Escopo.** A chave é `none` (global) ou `owner` (vale apenas sobre a solicitação sob custódia do ator). São `owner`: `request:read`, `request:write`, `request:assign`, `request:status_change`, `queue:read`, `queue:export`, `triage:read`, `triage:write`, `mapping:read`, `mapping:write`, `prioritization:write`, `pending_item:read`, `pending_item:write`, `pending_item:review`, `internal_note:read`, `internal_note:write` e `audit:read`. As demais são `none`. A matriz da § 23.1 marca com `*` a chave `owner` atribuída em `own`; as chaves `owner` em `all` aparecem sem `*`. `prioritization:write` é `owner` para a avaliação; a leitura dos critérios que ela inclui é global. `request:status_override` é `none` porque libera o alvo protegido; o escopo de qual solicitação continua em `request:status_change`.

O catálogo é a **lista de chaves** que a tabela `permissions` recebe. O mapeamento perfil → chave é a matriz em código (Apêndice B § 23.1) e não é derivável do catálogo: ela acrescenta o escopo de custódia, que é regra de serviço e não de permissão. O modelo alvo — escopo por atribuição, perfis customizados e configuração do portal separada — está no Apêndice C (§ 24).

### 23.1 A matriz por perfil

| Perfil | Chaves |
| --- | --- |
| **Solicitante** | Nenhuma. O que ele faz é abrir e acompanhar a própria solicitação — escopo de posse, não permissão |
| **Analista** | `queue:read`\*, `request:read`\*, `request:write`\*, `request:assign`\*, `request:status_change`\*, `triage:read`\*, `triage:write`\*, `mapping:read`\*, `mapping:write`\*, `prioritization:write`\*, `pending_item:read`\*, `pending_item:write`\*, `pending_item:review`\*, `internal_note:read`\*, `internal_note:write`\*, `audit:read`\*, `assignee_directory:read` |
| **Gestor** | `queue:read`, `queue:export`, `request:read`, `reports:read`, `triage:read`, `mapping:read`, `pending_item:read`, `internal_note:read`, `internal_note:write`, `audit:read`, `assignee_directory:read` |
| **Administrador** | Todas, com o escopo de gestão de contas de § 7.5: `user:manage` não alcança Administrador nem Admin Root, e não promove a eles. É regra de serviço, não uma chave diferente |
| **Admin Root** | Todas, com o escopo de § 7.5: gerencia Administradores, não atribui Admin Root e não altera o próprio perfil, status ou senha pelas rotas administrativas |

\* A chave é `owner` e está atribuída em `own`: vale **apenas** sobre a solicitação sob custódia do usuário. A custódia é `requests.responsible_id`; para `mapping:read` e `mapping:write`, o `mappings.responsible_id` do mapeamento corrente também conta. Cada leitura tem a sua porta: `request:read` é a solicitação; `triage:read`, `mapping:read`, `pending_item:read`, `internal_note:read` e `audit:read` são as dos seus domínios, todas no mesmo escopo. `queue:read` e `queue:export` são a própria worklist e as métricas sobre ela. O Gestor, o Administrador e o Admin Root leem em `all`. `assignee_directory:read` é global: é o diretório de quem pode receber solicitações, não a leitura de usuários.

**Responder é posse, não permissão:** só a própria solicitação e item `requested`; `pending_item:write` e `pending_item:review` são custódia.

**O Gestor é somente-leitura, exceto a nota interna** ([ADR-0017](./adr/0017-gestor-is-read-only.md)). O Gestor não tem `portal_config:read`: a leitura administrativa da configuração é do Administrador e do Admin Root.

### 23.2 O que o RBAC configurável vai semear

O alvo são as tabelas `permissions` e `profile_permissions` descritas no Apêndice C § 24.3: a chave é a chave natural/contratual do domínio, e `profile_permissions` guarda o `scope` (`own`/`all`) quando a chave é `owner`. A porta atual já expõe `scopeOf`, implementado pela matriz em código. Quando o RBAC configurável chegar, a matriz vira um adapter de banco e `profile_permissions` passa a ser a fonte; a interface não muda. `GET /auth/me` já devolve `role` e, como campo aditivo, `permissions`; o frontend passa a consumi-lo na release coordenada. O Apêndice B continua sendo o contrato até essa release.

---

## 24. Apêndice C — Modelo alvo de RBAC configurável

> **Não é o contrato vigente.** O Apêndice B continua sendo a fonte da verdade até o frontend consumir chaves. Este apêndice é a preparação do RBAC configurável: descreve o alvo, não uma entrega.

### 24.1 Os três eixos

- **Capability:** a chave `recurso:ação` do Apêndice B. Uma chave nova exige código; o cliente não inventa capabilities.
- **Escopo:** `none` (global) ou `owner` (a linha precisa estar sob custódia). Quando é `owner`, a atribuição escolhe `own` ou `all`.
- **Atribuibilidade:** a propriedade do perfil cujos usuários podem ser escolhidos como Responsável. É explícita e validada pelas chaves de trabalho.

`request:assign` é capability, não atribuibilidade. `triage:write` não implica `request:assign`; um perfil pode triar sem transferir, ou distribuir sem triar.

### 24.2 Escopo

```text
permissions.scope_kind   none | owner
profile_permissions.scope  null | own | all
```

Restrições:

- `scope_kind = none` → `scope IS NULL`;
- `scope_kind = owner` → `scope IN ('own', 'all')`.

São `owner` exatamente as chaves listadas como tal na § 23: as de solicitação que agem sobre uma linha, fila, triagem, mapeamento, priorização, pendência, nota interna e auditoria. São `none` as demais, incluindo `request:status_override`, `assignee_directory:read`, `reports:read`, configuração, usuário, perfil e formulário.

O escopo `own` é resolvido contra `requests.responsible_id`; para as chaves de mapeamento, o `mappings.responsible_id` do mapeamento corrente também conta. Para `queue:read` e `queue:export`, a worklist é `requests.responsible_id = actor.id`; o responsável do mapeamento não a amplia. `request:read` é a porta da solicitação; triagem, mapeamento, pendências, notas e auditoria têm portas próprias, no mesmo escopo.

### 24.3 Tabelas alvo

| Tabela | Colunas |
| --- | --- |
| `permissions` | `id` (PK), `key` (UNIQUE), `resource`, `action`, `description`, `scope_kind` |
| `profiles` | `id`, `name`, `is_active`, `is_system`, `is_assignable_triage`, `is_assignable_mapping`, timestamps |
| `profile_permissions` | `profile_id`, `permission_id`, `scope` — PK composta |

`is_system = true` nos cinco perfis semeados: eles não são excluídos pela API. Perfis customizados são `false`.

`audit_entries.actor_profile_at_creation` deixa de ser `ck_` fechado nos cinco nomes: com perfil customizado, a trilha guarda o nome do perfil (ou um `profile_id` snapshot) e a constraint aceita o perfil vigente. Sem isso, um perfil novo quebra a auditoria.

### 24.4 Porta de autorização

```ts
interface AuthorizationService {
  can(actor: Actor, permission: Permission): boolean;
  assert(actor: Actor, permission: Permission): void;
  scopeOf(actor: Actor, permission: Permission): "own" | "all";
}
```

O serviço resolve a capability e o escopo separadamente. `scopeOf` só é chamado depois de `can`/`assert`; a chave ausente não tem escopo. Para chaves `none`, `scopeOf` devolve `all` e não há custódia:

```ts
authorization.assert(actor, "triage:write");
if (authorization.scopeOf(actor, "triage:write") === "own") {
  assertCustody(request.responsibleId, actor.userId);
}
```

A matriz em código é substituída por um adapter de banco. A diferença em relação à ADR-0006 é que o adapter agora também responde ao escopo; a costura é a mesma.

### 24.5 Atribuibilidade

O predicado é o da § 7.6. No alvo, o editor de perfis valida o predicado no servidor e mostra a flag de pool, que continua explícita.

- `Administrador` e `Admin Root`: flags em `false`; o Administrador tem as chaves, mas não entra no pool por acidente.
- `Analista`: `is_assignable_triage = true` e `is_assignable_mapping = true`.
- O serviço de atribuição recusa alvo que não satisfaça o predicado, mesmo que a flag esteja ligada.
- Ao editar um perfil que perdeu a chave de escrita, a edição é bloqueada ou exige desligar a flag e realocar as solicitações. Não se cria Responsável que não pode agir.

### 24.6 Claim (futuro)

`request:claim` é uma capability `none`: o Analista toma uma solicitação **sem responsável** e vira o `responsible_id`. A regra é `responsible_id IS NULL`; não serve para tomar solicitação de outro.

A lista de órfãs não é a `queue:read` custodial do Analista. Ela exige uma leitura própria (`unassigned_queue:read`, `none`), que lista solicitações ativas sem responsável. Sem claim, a solicitação órfã é atribuída por quem tem `request:assign` em `all`.

### 24.7 Configuração do portal separada

O contrato vigente tem uma chave para toda a configuração. O alvo separa o que o cliente quer delegar:

| Vigente | Alvo |
| --- | --- |
| `portal_config:read` | `theme:read`, `status:read`, `category:read`, `portal_setting:read`, `prioritization_config:read` |
| `portal_config:manage` | `theme:manage`, `status:manage`, `category:manage`, `portal_setting:manage`, `prioritization_config:manage` |

Endpoints:

| Rota | Chave |
| --- | --- |
| `PATCH /portal-config/theme`, `/assets` | `theme:manage` |
| `PATCH /portal-config/statuses` | `status:manage` |
| `PATCH /portal-config/categories` | `category:manage` |
| `PATCH /portal-config/access`, `/identity` | `portal_setting:manage` |
| `PATCH /portal-config/prioritization-weights` | `prioritization_config:manage` |

A leitura administrativa passa a ser por seção: a resposta devolve apenas as seções que o ator pode ler, ou cada seção tem a sua rota. O RBAC configurável substitui `portal_config:*` por essas chaves; não mantém as duas formas.

Um perfil **Designer de Tema** fica com `theme:read` e `theme:manage`. Não vê status, categoria, formulário, usuário ou solicitação.

### 24.8 Gestão de perfis

| Chave | O que permite |
| --- | --- |
| `profile:read` | Ler perfis e as chaves de cada um |
| `profile:manage` | Criar, editar e desativar perfis e atribuir chaves |

Guardas:

- só o Admin Root recebe `profile:manage` no seed;
- um perfil não concede uma chave que não possui;
- perfis `is_system` não são excluídos;
- perfil com usuários não é excluído sem realocação;
- o último Admin Root ativo não é desativado nem trocado;
- toda alteração de perfil é auditada em `profile`, com o antes e o depois;
- dependências de chave são validadas no servidor: `*:manage` exige `*:read`; `request:status_override` exige `request:status_change`; atribuibilidade exige as chaves de trabalho.

### 24.9 Frontend consumidor

`GET /auth/me` devolve o perfil e a lista efetiva:

```json
{
  "role": "Designer de Tema",
  "permissions": [
    { "key": "theme:read", "scope": "all" },
    { "key": "theme:manage", "scope": "all" }
  ]
}
```

No JSON, chaves `none` saem com `scope: "all"`; no banco, `scope` é nulo. A API normaliza.

O frontend deixa de ramificar por nome de perfil: abas, botões e guardas de rota usam `has(key)` e o escopo. O `role` permanece para exibição e compatibilidade. A troca é uma release coordenada, com a tabela da § 14.5.

### 24.10 Migração do Apêndice B para o Apêndice C

1. O frontend passa a aceitar e usar `permissions` de `/auth/me`.
2. A matriz em código é semeada em `permissions`/`profile_permissions`.
3. O adapter de banco substitui a matriz estática atrás da mesma porta.
4. A configuração do portal é separada e `portal_config:*` é retirada.
5. `profile:read`/`profile:manage` e o editor de perfis entram.
6. O claim entra, se o produto decidir que o Analista pode tomar órfãs.

Até o passo 3, o Apêndice B é o contrato. O Apêndice C não autoriza uma implementação parcial.

### 24.11 Exemplos

| Perfil | Chaves | Observação |
| --- | --- | --- |
| **Designer de Tema** | `theme:read`, `theme:manage` | Global; não vê o resto da configuração |
| **Coordenador** | `queue:read` all, `request:read` all, `triage:read`/`write` all, `request:status_change` all, `request:status_override`, `request:assign` all, `assignee_directory:read` | Pode triar e redistribuir qualquer solicitação; `is_assignable_triage` pode ser `true` |
| **Despachante** | `queue:read` all, `request:read` all, `request:assign` all, `assignee_directory:read` | Distribui, não tria; não é atribuível |
| **Auditor** | `queue:read` all, `request:read` all, `audit:read` all, `reports:read` | Lê tudo, não escreve |

### 24.12 Invariantes que não viram chave

Continuam no código as invariantes da ADR-0025 e das § 7.5 e § 8.1: status inativo, solicitação terminal, último Admin Root, autoedição administrativa, escalação de perfil, matriz de contas e justificativa de status. Nenhuma delas vira chave.

---

## 25. Apêndice D — Seed de Referência

O **seed de referência** é o conjunto mínimo para o portal funcionar: os perfis, a conta `Admin Root`, a configuração inicial do portal, as categorias, os status do ciclo, os critérios e as faixas de prioridade. Ele não contém dados de demonstração — solicitações, usuários fictícios, notas e cenários de dashboard ficam em um seed separado e não fazem parte deste apêndice. O runbook de ordem e idempotência está em [`db/04-seeds.md`](./db/04-seeds.md).

**Regra de idempotência.** Todo seed é **create-if-absent pela chave natural**: se a linha já existe, ela não é alterada. A configuração é editável no lugar ([ADR-0019](./adr/0019-form-is-editable-in-place.md)), e reexecutar o seed não pode desfazer uma edição administrativa. Mudança de valor em linha existente é migration, não seed. Nenhum seed usa id fixo; a identidade é a chave natural e o `id` é o UUID gerado pela aplicação.

### 25.1 Ordem e chaves naturais

| # | Grupo | Tabela | Chave natural |
| --- | --- | --- | --- |
| 1 | Perfis | `profiles` | `name` |
| 2 | Admin Root | `users` | `email` |
| 3 | Credencial do Admin Root | `credentials` | `user_id` |
| 4 | Formulário | `forms` | `key` |
| 5 | Blocos | `form_blocks` | (`form_id`, `key`) |
| 6 | Campos | `form_fields` | (`form_id`, `key`) |
| 7 | Aparências | `themes` | `name` |
| 8 | Configuração do portal | `portal_settings` | singleton (uma linha; insert-if-absent) |
| 9 | Categorias | `categories` | `normalized_name` |
| 10 | Status | `statuses` | `key` |
| 11 | Critérios | `criteria` | `code` |
| 12 | Faixas de prioridade | `priorities` | `level` |

`code_counters` não é semeado: o contador começa vazio e a primeira emissão consome o valor 1. `pending_batches` e `pending_items` também não são semeados: dependem de uma solicitação. `permissions` e `profile_permissions` só entram quando o RBAC configurável chegar ([§ 23.2](#232-o-que-o-rbac-configurável-vai-semear)).

### 25.2 `profiles`

| `name` | `is_active` | `is_assignable_triage` | `is_assignable_mapping` |
| --- | --- | --- | --- |
| `Solicitante` | `true` | `false` | `false` |
| `Analista` | `true` | `true` | `true` |
| `Gestor` | `true` | `false` | `false` |
| `Administrador` | `true` | `false` | `false` |
| `Admin Root` | `true` | `false` | `false` |

Os nomes são exatamente os do catálogo de permissões em código ([ADR-0006](./adr/0006-static-profile-authorization.md)); divergência entre seed e matriz é bug de autorização. As flags de atribuibilidade são explícitas: o Analista nasce atribuível nos dois pools; os demais perfis não, mesmo quando têm as chaves ([§ 7.6](#76-atribuibilidade)).

### 25.3 Admin Root

| Campo | Valor |
| --- | --- |
| `users.name` | `Admin Root` |
| `users.email` | `ADMIN_ROOT_EMAIL` — normalizado (`trim().toLowerCase()`) e validado |
| `users.profile_id` | `profiles.name = 'Admin Root'` |
| `users.is_active` | `true` |
| `credentials.password_hash` | hash de `ADMIN_ROOT_PASSWORD`; **nunca em texto** |
| `credentials.must_change_password` | `true` |

| Variável | Regra |
| --- | --- |
| `ADMIN_ROOT_EMAIL` | Obrigatória; e-mail válido, ≤ 254, único. Se já pertence a outro perfil, o seed falha em vez de promover. |
| `ADMIN_ROOT_PASSWORD` | Obrigatória na criação; ≥ 14 caracteres; usada só quando a conta não existe; nunca logada nem impressa. |

O seed lê as duas variáveis do ambiente e falha antes de escrever se faltar alguma. A conta e a credencial nascem na mesma transação; se o `Admin Root` já existe, a senha **não** é reescrita (rotação é a rota de troca, não o seed). As variáveis são **seed-only**: não entram no `EnvironmentSchema` do boot ([02-Architecture § 16](./02-Architecture.md#16-configuração)). `must_change_password = true` força a troca no primeiro acesso.

### 25.4 `portal_settings` e `themes`

`portal_settings` é o singleton:

| Coluna | Valor |
| --- | --- |
| `solicitation_mode` | `PUBLIC` |
| `platform_name` | `MAAT` |
| `protocol_mask` | `MAAT` |
| `light_theme_id` | `themes.name = 'Claro'` |
| `dark_theme_id` | `themes.name = 'Escuro'` |
| `updated_by_user_id` | `NULL` |

As duas Aparências nascem com os tokens do design system atual. Os assets ficam **nulos**: o contrato permite que o frontend aplique os defaults locais por token, e o seed não copia arquivos.

| Token | `Claro` | `Escuro` |
| --- | --- | --- |
| `background` | `#f0f4f8` | `#0b0f1a` |
| `surface` | `#fafafa` | `#141b2e` |
| `border` | `#e5e7eb` | `#2a3346` |
| `text_primary` | `#3c3e47` | `#e5e7eb` |
| `text_secondary` | `#757682` | `#9aa3b2` |
| `heading` | `#00236f` | `#4c7dff` |
| `rich_black` | `#0f1a2a` | `#0f1a2a` |
| `primary` | `#00236f` | `#4c7dff` |
| `secondary` | `#0058be` | `#5b9bff` |
| `tint` | `#d6e7fb` | `#1b2942` |
| `on_primary` | `#ffffff` | `#0b0f1a` |
| `on_dark` | `#ffffff` | `#ffffff` |
| `on_gradient` | `#ffffff` | `#ffffff` |
| `gradient_from` | `#002068` | `#002068` |
| `gradient_to` | `#003399` | `#003399` |
| `gradient_angle` | `143` | `143` |
| `status_error_color` | `#ef4444` | `#f87171` |
| `status_error_background` | `#ef444410` | `#4c0f0a` |
| `status_error_background_locked` | `true` | `true` |
| `status_success_color` | `#10b981` | `#4ade80` |
| `status_success_background` | `#10b98110` | `#0f2e1d` |
| `status_success_background_locked` | `true` | `true` |
| `status_info_color` | `#0058be` | `#5b9bff` |
| `status_info_background` | `#0058be10` | `#1b2942` |
| `status_info_background_locked` | `true` | `true` |
| `status_warning_color` | `#956006` | `#fbbf24` |
| `status_warning_background` | `#f59e0b10` | `#4a2e0f` |
| `status_warning_background_locked` | `true` | `true` |
| `status_neutral_color` | `#4b5563` | `#9aa3b2` |
| `status_neutral_background` | `#e5e7eb` | `#2a3346` |
| `status_neutral_background_locked` | `true` | `true` |
| `logo_url`, `avatar_url`, `login_image_url`, `favicon_url` | `NULL` | `NULL` |
| `logo_use_primary_color` | `true` | `true` |
| `is_active` | `true` | `true` |

`logo_use_primary_color = true` preserva o contrato atual do frontend; o default da coluna é `false`, e o seed o sobrescreve na criação. As Aparências são nomeadas porque `themes.name` é único e é o nome que o solicitante vê.

### 25.5 `categories`

Todas as categorias são ativas e apontam para o formulário `solicitacao` (`categories.form_id` = id de `forms` com `key = 'solicitacao'`). `normalized_name` é `trim().toLowerCase()` do nome.

| `display_order` | `name` | `normalized_name` | `description` |
| --- | --- | --- | --- |
| 1 | `Automação` | `automação` | Automação de atividades manuais repetitivas |
| 2 | `Melhoria de processo` | `melhoria de processo` | Aprimoramento de fluxos e rotinas existentes |
| 3 | `Indicador` | `indicador` | Criação ou ajuste de indicadores e metas |
| 4 | `Dashboard ou relatório` | `dashboard ou relatório` | Painéis, relatórios e consultas gerenciais |
| 5 | `Análise de dados` | `análise de dados` | Estudos, cruzamentos e tratamento de dados |
| 6 | `Padronização` | `padronização` | Padronização de procedimentos, modelos e documentos |
| 7 | `Revisão de processo` | `revisão de processo` | Revisão e redesenho de processos existentes |
| 8 | `Apoio técnico` | `apoio técnico` | Suporte técnico especializado às áreas |
| 9 | `Estudo de viabilidade` | `estudo de viabilidade` | Avaliação de viabilidade técnica, operacional e de custo |
| 10 | `Outros` | `outros` | Demandas que não se enquadram nas demais categorias |

### 25.6 `statuses`

Os 17 status do ciclo de referência. As chaves são do código ([ADR-0021](./adr/0021-statuses-have-a-stable-key.md)); o nome é o rótulo que o Administrador edita. `is_core` são os sete status protegidos; `is_terminal` são os dois que encerram a solicitação. `is_restricted` significa que o status exige `request:status_override`; `priorizado` continua sendo o único restrito.

| Ordem | `key` | `name` | `is_core` | `is_public` | `is_terminal` | `is_restricted` | `triage_mode` | `mapping_mode` | `tone` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `solicitacao_enviada` | Solicitação enviada | `true` | `true` | `false` | `false` | `none` | `none` | `neutral` |
| 2 | `aguardando_triagem` | Aguardando triagem | `false` | `true` | `false` | `false` | `none` | `none` | `info` |
| 3 | `em_triagem` | Em triagem | `true` | `true` | `false` | `false` | `free` | `none` | `info` |
| 4 | `pendente_de_informacoes` | Pendente de informações | `true` | `true` | `false` | `false` | `free` | `free` | `warning` |
| 5 | `aguardando_mapeamento` | Aguardando mapeamento | `false` | `true` | `false` | `false` | `conclusion_only` | `none` | `info` |
| 6 | `mapeamento_agendado` | Mapeamento agendado | `true` | `false` | `false` | `false` | `none` | `conclusion_only` | `info` |
| 7 | `em_mapeamento` | Em mapeamento | `true` | `true` | `false` | `false` | `none` | `free` | `info` |
| 8 | `em_analise_de_viabilidade` | Em análise de viabilidade | `false` | `false` | `false` | `false` | `free` | `free` | `info` |
| 9 | `elegivel` | Elegível | `false` | `false` | `false` | `false` | `conclusion_only` | `conclusion_only` | `success` |
| 10 | `nao_elegivel` | Não elegível | `false` | `false` | `false` | `false` | `conclusion_only` | `conclusion_only` | `error` |
| 11 | `priorizado` | Priorizado | `false` | `false` | `false` | `true` | `none` | `none` | `warning` |
| 12 | `backlog` | Backlog | `false` | `false` | `false` | `false` | `conclusion_only` | `conclusion_only` | `neutral` |
| 13 | `direcionada_para_outra_area` | Direcionado para outra área | `false` | `false` | `false` | `false` | `conclusion_only` | `conclusion_only` | `neutral` |
| 14 | `em_desenvolvimento` | Em desenvolvimento | `false` | `false` | `false` | `false` | `free` | `none` | `info` |
| 15 | `em_homologacao` | Em homologação | `false` | `false` | `false` | `false` | `free` | `none` | `info` |
| 16 | `concluido` | Concluído | `true` | `true` | `true` | `false` | `conclusion_only` | `conclusion_only` | `success` |
| 17 | `cancelado` | Cancelado | `true` | `true` | `true` | `false` | `conclusion_only` | `conclusion_only` | `error` |

A decisão do motor v4 é explícita: **só `concluido` e `cancelado` são terminais**. `nao_elegivel` e `direcionada_para_outra_area` são desfechos não terminais; a solicitação continua no fluxo e só encerra (`closed_at`) quando chega a um status terminal. O seed original do legado marcava `nao_elegivel` como final; o v4 o substituiu.

### 25.7 `criteria`

Os dez critérios do cálculo. Todos ativos, com o mesmo peso 10 — o peso é uma razão relativa, então pesos iguais não alteram o resultado. O código é a chave do contrato (`operationalImpact`, …): o modelo novo elimina a ponte português ↔ inglês que o legado mantinha em `CRITERION_KEY_TO_ID`.

| `display_order` | `code` | `name` | `weight` | `is_active` |
| --- | --- | --- | --- | --- |
| 1 | `operationalImpact` | Impacto Operacional | 10 | `true` |
| 2 | `operationalRisk` | Risco Operacional | 10 | `true` |
| 3 | `urgency` | Urgência | 10 | `true` |
| 4 | `volumetry` | Volumetria | 10 | `true` |
| 5 | `manualEffort` | Esforço Manual | 10 | `true` |
| 6 | `clientImpact` | Impacto no Cliente | 10 | `true` |
| 7 | `regulatoryDeadline` | Prazo Regulatório | 10 | `true` |
| 8 | `affectedAreas` | Áreas Impactadas | 10 | `true` |
| 9 | `strategicAlignment` | Alinhamento Estratégico | 10 | `true` |
| 10 | `estimatedComplexity` | Complexidade Estimada | 10 | `true` |

### 25.8 `priorities`

As quatro faixas de criticidade. As faixas são contíguas na precisão de um decimal: 10,0–20,0, 20,1–30,0, 30,1–40,0 e 40,1–50,0.

| `level` | `min_score` | `max_score` | `default_weight` | `color_code` | `description` |
| --- | --- | --- | --- | --- | --- |
| `Baixa` | 10.0 | 20.0 | 0.25 | `#90EE90` | Baixa urgência, impacto reduzido |
| `Média` | 20.1 | 30.0 | 0.50 | `#FFD700` | Média urgência, impacto moderado |
| `Alta` | 30.1 | 40.0 | 0.75 | `#FF8C00` | Alta urgência, impacto significativo |
| `Crítica` | 40.1 | 50.0 | 1.00 | `#FF0000` | Crítica, impacto crítico no negócio |

`default_weight` é o peso de referência da faixa e **nenhum cálculo o usa** — o score sai das notas e dos pesos dos critérios ([§ 12.2](#122-priorities)).

### 25.9 `forms`

| Campo | Valor |
| --- | --- |
| `key` | `solicitacao` |
| `name` | `Solicitação` |
| `description` | Formulário de abertura de solicitação |
| `is_active` | `true` |

Os quatro blocos:

| `display_order` | `key` | `title` |
| --- | --- | --- |
| 1 | `requester` | Identificação |
| 2 | `demand` | Demanda |
| 3 | `operational` | Operacional |
| 4 | `complementary` | Complementar |

Os **32 campos** são os do [Apêndice A](#22-apêndice-a--o-seed-do-formulário): seis em `requester`, sete em `demand`, quatorze em `operational` e cinco em `complementary`. No seed, `display_order` é a posição do campo dentro do bloco, `help_text` é nulo, `is_active` é `true`, e `options`, `max_length`, `min_value`, `max_value`, `must_be_future` e `required` seguem o Apêndice A. A categoria **não** é campo: ela é a classificação em `requests.category_id`; no wire vigente ela viaja em `demand.category`.

`form_answers.value_lookup` é uma projeção derivada da resposta de e-mail, mantida na escrita e na correção; não é uma coluna semeada.

**Regras de negócio**

*Preservadas do legado*

- Os valores de referência são os do legado: perfis, dez categorias, dezessete status, dez critérios, quatro faixas, os quatro blocos e os 32 campos.
- A conta `Admin Root` existe apenas no seed e nunca é auto-registrada.

*Acrescentadas pelo modelo novo*

- O seed é create-if-absent por chave natural, e não upsert: a configuração é editável no lugar.
- O seed não usa ids fixos; o id é UUID gerado pela aplicação.
- `criteria.code` usa a chave do contrato (`operationalImpact`), sem a ponte português ↔ inglês do legado.
- `profiles.is_assignable_triage` e `is_assignable_mapping` são semeados: só o Analista entra nos pools.
- `pending_batches` e `pending_items` não são semeados; o seed de referência não cria pendência.
- As Aparências são nomeadas e os assets podem começar nulos; o frontend aplica os defaults locais.
- Dados de demonstração não fazem parte do seed de referência.
