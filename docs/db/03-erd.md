# Modelo de Dados — Diagramas de Entidade

> **Derivado, não normativo.** Os diagramas são de orientação: mostram entidades e relações, não cada detalhe de constraint. A definição completa está em [`../03-Data-Model.md`](../03-Data-Model.md); o dicionário de consulta em [`02-reference.md`](./02-reference.md); a versão para ferramenta em [`schema.dbml`](./schema.dbml).

**Legenda.** `PK` chave primária · `FK` chave estrangeira · `UK` unicidade. A cardinalidade segue a nulabilidade e a unicidade da FK: `||` exatamente um, `|o` zero ou um, `o{` zero ou muitos, `o|` zero ou um.

## Mapa completo

```mermaid
erDiagram
    PROFILES ||--o{ USERS : "profile_id"
    USERS ||--o| ANALYST_DETAILS : "user_id"
    USERS ||--|| CREDENTIALS : "user_id"
    USERS ||--o{ ANALYST_DETAIL_CATEGORIES : "user_id"
    CATEGORIES ||--o{ ANALYST_DETAIL_CATEGORIES : "category_id"
    FORMS ||--o{ FORM_BLOCKS : "form_id"
    FORMS ||--o{ FORM_FIELDS : "form_id"
    FORM_BLOCKS ||--o{ FORM_FIELDS : "block_id"
    FORMS |o--o{ CATEGORIES : "form_id"
    FORMS ||--o{ REQUESTS : "form_id"
    STATUSES ||--o{ REQUESTS : "status_id"
    STATUSES |o--o{ REQUESTS : "last_public_status_id"
    CATEGORIES ||--o{ REQUESTS : "category_id"
    USERS |o--o{ REQUESTS : "requester_user_id"
    USERS |o--o{ REQUESTS : "responsible_id"
    USERS |o--o{ REQUESTS : "created_by_user_id"
    USERS |o--o{ REQUESTS : "updated_by_user_id"
    REQUESTS ||--o{ FORM_ANSWERS : "request_id"
    FORM_FIELDS ||--o{ FORM_ANSWERS : "field_id"
    REQUESTS ||--o{ ATTACHMENTS : "request_id"
    PENDING_ITEMS |o--o{ ATTACHMENTS : "pending_item_id"
    USERS |o--o{ ATTACHMENTS : "uploaded_by_user_id"
    REQUESTS ||--o{ REQUEST_TIME_PREFERENCES : "request_id"
    REQUESTS ||--o{ TRIAGES : "request_id"
    STATUSES ||--o{ TRIAGES : "exit_status_id"
    CATEGORIES |o--o{ TRIAGES : "new_category_id"
    USERS |o--o{ TRIAGES : "assignee_user_id"
    USERS ||--o{ TRIAGES : "author_user_id"
    REQUESTS ||--o{ MAPPINGS : "request_id"
    USERS |o--o{ MAPPINGS : "responsible_id"
    STATUSES |o--o{ MAPPINGS : "target_status_id"
    USERS ||--o{ MAPPINGS : "created_by_user_id"
    USERS |o--o{ MAPPINGS : "updated_by_user_id"
    MAPPINGS ||--o{ MAPPING_PARTICIPANTS : "mapping_id"
    USERS |o--o{ MAPPING_PARTICIPANTS : "user_id"
    REQUESTS ||--o| PRIORITIZATION_EVALUATIONS : "request_id"
    PRIORITIES ||--o{ PRIORITIZATION_EVALUATIONS : "priority_id"
    USERS ||--o{ PRIORITIZATION_EVALUATIONS : "calculated_by_user_id"
    REQUESTS ||--o{ PENDING_BATCHES : "request_id"
    USERS ||--o{ PENDING_BATCHES : "created_by_user_id"
    PENDING_BATCHES ||--o{ PENDING_ITEMS : "batch_id"
    FORM_FIELDS |o--o{ PENDING_ITEMS : "form_field_id"
    USERS |o--o{ PENDING_ITEMS : "validated_by_user_id"
    REQUESTS ||--o{ INTERNAL_NOTES : "request_id"
    USERS ||--o{ INTERNAL_NOTES : "author_user_id"
    REQUESTS ||--o{ INTERNAL_NOTE_READ_STATES : "request_id"
    USERS ||--o{ INTERNAL_NOTE_READ_STATES : "user_id"
    INTERNAL_NOTES ||--o{ INTERNAL_NOTE_READ_STATES : "FK composta"
    REQUESTS |o--o{ AUDIT_ENTRIES : "request_id"
    USERS |o--o{ AUDIT_ENTRIES : "actor_user_id"
    REQUESTS |o--o{ ATTEMPTS : "request_id"
    USERS |o--o{ ATTEMPTS : "actor_user_id"
    THEMES |o--o| PORTAL_SETTINGS : "light_theme_id"
    THEMES |o--o| PORTAL_SETTINGS : "dark_theme_id"
    USERS |o--o| PORTAL_SETTINGS : "updated_by_user_id"
  CRITERIA {
    varchar code PK
  }
  CODE_COUNTERS {
    varchar name PK
  }
```

