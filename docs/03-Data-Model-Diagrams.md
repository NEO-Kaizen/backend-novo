# Data Model — Diagramas de Entidade

Diagramas de **orientação**: mostram como os domínios se conectam, não cada chave estrangeira. A relação completa está na coluna `FK →` de cada tabela, em [`03-Data-Model.md`](./03-Data-Model.md), e a ordem de criação em [§ 4](./03-Data-Model.md#4-referential-integrity-and-creation-order).

Não é parte da especificação: nenhum diagrama aqui é normativo.

## The Request Cycle

```mermaid
erDiagram
    FORMS ||--o{ FORM_BLOCKS : "organiza"
    FORM_BLOCKS ||--o{ FORM_FIELDS : "contém"
    FORMS ||--o{ REQUESTS : "define"
    REQUESTS ||--o{ FORM_ANSWERS : "responde"
    FORM_FIELDS ||--o{ FORM_ANSWERS : "valoriza"
    FORM_FIELDS ||--o{ PENDING_ITEM_FIELDS : "referenciado"
    REQUESTS ||--o{ PENDING_ITEMS : "pendente"
    PENDING_ITEMS ||--o{ PENDING_ITEM_FIELDS : "pede"
    REQUESTS ||--o{ ATTACHMENTS : "recebe"
    ATTACHMENTS }o--o| PENDING_ITEMS : "atende"
    REQUESTS ||--o{ REQUEST_TIME_PREFERENCES : "prefere"
    REQUESTS ||--o{ TRIAGES : "triada"
    REQUESTS ||--o{ MAPPINGS : "mapeada"
    MAPPINGS ||--o{ MAPPING_PARTICIPANTS : "reunir"
    REQUESTS ||--o{ INTERNAL_NOTES : "anotada"
    INTERNAL_NOTES ||--o{ INTERNAL_NOTE_READ_STATES : "lida por"
    REQUESTS ||--o| PRIORITIZATION_EVALUATIONS : "avaliada"
    PRIORITIES ||--o{ PRIORITIZATION_EVALUATIONS : "classifica"
    STATUSES ||--o{ REQUESTS : "classifica"
    CATEGORIES ||--o{ REQUESTS : "classifica"
    STATUSES ||--o{ TRIAGES : "encerra"
    USERS ||--o{ REQUESTS : "responsável"
```

## Access and Configuration

```mermaid
erDiagram
    PROFILES ||--o{ USERS : "classifica"
    USERS ||--o| USER_DETAILS : "detalha"
    USERS ||--|| CREDENTIALS : "autentica"
    USERS ||--o{ USER_DETAIL_CATEGORIES : "atende"
    CATEGORIES ||--o{ USER_DETAIL_CATEGORIES : "atendida"
    THEMES ||--o{ PORTAL_SETTINGS : "aparência vigente"
```

## Audit

```mermaid
erDiagram
    USERS ||--o{ AUDIT_ENTRIES : "autoriza"
    USERS ||--o{ ATTEMPTS : "tentou"
```
