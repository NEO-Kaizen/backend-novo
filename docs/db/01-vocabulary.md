# Modelo de Dados — Vocabulário para Schema

Índice **termo → tabela**. O glossário é a fonte do vocabulário ([`../../GLOSSARY.md`](../../GLOSSARY.md)); este arquivo é só o mapa de onde cada termo mora no schema.

É um índice de leitura, não parte da especificação: a definição de cada tabela está na seção do domínio, em [`../03-Data-Model.md`](../03-Data-Model.md). A navegação da documentação do banco está em [`README.md`](./README.md).

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
| **Pendência** | `pending-items.pending_batches` + `pending-items.pending_items` | O lote agrupa os itens; cada item tem estado, comentário e resposta próprios |
| **Nota interna** | `internal-notes.internal_notes` | Registro imutável, integrado à linha do tempo |
| **Linha do tempo** | — | Projeção: `audit_entries` + `internal_notes` |
| **Auditoria** | `audit.audit_entries` | O que foi criado ou alterado, com autor, momento, valor anterior e novo |
| **Tentativa** | `audit.attempts` | O que foi recusado, gravado fora da transação |
| **Perfil** | `users.profiles` | Cinco perfis fixos; permissões em código ([ADR-0006](../adr/0006-static-profile-authorization.md), [ADR-0025](../adr/0025-authorization-capability-scope.md)) |
| **Permissão** | `core/authorization` (matriz em código) | Catálogo do Apêndice B; no alvo, tabela `permissions` |
| **Escopo** | `core/authorization` (matriz em código) | `none`/`owner`; `own`/`all`; no alvo, `profile_permissions.scope` |
| **Custódia** | `requests.requests.responsible_id`; `mapping.mappings.responsible_id` | Vínculo consultado pelo escopo `own`; a coluna de mapeamento só vale para as chaves `mapping:*` |
| **Atribuibilidade (atribuível)** | `users.profiles.is_assignable_triage`, `users.profiles.is_assignable_mapping` | Flag explícita validada pelas permissões de trabalho |
| **Admin Root** | `users.profiles` | Existe apenas no seed; nunca há auto-registro nem promoção pela API |
| **Responsável** | `requests.requests.responsible_id`, `triage.triages.assignee_user_id`, `mapping.mappings.responsible_id` | A pessoa designada. São três colunas independentes: a da solicitação é o responsável **corrente** — é o que a custódia geral (Apêndice B § 23.1) considera; a do mapeamento é o condutor do mapeamento corrente e, depois da conclusão, o snapshot de quem conduziu — `request:assign` não a altera; a da triagem é snapshot |
| **Modo de acesso** | `portal-config.portal_settings.solicitation_mode` | `PUBLIC` ou `AUTHENTICATED` |
| **Aparência** | `portal-config.themes` | Uma Aparência do portal; as vigentes são as apontadas por `portal_settings` |
| **Formulário** | `forms.forms` | O que uma solicitação pede, definido por blocos e campos |
| **Bloco** | `forms.form_blocks` | Uma parte do formulário — identificação, demanda, operacional, complementar |
| **Campo** | `forms.form_fields` | Uma pergunta do formulário, com tipo, obrigatoriedade e limites |
