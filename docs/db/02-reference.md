# Referência do Schema

> **Derivado, não normativo.** Fatos estruturais mantidos à mão a partir de [`../03-Data-Model.md`](../03-Data-Model.md). Em caso de divergência, a especificação vence. Atualize este arquivo no mesmo PR que alterar o schema.

Colunas, tipos, nulabilidade, default, constraints, índices e FKs. O índice abaixo aponta para a seção da especificação de cada tabela; as invariantes e as regras de negócio ficam lá. O mapa visual está em [`03-erd.md`](./03-erd.md) e a versão para ferramenta em [`schema.dbml`](./schema.dbml).

Toda FK é `ON DELETE RESTRICT` ([§ 4](../03-Data-Model.md#4-integridade-referencial-e-ordem-de-criação)); as seções **Relações** abaixo omitem a ação. As referências polimórficas `audit_entries.entity_id` e `attempts.entity_id` não são FK.

## Índice

| Tabela | Domínio | PK | FKs de saída | Definição |
| --- | --- | --- | --- | --- |
| `credentials` | `auth` | `id` | `users.id` | [§ 6.1](../03-Data-Model.md#61-credentials) |
| `profiles` | `users` | `id` | — | [§ 7.1](../03-Data-Model.md#71-profiles) |
| `users` | `users` | `id` | `profiles.id` | [§ 7.2](../03-Data-Model.md#72-users) |
| `analyst_details` | `users` | `id` | `users.id` | [§ 7.3](../03-Data-Model.md#73-analyst_details) |
| `analyst_detail_categories` | `users` | `id` | `portal-config.categories.id`, `users.id` | [§ 7.4](../03-Data-Model.md#74-analyst_detail_categories) |
| `requests` | `requests` | `id` | `forms.forms.id`, `portal-config.categories.id`, `portal-config.statuses.id`, `users.id` | [§ 8.1](../03-Data-Model.md#81-requests) |
| `form_answers` | `requests` | `id` | `forms.form_fields.id`, `requests.id` | [§ 8.2](../03-Data-Model.md#82-form_answers) |
| `attachments` | `requests` | `id` | `pending-items.pending_items.id`, `requests.id`, `users.id` | [§ 8.3](../03-Data-Model.md#83-attachments) |
| `request_time_preferences` | `requests` | `id` | `requests.id` | [§ 8.4](../03-Data-Model.md#84-request_time_preferences) |
| `triages` | `triage` | `id` | `portal-config.categories.id`, `portal-config.statuses.id`, `requests.id`, `users.id` | [§ 9.1](../03-Data-Model.md#91-triages) |
| `mappings` | `mapping` | `id` | `portal-config.statuses.id`, `requests.id`, `users.id` | [§ 10.1](../03-Data-Model.md#101-mappings) |
| `mapping_participants` | `mapping` | `id` | `mappings.id`, `users.id` | [§ 10.2](../03-Data-Model.md#102-mapping_participants) |
| `criteria` | `prioritization` | `id` | — | [§ 12.1](../03-Data-Model.md#121-criteria) |
| `priorities` | `prioritization` | `id` | — | [§ 12.2](../03-Data-Model.md#122-priorities) |
| `prioritization_evaluations` | `prioritization` | `id` | `priorities.id`, `requests.id`, `users.id` | [§ 12.3](../03-Data-Model.md#123-prioritization_evaluations) |
| `pending_batches` | `pending-items` | `id` | `requests.id`, `users.id` | [§ 13.1](../03-Data-Model.md#131-pending_batches) |
| `pending_items` | `pending-items` | `id` | `forms.form_fields.id`, `pending_batches.id`, `users.id` | [§ 13.2](../03-Data-Model.md#132-pending_items) |
| `internal_notes` | `internal-notes` | `id` | `requests.id`, `users.id` | [§ 14.1](../03-Data-Model.md#141-internal_notes) |
| `internal_note_read_states` | `internal-notes` | `request_id`, `user_id` | `internal_notes.(request_id, id)`, `requests.id`, `users.id` | [§ 14.2](../03-Data-Model.md#142-internal_note_read_states) |
| `audit_entries` | `audit` | `id` | `requests.id`, `users.id` | [§ 15.1](../03-Data-Model.md#151-audit_entries) |
| `attempts` | `audit` | `id` | `requests.id`, `users.id` | [§ 15.2](../03-Data-Model.md#152-attempts) |
| `portal_settings` | `portal-config` | `id` | `themes.id`, `users.id` | [§ 17.1](../03-Data-Model.md#171-portal_settings) |
| `themes` | `portal-config` | `id` | — | [§ 17.2](../03-Data-Model.md#172-themes) |
| `categories` | `portal-config` | `id` | `forms.forms.id` | [§ 17.3](../03-Data-Model.md#173-categories) |
| `statuses` | `portal-config` | `id` | — | [§ 17.4](../03-Data-Model.md#174-statuses) |
| `forms` | `forms` | `id` | — | [§ 18.1](../03-Data-Model.md#181-forms) |
| `form_blocks` | `forms` | `id` | `forms.id` | [§ 18.2](../03-Data-Model.md#182-form_blocks) |
| `form_fields` | `forms` | `id` | `form_blocks.id`, `forms.id` | [§ 18.3](../03-Data-Model.md#183-form_fields) |
| `code_counters` | `platform` | `name` | — | [§ 19.1](../03-Data-Model.md#191-code_counters) |

## `auth`

### `credentials`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | — |
| `user_id` | uuid | não | — | `uk_credentials_user_id` |
| `password_hash` | text | não | — | `ck_credentials_password_hash_length` |
| `password_changed_at` | timestamp | não | `now` | — |
| `must_change_password` | boolean | não | `true` | — |
| `created_at` | timestamp | não | `now` | — |

**Relações** — `user_id` → `users.id`.

**Índices** — `uk_credentials_user_id` (único).


## `users`

### `profiles`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | — |
| `name` | varchar(50) | não | — | `uk_profiles_name`; `ck_profiles_name_length` |
| `is_active` | boolean | não | `true` | — |
| `is_assignable_triage` | boolean | não | `false` | — |
| `is_assignable_mapping` | boolean | não | `false` | — |
| `created_at` | timestamp | não | `now` | — |
| `updated_at` | timestamp | não | `now` | — |

**Relações** — inbound: `users.profile_id` → `profiles.id`.

**Índices** — `uk_profiles_name`.


### `users`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | — |
| `name` | text | não | — | `ck_users_name_length` |
| `email` | varchar(254) | não | — | `uk_users_email`; `ck_users_email_length` |
| `profile_id` | uuid | não | — | — |
| `area` | text | sim | — | `ck_users_area_length` |
| `department` | text | sim | — | `ck_users_department_length` |
| `manager_name` | text | sim | — | `ck_users_manager_name_length` |
| `additional_contact` | text | sim | — | `ck_users_additional_contact_length` |
| `is_active` | boolean | não | `true` | — |
| `avatar_url` | text | sim | — | `ck_users_avatar_url_length` |
| `created_at` | timestamp | não | `now` | — |
| `updated_at` | timestamp | não | `now` | — |

**Relações** — `profile_id` → `profiles.id`. As colunas de ator, solicitante, responsável e autor nos outros domínios apontam para `users.id`.

**Índices** — `uk_users_email`.


### `analyst_details`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | — |
| `user_id` | uuid | não | — | `uk_analyst_details_user_id` |
| `job_title` | text | sim | — | `ck_analyst_details_job_title_length` |
| `specialties` | text | sim | — | — |
| `is_available` | boolean | não | `true` | — |
| `capacity` | integer | não | `5` | `ck_analyst_details_capacity_non_negative` |
| `notes` | text | sim | — | `ck_analyst_details_notes_length` |
| `created_at` | timestamp | não | `now` | — |
| `updated_at` | timestamp | não | `now` | — |

**Relações** — `user_id` → `users.id`.

**Índices** — `uk_analyst_details_user_id`.


### `analyst_detail_categories`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | — |
| `user_id` | uuid | não | — | — |
| `category_id` | uuid | não | — | — |
| `created_at` | timestamp | não | `now` | — |

**Relações** — `user_id` → `users.id`; `category_id` → `portal-config.categories.id`.

**Índices** — UNIQUE `uk_analyst_detail_categories_user_category` (`user_id`, `category_id`).


## `requests`

### `requests`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | — |
| `protocol` | varchar(20) | não | — | `uk_requests_protocol`; `ck_requests_protocol_length` |
| `form_id` | uuid | não | — | — |
| `requester_user_id` | uuid | sim | — | — |
| `status_id` | uuid | não | — | — |
| `category_id` | uuid | não | — | — |
| `last_public_status_id` | uuid | sim | — | — |
| `responsible_id` | uuid | sim | — | — |
| `estimated_completion` | date | sim | — | — |
| `meeting_scheduled_for` | timestamp | sim | — | — |
| `meeting_link` | text | sim | — | `ck_requests_meeting_link_length` |
| `last_technical_message` | text | sim | — | — |
| `last_external_update_at` | timestamp | sim | — | — |
| `closed_at` | timestamp | sim | — | — |
| `created_by` | text | não | — | `ck_requests_created_by_length` |
| `created_by_user_id` | uuid | sim | — | — |
| `updated_by_user_id` | uuid | sim | — | — |
| `created_at` | timestamp | não | `now` | — |
| `updated_at` | timestamp | não | `now` | — |

**Relações** — `form_id` → `forms.forms.id`; `requester_user_id` → `users.id`; `status_id` e `last_public_status_id` → `portal-config.statuses.id`; `category_id` → `portal-config.categories.id`; `responsible_id` → `users.id`; `created_by_user_id` e `updated_by_user_id` → `users.id`.

**Índices** — UNIQUE `uk_requests_protocol`; `idx_requests_status_id`; `idx_requests_category_id`; `idx_requests_requester_user_id`; `idx_requests_responsible_id`; `idx_requests_created_at`.


### `form_answers`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | — |
| `request_id` | uuid | não | — | — |
| `field_id` | uuid | não | — | — |
| `value_text` | text | sim | — | `ck_form_answers_value_text_length` |
| `value_lookup` | varchar(254) | sim | — | `ck_form_answers_value_lookup_length` |
| `value_number` | decimal(10,2) | sim | — | — |
| `value_date` | date | sim | — | — |
| `value_boolean` | boolean | sim | — | — |
| `value_json` | json | sim | — | — |
| `created_at` | timestamp | não | `now` | — |
| `updated_at` | timestamp | não | `now` | — |

**Relações** — `request_id` → `requests.id`; `field_id` → `forms.form_fields.id` (domínio `forms`).

**Índices** — UNIQUE `uk_form_answers_request_field` (`request_id`, `field_id`); `idx_form_answers_field_request` (`field_id`, `request_id`); `idx_form_answers_field_lookup` (`field_id`, `value_lookup`).

**Constraints de tabela** — `ck_form_answers_value_shape`.


### `attachments`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | — |
| `request_id` | uuid | não | — | — |
| `pending_item_id` | uuid | sim | — | — |
| `file_name` | text | não | — | `ck_attachments_file_name_length` |
| `file_path` | text | não | — | `ck_attachments_file_path_length` |
| `content_type` | text | não | — | `ck_attachments_content_type` |
| `size_bytes` | integer | não | — | `ck_attachments_size_bytes` |
| `is_restricted` | boolean | não | `false` | — |
| `uploaded_by` | text | sim | — | `ck_attachments_uploaded_by_length` |
| `uploaded_by_user_id` | uuid | sim | — | — |
| `uploaded_at` | timestamp | não | `now` | — |

**Relações** — `request_id` → `requests.id`; `pending_item_id` → `pending_items.id`; `uploaded_by_user_id` → `users.id`.

**Índices** — `idx_attachments_request_id`; `idx_attachments_pending_item_id`; `idx_attachments_is_restricted`.


### `request_time_preferences`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | — |
| `request_id` | uuid | não | — | — |
| `scheduled_for` | timestamp | não | — | — |
| `created_at` | timestamp | não | `now` | — |

**Relações** — `request_id` → `requests.id`.

**Índices** — UNIQUE `uk_request_time_preferences_slot` (`request_id`, `scheduled_for`).


## `triage`

### `triages`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | — |
| `request_id` | uuid | não | — | — |
| `is_adherent_to_scope` | boolean | não | — | — |
| `adherent_justification` | text | não | `''` | — |
| `is_category_change` | boolean | não | `false` | — |
| `new_category_id` | uuid | sim | — | — |
| `preliminary_complexity` | text | não | `''` | — |
| `perceived_risks` | text | não | `''` | — |
| `suggested_responsible` | text | não | `''` | `ck_triages_suggested_responsible_length` |
| `suggested_responsible_justification` | text | não | `''` | — |
| `assignee_user_id` | uuid | sim | — | — |
| `assignee_name` | text | sim | — | — |
| `assignee_email` | text | sim | — | — |
| `exit_status_id` | uuid | não | — | — |
| `conclusion_justification` | text | não | — | — |
| `last_technical_message` | text | sim | — | — |
| `author_user_id` | uuid | não | — | — |
| `occurred_at` | timestamp | não | `now` | — |

**Relações** — `request_id` → `requests.id`; `exit_status_id` → `portal-config.statuses.id`; `new_category_id` → `portal-config.categories.id`; `assignee_user_id` e `author_user_id` → `users.id`.

**Índices** — `idx_triages_request_id_occurred_at` (`request_id`, `occurred_at`).


## `mapping`

### `mappings`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | — |
| `request_id` | uuid | não | — | — |
| `responsible_id` | uuid | sim | — | — |
| `scheduled_for` | timestamp | sim | — | — |
| `duration_minutes` | integer | sim | — | `ck_mappings_duration_minutes` |
| `modality` | text | sim | — | `ck_mappings_modality` |
| `meeting_link` | text | sim | — | `ck_mappings_meeting_link_length` |
| `location` | text | sim | — | `ck_mappings_location_length` |
| `notes` | text | sim | — | `ck_mappings_notes_length` |
| `justification` | text | sim | — | — |
| `last_technical_message` | text | sim | — | — |
| `target_status_id` | uuid | sim | — | — |
| `is_concluded` | boolean | não | `false` | — |
| `concluded_at` | timestamp | sim | — | — |
| `created_by_user_id` | uuid | não | — | — |
| `created_at` | timestamp | não | `now` | — |
| `updated_by_user_id` | uuid | sim | — | — |
| `updated_at` | timestamp | não | `now` | — |

**Relações** — `request_id` → `requests.id`; `responsible_id`, `created_by_user_id` e `updated_by_user_id` → `users.id`; `target_status_id` → `portal-config.statuses.id`.

**Índices** — `idx_mappings_request_id`; `idx_mappings_request_id_is_concluded` (`request_id`, `is_concluded`).


### `mapping_participants`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | — |
| `mapping_id` | uuid | não | — | — |
| `user_id` | uuid | sim | — | — |
| `name` | text | sim | — | `ck_mapping_participants_name_length` |
| `email` | varchar(255) | sim | — | `ck_mapping_participants_email_length` |
| `created_at` | timestamp | não | `now` | — |

**Relações** — `mapping_id` → `mappings.id`; `user_id` → `users.id`.

**Índices** — UNIQUE `uk_mapping_participants_user` (`mapping_id`, `user_id`); UNIQUE `uk_mapping_participants_email` (`mapping_id`, `email`).


## `prioritization`

### `criteria`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | — |
| `code` | varchar(50) | não | — | `uk_criteria_code`; `ck_criteria_code_length` |
| `name` | text | não | — | `ck_criteria_name_length` |
| `weight` | integer | não | — | `ck_criteria_weight_range` |
| `is_active` | boolean | não | `true` | — |
| `display_order` | integer | não | — | — |
| `created_at` | timestamp | não | `now` | — |
| `updated_at` | timestamp | não | `now` | — |

**Relações** — sem FK de saída. `criteria.code` é a chave usada no json `prioritization_evaluations.notes`, sem constraint.

**Índices** — UNIQUE `uk_criteria_code`.


### `priorities`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | — |
| `level` | varchar(50) | não | — | `uk_priorities_level`; `ck_priorities_level` |
| `min_score` | decimal(4,1) | não | — | `ck_priorities_min_score_range` |
| `max_score` | decimal(4,1) | não | — | `ck_priorities_max_score_range` |
| `default_weight` | decimal(3,2) | não | — | — |
| `color_code` | text | sim | — | `ck_priorities_color_code_length` |
| `description` | text | sim | — | — |
| `is_active` | boolean | não | `true` | — |
| `created_at` | timestamp | não | `now` | — |
| `updated_at` | timestamp | não | `now` | — |

**Relações** — `prioritization_evaluations.priority_id` → `priorities.id`.

**Índices** — UNIQUE `uk_priorities_level`.

**Constraints de tabela** — `ck_priorities_score_range`.


### `prioritization_evaluations`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | — |
| `request_id` | uuid | não | — | `uk_prioritization_evaluations_request_id` |
| `notes` | json | não | — | — |
| `score` | decimal(5,1) | não | — | `ck_prioritization_evaluations_score_range` |
| `priority_id` | uuid | não | — | — |
| `calculated_by_user_id` | uuid | não | — | — |
| `calculated_at` | timestamp | não | `now` | — |
| `created_at` | timestamp | não | `now` | — |
| `updated_at` | timestamp | não | `now` | — |

**Relações** — `request_id` → `requests.id`; `priority_id` → `priorities.id`; `calculated_by_user_id` → `users.id`.

**Índices** — UNIQUE `uk_prioritization_evaluations_request_id`.


## `pending-items`

### `pending_batches`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | — |
| `request_id` | uuid | não | — | — |
| `request_attachment` | boolean | não | `false` | — |
| `expected_attachment_type` | text | sim | — | `ck_pending_batches_expected_attachment_type_length` |
| `created_by_user_id` | uuid | não | — | — |
| `created_at` | timestamp | não | `now` | — |
| `updated_at` | timestamp | não | `now` | — |

**Relações** — `request_id` → `requests.id`; `created_by_user_id` → `users.id`.

**Índices** — `idx_pending_batches_request_id`.


### `pending_items`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | — |
| `batch_id` | uuid | não | — | — |
| `type` | text | não | — | `ck_pending_items_type` |
| `form_field_id` | uuid | sim | — | — |
| `classification_key` | varchar(50) | sim | — | `ck_pending_items_classification_key` |
| `comment` | text | não | — | `ck_pending_items_comment_length` |
| `status` | varchar(20) | não | `requested` | `ck_pending_items_status` |
| `corrected_value` | json | sim | — | — |
| `response_text` | text | sim | — | `ck_pending_items_response_text_length` |
| `responded_at` | timestamp | sim | — | — |
| `validated_at` | timestamp | sim | — | — |
| `validated_by_user_id` | uuid | sim | — | — |
| `created_at` | timestamp | não | `now` | — |
| `updated_at` | timestamp | não | `now` | — |

**Relações** — `batch_id` → `pending_batches.id`; `form_field_id` → `forms.form_fields.id`; `validated_by_user_id` → `users.id`.

**Índices** — `idx_pending_items_batch_id`; `idx_pending_items_status`; `idx_pending_items_form_field_id`; UNIQUE `uk_pending_items_batch_field` (`batch_id`, `form_field_id`); UNIQUE `uk_pending_items_batch_classification` (`batch_id`, `classification_key`).

**Constraints de tabela** — `ck_pending_items_subject`.


## `internal-notes`

### `internal_notes`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | — |
| `request_id` | uuid | não | — | — |
| `author_user_id` | uuid | não | — | — |
| `author_profile_at_creation` | text | não | — | `ck_internal_notes_author_profile` |
| `content` | text | não | — | `ck_internal_notes_content_length` |
| `created_at` | timestamp | não | `now` | — |

**Relações** — `request_id` → `requests.id`; `author_user_id` → `users.id`.

**Índices** — `idx_internal_notes_request_id_created_at` (`request_id`, `created_at`); UNIQUE `uk_internal_notes_request_id_id` (`request_id`, `id`) — sustenta a FK composta das marcas de leitura.


### `internal_note_read_states`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `request_id` | uuid | não | — | — |
| `user_id` | uuid | não | — | — |
| `last_read_note_id` | uuid | não | — | — |
| `read_at` | timestamp | não | `now` | — |

**Relações** — PK composta (`request_id`, `user_id`); FK composta (`request_id`, `last_read_note_id`) → `internal_notes` (`request_id`, `id`), que impede marcar como lida uma nota de outra solicitação.

**Índices** — PK `pk_internal_note_read_states`; `idx_internal_note_read_states_last_read_note_id`.


## `audit`

### `audit_entries`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | — |
| `request_id` | uuid | sim | — | — |
| `entity_type` | varchar(50) | não | — | `ck_audit_entries_entity_type` |
| `entity_id` | uuid | não | — | — |
| `action` | varchar(50) | não | — | `ck_audit_entries_action` |
| `actor_user_id` | uuid | sim | — | — |
| `actor_profile_at_creation` | text | sim | — | `ck_audit_entries_actor_profile` |
| `previous_value` | json | sim | — | — |
| `new_value` | json | sim | — | — |
| `change_origin` | text | sim | — | `ck_audit_entries_change_origin_length` |
| `note` | text | sim | — | — |
| `last_technical_message` | text | sim | — | — |
| `ip_address` | text | sim | — | — |
| `occurred_at` | timestamp | não | `now` | — |

**Relações** — `request_id` → `requests.id`; `actor_user_id` → `users.id`. `entity_id` é polimórfico e não tem FK.

**Índices** — `idx_audit_entries_request_id` (`request_id`, `occurred_at`); `idx_audit_entries_entity` (`entity_type`, `entity_id`); `idx_audit_entries_action`; `idx_audit_entries_actor_user_id`; `idx_audit_entries_occurred_at`.


### `attempts`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | — |
| `correlation_id` | uuid | não | — | — |
| `request_id` | uuid | sim | — | — |
| `actor_user_id` | uuid | sim | — | — |
| `action` | text | não | — | `ck_attempts_action` |
| `entity_type` | text | sim | — | `ck_attempts_entity_type` |
| `entity_id` | uuid | sim | — | — |
| `reason_code` | text | sim | — | `ck_attempts_reason_code_length` |
| `ip_address` | text | sim | — | — |
| `occurred_at` | timestamp | não | `now` | — |

**Relações** — `request_id` → `requests.id`; `actor_user_id` → `users.id`.

**Índices** — `idx_attempts_correlation_id`; `idx_attempts_request_id`; `idx_attempts_actor_user_id`; `idx_attempts_occurred_at`.


## `portal-config`

### `portal_settings`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | — |
| `solicitation_mode` | text | não | `PUBLIC` | `ck_portal_settings_solicitation_mode` |
| `platform_name` | text | não | `MAAT` | `ck_portal_settings_platform_name_length` |
| `protocol_mask` | text | não | `MAAT` | `ck_portal_settings_protocol_mask_format` |
| `light_theme_id` | uuid | sim | — | — |
| `dark_theme_id` | uuid | sim | — | — |
| `updated_by_user_id` | uuid | sim | — | — |
| `created_at` | timestamp | não | `now` | — |
| `updated_at` | timestamp | não | `now` | — |

**Relações** — `light_theme_id` e `dark_theme_id` → `themes.id`; `updated_by_user_id` → `users.id`.

**Índices** — PK `pk_portal_settings` (singleton).


### `themes`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | PK, UUID v4 |
| `name` | varchar(60) | não | — | UNIQUE `uk_themes_name`, `ck_themes_name_length` ≤ 60 |
| `is_active` | boolean | não | `true` | — |
| `background` | text | sim | — | `ck_themes_hex` |
| `surface` | text | sim | — | `ck_themes_hex` |
| `border` | text | sim | — | `ck_themes_hex` |
| `text_primary` | text | sim | — | `ck_themes_hex` |
| `text_secondary` | text | sim | — | `ck_themes_hex` |
| `heading` | text | sim | — | `ck_themes_hex` |
| `rich_black` | text | sim | — | `ck_themes_hex` |
| `primary` | text | sim | — | `ck_themes_hex` |
| `secondary` | text | sim | — | `ck_themes_hex` |
| `tint` | text | sim | — | `ck_themes_hex` |
| `on_primary` | text | sim | — | `ck_themes_hex` |
| `on_dark` | text | sim | — | `ck_themes_hex` |
| `on_gradient` | text | sim | — | `ck_themes_hex` |
| `gradient_from` | text | sim | — | `ck_themes_hex` |
| `gradient_to` | text | sim | — | `ck_themes_hex` |
| `gradient_angle` | integer | sim | — | `ck_themes_gradient_angle` |
| `status_error_color` | text | sim | — | `ck_themes_hex` |
| `status_error_background` | text | sim | — | `ck_themes_hex` |
| `status_error_background_locked` | boolean | sim | — | — |
| `status_success_color` | text | sim | — | `ck_themes_hex` |
| `status_success_background` | text | sim | — | `ck_themes_hex` |
| `status_success_background_locked` | boolean | sim | — | — |
| `status_info_color` | text | sim | — | `ck_themes_hex` |
| `status_info_background` | text | sim | — | `ck_themes_hex` |
| `status_info_background_locked` | boolean | sim | — | — |
| `status_warning_color` | text | sim | — | `ck_themes_hex` |
| `status_warning_background` | text | sim | — | `ck_themes_hex` |
| `status_warning_background_locked` | boolean | sim | — | — |
| `status_neutral_color` | text | sim | — | `ck_themes_hex` |
| `status_neutral_background` | text | sim | — | `ck_themes_hex` |
| `status_neutral_background_locked` | boolean | sim | — | — |
| `logo_url` | text | sim | — | `ck_themes_logo_url_length` |
| `avatar_url` | text | sim | — | `ck_themes_avatar_url_length` |
| `login_image_url` | text | sim | — | `ck_themes_login_image_url_length` |
| `favicon_url` | text | sim | — | `ck_themes_favicon_url_length` |
| `logo_use_primary_color` | boolean | não | `false` | — |
| `created_at` | timestamp | não | `now` | — |
| `updated_at` | timestamp | não | `now` | — |

**Relações** — inbound: `portal_settings.light_theme_id` e `portal_settings.dark_theme_id` → `themes.id`.

**Índices** — UNIQUE `uk_themes_name`; `idx_themes_is_active`.


### `categories`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | — |
| `name` | text | não | — | `ck_categories_name_length` |
| `normalized_name` | varchar(40) | não | — | `uk_categories_normalized_name`; `ck_categories_normalized_name_length` |
| `description` | text | sim | — | — |
| `is_active` | boolean | não | `true` | — |
| `display_order` | integer | não | — | — |
| `form_id` | uuid | sim | — | — |
| `created_at` | timestamp | não | `now` | — |
| `updated_at` | timestamp | não | `now` | — |

**Relações** — `form_id` → `forms.forms.id`; inbound: `requests.requests.category_id`, `triage.triages.new_category_id` e `users.analyst_detail_categories.category_id` → `categories.id`.

**Índices** — UNIQUE `uk_categories_normalized_name`; `idx_categories_is_active`; `idx_categories_display_order`; `idx_categories_form_id`.


### `statuses`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | — |
| `key` | varchar(50) | não | — | `uk_statuses_key`; `ck_statuses_key_length` |
| `order_number` | integer | não | — | `uk_statuses_order_number` |
| `name` | varchar(40) | não | — | `uk_statuses_name`; `ck_statuses_name_length` |
| `description` | text | sim | — | — |
| `is_public` | boolean | não | `false` | — |
| `is_active` | boolean | não | `true` | — |
| `is_core` | boolean | não | `false` | — |
| `is_restricted` | boolean | não | `false` | — |
| `is_terminal` | boolean | não | `false` | — |
| `triage_mode` | text | não | `none` | `ck_statuses_triage_mode` |
| `mapping_mode` | text | não | `none` | `ck_statuses_mapping_mode` |
| `tone` | text | não | `info` | `ck_statuses_tone` |
| `created_at` | timestamp | não | `now` | — |
| `updated_at` | timestamp | não | `now` | — |

**Relações** — inbound: `requests.requests.status_id` e `last_public_status_id`, `triage.triages.exit_status_id` e `mapping.mappings.target_status_id` → `portal-config.statuses.id`.

**Índices** — UNIQUE `uk_statuses_key`; UNIQUE `uk_statuses_order_number`; UNIQUE `uk_statuses_name`; `idx_statuses_is_active`.


## `forms`

### `forms`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | — |
| `key` | varchar(60) | não | — | `uk_forms_key`; `ck_forms_key_length` |
| `name` | text | não | — | `ck_forms_name_length` |
| `description` | text | sim | — | — |
| `is_active` | boolean | não | `true` | — |
| `created_at` | timestamp | não | `now` | — |
| `updated_at` | timestamp | não | `now` | — |

**Relações** — inbound: `form_blocks.form_id`, `form_fields.form_id`, `categories.form_id` e `requests.form_id` → `forms.forms.id`.

**Índices** — UNIQUE `uk_forms_key`.


### `form_blocks`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | — |
| `form_id` | uuid | não | — | — |
| `key` | varchar(100) | não | — | `ck_form_blocks_key_length` |
| `title` | text | não | — | `ck_form_blocks_title_length` |
| `display_order` | integer | não | — | — |
| `is_active` | boolean | não | `true` | — |
| `created_at` | timestamp | não | `now` | — |
| `updated_at` | timestamp | não | `now` | — |

**Relações** — `form_id` → `forms.forms.id`; inbound: `form_fields.block_id` → `form_blocks.id`.

**Índices** — UNIQUE `uk_form_blocks_form_key` (`form_id`, `key`).


### `form_fields`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `id` | uuid | não | — | — |
| `form_id` | uuid | não | — | — |
| `block_id` | uuid | não | — | — |
| `key` | varchar(100) | não | — | `ck_form_fields_key_length` |
| `label` | text | não | — | `ck_form_fields_label_length` |
| `type` | text | não | — | `ck_form_fields_type` |
| `required` | boolean | não | `true` | — |
| `help_text` | text | sim | — | — |
| `options` | json | sim | — | — |
| `max_length` | integer | sim | — | — |
| `min_value` | decimal(10,2) | sim | — | — |
| `max_value` | decimal(10,2) | sim | — | — |
| `must_be_future` | boolean | não | `false` | — |
| `is_active` | boolean | não | `true` | — |
| `display_order` | integer | não | — | — |
| `created_at` | timestamp | não | `now` | — |
| `updated_at` | timestamp | não | `now` | — |

**Relações** — `form_id` → `forms.forms.id`; `block_id` → `form_blocks.id`; inbound: `form_answers.field_id` e `pending_items.form_field_id` → `form_fields.id`.

**Índices** — UNIQUE `uk_form_fields_form_key` (`form_id`, `key`); `idx_form_fields_block_id`.

## `platform (infraestrutura)`

### `code_counters`

| Coluna | Tipo | Nulo | Default | Constraints |
| --- | --- | --- | --- | --- |
| `name` | varchar(50) | não | — | `ck_code_counters_name_length` |
| `value` | bigint | não | `0` | — |
| `updated_at` | timestamp | não | `now` | — |

**Relações** — sem FK. O contador é referenciado pelo código, via porta `Counter`.

**Índices** — PK `pk_code_counters` (`name`).
