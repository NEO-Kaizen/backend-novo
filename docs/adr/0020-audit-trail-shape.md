---
status: aceito
---

# O modelo da trilha de auditoria

O ADR-0007 fixou a auditoria orientada a evento, gravada na mesma transação da alteração que descreve, e separou a trilha de tentativas para fora da transação. O **catálogo** da auditoria, porém, continuava modelado de um jeito que não correspondia ao que o legado fazia.

No legado, `auditCatalog.ts` é um catálogo **por entidade**, com a lista de ações de cada uma, e o par (entidade, ação) validado no sistema de tipos (`AuditActionOf<E>`), com o `actionType` composto montado a partir do catálogo. O modelo de dados, ao contrário, declarava quinze tipos de entidade e um `action_type` no formato `<entidade>.<ação>`, com uma constraint que teria de enumerar todos os pares — e uma lista de ações que nunca existiu: `read` e `write`. No legado, **nada é auditado como leitura ou escrita genérica**: toda entrada da trilha é uma criação, uma alteração, uma reatribuição, uma mudança de status, uma avaliação.

O modelo de dados também carregava `audit_entries.is_immutable`, uma coluna booleana que promete uma proteção que não existe. A migration `20260923000001_add_audit_history_append_only_guard.js` do legado já tinha **removido** essa coluna, com o motivo escrito no cabeçalho: *"`is_immutable` era só um marcador — nada impedia UPDATE/DELETE/TRUNCATE […] manter a coluna sugeriria uma proteção que não existe."* O trigger que a tornava verdade era Postgres e não sobrevive à portabilidade do ADR-0003.

Decidimos o seguinte.

**O catálogo é por entidade e vive em código.** `audit_entries.entity_type` espelha o catálogo; `audit_entries.action` é uma coluna própria, com a lista global = união das ações de cada entidade. O par (entidade, ação) é validado pelo catálogo em código, como no legado. `read` e `write` saem do vocabulário. `access_denied` também sai: pela ADR-0007 a recusa não é alteração, e vai para `attempts`.

**Toda entidade que pode ser escrita tem tipo de entidade.** Entidade cujo ciclo de vida é controlado pelo pai é auditada sob o pai — `pending_item_field` sob `pending_item`, `user_detail_category` sob `user`.

**A trilha carrega a solicitação.** `audit_entries` e `attempts` ganham `request_id` nullable. O ADR-0007 já diz que o payload do evento de auditoria carrega o `requestId`; sem coluna, esse id só existia dentro de `previous_value`/`new_value`, em JSON, onde não há índice. Com a coluna, a **Linha do tempo** — a sequência unificada dos acontecimentos de uma solicitação — é uma consulta indexada, e o domínio `audit` não precisa conhecer o `requests` para responder por ela.

**`is_immutable` sai.** A garantia é do código: não há rota de alteração nem de exclusão, e a linha é append-only por construção. Uma coluna que declara uma proteção inexistente é enganosa, e o legado já pagou para aprender isso.

## Alternativas consideradas

- **Manter `action_type` composto e enumerar os pares na constraint.** Espelha o legado ao pé da letra, mas a constraint cresce por entidade — acrescentar uma entidade auditável significaria adicionar todas as suas ações à lista, e `idx_audit_entries_action_type` deixaria de servir para "todas as mudanças de status de qualquer entidade", porque a ação é sufixo e não prefixo.
- **Manter as sete ações do modelo de dados** (`read`, `write`, `assign`, `status_change`, `create`, `update`, `deactivate`). Simples e curto, mas perde o léxico do legado — `evaluate`, `triage`, `complete`, `respond`, `validate`, `reopen`, `reset_password`, `change_password`, `activate`, `override_status_admin` — e inventa duas ações que nunca ocorreram.
- **Manter `is_immutable`.** Resolve-se pela declaração: a coluna não protege nada, e o trigger que protegia é Postgres.
- **Tabela de referência para o catálogo.** Contraria a § 2.7: o código é o dono do vocabulário, e a constraint `ck_` é o espelho. Uma tabela acrescentaria uma linha de migrate para cada entidade auditável.

## Consequências

- `audit_entries` ganha `request_id` e perde `action_type` e `is_immutable`; `action` entra no lugar.
- O índice de ação passa a indexar a ação, e não o par.
- `attempts` ganha o mesmo vocabulário e o mesmo `request_id`, e as duas trilhas respondem às mesmas perguntas do mesmo jeito.
- O catálogo de entidades passa a ter vinte e duas entradas, com as de `forms` e as de leitura de slot incluídas.
- A § 2.7 do modelo de dados ganha a regra "toda entidade mutável tem tipo de entidade".
- A § 15 do modelo de dados deixa de afirmar que o vocabulário de ação é o mesmo da chave de permissão: são vocabulários diferentes, porque uma chave de permissão descreve o que se pode pedir e uma entrada de auditoria descreve o que foi feito.