`criteria` não tem FK: as notas do cálculo vivem no json de `prioritization_evaluations`. `code_counters` é infraestrutura, sem relação. `audit_entries.entity_id`, `attempts.entity_id` e `attempts.correlation_id` não são FKs: os dois primeiros são polimórficos; o último é a correlação HTTP.

## `auth` — login, sessão e credencial

```mermaid
erDiagram
  CREDENTIALS {
    uuid id PK
    uuid user_id FK
    text password_hash
    timestamp password_changed_at
    boolean must_change_password
    timestamp created_at
  }
    USERS ||--|| CREDENTIALS : "user_id"
```

## `users` — perfis, contas e extensão do analista

```mermaid
erDiagram
  PROFILES {
    uuid id PK
    varchar name UK
    boolean is_active
    boolean is_assignable_triage
    boolean is_assignable_mapping
    timestamp created_at
    timestamp updated_at
  }
  USERS {
    uuid id PK
    text name
    varchar email UK
    uuid profile_id FK
    text area
    text department
    text manager_name
    text additional_contact
    boolean is_active
    text avatar_url
    timestamp created_at
    timestamp updated_at
  }
  ANALYST_DETAILS {
    uuid id PK
    uuid user_id FK
    text job_title
    text specialties
    boolean is_available
    integer capacity
    text notes
    timestamp created_at
    timestamp updated_at
  }
  ANALYST_DETAIL_CATEGORIES {
    uuid id PK
    uuid user_id FK
    uuid category_id FK
    timestamp created_at
  }
    PROFILES ||--o{ USERS : "profile_id"
    USERS ||--o| ANALYST_DETAILS : "user_id"
    USERS ||--|| CREDENTIALS : "user_id"
    USERS ||--o{ ANALYST_DETAIL_CATEGORIES : "user_id"
    CATEGORIES ||--o{ ANALYST_DETAIL_CATEGORIES : "category_id"
    USERS |o--o{ REQUESTS : "requester_user_id"
    USERS |o--o{ REQUESTS : "responsible_id"
    USERS |o--o{ REQUESTS : "created_by_user_id"
    USERS |o--o{ REQUESTS : "updated_by_user_id"
    USERS |o--o{ ATTACHMENTS : "uploaded_by_user_id"
    USERS |o--o{ TRIAGES : "assignee_user_id"
    USERS ||--o{ TRIAGES : "author_user_id"
    USERS |o--o{ MAPPINGS : "responsible_id"
    USERS ||--o{ MAPPINGS : "created_by_user_id"
    USERS |o--o{ MAPPINGS : "updated_by_user_id"
    USERS |o--o{ MAPPING_PARTICIPANTS : "user_id"
    USERS ||--o{ PRIORITIZATION_EVALUATIONS : "calculated_by_user_id"
    USERS ||--o{ PENDING_BATCHES : "created_by_user_id"
    USERS |o--o{ PENDING_ITEMS : "validated_by_user_id"
    USERS ||--o{ INTERNAL_NOTES : "author_user_id"
    USERS ||--o{ INTERNAL_NOTE_READ_STATES : "user_id"
    USERS |o--o{ AUDIT_ENTRIES : "actor_user_id"
    USERS |o--o{ ATTEMPTS : "actor_user_id"
    USERS |o--o| PORTAL_SETTINGS : "updated_by_user_id"
```

## `requests` — ciclo da solicitação e conteúdo

