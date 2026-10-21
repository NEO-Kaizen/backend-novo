# Data Model — Vocabulário para Schema

Índice **termo → tabela**. O glossário é a fonte do vocabulário ([`../GLOSSARY.md`](../GLOSSARY.md)); este arquivo é só o mapa de onde cada termo mora no schema.

É um índice de leitura, não parte da especificação: a definição de cada tabela está na seção do domínio, em [`03-Data-Model.md`](./03-Data-Model.md).

| Termo (`GLOSSARY.md`) | Onde vive | Observação |
| --- | --- | --- |
| **Solicitação** | `requests.requests` | O registro e seu ciclo de vida |
| **Protocolo** | `requests.requests.protocol` | Identificador público, único, nunca reemitido |
| **Solicitante** | as respostas do bloco `requester` + `requests.requester_user_id` | Quem preencheu a solicitação; pode ser anônimo, e nesse caso não há conta |
| **Anexo** | `requests.attachments` | Vinculado à solicitação e, opcionalmente, a uma pendência |
| **Fila** | — | Projeção de leitura sobre `requests`; sem tabela própria |
| **Status** | `portal-config.statuses` | Etapa do ciclo de vida, com visibilidade pública ou interna |
| **Categoria** | `portal-config.categories`, `requests.category_id` | Classificação ordenável da solicitação — o solicitante propõe, a triagem confirma |
| **Prioridade** | `prioritization.prioritization_evaluations.priority_id` | Faixa de criticidade, definida por faixa de score; a avaliação corrente é a única casa |
| **Classificação** | `requests.status_id`, `requests.category_id`, `prioritization.prioritization_evaluations.priority_id` | Os três atributos que situam a solicitação no fluxo — status e categoria na própria solicitação, prioridade na avaliação corrente |
| **Triagem** | `triage.triages` | Conjunto append-only de triagens; a triagem atual é a última linha |
| **Veredito** | `triage.triages.exit_status_id` | Desfecho da triagem: o Status em que ela deixa a solicitação |
| **Mapeamento** | `mapping.mappings` | Sessão de levantamento |
| **Análise de viabilidade** | — | Etapa do mapeamento; registrada em `mappings` e na auditoria, sem tabela própria |
| **Priorização** | `prioritization.prioritization_evaluations` | Cálculo da prioridade a partir de critérios ponderados |
| **Critério** | `prioritization.criteria` | Quesito ponderado, com peso ajustável |
| **Pendência** | `pending-items.pending_items` | O que impede o avanço da solicitação |
| **Nota interna** | `internal-notes.internal_notes` | Registro imutável, integrado à linha do tempo |
| **Linha do tempo** | — | Projeção: `audit_entries` + `internal_notes` |
| **Auditoria** | `audit.audit_entries` | O que foi criado ou alterado, com autor, momento, valor anterior e novo |
| **Tentativa** | `audit.attempts` | O que foi recusado, gravado fora da transação |
| **Perfil** | `users.profiles` | Cinco perfis; permissões em código ([ADR-0006](./adr/0006-static-profile-authorization.md)) |
| **Admin Root** | `users.profiles` | Existe apenas no seed; nunca há auto-registro |
| **Responsável** | `requests.requests.responsible_id`, `triage.triages.assignee_user_id`, `mapping.mappings.responsible_id` | A pessoa designada. São três colunas independentes: a da solicitação é o responsável **corrente** — é o que a custódia (o escopo das permissões, Apêndice B § 23.1) considera; a da triagem e a do mapeamento congelam quem conduziu aquela etapa |
| **Modo de acesso** | `portal-config.portal_settings.solicitation_mode` | `PUBLIC` ou `AUTHENTICATED` |
| **Aparência** | `portal-config.themes` | Uma Aparência do portal; as vigentes são as apontadas por `portal_settings` |
| **Formulário** | `forms.forms` | O que uma solicitação pede, definido por blocos e campos |
| **Bloco** | `forms.form_blocks` | Uma parte do formulário — identificação, demanda, operacional, complementar |
| **Campo** | `forms.form_fields` | Uma pergunta do formulário, com tipo, obrigatoriedade e limites |