```mermaid
erDiagram
  REQUESTS {
    uuid id PK
    varchar protocol UK
    uuid form_id FK
    uuid requester_user_id FK
    uuid status_id FK
    uuid category_id FK
    uuid last_public_status_id FK
    uuid responsible_id FK
    date estimated_completion
    timestamp meeting_scheduled_for
    text meeting_link
    text last_technical_message
    timestamp last_external_update_at
    timestamp closed_at
    text created_by
    uuid created_by_user_id FK
    uuid updated_by_user_id FK
    timestamp created_at
    timestamp updated_at
  }
  FORM_ANSWERS {
    uuid id PK
    uuid request_id FK
    uuid field_id FK
    text value_text
    varchar value_lookup
    decimal value_number
    date value_date
    boolean value_boolean
    json value_json
    timestamp created_at
    timestamp updated_at
  }
  ATTACHMENTS {
    uuid id PK
    uuid request_id FK
    uuid pending_item_id FK
    text file_name
    text file_path
    text content_type
    integer size_bytes
    boolean is_restricted
    text uploaded_by
    uuid uploaded_by_user_id FK
    timestamp uploaded_at
  }
  REQUEST_TIME_PREFERENCES {
    uuid id PK
    uuid request_id FK
    timestamp scheduled_for
    timestamp created_at
  }
    FORMS ||--o{ REQUESTS : "form_id"
    STATUSES ||--o{ REQUESTS : "status_id"
    STATUSES |o--o{ REQUESTS : "last_public_status_id"
    CATEGORIES ||--o{ REQUESTS : "category_id"
    USERS |o--o{ REQUESTS : "requester_user_id"
    USERS |o--o{ REQUESTS : "responsible_id"
    USERS |o--o{ REQUESTS : "created_by_user_id"
    USERS |o--o{ REQUESTS : "updated_by_user_id"
    REQUESTS ||--o{ FORM_ANSWERS : "request_id"
    FORM_FIELDS ||--o{ FORM_ANSWERS : "field_id"
    REQUESTS ||--o{ ATTACHMENTS : "request_id"
    PENDING_ITEMS |o--o{ ATTACHMENTS : "pending_item_id"
    USERS |o--o{ ATTACHMENTS : "uploaded_by_user_id"
    REQUESTS ||--o{ REQUEST_TIME_PREFERENCES : "request_id"
    REQUESTS ||--o{ TRIAGES : "request_id"
    REQUESTS ||--o{ MAPPINGS : "request_id"
    REQUESTS ||--o| PRIORITIZATION_EVALUATIONS : "request_id"
    REQUESTS ||--o{ PENDING_BATCHES : "request_id"
    REQUESTS ||--o{ INTERNAL_NOTES : "request_id"
    REQUESTS ||--o{ INTERNAL_NOTE_READ_STATES : "request_id"
    REQUESTS |o--o{ AUDIT_ENTRIES : "request_id"
    REQUESTS |o--o{ ATTEMPTS : "request_id"
```

## `triage` — triagem append-only

```mermaid
erDiagram
  TRIAGES {
    uuid id PK
    uuid request_id FK
    boolean is_adherent_to_scope
    text adherent_justification
    boolean is_category_change
    uuid new_category_id FK
    text preliminary_complexity
    text perceived_risks
    text suggested_responsible
    text suggested_responsible_justification
    uuid assignee_user_id FK
    text assignee_name
    text assignee_email
    uuid exit_status_id FK
    text conclusion_justification
    text last_technical_message
    uuid author_user_id FK
    timestamp occurred_at
  }
    REQUESTS ||--o{ TRIAGES : "request_id"
    STATUSES ||--o{ TRIAGES : "exit_status_id"
    CATEGORIES |o--o{ TRIAGES : "new_category_id"
    USERS |o--o{ TRIAGES : "assignee_user_id"
    USERS ||--o{ TRIAGES : "author_user_id"
```

## `mapping` — sessão de mapeamento

```mermaid
erDiagram
  MAPPINGS {
    uuid id PK
    uuid request_id FK
    uuid responsible_id FK
    timestamp scheduled_for
    integer duration_minutes
    text modality
    text meeting_link
    text location
    text notes
    text justification
    text last_technical_message
    uuid target_status_id FK
    boolean is_concluded
    timestamp concluded_at
    uuid created_by_user_id FK
    timestamp created_at
    uuid updated_by_user_id FK
    timestamp updated_at
  }
  MAPPING_PARTICIPANTS {
    uuid id PK
    uuid mapping_id FK
    uuid user_id FK
    text name
    varchar email
    timestamp created_at
  }
    REQUESTS ||--o{ MAPPINGS : "request_id"
    USERS |o--o{ MAPPINGS : "responsible_id"
    STATUSES |o--o{ MAPPINGS : "target_status_id"
    USERS ||--o{ MAPPINGS : "created_by_user_id"
    USERS |o--o{ MAPPINGS : "updated_by_user_id"
    MAPPINGS ||--o{ MAPPING_PARTICIPANTS : "mapping_id"
    USERS |o--o{ MAPPING_PARTICIPANTS : "user_id"
```

## `prioritization` — critérios, faixas e avaliação corrente

```mermaid
erDiagram
  CRITERIA {
    uuid id PK
    varchar code UK
    text name
    integer weight
    boolean is_active
    integer display_order
    timestamp created_at
    timestamp updated_at
  }
  PRIORITIES {
    uuid id PK
    varchar level UK
    decimal min_score
    decimal max_score
    decimal default_weight
    text color_code
    text description
    boolean is_active
    timestamp created_at
    timestamp updated_at
  }
  PRIORITIZATION_EVALUATIONS {
    uuid id PK
    uuid request_id FK
    json notes
    decimal score
    uuid priority_id FK
    uuid calculated_by_user_id FK
    timestamp calculated_at
    timestamp created_at
    timestamp updated_at
  }
    REQUESTS ||--o| PRIORITIZATION_EVALUATIONS : "request_id"
    PRIORITIES ||--o{ PRIORITIZATION_EVALUATIONS : "priority_id"
    USERS ||--o{ PRIORITIZATION_EVALUATIONS : "calculated_by_user_id"
```

## `pending-items` — lote e itens de pendência

```mermaid
erDiagram
  PENDING_BATCHES {
    uuid id PK
    uuid request_id FK
    boolean request_attachment
    text expected_attachment_type
    uuid created_by_user_id FK
    timestamp created_at
    timestamp updated_at
  }
  PENDING_ITEMS {
    uuid id PK
    uuid batch_id FK
    text type
    uuid form_field_id FK
    varchar classification_key
    text comment
    varchar status
    json corrected_value
    text response_text
    timestamp responded_at
    timestamp validated_at
    uuid validated_by_user_id FK
    timestamp created_at
    timestamp updated_at
  }
    PENDING_ITEMS |o--o{ ATTACHMENTS : "pending_item_id"
    REQUESTS ||--o{ PENDING_BATCHES : "request_id"
    USERS ||--o{ PENDING_BATCHES : "created_by_user_id"
    PENDING_BATCHES ||--o{ PENDING_ITEMS : "batch_id"
    FORM_FIELDS |o--o{ PENDING_ITEMS : "form_field_id"
    USERS |o--o{ PENDING_ITEMS : "validated_by_user_id"
```

## `internal-notes` — notas internas e marcas de leitura

```mermaid
erDiagram
  INTERNAL_NOTES {
    uuid id PK
    uuid request_id FK
    uuid author_user_id FK
    text author_profile_at_creation
    text content
    timestamp created_at
  }
  INTERNAL_NOTE_READ_STATES {
    uuid request_id PK
    uuid user_id PK
    uuid last_read_note_id FK
    timestamp read_at
  }
    REQUESTS ||--o{ INTERNAL_NOTES : "request_id"
    USERS ||--o{ INTERNAL_NOTES : "author_user_id"
    REQUESTS ||--o{ INTERNAL_NOTE_READ_STATES : "request_id"
    USERS ||--o{ INTERNAL_NOTE_READ_STATES : "user_id"
    INTERNAL_NOTES ||--o{ INTERNAL_NOTE_READ_STATES : "FK composta"
```

## `audit` — trilha de alterações e de recusas

```mermaid
erDiagram
  AUDIT_ENTRIES {
    uuid id PK
    uuid request_id FK
    varchar entity_type
    uuid entity_id
    varchar action
    uuid actor_user_id FK
    text actor_profile_at_creation
    json previous_value
    json new_value
    text change_origin
    text note
    text last_technical_message
    text ip_address
    timestamp occurred_at
  }
  ATTEMPTS {
    uuid id PK
    uuid correlation_id
    uuid request_id FK
    uuid actor_user_id FK
    text action
    text entity_type
    uuid entity_id
    text reason_code
    text ip_address
    timestamp occurred_at
  }
    REQUESTS |o--o{ AUDIT_ENTRIES : "request_id"
    USERS |o--o{ AUDIT_ENTRIES : "actor_user_id"
    REQUESTS |o--o{ ATTEMPTS : "request_id"
    USERS |o--o{ ATTEMPTS : "actor_user_id"
```

## `portal-config` — configuração do portal

```mermaid
erDiagram
  PORTAL_SETTINGS {
    uuid id PK
    text solicitation_mode
    text platform_name
    text protocol_mask
    uuid light_theme_id FK
    uuid dark_theme_id FK
    uuid updated_by_user_id FK
    timestamp created_at
    timestamp updated_at
  }
  THEMES {
    uuid id PK
    varchar name UK
    boolean is_active
    text background
    text surface
    text border
    text text_primary
    text text_secondary
    text heading
    text rich_black
    text primary
    text secondary
    text tint
    text on_primary
    text on_dark
    text on_gradient
    text gradient_from
    text gradient_to
    integer gradient_angle
    text status_error_color
    text status_error_background
    boolean status_error_background_locked
    text status_success_color
    text status_success_background
    boolean status_success_background_locked
    text status_info_color
    text status_info_background
    boolean status_info_background_locked
    text status_warning_color
    text status_warning_background
    boolean status_warning_background_locked
    text status_neutral_color
    text status_neutral_background
    boolean status_neutral_background_locked
    text logo_url
    text avatar_url
    text login_image_url
    text favicon_url
    boolean logo_use_primary_color
    timestamp created_at
    timestamp updated_at
  }
  CATEGORIES {
    uuid id PK
    text name
    varchar normalized_name UK
    text description
    boolean is_active
    integer display_order
    uuid form_id FK
    timestamp created_at
    timestamp updated_at
  }
  STATUSES {
    uuid id PK
    varchar key UK
    integer order_number UK
    varchar name UK
    text description
    boolean is_public
    boolean is_active
    boolean is_core
    boolean is_restricted
    boolean is_terminal
    text triage_mode
    text mapping_mode
    text tone
    timestamp created_at
    timestamp updated_at
  }
    CATEGORIES ||--o{ ANALYST_DETAIL_CATEGORIES : "category_id"
    FORMS |o--o{ CATEGORIES : "form_id"
    STATUSES ||--o{ REQUESTS : "status_id"
    STATUSES |o--o{ REQUESTS : "last_public_status_id"
    CATEGORIES ||--o{ REQUESTS : "category_id"
    STATUSES ||--o{ TRIAGES : "exit_status_id"
    CATEGORIES |o--o{ TRIAGES : "new_category_id"
    STATUSES |o--o{ MAPPINGS : "target_status_id"
    THEMES |o--o| PORTAL_SETTINGS : "light_theme_id"
    THEMES |o--o| PORTAL_SETTINGS : "dark_theme_id"
    USERS |o--o| PORTAL_SETTINGS : "updated_by_user_id"
```

## `forms` — catálogo de formulários

```mermaid
erDiagram
  FORMS {
    uuid id PK
    varchar key UK
    text name
    text description
    boolean is_active
    timestamp created_at
    timestamp updated_at
  }
  FORM_BLOCKS {
    uuid id PK
    uuid form_id FK
    varchar key
    text title
    integer display_order
    boolean is_active
    timestamp created_at
    timestamp updated_at
  }
  FORM_FIELDS {
    uuid id PK
    uuid form_id FK
    uuid block_id FK
    varchar key
    text label
    text type
    boolean required
    text help_text
    json options
    integer max_length
    decimal min_value
    decimal max_value
    boolean must_be_future
    boolean is_active
    integer display_order
    timestamp created_at
    timestamp updated_at
  }
    FORMS ||--o{ FORM_BLOCKS : "form_id"
    FORMS ||--o{ FORM_FIELDS : "form_id"
    FORM_BLOCKS ||--o{ FORM_FIELDS : "block_id"
    FORMS |o--o{ CATEGORIES : "form_id"
    FORMS ||--o{ REQUESTS : "form_id"
    FORM_FIELDS ||--o{ FORM_ANSWERS : "field_id"
    FORM_FIELDS |o--o{ PENDING_ITEMS : "form_field_id"
```

## `platform` — infraestrutura

```mermaid
erDiagram
  CODE_COUNTERS {
    varchar name PK
    bigint value
    timestamp updated_at
  }
```

---

## Notas de leitura

- `themes` é uma linha por Aparência; `portal_settings` aponta para a clara e a escura. Os tokens são colunas explícitas, não JSON.

- `form_answers` guarda o valor em colunas tipadas; `value_lookup` é a projeção normalizada do e-mail e não conta na forma.

- `pending_batches` agrupa os itens; `pending_items` aceita **um** sujeito: `form_field_id` ou `classification_key` (constraint `ck_pending_items_subject`), ou nenhum, no caso de observação.

- `internal_note_read_states` tem PK composta (`request_id`, `user_id`) e FK composta (`request_id`, `last_read_note_id`) → `internal_notes` (`request_id`, `id`).

- `audit_entries` e `attempts` apontam para qualquer entidade por `entity_type` + `entity_id`; a referência é polimórfica, sem FK. `attempts.correlation_id` é a requisição HTTP, não a solicitação.
